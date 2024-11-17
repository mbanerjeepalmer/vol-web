import Groq from 'groq-sdk';
import { GROQ_API_KEY } from '$env/static/private';
import type { Interaction } from '$lib/utils';
const client = new Groq({
    apiKey: GROQ_API_KEY,
});



function formatInteractionContext(interactions: Interaction[]): string {
    if (!interactions.length) return '';

    // Deduplicate search queries while keeping the most recent occurrence
    const seenSearchQueries = new Set<string>();
    const uniqueInteractions = interactions
        .sort((a, b) => b.timestamp - a.timestamp)
        .filter(i => {
            if (!i.spotifyId) {
                // For search queries, only keep the first occurrence
                if (seenSearchQueries.has(i.reaction)) return false;
                seenSearchQueries.add(i.reaction);
            }
            return true;
        })
        .slice(0, 5); // Only use 5 most recent for context

    return `
## Recent User Preferences
${uniqueInteractions.map(i => {
        if (i.spotifyId) {
            // This is a podcast episode interaction
            const description = i.episodeDescription ? `: ${i.episodeDescription}` : '';
            return `- Reaction "${i.reaction}" to "${i.episodeTitle}"${description}`;
        } else {
            // This is a search query
            return `- Search: "${i.reaction}"`;
        }
    }).join('\n')}

Consider these preferences when generating queries.`;
}

async function generateSearchQueriesFromPrompt(prompt: string, interactions: Interaction[]) {
    const interactionContext = formatInteractionContext(interactions);
    console.log(interactionContext);

    const chatCompletion = await client.chat.completions.create({
        "messages": [
            {
                "role": "system",
                "content": `Your job is to enhance people's lives by finding the podcasts that will drive their ambition and curiosity. Come up with five search queries. These will be used to search for podcasts that will help the user explore their topic of interest.
- First think about topic of interest. List four avenues to pursue.
- Second, situate these topics in the context of the user's level of expertise and preferences.
- Finally, return the queries. Each query should be between <query> and </query>. Place these between <searchQueries> and </searchQueries>. Wrap this in a <pre> tag.

Example:
------
User: I want to be like Mark Zuckerberg
Assistant:
## Topic strands
Mark Zuckerberg is the founder of Meta.
- Thinking directly, we know he is a computer programmer and startup founder.
- Thinking laterally, we can also consider his passion for classical civilisation which contributed to his strategic thinking and leadership skills.
- Also thinking laterally we should consider that he studied psychology. This interest contributed to his social network design.
- Thinking outside the box, we should note his interest in barbecuing.

## Contextualisation
We don't have any context about this user's level of expertise. Their query is surface-level and doesn't evidence any depth of knowledge. Therefore we can assume that their expertise on all of these topics is basic.

<pre>
<searchQueries>
<query>Mark Zuckerberg interview</query>
<query>Facebook founding story and history</query>
<query>Introduction to psychology</query>
<query>Leaders of ancient Rome</query>
<query>Barbecuing techniques</query>
</searchQueries>
</pre>
------`
            },
            {
                "role": "user",
                "content": `${interactionContext}
User's immediate request:
${prompt}`
            }
        ],
        "model": "llama-3.2-90b-text-preview",
        "temperature": 1,
        "max_tokens": 1024,
        "top_p": 1,
        "stream": true,
        "stop": null
    });
    return chatCompletion;
}

export async function GET({ url }) {
    const prompt = url.searchParams.get('prompt');
    if (!prompt) {
        return new Response('No prompt provided', { status: 400 });
    }

    // Parse interactions from URL params
    let interactions: EpisodeInteraction[] = [];
    try {
        const encodedInteractions = url.searchParams.get('interactions');
        if (encodedInteractions) {
            interactions = JSON.parse(decodeURIComponent(encodedInteractions));
        }
    } catch (error) {
        console.error('Failed to parse interactions:', error);
        // Continue without interactions if parsing fails
    }

    const stream = await generateSearchQueriesFromPrompt(prompt, interactions);

    // Transform the stream into proper SSE format
    const transformedStream = new ReadableStream({
        async start(controller) {
            for await (const chunk of stream) {
                const content = chunk.choices[0]?.delta?.content || '';
                if (content) {
                    const escapedContent = content.replace(/\n/g, '\\n');
                    controller.enqueue(`data: ${escapedContent}\n\n`);
                }
            }
            controller.close();
        }
    });

    return new Response(transformedStream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        }
    });
}
