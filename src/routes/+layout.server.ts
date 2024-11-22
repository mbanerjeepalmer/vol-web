import { PostHog } from 'posthog-node';
const POSTHOG_PUBLIC_KEY = "phc_Eqr43zfrULZGw5AcrMYg2hUpgQr6xlu4CHQ2PBC5pfW"

export const load = async ({ url }) => {
    const posthog = new PostHog(
        POSTHOG_PUBLIC_KEY,
        { host: "https://eu.i.posthog.com" },
    );
    posthog.capture({
        event: "server_loaded",
        distinctId: "server",
        properties: {
            $current_url: url,
        },
    });
    await posthog.shutdown();
};
