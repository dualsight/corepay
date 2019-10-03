const crypto = require('crypto')
const niceware = require('niceware')
const { utils } = require('ethers')

const newConfig = {
  "id": crypto.randomBytes(6).toString('hex'),
  "server": {
    "port": 8700,
    "requestTimeout": 0
  },
  "apps": {
    "mycryptoexchange": {
      "id": 0,
      "webhook": {
        "target": "http://127.0.0.1:3000/webhook",
        "filter": false
      },
      "secret": crypto.randomBytes(32).toString('hex')
    },
    "mycryptomall": {
      "id": 1,
      "webhook": {
        "target": "http://127.0.0.1:3001/webhook",
        "filter": [
          "deposit_alert",
          "deposit_confirmation",
          "withdrawal_confirmation"
        ]
      },
      "secret": crypto.randomBytes(32).toString('hex')
    }
  },
  "cores": {
    "bitcoin": {
      "enabled": true,
      "parserDelay": 600000,
      "initialBlockHeight": 0,
      "rpc": {
        "host": "127.0.0.1",
        "port": 8332,
        "ssl": false,
        "username": "bitcoin",
        "password": "bitcoin",
        "timeout": 30000,
        "version": "0.18.0"
      },
      "fee": {
        "confirmationTarget": 1,
        "estimateMode": "CONSERVATIVE"
      }
    },
    "ethereum": {
      "enabled": true,
      "parserDelay": 15000,
      "initialBlockHeight": 0,
      "rpc": {
        "host": "127.0.0.1",
        "port": 8545,
        "ssl": false,
        "username": "",
        "password": "",
        "timeout": 30000,
        "network": {
          "chainId": 1
        }
      },
      "wallet": {
        "passphrase": niceware.generatePassphrase(16).join(' '),
        "mnemonic": utils.HDNode.entropyToMnemonic(utils.randomBytes(32)),
        "main": null,
        "sweeper": null
      },
      "tokens": {
        "0x0000000000085d4780B73119b644AE5ecd22b376": {
          "standard": "ERC-20",
          "symbol": "TUSD",
          "decimals": 18
        },
        "0xe41d2489571d322189246dafa5ebde1f4699f498": {
          "standard": "ERC-20",
          "symbol": "ZRX",
          "decimals": 18
        }
      }
    }
  }
}

module.exports = {
  generate () {
    return newConfig
  }
}
