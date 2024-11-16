<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
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
	let streamedContent = '';
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

	async function rateEpisode(episode: Episode) {
		if (ratingInProgress.has(episode.id)) return;

		ratingInProgress.add(episode.id);

		try {
			const response = await fetch('/api/rate-episode', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					episode,
					prompt: data.prompt
				})
			});

			const { ratings } = await response.json();
			episode.ratings = ratings;

			// Force reactivity
			searchResults = [...searchResults];
		} catch (error) {
			console.error('Error rating episode:', error);
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
		if (rating >= 8) return 'text-green-600';
		if (rating >= 6) return 'text-blue-600';
		if (rating >= 4) return 'text-yellow-600';
		return 'text-red-600';
	}

	function parseQueries(content: string): string[] {
		const queryRegex = /<query>(.*?)<\/query>/g;
		const matches = [...content.matchAll(queryRegex)];
		return matches.map((match) => match[1].trim());
	}

	onMount(async () => {
		const eventSource = new EventSource(
			`/api/prompt-to-queries?prompt=${encodeURIComponent(data.prompt)}`
		);

		eventSource.onmessage = (event) => {
			streamedContent += event.data.replace(/\\n/g, '\n');
		};

		eventSource.onerror = () => {
			eventSource.close();
			// Parse queries after stream completes
			queries = parseQueries(streamedContent);
			if (queries.length > 0) {
				fetchSearchResults(queries);
			} else {
				// Fallback to hardcoded queries if no queries found
				queries = data.queries;
				fetchSearchResults(queries);
			}
		};
	});

	async function fetchSearchResults(queryList: string[]) {
		const searchResponse = await fetch(
			`/api/spotify-search?queries=${encodeURIComponent(queryList.join(','))}`
		);
		const json = await searchResponse.json();
		searchResults = json.searchResults;
		isLoading = false;
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
</script>

<div class="container mx-auto px-4 py-8">
	<h1 class="mb-8 scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
		{isLoading ? 'Thinking...' : data.prompt}
	</h1>

	<Markdown content={streamedContent} />
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
</div>
