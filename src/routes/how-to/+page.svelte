<script>
	import { Compass, Sprout, GraduationCap, Gem } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';
</script>

<article
	class="prose prose-headings:text-center prose-headings:font-bold container mx-auto my-12 flex max-w-prose flex-col space-y-6"
>
	<h1 class="mb-8 text-center text-4xl font-extrabold tracking-tight lg:text-5xl">
		<span
			class="mr-2 inline-block bg-gradient-to-r from-fuchsia-500 to-green-500 bg-clip-text text-transparent"
			>vol</span
		> is better than you at finding podcasts
	</h1>

	<p>Let's say you want to be like Steve Jobs.</p>
	<p>You want to imbibe the same ingredients that made him.</p>
	<p>What podcasts do you search for?</p>
	<enhanced:img
		src="/static/spotify-search-results.png"
		alt="Spotify search results"
		class="h-lg mx-auto my-4 block w-auto object-contain shadow-[5px_5px_10px_rgba(0,0,0,0.6)]"
	/>
	<p>Was Steve Jobs imbibing 'motivational speeches'?</p>
	<p>No.</p>
	<p>
		He was imbibing calligraphy, electronics, English literature, psychedelics and Zen Buddhism.
	</p>

	<h3 class="pt-12 text-lg font-semibold">
		<span
			class="mr-2 inline-block bg-gradient-to-r from-fuchsia-500 to-green-500 bg-clip-text text-xl font-bold text-transparent"
			>vol</span
		>thinks laterally for you
	</h3>
	<p class="">It comes up with search terms you wouldn't have thought of.</p>
	<p>Then it rates the podcasts it finds according to:</p>
	<ul class="ml-2 place-items-baseline">
		<li><Compass class={`mr-2 inline h-4 w-4`} />alignment with your goal</li>
		<li>
			<GraduationCap class={`mr-2 inline h-4 w-4`} />compatibility with your level of expertise
		</li>
		<li><Gem class={`mr-2 inline h-4 w-4`} />production quality</li>
		<li><Sprout class={`mr-2 inline h-4 w-4`} />freshness -- timeliness or timelessness</li>
	</ul>
	<enhanced:img
		src="/static/vol-steve-jobs.png"
		alt="vol search results page"
		class="h-lg mx-auto my-8 block w-auto object-contain shadow-[5px_5px_10px_rgba(0,0,0,0.6)]"
	/>

	<p>So, what journey do you want to go on?</p>
	<a href="/" class="mx-auto">
		<Button class="my-4 w-fit bg-gradient-to-r from-fuchsia-500 to-green-500 text-xl text-white "
			>Let's vol</Button
		>
		<!-- <p class="mx-auto flex flex-wrap space-y-2 whitespace-normal p-4">
		<span class="px-12 opacity-95">I'm obsessed by potatoes, both in cuisine and culture</span>
		<span class="px-2 opacity-45">I can't stop thinking about the Roman Empire</span>
		<span class="px-14 opacity-65">I'm working on media recommendations</span>
		<span class="px-4 opacity-85">I want to be like Maya Angelou</span>
		<span class="px-9 opacity-75">I've just started learning about Safavid Persia</span>
		<span class="px-1 opacity-35">I can't stop listening to Anatolian rock</span>
	</p> -->
	</a>
</article>
