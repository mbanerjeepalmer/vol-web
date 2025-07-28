<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import Markdown from '$lib/components/Markdown.svelte';
	import type { PageData } from './$types';
	import type { JSONFeedItem } from '$lib/types';
	import EpisodePreview from '$lib/components/EpisodePreview.svelte';
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import type { components, paths } from '$lib/zacusca_api_types';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import * as Tabs from '$lib/components/ui/tabs/index';
	import Subscribe from '$lib/components/Subscribe.svelte';
	import { ChartCandlestick, Orbit, Podcast, Search } from 'lucide-svelte';
	import EmptyEpisodes from '$lib/components/EmptyEpisodes.svelte';
	import createClient from 'openapi-fetch';
	import { PUBLIC_ZACUSCA_API_BASE } from '$env/static/public';
	import Heading2 from '$lib/components/Heading2.svelte';
	import { slide } from 'svelte/transition';

	interface Props {
		data: PageData;
	}

	let { data = $bindable() }: Props = $props();

	let megaCatalogue: components['schemas']['MegaCatalogueResponse'] | null;
	let errorText = $state('');

	let episodes: JSONFeedItem[] = $state([]);
	let relevantFeedID = $state('');
	let relevantEpisodes: JSONFeedItem[] = $derived.by(() => {
		return episodes.filter((item) =>
			item._categories?.some((category) => category.feed_title !== 'Everything else')
		);
	});
	let everythingElseEpisodes: JSONFeedItem[] = $derived.by(() => {
		return episodes.filter((item) =>
			item._categories?.some((category) => category.feed_title === 'Everything else')
		);
	});
	let unclassifiedEpisodes: JSONFeedItem[] = $derived.by(() => {
		return episodes.filter((item) => !item._categories || item._categories.length === 0);
	});
	let thinkingAboutQueries = $state('');
	let queries: string[] = $state([]);
	let intervalId: NodeJS.Timeout | null;
	let catalogueState = $state({ state: '' });
	let activeTab: string = $state('think');
	const pulsingClasses =
		'animate-pulse bg-gradient-to-l from-fuchsia-500 to-green-500 bg-clip-text text-transparent';
	/**
	 * If an episode with the same id exists, replace it,
	 * otherwise append the new episode.
	 */
	function upsert(list: JSONFeedItem[], incoming: JSONFeedItem): JSONFeedItem[] {
		const idx = list.findIndex((e) => e.id === incoming.id);

		if (idx === -1) {
			// not found  → append
			return [incoming, ...list];
		}

		// found → replace in-place copy
		const clone = [...list];
		clone[idx] = incoming;
		return clone;
	}

	// Tracking for stopping conditions
	let lastCategorisedCount = 0;
	let lastCategorisedCountTime = Date.now();
	let isPolling = false;

	// Queue for user classifications
	let classificationQueue: {
		episodeId: string;
		feed_title: string; // In reality either 'Everything else' or the name of the other category
		status: 'pending' | 'success' | 'error';
		retries: number;
	}[] = $state([]);

	const client = createClient<paths>({
		baseUrl: PUBLIC_ZACUSCA_API_BASE
	});

	function getClassificationStatus(episodeId: string) {
		const item = classificationQueue.find((q) => q.episodeId === episodeId);
		return item ? item.status : null;
	}

	async function processClassificationQueue() {
		if (!data.catalogue_id) {
			console.error(`No catalogue_id`, data.catalogue_id);
			return;
		}

		const pendingItems = classificationQueue.filter(
			(it) => it.status === 'pending' || (it.status === 'error' && it.retries < 3)
		);

		if (pendingItems.length === 0) {
			console.log('All classification tasks completed.');
			return;
		}

		console.debug(`About to save ${pendingItems.length} user classifications`);
		for (let i = 0; i < pendingItems.length; i += 10) {
			const batch = pendingItems.slice(i, i + 10);
			const batchIds = batch.map((it) => it.episodeId);

			// TODO we should just use the api_types
			interface ClassifiedGroups {
				[key: string]: { id: string }[];
			}
			const body = {
				items_body: {
					item_ids: batchIds
				},
				classified_groups: pendingItems.reduce<ClassifiedGroups>((acc, item) => {
					if (!acc[item.feed_title]) {
						acc[item.feed_title] = [];
					}
					acc[item.feed_title].push({ id: item.episodeId });
					return acc;
				}, {})
			};

			try {
				const response = await fetch(`/api/catalogue/${data.catalogue_id}/classification`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify(body)
				});

				if (!response.ok) {
					const errorResponse = await response.json();
					console.error(errorResponse);
					throw new Error('API failure when attempting to classify');
				}

				// TODO typing
				const classificationResult = await response.json();

				for (const [feed_title, items] of Object.entries(classificationResult.classified_groups)) {
					if (Array.isArray(items)) {
						items.forEach((item) => {
							if ('id' in item && typeof item.id === 'string') {
								const match = classificationQueue.find((q) => q.episodeId === item.id);
								if (match) {
									match.feed_title = feed_title;
									match.status = 'success';
								}
							}
						});
					}
				}
			} catch (err) {
				console.error(`Batch classification failed [${batchIds.join(', ')}]:`, err);

				batch.forEach((it) => {
					it.status = 'error';
					it.retries++;
				});
			}
		}

		const stillPending = classificationQueue.some(
			(it) => it.status === 'pending' || (it.status === 'error' && it.retries < 3)
		);
		if (stillPending) {
			console.debug(`Some items still pending`);
			setTimeout(processClassificationQueue, 5_000);
		} else {
			console.log('All classification tasks completed.');
		}
	}

	async function fetchCatalogueState(catalogue_id: string | undefined | null) {
		if (!catalogue_id) {
			console.debug('No catalogue_id', catalogue_id);
			return { state: '' };
		}
		const catalogueStateResponse = await fetch(`/api/catalogue/${catalogue_id}/state`);
		const catalogueStateResponseJSON = await catalogueStateResponse.json();
		console.debug(`fetched state`, catalogue_id, catalogueStateResponseJSON.state);
		return catalogueStateResponseJSON;
	}

	function populateCatalogueMetadataFromEpisodes(allEpisodes) {
		if (!allEpisodes || !allEpisodes.items) {
			console.warn('No episodes data to process for catalogue metadata.');
			return;
		}

		if (allEpisodes.title && !data.prompt) {
			data.prompt = allEpisodes.title;
		}

		const newSources = new Set();
		for (const item of allEpisodes.items) {
			if (item._sources) {
				for (const source of item._sources) {
					newSources.add(source.feed_title);
				}
			}
		}
		if (queries.length !== newSources.size) {
			console.debug('Updating queries');
			queries = Array.from(newSources);
		}

		if (!relevantFeedID) {
			console.debug('Updating category ID');
			const newCategories = new Map();
			for (const item of allEpisodes.items) {
				if (item._categories) {
					for (const category of item._categories) {
						if (!newCategories.has(category.feed_title)) {
							newCategories.set(category.feed_title, category.feed_id);
						}
					}
				}
			}

			for (const [title, id] of newCategories.entries()) {
				if (title !== 'Everything else') {
					relevantFeedID = id;
					break; // Assuming only one 'relevant' feed
				}
			}
		} else {
			console.debug('Both categories present. Skipping update.');
		}
	}

	onMount(async () => {
		if (data.catalogue_id) {
			activeTab = 'search';
			console.debug(`Loading an existing catalogue`, data.catalogue_id);
			await startPolling();
			return;
		} else if (data.prompt) {
			activeTab = 'think';
			console.debug(`No existing catalogue_id so creating one`);
			let url = `/api/prompt-to-queries?prompt=${encodeURIComponent(data.prompt)}`;

			const eventSource = new EventSource(url);

			eventSource.onmessage = (event) => {
				thinkingAboutQueries += event.data.replace(/\\n/g, '\n');
			};

			eventSource.onerror = async () => {
				eventSource.close();
				queries = parseQueries(thinkingAboutQueries);
				if (queries.length > 0) {
					await createCatalogueFromQueries(queries);
				} else {
					// What is this?
					queries = data.queries;
					await createCatalogueFromQueries(queries);
				}
			};
		} else {
			console.error(`Strange state with neither catalogue_id nor prompt`);
		}
	});

	onDestroy(() => {
		if (intervalId) {
			clearInterval(intervalId);
			intervalId = null;
			console.debug(`Stopped polling`);
		}
	});

	async function startPolling() {
		if (isPolling) {
			console.debug(`Already polling`);
			return;
		}
		isPolling = true;
		console.debug(`Starting polling`);

		const poll = async () => {
			try {
				// Always fetch catalogue state
				catalogueState = await fetchCatalogueState(data.catalogue_id);

				// Fetch episodes if we're syncing or classifying

				const { data: allEpisodes, error: allEpisodesError } = await client.GET(
					'/catalogue/{catalogue_id}/item',
					{
						params: {
							path: {
								catalogue_id: data.catalogue_id
							},
							query: {
								format: 'json_feed',
								count: 50,
								sort: 'desc'
							}
						}
					}
				);

				if (allEpisodesError) {
					console.error(allEpisodesError);
					errorText = "couldn't get episodes from the server";
					stopPolling();
					return;
				}

				// Note: This means if we don't have any episodes then we also don't have queries
				// But on creation the queries are populated client-side.
				// And for an existing catalogue the episodes should all be there.
				populateCatalogueMetadataFromEpisodes(allEpisodes);
				if (allEpisodes.items) {
					const maxBatchTime = 3000; // 3s total max
					const delayPerItem = 400; // Initial delay per item
					const maxItemsBeforeBatch = Math.floor(maxBatchTime / delayPerItem); // ~10 items

					let index = 0;

					const interval = setInterval(() => {
						if (index < allEpisodes.items.length) {
							if (index < maxItemsBeforeBatch) {
								episodes = upsert(episodes, allEpisodes.items[index]);
								index++;
							}
						} else {
							// batch branch
							const rest = allEpisodes.items.slice(index);
							let next = episodes;
							for (const ep of rest) next = upsert(next, ep);
							episodes = next;
							clearInterval(interval);
							return;
						}
					}, delayPerItem);

					// Check stopping conditions
					const categorisedCount = allEpisodes.items.filter(
						(item) => item._categories && item._categories.length > 0
					).length;
					const totalCount = allEpisodes.items.length;

					if (categorisedCount === totalCount && totalCount > 0) {
						console.debug(`All ${totalCount} items have categories, stopping polling`);
						stopPolling();
						return;
					}

					if (categorisedCount !== lastCategorisedCount) {
						lastCategorisedCount = categorisedCount;
						lastCategorisedCountTime = Date.now();
					} else if (Date.now() - lastCategorisedCountTime > 120000) {
						console.debug('Categorised count unchanged for 120 seconds, stopping polling');
						stopPolling();
						return;
					}
				} else {
					console.debug(`No items in the response`, allEpisodes);
				}

				catalogueState = await fetchCatalogueState(data.catalogue_id);
				switch (catalogueState.state) {
					case 'idle':
						console.debug("State is idle, we assume we're done, stopping polling");
						stopPolling();
						return;
					case 'errored':
						console.error('There was an error with the catalogue');
						errorText = 'something broke on the server';
						stopPolling();
						return;
				}

				intervalId = setTimeout(poll, 2000);
			} catch (error) {
				console.error('Polling error:', error);
				errorText = 'the server broke';
				stopPolling();
			}
		};

		await poll();
	}

	function stopPolling() {
		if (intervalId) {
			clearTimeout(intervalId);
			intervalId = null;
		}
		isPolling = false;
		console.debug('Stopped polling');
	}

	async function createCatalogueFromQueries(queryList: string[]) {
		try {
			const catalogueResponse = await fetch('/api/catalogue', {
				method: 'POST',
				body: JSON.stringify({
					prompt: data.prompt,
					queries: queryList,
					criteria: `The user has told us '${data.prompt}'. The topics we believe that could help are: ${queryList.map((query) => `'${query}'`).join(', ')}.
					Select episodes on these topics that could contribute towards the goal. Exclude those that have no relevance.`
				})
			});
			const catalogueResponseJSON = await catalogueResponse.json();
			data.catalogue_id = catalogueResponseJSON.catalogue.id;
			console.debug('catalogueResponseJSON', catalogueResponseJSON);
			const newURL = new URL(page.url);
			newURL.searchParams.set('catalogue_id', catalogueResponseJSON.catalogue.id);
			goto(newURL);
			console.debug(`Going to start fetching data`);
			await startPolling();
		} catch (error) {
			console.error('Search request failed:', error);
			errorText = 'the server broke.';
		} finally {
			activeTab = 'search';
		}
	}

	function parseQueries(content: string): string[] {
		const queryRegex = /<query>(.*?)<\/query>/g;
		const matches = [...content.matchAll(queryRegex)];
		return matches.map((match) => match[1].trim());
	}

	/**
	 * Manages episode classification state with optimistic updates and server synchronization.

	 * Handles user classification changes (plus/minus) with immediate UI feedback while managing
	 * server synchronization challenges.
	 *
	 * Key behaviors:
	 * - Applies changes instantly to UI (optimistic updates)
	 * - Maintains pending changes queue for server sync
	 * - Tracks request status separately from UI state
	 * - Disables classification when server is 'classifying'
	 * - Accepts server state as authoritative after classification
	 * - Provides retry mechanism for failed updates
	 * - Shows visual feedback for pending/failed/override states
	 *
	 * State flow:
	 * 1. User clicks → immediate UI update
	 * 2. Change queued → POST to server
	 * 3. Server response → update tracking status
	 * 4. Classification state → refresh from server if active
	 * 5. Conflicts → server state wins, user notified
	 */
	async function userClassify(episode: JSONFeedItem, category: 'plus' | 'minus') {
		// Early return if no output feeds are available
		if (!megaCatalogue?.output_feeds || megaCatalogue.output_feeds.length === 0) {
			console.error('No output feeds in megaCatalogue');
			errorText = "error: don't have categories";
			return;
		}

		// Determine the target feed based on the category
		const isMinus = category === 'minus';
		const targetFeedTitle = isMinus ? 'Everything else' : null;
		const targetFeed = megaCatalogue.output_feeds.find((f) =>
			isMinus ? f.title === targetFeedTitle : f.title !== 'Everything else'
		);

		if (!targetFeed) {
			const errorMessage = isMinus
				? "Couldn't find 'Everything else' feed"
				: "Couldn't find the non-'Everything else' feed";
			console.error(errorMessage);
			return;
		}

		// Update episode categories
		episode._categories = [{ feed_title: targetFeed.title, feed_url: targetFeed.href }];

		// Update or add to classification queue
		const existing = classificationQueue.find((q) => q.episodeId === episode.id);
		if (existing) {
			existing.feed_title = targetFeed.title;
			existing.status = 'pending';
			existing.retries = 0;
		} else {
			classificationQueue.push({
				episodeId: episode.id,
				feed_title: targetFeed.title,
				status: 'pending',
				retries: 0
			});
		}
		processClassificationQueue();
	}
</script>

<div class="mx-auto max-w-fit px-2 py-8 sm:max-w-xl lg:px-4">
	<h1 class="mb-8 text-center text-4xl font-extrabold tracking-tight lg:text-5xl">
		{data.prompt}
	</h1>
	<p
		class={[
			errorText && 'opacity-100',
			'mx-auto my-4 min-h-12 max-w-lg text-center text-xs text-red-600 opacity-0'
		]}
	>
		{errorText}
	</p>
	<Tabs.Root value={activeTab} class="w-full">
		<div class="flex w-full">
			<Tabs.List class="mx-auto flex h-fit flex-col gap-y-2 sm:flex-row">
				<Tabs.Trigger value="think">1. <Orbit class="mx-2 w-4" /> think</Tabs.Trigger>
				<Tabs.Trigger value="search">
					<div class="flex w-fit flex-row">
						2.
						<span class={'mx-2 flex flex-row'}
							><Search class="mx-2 w-4" /><span
								class={[catalogueState.state === 'syncing' && pulsingClasses]}
							>
								search</span
							>
							+
							<span class={'mx-2 flex flex-row'}
								><ChartCandlestick class="mx-2 w-4" />
								<span class={[catalogueState.state === 'classifying' && pulsingClasses]}
									>select</span
								>
							</span>
						</span>
					</div>
				</Tabs.Trigger>
				<Tabs.Trigger value="subscribe">3. <Podcast class="mx-2 w-4" />subscribe</Tabs.Trigger>
			</Tabs.List>
		</div>
		<Tabs.Content value="think"><Markdown content={thinkingAboutQueries} /></Tabs.Content>
		<Tabs.Content value="search">
			<div class="flex flex-col gap-10">
				<div
					class=" my-4 flex min-h-16 w-full flex-wrap items-center justify-center gap-x-2 text-center leading-8"
				>
					{#each queries as query}
						<Badge class="h-fit" variant="secondary">{query}</Badge>
					{/each}
				</div>

				{#if (relevantEpisodes.hasOwnProperty('length') && relevantEpisodes.length > 0) || catalogueState.state === 'classifying'}
					<div
						transition:slide
						class="my-8 box-border flex flex-col rounded-2xl border-4 border-green-500/30 pt-4"
					>
						<Heading2>
							selected {relevantEpisodes.length} episode{everythingElseEpisodes.length === 1
								? ''
								: 's'} for your playlist
						</Heading2>
						<!-- Scrollable episodes container -->
						<div
							class="scrollbar-thin scrollbar-track-transparent scrollbar-thumb-green-500/20 hover:scrollbar-thumb-green-500/40 max-h-[80vh] overflow-y-auto px-4 py-6"
						>
							<!-- Inner shadow indicators for scroll -->
							<div class="relative">
								<!-- Top fade indicator -->
								<div
									class="pointer-events-none absolute -top-6 left-0 right-0 z-10 h-6 bg-gradient-to-b from-white to-transparent"
								></div>

								{#if relevantEpisodes.hasOwnProperty('length') && relevantEpisodes.length > 0}
									<div class="flex flex-col gap-6">
										{#each relevantEpisodes as episode (episode.id)}
											<div class="relative">
												<EpisodePreview
													{episode}
													{userClassify}
													classificationStatus={getClassificationStatus(episode.id)}
													{processClassificationQueue}
												/>
											</div>
										{/each}
									</div>
								{/if}

								<!-- Bottom fade indicator -->
								<div
									class="pointer-events-none absolute -bottom-6 left-0 right-0 z-10 h-6 bg-gradient-to-t from-white to-transparent"
								></div>
							</div>
						</div>
						<!-- Subscribe component - always visible -->
						<div class="border-t border-green-500/20 px-4 py-6">
							<Subscribe {relevantEpisodes} {relevantFeedID} />
						</div>
					</div>
				{/if}
				{#if episodes.length === 0 && catalogueState.state === 'syncing'}
					<EmptyEpisodes />
				{/if}
				<div>
					{#if unclassifiedEpisodes.length > 0}
						<Heading2
							>{unclassifiedEpisodes.length} episode{everythingElseEpisodes.length === 1
								? ''
								: 's'}</Heading2
						> waiting to be selected
						<div transition:slide class="my-8 grid gap-6">
							{#each unclassifiedEpisodes as episode (episode.id)}
								<EpisodePreview
									{episode}
									{userClassify}
									classificationStatus={getClassificationStatus(episode.id)}
								/>
							{/each}
						</div>
					{/if}
				</div>
				<div class="">
					{#if everythingElseEpisodes.length > 0}
						<Heading2>
							{everythingElseEpisodes.length} episode{everythingElseEpisodes.length === 1
								? ''
								: 's'} excluded
						</Heading2>
						<div transition:slide class="my-8 grid gap-6 px-4">
							{#each everythingElseEpisodes as episode (episode.id)}
								<EpisodePreview
									{episode}
									{userClassify}
									classificationStatus={getClassificationStatus(episode.id)}
								/>
							{/each}
						</div>
					{:else}{/if}
				</div>
			</div>
		</Tabs.Content>
		<Tabs.Content value="subscribe">
			<div class="my-12">
				<Subscribe {relevantEpisodes} {relevantFeedID} />
			</div>
		</Tabs.Content>
	</Tabs.Root>
</div>
