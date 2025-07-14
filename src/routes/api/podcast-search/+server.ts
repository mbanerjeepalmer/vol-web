import { json } from '@sveltejs/kit';
import { ZACUSCA_API_BASE, ZACUSCA_API_KEY } from '$env/static/private';



export async function GET({ url }) {
    const queries = url.searchParams.get('queries')?.split(',') ?? [];
    console.debug('Received queries:', queries);

    if (queries.length === 0) {
        return json({ searchResults: [] });
    }
    const requestUrl = new URL(ZACUSCA_API_BASE + '/search/itunes');
    requestUrl.searchParams.set('format', 'json_feed');

    let searchResults = [];
    for (const query of queries) {
        requestUrl.searchParams.set('query', query);
        const result = await fetch(requestUrl, {
            method: 'GET',
            headers: {
                "Authorization": `Bearer ${ZACUSCA_API_KEY}`,
                "Accept": "application/json"
            }
        })

        if (!result.ok) {
            console.error('Search request failed:', result.statusText, await result.text());
            continue;
        }
        const resultJSON = await result.json();
        if (resultJSON.items && resultJSON.items.length > 0) {
            // Set sourceQuery for each item to the current query
            resultJSON.items.forEach(item => {
                item.sourceQuery = query;
            });

            // Extend the search results with the items from this query
            searchResults.push(...resultJSON.items)
            console.log(`Found ${resultJSON.items.length} results for query: ${query}`);
        } else {
            console.warn(`No results found for query: ${query}`);
        }
    }
    if (searchResults.length === 0) {
        console.warn('No search results found for any queries');
        return new Response('No search results found', { status: 404 });
    } else {
        console.log(`Total search results found: ${searchResults.length}`);
        return json({ searchResults });
    }
}