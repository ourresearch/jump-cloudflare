import {log} from './sentry'
import {calculate} from './jump'
import {getAndCache} from './mycache'
import {isValidJwt} from './jwt'
import {getJwt} from './jwt'
import {decodeJwt} from './jwt'
import {sha256} from './util'
import {corsHeaders} from './util'
import {removeTrailingSlash} from './util'
import {gatherResponse} from './util'

addEventListener('fetch', event => {
    calculate()
    event.respondWith(handleEventWithErrorHandling(event))
})


async function handleEventWithErrorHandling(event) {
    try {
        if (event.request.method === 'OPTIONS') {
            const result = await handleOptions(event.request)
            return result
        } else {
            const result = await handleEvent(event)
            return result
        }
    } catch (e) {
        event.waitUntil(log(e, event.request))
        return new Response(e.message || 'An error occurred!', {status: e.statusCode || 500})
    }
}

async function handleEvent(event) {
    let request = event.request
    let env_var_test = TEST_VAR
    let kv_test = await MY_KV.get("test_secret")
    let request_url = new URL(request.url)
    let api_pathname = request_url.pathname.replace('/cache', '')

    // console.log('api_pathname', api_pathname)
    if (request.method === 'POST') {
        let encodedToken = ''

        if (api_pathname != '/login') {
            let isValid = await isValidJwt(request)
            if (!isValid) {
                // It is immediately failing here, which is great. The worker doesn't bother hitting your API
                console.log('is NOT valid')
                return new Response('Invalid JWT', {status: 403})
            }
            console.log('jwt is valid')
            encodedToken = getJwt(request);
        }

        let data = await request.json()
        console.log('data', data)

        let api_url = 'https://unpaywall-jump-api.herokuapp.com' + api_pathname + '?jwt=' + encodedToken
        console.log(api_url)

        let api_response = await fetch(api_url, {
            'method': 'POST',
            'headers': {'content-type': 'application/json;charset=UTF-8'},
            'body': JSON.stringify(data)
        })
        console.log(api_response)
        let api_result = await gatherResponse(api_response)
        console.log(api_result)


        const init = {
            headers: corsHeaders
        }
        init.headers['content-type'] = 'application/json;charset=UTF-8'
        return new Response(JSON.stringify(api_result), init)


    } else {
        let isValid = await isValidJwt(request)
        if (!isValid) {
            // It is immediately failing here, which is great. The worker doesn't bother hitting your API
            console.log('is NOT valid')
            return new Response('Invalid JWT', {status: 403})
        }

        return await handleGetEvent(event)
    }
}


// based on https://developers.cloudflare.com/workers/templates/pages/cache_api/
async function handleGetEvent(event) {
    let request_url = new URL(event.request.url)
    let cache_url_fragment = request_url.pathname.replace('/cache', '')
    let base_event = event
    let post_hash = null

    let response = await getAndCache(cache_url_fragment, base_event, post_hash)

    let data = await response.clone().json()
    if (cache_url_fragment === '/account') {
        let package_id = data.packages[0]['id']
        console.log('this is an account call', package_id)
        cache_url_fragment = '/package/' + package_id
        getAndCache(cache_url_fragment, base_event, post_hash)
    } else if (cache_url_fragment === '/package') {
        let scenario_id = data.scenarios[0]['id']
        console.log('this is an package call', package_id)
        cache_url_fragment = '/scenario/' + scenario_id
        getAndCache(cache_url_fragment, base_event, post_hash)
        getAndCache(cache_url_fragment + '/slider', base_event, post_hash)
        getAndCache(cache_url_fragment + '/apc', base_event, post_hash)
        getAndCache(cache_url_fragment + '/table', base_event, post_hash)
    }

    return response
}


// based on https://developers.cloudflare.com/workers/templates/pages/cache_api/
async function handlePostEvent(event) {
    let request = event.request
    let body = await request.clone().text()
    let hash = await sha256(body)
    let cacheUrl = new URL(request.url)
    let cache = caches.default

    // get/store the URL in cache by prepending the body's hash
    cacheUrl.pathname = '/posts' + cacheUrl.pathname + hash

    // Convert to a GET to be able to cache
    let cacheKey = new Request(cacheUrl, {
        headers: request.headers,
        method: 'GET',
    })

    //try to find the cache key in the cache
    let response = await cache.match(cacheKey)

    // otherwise, fetch response to POST request from origin
    if (!response) {
        response = await fetch(request)
        event.waitUntil(cache.put(cacheKey, response))
    }
    return response
}


async function handleOptions(request) {
    // Make sure the necesssary headers are present
    // for this to be a valid pre-flight request
    if (
        request.headers.get('Origin') !== null &&
        request.headers.get('Access-Control-Request-Method') !== null &&
        request.headers.get('Access-Control-Request-Headers') !== null
    ) {
        // Handle CORS pre-flight request.
        // If you want to check the requested method + headers
        // you can do that here.
        return new Response(null, {
            headers: corsHeaders,
        })
    } else {
        // Handle standard OPTIONS request.
        // If you want to allow other HTTP Methods, you can do that here.
        return new Response(null, {
            headers: {
                Allow: 'GET, HEAD, POST, OPTIONS',
            },
        })
    }
}

