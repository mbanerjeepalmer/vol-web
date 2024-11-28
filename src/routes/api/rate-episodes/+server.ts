import { json } from '@sveltejs/kit';
import Groq from 'groq-sdk';
import { GROQ_API_KEY } from '$env/static/private';
import type { Episode } from '@spotify/web-api-ts-sdk';

const client = new Groq({
    apiKey: GROQ_API_KEY,
});

async function retryRequest<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error: any) {
            console.debug(`On attempt ${attempt} of ${maxAttempts} got ${error.status}`, error);
            if (attempt === maxAttempts || !(error.status === 503 || error.status === 429)) {
                console.error('Error in retryRequest');
                throw error;
            }

            let delay = 15000;
            if (error.headers?.['retry-after']) {
                delay = parseInt(error.headers['retry-after']) * 1000;
            }
            console.debug(`Waiting ${delay}ms before retrying`);
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
        model: "llama-3.2-90b-vision-preview",
        response_format: {
            type: "json_object"
        },
        temperature: 0.7,
        max_tokens: 150,
    });

    const response = chatCompletion.choices[0]?.message?.content || '';
    return JSON.parse(response);
}

async function llamaTextRate(episodes: Episode[], prompt: string) {
    console.debug('ABOUT TO RATE FOR PROMPT', prompt);
    return retryRequest(async () => {
        const formattedEpisodes = episodes.map((episode) => {
            return {
                id: episode.id,
                title: episode.name,
                description: episode.description?.substring(0, 200),
                publishDate: episode.release_date
            }
        })
        // console.debug('Formatted episodes', formattedEpisodes);
        const completion = await client.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `You are an expert podcast curator. Rate these podcast episodes on how well they match the user's learning goals.

Rate each category from 1-100:
- Goal: A high score means this aligns well with our understanding of what the user wants.
- Context: A high score means this matches the user's level of expertise (e.g. beginner vs expert) and perspective (e.g. practical versus theoretical).
- Quality: A high score means this has good production value, original research, and/or reputation.
- Freshness: a high score means it's evergreen or recent.

Return ONLY the JSON object. YOU MUST NOT RETURN ANY PREAMBLE. YOU MUST ONLY RETURN VALID JSON. The object MUST have only one key, 'ratings', whose value is the array of episode ratings.
Example:
{"ratings": [{"id": "12345", ratings: {"goal": 85, "context": 70, "quality": 90, "freshness": 65}}, {"id": "54321", ratings: {"goal": 25, "context": 40, "quality": 40, "freshness": 45}}]}`
                },
                {
                    role: "user",
                    content: JSON.stringify({
                        userGoal: prompt,
                        episodes: formattedEpisodes
                    })
                }],
            model: "llama3-8b-8192",
            temperature: 1.0,
            max_tokens: 2048,
        });
        console.debug('LLM RATING RESPONSE', completion.choices[0]?.message?.content);
        return parseRatingResponse(completion.choices[0]?.message?.content || '');
    });
}

function extractJson(text: string): any {
    // Try to match anything between curly braces, including newlines
    const pattern = /({[\s\S]*})/;
    const match = text.match(pattern);

    if (match) {
        try {
            return JSON.parse(match[1]);
        } catch (error) {
            console.error('Failed to parse extracted JSON', error);
            // Could add additional JSON cleaning/fixing here if needed
            return null;
        }
    }

    console.warn('No JSON found in text:', text);
    return null;
}

function parseRatingResponse(response: string) {
    try {
        return JSON.parse(response);
    } catch (error) {
        console.error('Error parsing rating response directly, attempting extraction', error);
        return extractJson(response);
    }
}

export async function POST({ request }: { request: Request }) {
    const { episodes, prompt } = await request.json();
    const ratings = await llamaTextRate(episodes, prompt);
    return json({ ratings });
} 
