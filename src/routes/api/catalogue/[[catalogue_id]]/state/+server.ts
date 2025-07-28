import { error, json } from "@sveltejs/kit";
import createClient from "openapi-fetch";
import type { paths } from "$lib/zacusca_api_types";
import { ZACUSCA_API_KEY } from "$env/static/private";
import { PUBLIC_ZACUSCA_API_BASE } from "$env/static/public"

const client = createClient<paths>({
    baseUrl: PUBLIC_ZACUSCA_API_BASE,
    headers: {
        'Authorization': `Bearer ${ZACUSCA_API_KEY}`
    }
})

export async function GET({ params }) {
    if (!params.catalogue_id) {
        throw error(404, "No catalogue ID provided.")
    }

    const { data: catalogueData, error: catalogueError } = await client.GET("/catalogue/{catalogue_id}",
        { params: { path: { catalogue_id: params.catalogue_id } } }
    )
    if (catalogueError) {
        console.error("Error fetching state from catalogue", catalogueError)
        return json({ "state": undefined })
    }
    return json({ "state": catalogueData?.state })
}