<script lang="ts">
	import { slide } from 'svelte/transition';
	import EpisodeCore from './EpisodeCore.svelte';
	let { episodesCount = 3 } = $props();
</script>

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
