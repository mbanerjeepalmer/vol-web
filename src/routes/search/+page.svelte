<script lang="ts">
	import { onMount } from 'svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import Markdown from '$lib/components/Markdown.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import { Play } from 'lucide-svelte';
	import type { PageData } from './$types';
	import type { Episode as SpotifyEpisode } from '@spotify/web-api-ts-sdk';
	import { saveInteraction, getStoredSearch } from '$lib/utils';

	export let data: PageData;

	let searchResults: any[] = [];
	let isLoading = true;
	let thinkingAboutQueries = '';
	let queries: string[] = [];

	// Add interface for ratings
	interface EpisodeRatings {
		goal: number;
		context: number;
		quality: number;
		freshness: number;
	}

	interface Episode extends SpotifyEpisode {
		ratings?: EpisodeRatings;
	}

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

	// Add episode to queue and start processing if needed
	function queueEpisodeRating(episode: Episode) {
		if (!episode.ratings && !ratingQueue.includes(episode)) {
			ratingQueue.push(episode);
			processRatingQueue();
		}
	}

	// Add at top of script
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

	// Update the onMount function
	onMount(async () => {
		// Check for existing search data first
		const storedSearch = getStoredSearch(data.searchId);
		if (storedSearch) {
			thinkingAboutQueries = storedSearch.thinking;
			queries = storedSearch.queries || parseQueries(storedSearch.thinking);
			searchResults = storedSearch.searchResults;
			isLoading = false;
			return;
		}

		// Get and encode interaction history with limits
		const interactionHistory = getInteractionHistory();
		const encodedHistory = encodeInteractionHistory(interactionHistory);

		const userContext = new URLSearchParams({
			prompt: data.prompt,
			interactions: encodedHistory
		});

		// Create URL with fallback if too long
		let url = `/api/prompt-to-queries?${userContext}`;
		if (url.length > MAX_URL_LENGTH) {
			url = `/api/prompt-to-queries?prompt=${encodeURIComponent(data.prompt)}`;
			console.warn('URL too long, falling back to prompt-only request');
		}

		saveInteraction({ reaction: data.prompt });
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

	// Update fetchSearchResults with better error handling
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

	// Add near other interfaces
	interface EpisodeInteraction {
		spotifyId: string;
		reaction: string;
		timestamp: number;
		episodeTitle?: string;
		episodeDescription?: string;
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

	function getAverageRating(ratings?: EpisodeRatings): number {
		if (!ratings) return 0;
		return Math.round((ratings.goal + ratings.context + ratings.quality + ratings.freshness) / 4);
	}

	// Helper for rating color classes
	function getRatingColor(rating: number): string {
		if (rating >= 80) return 'text-green-400';
		if (rating >= 60) return 'text-orange-500';
		if (rating >= 40) return 'text-pink-600';
		return 'text-red-600';
	}

	function parseQueries(content: string): string[] {
		const queryRegex = /<query>(.*?)<\/query>/g;
		const matches = [...content.matchAll(queryRegex)];
		return matches.map((match) => match[1].trim());
	}

	function getBestEpisode(searchResults: any[]): Episode | null {
		const allEpisodes = searchResults.flatMap((group) => group.results.episodes.items);

		return (
			allEpisodes
				.filter((episode) => episode.ratings && getAverageRating(episode.ratings) > 50)
				.sort((a, b) => getAverageRating(b.ratings!) - getAverageRating(a.ratings!))[0] || null
		);
	}

	// Add this reactive statement to track the best episode
	let bestEpisode: Episode | null = null;
	$: bestEpisode = searchResults.length > 0 ? getBestEpisode(searchResults) : null;

	// Add after searchResults declaration
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
</script>

<div class="container mx-auto px-4 py-8">
	<h1 class="mb-8 scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
		{isLoading ? 'Thinking...' : data.prompt}
	</h1>

	<Markdown content={thinkingAboutQueries} />
	{#if searchResults.length > 0}
		<h2
			class="mt-10 scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight transition-colors"
		>
			Search results
		</h2>
		<ul class="mt-4 list-disc space-y-2 pl-6">
			{#each queries as query}
				<li>
					<a href={`#${query.replace(/\s+/g, '-').toLowerCase()}`} class="hover:underline">
						{query}
					</a>
				</li>
			{/each}
		</ul>

		<div class="container mx-auto px-4 py-8">
			{#each searchResults as searchGroup}
				<div class="mb-12">
					<h2
						id={searchGroup.query.replace(/\s+/g, '-').toLowerCase()}
						class="mb-6 scroll-m-20 text-2xl font-semibold tracking-tight"
					>
						{searchGroup.query}
					</h2>

					<div class="grid gap-6 rounded-lg p-4">
						{#each searchGroup.results.episodes.items.sort((a, b) => getAverageRating(b.ratings) - getAverageRating(a.ratings)) as episode}
							<Card.Root class="relative flex overflow-hidden">
								{#if episode.images[1]?.url}
									<div class="absolute inset-0">
										<img
											src={episode.images[1]?.url}
											alt={episode.name}
											class="h-full w-full object-cover"
										/>
										<div class="absolute inset-0 bg-gradient-to-t from-black/90 to-black/60"></div>
									</div>
								{/if}

								<div class="relative z-10 flex flex-1 flex-col p-6 text-white">
									<Card.Header class="pb-4">
										<div class="flex flex-col items-center justify-between">
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
											<span class="text-bold text-sm text-white/90">
												{formatDuration(episode.duration_ms)}
											</span>
											{#if episode.ratings}
												<div class="flex gap-2 py-2 text-sm font-medium">
													<span class={getRatingColor(episode.ratings.goal)}
														>G{episode.ratings.goal}</span
													>
													<span class={getRatingColor(episode.ratings.context)}
														>C{episode.ratings.context}</span
													>
													<span class={getRatingColor(episode.ratings.quality)}
														>Q{episode.ratings.quality}</span
													>
													<span class={getRatingColor(episode.ratings.freshness)}
														>F{episode.ratings.freshness}</span
													>
													<span
														class={`ml-2 font-black ${getRatingColor(getAverageRating(episode.ratings))}`}
													>
														{getAverageRating(episode.ratings)}
													</span>
												</div>
											{:else}
												<div>
													<p class="animate-pulse py-2 font-bold text-white">
														rating according to your goals, your level of expertise, episode quality
														and freshness
													</p>
												</div>
											{/if}
										</div>
										<Card.Description class="line-clamp-2 text-white/90">
											{episode.description}
										</Card.Description>
									</Card.Header>

									<Card.Footer class="mt-auto flex items-center justify-center pt-4">
										{#if episode.audio_preview_url}
											<audio
												controls
												class="h-8 w-64 rounded-full [&::-webkit-media-controls-current-time-display]:text-white [&::-webkit-media-controls-panel]:bg-black/40 [&::-webkit-media-controls-time-remaining-display]:text-white [&::-webkit-media-controls-timeline]:bg-white/20"
											>
												<source src={episode.audio_preview_url} type="audio/mpeg" />
											</audio>
										{/if}
									</Card.Footer>
								</div>
							</Card.Root>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	{/if}

	{#if bestEpisode}
		<div class="fixed bottom-4 left-1/2 z-50 -translate-x-1/2">
			<Button class="shadow-lg" href={`/reflect/${bestEpisode.id}?searchId=${searchId}`}>
				<Play class="mr-2 h-4 w-4" />
				Listen to {bestEpisode.name}
			</Button>
		</div>
	{/if}
</div>
