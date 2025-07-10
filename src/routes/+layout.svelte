<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';
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
	<ul class="mx-auto mb-6 mt-4 flex w-full max-w-lg flex-row justify-end gap-4 text-sm">
		<!-- <li>
			<a href="/history" class="mx-auto block text-center underline opacity-70 hover:opacity-100"
				>my vols</a
			>
		</li> -->
	</ul>
</header>
<div>
	<p class="mb-2 text-center text-lg opacity-100">vol is better than you at finding podcasts</p>
	<p>
		<a
			href="/how-to"
			class="mx-auto mb-12 block text-center text-sm underline opacity-70 hover:opacity-100"
			>how to vol</a
		>
	</p>
</div>

{@render children()}

<footer class="container mx-auto mt-16 max-w-lg p-4">
	<ul class="flex flex-col justify-center gap-4">
		<li class="mx-auto flex w-fit flex-row items-center gap-2 text-sm">
			{#if chatting}
				<Chat />
			{:else}
				<Button
					class="m-0 p-0 font-normal underline opacity-70 hover:opacity-100"
					variant="link"
					on:click={() => (chatting = true)}>give feedback</Button
				>
			{/if}
			<span>or</span>
			<a href="https://tally.so/r/mJVbb7" class="underline opacity-70 hover:opacity-100"
				>stay in touch</a
			>
		</li>
	</ul>
</footer>
