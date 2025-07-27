<script lang="ts">
	import { PUBLIC_ZACUSCA_API_BASE } from '$env/static/public';
	import Button from '$lib/components/ui/button/button.svelte';
	import { Input } from '$lib/components/ui/input';
	let { relevantEpisodes, relevantFeedID } = $props();
	let hasCopied = $state(false);
</script>

<div
	class="relative m-8 flex flex-col gap-y-4 rounded-md border border-border bg-primary-foreground px-3 py-3"
	class:opacity-0={!relevantEpisodes || relevantEpisodes.length === 0}
>
	<!-- Glow effect (pseudo-element) -->
	<div
		class="absolute inset-0 -z-10 rounded-md bg-gradient-to-br from-green-500 to-purple-500 opacity-90 blur-[35px]"
	></div>
	<div class="flex flex-row gap-2">
		<div class="flex shrink-0 flex-col gap-4">
			<h2 class="px-1 text-lg font-medium tracking-tight">listen in your player</h2>
			<p class="-mt-3 px-1 text-xs opacity-70">works with everything except spotify.</p>
		</div>
		<p
			class="self-end {hasCopied
				? 'text-right text-xs font-medium text-green-500 opacity-100'
				: 'opacity-0'}"
		>
			now paste the url into your player
		</p>
	</div>
	<div class="flex h-12 flex-row justify-between gap-x-6">
		<div class="flex flex-row gap-x-1">
			<Input class="h-full" value={`${PUBLIC_ZACUSCA_API_BASE}/feed/${relevantFeedID}/rss`} />
			<Button
				onclick={async () => {
					await navigator.clipboard.writeText(
						`${PUBLIC_ZACUSCA_API_BASE}/feed/${relevantFeedID}/rss`
					);
					hasCopied = true;
				}}
				class={`h-full w-28 ${hasCopied ? 'border-green-500 text-green-500 hover:bg-green-50/50 hover:text-green-800' : ''}`}
				variant="outline">{hasCopied ? 'copied' : 'copy'}</Button
			>
		</div>
		<a
			class="self-center"
			href={`podcast://${PUBLIC_ZACUSCA_API_BASE.replace(/^https?:\/\/(www\.)?/, '')}/feed/${relevantFeedID}/rss`}
			target="_blank"
		>
			<img
				class=""
				src="/assets/US-UK_Apple_Podcasts_Listen_Badge_RGB_062023.svg"
				alt="Apple Podcasts badge"
			/></a
		>
	</div>
</div>
