<script lang="ts">
	import { slide } from 'svelte/transition';
	import Heading2 from '$lib/components/Heading2.svelte';
	type Props = {};
	let { themeColour = 'slate', headingText, epsidodesSlot, subscribeSlot = null } = $props();
</script>

<div
	transition:slide
	class="my-8 box-border flex flex-col rounded-2xl border-4 border-{themeColour}-500/30 pt-4"
>
	<Heading2>
		{@render headingText()}
	</Heading2>
	<!-- Scrollable episodes container -->
	<div
		class="scrollbar-thin scrollbar-track-transparent scrollbar-thumb-green-500/20 hover:scrollbar-thumb-green-500/40 max-h-[50vh] overflow-y-auto px-4 py-6"
	>
		<div class="relative">
			<div class="flex flex-col gap-6">
				{@render epsidodesSlot()}
			</div>
		</div>
	</div>

	{#if subscribeSlot}
		<div class="border-t border-{themeColour}-500/20 px-4 py-6">
			{@render subscribeSlot()}
		</div>
	{/if}
</div>
