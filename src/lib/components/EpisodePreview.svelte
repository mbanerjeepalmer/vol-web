<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import type { EpisodeRatings, JSONFeedItem } from '$lib/types';
	import { onMount } from 'svelte';
	export let episode: JSONFeedItem;

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

<article class="flex flex-col gap-4 rounded-md border border-border">
	<!-- Fixed square aspect ratio episode.image.
		 Flex on the div to the right so only that grows/shrinks.
		  -->
	<div class="flex flex-row items-center gap-4 p-2">
		{#if episode.image}
			<img
				src={episode.image}
				alt={episode.title}
				class="h-32 w-32 flex-shrink-0 rounded-xl object-cover"
			/>
		{:else}
			<div
				class="h-32 w-32 flex-shrink-0 rounded-xl bg-gradient-to-r from-fuchsia-500 to-green-500 opacity-80"
			></div>
		{/if}
		<h3 class="text-lg font-bold opacity-90 hover:text-primary">
			{episode.title}
		</h3>
	</div>
	<div class="flex flex-row items-center justify-between gap-2 px-4">
		{#if episode._sources}
			<div>
				{#each episode._sources as source}
					<Badge variant="secondary" class="border-none text-sm font-light opacity-80">
						{source.feed_title}
					</Badge>
				{/each}
			</div>
		{/if}
	</div>
	{#if episode.attachments?.length > 0}
		{#each episode.attachments as attachment}
			{#if attachment.mime_type.startsWith('audio/')}
				<div class="flex flex-col gap-2 px-4 pb-4">
					<audio
						controls
						class="w-full rounded-lg shadow-sm [&::-webkit-media-controls-panel]:border [&::-webkit-media-controls-panel]:border-border [&::-webkit-media-controls-panel]:bg-background"
						preload="metadata"
					>
						<source src={attachment.url} type={attachment.mime_type} />
						Your browser does not support the audio element.
					</audio>
				</div>
			{/if}
		{/each}
	{/if}
	{#if episode.content_html}
		<div class="bg-slate-100 px-4 pt-4">
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
				<div class="align-middl w-full pb-2 text-center">
					{#if !expanded}⏷{:else}⏶{/if}
				</div>
			</button>
		</div>
	{/if}
</article>
