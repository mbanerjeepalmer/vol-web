<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import Markdown from '$lib/components/Markdown.svelte';
	import type { PageData } from './$types';
	import type { JSONFeedItem } from '$lib/types';
	import EpisodePreview from '$lib/components/EpisodePreview.svelte';
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import createClient from 'openapi-fetch';
	import { PUBLIC_ZACUSCA_API_BASE } from '$env/static/public';
	import type { components, paths } from '$lib/zacusca_api_types';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import * as Tabs from '$lib/components/ui/tabs/index';
	import Subscribe from '$lib/components/Subscribe.svelte';
	import { ChartCandlestick, Orbit, Podcast, Search } from 'lucide-svelte';

	export let data: PageData;

	let errorText = '';
	let relevantFeedID = '';
	let relevantEpisodes: JSONFeedItem[] | null = null;
	let everythingElseFeedID = '';
	let everythingElseEpisodes: JSONFeedItem[] | null = null;
	let thinkingAboutQueries = '';
	let queries: string[] = [];
	let intervalId: NodeJS.Timeout | null;
	let catalogueState = { state: '' };
	let activeTab: string;
	const pulsingClasses =
		'animate-pulse bg-gradient-to-l from-fuchsia-500 to-green-500 bg-clip-text text-transparent';

	let isProcessingQueue = false;

	// Tracking for stopping conditions
	let lastCategorizedCount = 0;
	let lastCategorizedCountTime = Date.now();
	let isPolling = false;

	const client = createClient<paths>({
		baseUrl: PUBLIC_ZACUSCA_API_BASE
	});

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
		const megaCatalogueJSON: components['schemas']['MegaCatalogueResponse'] =
			await megaCatalogueResponse.json();
		catalogueState = { state: megaCatalogueJSON.catalogue.state };
		data.prompt = megaCatalogueJSON.catalogue.name;
		megaCatalogueJSON.output_feeds.forEach((f) => {
			if (f.title === 'Everything else') {
				console.debug(`Found 'Everything else' feed:  ${f.id}`);
				everythingElseFeedID = f.id;
			} else {
				console.debug(`Found relevant feed: ${f.id}`);
				relevantFeedID = f.id;
			}
		});
		if (megaCatalogueJSON.input_feeds.length > 0) {
			queries = megaCatalogueJSON.input_feeds.map((f) => f.title);
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

				// Check if we should stop due to error state
				if (catalogueState.state === 'errored') {
					errorText = 'the server broke';
					stopPolling();
					return;
				}

				// Fetch episodes if we're syncing or classifying
				if (['syncing', 'classifying', 'idle'].includes(catalogueState.state)) {
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
						errorText = 'the server broke';
						stopPolling();
						return;
					}

					if (allEpisodes.items) {
						relevantEpisodes = allEpisodes.items.filter((item) =>
							item._categories.some((cat) => (cat.feed_title === 'Everything else' ? false : true))
						);
						everythingElseEpisodes = allEpisodes.items.filter((item) =>
							item._categories.some((cat) => cat.feed_title === 'Everything else')
						);

						// Check stopping conditions
						const categorisedCount = allEpisodes.items.filter(
							(item) => item._categories && item._categories.length > 0
						).length;
						const totalCount = allEpisodes.items.length;

						// All items have categories
						if (categorisedCount === totalCount && totalCount > 0) {
							console.debug('All items have categories, stopping polling');
							stopPolling();
							return;
						}

						// Check if categorized count hasn't changed for 60 seconds
						if (categorisedCount !== lastCategorizedCount) {
							lastCategorizedCount = categorisedCount;
							lastCategorizedCountTime = Date.now();
						} else if (Date.now() - lastCategorizedCountTime > 60000) {
							console.debug('Categorized count unchanged for 60 seconds, stopping polling');
							stopPolling();
							return;
						}
					} else {
						console.debug(`No items in the response`, allEpisodes);
						relevantEpisodes = [];
						everythingElseEpisodes = [];
					}
				}

				// Check if state changed from classifying to idle
				if (catalogueState.state === 'idle') {
					console.debug('State is idle, stopping polling');
					stopPolling();
					return;
				}

				// Schedule next poll
				const pollInterval = ['syncing', 'classifying'].includes(catalogueState.state)
					? 5000
					: 1000;
				intervalId = setTimeout(poll, pollInterval);
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
			const newURL = new URL($page.url);
			newURL.searchParams.set('catalogue_id', catalogueResponseJSON.catalogue.id);
			goto(newURL);
			console.debug(`Going to start fetching data`);
			await fetchMegaCatalogue(catalogueResponseJSON.catalogue.id);
			await startPolling();
		} catch (error) {
			console.error('Search request failed:', error);
			errorText = 'The server broke.';
		} finally {
			activeTab = 'search';
		}
	}

	function parseQueries(content: string): string[] {
		const queryRegex = /<query>(.*?)<\/query>/g;
		const matches = [...content.matchAll(queryRegex)];
		return matches.map((match) => match[1].trim());
	}
</script>

<div class="mx-auto max-w-xl px-2 py-8 lg:px-4">
	<h1 class="mb-8 text-center text-4xl font-extrabold tracking-tight lg:text-5xl">
		{data.prompt}
	</h1>

	<p class="mx-auto max-w-lg text-center text-xs text-red-600">{errorText}</p>

	<Tabs.Root value={activeTab} class="w-full">
		<div class="flex w-full">
			<Tabs.List class="mx-auto">
				<Tabs.Trigger value="think">1. <Orbit class="mx-2 w-4" /> think</Tabs.Trigger>
				<Tabs.Trigger value="search">
					<div class="flex flex-row gap-2">
						2.<Search class="mx-2 w-4" />
						<span class={catalogueState.state === 'syncing' ? pulsingClasses : ''}>search</span>
						+ <ChartCandlestick class="mx-2 w-4" />
						<span class={catalogueState.state === 'classifying' ? pulsingClasses : ''}>select</span>
					</div>
				</Tabs.Trigger>
				<Tabs.Trigger value="subscribe">3. <Podcast class="mx-2 w-4" />subscribe</Tabs.Trigger>
			</Tabs.List>
		</div>
		<Tabs.Content value="think"><Markdown content={thinkingAboutQueries} /></Tabs.Content>
		<Tabs.Content value="search" class="flex flex-col"
			><div class="my-4 min-h-16 w-full text-center leading-8">
				{#each queries as query}
					<Badge variant="secondary">{query}</Badge>
				{/each}
			</div>
			{#if relevantEpisodes === null || (relevantEpisodes.hasOwnProperty('length') && relevantEpisodes.length === 0)}
				<div class="flex w-full flex-col items-center justify-center gap-4 p-4">
					<div class="flex w-full animate-pulse flex-col gap-6 opacity-50">
						<EpisodePreview
							episode={{
								title: '',
								attachments: [],
								content_html: '',
								image: '',
								authors: [],
								date_published: '',
								id: '',
								url: '',
								summary: ''
							}}
						/>
						<EpisodePreview
							episode={{
								title: '',
								attachments: [],
								content_html: '',
								image: '',
								authors: [],
								date_published: '',
								id: '',
								url: '',
								summary: ''
							}}
						/>
						<EpisodePreview
							episode={{
								title: '',
								attachments: [],
								content_html: '',
								image: '',
								authors: [],
								date_published: '',
								id: '',
								url: '',
								summary: ''
							}}
						/>
						<EpisodePreview
							episode={{
								title: '',
								attachments: [],
								content_html: '',
								image: '',
								authors: [],
								date_published: '',
								id: '',
								url: '',
								summary: ''
							}}
						/>
					</div>
				</div>
			{:else if relevantEpisodes.length > 0}
				<div class="my-8 grid gap-6">
					{#each relevantEpisodes as episode, index}
						<EpisodePreview {episode} />
					{/each}
				</div>
			{/if}
			<Subscribe {relevantEpisodes} {relevantFeedID} />
			<div class="">
				{#if relevantEpisodes === null || everythingElseEpisodes === null}{:else if everythingElseEpisodes.length > 0}
					<div class="my-8 grid gap-6">
						{#each everythingElseEpisodes as episode}
							<EpisodePreview {episode} />
						{/each}
					</div>
				{:else}
					<div class="w-full text-center"><p>nothing else.</p></div>
				{/if}
			</div></Tabs.Content
		>
		<Tabs.Content value="subscribe"><Subscribe {relevantEpisodes} {relevantFeedID} /></Tabs.Content>
	</Tabs.Root>
</div>
