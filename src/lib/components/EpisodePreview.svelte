<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { ChevronDown, ChevronUp, ThumbsUp, ThumbsDown } from 'lucide-svelte';
	import type { EpisodeRatings, JSONFeedItem } from '$lib/types';

	function formatDescription(text: string): string {
		return text.replace(/\n/g, '<br>');
	}
	import { onMount } from 'svelte';
	interface Props {
		episode: JSONFeedItem;
	}

	let { episode }: Props = $props();

	let expanded = $state(false);
	let hasMore = false;
	let descriptionElem: HTMLElement = $state();

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
		<div class="flex h-full w-full flex-col items-start gap-1">
			{#if episode.link}
				<a href={episode.link} target="_blank">
					<h3 class="font-sans text-lg font-bold opacity-90">
						{episode.title}
					</h3></a
				>
			{:else}
				<h3 class="mx-2 my-3 font-sans text-lg font-bold opacity-90">
					{episode.title}
				</h3>
			{/if}
			<div class="flex w-full flex-row items-center gap-2">
				{#if episode._sources}
					{#each episode._sources as source}
						<Badge variant="secondary" class="w-fit border-none text-xs font-light">
							{source.feed_title}
						</Badge>
					{/each}
				{/if}
				{#if episode._categories?.some((cat) => cat.feed_title === 'Everything else')}
					<ThumbsDown class="h-4 text-fuchsia-500" />
				{:else}
					<ThumbsUp class="h-4 text-green-500" />
				{/if}
			</div>
		</div>
	</div>
	<div class="flex flex-row items-center justify-between gap-2 px-4"></div>
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
	{#if episode.summary}
		<div class="bg-slate-100 px-4 pt-4">
			<button
				bind:this={descriptionElem}
				onclick={toggleExpanded}
				class="w-full text-left"
				aria-expanded={expanded}
				aria-controls="episode-description"
			>
				<span
					id="episode-description"
					class={`font-sans text-sm opacity-90 ${!expanded ? 'line-clamp-2' : ''}`}
					>{@html formatDescription(episode.summary)}</span
				>
				<div class="w-full pb-2 text-center">
					{#if !expanded}<ChevronDown class="mx-auto h-12 pt-4" />{:else}<ChevronUp
							class="mx-auto h-12 pt-4"
						/>{/if}
				</div>
			</button>
		</div>
	{/if}
</article>
