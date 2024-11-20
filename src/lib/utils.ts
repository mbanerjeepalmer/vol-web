import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { cubicOut } from "svelte/easing";
import type { TransitionConfig } from "svelte/transition";

const MAX_STORED_SEARCHES = 10;

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

type FlyAndScaleParams = {
	y?: number;
	x?: number;
	start?: number;
	duration?: number;
};

export const flyAndScale = (
	node: Element,
	params: FlyAndScaleParams = { y: -8, x: 0, start: 0.95, duration: 150 }
): TransitionConfig => {
	const style = getComputedStyle(node);
	const transform = style.transform === "none" ? "" : style.transform;

	const scaleConversion = (
		valueA: number,
		scaleA: [number, number],
		scaleB: [number, number]
	) => {
		const [minA, maxA] = scaleA;
		const [minB, maxB] = scaleB;

		const percentage = (valueA - minA) / (maxA - minA);
		const valueB = percentage * (maxB - minB) + minB;

		return valueB;
	};

	const styleToString = (
		style: Record<string, number | string | undefined>
	): string => {
		return Object.keys(style).reduce((str, key) => {
			if (style[key] === undefined) return str;
			return str + `${key}:${style[key]};`;
		}, "");
	};

	return {
		duration: params.duration ?? 200,
		delay: 0,
		css: (t) => {
			const y = scaleConversion(t, [0, 1], [params.y ?? 5, 0]);
			const x = scaleConversion(t, [0, 1], [params.x ?? 0, 0]);
			const scale = scaleConversion(t, [0, 1], [params.start ?? 0.95, 1]);

			return styleToString({
				transform: `${transform} translate3d(${x}px, ${y}px, 0) scale(${scale})`,
				opacity: t
			});
		},
		easing: cubicOut
	};
};

export interface Interaction {
	spotifyId?: string;
	reaction: string;
	timestamp: number;
	episodeTitle?: string;
	episodeDescription?: string;
	searchId?: string;
}

export function getInteractionHistory(): Interaction[] {
	try {
		return JSON.parse(localStorage.getItem('vol-interactions') || '[]');
	} catch (error) {
		console.error('Failed to load interaction history:', error);
		return [];
	}
}

export function saveInteraction(params: Partial<Interaction>) {
	try {
		const interactions = getInteractionHistory();
		const newInteraction: Interaction = {
			spotifyId: params.spotifyId || '',
			reaction: params.reaction!,
			timestamp: Date.now(),
			episodeTitle: params.episodeTitle,
			episodeDescription: params.episodeDescription,
		};

		const filteredInteractions = interactions.filter(i =>
			i.spotifyId !== newInteraction.spotifyId
		);

		filteredInteractions.unshift(newInteraction);

		const trimmedInteractions = filteredInteractions.slice(0, 50);

		localStorage.setItem('vol-interactions', JSON.stringify(trimmedInteractions));
	} catch (error) {
		console.error('Failed to save interaction:', error);
	}
}


export function getStoredSearch(searchId: string) {
	try {
		const stored = localStorage.getItem(`vol-search-${searchId}`);
		return stored ? JSON.parse(stored) : null;
	} catch (error) {
		console.error('Failed to load stored search:', error);
		return null;
	}
}

export function cleanupStorage() {
	try {
		// Clean up old searches
		const searchKeys = Object.keys(localStorage)
			.filter(key => key.startsWith('vol-search-'))
			.sort((a, b) => {
				const timeA = JSON.parse(localStorage.getItem(a) || '{}').timestamp || 0;
				const timeB = JSON.parse(localStorage.getItem(b) || '{}').timestamp || 0;
				return timeA - timeB;
			});

		while (searchKeys.length >= MAX_STORED_SEARCHES) {
			localStorage.removeItem(searchKeys.shift()!);
		}

		// Clean up interactions
		const interactions = getInteractionHistory();
		if (interactions.length > 50) {
			localStorage.setItem('vol-interactions',
				JSON.stringify(interactions.slice(0, 50))
			);
		}
	} catch (error) {
		console.error('Storage cleanup failed:', error);
	}
}