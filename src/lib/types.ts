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


export interface JSONFeedItem {
    id: string;
    title: string;
    summary: string;
    url: string;
    image: string;
    content_html: string;
    date_published: string;
    attachments: Array<{
        url: string;
        mime_type: string;
        title: string;
        size_in_bytes: number;
        duration_in_seconds?: number;
    }>;
    _sources?: Array<{
        feed_url: string; feed_title: string
    }>;
    _categories?: Array<{
        feed_url: string;
        feed_title: string;
    }>
    authors: Array<{
        name: string;
        url?: string;
    }>;
    sourceQuery?: string;
}