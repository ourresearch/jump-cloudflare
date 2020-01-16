export const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Cache-Tag',
    'Access-Control-Expose-Headers': 'Authorization, Cache-Control, Cache-Tag',
    'Access-Control-Allow-Credentials': 'true'
}


export function removeTrailingSlash(myString) {
    return myString.replace(/\/$/, "");
}


export async function gatherResponse(response) {
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


// from https://developers.cloudflare.com/workers/templates/pages/cache_api/
export async function sha256(message) {
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


export function postLog(message) {
    console.log('in postLog sending ', message)

    return fetch('https://api.logflare.app/logs', {
        method: 'POST',
        headers: {
            "X-API-KEY": LOGFLARE_API_KEY_VAR,
            "Content-Type": "application/json",
            "User-Agent": `Cloudflare Worker`,
        },
        body: JSON.stringify({source: LOGFLARE_SOURCE_KEY_VAR, log_entry: message}),
    })
}

export async function purgeCache(tags) {
    let response = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/purge_cache`,
        {
            method: "POST",
            headers: {
                "X-Auth-Email": "heather@ourresearch.org",
                "X-Auth-Key": `${CLOUDFLARE_GLOBAL_API}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({"tags": tags})
        }
    );
    let data = await response.json();
    return data.success;
};