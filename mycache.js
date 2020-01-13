import {getJwt} from './jwt'


// based on https://developers.cloudflare.com/workers/templates/pages/cache_api/
export async function getAndCache(cache_url_fragment, base_event, post_hash) {
    let base_request = base_event.request
    let encodedToken = getJwt(base_request)
    let api_url_raw = 'https://unpaywall-jump-api.herokuapp.com'
        + cache_url_fragment
        + '?jwt=' + encodedToken
    let api_url = api_url_raw
    if (post_hash != null) {
        let api_url = api_url + '&post_hash=' + post_hash
    }
    let apiUrl = new URL(api_url)

    let apiRequest = new Request(apiUrl, base_request)
    let cache = caches.default

    // Get this request from this zone's cache
    console.log('looking for this in cache', api_url)
    let response = await cache.match(api_url)

    if (!response) {
        console.log("no match in cache")

        //if not in cache, grab it from the origin
        response = await fetch(apiRequest)

        // must use Response constructor to inherit all of response's fields
        response = new Response(response.body, response)

        // Cache API respects Cache-Control headers, so by setting max-age to 10
        // the response will only live in cache for max of 7*24*60*60=604800 seconds

        response.headers.append('Cache-Control', 'max-age=604800')

        // store the fetched response as cacheKey
        // use waitUntil so computational expensive tasks don't delay the response

        if (response.status == 200) {
            console.log('status 200, storing in cache', api_url, api_url_raw)
            base_event.waitUntil(cache.put(api_url, response.clone()))
            base_event.waitUntil(cache.put(api_url_raw, response.clone()))
        } else {
            console.log('status != 200, deleting from cache')
            base_event.waitUntil(cache.delete(api_url, response.clone()))
            base_event.waitUntil(cache.delete(api_url_raw, response.clone()))
        }
    } else {
        console.log("match in cache")
    }
    return response
}