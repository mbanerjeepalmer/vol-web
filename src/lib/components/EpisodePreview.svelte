<script lang="ts">
	import type { JSONFeedItem } from '$lib/types';
	import { send, receive } from '$lib/utils';
	import EpisodeCore from '$lib/components/EpisodeCore.svelte';
	interface Props {
		episode: JSONFeedItem;
		userClassify?: (episode: JSONFeedItem, category: 'plus' | 'minus') => Promise<void>;
		processClassificationQueue?: () => Promise<void>;
		classificationStatus: 'pending' | 'success' | 'error' | null;
	}

	let { episode, userClassify, classificationStatus, processClassificationQueue }: Props = $props();
</script>

<article
	in:receive={{ key: episode.id }}
	out:send={{ key: episode.id }}
	class="flex flex-col gap-4 rounded-xl border border-border"
>
	<EpisodeCore {episode} {userClassify} {classificationStatus} {processClassificationQueue} />
</article>
