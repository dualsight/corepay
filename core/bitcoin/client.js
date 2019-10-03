const config = require('../../lib/config')
const BitcoinClient = require('bitcoin-core')
const client = new BitcoinClient({
  host: config.cores.bitcoin.rpc.host,
  username: config.cores.bitcoin.rpc.username,
  password: config.cores.bitcoin.rpc.password,
  port: config.cores.bitcoin.rpc.port,
  ssl: {
    enabled: config.cores.bitcoin.rpc.ssl
  },
  timeout: config.cores.bitcoin.rpc.timeout,
  version: config.cores.bitcoin.rpc.version
})

module.exports = client
