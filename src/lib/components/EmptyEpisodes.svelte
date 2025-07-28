<script lang="ts">
	import { slide } from 'svelte/transition';
	import EpisodeCore from './EpisodeCore.svelte';
	let { episodesCount = 3 } = $props();
</script>

<div
	class="scrollbar-thin scrollbar-track-transparent scrollbar-thumb-green-500/20 hover:scrollbar-thumb-green-500/40 max-h-[50vh] overflow-y-auto px-4 py-6"
>
	<div transition:slide class="my-8 grid gap-6">
		<!-- TODO: this should be handled a level up and then a flip animation can be used. -->
		{#each Array(episodesCount) as _}
			<article class="flex animate-pulse flex-col gap-4 rounded-xl border border-border">
				<EpisodeCore
					episode={{
						title: '',
						attachments: [],
						content_html: '',
						image: '',
						authors: [],
						date_published: '',
						id: '',
						url: '',
						summary: ''
					}}
				/>
			</article>
		{/each}
	</div>
</div>
