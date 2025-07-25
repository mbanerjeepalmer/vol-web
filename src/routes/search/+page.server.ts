import { redirect } from '@sveltejs/kit';


export async function load({ url }) {
    const prompt = url.searchParams.get('prompt');
    const catalogue_id = url.searchParams.get('catalogue_id');

    if (!prompt && !catalogue_id) {
        throw redirect(303, '/');
    }

    // Initial state only - client will check for existing data
    return {
        catalogue_id,
        prompt,
        isThinking: true,
        queries: [],
        searchResults: []
    };
}
