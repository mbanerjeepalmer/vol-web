<script lang="ts">
	import { onMount } from 'svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import { cn } from '$lib/utils';
	import Markdown from '$lib/components/Markdown.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import { Play } from 'lucide-svelte';
	import type { PageData } from './$types';
	import type { Episode as SpotifyEpisode } from '@spotify/web-api-ts-sdk';

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
	const CACHE_VERSION = '1';
	const MAX_CACHE_AGE = 24 * 60 * 60 * 1000; // 24 hours

	// Cache helper functions
	function getCacheKey(
		prompt: string,
		type: 'thinking' | 'queries' | 'search' | 'ratings'
	): string {
		return `vol-cache:${CACHE_VERSION}:${prompt}:${type}`;
	}

	interface CacheEntry {
		timestamp: number;
		data: any;
	}

	function getFromCache(key: string) {
		try {
			const cached = localStorage.getItem(key);
			if (!cached) return null;

			const entry: CacheEntry = JSON.parse(cached);

			// Check if cache is expired
			if (Date.now() - entry.timestamp > MAX_CACHE_AGE) {
				localStorage.removeItem(key);
				return null;
			}

			return entry.data;
		} catch (error) {
			console.warn('Cache read failed:', error);
			return null;
		}
	}

	function saveToCache(key: string, data: any) {
		try {
			const entry: CacheEntry = {
				timestamp: Date.now(),
				data
			};
			localStorage.setItem(key, JSON.stringify(entry));
		} catch (error) {
			// Handle QuotaExceededError or other storage errors
			if (error instanceof Error && error.name === 'QuotaExceededError') {
				clearOldCache();
				try {
					// Retry once after clearing old cache
					localStorage.setItem(
						key,
						JSON.stringify({
							timestamp: Date.now(),
							data
						})
					);
				} catch (retryError) {
					console.warn('Cache write failed even after cleanup:', retryError);
				}
			} else {
				console.warn('Cache write failed:', error);
			}
		}
	}

	function clearOldCache() {
		try {
			const keys = Object.keys(localStorage);
			const now = Date.now();

			// Remove old version caches and expired entries
			keys.forEach((key) => {
				if (key.startsWith('vol-cache:')) {
					// Remove if old version
					if (!key.includes(`vol-cache:${CACHE_VERSION}`)) {
						localStorage.removeItem(key);
						return;
					}

					// Remove if expired
					try {
						const entry: CacheEntry = JSON.parse(localStorage.getItem(key) || '');
						if (now - entry.timestamp > MAX_CACHE_AGE) {
							localStorage.removeItem(key);
						}
					} catch {
						// If entry is corrupt, remove it
						localStorage.removeItem(key);
					}
				}
			});
		} catch (error) {
			console.warn('Cache cleanup failed:', error);
		}
	}

	// Add these constants near the top of the script
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

	// Update the onMount function to handle potential URL length issues
	onMount(async () => {
		try {
			const thinkingCache = getFromCache(getCacheKey(data.prompt, 'thinking'));
			const queriesCache = getFromCache(getCacheKey(data.prompt, 'queries'));

			if (thinkingCache && queriesCache) {
				thinkingAboutQueries = thinkingCache;
				queries = queriesCache;
				await fetchSearchResults(queries);
				return;
			}
		} catch (error) {
			console.warn('Cache read failed in onMount:', error);
		}

		// Get and encode interaction history with limits
		const interactionHistory = getInteractionHistory();
		const encodedHistory = encodeInteractionHistory(interactionHistory);

		const params = new URLSearchParams({
			prompt: data.prompt,
			interactions: encodedHistory
		});

		// Create URL with fallback if too long
		let url = `/api/prompt-to-queries?${params}`;
		if (url.length > MAX_URL_LENGTH) {
			// Fallback to just the prompt if URL is too long
			url = `/api/prompt-to-queries?prompt=${encodeURIComponent(data.prompt)}`;
			console.warn('URL too long, falling back to prompt-only request');
		}

		const eventSource = new EventSource(url);

		eventSource.onmessage = (event) => {
			thinkingAboutQueries += event.data.replace(/\\n/g, '\n');
		};

		eventSource.onerror = () => {
			eventSource.close();
			// Save thinking to cache
			saveToCache(getCacheKey(data.prompt, 'thinking'), thinkingAboutQueries);

			// Parse and cache queries
			queries = parseQueries(thinkingAboutQueries);
			if (queries.length > 0) {
				saveToCache(getCacheKey(data.prompt, 'queries'), queries);
				fetchSearchResults(queries);
			} else {
				queries = data.queries;
				saveToCache(getCacheKey(data.prompt, 'queries'), queries);
				fetchSearchResults(queries);
			}
		};
	});

	// Update fetchSearchResults with better error handling
	async function fetchSearchResults(queryList: string[]) {
		try {
			const searchCache = getFromCache(getCacheKey(data.prompt, 'search'));
			if (searchCache) {
				searchResults = searchCache;
				isLoading = false;
				return;
			}
		} catch (error) {
			console.warn('Cache read failed in fetchSearchResults:', error);
		}

		try {
			const searchResponse = await fetch(
				`/api/spotify-search?queries=${encodeURIComponent(queryList.join(','))}`
			);
			const json = await searchResponse.json();
			searchResults = json.searchResults;
			saveToCache(getCacheKey(data.prompt, 'search'), searchResults);
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

	const flightId = crypto.randomUUID();
	let chosenResultPath = `reflect/${encodeURIComponent('https://open.spotify.com/episode/0C1ZvZeyF1wntYzx64Bote')}?flight=${flightId}`;

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
		flightId?: string;
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

		let ratingsCache: Record<string, EpisodeRatings> = {};

		try {
			ratingsCache = getFromCache(getCacheKey(data.prompt, 'ratings')) || {};
			if (ratingsCache[episode.id]) {
				episode.ratings = ratingsCache[episode.id];
				searchResults = [...searchResults];
				return;
			}
		} catch (error) {
			console.warn('Cache read failed in rateEpisode:', error);
		}

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

			ratingsCache[episode.id] = ratings;
			saveToCache(getCacheKey(data.prompt, 'ratings'), ratingsCache);

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
		if (rating >= 80) return 'text-green-600';
		if (rating >= 60) return 'text-yellow-600';
		if (rating >= 40) return 'text-red-600';
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

					<div
						class={cn(
							'grid gap-6 rounded-lg p-4',
							searchResults.indexOf(searchGroup) % 3 === 0 && 'bg-red-100',
							searchResults.indexOf(searchGroup) % 3 === 1 && 'bg-blue-100',
							searchResults.indexOf(searchGroup) % 3 === 2 && 'bg-green-100'
						)}
					>
						{#each searchGroup.results.episodes.items.sort((a, b) => getAverageRating(b.ratings) - getAverageRating(a.ratings)) as episode}
							<Card.Root class="flex overflow-hidden">
								<div class="hidden sm:block">
									<img
										src={episode.images[1]?.url}
										alt={episode.name}
										class="h-[150px] w-[150px] object-cover"
									/>
								</div>

								<div class="flex flex-1 flex-col p-6">
									<Card.Header class="pb-4">
										<div class="flex items-center justify-between">
											<Card.Title class="text-xl">
												<a
													href={episode.external_urls.spotify}
													target="_blank"
													rel="noopener noreferrer"
													class="hover:underline"
												>
													{episode.name}
												</a>
											</Card.Title>

											{#if episode.ratings}
												<div class="flex gap-2 text-sm font-medium">
													<span class={getRatingColor(episode.ratings.goal)}
														>G:{episode.ratings.goal}</span
													>
													<span class={getRatingColor(episode.ratings.context)}
														>C:{episode.ratings.context}</span
													>
													<span class={getRatingColor(episode.ratings.quality)}
														>Q:{episode.ratings.quality}</span
													>
													<span class={getRatingColor(episode.ratings.freshness)}
														>F:{episode.ratings.freshness}</span
													>
													<span class={getRatingColor(getAverageRating(episode.ratings))}>
														Avg:{getAverageRating(episode.ratings)}
													</span>
												</div>
											{:else}
												<Button
													variant="outline"
													size="sm"
													disabled={ratingInProgress.has(episode.id)}
													on:click={() => queueEpisodeRating(episode)}
												>
													{ratingInProgress.has(episode.id) ? 'Rating...' : 'Waiting...'}
												</Button>
											{/if}
										</div>
										<Card.Description class="line-clamp-2">
											{episode.description}
										</Card.Description>
									</Card.Header>

									<Card.Footer class="mt-auto flex items-center justify-between pt-4">
										<div class="flex items-center gap-2">
											{#if episode.audio_preview_url}
												<audio controls class="h-8 w-48">
													<source src={episode.audio_preview_url} type="audio/mpeg" />
												</audio>
											{/if}
											<span class="text-sm text-muted-foreground">
												{formatDuration(episode.duration_ms)}
											</span>
										</div>

										<Button variant="outline" size="sm" asChild>
											<a
												href={episode.external_urls.spotify}
												target="_blank"
												rel="noopener noreferrer"
												class="flex items-center gap-2"
											>
												<Play class="h-4 w-4" />
												<span>Listen on Spotify</span>
											</a>
										</Button>
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
			<Button class="shadow-lg" href={`/reflect/${bestEpisode.id}`}>
				<Play class="mr-2 h-4 w-4" />
				Listen to {bestEpisode.name}
			</Button>
		</div>
	{/if}
</div>
