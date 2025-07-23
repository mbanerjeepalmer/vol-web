<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import {
		ChevronDown,
		ChevronUp,
		CircleMinus,
		CirclePlus,
		Loader,
		RefreshCw
	} from 'lucide-svelte';
	import type { JSONFeedItem } from '$lib/types';
	import { onMount } from 'svelte';

	function formatDescription(text: string): string {
		return text.replace(/^\s+/, '').replace(/\n/g, '<br>');
	}
	interface Props {
		episode: JSONFeedItem;
		userClassify: (episode: JSONFeedItem, category: 'plus' | 'minus') => Promise<void>;
		classificationStatus: 'pending' | 'success' | 'error' | null;
	}

	let { episode, userClassify, classificationStatus, processClassificationQueue }: Props = $props();

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

<div class="flex flex-row gap-4 p-2">
	<div class="flex shrink-0 flex-col gap-2">
		{#if episode.image}
			<img
				src={episode.image}
				alt={episode.title}
				class="aspect-1/1 h-48 flex-shrink-0 self-start rounded-xl object-cover"
			/>
		{:else}
			<div
				class="aspect-1/1 h-48 flex-shrink-0 rounded-xl bg-gradient-to-r from-fuchsia-500 to-green-500 opacity-80"
			></div>
		{/if}
		{#if episode.attachments?.length > 0}
			{#each episode.attachments as attachment}
				{#if attachment.mime_type.startsWith('audio/')}
					<div class="flex max-w-48 flex-col">
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
	</div>
	<div class="mx-1 flex h-full w-full flex-col items-start gap-4">
		<a href={episode.link} target="_blank">
			<h3 class="mx-2 line-clamp-2 min-h-12 pt-2 font-sans text-lg font-bold opacity-90">
				{episode.title}
			</h3></a
		>
		<div class="mx-1 flex w-full flex-row items-center gap-2">
			{#if episode._sources}
				{#each episode._sources as source}
					<Badge variant="secondary" class="w-fit border-none text-xs font-light">
						{source.feed_title}
					</Badge>
				{/each}
			{/if}
		</div>
		<div class=" my-4 flex min-h-10 flex-row items-center gap-4 text-xs">
			{#if episode.id}
				{#if classificationStatus === 'pending'}
					<button disabled>
						<Loader class="h-6 animate-spin" />
					</button>
				{:else if classificationStatus === 'error'}
					<button onclick={async () => processClassificationQueue()}>
						<RefreshCw class="h-6 text-red-500" />
					</button>
				{:else}
					<button
						class="flex flex-row items-center gap-2 rounded-2xl border border-transparent px-4 py-2 hover:border-green-200 hover:bg-green-50 hover:text-green-500 {episode._categories?.some(
							(cat) => cat.feed_title && cat.feed_title !== 'Everything else'
						)
							? 'text-green-500'
							: 'opacity-40'}"
						onclick={async () => userClassify(episode, 'plus')}
					>
						<CirclePlus class="h-6" />{episode._categories?.some(
							(cat) => cat.feed_title && cat.feed_title !== 'Everything else'
						)
							? 'added'
							: 'add'} to playlist</button
					>
					<button
						class="rounded-2xl border border-transparent px-2 py-2 hover:border-fuchsia-500/40 hover:bg-fuchsia-50 hover:text-fuchsia-500 {episode._categories?.some(
							(cat) => cat.feed_title === 'Everything else'
						)
							? 'text-fuchsia-500'
							: 'opacity-40'}"
						onclick={async () => userClassify(episode, 'minus')}
					>
						<CircleMinus class="h-6" /></button
					>
				{/if}
			{/if}
		</div>

		{#if episode.summary}
			<div class="px-4 text-primary/80">
				<button
					bind:this={descriptionElem}
					onclick={toggleExpanded}
					class="w-full text-left"
					aria-expanded={expanded}
					aria-controls="episode-description"
				>
					<span
						id="episode-description"
						class={`font-sans text-sm opacity-90 ${!expanded ? 'line-clamp-1' : ''}`}
						>{@html formatDescription(episode.summary)}</span
					>
				</button>
			</div>
		{/if}
	</div>
</div>
