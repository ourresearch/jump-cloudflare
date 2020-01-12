import {log} from './sentry'

addEventListener('fetch', event => {
    event.respondWith(handleEventWithErrorHandling(event))
})


async function handleEventWithErrorHandling(event) {
    try {
        const res = await handleRequest(event.request)
        return res
    } catch (e) {
        event.waitUntil(log(e, event.request))
        return new Response(e.message || 'An error occurred!', {status: e.statusCode || 500})
    }
}


async function check_authorization(request) {
    const request_url = new URL(request.url)
    const request_secret = request_url.searchParams.get('secret')

    if (request_secret == null) {
        throw new Error('Need secret key')
    }
    // remove trailing /
    let secret_check_url = 'https://unpaywall-jump-api.herokuapp.com/super?secret=' + request_secret.replace('/', '')
    let secret_check_response = await fetch(secret_check_url)
    console.log(secret_check_response)
    if (secret_check_response.status != 200) {
        throw new Error('Wrong secret key')
    }

    console.log('so far so good')
}

async function handleRequest(request) {
    let env_var_test = TEST_VAR
    let kv_test = await MY_KV.get("test_secret")

    await check_authorization(request)

    return new Response('Hello worker! ' + env_var_test + kv_test, {
        headers: {'content-type': 'text/plain'},
    })
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