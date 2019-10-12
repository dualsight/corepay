const config = require('./config')
const post = require('./post')
const crypto = require('crypto')
const appSlugs = Object.keys(config.apps)

// Calculate the X-Corepay-Signature header value.
function getSignature(payload, secret) {
  const hmac = crypto.createHmac('sha1', secret)
  hmac.update(payload, 'utf-8')
  return `sha1=${hmac.digest('hex')}`
}

module.exports = (ref, dataArr) => {
  const emits = {}
  const broadcast = []

  for (const data of dataArr) {
    if (data.app) {
      if (!emits[data.app.slug]) {
        emits[data.app.slug] = []
      }
  
      emits[data.app.slug].push(data)
    } else {
      broadcast.push(data)
    }
  }

  for (const appSlug of appSlugs) {
    const app = config.apps[appSlug]
    const data = [...emits[appSlug] || [], ...broadcast]

    if (
      data.length === 0 ||
      (app.webhook.filter && !app.webhook.filter.includes(ref))
    ) {
      continue
    }

    const payload = JSON.stringify({
      ref,
      data
    })

    post(
      app.webhook.target,
      {
        method: 'POST',
        body: payload,
        headers: {
          'Content-Type': 'application/json',
          'X-Corepay-Signature': getSignature(payload, app.secret)
        },
      },
      app.webhook.retryCount // retries
    )
  }
}
