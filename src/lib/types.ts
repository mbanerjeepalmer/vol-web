import type { Episode as SpotifyEpisode } from '@spotify/web-api-ts-sdk';

// Add interface for ratings
export interface EpisodeRatings {
    goal: number;
    context: number;
    quality: number;
    freshness: number;
}

export interface Episode extends SpotifyEpisode {
    ratings?: EpisodeRatings;
}
