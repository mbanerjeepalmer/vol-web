<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { ChevronDown, ChevronUp, CircleMinus, CirclePlus } from 'lucide-svelte';
	import type { JSONFeedItem } from '$lib/types';
	import { onMount } from 'svelte';

	function formatDescription(text: string): string {
		return text.replace(/\n/g, '<br>');
	}
	interface Props {
		episode: JSONFeedItem;
	}

	let { episode, userClassify }: Props = $props();

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
		</div>
		<div class="mx-2 mt-4 flex gap-4">
			<button onclick={async () => userClassify(episode, 'plus')}>
				<CirclePlus
					class="h-6 {episode._categories?.some(
						(cat) => cat.feed_title && cat.feed_title !== 'Everything else'
					)
						? 'text-green-500'
						: 'opacity-40'}"
				/></button
			>
			<button onclick={async () => userClassify(episode, 'minus')}>
				<CircleMinus
					class="h-6 {episode._categories?.some((cat) => cat.feed_title === 'Everything else')
						? 'text-fuchsia-500'
						: 'opacity-40'}"
				/></button
			>
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
