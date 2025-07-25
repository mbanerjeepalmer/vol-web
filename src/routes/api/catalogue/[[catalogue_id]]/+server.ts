import { error, json } from "@sveltejs/kit"
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
    const { data: megaCatalogueData, error: megaCatalogueError } = await client.GET("/catalogue-mega/{catalogue_id}",
        {
            params: {
                path: { catalogue_id: params.catalogue_id }
            }
        }
    )
    if (megaCatalogueError) {
        if (megaCatalogueError)
            console.error(`Error fetching Catalogue`, JSON.stringify(megaCatalogueError))
        throw error(500, "The server broke when trying to get this catalogue")
    }

    return json(megaCatalogueData)
}

export async function POST({ request }) {

    const requestJSON = await request.json()
    console.debug(JSON.stringify(requestJSON))
    const { prompt, queries, criteria }: {
        prompt: string, queries: string[],
        criteria: string
    } = requestJSON
    const input_feeds = queries.map(query => ({
        "href": `${PUBLIC_ZACUSCA_API_BASE}/search/spotify-itunes?query=${encodeURI(query)}&format=rss`,
        "link": `${PUBLIC_ZACUSCA_API_BASE}/search/spotify-itunes?query=${encodeURI(query)}&format=rss`,
        "feed_type": "input",
        "title": query,
        "description": `vol podcast search for '${query}', prompted by '${prompt}'`,
        "polling_available": "manual"
    }))
    const { data: catalogueData, error: catalogueError } = await client.POST("/catalogue-mega-async",
        {
            params: { query: { after: "2000-01-01T00:00:00+00:00" } },
            body: {
                catalogue: {
                    name: prompt
                },
                input_feeds,
                output_feeds: [{
                    title: prompt,
                    description: criteria
                }]
            }
        }
    )
    if (catalogueError) {
        console.error(`Error creating Catalogue`, JSON.stringify(catalogueError))
        throw error(500, "The server broke when trying to create this search.")
    }
    console.debug(`catalogueData`, catalogueData)
    console.info(`Triggered mega catalogue creation`)
    return json(catalogueData)
}