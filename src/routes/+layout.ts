import posthog from 'posthog-js';
import { browser } from "$app/environment"
const POSTHOG_PUBLIC_KEY = "phc_Eqr43zfrULZGw5AcrMYg2hUpgQr6xlu4CHQ2PBC5pfW"
import { dev } from "$app/environment"

export const load = async () => {
    if (browser && !dev) {
        posthog.init(POSTHOG_PUBLIC_KEY,
            {
                api_host: 'https://eu.i.posthog.com',
                persistence: 'memory',
                person_profiles: "identified_only",
                capture_pageleave: false,
                capture_pageview: false,
            }
        )
    }
    return
};
