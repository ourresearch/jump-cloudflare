addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})
/**
 * Respond with hello worker text
 * @param {Request} request
 */
async function handleRequest(request) {
  hi = TEST_VAR
  return new Response('Hello worker! ' + hi, {
    headers: { 'content-type': 'text/plain' },
  })
}
