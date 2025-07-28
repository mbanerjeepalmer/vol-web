<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import posthog from 'posthog-js';
	import { browser } from '$app/environment';
	import { beforeNavigate, afterNavigate } from '$app/navigation';
	import Chat from '$lib/components/Chat.svelte';
	let chatting = $state(false);
	let { children } = $props();
	if (browser) {
		beforeNavigate(() => posthog.capture('$pageleave'));
		afterNavigate(() => posthog.capture('$pageview'));
	}
</script>

<div class="flex min-h-screen flex-col">
	{#if page.url.pathname !== '/'}
		<header class="container mx-auto p-4 lg:mt-8">
			<div class="flex items-center justify-center">
				<a href="/">
					<h1
						class="inline-block bg-gradient-to-r from-fuchsia-500 to-green-500 bg-clip-text text-center text-3xl font-bold text-transparent"
					>
						vol
					</h1>
				</a>
			</div>
			<ul class="mx-auto mb-6 mt-4 flex w-full max-w-lg flex-row justify-end gap-4 text-sm"></ul>
		</header>
	{/if}

	<main class="flex-grow">
		{@render children()}
	</main>

	<footer class="container mx-auto mt-auto max-w-lg p-4">
		<ul class="mx-auto flex w-fit flex-col items-center justify-center gap-4 text-sm sm:flex-row">
			<li class="underline decoration-slate-400 opacity-70 hover:opacity-100">
				<a href="/how-to">how to vol</a>
			</li>
			<li class="underline decoration-slate-400 opacity-70 hover:opacity-100">
				{#if chatting}
					<Chat />
				{:else}
					<Button
						class="font light underline decoration-slate-400 opacity-70 hover:opacity-100"
						variant="link"
						on:click={() => (chatting = true)}>give feedback</Button
					>
				{/if}
			</li>
			<li>
				<a
					href="https://tally.so/r/mJVbb7"
					class="underline decoration-slate-400 opacity-70 hover:opacity-100">stay in touch</a
				>
			</li>
		</ul>
	</footer>
</div>
