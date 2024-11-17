import { SpotifyApi } from '@spotify/web-api-ts-sdk';
import { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET } from '$env/static/private';
import { redirect } from '@sveltejs/kit';

const sdk = SpotifyApi.withClientCredentials(SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET);

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
