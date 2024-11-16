<script lang="ts">
	import { page } from '$app/stores';
	const prompt = $page.url.searchParams.get('prompt');
	import * as Card from '$lib/components/ui/card/index.js';
	import { cn } from '$lib/utils';
	import Markdown from '$lib/components/Markdown.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import { Play } from 'lucide-svelte';
	import type { PageData } from './$types';
	export let data: PageData;

	function getRatingColor(score: number) {
		if (score >= 80) return 'text-green-500';
		if (score >= 60) return 'text-yellow-500';
		if (score >= 40) return 'text-orange-500';
		return 'text-red-500';
	}

	function formatDuration(ms: number): string {
		const minutes = Math.floor(ms / 60000);
		const seconds = Math.floor((ms % 60000) / 1000);
		return `${minutes}:${seconds.toString().padStart(2, '0')}`;
	}

	const llmSearchNarrative = `
You asked: ${prompt}

Direct paths could be: interviews with Mark Zuckerberg, episodes about the story of Facebook

Thinking laterally, we know that Zuckerberg has a passion for the classics, studied psychology and is into barbecuing.

## Queries
Here are some search queries we can try, ranked from most direct to most lateral:
- Mark Zuckerberg interview
- Early history of Facebook
- Birth of social media 
- Introduction to psychology
- Caesar Augustus
- Barbecuing techniques
`;

	const flightId = crypto.randomUUID();
	let chosenResultPath = `reflect/${encodeURIComponent('https://open.spotify.com/episode/0C1ZvZeyF1wntYzx64Bote')}?flight=${flightId}`;
</script>

<div class="container mx-auto px-4 py-8">
	<h1 class="mb-8 scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">Searching...</h1>

	<h2
		class="mt-10 scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight transition-colors first:mt-0"
	>
		Identifying search queries
	</h2>

	<Markdown content={llmSearchNarrative} />

	<h2
		class="mt-10 scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight transition-colors"
	>
		Search results
	</h2>

	<div class="container mx-auto px-4 py-8">
		{#each data.searchResults as searchGroup}
			<div class="mb-12">
				<h2 class="mb-6 scroll-m-20 text-2xl font-semibold tracking-tight">
					{searchGroup.query}
				</h2>

				<div
					class={cn(
						'grid gap-6 rounded-lg p-4',
						data.searchResults.indexOf(searchGroup) % 3 === 0 && 'bg-red-100',
						data.searchResults.indexOf(searchGroup) % 3 === 1 && 'bg-blue-100',
						data.searchResults.indexOf(searchGroup) % 3 === 2 && 'bg-green-100'
					)}
				>
					{#each searchGroup.results.episodes.items as episode}
						<Card.Root class="flex overflow-hidden">
							<div class="hidden sm:block">
								<img
									src={episode.images[1]?.url}
									alt={episode.name}
									class="h-[150px] w-[150px] object-cover"
								/>
							</div>

							<div class="flex flex-1 flex-col p-6">
								<Card.Header class="pb-4">
									<Card.Title class="text-xl">
										<a
											href={episode.external_urls.spotify}
											target="_blank"
											rel="noopener noreferrer"
											class="hover:underline"
										>
											{episode.name}
										</a>
									</Card.Title>
									<Card.Description class="line-clamp-2">
										{episode.description}
									</Card.Description>
								</Card.Header>

								<Card.Footer class="mt-auto flex items-center justify-between pt-4">
									<div class="flex items-center gap-2">
										{#if episode.audio_preview_url}
											<audio controls class="h-8 w-48">
												<source src={episode.audio_preview_url} type="audio/mpeg" />
											</audio>
										{/if}
										<span class="text-sm text-muted-foreground">
											{formatDuration(episode.duration_ms)}
										</span>
									</div>

									<Button variant="outline" size="sm" asChild>
										<a
											href={episode.external_urls.spotify}
											target="_blank"
											rel="noopener noreferrer"
											class="flex items-center gap-2"
										>
											<Play class="h-4 w-4" />
											<span>Listen on Spotify</span>
										</a>
									</Button>
								</Card.Footer>
							</div>
						</Card.Root>
					{/each}
				</div>
			</div>
		{/each}
	</div>

	<div class="prose prose-stone dark:prose-invert mx-auto mb-12 mt-8 max-w-3xl">
		<Markdown
			content={`
# The Augustus Connection
Zuckerberg's fascination with Augustus Caesar goes beyond mere historical interest. Just as Augustus transformed the Roman Republic into an empire while maintaining traditional appearances, Zuckerberg has guided Facebook's evolution into Meta.

## Key Parallels
- Strategic transformation while preserving familiar structures
- Masterful alliance building and power consolidation  
- Long-term vision for institutional change

## Why It Matters
By studying Augustus's methods, we gain unique insights into Zuckerberg's leadership philosophy and decision-making approach. The parallels between these two transformative leaders, separated by two millennia, are remarkably instructive.
`}
		/>
	</div>
</div>
<div class="container mx-auto flex justify-center px-4 py-8">
	<a href={chosenResultPath}><Button>Let's go</Button></a>
</div>
