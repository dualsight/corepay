
const config = require('../config')
const crypto = require('crypto')
const coreIdentifiers = Object.keys(config.cores)
  .filter(coreId => config.cores[coreId].enabled)

const getSignature = (payload, secret) => {
  const hmac = crypto.createHmac('sha1', secret)
  hmac.update(payload, 'utf-8')
  return 'sha1=' + hmac.digest('hex')
}

const getApp = (appSlug) => {
  const app = config.apps[appSlug]

  return app || null
}

module.exports = {
  abortOnError (err, req, res, next) {
    if (err) {
      res.status(200).send({
        error: { message: 'Could not parse request!' },
        result: null
      })
    } else {
      next()
    }
  },

  noTimeout (req, res, next) {
    req.setTimeout(config.server.requestTimeout)
    next()
  },
  
  parseRequest (req, res, buf, encoding) {
    req.rawBody = buf.toString()
  },

  validateRequest (req, res, next) {
    req.app = getApp(req.params.appSlug)

    // step 1: verify app
    if (req.app) {
      req.app.id = String(req.app.id)

      // step 2: verify core
      if (coreIdentifiers.includes(req.params.core)) {
        const expected = req.headers['x-corepay-signature']
        const calculated = getSignature(req.rawBody, req.app.secret)
  
        // step 3: verify header signature
        if (expected === calculated) {
          next()
        } else {
          res.status(200).send({
            error: { message: 'Invalid header signature!' },
            result: null
          })
        }
      } else {
        res.status(200).send({
          error: { message: 'Invalid or disabled core!' },
          result: null
        })
      }
    } else {
      res.status(200).send({
        error: { message: 'Invalid app!' },
        result: null
      })
    }
  }
}
