<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { CircleMinus, CirclePlus, Loader, RefreshCw, Play, Pause, Volume2 } from 'lucide-svelte';
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
	let isPlayingPreview = $state(false);
	let audioPlayer: HTMLAudioElement | null = $state(null);
	let audioPosition = $state(0);
	let audioDuration = $state(0);

	onMount(() => {
		if (expanded) {
			hasMore = descriptionElem.scrollHeight > descriptionElem.clientHeight;
		}
	});

	function toggleExpanded(event: MouseEvent) {
		event.stopPropagation();
		expanded = !expanded;
	}

	async function togglePreviewPlayback() {
		if (!audioPlayer) {
			const audioAttachment = episode.attachments?.find((a) => a.mime_type.startsWith('audio/'));
			if (!audioAttachment) return;

			// Create and configure audio element
			audioPlayer = new Audio(audioAttachment.url);
			audioPlayer.preload = 'metadata';

			audioPlayer.ontimeupdate = () => {
				audioPosition = audioPlayer?.currentTime || 0;
			};

			audioPlayer.onloadedmetadata = () => {
				audioDuration = audioPlayer?.duration || 0;
			};

			audioPlayer.onended = () => {
				isPlayingPreview = false;
			};
		}

		if (isPlayingPreview) {
			audioPlayer.pause();
			isPlayingPreview = false;
		} else {
			// Play 15-second preview
			audioPlayer.currentTime = 0;
			await audioPlayer.play();
			isPlayingPreview = true;

			// Auto-stop after 15 seconds
			setTimeout(() => {
				if (isPlayingPreview) {
					audioPlayer?.pause();
					isPlayingPreview = false;
				}
			}, 15000);
		}
	}
</script>

<div class="flex flex-row gap-4 p-2">
	<div class="flex shrink-0 flex-col gap-2">
		<div class="relative">
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
			{#if isPlayingPreview}
				<!-- Placeholder for image overlay -->
				<div class="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent">
					<!-- Timeline will go here -->
					<div class="timeline-placeholder">Timeline</div>
				</div>
			{/if}
		</div>

		<div class="pt-2">
			{#if isPlayingPreview}
				<button
					class="flex items-center gap-2 rounded-lg bg-gray-200 px-3 py-1 hover:bg-gray-300"
					onclick={togglePreviewPlayback}
				>
					<Pause class="h-4 w-4" />
					Pause
				</button>
				<div class="pt-2">
					<Volume2 class="inline h-4 w-4" />
					<span class="ml-2 text-xs">Volume Placeholder</span>
				</div>
				<div class="pt-1 text-xs">
					{Math.floor(audioPosition)}s / {Math.floor(audioDuration)}s
				</div>
			{:else}
				<button
					class="flex items-center gap-2 rounded-lg bg-green-500 px-3 py-1 text-white hover:bg-green-600"
					onclick={togglePreviewPlayback}
				>
					<Play class="h-4 w-4" />
					Preview (15s)
				</button>
			{/if}
		</div>
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
						class={`w-full text-wrap font-sans text-sm opacity-90 ${!expanded ? 'line-clamp-1' : ''}`}
						>{@html formatDescription(episode.summary)}</span
					>
				</button>
			</div>
		{/if}
	</div>
</div>
