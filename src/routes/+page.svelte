<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { onMount } from 'svelte';

	let inputValue = $state();
	let inputElement: HTMLInputElement | null = $state(null);

	const predefinedPrompts = [
		'i want to be like olivia rodrigo',
		"i can't stop thinking about stablecoins",
		"i'm working on linear regressions",
		'i yap too much about artisanal cutlery'
	];
	// const placeholders = [
	// 	"i can't stop thinking about the roman empire",
	// 	"i'm working on media recommendations",
	// 	"i'm obsessed by potatoes, both in cuisine and culture",
	// 	'i want to be like maya angelou',
	// 	"i've just started learning about safavid persia",
	// 	"i can't stop listening to anatolian rock",
	// 	'i want to be like steve jobs',
	// 	"i'm working on a novel about grasshoppers"
	// ];
	// let placeholder = placeholders[0];
	// let placeholderIndex = 0;

	// // Set up placeholder rotation
	// onMount(() => {
	// 	const interval = setInterval(() => {
	// 		placeholderIndex = (placeholderIndex + 1) % placeholders.length;
	// 		placeholder = placeholders[placeholderIndex];
	// 	}, 2000);

	// 	return () => clearInterval(interval);
	// });
</script>

<div class="mx-auto my-8">
	<div class="mx-auto my-16 max-w-lg">
		<h1 class="text-center text-4xl font-extrabold tracking-tight lg:text-5xl">
			<span
				class="mr-2 inline-block bg-gradient-to-r from-fuchsia-500 to-green-500 bg-clip-text text-transparent"
				>vol</span
			> is better than you at finding podcasts
		</h1>
	</div>
	<form method="POST" class="mx-auto w-full max-w-lg px-4">
		<div class="flex flex-col gap-2 sm:flex-row">
			<Input
				autofocus
				accept="text/plain"
				name="prompt"
				bind:ref={inputElement}
				bind:value={inputValue}
				class="h-16 w-full"
				placeholder="what's on your mind?"
			/>
			<Button type="submit" class="text-md w-full sm:h-16 sm:w-auto">go</Button>
		</div>
	</form>
	<div class="mx-auto my-8 grid w-full max-w-xl grid-cols-1 gap-4 px-4 sm:grid-cols-2">
		{#each predefinedPrompts as prompt}
			<button
				type="button"
				onclick={() => {
					inputValue = prompt;
					inputElement.focus();
				}}
				class="h-full w-full text-wrap rounded-md border border-input bg-slate-50 p-3 text-xs font-medium hover:bg-accent hover:text-accent-foreground"
				>{prompt}...</button
			>
		{/each}
	</div>
</div>
