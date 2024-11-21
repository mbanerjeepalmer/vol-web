import { PostHog } from 'posthog-node';

export const load = async ({ url }) => {
    const posthog = new PostHog(
        "phc_MkQ0SSZnuS5iaKyFEL7ihq2hnykzHM3wbSjgT6flKCR",
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
