<script lang="ts">
	import { page } from '$app/stores';

	const uri = decodeURIComponent($page.params.uri);
	const flightId = $page.url.searchParams.get('flight');

	const predefinedReactions = [
		'Boring',
		'Want to learn more about leadership',
		'Want to learn more about Rome',
		'Share'
	];
</script>

<div class="container mx-auto px-4 py-8">
	<iframe
		title="Spotify podcast player"
		style="border-radius:12px"
		src="https://open.spotify.com/embed/episode/0C1ZvZeyF1wntYzx64Bote?utm_source=generator"
		width="100%"
		height="352"
		frameBorder="0"
		allowfullscreen="null"
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
				>{reaction}</button
			>
		</form>
	{/each}
</div>
