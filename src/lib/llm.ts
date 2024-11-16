import Groq from 'groq-sdk';
import { VITE_GROQ_API_KEY } from '$env/static/private';

const client = new Groq({
    apiKey: VITE_GROQ_API_KEY, // This is the default and can be omitted
});

export async function generateSearchQueriesFromPrompt(prompt: string) {
    const chatCompletion = await client.chat.completions.create({

        "messages": [
            {
                "role": "system",
                "content": "Come up with five search queries. These will be used to search for podcasts that will help the user explore their topic of interest.\n- First think about topic of interest. List four avenues to pursue.\n- Second, contextualise \n\nExample\n------\nUser: I want to be like Mark Zuckerberg\nAssistant:\n## Topic strands\nMark Zuckerberg is the founder of Meta.\n- Thinking directly, we know he is a computer programmer and startup founder.\n- Thinking laterally, we can also consider his passion for classical civilisation which contributed to his strategic thinking and leadership skills.\n- Also thinking laterally we should consider that he studied psychology. This interest contributed to his social network design.\n- Thinking outside the box, we should note his interest in barbecuing.\n\n## Contextualisation\nWe don't have any context about this user's level of expertise. Their query is surface-level and doesn't evidence any depth of knowledge. Therefore we can assume that their expertise on all of these topics is basic.\n\n## Queries\n<searchQueries>\n<query>Mark Zuckerberg interview</query>\n<query>Facebook founding story and history</query>\n<query>Introduction to psychology</query>\n<query>Leaders of ancient Rome</query>\n<query>Barbecuing techniques</query>\n</searchQueries>\n------"
            },
            {
                "role": "user",
                "content": prompt
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