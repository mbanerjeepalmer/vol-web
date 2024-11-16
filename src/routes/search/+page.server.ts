import { SpotifyApi } from '@spotify/web-api-ts-sdk';
import { VITE_SPOTIFY_CLIENT_ID, VITE_SPOTIFY_CLIENT_SECRET } from '$env/static/private';

const sdk = SpotifyApi.withClientCredentials(VITE_SPOTIFY_CLIENT_ID, VITE_SPOTIFY_CLIENT_SECRET);

export async function load({ url }) {
    const prompt = url.searchParams.get('prompt');
    const hardcodedQueries = [
        'Mark Zuckerberg interview',
        'Early history of Facebook',
        'Birth of social media'
    ];
    const searchResults = await Promise.all(
        hardcodedQueries.map(async query => ({
            query,
            results: await sdk.search(query, ['episode'], "GB", 50, 0)
        }))
    );

    return { searchResults };
}
