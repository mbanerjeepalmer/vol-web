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
	import type { paths } from '$lib/zacusca_api_types';

	export let data: PageData;

	let errorText = '';
	let relevantFeedID = '';
	let relevantEpisodes: JSONFeedItem[] = [];
	let everythingElseFeedID = '';
	let everythingElseEpisodes: JSONFeedItem[] = [];
	let isThinking = true;
	let thinkingAboutQueries = '';
	let queries: string[] = [];
	// Track which episodes are being rated
	let ratingInProgress = new Set<string>();

	let isProcessingQueue = false;

	const client = createClient<paths>({
		baseUrl: PUBLIC_ZACUSCA_API_BASE
	});

	// async function fetchCatalogueFeeds(catalogue_id: string){
	// 	// TODO not sure if this is the correct level of granularity
	// 	// Probably need to adjust the mega endpoint or something
	// 	const {data: catalogueData, error: catalogueEror} = client.
	// }

	onMount(async () => {
		// Check for existing search data first
		if (data.catalogue_id) {
			const megaCatalogueResponse = await fetch(`/api/catalogue/${data.catalogue_id}`);
			const megaCatalogueJSON = await megaCatalogueResponse.json();
			data.prompt = megaCatalogueJSON.title;

			// await fetchFeeds();
			return;
		} else if (data.prompt) {
			// 2025-06-26 TEMPORARY
			// Remove history. The behaviour is a bit unexpected.
			// const userContext = new URLSearchParams({
			// 	prompt: data.prompt
			// interactions: encodedHistory
			// });

			let url = `/api/prompt-to-queries?prompt=${encodeURIComponent(data.prompt)}`;

			const eventSource = new EventSource(url);

			eventSource.onmessage = (event) => {
				thinkingAboutQueries += event.data.replace(/\\n/g, '\n');
			};

			eventSource.onerror = () => {
				eventSource.close();
				queries = parseQueries(thinkingAboutQueries);
				if (queries.length > 0) {
					fetchSearchResults(queries);
				} else {
					// What is this?
					queries = data.queries;
					fetchSearchResults(queries);
				}
			};
		}
	});

	async function fetchFeeds() {
		// if (isProcessingQueue) {
		// 	console.debug('Already processing queue');
		// 	return;
		// }

		try {
			isProcessingQueue = true;
			const { data: relevantEpisodesData, error: relevantEpisodesError } = await client.GET(
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
				errorText = 'Something broke when fetching feeds';
			}
			relevantEpisodes = await relevantEpisodesData.json();
			isProcessingQueue = false;
		} finally {
			isProcessingQueue = false;
		}
	}

	// Save search data whenever we have results
	// $: if (relevantEpisodes.length > 0) {
	// 	const searchData = {
	// 		id: data.searchId,
	// 		prompt: data.prompt,
	// 		queries,
	// 		searchResults: relevantEpisodes,
	// 		thinking: thinkingAboutQueries,
	// 		timestamp: Date.now()
	// 	};
	// 	localStorage.setItem(`vol-search-${data.searchId}`, JSON.stringify(searchData));
	// }

	async function fetchSearchResults(queryList: string[]) {
		try {
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
		} catch (error) {
			console.error('Search request failed:', error);
			errorText = 'The server broke.';
			relevantEpisodes = [];
		} finally {
			isThinking = false;
		}
	}

	// Start rating all episodes when results load
	// TODO convert to Svelte 5
	$: if (relevantEpisodes.length > 0 && !isProcessingQueue) {
		void (async () => {
			await fetchFeeds();
		})();
	}

	async function rateEpisodes(episodes: Episode[]) {
		// Filter out episodes that already have ratings or are being processed
		const episodesToRate = episodes.filter((ep) => !ep.ratings && !ratingInProgress.has(ep.id));

		if (episodesToRate.length === 0) {
			console.debug('No episodes to rate in this batch');
			return;
		}

		// Mark episodes as in progress
		episodesToRate.forEach((ep) => ratingInProgress.add(ep.id));

		try {
			const body = {
				episodes: episodesToRate, // Only send episodes that need rating
				prompt: data.prompt
			};

			console.debug('About to rate', body);

			const response = await fetch('/api/rate-episodes', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(body)
			});

			const { ratings } = await response.json();

			// Update ratings for each episode
			if (ratings?.ratings) {
				ratings.ratings.forEach((rating: any) => {
					console.debug(`Updating ratings for ${rating.id}`);
					const episode = relevantEpisodes.find((ep) => ep.id === rating.id);
					if (episode && !episode.ratings) {
						// Only update if no ratings exist
						episode.ratings = rating.ratings;
					}
				});

				// Trigger reactivity
				relevantEpisodes = [...relevantEpisodes];
			}
		} catch (error) {
			console.error('Rating request failed:', error);
		} finally {
			// Clear in-progress status
			episodesToRate.forEach((ep) => ratingInProgress.delete(ep.id));
		}
	}

	function parseQueries(content: string): string[] {
		const queryRegex = /<query>(.*?)<\/query>/g;
		const matches = [...content.matchAll(queryRegex)];
		return matches.map((match) => match[1].trim());
	}

	let searchId = crypto.randomUUID();

	$: if (relevantEpisodes.length > 0) {
		const searchData = {
			id: searchId,
			results: relevantEpisodes,
			thinking: thinkingAboutQueries,
			prompt: data.prompt,
			timestamp: Date.now()
		};
		localStorage.setItem(`vol-search-${searchId}`, JSON.stringify(searchData));
	}

	$: sortedEpisodes = relevantEpisodes.sort(
		(a, b) => getAverageRating(b.ratings) - getAverageRating(a.ratings)
	);
</script>

<div class="mx-auto max-w-xl px-2 py-8 lg:px-4">
	<h1 class="mb-8 text-center text-4xl font-extrabold tracking-tight lg:text-5xl">
		{data.prompt}
	</h1>
	<ol class="flex flex-row items-center justify-center gap-4 text-sm">
		<li>
			{#if isThinking}<span
					class="animate-pulse bg-gradient-to-l from-fuchsia-500 to-green-500 bg-clip-text font-bold text-transparent"
					>1. thinking</span
				>{:else}
				<Sheet.Root>
					<Sheet.Trigger>
						<Button variant="link" class="underline">1. thought of search queries</Button>
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
				>{:else}2. ranked episodes{/if}
		</li>
	</ol>
	<p class="text-red-600">{errorText}</p>
	<div class="my-4 w-full text-center leading-8">
		{#each queries as query}
			<Badge variant="secondary">{query}</Badge>
		{/each}
	</div>
	{#if sortedEpisodes.length > 0}
		<div class="my-8 grid gap-6">
			{#each sortedEpisodes as episode, index}
				<EpisodePreview {episode} ratings={episode.ratings} sourceQuery={episode.sourceQuery} />
			{/each}
		</div>
	{/if}
</div>
