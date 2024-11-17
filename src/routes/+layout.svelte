<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { llmStore, initializeModel } from '$lib/stores/llm';

	let { children } = $props();

	onMount(() => {
		initializeModel();
	});
</script>

<header class="container mx-auto p-4">
	<div class="flex items-center justify-center">
		<a href="/">
			<h1
				class="inline-block bg-gradient-to-r from-fuchsia-500 to-green-500 bg-clip-text text-center text-3xl font-bold text-transparent"
			>
				vol
			</h1>
		</a>
	</div>
</header>

<!-- Status indicator -->
<div class="fixed bottom-4 right-4 rounded-lg border bg-white p-2 shadow-lg">
	<div class="flex items-center gap-2">
		<div
			class="h-2 w-2 rounded-full"
			class:bg-yellow-400={$llmStore.status === 'loading'}
			class:bg-green-500={$llmStore.status === 'ready'}
			class:bg-red-500={$llmStore.status === 'error'}
			class:bg-gray-300={$llmStore.status === 'idle'}
		></div>
		<span class="text-sm">
			{#if $llmStore.status === 'loading'}
				Loading LLM...
			{:else if $llmStore.status === 'ready'}
				{$llmStore.readyMessage}
			{:else if $llmStore.status === 'error'}
				LLM Error
			{:else}
				Initialising...
			{/if}
		</span>
	</div>
</div>

{@render children()}
