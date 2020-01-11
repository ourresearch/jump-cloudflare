addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})
/**
 * Respond with hello worker text
 * @param {Request} request
 */
async function handleRequest(request) {
  let env_var_test = TEST_VAR
  let kv_test = await MY_KV.get("test_secret");
  return new Response('Hello worker! ' + env_var_test + kv_test, {
    headers: { 'content-type': 'text/plain' },
  })
}
