import {gatherResponse, postLog} from "./util";
import {getJwt} from './jwt'
import {decodeJwt} from './jwt'

export async function getAccount(event) {
    const encodedToken = getJwt(event.request)
    const token = decodeJwt(encodedToken);
    const identity = token.payload.identity
    var account_id = identity.login_uuid
    var cache = caches.default
    var is_demo = identity.is_demo_account
    var specific_response
    var demo_response

    var api_url = 'https://unpaywall-jump-api.herokuapp.com/account?jwt=' + encodedToken
    var api_url_demo = 'https://unpaywall-jump-api.herokuapp.com/account?jwt=DEMO'

    // await cache.delete(api_url) // uncomment to test

    specific_response = await cache.match(api_url)
    if (specific_response && specific_response.ok) {
        specific_response = modifyBody(specific_response.clone())
        event.waitUntil(postLog("found directly in cache " + specific_response.ok))
        return await specific_response
    }
    event.waitUntil(postLog("NOT found directly in cache"))

    if (is_demo) {
        demo_response = await cache.match(api_url_demo)
        if (demo_response && demo_response.ok) {
            event.waitUntil(postLog("found directly in demo cache, modifying now for " + account_id))
            specific_response = modifyBody(demo_response.clone(),
                'demo-package-' + account_id,
                'demo-scenario-' + account_id)
            event.waitUntil(postLog("saving directly in cache"))
            event.waitUntil(cachePut(api_url, specific_response, event))
            return specific_response
        }
    }

    event.waitUntil(postLog("doing live api get"))
    specific_response = await fetch(api_url)
    event.waitUntil(postLog("saving as specific"))
    await cachePut(api_url, specific_response.clone(), event)
    if (is_demo) {
        event.waitUntil(postLog("saving as demo"))
        await cachePut(api_url_demo, specific_response.clone(), event)
    }
    return specific_response

}




export function getIdFromUrl(event) {
    var request_url = event.request.url
    var my_id = null
    var re = /\/(package|scenario)\/([-a-zA-Z0-9]+)/;
    var my_match_array = request_url.match(re);
    if (my_match_array) {
        my_id = my_match_array[2]
    }
    console.log('my_id', my_id)
    return my_id
}

export async function getPackage(event) {
    const encodedToken = getJwt(event.request)
    const token = decodeJwt(encodedToken);
    const identity = token.payload.identity
    var is_demo = identity.is_demo_account
    var package_id
    var cache = caches.default
    var specific_response
    var demo_response

    package_id = getIdFromUrl(event)

    var api_url = 'https://unpaywall-jump-api.herokuapp.com/package/' + package_id + '?jwt=' + encodedToken
    var api_url_demo = 'https://unpaywall-jump-api.herokuapp.com/package/demo-package-DEMO'

    // await cache.delete(api_url) // uncomment to test

    specific_response = await cache.match(api_url)
    if (specific_response && specific_response.ok) {
        specific_response = modifyBody(specific_response.clone())
        event.waitUntil(postLog("found directly in cache "))
        return await specific_response
    }
    event.waitUntil(postLog("NOT found directly in cache"))

    if (is_demo) {
        demo_response = await cache.match(api_url_demo)
        if (demo_response && demo_response.ok) {
            event.waitUntil(postLog("found directly in demo cache, modifying now"))
            var scenario_id = package_id.replace('package', 'scenario')
            specific_response = modifyBody(demo_response.clone(),
                package_id,
                scenario_id)
            event.waitUntil(postLog("saving directly in cache"))
            event.waitUntil(cachePut(api_url, specific_response, event))
            return specific_response
        }
    }

    event.waitUntil(postLog("doing live api get"))
    specific_response = await fetch(api_url)
    event.waitUntil(postLog("saving as specific"))
    await cachePut(api_url, specific_response.clone(), event)
    if (is_demo) {
        event.waitUntil(postLog("saving as demo"))
        await cachePut(api_url_demo, specific_response.clone(), event)
    }
    return specific_response

}

function getScenarioEnd(event) {
    var request_url = new URL(event.request.url)
    var pathname_string = request_url.pathname + '//'
    var pathname_parts = pathname_string.split("/")
    var pathname_end = pathname_parts[4]
    if (pathname_end != "") {
        pathname_end = '/' + pathname_end
    }
    return pathname_end
}

export async function getScenario(event) {
    const encodedToken = getJwt(event.request)
    const token = decodeJwt(encodedToken);
    const identity = token.payload.identity
    var is_demo = identity.is_demo_account
    var scenario_id
    var scenario_path_end = getScenarioEnd(event)
    var cache = caches.default
    var specific_response
    var demo_response

    scenario_id = getIdFromUrl(event)

    var api_url = 'https://unpaywall-jump-api.herokuapp.com/scenario/' + scenario_id + scenario_path_end + '?jwt=' + encodedToken
    var api_url_demo = 'https://unpaywall-jump-api.herokuapp.com/scenario/demo-scenario-DEMO' + scenario_path_end

    event.waitUntil(postLog("looking up specific at: " + api_url))
    // await cache.delete(api_url) // uncomment to test

    specific_response = await cache.match(api_url)
    if (specific_response && specific_response.ok) {
        specific_response = modifyBody(specific_response.clone())
        event.waitUntil(postLog("found directly in cache "))
        return await specific_response
    }
    event.waitUntil(postLog("NOT found directly in cache"))

    if (is_demo) {
        event.waitUntil(postLog("checking if have demo response " + api_url_demo))
        demo_response = await cache.match(api_url_demo)
        if (demo_response && demo_response.ok) {
            event.waitUntil(postLog("YES have demo response"))
            event.waitUntil(postLog("found directly in demo cache, modifying now"))
            var package_id = scenario_id.replace('scenario', 'package')
            specific_response = modifyBody(demo_response.clone(),
                package_id,
                scenario_id)
            event.waitUntil(postLog("saving directly in cache"))
            event.waitUntil(cachePut(api_url, specific_response, event))
            return specific_response
        } else {
            event.waitUntil(postLog("NO demo response"))
        }
    }

    event.waitUntil(postLog("doing live api get"))
    specific_response = await fetch(api_url)
    event.waitUntil(postLog("saving as specific at: " + api_url))
    await cachePut(api_url, specific_response.clone(), event)
    if (is_demo) {
        event.waitUntil(postLog("saving as demo"))
        await cachePut(api_url_demo, specific_response.clone(), event)
    }

    return specific_response

}






export async function modifyBody(response, package_id, scenario_id) {
    var old_body_text = await response.clone().text()
    old_body_text = old_body_text.replace(/"_timing": ([^\]]).*?]/g, '"_timing": "CACHED"');
    //
    // if (package_id != undefined) {
    //     old_body_text = old_body_text.replace(/"demo-package-[a-zA-Z0-9]+"/g, '"'+package_id+'"');
    // }
    //
    // if (scenario_id != undefined) {
    //     old_body_text = old_body_text.replace(/"demo-scenario-[a-zA-Z0-9]+"/g, '"'+scenario_id+'"');
    // }

    var modified_response = new Response(old_body_text, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
    })

    return modified_response
}


export async function cachePut(key, response_clone, event) {
    var cache = caches.default

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