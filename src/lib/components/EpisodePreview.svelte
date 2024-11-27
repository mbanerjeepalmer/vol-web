<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import type { EpisodeRatings } from '$lib/types';
	import { onMount } from 'svelte';
	import Ratings from './Ratings.svelte';
	export let spotifyId: string;
	export let episodeDescription: string;
	export let audio_preview_url: string;
	export let ratings: EpisodeRatings;
	export let sourceQuery: string;
	export let embedHeight = 152;

	let expanded = false;
	let hasMore = false;
	let descriptionElem: HTMLElement;

	onMount(() => {
		if (expanded) {
			hasMore = descriptionElem.scrollHeight > descriptionElem.clientHeight;
		}
	});
	function toggleExpanded(event: MouseEvent) {
		event.stopPropagation();
		expanded = !expanded;
	}
</script>

<div class="my-12 flex flex-col gap-4 rounded-xl border border-border">
	<iframe
		title="Spotify podcast player"
		style="border-radius:12px"
		src={`https://open.spotify.com/embed/episode/${spotifyId}`}
		width="100%"
		height={embedHeight}
		frameBorder="0"
		allowfullscreen
		allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
		loading="lazy"
	></iframe>
	<div class="flex flex-row items-center justify-between gap-2 px-4">
		<div>
			<Badge variant="outline" class="border-none text-sm font-light opacity-80">
				{sourceQuery}
			</Badge>
		</div>
		{#if ratings}
			<Ratings {ratings} />
		{:else}
			<p class="animate-pulse text-center font-bold opacity-80">rating episode...</p>
		{/if}
	</div>
	{#if audio_preview_url}
		<div class="flex flex-row items-center justify-between gap-4 px-4">
			<span class="text-sm font-bold opacity-70">preview</span>
			<audio
				controls
				class="w-full rounded-lg opacity-90 [&::-webkit-media-controls-panel]:bg-background"
			>
				<source src={audio_preview_url} type="audio/mpeg" />
			</audio>
		</div>
	{/if}
	<div class="p-4">
		<button
			bind:this={descriptionElem}
			on:click={toggleExpanded}
			class="w-full text-left"
			aria-expanded={expanded}
			aria-controls="episode-description"
		>
			<span id="episode-description" class={`text-sm opacity-90 ${!expanded ? 'line-clamp-2' : ''}`}
				>{episodeDescription}</span
			>
		</button>
	</div>
</div>
