import { SpotifyApi } from '@spotify/web-api-ts-sdk';
import { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET } from '$env/static/private';
import { json } from '@sveltejs/kit';

const sdk = SpotifyApi.withClientCredentials(SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET);

export async function GET({ url }) {
    const queries = url.searchParams.get('queries')?.split(',') ?? [];

    if (queries.length === 0) {
        return json({ searchResults: [] });
    }

    const searchResults = await Promise.all(
        queries.map(async query => ({
            query,
            results: await sdk.search(query, ['episode'], "GB", 5, 0)
        }))
    );

    return json({ searchResults });
} 