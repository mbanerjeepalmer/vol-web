<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';

	let inputValue = '';
	let inputElement: HTMLInputElement;

	const predefinedPrompts = [
		'I want to be like',
		'I was just wondering about',
		'My one weird skill is',
		'I yap too much about'
	];
</script>

<div class="mx-auto mb-24 mt-16">
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
				class="w-full"
				placeholder="I'm thinking about..."
			/>
			<Button type="submit" class="w-full sm:w-auto">Submit</Button>
		</div>
	</form>
</div>

<a href="/history" class="mx-auto block text-center underline">my vols</a>
