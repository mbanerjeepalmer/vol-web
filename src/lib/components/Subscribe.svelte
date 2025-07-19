<script lang="ts">
	import { PUBLIC_ZACUSCA_API_BASE } from '$env/static/public';
	import Button from '$lib/components/ui/button/button.svelte';
	import { Input } from '$lib/components/ui/input';
	let { relevantEpisodes, relevantFeedID } = $props();
	let hasCopied = $state(false);
</script>

<div
	class="mx-auto my-12 flex max-w-lg flex-col gap-y-6 rounded-md border border-border px-3 py-6"
	class:opacity-0={!relevantEpisodes || relevantEpisodes.length === 0}
>
	<h2 class="px-1 text-lg font-medium tracking-tight">subscribe to these results as a podcast</h2>
	<div class="flex h-12 flex-row justify-between gap-x-6 align-middle">
		<!-- copy on click, cursor should be pointer -->
		<div class="flex flex-row gap-x-1">
			<Input class="h-full" value={`${PUBLIC_ZACUSCA_API_BASE}/feed/${relevantFeedID}/rss`} />
			<Button
				onclick={async () => {
					await navigator.clipboard.writeText(
						`${PUBLIC_ZACUSCA_API_BASE}/feed/${relevantFeedID}/rss`
					);
					hasCopied = true;
				}}
				class="h-full w-28"
				variant="outline">{hasCopied ? 'copied' : 'copy'}</Button
			>
		</div>
		<img
			class="p-1"
			src="/assets/US-UK_Apple_Podcasts_Listen_Badge_RGB_062023.svg"
			alt="Apple Podcasts badge"
		/>
	</div>
	<p>copy the RSS feed URL. paste it into your podcast player.</p>
</div>
