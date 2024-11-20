<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import type { EpisodeRatings } from '$lib/types';
	import type { Interaction } from '$lib/utils';
	import { getStoredSearch, getInteractionHistory } from '$lib/utils';
	import { onMount } from 'svelte';
	import Ratings from './Ratings.svelte';

	export let episodeTitle: string;
	export let episodeDescription: string;
	export let spotifyId: string;
	export let searchId: string;
	export let ratings: EpisodeRatings;
	let existingReaction: string | null = null;
	let searchResults: any = null;
	onMount(async () => {
		searchResults = getStoredSearch(searchId);

		// Get existing reaction from localStorage
		existingReaction = (() => {
			try {
				const interactions: Interaction[] = JSON.parse(
					localStorage.getItem('vol-interactions') || '[]'
				);
				return interactions.find((i) => i.spotifyId === spotifyId)?.reaction || null;
			} catch (error) {
				console.error('Failed to get existing reaction:', error);
				return null;
			}
		})();
	});
	async function handleNext(reactionText: string) {
		saveReaction(reactionText);

		// Get the original prompt from stored search
		const storedSearch = getStoredSearch(searchId);
		const originalPrompt = storedSearch?.prompt;

		// Redirect back to search page with same searchId and prompt
		window.location.href = `/search?id=${searchId}&prompt=${encodeURIComponent(originalPrompt)}`;
	}

	function saveReaction(reactionText: string) {
		try {
			const interactions: Interaction[] = JSON.parse(
				localStorage.getItem('vol-interactions') || '[]'
			);
			const filteredInteractions = interactions.filter((i) => i.spotifyId !== spotifyId);

			filteredInteractions.push({
				spotifyId,
				reaction: reactionText,
				timestamp: Date.now(),
				episodeTitle,
				episodeDescription,
				searchId
			});

			localStorage.setItem('vol-interactions', JSON.stringify(filteredInteractions));
			existingReaction = reactionText;
		} catch (error) {
			console.error('Failed to save interaction:', error);
		}
	}
</script>

<div class="container mx-auto px-4 py-8">
	<iframe
		title="Spotify podcast player"
		style="border-radius:12px"
		src={`https://open.spotify.com/embed/episode/${spotifyId}`}
		width="100%"
		height="352"
		frameborder="0"
		allowfullscreen
		allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
		loading="lazy"
	></iframe>

	<Ratings {ratings} />
	<!-- 
	<div class="mt-4 grid gap-4">
		<Button
			on:click={() => handleNext('Nah')}
			variant={existingReaction === 'Nah' ? 'default' : 'outline'}
			class="h-full w-full text-wrap border-2 border-fuchsia-800 p-3"
			type="submit"
		>
			Nah
		</Button>

		<Button
			variant={existingReaction === 'Love' ? 'default' : 'outline'}
			class="h-full w-full text-wrap border-2 border-green-600 p-3"
			on:click={() => handleNext('Love')}
		>
			Love
		</Button>
	</div> -->
</div>
