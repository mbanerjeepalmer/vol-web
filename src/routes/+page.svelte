<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { onMount } from 'svelte';

	let inputValue = '';
	let inputElement: HTMLInputElement;

	const predefinedPrompts = [
		'i want to be like',
		"i can't stop thinking about",
		"i'm working on",
		'i yap too much about'
	];
	const placeholders = [
		'take me on a journey...',
		"i'm obsessed by potatoes, both in cuisine and culture",
		"i can't stop thinking about the roman empire",
		"i'm working on media recommendations",
		'i want to be like maya angelou',
		"i've just started learning about safavid persia",
		"i can't stop listening to anatolian rock",
		'i want to be like steve jobs',
		"i can't stop thinking about potatoes",
		"i'm working on a novel about grasshoppers",
		'potato'
	];
	let placeholder = placeholders[0];
	let placeholderIndex = 0;

	// Set up placeholder rotation
	onMount(() => {
		const interval = setInterval(() => {
			placeholderIndex = (placeholderIndex + 1) % placeholders.length;
			placeholder = placeholders[placeholderIndex];
		}, 2000);

		return () => clearInterval(interval);
	});
</script>

<div class="mx-auto my-8">
	<form method="POST" class="mx-auto w-full max-w-lg px-4">
		<div class="flex flex-col gap-2 sm:flex-row">
			<Input
				autofocus
				accept="text/plain"
				name="prompt"
				bind:this={inputElement}
				bind:value={inputValue}
				class="h-16 w-full"
				{placeholder}
			/>
			<Button type="submit" class="text-md w-full sm:h-16 sm:w-auto">Submit</Button>
		</div>
	</form>
	<div class="mx-auto my-8 grid w-full max-w-lg grid-cols-1 gap-4 px-4 sm:grid-cols-2">
		{#each predefinedPrompts as prompt}
			<button
				type="button"
				on:click={() => {
					inputValue = prompt + ' ';
				}}
				class="h-full w-full text-wrap rounded-md border border-input p-3 hover:bg-accent hover:text-accent-foreground"
				>{prompt}</button
			>
		{/each}
	</div>
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
