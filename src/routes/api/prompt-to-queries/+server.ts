import Groq from 'groq-sdk';
import { GROQ_API_KEY } from '$env/static/private';
const client = new Groq({
    apiKey: GROQ_API_KEY,
});


async function generateSearchQueriesFromPrompt(prompt: string) {

    const chatCompletion = await client.chat.completions.create({
        "messages": [
            {
                "role": "system",
                "content": `Your job is to enhance people's lives by finding the podcasts that will drive their ambition and curiosity.
- First think about topics of interest. List four avenues to pursue. The first should be obvious, but after that you need to start thinking laterally, more deeply, with more specificity. Think about the abstract concepts and historical examples.
- Second, think deeper about the web of knowledge that would take the user from where they currently are, to where they want to be. Note their apparent expertise and, if any, past interactions. Think of which is foundational, what is adjacent and what is deeper. Think of people, places, events, concepts and tensions.
- Finally, return the keyword search queries. Each query should be between <query> and </query>. Place these between <searchQueries> and </searchQueries>. Wrap this in a <pre> tag.

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
<query>Facebook founding</query>
<query>Psychology introduction</query>
<query>Caesar Augustus</query>
<query>how Texas brisket</query>
</searchQueries>
</pre>
------`
            },
            {
                "role": "user",
                "content": `User's query:
${prompt}`
            }
        ],
        "model": "llama3-70b-8192",
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

    const stream = await generateSearchQueriesFromPrompt(prompt);

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
