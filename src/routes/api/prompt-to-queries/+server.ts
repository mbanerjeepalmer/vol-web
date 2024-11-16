import { generateSearchQueriesFromPrompt } from "$lib/llm";

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
                    console.log('Raw chunk:', JSON.stringify(escapedContent));
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
