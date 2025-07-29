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
	import ScrollableEpisodes from '$lib/components/ScrollableEpisodes.svelte';

	interface Props {
		data: PageData;
	}

	let { data = $bindable() }: Props = $props();

	let errorText = $state('');

	let episodes: JSONFeedItem[] = $state([]);
	// TODO should just be an object
	let relevantFeedTitle = $state('');
	let relevantFeedID = $state('');
	let relevantEpisodes: JSONFeedItem[] = $derived.by(() => {
		return episodes.filter((item) =>
			item._categories?.some((category) => category.feed_title !== 'Everything else')
		);
	});
	let everythingElseFeedID = $state('');
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
			// not found  → prepend
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

		if (!relevantFeedID || !everythingElseFeedID) {
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
				if (relevantFeedID && everythingElseFeedID) {
					break;
				} else if (title === 'Everything else') {
					everythingElseFeedID = id;
				} else if (title !== 'Everything else') {
					relevantFeedID = id;
					relevantFeedTitle = title;
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

		async function fetchEpisodes(catalogue_id: string) {
			const { data: allEpisodes, error: allEpisodesError } = await client.GET(
				'/catalogue/{catalogue_id}/item',
				{
					params: {
						path: { catalogue_id: catalogue_id },
						query: { format: 'json_feed', count: 50, sort: 'desc' }
					}
				}
			);

			if (allEpisodesError) {
				throw allEpisodesError;
			}

			// Note: This means if we don't have any episodes then we also don't have queries
			// But on creation the queries are populated client-side.
			// And for an existing catalogue the episodes should all be there.
			populateCatalogueMetadataFromEpisodes(allEpisodes);
			return allEpisodes;
		}

		const poll = async (retryCount = 0) => {
			try {
				if (!data.catalogue_id) {
					console.debug('No catalogue ID');
					return;
				}

				catalogueState = await fetchCatalogueState(data.catalogue_id);
				let allEpisodes = await fetchEpisodes(data.catalogue_id);

				if (allEpisodes && allEpisodes.hasOwnProperty('items')) {
					console.debug(`Got allEpisodes.items`, { items_count: allEpisodes.items.length });

					const maxBatchTime = 3000; // 3s total max
					const delayPerItem = 400; // Initial delay per item
					const maxItemsBeforeBatch = Math.floor(maxBatchTime / delayPerItem); // ~10 items

					let index = 0;
					const interval = setInterval(() => {
						if (index < allEpisodes.items.length) {
							if (index < maxItemsBeforeBatch) {
								episodes = upsert(episodes, allEpisodes.items[index]);
								index++;
							} else {
								// batch branch
								const rest = allEpisodes.items.slice(index);
								let next = episodes;
								for (const ep of rest) next = upsert(next, ep);
								episodes = next;
								clearInterval(interval);
								return;
							}
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
						console.debug('State is idle, one more fetch then stop polling.');
						stopPolling();
						await fetchEpisodes(data.catalogue_id);
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

				if (retryCount < 2) {
					console.debug(`Retrying poll (attempt ${retryCount + 2}/3)`);
					intervalId = setTimeout(() => poll(retryCount + 1), 2000);
				} else {
					errorText = 'server broke, sorry';
					stopPolling();
				}
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
			goto(newURL, { noScroll: true });
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
	async function userClassify(episode: JSONFeedItem, label: 'plus' | 'minus') {
		// Early return if no output feeds are available
		if (!relevantFeedID || !relevantFeedTitle || !everythingElseFeedID) {
			console.error("Don't have category data", {
				relevantFeedID: relevantFeedID,
				relevantFeedTitle: relevantFeedTitle,
				everythingElseFeedID: everythingElseFeedID
			});
			errorText = "error: don't have categories";
			return;
		}

		// Determine the target feed based on the label
		const isMinus = label === 'minus';
		const targetFeedTitle = isMinus ? 'Everything else' : relevantFeedTitle;

		// Update episode categories
		episode._categories = [
			{
				feed_title: targetFeedTitle,
				feed_url: `${PUBLIC_ZACUSCA_API_BASE}/feed/${relevantFeedID}/rss`
			}
		];

		// Update or add to classification queue
		const existing = classificationQueue.find((q) => q.episodeId === episode.id);
		if (existing) {
			existing.feed_title = targetFeedTitle;
			existing.status = 'pending';
			existing.retries = 0;
		} else {
			classificationQueue.push({
				episodeId: episode.id,
				feed_title: targetFeedTitle,
				status: 'pending',
				retries: 0
			});
		}
		processClassificationQueue();
	}
</script>

<svelte:head><title>{data.prompt}</title></svelte:head>
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
					<div class="flex w-fit flex-row items-center">
						2.

						<Search class="mx-2 w-4" /><span
							class={[catalogueState.state === 'syncing' && pulsingClasses]}
						>
							search
						</span>

						<span class="mx-2">+</span>

						<ChartCandlestick class="mx-2 w-4" />
						<span class={[catalogueState.state === 'classifying' && pulsingClasses]}>select</span>
					</div>
				</Tabs.Trigger>
				<Tabs.Trigger value="subscribe">3. <Podcast class="mx-2 w-4" />subscribe</Tabs.Trigger>
			</Tabs.List>
		</div>
		<Tabs.Content value="think"
			><div class="py-6"><Markdown content={thinkingAboutQueries} /></div></Tabs.Content
		>
		<Tabs.Content value="search">
			<div class="flex flex-col gap-10">
				<div
					class=" my-4 flex min-h-16 w-full flex-wrap items-center justify-center gap-2 text-center leading-8"
				>
					{#if queries.length > 0}
						{#each queries as query}
							<Badge class="h-fit" variant="secondary">{query}</Badge>
						{/each}
					{:else if catalogueState.state === 'syncing'}
						{#each Array(4) as _}
							<Badge class="h-6 w-28 animate-pulse" variant="secondary"></Badge>
						{/each}
					{/if}
				</div>

				{#if relevantEpisodes.length > 0}
					<!-- TODO use snippets more efficiently here -->
					<ScrollableEpisodes themeColour="green">
						{#snippet headingText()}
							selected {relevantEpisodes.length} episode{everythingElseEpisodes.length === 1
								? ''
								: 's'} for your playlist
						{/snippet}
						{#snippet epsidodesSlot()}
							{#each relevantEpisodes as episode (episode.id)}
								<EpisodePreview
									{episode}
									{userClassify}
									classificationStatus={getClassificationStatus(episode.id)}
									{processClassificationQueue}
								/>
							{/each}
						{/snippet}
						{#snippet subscribeSlot()}
							<Subscribe {relevantEpisodes} {relevantFeedID} />
						{/snippet}
					</ScrollableEpisodes>
				{/if}
				<!-- TODO use <ScrollableEpisodes/> -->
				{#if episodes.length === 0 && catalogueState.state === 'syncing'}
					<Heading2>searching for episodes</Heading2>
					<EmptyEpisodes />
				{/if}
				<div>
					{#if unclassifiedEpisodes.length > 0}
						<ScrollableEpisodes>
							{#snippet headingText()}{unclassifiedEpisodes.length} episode{unclassifiedEpisodes.length ===
								1
									? ''
									: 's'}
								awaiting selection
							{/snippet}
							{#snippet epsidodesSlot()}
								{#each unclassifiedEpisodes as episode (episode.id)}
									<EpisodePreview
										{episode}
										{userClassify}
										classificationStatus={getClassificationStatus(episode.id)}
									/>
								{/each}
							{/snippet}
						</ScrollableEpisodes>
					{/if}
				</div>
				{#if everythingElseEpisodes.length > 0}
					<ScrollableEpisodes themeColour="fuchsia">
						{#snippet headingText()}
							{everythingElseEpisodes.length} episode{everythingElseEpisodes.length === 1
								? ''
								: 's'} excluded
						{/snippet}
						{#snippet epsidodesSlot()}
							{#each everythingElseEpisodes as episode (episode.id)}
								<EpisodePreview
									{episode}
									{userClassify}
									classificationStatus={getClassificationStatus(episode.id)}
								/>
							{/each}
						{/snippet}
					</ScrollableEpisodes>
				{/if}
			</div>
		</Tabs.Content>
		<Tabs.Content value="subscribe">
			<div class="my-12">
				<Subscribe {relevantEpisodes} {relevantFeedID} />
			</div>
		</Tabs.Content>
	</Tabs.Root>
</div>
