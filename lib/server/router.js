const express = require('express')
const router = express.Router()
const ctrlr = require('./controller')
const mw = require('./middleware')

router.post(
  '/:appSlug/get-deposit-address/:core',
  mw.noTimeout, mw.validateRequest,
  ctrlr.getDepositAddress
)

router.post(
  '/:appSlug/ping/:core',
  mw.noTimeout, mw.validateRequest,
  ctrlr.ping
)

router.post(
  '/:appSlug/withdraw/:core',
  mw.noTimeout, mw.validateRequest,
  ctrlr.withdraw
)

router.post(
  '/:appSlug/query-transaction/:core',
  mw.noTimeout, mw.validateRequest,
  ctrlr.queryTransaction
)

router.post(
  '/:appSlug/query-balance/:core',
  mw.noTimeout, mw.validateRequest,
  ctrlr.queryBalance
)

module.exports = router
