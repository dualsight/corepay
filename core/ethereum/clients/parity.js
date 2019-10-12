const path = require('path')
const coreIdentifier = path.basename(path.dirname(__dirname))
const provider = require('../provider')
const rpc = (...args) => provider.send(...args)
const BigNumber = require('bignumber.js')
const helper = require('../../../lib/helper')

const _extractAddress = (value) => {
  if (!value) return value

  if (value.match(/^0x[a-zA-Z0-9]{40}/)) return value

  let address = `0x${BigNumber(value).toString(16)}`

  while (address.length < 42)
    address = address.replace(/^0x/, '0x0')

  return address
}

const _replayTransaction = (txHash) => {
  return new Promise((resolve, reject) => {
    rpc(
      'trace_replayTransaction',
      [txHash, ['trace']]
    )
      .then(trace => resolve(trace))
      .catch(err => reject(err))
  })
}

module.exports = {
  parseInternalDeposits (receipt, addrCollection, highestBlock) {
    return new Promise((resolve, reject) => {
      _replayTransaction(receipt.transactionHash)
        .then(traceWrapper => {
          const deposits = []

          if (traceWrapper.trace.some((row) => row.error)) {
            return resolve(deposits)
          }

          traceWrapper.trace.forEach((callObject, i) => {
            const benefactor = _extractAddress(callObject.action.from)
            const beneficiary = _extractAddress(callObject.action.to)
            const $addr = addrCollection.findObject({ $: beneficiary })
            const uintValue = BigNumber(callObject.action.value)

            if ($addr && uintValue.isGreaterThan(0)) {
              deposits.push({
                app: helper.getAppInfoById($addr.account),
                core: coreIdentifier,
                symbol: 'ETH',
                value: uintValue.div(Math.pow(10, 18)).toString(),
                beneficiary,
                txid: receipt.transactionHash,
                meta: {
                  index: `ct_${i}_${callObject.traceAddress.toString() || 'v'}`,
                  benefactor
                },
                confirmations: highestBlock.minus(receipt.blockNumber).toString()
              })
            }
          })

          resolve(deposits)
        })
        .catch(err => {
          reject(err)
        })
    })
  }
}
