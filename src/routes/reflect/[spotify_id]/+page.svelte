<script lang="ts">
	import { page } from '$app/stores';
	import Button from '$lib/components/ui/button/button.svelte';
	export let data;
	const spotifyId = $page.params.spotify_id;
	const flightId = $page.url.searchParams.get('flight');

	interface EpisodeInteraction {
		spotifyId: string;
		reaction: string;
		timestamp: number;
		episodeTitle?: string;
		episodeDescription?: string;
	}

	// Get existing reaction for this episode
	function getExistingReaction(): string | null {
		try {
			const interactions: EpisodeInteraction[] = JSON.parse(
				localStorage.getItem('vol-interactions') || '[]'
			);
			const existing = interactions.find((i) => i.spotifyId === spotifyId);
			return existing?.reaction || null;
		} catch (error) {
			console.error('Failed to get existing reaction:', error);
			return null;
		}
	}

	function saveInteraction(
		reaction: string,
		episodeData?: { title?: string; description?: string }
	) {
		try {
			const interactions: EpisodeInteraction[] = JSON.parse(
				localStorage.getItem('vol-interactions') || '[]'
			);

			// Remove any existing interaction for this episode
			const filteredInteractions = interactions.filter((i) => i.spotifyId !== spotifyId);

			// Add the new interaction
			filteredInteractions.push({
				spotifyId,
				reaction,
				timestamp: Date.now(),
				flightId,
				episodeTitle: data.episodeTitle,
				episodeDescription: data.episodeDescription
			});

			localStorage.setItem('vol-interactions', JSON.stringify(filteredInteractions));
			existingReaction = reaction; // Update the UI
		} catch (error) {
			console.error('Failed to save interaction:', error);
		}
	}

	let existingReaction = getExistingReaction();

	const predefinedReactions = ['Nah', 'Love', 'Share'];
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

	<div class="mt-4 grid grid-cols-3 gap-4">
		{#each predefinedReactions as reaction}
			<Button
				variant={existingReaction === reaction ? 'default' : 'outline'}
				class="h-full w-full text-wrap p-3"
				on:click={() => {
					if (existingReaction !== reaction) {
						saveInteraction(reaction, {
							title: data.episodeTitle,
							description: data.episodeDescription
						});
					}
				}}
			>
				{reaction}
				{#if existingReaction === reaction}
					<span class="ml-2">✓</span>
				{/if}
			</Button>
		{/each}
	</div>
</div>
