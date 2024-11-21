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
		<li>
			<a href="/history" class="mx-auto block text-center underline opacity-70 hover:opacity-100"
				>my vols</a
			>
		</li>
		<li>
			<a href="/how-to" class="mx-auto block text-center underline opacity-70 hover:opacity-100"
				>how to vol</a
			>
		</li>
	</ul>
</header>

{@render children()}

{#if chatting}
	<Chat />
{:else}
	<div
		class={`my-8 flex items-center justify-center transition-opacity duration-200 ${chatting ? 'opacity-0' : 'opacity-100'}`}
	>
		<Button class="text-sm underline opacity-70" variant="link" on:click={() => (chatting = true)}
			>feedback</Button
		>
	</div>
{/if}
