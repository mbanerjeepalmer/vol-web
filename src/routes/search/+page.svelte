<script lang="ts">
	import { onMount } from 'svelte';
	import Markdown from '$lib/components/Markdown.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import type { PageData } from './$types';
	import { getStoredSearch, getAverageRating } from '$lib/utils';
	import * as Sheet from '$lib/components/ui/sheet';
	import type { Episode, EpisodeInteraction } from '$lib/types';
	import EpisodePreview from '$lib/components/EpisodePreview.svelte';

	export let data: PageData;

	let searchResults: any[] = [];
	let isThinking = true;
	let thinkingAboutQueries = '';
	let queries: string[] = [];
	// Track which episodes are being rated
	let ratingInProgress = new Set<string>();
	$: ratingQueue = searchResults.filter((item) => !item.ratings);
	let isProcessingQueue = false;

	onMount(async () => {
		// Check for existing search data first
		const storedSearch = getStoredSearch(data.searchId);
		if (storedSearch) {
			thinkingAboutQueries = storedSearch.thinking;
			queries = storedSearch.queries || parseQueries(storedSearch.thinking);
			searchResults = storedSearch.searchResults;

			await processRatingQueue();
			isThinking = false;
			return;
		}

		const interactionHistory = getInteractionHistory();
		const encodedHistory = encodeInteractionHistory(interactionHistory);

		const userContext = new URLSearchParams({
			prompt: data.prompt
			// 2025-06-26 TEMPORARY
			// Remove history. It's a bit unexpected behaviour.
			// interactions: encodedHistory
		});

		// Create URL with fallback if too long
		let url = `/api/prompt-to-queries?${userContext}`;
		console.debug('User context:', url);
		if (url.length > MAX_URL_LENGTH) {
			url = `/api/prompt-to-queries?prompt=${encodeURIComponent(data.prompt)}`;
			console.warn('URL too long, falling back to prompt-only request');
		}

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
				queries = data.queries;
				fetchSearchResults(queries);
			}
		};
	});

	async function processRatingQueue() {
		if (isProcessingQueue) {
			console.debug('Already processing queue');
			return;
		}

		// Get episodes that actually need rating (don't have ratings and aren't in progress)
		const episodesToRate = searchResults.filter(
			(item) => !item.ratings && !ratingInProgress.has(item.id)
		);

		if (episodesToRate.length === 0) return;

		isProcessingQueue = true;

		try {
			// Process in batches of 10
			for (let i = 0; i < episodesToRate.length; i += 10) {
				const batch = episodesToRate.slice(i, i + 10);
				await rateEpisodes(batch);
			}
		} finally {
			isProcessingQueue = false;
		}
	}

	const MAX_INTERACTIONS = 10;
	const MAX_URL_LENGTH = 2000; // Safe limit for most browsers

	// Update the encoding helper function
	function encodeInteractionHistory(interactions: EpisodeInteraction[]): string {
		// Sort by timestamp (newest first) and take only recent interactions
		const recentInteractions = [...interactions]
			.sort((a, b) => b.timestamp - a.timestamp)
			.slice(0, MAX_INTERACTIONS)
			.map((i) => ({
				spotifyId: i.spotifyId,
				reaction: i.reaction,
				timestamp: i.timestamp,
				episodeTitle: i.episodeTitle,
				episodeDescription: i.episodeDescription
			}));

		const encoded = encodeURIComponent(JSON.stringify(recentInteractions));

		// If still too long, reduce further and remove descriptions
		if (encoded.length > MAX_URL_LENGTH) {
			const withoutDescriptions = recentInteractions.map(({ episodeDescription, ...rest }) => rest);
			const encodedWithoutDescriptions = encodeURIComponent(JSON.stringify(withoutDescriptions));

			// If still too long, reduce number of interactions
			if (encodedWithoutDescriptions.length > MAX_URL_LENGTH) {
				return encodeInteractionHistory(interactions.slice(0, MAX_INTERACTIONS / 2));
			}

			return encodedWithoutDescriptions;
		}

		return encoded;
	}

	// Save search data whenever we have results
	$: if (searchResults.length > 0) {
		const searchData = {
			id: data.searchId,
			prompt: data.prompt,
			queries,
			searchResults,
			thinking: thinkingAboutQueries,
			timestamp: Date.now()
		};
		localStorage.setItem(`vol-search-${data.searchId}`, JSON.stringify(searchData));
	}

	async function fetchSearchResults(queryList: string[]) {
		try {
			const searchResponse = await fetch(
				`/api/podcast-search?queries=${encodeURIComponent(queryList.join(','))}`
			);
			const searchResponseJson = await searchResponse.json();
			console.debug('Search response:', searchResponseJson);
			searchResults = searchResponseJson.searchResults;

			// Process ratings once after search results load
			if (searchResults.length > 0) {
				await processRatingQueue();
			}
		} catch (error) {
			console.error('Search request failed:', error);
			searchResults = [];
		} finally {
			isThinking = false;
		}
	}

	// Start rating all episodes when results load
	// TODO convert to Svelte 5
	$: if (searchResults.length > 0 && !isProcessingQueue) {
		void (async () => {
			await processRatingQueue();
		})();
	}

	// Add with other utility functions
	function getInteractionHistory(): EpisodeInteraction[] {
		try {
			return JSON.parse(localStorage.getItem('vol-interactions') || '[]');
		} catch (error) {
			console.error('Failed to load interaction history:', error);
			return [];
		}
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
					const episode = searchResults.find((ep) => ep.id === rating.id);
					if (episode && !episode.ratings) {
						// Only update if no ratings exist
						episode.ratings = rating.ratings;
					}
				});

				// Trigger reactivity
				searchResults = [...searchResults];
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

	$: if (searchResults.length > 0) {
		const searchData = {
			id: searchId,
			results: searchResults,
			thinking: thinkingAboutQueries,
			prompt: data.prompt,
			timestamp: Date.now()
		};
		localStorage.setItem(`vol-search-${searchId}`, JSON.stringify(searchData));
	}

	$: sortedEpisodes = searchResults.sort(
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
					>1. thinking about search queries</span
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
	{#if searchResults.length > 0}
		<!-- TODO -->
		<!-- {#if data.reason}
				<div class="container mx-auto flex items-center justify-center px-4 py-8">
					<h2 class="text-2xl font-bold">{data.reason}</h2>
				</div>
			{/if} -->
		<div class="grid gap-6">
			{#each sortedEpisodes as episode, index}
				{#if index === 0}
					<EpisodePreview
						episodeDescription={episode.description}
						spotifyId={episode.id}
						audio_preview_url={episode.audio_preview_url}
						ratings={episode.ratings}
						sourceQuery={episode.sourceQuery}
						embedHeight={352}
					/>
				{:else}
					<EpisodePreview
						episodeDescription={episode.description}
						spotifyId={episode.id}
						audio_preview_url={episode.audio_preview_url}
						ratings={episode.ratings}
						sourceQuery={episode.sourceQuery}
					/>
				{/if}
			{/each}
		</div>
	{/if}
</div>
