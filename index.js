import {log} from './sentry'

addEventListener('fetch', event => {
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

function removeTrailingSlash(myString) {
    return myString.replace(/\/$/, "");
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
        console.log('jwt is valid')
        //
        // let encodedToken = getJwt(request);
        //
        // let api_url = 'https://unpaywall-jump-api.herokuapp.com' + api_pathname + '?jwt=' + encodedToken
        // console.log(api_url)
        //
        //
        // let api_response = await fetch(api_url, {
        //     'method': 'GET',
        //     'headers': {'content-type': 'application/json;charset=UTF-8'}
        // })
        //
        // console.log(api_response)
        // let api_result = await gatherResponse(api_response)
        // console.log(api_result)
        //
        // const init = {
        //     headers: corsHeaders
        // }
        // init.headers['content-type'] = 'application/json;charset=UTF-8'
        // return new Response(JSON.stringify(api_result), init)

        let get_response = await handleGetEvent(event)
        return get_response
    }
}


// based on https://developers.cloudflare.com/workers/templates/pages/cache_api/
async function handleGetEvent(event) {
    let request = event.request
    let encodedToken = getJwt(request)
    let request_url = new URL(request.url)
    let api_pathname = request_url
    api_pathname = api_pathname.pathname.replace('/cache', '')
    let api_url = 'https://unpaywall-jump-api.herokuapp.com' + api_pathname + '?jwt=' + encodedToken
    console.log(api_url)
    let apiUrl = new URL(api_url)
    let cacheKey = new Request(apiUrl, request)
    let apiRequest = new Request(apiUrl, request)

    let cache = caches.default
    // Get this request from this zone's cache
    let response = await cache.match(cacheKey)
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
        event.waitUntil(cache.put(cacheKey, response.clone()))
    } else {
        console.log("match in cache")
    }
    return response
}


// based on https://developers.cloudflare.com/workers/templates/pages/cache_api/
async function handlePostEvent(event) {
    let request = event.request
    let body = await request.clone().text()
    let hash = await sha256(body)
    let cacheUrl = new URL(request.url)
    // get/store the URL in cache by prepending the body's hash
    cacheUrl.pathname = '/posts' + cacheUrl.pathname + hash
    // Convert to a GET to be able to cache
    let cacheKey = new Request(cacheUrl, {
        headers: request.headers,
        method: 'GET',
    })
    let cache = caches.default
    //try to find the cache key in the cache
    let response = await cache.match(cacheKey)
    // otherwise, fetch response to POST request from origin
    if (!response) {
        response = await fetch(request)
        event.waitUntil(cache.put(cacheKey, response))
    }
    return response
}

async function check_authorization(request) {
    const request_url = new URL(request.url)
    const request_secret = request_url.searchParams.get('secret')
    if (request_secret == null) {
        throw new Error('Need secret key')
    }
    // remove trailing /
    let secret_check_url = 'https://unpaywall-jump-api.herokuapp.com/super?secret=' + removeTrailingSlash(request_secret)
    let secret_check_response = await fetch(secret_check_url)
    console.log(secret_check_response)
    if (secret_check_response.status != 200) {
        throw new Error('Wrong secret key')
    }
}

async function gatherResponse(response) {
    const {headers} = response
    const contentType = headers.get('content-type')
    if (contentType.includes('application/json')) {
        return await response.json()
    } else if (contentType.includes('application/text')) {
        return await response.text()
    } else if (contentType.includes('text/html')) {
        return await response.text()
    } else {
        return await response.text()
    }
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


const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control',
    'Access-Control-Expose-Headers': 'Authorization, Cache-Control',
    'Access-Control-Allow-Credentials': 'true'
}

// started from https://liftcodeplay.com/2018/10/01/validating-auth0-jwts-on-the-edge-with-a-cloudflare-worker/
function getJwt(request) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || authHeader.substring(0, 6) !== 'Bearer') {
        const request_url = new URL(request.url)
        const request_jwt = request_url.searchParams.get('jwt')
        if (request_jwt == null) {
            return null
        } else {
            return removeTrailingSlash(request_jwt)
        }
    } else {
        return authHeader.substring(6).trim()
    }
}

// started from https://liftcodeplay.com/2018/10/01/validating-auth0-jwts-on-the-edge-with-a-cloudflare-worker/
function decodeJwt(token) {
    const parts = token.split('.');
    const header = JSON.parse(atob(parts[0]));
    const payload = JSON.parse(atob(parts[1]));
    const signature = atob(parts[2].replace(/_/g, '/').replace(/-/g, '+'));
    // console.log(header)
    return {
        header: header,
        payload: payload,
        signature: signature,
        raw: {header: parts[0], payload: parts[1], signature: parts[2]}
    }
}

async function isValidJwt(request) {
    const encodedToken = getJwt(request);
    if (encodedToken === null) {
        return false
    }
    const token = decodeJwt(encodedToken);
    // console.log(token)
    return true
}


// from https://developers.cloudflare.com/workers/templates/pages/cache_api/
async function sha256(message) {
    // encode as UTF-8
    const msgBuffer = new TextEncoder().encode(message)
    // hash the message
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
    // convert ArrayBuffer to Array
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    // convert bytes to hex string
    const hashHex = hashArray.map(b => ('00' + b.toString(16)).slice(-2)).join('')
    return hashHex
}