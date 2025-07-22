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

	interface Props {
		data: PageData;
	}

	let { data = $bindable() }: Props = $props();

	let megaCatalogue: components['schemas']['MegaCatalogueResponse'] | null;
	let errorText = $state('');
	let episodes: JSONFeedItem[] | null = $state(null);
	let relevantFeedID = $state('');
	let relevantEpisodes: JSONFeedItem[] | null = $derived.by(() => {
		if (episodes === null) {
			return null;
		} else {
			return episodes.filter((item) =>
				item._categories?.some((category) => category.feed_title !== 'Everything else')
			);
		}
	});
	let everythingElseFeedID = '';
	let everythingElseEpisodes: JSONFeedItem[] | null = $derived.by(() => {
		if (episodes === null) {
			return null;
		} else {
			return episodes.filter((item) =>
				item._categories?.some((category) => category.feed_title === 'Everything else')
			);
		}
	});
	let unclassifiedEpisodes: JSONFeedItem[] | null = $derived.by(() => {
		if (episodes === null) {
			return null;
		} else {
			return episodes.filter((item) => !item._categories || item._categories.length === 0);
		}
	});
	let thinkingAboutQueries = $state('');
	let queries: string[] = $state([]);
	let intervalId: NodeJS.Timeout | null;
	let catalogueState = $state({ state: '' });
	let activeTab: string = $state('think');
	const pulsingClasses =
		'animate-pulse bg-gradient-to-l from-fuchsia-500 to-green-500 bg-clip-text text-transparent';

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

	function simulateSpottyServer() {
		return new Promise((resolve, reject) => {
			// Simulate a random delay between 1 and 3 seconds
			const delay = Math.floor(Math.random() * 3000) + 1000;

			setTimeout(() => {
				// Randomly decide if the server will respond successfully or fail
				const isSuccess = Math.random() > 0.5;

				if (isSuccess) {
					resolve('Server responded successfully!');
				} else {
					reject('Server failed to respond.');
				}
			}, delay);
		});
	}

	async function processClassificationQueue() {
		let hasPending = false;

		for (const item of classificationQueue) {
			if (item.status !== 'pending') continue;
			hasPending = true;

			try {
				await simulateSpottyServer(); // Replace with real API call
				item.status = 'success';
			} catch (error) {
				console.error(`Classification failed for ${item.episodeId}:`, error);
				item.status = 'error';
				item.retries++;

				if (item.retries < 3) {
					// Reset to pending for next retry
					item.status = 'pending';
				} else {
					console.warn(`Max retries reached for ${item.episodeId}`);
				}
			}
		}

		// Schedule next retry if any item is still pending or needs retry
		if (
			hasPending ||
			classificationQueue.some((item) => item.status === 'error' && item.retries < 3)
		) {
			setTimeout(processClassificationQueue, 5000);
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

	async function fetchMegaCatalogue(catalogue_id: string) {
		console.debug(`fetching Mega Catalogue ${catalogue_id}`);
		const megaCatalogueResponse = await fetch(`/api/catalogue/${catalogue_id}`);
		megaCatalogue = await megaCatalogueResponse.json();
		if (!megaCatalogueResponse.ok || !megaCatalogue) {
			console.error(`megaCatalogue was`, megaCatalogue);
			errorText = `sorry, couldn't get search from the server`;
			return;
		}
		catalogueState = { state: megaCatalogue.catalogue.state };
		data.prompt = megaCatalogue.catalogue.name;
		megaCatalogue.output_feeds.forEach((f) => {
			if (f.title === 'Everything else') {
				console.debug(`Found 'Everything else' feed:  ${f.id}`);
				everythingElseFeedID = f.id;
			} else {
				console.debug(`Found relevant feed: ${f.id}`);
				relevantFeedID = f.id;
			}
		});
		if (megaCatalogue.input_feeds.length > 0) {
			queries = megaCatalogue.input_feeds.map((f) => f.title);
		}
	}

	onMount(async () => {
		if (data.catalogue_id) {
			activeTab = 'search';
			console.debug(`Loading an existing catalogue`, data.catalogue_id);
			await fetchMegaCatalogue(data.catalogue_id);
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

				if (allEpisodes.items) {
					episodes = allEpisodes.items;

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
					} else if (Date.now() - lastCategorisedCountTime > 60000) {
						console.debug('Categorised count unchanged for 60 seconds, stopping polling');
						stopPolling();
						return;
					}
				} else {
					console.debug(`No items in the response`, allEpisodes);
					relevantEpisodes = [];
					everythingElseEpisodes = [];
				}

				catalogueState = await fetchCatalogueState(data.catalogue_id);
				switch (catalogueState.state) {
					case 'idle':
						console.debug("State is idle, we assume we're done, stopping polling");
						stopPolling();
						return;
					case 'errored':
						console.error('There was an error with the catalaogue');
						errorText = 'something broke on the server';
						stopPolling();
						return;
				}

				// Schedule next poll
				// const pollInterval = ['syncing', 'classifying'].includes(catalogueState.state)
				// 	? 5000
				// 	: 1000;
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
			await fetchMegaCatalogue(catalogueResponseJSON.catalogue.id);
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

<div class="mx-auto max-w-xl px-2 py-8 lg:px-4">
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
			<Tabs.List class="mx-auto">
				<Tabs.Trigger value="think">1. <Orbit class="mx-2 w-4" /> think</Tabs.Trigger>
				<Tabs.Trigger value="search">
					<div class="flex w-fit flex-row">
						2.
						<span
							class={[pulsingClasses && catalogueState.state === 'syncing', 'mx-2 flex flex-row']}
							><Search class="mx-2 w-4" />search</span
						>
						+
						<span
							class={[
								pulsingClasses && catalogueState.state === 'classifying',
								'mx-2 flex flex-row'
							]}><ChartCandlestick class="mx-2 w-4" /> select</span
						>
					</div>
				</Tabs.Trigger>
				<Tabs.Trigger value="subscribe">3. <Podcast class="mx-2 w-4" />subscribe</Tabs.Trigger>
			</Tabs.List>
		</div>
		<Tabs.Content value="think"><Markdown content={thinkingAboutQueries} /></Tabs.Content>
		<Tabs.Content value="search">
			<div class="my-4 min-h-16 w-full text-center leading-8">
				{#each queries as query}
					<Badge variant="secondary">{query}</Badge>
				{/each}
			</div>
			{#if episodes === null || (episodes.length === 0 && catalogueState.state === 'syncing')}
				<EmptyEpisodes />
			{/if}
			{#if relevantEpisodes !== null}
				<div class="my-8 grid gap-6">
					{#each relevantEpisodes as episode (episode.id)}
						<div class="relative">
							<EpisodePreview
								{episode}
								{userClassify}
								classificationStatus={getClassificationStatus(episode.id)}
							/>
						</div>
					{/each}
				</div>
			{/if}
			<div>
				{#if unclassifiedEpisodes !== null}
					<div class="my-8 grid gap-6">
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
			<Subscribe {relevantEpisodes} {relevantFeedID} />
			<div class="">
				{#if everythingElseEpisodes !== null}
					<div class="my-8 grid gap-6">
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
		</Tabs.Content>
		<Tabs.Content value="subscribe"><Subscribe {relevantEpisodes} {relevantFeedID} /></Tabs.Content>
	</Tabs.Root>
</div>
