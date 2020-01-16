import {removeTrailingSlash} from './util'

export async function calculate() {
    console.log('in calculate')
    return
}


export async function check_authorization(request) {
    const request_url = new URL(request.url)
    const request_secret = request_url.searchParams.get('secret')
    if (request_secret == null) {
        throw new Error('Need secret key')
    }
    let secret_check_url = 'https://unpaywall-jump-api.herokuapp.com/super?secret=' + removeTrailingSlash(request_secret)
    let secret_check_response = await fetch(secret_check_url)
    if (secret_check_response.status != 200) {
        throw new Error('Wrong secret key')
    }
}

