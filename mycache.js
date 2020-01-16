import {gatherResponse, postLog} from "./util";
import {getJwt} from './jwt'
import {decodeJwt} from './jwt'

export async function getAccount(event) {
    const encodedToken = getJwt(event.request)
    const token = decodeJwt(encodedToken);
    const identity = token.payload.identity
    var cache = caches.default
    var specific_response
    var demo_response

    var api_url = 'https://unpaywall-jump-api.herokuapp.com/account?jwt=' + encodedToken
    var api_url_demo = 'https://unpaywall-jump-api.herokuapp.com/account?jwt=DEMO'

    // await cache.delete(api_url) // uncomment to test


    var cache_response = await cache.match(api_url_demo)
    if (cache_response) {
        return cache_response
    }
    specific_response = await fetch(api_url)
    return specific_response

    // specific_response = await cache.match(api_url)
    // if (specific_response && specific_response.ok) {
    //     event.waitUntil(postLog("found directly in cache " + specific_response.ok))
    //     return await specific_response
    // }
    // event.waitUntil(postLog("NOT found directly in cache"))

    // demo_response = await cache.match(api_url_demo)
    // if (demo_response && demo_response.ok) {
    //     event.waitUntil(postLog("found directly in demo cache, modifying now for " + identity.login_uuid))
    //     specific_response = modifyBody(demo_response, identity.login_uuid)
    //     event.waitUntil(postLog("saving directly in cache"))
    //     event.waitUntil(cachePut(api_url, specific_response, event))
    //     // return await specific_response
    //     return demo_response
    // } else {
    //     event.waitUntil(postLog("doing live api get"))
    //     specific_response = await fetch(api_url)
    //     event.waitUntil(postLog("saving as specific"))
    //     await cachePut(api_url, specific_response, event)
    //     var demo_response = modifyBody(specific_response, "DEMO")
    //     event.waitUntil(postLog("saving as demo"))
    //     await cachePut(api_url_demo, demo_response, event)
    //     return specific_response
    //     // return demo_response
    // }


    // await cache.delete(api_url_demo)

    // event.waitUntil(postLog("doing live api get"))

    // specific_response = await fetch(api_url)

    // event.waitUntil(postLog("saving as specific"))
    // await cachePut(api_url, specific_response, event)

    // demo_response = await modifyBody(specific_response, "DEMO")


    // event.waitUntil(postLog("saving as demo"))
    // await cachePut(api_url_demo, demo_response.clone(), event)

    // await cache.put(api_url_demo, demo_response.clone())

    var cache_response = await cache.match(api_url_demo)
    if (cache_response) {
        return cache_response
    }
    specific_response = await fetch(api_url)
    return specific_response

}


export async function modifyBody(response, specific_id) {
    var old_body_text = await response.clone().text()
    old_body_text = old_body_text.replace(/"_timing": ([^\]]).*?]/g, '"_timing": "CACHED"');
    old_body_text = old_body_text.replace(/"demo-package-[a-zA-Z0-9]+"/g, '"demo-package-' + specific_id + '"');
    old_body_text = old_body_text.replace(/"demo-scenario-[a-zA-Z0-9]+"/g, '"demo-scenario-' + specific_id + '"');

    var modified_response = new Response(old_body_text, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
    })

    return modified_response
}


export async function cachePut(key, response_clone, event) {
    if (response_clone.status != 200) {
        event.waitUntil(cache.delete(key))
        return response_clone
    }

    var cache = caches.default
    var response = new Response(response_clone.body, response_clone)
    var tags = ['cloudflare_workers']
    response.headers.set('Cache-Tag', tags.join(','))
    response.headers.set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Cache-Tag')
    response.headers.set('Access-Control-Expose-Headers', 'Authorization, Cache-Control, Cache-Tag')
    response.headers.set('Cache-Control', 'max-age=604800')
    await cache.put(key, response.clone())
    return response
}