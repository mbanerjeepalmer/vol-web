<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import type { EpisodeRatings, JSONFeedItem } from '$lib/types';
	import { onMount } from 'svelte';
	import Ratings from './Ratings.svelte';
	export let episode: JSONFeedItem;
	export let episodeDescription: string;
	export let ratings: EpisodeRatings;
	export let sourceQuery: string;

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

<article class="flex flex-row">
	<div class="flex flex-col gap-4 rounded-xl border border-border">
		<h3 class="p-6 text-lg font-bold opacity-90 hover:text-primary">
			{episode.title}
		</h3>
		<div class="flex flex-row items-center justify-between gap-2 px-4">
			<div>
				<Badge variant="secondary" class="border-none text-sm font-light opacity-80">
					{sourceQuery}
				</Badge>
			</div>
			{#if ratings}
				<Ratings {ratings} />
			{:else}
				<p class="animate-pulse text-center font-bold opacity-80">rating episode...</p>
			{/if}
		</div>
		{#if episode.attachments?.length > 0}
			{#each episode.attachments as attachment}
				{#if attachment.mime_type.startsWith('audio/')}
					<div class="flex flex-row items-center justify-between gap-4 px-4">
						<span class="text-sm font-bold opacity-70">audio</span>
						<audio
							controls
							class="w-full rounded-lg opacity-90 [&::-webkit-media-controls-panel]:bg-background"
						>
							<source src={attachment.url} type={attachment.mime_type} />
						</audio>
					</div>
				{/if}
			{/each}
		{/if}
		{#if episode.content_html}
			<div class="bg-slate-100 p-4">
				<button
					bind:this={descriptionElem}
					on:click={toggleExpanded}
					class="w-full text-left"
					aria-expanded={expanded}
					aria-controls="episode-description"
				>
					<span
						id="episode-description"
						class={`text-sm opacity-90 ${!expanded ? 'line-clamp-2' : ''}`}
						>{@html episode.content_html}</span
					>
				</button>
			</div>
		{/if}
	</div>
</article>
