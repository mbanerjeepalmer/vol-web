// File: src/routes/api/catalogue/[catalogue_id]/classification/+server.js
import { error, json } from "@sveltejs/kit"
import createClient from "openapi-fetch";
import type { paths } from "$lib/zacusca_api_types";
import { ZACUSCA_API_KEY } from "$env/static/private";
import { PUBLIC_ZACUSCA_API_BASE } from "$env/static/public"

// Initialize the API client with the secret key on the server
const client = createClient<paths>({
    baseUrl: PUBLIC_ZACUSCA_API_BASE,
    headers: {
        'Authorization': `Bearer ${ZACUSCA_API_KEY}`
    }
})

export async function POST({ request, params }) {
    if (!params.catalogue_id) {
        error(400, "No catalogue ID provided.")
    }

    try {
        const body = await request.json();
        console.debug(`About to call Zacusca API for catalogue ${params.catalogue_id}`)


        const classificationResp = await client.POST(
            '/catalogue/{catalogue_id}/classification',
            {
                params: {
                    path: { catalogue_id: params.catalogue_id }
                },
                body: body
            }
        );
        const { data: classificationResult, error: classificationError } = classificationResp

        if (classificationError) {
            console.error(`Zacusca API error:`, classificationError);
            error(classificationResp.response.status || 500, 'API failure when attempting to classify');
        }

        console.debug(`Successfully classified items for catalogue ${params.catalogue_id}`)

        return json(classificationResult);

    } catch (e) {
        console.error('Unexpected error in classification endpoint:', e);
        error(500, 'An unexpected error occurred.');
    }
}