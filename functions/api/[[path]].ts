const WORKER_URL = 'https://clarity-admin-api.bruce-5f2.workers.dev'

export const onRequest: PagesFunction = async (context) => {
  const url = new URL(context.request.url)
  const target = `${WORKER_URL}${url.pathname}${url.search}`

  return fetch(target, {
    method: context.request.method,
    headers: context.request.headers,
    body: context.request.method !== 'GET' && context.request.method !== 'HEAD'
      ? context.request.body
      : undefined,
  })
}
