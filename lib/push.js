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

module.exports = (ref, data) => {
  for (const appSlug of appSlugs) {
    const app = config.apps[appSlug]

    if (app.webhook.filter && !app.webhook.filter.includes(ref)) {
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
      720 // retries
    )
  }
}
