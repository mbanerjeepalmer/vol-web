<script lang="ts">
	import { page } from '$app/stores';

	const spotifyId = $page.params.spotify_id;
	const flightId = $page.url.searchParams.get('flight');

	const predefinedReactions = ['Boring', 'Love', 'Share'];
</script>

<div class="container mx-auto px-4 py-8">
	<iframe
		title="Spotify podcast player"
		style="border-radius:12px"
		src={`https://open.spotify.com/embed/episode/${spotifyId}`}
		width="100%"
		height="352"
		frameborder="0"
		allowfullscreen
		allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
		loading="lazy"
	></iframe>

	{#each predefinedReactions as reaction}
		<form method="POST" class="h-full">
			<button
				value={reaction}
				name="reaction"
				type="submit"
				class="h-full w-full text-wrap rounded-md border border-input p-3 hover:bg-accent hover:text-accent-foreground"
			>
				{reaction}
			</button>
		</form>
	{/each}
</div>
