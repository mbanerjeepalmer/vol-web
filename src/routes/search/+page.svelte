<script lang="ts">
	import { onMount } from 'svelte';
	import Markdown from '$lib/components/Markdown.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import type { PageData } from './$types';
	import { getStoredSearch, getAverageRating } from '$lib/utils';
	import * as Sheet from '$lib/components/ui/sheet';
	import type { Episode, JSONFeedItem } from '$lib/types';
	import EpisodePreview from '$lib/components/EpisodePreview.svelte';
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import createClient from 'openapi-fetch';
	import { PUBLIC_ZACUSCA_API_BASE } from '$env/static/public';
	import type { components, paths } from '$lib/zacusca_api_types';
	import { Input } from '$lib/components/ui/input';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { fade } from 'svelte/transition';

	export let data: PageData;

	let errorText = '';
	let relevantFeedID = '';
	let relevantEpisodes: JSONFeedItem[] | null = null;
	let everythingElseFeedID = '';
	let everythingElseEpisodes: JSONFeedItem[] | null = null;
	let isThinking: boolean | null = null;
	let thinkingAboutQueries = '';
	let queries: string[] = [];
	let intervalId: NodeJS.Timeout;

	let isProcessingQueue = false;

	const client = createClient<paths>({
		baseUrl: PUBLIC_ZACUSCA_API_BASE
	});

	async function fetchMegaCatalogue(catalogue_id: string) {
		const megaCatalogueResponse = await fetch(`/api/catalogue/${catalogue_id}`);
		const megaCatalogueJSON: components['schemas']['MegaCatalogueResponse'] =
			await megaCatalogueResponse.json();
		data.prompt = megaCatalogueJSON.catalogue.name;
		megaCatalogueJSON.output_feeds.forEach((f) => {
			if (f.title === 'Everything else') {
				everythingElseFeedID = f.id;
			} else {
				relevantFeedID = f.id;
			}
		});
	}

	onMount(async () => {
		if (data.catalogue_id) {
			console.debug(`Loading an existing catalogue`, data.catalogue_id);
			await fetchMegaCatalogue(data.catalogue_id);
			await pollRelevantEpisodesFeed();
			return;
		} else if (data.prompt) {
			console.debug(`No existing catalogue_id so creating one`);
			let url = `/api/prompt-to-queries?prompt=${encodeURIComponent(data.prompt)}`;

			const eventSource = new EventSource(url);

			eventSource.onmessage = (event) => {
				thinkingAboutQueries += event.data.replace(/\\n/g, '\n');
			};

			eventSource.onerror = () => {
				eventSource.close();
				queries = parseQueries(thinkingAboutQueries);
				if (queries.length > 0) {
					createCatalogueFromQueries(queries);
				} else {
					// What is this?
					queries = data.queries;
					createCatalogueFromQueries(queries);
				}
			};
		}
	});

	async function fetchRelevant() {
		if (!relevantFeedID) {
			console.info(`No relevantFeedID`);
			return;
		}
		try {
			isProcessingQueue = true;
			const { data: relevant, error: relevantEpisodesError } = await client.GET(
				'/feed/{feed_id}/json',
				{
					params: {
						path: {
							feed_id: relevantFeedID
						}
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
				relevantEpisodes = relevant.items;
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
			if (everythingElse.hasOwnProperty('length')) {
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
		if (isPolling) return;
		isPolling = true;

		intervalId = setInterval(async () => {
			try {
				await fetchRelevant();
				if (relevantEpisodes === null) {
					console.debug(`relevantEpisodes was`, relevantEpisodes);
					return;
				}
				console.log(`Feed item count: ${relevantEpisodes.length}`);

				if (relevantEpisodes.length === previousFeedItemCount) {
					consecutiveFeedChecks++;
					console.log(`Consecutive feed checks: ${consecutiveFeedChecks}`);

					if (consecutiveFeedChecks >= 5) {
						clearInterval(intervalId);
						isPolling = false;
					}
				} else {
					consecutiveFeedChecks = 0;
				}
				previousFeedItemCount = relevantEpisodes.length;
			} catch (error) {
				console.error(error);
			}
		}, 2000);
	}

	async function createCatalogueFromQueries(queryList: string[]) {
		try {
			isThinking = false;
			const catalogueResponse = await fetch('/api/catalogue', {
				method: 'POST',
				body: JSON.stringify({
					prompt: data.prompt,
					queries: queryList,
					// TODO: improve this prompt
					criteria: `Episodes which align with the aspiration: '${data.prompt}''`
				})
			});
			const catalogueResponseJSON = await catalogueResponse.json();
			console.debug('catalogueResponseJSON', catalogueResponseJSON);
			const newURL = new URL($page.url);
			newURL.searchParams.set('catalogue_id', catalogueResponseJSON.catalogue.id);
			goto(newURL);
			console.debug(`wahey we're still here`);
		} catch (error) {
			console.error('Search request failed:', error);
			errorText = 'The server broke.';
		} finally {
			isThinking = false;
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
	<ol class="flex flex-row items-center justify-center gap-4 text-sm">
		<li>
			{#if isThinking === null}<span class="">1. thinking</span>
			{:else if isThinking}<span
					class="animate-pulse bg-gradient-to-l from-fuchsia-500 to-green-500 bg-clip-text font-bold text-transparent"
					>1. thinking</span
				>{:else}
				<Sheet.Root>
					<Sheet.Trigger>
						<Button variant="link" class="underline">1. thought (click to see)</Button>
					</Sheet.Trigger>
					<Sheet.Content side="right" class="overflow-y-auto">
						<Sheet.Header>
							<Sheet.Title>what the ai was thinking</Sheet.Title>
						</Sheet.Header>
						<div class="py-8">
							<Markdown content={thinkingAboutQueries} />
						</div>
					</Sheet.Content>
				</Sheet.Root>
			{/if}
		</li>
		<li>
			{#if isProcessingQueue}<span
					class="animate-pulse bg-gradient-to-l from-fuchsia-500 to-green-500 bg-clip-text font-bold text-transparent"
					>2. ranking episodes</span
				>{:else}<span>2. ranked episodes</span>{/if}
		</li>
	</ol>
	<p class="text-red-600">{errorText}</p>
	<div class="my-4 w-full text-center leading-8">
		{#each queries as query}
			<Badge variant="secondary">{query}</Badge>
		{/each}
	</div>
	<div
		class="mx-auto my-12 flex max-w-lg flex-col gap-y-6 rounded-md border border-border px-3 py-6"
		class:opacity-30={!relevantEpisodes || relevantEpisodes.length === 0}
	>
		<h2 class="px-1 text-lg font-medium tracking-tight">subscribe to these results as a podcast</h2>
		<div class="flex h-12 flex-row justify-between gap-x-6 align-middle">
			<!-- copy on click, cursor should be pointer -->
			<div class="flex flex-row gap-x-1">
				<Input class="h-full" value={`${PUBLIC_ZACUSCA_API_BASE}/feed/${relevantFeedID}/rss`} />
				<Button
					on:click={() =>
						navigator.clipboard.writeText(`${PUBLIC_ZACUSCA_API_BASE}/feed/${relevantFeedID}/rss`)}
					class="h-full"
					variant="outline">copy</Button
				>
			</div>
			<img
				class="p-1"
				src="/assets/US-UK_Apple_Podcasts_Listen_Badge_RGB_062023.svg"
				alt="Apple Podcasts badge"
			/>
		</div>
		<p>copy the RSS feed URL. paste it into your podcast player.</p>
	</div>
	{#if relevantEpisodes === null || relevantEpisodes.length === 0}
		<div class="flex w-full flex-col items-center justify-center gap-4 p-4">
			<p class="text-xl font-medium">no episodes yet</p>
			<div class="flex w-full flex-col gap-6 opacity-50">
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
					sourceQuery=""
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
					sourceQuery=""
				/>
			</div>
		</div>
	{:else if relevantEpisodes.length > 0}
		<div class="my-8 grid gap-6">
			{#each relevantEpisodes as episode, index}
				<EpisodePreview {episode} sourceQuery="TODO" />
			{/each}
		</div>
	{/if}
	<div class="mt-12 opacity-80 hover:opacity-100">
		{#if everythingElseEpisodes === null}
			<Button
				class="mx-auto w-full underline underline-offset-4"
				variant="link"
				on:click={async () => fetchEverythingElse()}>everything else... ⏷</Button
			>
		{:else if everythingElseEpisodes.length > 0}
			<div class="my-8 grid gap-6">
				{#each everythingElseEpisodes as episode}
					<EpisodePreview {episode} sourceQuery="TODO source" />
				{/each}
			</div>
		{:else}
			<div class="my-8 grid gap-6">
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
					sourceQuery="TODO source"
				/>
			</div>
		{/if}
	</div>
</div>
