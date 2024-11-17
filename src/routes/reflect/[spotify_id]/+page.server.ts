import { SpotifyApi } from '@spotify/web-api-ts-sdk';
import { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET } from '$env/static/private';

const sdk = SpotifyApi.withClientCredentials(SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET);

export async function load({ params, url }) {
    const spotifyId = params.spotify_id;
    const reason = url.searchParams.get('reason') || '';

    const episode = await sdk.episodes.get(spotifyId, 'GB');

    return {
        episodeTitle: episode.name,
        episodeDescription: episode.description,
        reason
    };
}