<script lang="ts">
	import { page } from '$app/stores';
	const prompt = $page.url.searchParams.get('prompt');
	import * as Card from '$lib/components/ui/card/index.js';
	import { cn } from '$lib/utils';
	import Markdown from '$lib/components/Markdown.svelte';
	import Button from '$lib/components/ui/button/button.svelte';

	function getRatingColor(score: number) {
		if (score >= 80) return 'text-green-500';
		if (score >= 60) return 'text-yellow-500';
		if (score >= 40) return 'text-orange-500';
		return 'text-red-500';
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

	let ratings = [
		{
			query: 'Mark Zuckerberg interview',
			results: [
				{
					podcast: 'Dwarkesh Podcast',
					date: '2024-04-18',
					title: 'Mark Zuckerberg - Llama 3, Open Sourcing $10b Models, & Caesar Augustus',
					url: 'https://open.spotify.com/episode/6Lbsk4HtQZfkJ4dZjh7E7k?si=7J6Jm0xMSzGlLWmA2Ky4CA',
					ratings: {
						alignment: {
							score: 95,
							reasoning:
								"Direct insight into Zuckerberg's current thinking, leadership style, and personal interests"
						},
						expertise: {
							score: 70,
							reasoning:
								'Requires basic understanding of AI and tech industry, but explained at an accessible level'
						},
						quality: {
							score: 85,
							reasoning: 'In-depth interview with good production value and thoughtful questions'
						},
						timeliness: {
							score: 90,
							reasoning: 'Very recent interview covering current projects and thinking'
						}
					}
				},
				{
					podcast: 'Acquired',
					date: '2024-09-18',
					url: 'https://open.spotify.com/episode/5CwiK7ZAw20YqTbyv8rl9M?si=0MANhHQLRyOOFiQh3bjitQ',
					ratings: {
						alignment: {
							score: 85,
							reasoning:
								'Focuses on business strategy and leadership decisions, key aspects of emulating Zuckerberg'
						},
						expertise: {
							score: 65,
							reasoning: 'Business-focused content, assumes basic understanding of tech industry'
						},
						quality: {
							score: 90,
							reasoning: 'Well-researched business analysis with strong production quality'
						},
						timeliness: {
							score: 85,
							reasoning: "Recent analysis of Meta's current direction"
						}
					}
				}
			]
		},
		{
			query: 'Early history of Facebook',
			results: [
				{
					podcast: 'The Rest Is History',
					date: '2024-12-20',
					title: '8. The Echo of a Coffee House',
					url: 'https://open.spotify.com/episode/66Gim8uJASzxseT7r5f6jJ?si=V0Q-UM-9R-mpGeJ-LlcKoQ',
					ratings: {
						alignment: {
							score: 75,
							reasoning: 'Shows early decision-making and entrepreneurial mindset of Zuckerberg'
						},
						expertise: {
							score: 40,
							reasoning: 'Accessible to general audience, focuses on historical narrative'
						},
						quality: {
							score: 80,
							reasoning: 'Well-researched historical perspective with good storytelling'
						},
						timeliness: {
							score: 70,
							reasoning: 'Historical content remains relevant for understanding the foundation'
						}
					}
				}
			]
		},
		{
			query: 'Birth of social media',
			results: [
				{
					podcast: 'Palace intrigue',
					date: '2024-09-16',
					title: 'William and Kate wished Harry a Happy Birthday (on social media at least)',
					url: 'https://open.spotify.com/episode/5ro3yyGgb1y8FIN5YZndj0?si=x6JkgY9USzaJnkrv_fvhTg',
					ratings: {
						alignment: {
							score: 20,
							reasoning:
								"Only tangentially related to social media's impact, not focused on Zuckerberg"
						},
						expertise: {
							score: 30,
							reasoning: 'Pop culture content, no technical knowledge required'
						},
						quality: {
							score: 60,
							reasoning: 'Entertainment-focused content with moderate production value'
						},
						timeliness: {
							score: 40,
							reasoning: 'Current but not particularly relevant to the goal'
						}
					}
				}
			]
		},
		{
			query: 'Introduction to psychology',
			results: [
				{
					podcast: 'Introduction to Psychology',
					date: '2021-01-23',
					title: 'The Psychodynamic Perspective',
					url: 'https://open.spotify.com/episode/2ldd6WlcVmOrlwS9wWWYbY?si=aiyu21q5Sum3qXne5MTCfw',
					ratings: {
						alignment: {
							score: 55,
							reasoning:
								"Relates to Zuckerberg's academic background, but not directly about his approach"
						},
						expertise: {
							score: 50,
							reasoning: 'Introductory academic content, accessible to general audience'
						},
						quality: {
							score: 75,
							reasoning: 'Academic content with structured presentation'
						},
						timeliness: {
							score: 85,
							reasoning: 'Foundational knowledge that remains relevant'
						}
					}
				}
			]
		},
		{
			query: 'Caesar Augustus',
			results: [
				{
					podcast: 'The History of Rome',
					date: '2010-02-28',
					title: '052- Caesar Augustus',
					url: 'https://open.spotify.com/episode/0C1ZvZeyF1wntYzx64Bote?si=lNgTGmDTRGSp1rrJYjKe8A',
					ratings: {
						alignment: {
							score: 65,
							reasoning: "Connects to Zuckerberg's interest in classics and leadership philosophy"
						},
						expertise: {
							score: 45,
							reasoning: 'Historical content accessible to general audience'
						},
						quality: {
							score: 85,
							reasoning: 'Well-researched historical content with strong narrative'
						},
						timeliness: {
							score: 90,
							reasoning: 'Historical content remains perpetually relevant'
						}
					}
				}
			]
		},
		{
			query: 'Barbecuing techniques',
			results: [
				{
					podcast: 'The Go To Food Podcast',
					date: '2024-10-14',
					url: 'https://open.spotify.com/episode/7ImEXhvuKEMEwDYtTikjpf?si=9s00ydCKSOSMFciPKR7MUA',
					title:
						'54: Melissa Thompson & Pete Hewitt - BBQing Secrets - How To Run A Supper Club & Why 20% VAT Is Killing The Industry!',
					ratings: {
						alignment: {
							score: 35,
							reasoning: "Relates to Zuckerberg's hobby but not core to emulating his success"
						},
						expertise: {
							score: 40,
							reasoning: 'Cooking content accessible to general audience'
						},
						quality: {
							score: 70,
							reasoning: 'Professional food content with good production value'
						},
						timeliness: {
							score: 75,
							reasoning: 'Recent content but hobby-focused rather than career-focused'
						}
					}
				}
			]
		}
	];
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

	{#each ratings as searchGroup}
		<div class="mb-8">
			<h3 class="mb-4 mt-8 scroll-m-20 text-2xl font-semibold tracking-tight">
				{searchGroup.query}
			</h3>

			{#each searchGroup.results as result}
				<Card.Root class="mb-4">
					<Card.Header>
						<Card.Title>{result.title || 'Untitled Episode'}</Card.Title>
						<Card.Description>
							{result.podcast} • {result.date}
						</Card.Description>
					</Card.Header>

					<Card.Content>
						<div class="grid gap-4">
							{#each Object.entries(result.ratings) as [key, rating]}
								<div class="space-y-1">
									<div class="flex justify-between text-sm">
										<span class="font-medium capitalize">{key}</span>
										<span class={cn('font-bold', getRatingColor(rating.score))}
											>{rating.score}%</span
										>
									</div>
									<div class="h-2 w-full rounded-full bg-muted">
										<div
											class={cn('h-full rounded-full', getRatingColor(rating.score))}
											style="width: {rating.score}%"
										/>
									</div>
									<p class="text-sm text-muted-foreground">{rating.reasoning}</p>
								</div>
							{/each}
						</div>
					</Card.Content>

					<Card.Footer>
						<a
							href={result.url}
							target="_blank"
							rel="noopener noreferrer"
							class="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
						>
							Listen on Spotify
						</a>
					</Card.Footer>
				</Card.Root>
			{/each}
		</div>
	{/each}

	<div class="prose prose-stone dark:prose-invert mb-12 mt-8 max-w-3xl">
		<p class="leading-7">
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
		</p>
	</div>
</div>
<div class="container mx-auto flex justify-center px-4 py-8">
	<a href={chosenResultPath}><Button>Let's go</Button></a>
</div>
