import { json } from '@sveltejs/kit';
import { ZACUSCA_API_BASE, ZACUSCA_API_KEY } from '$env/static/private';



// REQUEST EXAMPLE:
// curl -X 'GET' \
//   'http://127.0.0.1:8000/search/spotify?query=query%20string%20here&limit=5&offset=0&format=json_feed' \
//   -H 'accept: application/json' \
//   -H 'Authorization: Bearer b3e0e0cf-1c5c-4a13-90ca-c6a457e04ea6'

// RESPONSE EXAMPLE (JSON Feed format):
// {
//   "version": "https://jsonfeed.org/version/1.1",
//   "title": "Spotify Search Results for: 'query string here'",
//   "description": "A generated JSON feed containing Spotify podcast episodes matching the query: 'query string here'",
//   "home_page_url": "https://open.spotify.com/search/query%20string%20here/episodes",
//   "language": "en",
//   "author": {
//     "name": "Spotify",
//     "url": "https://open.spotify.com/"
//   },
//   "items": [
//     {
//       "id": "b1e9c090-3f3f-56b8-b4f0-2be713b40e5b",
//       "title": "Will We Ever Prove String Theory?",
//       "url": "https://open.spotify.com/episode/76jjHAn2R2DQMcihq3zbJt",
//       "content_html": "<p>For decades, string theory has been hailed as the leading candidate for the theory of everything in our universe. Yet despite its mathematical elegance, the theory still lacks empirical evidence.</p><p>One of its most intriguing, yet vexing, implications is that if all matter and forces are composed of vibrations of tiny strands of energy, then this allows for a vast landscape of possible universes with different physical properties, varieties of particles and complex spacetimes. How, then, can we possibly pinpoint our own universe within a field of almost infinite possibilities?</p><p>Since 2005, <a href=\"https://www.physics.harvard.edu/people/facpages/vafa\" rel=\"nofollow\">Cumrun Vafa</a> at MIT has been working to weed out this crowded landscape by identifying which hypothetical universes lie in a ‘swampland’ with properties inconsistent with the world we observe. In this episode of The Joy of Why, Vafa talks to co-host Janna Levin about the current state of string theory, why there are no more than 11 dimensions, how his swampland concept got an unexpected lift from the <a href=\"https://www.quantamagazine.org/bicep2-telescope-detects-possible-gravitational-waves-20140317/\" rel=\"nofollow\">BICEP array</a>, and how close we may be to testable predictions.</p>",
//       "date_published": "2025-05-29T00:00:00+00:00",
//       "author": {
//         "name": "Unknown Show",
//         "url": ""
//       },
//       "_spotify": {
//         "episode_id": "76jjHAn2R2DQMcihq3zbJt",
//         "show_id": null,
//         "duration_ms": 2956596,
//         "explicit": false,
//         "popularity": null,
//         "type": "episode"
//       },
//       "image": "https://i.scdn.co/image/ab6765630000ba8af397ed1b146eb6465e3bafff"
//     },
//     {
//       "id": "7b2cdd2c-0229-57d7-82ea-5ba852a87b7a",
//       "title": "Brian Greene and Leonard Susskind Quantum Mechanics, Black Holes and String Theory | World Science Festival",
//       "url": "https://open.spotify.com/episode/7cWOx9VEk1MATFTMqVEEuV",
//       "content_html": "<p>Brian Greene and Leonard Susskind Quantum Mechanics, Black Holes and String Theory | World Science Festival</p><br/><p>-------</p><br/><p>World Science Festival&#39;s Spotify Podcast is on nearly every science-related topic including physics, biology, the brain, robotics, medicine, space, engineering, and the Earth. We gather great minds in science and the arts to produce live and digital content that allows a broad general audience to engage with scientific discoveries. Through discussions, debates, original films, lectures, and intimate salons, the World Science Festival takes science out of the laboratory and out into world. <br/>Donate me so I can create more good content, thanks :<br/>https://www.buymeacoffee.com/worldscience<br/>Find me on:<br/>The World Science Festival<br/>worldsciencefestival.com<br/>Facebook<br/>facebook.com/worldsciencefestival<br/>X<br/>twitter.com/worldscifest<br/>Youtube<br/>https://www.youtube.com/&#64;WorldScienceFestival</p>",
//       "date_published": "2024-02-21T00:00:00+00:00",
//       "author": {
//         "name": "Unknown Show",
//         "url": ""
//       },
//       "_spotify": {
//         "episode_id": "7cWOx9VEk1MATFTMqVEEuV",
//         "show_id": null,
//         "duration_ms": 7694117,
//         "explicit": false,
//         "popularity": null,
//         "type": "episode"
//       },
//       "image": "https://i.scdn.co/image/ab6765630000ba8adc004c904c64a16315edea37"
//     },
//     {
//       "id": "3a2d4130-6473-5643-aa93-14f5d511a947",
//       "title": "55 - String Theory Part 2: The First Superstring Revolution",
//       "url": "https://open.spotify.com/episode/6XvW6clUAqD0CLmHiU3Q7I",
//       "content_html": "<p>We pick up the story of string theory and explore the explosion of interest it experienced in the mid 1980s.<br /><br />For ad-free episodes and other exclusives, join us for $3 a month on Patreon: https://patreon.com/whythisuniverse</p><a href=\"https://patreon.com/whythisuniverse\" rel=\"nofollow\">Support the show</a>",
//       "date_published": "2022-10-24T00:00:00+00:00",
//       "author": {
//         "name": "Unknown Show",
//         "url": ""
//       },
//       "_spotify": {
//         "episode_id": "6XvW6clUAqD0CLmHiU3Q7I",
//         "show_id": null,
//         "duration_ms": 1689338,
//         "explicit": false,
//         "popularity": null,
//         "type": "episode"
//       },
//       "image": "https://i.scdn.co/image/ab6765630000ba8aa2a415f7d193be4523386403"
//     },
//     {
//       "id": "bd5d454b-9cb9-5e98-a190-8a2aec5133e4",
//       "title": "245 - Leonard Susskind: String Theory and the Black Hole War",
//       "url": "https://open.spotify.com/episode/1MEBdCHn6NfKkaCttr6TeO",
//       "content_html": "<p>Leonard Susskind is Felix Block Professor of Physics at Stanford University. Along with other accomplishments, he is among the fathers of such revolutionary concepts in physics as string theory, black hole complementarity, the holographic principle, and the string-theoretic landscape. He was also the guest on episode #217, where he and Robinson discussed the fine-tuning problem and the physics of the multiverse. In this episode, Leonard and Robinson get into another topic—black holes and the information paradox. More particularly, they talk about important figures like Stephen Hawking and Gerard ’t Hooft, singularities, chaos, whether the cosmos is a hologram, the end of the universe, and more. For further details, check out Leonard’s book on the title: The Black Hole War (Back Bay Books, 2009).</p><p><br /></p><p>The Black Hole War: https://a.co/d/3eTOHoZ</p><p><br /></p><p>The Theoretical Minimum: https://theoreticalminimum.com</p><p><br /></p><p>OUTLINE</p><p>00:00 Introduction</p><p>05:21 Black Holes and the War Between Relativity and Quantum Mechanics</p><p>11:18 Is The Singularity at the Heart of a Black Hole Real?</p><p>21:51 Demystifying the Puzzle of Quantum Information</p><p>28:27 What Does The Famous Phrase “It From Bit” Mean?</p><p>38:47 Can Information Be Stored on the Surface of a Black Hole?</p><p>47:11 Was Stephen Hawking a Good Physicist?</p><p>56:21 How Will The Universe End?</p><p>1:00:49 What Is the Black Hole Information Paradox?</p><p>1:10:47 What Is the Holographic Principle?</p><p>1:20:01 How Leonard Susskind Won the Black Hole War Against Stephen Hawking</p><p>1:25:09 What Is the Infamous AdS/CFT Correspondence?</p><p>1:32:29 Is Physics in a Deep Crisis?</p><p>1:39:29 Are String and M-Theory Totally Wrong?</p><p>1:43:05 Is String Theory the Theory of Everything?</p><p>1:47:43 Is String Theory a Failure?</p><p>1:50:15 Does Our World Have Extra Dimensions?</p><p>1:53:34 Could Our World Be a Hologram?</p><p><br /></p><p>Robinson’s Website: http://robinsonerhardt.com</p><p><br /></p><p>Robinson Erhardt researches symbolic logic and the foundations of mathematics at Stanford University.</p>",
//       "date_published": "2025-03-09T00:00:00+00:00",
//       "author": {
//         "name": "Unknown Show",
//         "url": ""
//       },
//       "_spotify": {
//         "episode_id": "1MEBdCHn6NfKkaCttr6TeO",
//         "show_id": null,
//         "duration_ms": 7210282,
//         "explicit": false,
//         "popularity": null,
//         "type": "episode"
//       },
//       "image": "https://i.scdn.co/image/ab6765630000ba8a0861dc500c696906ab933553"
//     },

export async function GET({ url }) {
    const queries = url.searchParams.get('queries')?.split(',') ?? [];
    console.debug('Received queries:', queries);

    if (queries.length === 0) {
        return json({ searchResults: [] });
    }
    const requestUrl = new URL(ZACUSCA_API_BASE + '/search/spotify');
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