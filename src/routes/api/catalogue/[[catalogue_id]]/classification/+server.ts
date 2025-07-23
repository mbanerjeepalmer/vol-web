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
// {
//   "items_body": {
//     "item_ids": [
//       "3fa85f64-5717-4562-b3fc-2c963f66afa6"
//     ]
//   },
//   "classified_groups": {
//     "additionalProp1": [
//       {
//         "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6"
//       }
//     ],
//     "additionalProp2": [
//       {
//         "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6"
//       }
//     ],
//     "additionalProp3": [
//       {
//         "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6"
//       }
//     ]
//   }
// }
export async function POST({ request, params }) {
    if (!params.catalogue_id) {
        error(400, "No catalogue ID provided.")
    }
    const requestBody = request.json()
    const { data: classificationResult, error: classificationError } = await client.POST("/catalogue/{catalogue_id}/classification",
        {
            params: {
                path: { "catalogue_id": params.catalogue_id }
            },
            body: requestBody
        }
    )
    if (classificationError) {
        error(500, "Unexpected error classifying items")
    }
    return json(classificationResult)
}