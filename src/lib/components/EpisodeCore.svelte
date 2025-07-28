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
		userClassify?: (episode: JSONFeedItem, category: 'plus' | 'minus') => Promise<void>;
		processClassificationQueue?: () => Promise<void>;
		classificationStatus?: 'pending' | 'success' | 'error' | undefined;
	}

	let { episode, userClassify, classificationStatus, processClassificationQueue }: Props = $props();

	const audioAttachment = episode.attachments?.find((a) => a.mime_type.startsWith('audio/'));
	let previewTimeout: ReturnType<typeof setTimeout> | null = null;

	let expanded = $state(false);
	let hasMore = false;
	let descriptionElem: HTMLElement = $state();
	let isPlayingPreview = $state(false);
	let audioPlayer: HTMLAudioElement | null = $state(null);
	let audioPosition = $state(0);
	let audioDuration = $state(0);
	// 1. Add new state variables after existing ones:
	let previewStartTime = $state(0);
	let userHasSeeked = $state(false);

	let categorisation = $derived.by(() => {
		return episode._categories?.find((cat) => cat.feed_title === 'Everything else')
			? 'Everything else'
			: episode._categories?.length
				? 'relevant'
				: undefined;
	});

	// 2. Replace the formatTime function with this updated version:
	function formatTime(seconds: number): string {
		if (isNaN(seconds)) return '0:00';
		const min = Math.floor(seconds / 60);
		const sec = Math.floor(seconds % 60);
		return `${min}:${sec < 10 ? '0' : ''}${sec}`;
	}

	function getRandomStartTime(duration: number): number {
		const quarterPoint = duration * 0.25;
		const threeQuarterPoint = duration * 0.75;
		return quarterPoint + Math.random() * (threeQuarterPoint - quarterPoint);
	}

	function handleSliderChange(newPosition: number) {
		if (!audioPlayer) return;
		userHasSeeked = true;
		audioPlayer.currentTime = newPosition;
		audioPosition = newPosition; // Update state to provide immediate visual feedback
	}

	onMount(() => {
		if (expanded) {
			hasMore = descriptionElem.scrollHeight > descriptionElem.clientHeight;
		}

		if (!audioAttachment) return;

		// Create and configure audio element
		audioPlayer = new Audio(audioAttachment.url);
		audioPlayer.preload = 'metadata';

		audioPlayer.ontimeupdate = () => {
			audioPosition = audioPlayer?.currentTime || 0;
		};

		audioPlayer.onloadedmetadata = () => {
			audioDuration = audioPlayer?.duration || 0;
			if (audioDuration > 0) {
				previewStartTime = getRandomStartTime(audioDuration);
			}
		};

		audioPlayer.onended = () => {
			isPlayingPreview = false;
			audioPosition = 0;
			if (previewTimeout) {
				clearTimeout(previewTimeout);
				previewTimeout = null;
			}
		};

		return () => {
			if (audioPlayer) {
				audioPlayer.pause();
				audioPlayer = null;
			}
		};
	});

	function toggleExpanded(event: MouseEvent) {
		event.stopPropagation();
		expanded = !expanded;
	}

	async function togglePreviewPlayback() {
		if (!audioPlayer) return;

		if (isPlayingPreview) {
			audioPlayer.pause();
			isPlayingPreview = false;
			if (previewTimeout) {
				clearTimeout(previewTimeout);
				previewTimeout = null;
			}
		} else {
			// Reset user interaction flag
			userHasSeeked = false;

			// Set to random start time
			audioPlayer.currentTime = previewStartTime;
			audioPosition = previewStartTime;

			try {
				await audioPlayer.play();
				isPlayingPreview = true;
				previewTimeout = setTimeout(() => {
					// Only auto-stop if user hasn't seeked
					if (isPlayingPreview && audioPlayer && !userHasSeeked) {
						audioPlayer.pause();
						isPlayingPreview = false;
						audioPosition = previewStartTime;
					}
					previewTimeout = null;
				}, 15000);
			} catch (error) {
				console.error('Error playing preview:', error);
			}
		}
	}
</script>

<div class="flex flex-col gap-4 p-2 md:flex-row">
	<div class="flex shrink-0 flex-col gap-2">
		<div class="relative">
			{#if episode.image}
				<img
					src={episode.image}
					alt={episode.title}
					class="aspect-1/1 mx-auto h-48 flex-shrink-0 self-start rounded-xl object-cover"
				/>
			{:else}
				<div
					class="mx-auto h-48 w-48 flex-shrink-0 rounded-xl bg-gradient-to-r from-fuchsia-500 to-green-500 opacity-80"
				></div>
			{/if}
			{#if audioAttachment && isPlayingPreview}
				<div
					class="absolute inset-0 flex flex-col justify-end rounded-xl bg-gradient-to-t from-black/70 to-transparent p-2"
				>
					<!-- <Slider
						type="single"
						min={0}
						max={audioDuration}
						value={audioPosition]}
						step={1}
						disabled={!isPlayingPreview}
						onValueCommit={(value) => handleSliderChange(value[0])}
						class="w-full"
					/> -->

					<div class="pt-1 text-xs text-white">
						{formatTime(audioPosition)} / {formatTime(audioDuration)}
					</div>
				</div>
			{/if}
		</div>

		{#if audioAttachment}
			<div class="w-full">
				{#if isPlayingPreview}
					<button
						class="flex w-full items-center gap-2 rounded-lg bg-gray-200 px-3 py-2 hover:bg-gray-300"
						onclick={togglePreviewPlayback}
					>
						<Pause class="h-4 w-4" />
						Pause
					</button>
				{:else}
					<button
						class="flex w-full items-center gap-2 rounded-lg bg-gradient-to-br {categorisation ===
						'Everything else'
							? 'border-fuchsia-600 from-fuchsia-500 to-fuchsia-600 hover:from-fuchsia-600 hover:to-fuchsia-700'
							: 'from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'} px-3 py-2 font-medium text-white hover:bg-green-600"
						onclick={togglePreviewPlayback}
					>
						<Play class="h-4 w-4" />
						Preview (15s)
					</button>
				{/if}
			</div>
		{/if}
	</div>
	<div class="mx-1 flex h-full w-full flex-col items-start gap-4">
		<a href={episode?.link} target="_blank">
			<h3
				class="mx-2 line-clamp-2 min-h-12 text-wrap break-words pt-2 font-sans text-lg font-bold opacity-90"
			>
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
				{:else if classificationStatus === 'error' && processClassificationQueue}
					<button onclick={async () => processClassificationQueue()}>
						<RefreshCw class="h-6 text-red-500" />
					</button>
				{:else if userClassify}
					<button
						class="flex flex-row items-center gap-2 rounded-2xl border border-transparent px-4 py-2 hover:border-green-200 hover:bg-green-50 hover:text-green-500 {categorisation ===
						'relevant'
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
						class="rounded-2xl border border-transparent px-2 py-2 hover:border-fuchsia-500/40 hover:bg-fuchsia-50 hover:text-fuchsia-500 {categorisation ===
						'Everything else'
							? 'text-fuchsia-500'
							: 'opacity-40'}"
						onclick={async () => userClassify(episode, 'minus')}
					>
						<CircleMinus class="h-6" /></button
					>
				{:else}
					<button
						class="flex cursor-not-allowed flex-row items-center gap-2 rounded-2xl border border-transparent px-4 py-2 opacity-40 hover:border-green-200 hover:bg-green-50 hover:text-green-500"
						disabled
					>
						<CirclePlus class="h-6" />add to playlist</button
					>
					<button
						class="cursor-not-allowed rounded-2xl border border-transparent px-2 py-2 opacity-40 hover:border-fuchsia-500/40 hover:bg-fuchsia-50 hover:text-fuchsia-500"
						disabled
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
						class={`w-full text-wrap break-words font-sans text-sm opacity-90 ${!expanded ? 'line-clamp-1' : ''}`}
						>{@html formatDescription(episode.summary)}</span
					>
				</button>
			</div>
		{/if}
	</div>
</div>
