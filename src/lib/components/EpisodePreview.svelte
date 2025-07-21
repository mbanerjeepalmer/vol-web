<script lang="ts">
	import type { JSONFeedItem } from '$lib/types';
	import { send, receive } from '$lib/utils';
	import EpisodeCore from './EpisodeCore.svelte';
	interface Props {
		episode: JSONFeedItem;
	}

	let { episode, userClassify }: Props = $props();
</script>

<article
	in:receive={{ key: episode.id }}
	out:send={{ key: episode.id }}
	class="flex flex-col gap-4 rounded-xl border border-border"
>
	<EpisodeCore {episode} {userClassify} />
</article>
