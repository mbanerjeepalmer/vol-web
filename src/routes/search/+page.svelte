<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import Markdown from '$lib/components/Markdown.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import type { PageData } from './$types';
	import * as Sheet from '$lib/components/ui/sheet';
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

	export let data: PageData;

	let errorText = '';
	let relevantFeedID = '';
	let relevantEpisodes: JSONFeedItem[] | null = null;
	let everythingElseFeedID = '';
	let everythingElseEpisodes: JSONFeedItem[] | null = null;
	let isThinking: boolean | null = null;
	let thinkingAboutQueries = '';
	let queries: string[] = [];
	let intervalId: NodeJS.Timeout | null;
	// TODO toast library
	let hasCopied = false;
	let nextPollTime: number;
	let timeUntilNextPoll: number;
	let countdownInterval: NodeJS.Timeout | null;
	let catalogueState = { state: '' };
	let activeTab: string;
	const pulsingClasses =
		'animate-pulse bg-gradient-to-l from-fuchsia-500 to-green-500 bg-clip-text text-transparent';

	let isProcessingQueue = false;

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
		queries = megaCatalogueJSON.input_feeds.map((f) => f.title);
	}

	onMount(async () => {
		if (data.catalogue_id) {
			activeTab = 'search';
			console.debug(`Loading an existing catalogue`, data.catalogue_id);
			await fetchMegaCatalogue(data.catalogue_id);
			await pollRelevantEpisodesFeed();
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
		if (countdownInterval) {
			clearInterval(countdownInterval);
			countdownInterval = null;
			console.debug(`Stopped countdown`);
		}
	});

	async function fetchRelevant() {
		if (!relevantFeedID) {
			console.info(`No relevantFeedID`);
			return;
		}
		try {
			isProcessingQueue = true;
			console.debug(`Fetching relevant feed: ${relevantFeedID}`);
			const { data: relevant, error: relevantEpisodesError } = await client.GET(
				'/feed/{feed_id}/json',
				{
					params: {
						path: {
							feed_id: relevantFeedID
						},
						query: { catalogue_id: data.catalogue_id }
					}
				}
			);

			if (relevantEpisodesError) {
				console.error(relevantEpisodesError);
				if (relevantEpisodesError.detail) {
					errorText = `oh no! tried to fetch feeds but, error: ${relevantEpisodesError.detail[0].msg}`;
				} else {
					errorText = `uh oh. unexpected, unknown error trying to fetch feeds`;
				}
				return;
			}
			if (relevant.items) {
				console.debug(`Relevant feed has ${relevant.items.length} items`);
				relevantEpisodes = relevant.items;
			} else {
				console.debug(`relevant feed didn't have items`, relevant);
			}
		} catch (err) {
			console.error(`Error when fetching the relevant feed`, err);
		} finally {
			isProcessingQueue = false;
		}
	}

	async function fetchEverythingElse() {
		try {
			const { data: everythingElse, error: everythingElseError } = await client.GET(
				'/feed/{feed_id}/json',
				{
					params: {
						path: {
							feed_id: everythingElseFeedID
						}
					}
				}
			);

			if (everythingElseError) {
				console.error(everythingElseError);
				if (everythingElseError.detail) {
					errorText = `oh no! fetching the 'everything else' feed broke`;
				} else {
					errorText = `uh oh. something broke in the 'everything else' feed`;
				}
				return;
			}
			if (everythingElse.items) {
				everythingElseEpisodes = everythingElse.items;
			}
			isProcessingQueue = false;
		} finally {
			isProcessingQueue = false;
		}
	}

	let consecutiveFeedChecks = 0;
	let previousFeedItemCount = 0;
	let isPolling = false;

	async function pollRelevantEpisodesFeed() {
		catalogueState = await fetchCatalogueState(data.catalogue_id);
		if (isPolling) {
			console.debug(`Already polling`);
			return;
		}
		isPolling = true;
		console.debug(`Starting polling`);

		const stopPolling = () => {
			if (intervalId) {
				clearTimeout(intervalId);
				intervalId = null;
			}
			if (countdownInterval) {
				clearInterval(countdownInterval);
				countdownInterval = null;
			}
			isPolling = false;
		};

		const poll = async () => {
			try {
				await fetchRelevant();
				if (relevantEpisodes === null) {
					console.debug(`relevantEpisodes was null:`, relevantEpisodes);
					return;
				}
				console.log(`Feed item count: ${relevantEpisodes.length}`);

				if (relevantEpisodes.length === previousFeedItemCount) {
					consecutiveFeedChecks++;
					console.log(`Consecutive feed checks: ${consecutiveFeedChecks}`);
				} else {
					consecutiveFeedChecks = 0;
				}
				previousFeedItemCount = relevantEpisodes.length;
			} catch (error) {
				console.error(error);
			} finally {
				let shouldStop = false;

				if (data.catalogue_id) {
					catalogueState = await fetchCatalogueState(data.catalogue_id);
					if (['idle', 'errored'].includes(catalogueState.state)) {
						shouldStop = true;
					}
				}

				if (consecutiveFeedChecks >= 5) {
					shouldStop = true;
					if (relevantEpisodes === null || relevantEpisodes.length === 0) {
						console.error(`relevantEpisodes for ${relevantFeedID} was`, relevantEpisodes);
						errorText = 'sorry, looks like vol failed to find any episodes';
					}
				}

				if (shouldStop) {
					stopPolling();
				} else {
					// Schedule next poll after 20 seconds
					nextPollTime = Date.now() + 20000;
					intervalId = setTimeout(poll, 20000);
				}
			}
		};

		countdownInterval = setInterval(async () => {
			const now = Date.now();
			const remaining = nextPollTime - now;
			timeUntilNextPoll = Math.max(0, Math.floor(remaining / 1000));
			catalogueState = await fetchCatalogueState(data.catalogue_id);
		}, 1000);

		nextPollTime = Date.now() + 20000;
		await poll();
	}

	async function createCatalogueFromQueries(queryList: string[]) {
		try {
			isThinking = false;
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
			catalogueState = await fetchCatalogueState(data.catalogue_id);
			console.debug('catalogueResponseJSON', catalogueResponseJSON);
			const newURL = new URL($page.url);
			newURL.searchParams.set('catalogue_id', catalogueResponseJSON.catalogue.id);
			goto(newURL);
			console.debug(`Going to start fetching data`);
			await fetchMegaCatalogue(catalogueResponseJSON.catalogue.id);
			await pollRelevantEpisodesFeed();
		} catch (error) {
			console.error('Search request failed:', error);
			errorText = 'The server broke.';
		} finally {
			isThinking = false;
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
				<Tabs.Trigger value="think">1. think</Tabs.Trigger>
				<Tabs.Trigger value="search">
					2. <span class={catalogueState.state === 'syncing' ? pulsingClasses : ''}>search</span>
					+
					<span class={catalogueState.state === 'classifying' ? pulsingClasses : ''}>select</span>
				</Tabs.Trigger>
				<Tabs.Trigger value="subscribe">3. subscribe</Tabs.Trigger>
			</Tabs.List>
		</div>
		<Tabs.Content value="think"><Markdown content={thinkingAboutQueries} /></Tabs.Content>
		<Tabs.Content value="search"
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

			<div class="mt-12 opacity-80 hover:opacity-100">
				{#if relevantEpisodes === null}{:else if everythingElseEpisodes === null}
					<Button
						class="mx-auto w-full underline underline-offset-4"
						variant="link"
						on:click={async () => await fetchEverythingElse()}>everything else... ⏷</Button
					>
				{:else if everythingElseEpisodes.length > 0}
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
