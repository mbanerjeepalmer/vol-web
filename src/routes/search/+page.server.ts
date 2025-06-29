import { redirect } from '@sveltejs/kit';


export async function load({ url }) {
    const prompt = url.searchParams.get('prompt');
    const searchId = url.searchParams.get('searchId');

    if (!prompt || !searchId) {
        throw redirect(303, '/');
    }

    // Initial state only - client will check for existing data
    return {
        searchId,
        prompt,
        isThinking: true,
        queries: [],
        searchResults: []
    };
}
