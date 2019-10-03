
const ping = (req, res) => {
  require(`../../core/${req.params.core}`)
    .ping(req.app, req.body.meta)
      .then(result => {
        res.status(200).send({
          request: req.originalUrl,
          error: null,
          result
        })
      })
      .catch(err => {
        res.status(200).send({
          error: {
            message: err.message || null,
            name: err.name || null,
            code: err.code || null
          },
          result: null
        })
      })
}

const getDepositAddress = (req, res) => {
  require(`../../core/${req.params.core}`)
    .getDepositAddress(req.app, req.body.meta)
      .then(result => {
        res.status(200).send({
          request: req.originalUrl,
          error: null,
          result
        })
      })
      .catch(err => {
        res.status(200).send({
          error: {
            message: err.message || null,
            name: err.name || null,
            code: err.code || null
          },
          result: null
        })
      })
}

const withdraw = (req, res) => {
  require(`../../core/${req.params.core}`)
    .withdraw(req.app, req.body.transfers, req.body.meta)
      .then(result => {
        res.status(200).send({
          request: req.originalUrl,
          error: null,
          result
        })
      })
      .catch(err => {
        res.status(200).send({
          error: {
            message: err.message || null,
            name: err.name || null,
            code: err.code || null
          },
          result: null
        })
      })
}

const queryTransaction = (req, res) => {
  require(`../../core/${req.params.core}`)
    .queryTransaction(req.app, req.body.txid, req.body.meta)
      .then(result => {
        res.status(200).send({
          request: req.originalUrl,
          error: null,
          result
        })
      })
      .catch(err => {
        res.status(200).send({
          request: req.originalUrl,
          error: {
            message: err.message || null,
            name: err.name || null,
            code: err.code || null
          },
          result: null
        })
      })
}
const queryBalance = (req, res) => {
  require(`../../core/${req.params.core}`)
    .queryBalance(req.app, req.body.address, req.body.meta)
      .then(result => {
        res.status(200).send({
          request: req.originalUrl,
          error: null,
          result
        })
      })
      .catch(err => {
        res.status(200).send({
          request: req.originalUrl,
          error: {
            message: err.message || null,
            name: err.name || null,
            code: err.code || null
          },
          result: null
        })
      })
}

module.exports = {
  ping,
  getDepositAddress,
  withdraw,
  queryTransaction,
  queryBalance
}
