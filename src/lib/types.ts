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

export interface EpisodeInteraction {
    spotifyId: string;
    reaction: string;
    timestamp: number;
    episodeTitle?: string;
    episodeDescription?: string;
}