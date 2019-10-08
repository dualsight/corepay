const ethers = require('ethers')
const BigNumber = require('bignumber.js')
const abi = require('./abi')

module.exports = {
  parseDeposits: (tokenStandard, addrCollection, receipt, contractMeta, highestBlock) => {
    const iface = new ethers.utils.Interface(
      abi.get(contractMeta.symbol, tokenStandard)
    )

    switch (tokenStandard) {
      case 'ERC-20':
      case 'ERC-721': {
        let deposits = []
    
        if (receipt.logs) {
          const decodedInput = {}
    
          receipt.logs.forEach((log, i) => {
            const parsedLog = iface.parseLog(log)
    
            if (parsedLog) {
              const result = parsedLog.values
              const $addr = addrCollection.findObject({ $: String(result[1]).toLowerCase() })
    
              if ($addr) {
                switch (parsedLog.signature) {
                  case 'Transfer(address,address,uint256)': {
                    deposits.push({
                      core: 'ethereum',
                      symbol: contractMeta.symbol,
                      value: BigNumber(result[2]).div(Math.pow(10, contractMeta.decimals)).toString(),
                      beneficiary: result[1],
                      txid: log.transactionHash,
                      meta: {
                        appId: $addr.account,
                        index: `el_${i}_${BigNumber(log.logIndex).toString()}`,
                        contract: receipt.to,
                        benefactor: result[0],
                        tokenStandard
                      },
                      confirmations: highestBlock.minus(log.blockNumber).toString()
                    })
      
                    break
                  }
                }
              }
            }
          })
        }
    
        return deposits
      }
    }
  }
}
