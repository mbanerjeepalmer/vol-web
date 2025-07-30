<script lang="ts">
	import Frame from '$lib/components/demo/Frame.svelte';
	import Heading2 from '$lib/components/Heading2.svelte';
</script>

{#snippet image({ src, alt }: { src: string; alt: string })}
	<div class="flex items-center justify-center p-20">
		<img class="max-h-full" {alt} {src} />
	</div>
{/snippet}
{#snippet text(textcontent: string)}
	<div class="flex items-center justify-center p-20">
		<Heading2 class="text-6xl leading-[1.5em] text-white">{textcontent}</Heading2>
	</div>
{/snippet}

<div class="flex flex-col items-center gap-y-4">
	<Frame
		offspring={[
			{
				snip: image,
				args: {
					src: './src/routes/demo/vlcsnap-2025-07-29-22h47m00s290.png',
					alt: "vol homepage showing text query 'i want to be like Steve Jobs"
				}
			},
			{
				snip: text,
				args: 'tell vol what you want to be'
			}
		]}
	/>
	<Frame
		offspring={[
			{
				snip: text,
				args: 'vol knows what to search for'
			},
			{
				snip: image,
				args: {
					src: './src/routes/demo/vlcsnap-2025-07-29-22h53m11s489.png',
					alt: 'vol search page showing thinking'
				}
			}
		]}
	/>
	<Frame
		offspring={[
			{
				snip: image,
				args: {
					src: './src/routes/demo/vlcsnap-2025-07-29-22h53m11s489 composite.png',
					alt: 'vol search page showing thinking'
				}
			},
			{
				snip: text,
				args: 'selects relevant episodes'
			}
		]}
	/>
	<Frame
		offspring={[
			{
				snip: text,
				args: 'works in your player'
			},
			{
				snip: image,
				args: {
					src: 'src/routes/demo/your player composite.png',
					alt: 'vol search page showing thinking'
				}
			}
		]}
	/>
	<Frame></Frame>
</div>
