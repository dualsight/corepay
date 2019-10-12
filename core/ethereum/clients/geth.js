const path = require('path')
const coreIdentifier = path.basename(path.dirname(__dirname))
const provider = require('../provider')
const rpc = (...args) => provider.send(...args)
const BigNumber = require('bignumber.js')
const helper = require('../../../lib/helper')

const _extractAddress = value => {
  if (!value) return value

  if (value.match(/^0x[a-zA-Z0-9]{40}/)) return value

  let address = `0x${BigNumber(value).toString(16)}`

  while (address.length < 42)
    address = address.replace(/^0x/, '0x0')

  return address
}

const _parseCallToDeposits = (callObject, receipt, addrCollection, highestBlock, index) => {
  let deposits = []
  const benefactor = _extractAddress(callObject.from)
  const beneficiary = _extractAddress(callObject.to)
  const $addr = addrCollection.findObject({ $: beneficiary })
  const uintValue = BigNumber(callObject.value)

  if ($addr && uintValue.isGreaterThan(0)) {
    deposits.push({
      app: helper.getAppInfoById($addr.account),
      core: coreIdentifier,
      symbol: 'ETH',
      value: uintValue.div(Math.pow(10, 18)).toString(),
      beneficiary,
      txid: receipt.transactionHash,
      meta: {
        index: `ct_${index}}`,
        benefactor
      },
      confirmations: highestBlock.minus(receipt.blockNumber).toString()
    })
  }

  if (!callObject.calls) {
    return deposits
  }

  callObject.calls.forEach((_callObject, i) => {
    deposits = deposits.concat(_parseCallToDeposits(_callObject, receipt, addrCollection, highestBlock, i))
  })

  return deposits
}

module.exports = {
  parseInternalDeposits (receipt, addrCollection, highestBlock) {
    return new Promise((resolve, reject) => {
      rpc(
        'debug_traceTransaction',
        [receipt.transactionHash, { tracer: 'callTracer', reexec: highestBlock.minus(receipt.blockNumber).plus(20).toNumber() }]
      )
        .then(callObject => {
          resolve(_parseCallToDeposits(callObject, receipt, addrCollection, highestBlock, 'v'))
        })
        .catch(err => {
          reject(err)
        })
    })
  }
}
