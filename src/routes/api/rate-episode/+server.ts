import { json } from '@sveltejs/kit';
import Groq from 'groq-sdk';
import { GROQ_API_KEY } from '$env/static/private';

const client = new Groq({
    apiKey: GROQ_API_KEY,
});

async function generateEpisodeRatings(episode: any, prompt: string) {
    const chatCompletion = await client.chat.completions.create({
        messages: [
            {
                role: "system",
                content: `You are an expert podcast curator. Rate this podcast episode on how well it matches the user's learning goals.
                
Rate each category from 1-10:
- Goal Alignment (how well does it address the user's stated goal?)
- Context Match (how appropriate is it for someone with the user's implied knowledge level?)
- Quality (how well-produced and informative is the content?)
- Freshness (how timely and relevant is the content?)

Return only a JSON object with these four numeric ratings.
Example: {"goal": 8, "context": 7, "quality": 9, "freshness": 6}`
            },
            {
                role: "user",
                content: `User's goal: "${prompt}"

Episode title: "${episode.name}"
Description: "${episode.description}"`
            }
        ],
        model: "llama-3.2-3b-preview",
        temperature: 0.7,
        max_tokens: 150,
    });

    const response = chatCompletion.choices[0]?.message?.content || '';
    return JSON.parse(response);
}

export async function POST({ request }) {
    const { episode, prompt } = await request.json();
    const ratings = await generateEpisodeRatings(episode, prompt);
    return json({ ratings });
} 