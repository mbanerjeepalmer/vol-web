<script lang="ts">
	import type { EpisodeRatings } from '$lib/types';
	import { getAverageRating } from '$lib/utils';
	import { Compass, Sprout, GraduationCap, Gem } from 'lucide-svelte';

	export let ratings: EpisodeRatings | undefined;

	function getRatingColour(rating: number): string {
		if (rating >= 80) return 'text-green-400';
		if (rating >= 60) return 'text-orange-500';
		if (rating >= 40) return 'text-pink-600';
		return 'text-red-600';
	}
</script>

{#if ratings}
	<ul class="flex flex-row justify-center gap-3 py-4 align-middle">
		<li><Compass class={`mr-1 inline h-4 w-4 ${getRatingColour(ratings.goal)}`} /></li>
		<li><GraduationCap class={`mr-1 inline h-4 w-4 ${getRatingColour(ratings.context)}`} /></li>
		<li><Gem class={`mr-1 inline h-4 w-4 ${getRatingColour(ratings.quality)}`} /></li>
		<li><Sprout class={`mr-1 inline h-4 w-4 ${getRatingColour(ratings.freshness)}`} /></li>
		<li class={`font-black ${getRatingColour(getAverageRating(ratings))}`}>
			{getAverageRating(ratings)}
		</li>
	</ul>
{:else}
	<p>rating this episode</p>
{/if}
