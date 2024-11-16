import { SpotifyApi } from '@spotify/web-api-ts-sdk';
import { VITE_SPOTIFY_CLIENT_ID, VITE_SPOTIFY_CLIENT_SECRET } from '$env/static/private';

const sdk = SpotifyApi.withClientCredentials(VITE_SPOTIFY_CLIENT_ID, VITE_SPOTIFY_CLIENT_SECRET);

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
