import { SpotifyApi } from '@spotify/web-api-ts-sdk';
import { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET } from '$env/static/private';

const sdk = SpotifyApi.withClientCredentials(SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET);

export async function load({ url }) {
    const prompt = url.searchParams.get('prompt');
    if (!prompt) {
        throw new Error('No prompt provided');
    }

    // Initial state
    return {
        prompt,
        isThinking: true,
        queries: [],
        searchResults: [] // Empty initially
    };
}
