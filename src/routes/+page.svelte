<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { superForm } from 'sveltekit-superforms/client';
	import type { PageData } from './$types';
	import { Button } from '$lib/components/ui/button';
	export let data: PageData;

	const form = superForm(data.promptForm, {
		dataType: 'json',
		resetForm: false,
		applyAction: true,
		delayMs: 500,
		timeoutMs: 30000
	});
	const { form: formData, submitting: submitting, delayed: delayed, submit: submit } = form;

	const predefinedPrompts = [
		'I want to be like Mark Zuckerberg',
		'I want to learn about AI',
		'I enjoy football',
		'I just graduated from my engineering degree'
	];
</script>

<header class="my-8 flex justify-center px-4">
	<h1 class="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">Vol</h1>
</header>
<div class="mx-auto mb-4 grid w-full max-w-lg grid-cols-1 gap-4 px-4 sm:grid-cols-2">
	{#each predefinedPrompts as prompt}
		<form method="POST" class="h-full">
			<button
				value={prompt}
				name="prompt"
				type="submit"
				class="h-full w-full text-wrap rounded-md border border-input p-3 hover:bg-accent hover:text-accent-foreground"
				>{prompt}</button
			>
		</form>
	{/each}
</div>
<form method="POST" class="mx-auto w-full max-w-lg px-4">
	<div class="flex flex-col gap-2 sm:flex-row">
		<Input name="prompt" class="w-full" />
		<Button type="submit" class="w-full sm:w-auto">Submit</Button>
	</div>
</form>
