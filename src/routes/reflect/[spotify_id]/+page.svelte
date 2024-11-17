<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import Button from '$lib/components/ui/button/button.svelte';
	import type { Interaction } from '$lib/utils';
	import { getStoredSearch, getInteractionHistory } from '$lib/utils';
	import { onMount } from 'svelte';

	export let data;
	const spotifyId = $page.params.spotify_id;
	const searchId = $page.url.searchParams.get('searchId') || '';
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
	async function handleNah() {
		saveReaction('Nah');
		const interactions = getInteractionHistory();

		console.log('Interactions:', interactions);
		console.log('Search results:', searchResults);

		const filteredResults = searchResults?.results.map((group) => ({
			query: group.query,
			episodes: group.results.episodes.items.map((episode) => ({
				id: episode.id,
				name: episode.name,
				// description: episode.description,
				ratings: episode.ratings
			}))
		}));

		const response = await fetch('/api/rerank', {
			method: 'POST',
			body: JSON.stringify({ searchResults: filteredResults, interactions })
		});
		const nextEpisode = await response.json();
		console.log('Next episode:', nextEpisode);
		window.location.href = `/reflect/${nextEpisode.spotifyId}?searchId=${searchId}&reason=${nextEpisode.reason}`;
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
				episodeTitle: data.episodeTitle,
				episodeDescription: data.episodeDescription,
				searchId
			});

			localStorage.setItem('vol-interactions', JSON.stringify(filteredInteractions));
			existingReaction = reactionText;
		} catch (error) {
			console.error('Failed to save interaction:', error);
		}
	}
</script>

{#if data.reason}
	<div class="container mx-auto flex items-center justify-center px-4 py-8">
		<h2 class="text-2xl font-bold">{data.reason}</h2>
	</div>
{/if}
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

	<div class="mt-4 grid gap-4">
		<Button
			on:click={handleNah}
			variant={existingReaction === 'Nah' ? 'default' : 'outline'}
			class="h-full w-full text-wrap p-3"
			type="submit"
		>
			Nah
		</Button>

		<Button
			variant={existingReaction === 'Love' ? 'default' : 'outline'}
			class="h-full w-full text-wrap p-3"
			on:click={() => saveReaction('Love')}
		>
			Love
		</Button>
	</div>
</div>
