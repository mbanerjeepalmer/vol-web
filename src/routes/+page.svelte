<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { onMount } from 'svelte';

	let inputValue = $state();
	let inputElement: HTMLInputElement | null = $state(null);

	const predefinedPrompts = [
		'i want to get into international cinema',
		'i want to be like olivia rodrigo',
		"i'm working on human computer interface design",
		"i can't stop thinking about the roman empire"
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
				data-posthog-no-mask
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
				>{prompt}</button
			>
		{/each}
	</div>
</div>
<div class="mx-auto my-16 w-fit">
	<a
		href="https://www.producthunt.com/products/vol?embed=true&utm_source=badge-featured&utm_medium=badge&utm_source=badge-vol&#0045;2"
		target="_blank"
		><img
			src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=999493&theme=light&t=1758541857781"
			alt="vol - searches&#0032;podcast&#0032;episodes&#0032;that&#0032;help&#0032;you&#0032;be&#0032;the&#0032;best&#0032;you | Product Hunt"
			style="width: 250px; height: 54px;"
			width="250"
			height="54"
		/></a
	>
</div>
