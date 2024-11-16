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
                
Rate each category from 1-100:
- Goal: A high score means this aligns well with our understanding of what the user wants.
- Context: A high score means this matches the user's level of expertise (e.g. beginner vs expert) and perspective (e.g. practical versus theoretical).
- Quality: A high score means this has good production value, original research, and/or reputation.
- Freshness: a high score means it's evergreen or recent.

Return only a JSON object with these four numeric ratings.
Example: {"goal": 85, "context": 70, "quality": 90, "freshness": 65}`
            },
            {
                role: "user",
                content: JSON.stringify({
                    userGoal: prompt,
                    episode: {
                        title: episode.name,
                        description: episode.description,
                        publishDate: episode.release_date
                    }
                })
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