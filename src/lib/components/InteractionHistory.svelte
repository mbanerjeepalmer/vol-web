<script lang="ts">
	import { onMount } from 'svelte';

	interface EpisodeInteraction {
		spotifyId: string;
		reaction: string;
		timestamp: number;
		episodeTitle?: string;
		episodeDescription?: string;
		flightId?: string;
	}

	let interactions: EpisodeInteraction[] = [];

	function getInteractionHistory(): EpisodeInteraction[] {
		try {
			const interactions: EpisodeInteraction[] = JSON.parse(
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

<div class="mt-8 p-8">
	<h2 class="mb-4 text-xl font-semibold">History</h2>
	{#if interactions.length === 0}
		<p class="text-gray-500">No reactions yet</p>
	{:else}
		<div class="space-y-4">
			{#each interactions as interaction}
				<div class="rounded-lg border p-4">
					<div class="flex items-start justify-between">
						<div>
							<h3 class="font-medium">{interaction.episodeTitle || ''}</h3>
							<p class="text-sm text-gray-500">
								{new Date(interaction.timestamp).toLocaleString('en-GB', {
									hour: '2-digit',
									minute: '2-digit',
									day: 'numeric',
									month: 'short'
								})}
							</p>
						</div>
						<span class="rounded-full bg-primary/10 px-3 py-1 text-sm text-primary">
							{interaction.reaction}
						</span>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
