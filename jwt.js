import {removeTrailingSlash} from './util'


// started from https://liftcodeplay.com/2018/10/01/validating-auth0-jwts-on-the-edge-with-a-cloudflare-worker/
export function getJwt(request) {
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
export function decodeJwt(token) {
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

export async function isValidJwt(request) {
    const encodedToken = getJwt(request);
    if (encodedToken === null) {
        return false
    }
    const token = decodeJwt(encodedToken);
    // console.log(token)
    return true
}
