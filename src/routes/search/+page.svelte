<script lang="ts">
	import { onMount } from 'svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import Markdown from '$lib/components/Markdown.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import type { PageData } from './$types';
	import { saveInteraction, getStoredSearch, cleanupStorage, getAverageRating } from '$lib/utils';
	import { Badge } from '$lib/components/ui/badge';
	import * as Sheet from '$lib/components/ui/sheet';
	import TopEpisode from '$lib/components/TopEpisode.svelte';
	import type { Episode, EpisodeInteraction } from '$lib/types';
	import Ratings from '$lib/components/Ratings.svelte';

	export let data: PageData;

	let searchResults: any[] = [];
	let isLoading = true;
	let thinkingAboutQueries = '';
	let queries: string[] = [];
	// Track which episodes are being rated
	let ratingInProgress = new Set<string>();
	let ratingQueue: Episode[] = [];
	let isProcessingQueue = false;

	// Process the rating queue
	async function processRatingQueue() {
		if (isProcessingQueue) return;
		isProcessingQueue = true;

		while (ratingQueue.length > 0) {
			const episode = ratingQueue.shift();
			if (episode && !episode.ratings) {
				await rateEpisode(episode);
			}
		}

		isProcessingQueue = false;
	}

	const MAX_INTERACTIONS = 10; // Limit number of interactions
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

	onMount(async () => {
		// Check for existing search data first
		const storedSearch = getStoredSearch(data.searchId);
		if (storedSearch) {
			thinkingAboutQueries = storedSearch.thinking;
			queries = storedSearch.queries || parseQueries(storedSearch.thinking);
			searchResults = storedSearch.searchResults;

			// Rate everything that doesn't have a rating
			ratingQueue = searchResults
				.flatMap((group) => group.results.episodes.items)
				// Rate all episodes again, not just ones without ratings
				.map((episode: Episode) => ({ ...episode, ratings: null }));
			processRatingQueue();
			isLoading = false;
			return;
		}

		const interactionHistory = getInteractionHistory();
		const encodedHistory = encodeInteractionHistory(interactionHistory);

		const userContext = new URLSearchParams({
			prompt: data.prompt,
			interactions: encodedHistory
		});

		// Create URL with fallback if too long
		let url = `/api/prompt-to-queries?${userContext}`;
		console.debug('User context:', url);
		if (url.length > MAX_URL_LENGTH) {
			url = `/api/prompt-to-queries?prompt=${encodeURIComponent(data.prompt)}`;
			console.warn('URL too long, falling back to prompt-only request');
		}

		saveInteraction({ reaction: data.prompt, searchId: data.searchId });
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
				`/api/spotify-search?queries=${encodeURIComponent(queryList.join(','))}`
			);
			const json = await searchResponse.json();
			searchResults = json.searchResults;
		} catch (error) {
			console.error('Search request failed:', error);
			searchResults = [];
		} finally {
			isLoading = false;
		}
	}

	function formatDuration(ms: number): string {
		const minutes = Math.floor(ms / 60000);
		const seconds = Math.floor((ms % 60000) / 1000);
		return `${minutes}:${seconds.toString().padStart(2, '0')}`;
	}

	// Start rating all episodes when results load
	$: if (searchResults.length > 0 && !isProcessingQueue) {
		// Flatten all episodes into a single queue
		ratingQueue = searchResults
			.flatMap((group) => group.results.episodes.items)
			.filter((episode) => !episode.ratings);
		processRatingQueue();
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

	// Update the rateEpisode function to use the same limits
	async function rateEpisode(episode: Episode) {
		if (ratingInProgress.has(episode.id)) return;
		ratingInProgress.add(episode.id);

		try {
			const interactionHistory = getInteractionHistory()
				.sort((a, b) => b.timestamp - a.timestamp)
				.slice(0, MAX_INTERACTIONS);

			const response = await fetch('/api/rate-episode', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					episode,
					prompt: data.prompt,
					interactionHistory
				})
			});

			const { ratings } = await response.json();
			episode.ratings = ratings;
			searchResults = [...searchResults];
		} catch (error) {
			console.error('Rating request failed:', error);
		} finally {
			ratingInProgress.delete(episode.id);
		}
	}

	function parseQueries(content: string): string[] {
		const queryRegex = /<query>(.*?)<\/query>/g;
		const matches = [...content.matchAll(queryRegex)];
		return matches.map((match) => match[1].trim());
	}

	let searchId = crypto.randomUUID();

	// Add after searchResults are loaded
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

	// Add near the top with other reactive declarations
	$: sortedEpisodes = searchResults
		.flatMap((group) =>
			group.results.episodes.items.map((episode) => ({
				...episode,
				sourceQuery: group.query
			}))
		)
		.sort((a, b) => getAverageRating(b.ratings) - getAverageRating(a.ratings));
</script>

<div class="mx-auto max-w-xl px-2 py-8 lg:px-4">
	<h1 class="mb-8 text-center text-4xl font-extrabold tracking-tight lg:text-5xl">
		{isLoading ? 'thinking...' : data.prompt}
	</h1>

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
					<TopEpisode
						episodeTitle={episode.name}
						episodeDescription={episode.description}
						spotifyId={episode.id}
						{searchId}
						ratings={episode.ratings}
					/>
					<Sheet.Root>
						<div class="flex w-full justify-end">
							<Sheet.Trigger>
								<Button variant="link" class="">explain yourself?</Button>
							</Sheet.Trigger>
						</div>
						<Sheet.Content side="right" class="overflow-y-auto">
							<Sheet.Header>
								<Sheet.Title>what the ai was thinking</Sheet.Title>
							</Sheet.Header>
							<div class="py-8">
								<Markdown content={thinkingAboutQueries} />
							</div>
						</Sheet.Content>
					</Sheet.Root>
				{:else}
					<div class="">
						<Card.Root class="relative overflow-hidden">
							{#if episode.images[1]?.url}
								<div class="absolute inset-0">
									<img
										src={episode.images[1]?.url}
										alt={episode.name}
										class="w-full overflow-hidden object-cover"
									/>
									<div class="absolute inset-0 bg-gradient-to-t from-black/90 to-black/60"></div>
								</div>
							{/if}

							<div class="relative z-10 flex flex-1 flex-col p-8 text-white">
								<div class="flex flex-col gap-8">
									<div class="flex items-start gap-2">
										<Card.Title class="text-4xl">
											<a
												href={episode.external_urls.spotify}
												target="_blank"
												rel="noopener noreferrer"
												class="hover:underline"
											>
												{episode.name}
											</a>
										</Card.Title>
									</div>
								</div>
								<Card.Description class="mt-4  space-y-4 text-white/90">
									<!-- <p class="line-clamp-3 overflow-hidden">{episode.description}</p> -->
									<p class="block text-right text-sm font-bold text-white/90">
										{formatDuration(episode.duration_ms)}
									</p>
								</Card.Description>
							</div>
						</Card.Root>
						<Card.Root class="my-2 p-4">
							<div class="flex flex-row items-center justify-between gap-2">
								<div>
									<Badge variant="outline" class="border-none text-sm font-light opacity-80">
										{episode.sourceQuery}
									</Badge>
								</div>
								{#if episode.ratings}
									<Ratings ratings={episode.ratings} />
								{:else}
									<p class="animate-pulse text-center font-bold">rating episode...</p>
								{/if}
							</div>
						</Card.Root>

						<!-- Audio Preview Block -->
						{#if episode.audio_preview_url}
							<Card.Root class="my-2 border-none">
								<audio
									controls
									class="w-full rounded-lg [&::-webkit-media-controls-panel]:bg-background"
								>
									<source src={episode.audio_preview_url} type="audio/mpeg" />
								</audio>
							</Card.Root>
						{/if}
					</div>
				{/if}
			{/each}
		</div>
	{/if}
</div>
