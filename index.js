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
            const result = await handleRequest(event.request)
            return result
        }
    } catch (e) {
        event.waitUntil(log(e, event.request))
        return new Response(e.message || 'An error occurred!', {status: e.statusCode || 500})
    }
}

function removeTrailingSlash(myString)
{
    return myString.replace(/\/$/, "");
}

async function handleRequest(request) {
    let env_var_test = TEST_VAR
    let kv_test = await MY_KV.get("test_secret")

    if (request.method === 'POST') {
        let isValid = await isValidJwt(request)
        if (!isValid) {
            // It is immediately failing here, which is great. The worker doesn't bother hitting your API
            console.log('is NOT valid')
            return new Response('Invalid JWT', {status: 403})
        } else {
            console.log('is valid')

            let data = await request.json()
            console.log('data', data)
            const encodedToken = getJwt(request);
            let url_base = 'login'

            let api_url = 'https://unpaywall-jump-api.herokuapp.com/' + url_base + '?jwt=' + encodedToken
            console.log(api_url)

            let api_response = await fetch(api_url, {
                'method': 'POST',
                'headers': {'content-type': 'application/json;charset=UTF-8'},
                'body': JSON.stringify(data)})
            console.log(api_response)
            let api_result = await gatherResponse(api_response)
            console.log(api_result)

            const init = {
                  headers: {
                      'content-type': 'application/json;charset=UTF-8',
                  },
              }
            return new Response(JSON.stringify(api_result), init)

        }
    }
    else {
        // await check_authorization(request)

        console.log('after if in respond with in options')

        const request_url = new URL(request.url)
        const request_jwt = request_url.searchParams.get('jwt')
        if (request_jwt == null) {
            throw new Error('Need jwt')
        }
        let url_base = ''

        const init = {
            headers: request.headers
        }

        let api_response = await fetch(api_url, init)
        console.log(api_response)
        let api_result = gatherResponse(api_response)

        return new Response(api_result, {
            headers: {'content-type': 'text/json'},
        })
    }
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