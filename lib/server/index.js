const express = require('express')
const app = express()
const server = require('http').createServer(app)
const mw = require('./middleware')
const router = require('./router')

app.use(express.json({ verify: mw.parseRequest }))
app.use(mw.abortOnError)
app.use(router)

module.exports = {
  server
}
