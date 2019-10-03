const config = require('../../lib/config')
const path = require('path')
const ethers = require('ethers')
const coreIdentifier = path.basename(path.dirname(__filename))
const provider = new ethers.providers.JsonRpcProvider(
  {
    url: `http${config.cores.ethereum.rpc.ssl ? 's' : ''}://`
      + `${config.cores[coreIdentifier].rpc.host}:`
      + `${config.cores[coreIdentifier].rpc.port}`,
    user: config.cores[coreIdentifier].rpc.username,
    password: config.cores[coreIdentifier].rpc.password,
    allowInsecure: true
  },
  { chainId: config.cores[coreIdentifier].rpc.network.chainId }
)

module.exports = provider
