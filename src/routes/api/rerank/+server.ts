import Groq from 'groq-sdk';
import { GROQ_API_KEY } from '$env/static/private';
import type { Interaction } from '$lib/utils';
const client = new Groq({
    apiKey: GROQ_API_KEY,
});

export async function POST({ request }) {
    const { searchResults, interactions } = await request.json();

    const systemPrompt = `Your job is to inspire curiosity and ambition by recommending stimulating podcasts.
The user is looking for another recommendation. Pay attention to their most recent interaction.

Your short reason should be something that explains the delta between the last episode and the new one you recommend. Be creative. Some examples: "This might be more fun", "Something a bit deeper", "Less Roman", "Deeper on swimming", "MORE COWBELL", "Let's delve".


You must now respond ONLY WITH JSON in the following format:
{"spotifyId": "the-spotify-id-of-the-episode-to-recommend", "reason": "a-short-explanation-for-your-choice"}
which podcast to recommend next to the user.`

    console.log("System prompt:", systemPrompt);

    const userPrompt = `Recommend me a new episode, thinking about what will stimulate my curiosity.
My previous interactions: 
${JSON.stringify(interactions)}

The episodes available to choose from:
${JSON.stringify(searchResults)}
`
    console.log("User prompt:", userPrompt);
    const chatCompletion = await client.chat.completions.create({
        messages: [{
            role: 'system', content: systemPrompt
        }, {
            role: 'user', content: userPrompt
        }],
        model: 'llama-3.3-70b-versatile',
        "response_format": {
            "type": "json_object"
        },
    });
    const llmResponse = chatCompletion.choices[0].message.content;
    console.log("LLM response:", llmResponse);

    return new Response(llmResponse);
}