import { json } from '@sveltejs/kit';
import Groq from 'groq-sdk';
import { GROQ_API_KEY } from '$env/static/private';

const client = new Groq({
    apiKey: GROQ_API_KEY,
});

async function retryRequest<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error: any) {
            if (attempt === maxAttempts || error.status !== 503) throw error;

            const delay = parseInt(error.headers?.['retry-after'] || '15') * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    throw new Error('Max retries reached');
}

async function llama3290bVisionRate(episode: any, prompt: string) {
    const chatCompletion = await client.chat.completions.create({
        messages: [
            {
                role: "user",

                content: [{
                    "type": "text", "text": `You are an expert podcast curator. Rate this podcast episode on how well it matches the user's learning goals.
                
Rate each category from 1-100:
- Goal: A high score means this aligns well with our understanding of what the user wants.
- Context: A high score means this matches the user's level of expertise (e.g. beginner vs expert) and perspective (e.g. practical versus theoretical).
- Quality: A high score means this has good production value, original research, and/or reputation.
- Freshness: a high score means it's evergreen or recent.

Return only a JSON object with these four numeric ratings.
Example: {"goal": 85, "context": 70, "quality": 90, "freshness": 65}`
                },
                {
                    type: "image_url",
                    image_url: {
                        url: episode.images[1]?.url
                    }
                },
                {
                    type: "text",
                    text: JSON.stringify({
                        userGoal: prompt,
                        episode: {
                            title: episode.name,
                            description: episode.description,
                            publishDate: episode.release_date
                        }
                    })
                },
                ]
            }],
        model: "llama3-70b-8192",
        response_format: {
            type: "json_object"
        },
        temperature: 0.7,
        max_tokens: 150,
    });

    const response = chatCompletion.choices[0]?.message?.content || '';
    return JSON.parse(response);
}

async function llama323BRate(episode: any, prompt: string) {
    return retryRequest(async () => {
        const completion = await client.chat.completions.create({
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
            model: "llama3-70b-8192",
            temperature: 1.0,
            max_tokens: 150,
        });
        return JSON.parse(completion.choices[0]?.message?.content || '');
    });
}

export async function POST({ request }) {
    const { episode, prompt } = await request.json();
    const ratings = await llama323BRate(episode, prompt);
    return json({ ratings });
} 
