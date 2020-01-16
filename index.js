import {errorLog} from './sentry'
import {getAccount} from './mycache'
import {isValidJwt} from './jwt'
import {getJwt} from './jwt'
import {decodeJwt} from './jwt'
import {sha256} from './util'
import {corsHeaders} from './util'
import {removeTrailingSlash} from './util'
import {gatherResponse} from './util'
import {postLog} from './util'
import {purgeCache} from './util'


addEventListener('fetch', event => {
    event.waitUntil(postLog("**VERSION 3**"))
    event.respondWith(handleEventWithErrorHandling(event))
})


async function handleEventWithErrorHandling(event) {
    try {
        if (event.request.method === 'OPTIONS') {
            return handleOptions(event)
        } else if (event.request.method === 'GET') {
            return handleGetEvent(event)
        }
    } catch (e) {
        event.waitUntil(postLog("**ERROR**" + e.message))
        event.waitUntil(errorLog(e, event.request))
        return new Response(e.message || 'An error occurred!', {status: e.statusCode || 500})
    }
}


// based on https://developers.cloudflare.com/workers/templates/pages/cache_api/
async function handleGetEvent(event) {
    let request_url = new URL(event.request.url)
    let cache_url_fragment = request_url.pathname.replace('/cache', '')

    if (cache_url_fragment === '/account') {
        event.waitUntil(postLog("called with /account"))
        return await getAccount(event)
    } else if (cache_url_fragment === '/purge') {
        event.waitUntil(postLog("called with /purge"))
        var result = await purgeCache(['cloudflare_workers'])
        return new Response("purge cache status:" + result, {status: 200})
    }
}

async function handleOptions(event) {
    var request = event.request
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