<script lang="ts">
	import { onMount } from 'svelte';
	import type { Interaction } from '$lib/utils';
	let interactions: Interaction[] = [];

	function getInteractionHistory(): Interaction[] {
		try {
			const interactions: Interaction[] = JSON.parse(
				localStorage.getItem('vol-interactions') || '[]'
			);
			// Sort by timestamp in descending order (most recent first)
			return interactions.sort((a, b) => b.timestamp - a.timestamp);
		} catch (error) {
			console.error('Failed to get interaction history:', error);
			return [];
		}
	}
	onMount(() => {
		interactions = getInteractionHistory();
	});
</script>

<h2 class="mb-4 text-xl font-semibold">History</h2>
{#if interactions.length === 0}
	<p class="text-gray-500">No reactions yet</p>
{:else}
	<div class="space-y-4">
		{#each interactions as interaction}
			<div class="rounded-lg border p-4">
				<div class="flex flex-col gap-2">
					<div>
						<h3 class="font-medium">{interaction.episodeTitle || ''}</h3>
					</div>
					<span class="inline-block w-fit py-1 text-primary">
						"{interaction.reaction}"
					</span>
					<span class="w-fit self-end text-gray-500">
						{new Date(interaction.timestamp).toLocaleString('en-GB', {
							hour: '2-digit',
							minute: '2-digit',
							day: 'numeric',
							month: 'short'
						})}
					</span>
				</div>
			</div>
		{/each}
	</div>
{/if}
