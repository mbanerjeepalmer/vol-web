<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { onMount } from 'svelte';
	import { llmStore, initializeModel } from '$lib/stores/llm';

	let inputValue = '';
	let inputElement: HTMLInputElement;

	const predefinedPrompts = [
		'i want to be like',
		"i can't stop thinking about",
		"i'm working on",
		'i yap too much about'
	];

	onMount(() => {
		// initializeModel();
	});
</script>

<div class="mx-auto mb-24 mt-14">
	<div class="mx-auto mb-4 grid w-full max-w-lg grid-cols-1 gap-4 px-4 sm:grid-cols-2">
		{#each predefinedPrompts as prompt}
			<button
				type="button"
				on:click={() => {
					inputValue = prompt + ' ';
					inputElement.focus();
				}}
				class="h-full w-full text-wrap rounded-md border border-input p-3 hover:bg-accent hover:text-accent-foreground"
				>{prompt}</button
			>
		{/each}
	</div>
	<form method="POST" class="mx-auto w-full max-w-lg px-4">
		<div class="flex flex-col gap-2 sm:flex-row">
			<Input
				bind:this={inputElement}
				name="prompt"
				bind:value={inputValue}
				class="h-16 w-full"
				placeholder="take me on a journey..."
			/>
			<Button type="submit" class="text-md h-16 w-full sm:w-auto">Submit</Button>
		</div>
	</form>
</div>

<!-- <div class="fixed bottom-4 right-4 rounded-lg border bg-white p-2 shadow-lg">
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
				Using Groq
			{:else}
				Initialising...
			{/if}
		</span>
	</div>
</div> -->
<ul>
	<li>
		<a href="/history" class="mx-auto block text-center underline">my vols</a>
	</li>
	<li>
		<a href="/how-to" class="mx-auto block text-center underline">how to vol</a>
	</li>
</ul>
