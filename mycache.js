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


    await cache.delete(api_url_demo)

    // event.waitUntil(postLog("doing live api get"))

    specific_response = await fetch(api_url)

    // event.waitUntil(postLog("saving as specific"))
    // await cachePut(api_url, specific_response, event)

    demo_response = await modifyBody(specific_response, "DEMO")


    // event.waitUntil(postLog("saving as demo"))
    // await cachePut(api_url_demo, demo_response, event)

    await cache.put(api_url_demo, demo_response.clone())

    // var result = await cache.put(api_url_demo, demo_response.clone())

    var cache_response = await cache.match(api_url_demo)
    if (cache_response) {
        return cache_response
    }
    return specific_response

}


export async function modifyBody(response, specific_id) {
    var old_body_text = await response.clone().text()
    old_body_text = old_body_text.replace(/"_timing": ([^\]]).*?]/g, '"_timing": "CACHED"');
    old_body_text = old_body_text.replace(/"demo-package-[a-zA-Z0-9]+"/g, '"demo-package-'+specific_id+'"');
    old_body_text = old_body_text.replace(/"demo-scenario-[a-zA-Z0-9]+"/g, '"demo-scenario-'+specific_id+'"');

    var modified_response = new Response(old_body_text, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
        })

    return modified_response
}


export async function cachePut(key, response_orig, event) {
    var cache = caches.default

    event.waitUntil(postLog('here at top'))
    //
    // console.log("key", key)
    // console.log("response_orig", response_orig)
    // var response_clone = await response_orig
    // console.log("response_clone", response_clone)
    //
    await cache.put(key, response_orig.clone())
    return response_clone
    //
    // var newResponseHeaders = new Headers(response_clone.headers)
    // newResponseHeaders.set('Cache-Tag', 'cloudflare_workers')
    // newResponseHeaders.set('Cache-Control', 'max-age=604800')
    //
    // var response_body = gatherResponse(response_clone)
    //
    // var new_response = new Response(response_body, {
    //     status: response_clone.status,
    //     statusText: response_clone.statusText,
    //     headers: response_clone
    //     })
    //
    // event.waitUntil(postLog('after making response'))

    // if (new_response.status == 200) {
    //     event.waitUntil(postLog('status == 200, saving to cache'))
    //     event.waitUntil(postLog(key))
    //     await cache.put(key, new_response.clone())
    //     event.waitUntil(postLog('done with cache.put'))
    // } else {
    //     event.waitUntil(postLog('status != 200, deleting from cache'))
    //     event.waitUntil(cache.delete(key))
    // }
    // await cache.put(key, response_clone.clone())
    // return response_clone
}