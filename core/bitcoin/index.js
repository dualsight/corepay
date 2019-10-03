const config = require('../../lib/config')
const path = require('path')
const fs = require('fs')
const glob = require('glob')
const crypto = require('crypto')
const coreIdentifier = path.basename(path.dirname(__filename))
const push = require('../../lib/push')
const crypt = require('../../lib/crypt')
const rpc = require('./client')
const BigNumber = require('bignumber.js')
const bip32 = require('bip32')
const bip39 = require('bip39')
const bitcoin = require('bitcoinjs-lib')
const bitcore = require('bitcore-lib')
const storage = require('../../lib/db')()
const logger = require('debugnyan')(`core:${coreIdentifier}`)
const states = require('../../lib/states')
const walletBasePath = path.join(
  __dirname, '..', '..', 'storage', 'wallets', coreIdentifier
)
const walletTypes = [ 'mainnet', 'testnet' ]
let cfgCollection
let addrCollection
let addrNonceCollection
let nodeNetworkType

const parseBlockByHeight = (blockNumber) => {
  return new Promise(resolveBlock => {
    const blockProgress = BigNumber(blockNumber)
    const deposits = []

    try {
      rpc.getBlockHash(blockProgress.toNumber()) // use block height to obtain hash
        .then(hash => {
          rpc.getBlock(hash, 2) // use obtained hash to fetch block with detailed txs
            .then(async block => {
              batch = block.tx.map(tx => {
                return {
                  method: 'gettransaction',
                  parameters: [
                    tx.txid,
                    true
                  ]
                }
              })
    
              const encounteredError = await new Promise(resolve => {
                rpc.command(batch)
                  .then(async resArr => {
                    for (const tx of resArr) { // step through each response
                      if (tx.hex) { // if response is tx
                        for (const i in tx.details) {
                          if (tx.details[i].category === 'receive') {
                            deposits.push({
                              core: coreIdentifier,
                              symbol: 'BTC',
                              value: BigNumber(tx.details[i].amount).toString(),
                              beneficiary: tx.details[i].address,
                              txid: tx.txid,
                              meta: { index: BigNumber(tx.details[i].vout).toString() },
                              confirmations: BigNumber(tx.confirmations).toString()
                            })
                          }
                        }
                      }
                    }
    
                    resolve(false)
                  })
                  .catch(err => {
                    logger.error(err)
                    resolve(true)
                  })
              })
    
              if (!encounteredError) {
                resolveBlock([blockProgress.plus(1), deposits]) // we're done with this block
              }
            })
              .catch(err => {
                logger.error(err)
                return resolveBlock([blockProgress, deposits])
              })
        })
          .catch(err => {
            logger.error(err)
            return resolveBlock([blockProgress, deposits])
          })

      logger.info('Bitcoin \u2714 Block', blockProgress.toString())
    } catch (e) {
      logger.error(e)
      resolveBlock([blockProgress, deposits]) // reparse this block
    }
  })
}

const parseNextBlock = (cfgCollection) => {
  return new Promise(resolveRun => {
    rpc.getBlockCount() // get current block height from node
      .then(async bh => {
        const blockHeight = BigNumber(bh)
        const $bp = await new Promise(resolve => {
          // fetch block progress from storage
          const bp = cfgCollection.findObject({ $: 'block_progress' })

          if (bp) {
            resolve(bp)
          } else { // if progress doesn't exist, set initial
            const newHeight = BigNumber(config.cores[coreIdentifier].initialBlockHeight).isEqualTo(0)
              ? blockHeight.toString()
              : config.cores[coreIdentifier].initialBlockHeight

            resolve(cfgCollection.insert({ $: 'block_progress', value: newHeight }))
          }
        })
        
        // set block progress to current block height if unset
        let blockProgress = BigNumber($bp.value)

        if (blockProgress.isNaN()) return

        const [nextBlockHeight, deposits] = await parseBlockByHeight(blockProgress)

        if (nextBlockHeight.isGreaterThan(blockProgress)) {
          // store progress in db
          $bp.value = nextBlockHeight.toString()
          cfgCollection.update($bp)

          // push deposits
          if (deposits.length > 0) {
            push('deposit_alert', deposits)
          }
        }

        resolveRun(true)
      })
      .catch((err) => {
        logger.error(err)
        resolveRun(true)
      })
  })
}

const boot = () => {
  return new Promise(async resolveBoot => {
    cfgCollection = await new Promise(resolve => {
      let collection = storage.getCollection(`${coreIdentifier}.config`)

      if (collection === null) {
        collection = storage.addCollection(
          `${coreIdentifier}.config`,
          { unique: ['$'] }
        )
      }

      resolve(collection)
    })
    addrCollection = await new Promise(resolve => {
      storage.removeCollection(`${coreIdentifier}.addresses`)
      resolve(storage.addCollection(
        `${coreIdentifier}.addresses`),
        { unique: ['$'] }
      )
    })
    addrNonceCollection = await new Promise(resolve => {
      storage.removeCollection(`${coreIdentifier}.address_nonces`)
      resolve(storage.addCollection(
        `${coreIdentifier}.address_nonces`),
        { unique: ['$'] }
      )
    })

    await rpc.getBlockchainInfo()
      .then(async info => {
        if (info.chain === 'main') {
          nodeNetworkType = 'mainnet'
        } else if (info.chain === 'test') {
          nodeNetworkType = 'testnet'
        } else {
          return resolveBoot(false)
        }
      })
      .catch((err) => {
        logger.error(err)
        return resolveBoot(false)
      })
    
      for (const walletType of walletTypes) {
        try {
          const dirs = Object.keys(config.apps).map(key => `${config.apps[key].id}`)
          
          for (const dir of dirs) {
            fs.mkdirSync(path.join(walletBasePath, walletType, dir), { recursive: true })

            const keystoreFiles = glob.sync(`${path.join(walletBasePath, walletType)}/${dir}/*`)
    
            // set address nonce for sequencial HD derivations
            const addrNonce = BigNumber(keystoreFiles.length).toString()
            const $addrNonce = addrNonceCollection.findObject({
              $: walletType,
              appId: dir
            })

            if ($addrNonce) {
              $addrNonce.value = addrNonce
              addrNonceCollection.update($addrNonce)
            } else {
              addrNonceCollection.insert({
                $: walletType,
                appId: dir,
                value: addrNonce
              })
            }
          }
        } catch (error) {
          logger.error(error)
          return resolveBoot(false)
        }
      }


    setInterval(async () => {
      if (!states.running[coreIdentifier]) {
        states.running[coreIdentifier] = true

        await parseNextBlock(cfgCollection, addrCollection)

        if (states.shuttingDown[coreIdentifier]) {
          states.readyToShutdown[coreIdentifier] = true
        } else {
          states.running[coreIdentifier] = false
        }
      }
    }, config.cores[coreIdentifier].parserDelay)

    resolveBoot(true)
  })
}

const ping = (app) => {
  return new Promise((resolve, reject) => {
    rpc.getBlockchainInfo()
      .then(result => {
        resolve(
          result
            ? {
              pong: true,
              meta: {
                blockHeight: BigNumber(result.blocks).toString()
              }
            }
            : { pong: false }
          )
      })
      .catch((err) => {
        logger.error(err)
        reject(err)
      })
  })
}

const getDepositAddress = (app, meta) => {
  return new Promise(async (resolve, reject) => {
    if (meta && meta.type && !walletTypes.includes(meta.type)) {
      return reject(new Error('Invalid wallet type!'))
    }

    const addrType = (meta && meta.type) ? meta.type : nodeNetworkType
    const $addrNonce = addrNonceCollection.findObject({
      $: addrType,
      appId: app.id
    })
    let keyPair
    let $addr = 'TRUTH_VALUE'

    while ($addr) {
      // derive wallet from mnemonic   
      const seed = await bip39.mnemonicToSeed(config.cores[coreIdentifier].wallet.mnemonic)
      const root = bip32.fromSeed(seed)
      const keyNode = root.derivePath(
        `m/44'/${addrType === 'mainnet' ? 0 : 1}'/${app.id}'/0/${$addrNonce.value}`
      )
      const keyNetwork = bitcoin.networks[
        addrType === 'mainnet'
          ? 'bitcoin'
          : 'testnet'
      ]
      keyNode.network = keyNetwork
      keyPair = {
        address: bitcoin.payments.p2pkh({
          pubkey: keyNode.publicKey,
          network: keyNetwork
        }).address,
        WIF: keyNode.toWIF()
      }
      $addr = addrCollection.findObject({
        $: keyPair.address
      })
      $addrNonce.value = BigNumber($addrNonce.value).plus(1).toString()
    }

    // encrypt wallet
    const key = crypto.pbkdf2Sync(config.cores[coreIdentifier].wallet.passphrase, 'salt', 10000, 32, 'sha512')
    const enckey = crypt.encrypt(key, keyPair.WIF)

    rpc.importAddress(keyPair.address, '', false)
      .then(res => {
        fs.writeFile(
          path.join(
            walletBasePath,
            addrType,
            app.id,
            keyPair.address
          ),
          JSON.stringify({
            address: keyPair.address,
            enckey
          }),
          (err) => {
            if (err) reject(err)

            addrCollection.insert({ $: keyPair.address })
            addrNonceCollection.update($addrNonce)
            resolve({ 
              address: keyPair.address,
              meta: { nonce: $addrNonce.value }
            })
          })
      })
      .catch((err) => {
        logger.error(err)
        reject(err)
      })
  })
}

const getWalletKey = (filePath, network) => {
  return new Promise((resolve, reject) => {
    try {
      const rawWallet = JSON.parse(fs.readFileSync(filePath, { encoding: 'UTF-8' }))
      const key = crypto.pbkdf2Sync(config.cores[coreIdentifier].wallet.passphrase, 'salt', 10000, 32, 'sha512')
      const decrypted = crypt.decrypt(key, rawWallet.enckey)
      
      resolve(decrypted)
    } catch (error) {
      reject(error)
    }
  })
}

const withdraw = (app, targets, meta) => {
  const report = []
  const amounts = {}
  const spendableUtxoContainers = []
  let totalValue = BigNumber(0)
  let spendableAmount = BigNumber(0)

  for (const target of targets) {
    amounts[target.address] = target.value
    totalValue = totalValue.plus(target.value)
  }

  return new Promise(async (resolve, reject) => {
    const keystoreFiles = glob.sync(`${path.join(walletBasePath, nodeNetworkType)}/${app.id}/*`)

    for (const file of keystoreFiles) {
      const fileName = file.replace(/^.*[\\\/]/, '')

      await rpc.listUnspent(1, 9999999, [fileName])
        .then(utxos => {
          for (const utxo of utxos) {
            if (utxo.safe) {
              spendableAmount = spendableAmount.plus(utxo.amount)
              spendableUtxoContainers.push({
                address: fileName,
                walletFilePath: file,
                network: nodeNetworkType,
                utxo
              })
            }

            if (spendableAmount.isGreaterThanOrEqualTo(totalValue)) break
          }
        })
      
      if (spendableAmount.isGreaterThanOrEqualTo(totalValue)) break
    }

    if (spendableAmount.isGreaterThanOrEqualTo(totalValue)) {
      let tx = new bitcore.Transaction()

      for (const i in spendableUtxoContainers) {
        const utxo = spendableUtxoContainers[i].utxo

        tx = tx
          .from({
            'txId': utxo.txid,
            'outputIndex': utxo.vout,
            'address': utxo.address,
            'script': utxo.scriptPubKey,
            'satoshis': BigNumber(utxo.amount)
              .times(Math.pow(10, 8))
              .toNumber()
          })
      }

      // change
      tx.change(spendableUtxoContainers[0].address)

      for (const target of targets) {
        tx.to(
          target.address,
          BigNumber(target.value)
            .times(Math.pow(10, 8))
            .toNumber()
        )
      }

      for (const i in spendableUtxoContainers) {
        const key = await getWalletKey(
          spendableUtxoContainers[i].walletFilePath,
          spendableUtxoContainers[i].network
        )

        tx = tx.sign(key)
      }
      rpc.sendRawTransaction(tx.serialize())
        .then(txid => {
          targets.forEach(t => {
            t.result = {
              txid,
              meta: {}
            }
          })

          resolve(targets)
        })
        .catch(err => {
          logger.warn(err)
          resolve(null)
        })
    } else {
      reject(new Error(`Spendable balance is not enough: ${spendableAmount.toFormat()}`))
    }
  })
}

const queryTransaction = (app, txid, meta) => {
  return new Promise((resolve, reject) => {
    rpc.getTransaction(txid, true)
      .then(tx => {
        resolve({
          txid: tx.txid,
          confirmations: BigNumber(tx.confirmations).toString()
        })
      })
      .catch((err) => {
        logger.error(err)
        reject(err)
      })
  })
}

const queryBalance = (app, address, meta) => {
  return new Promise((resolve, reject) => {
    const prom = address
      ? rpc.getReceivedByAddress(
        address,
        BigNumber(meta.confirmationTarget).toNumber() || 6
      )
      : rpc.getBalance(
        '*',
        BigNumber(meta.confirmationTarget).toNumber() || 6,
        meta.includeWatchonly || false
      )

      prom.then(balance => {
        resolve({
          balance
        })
      })
      .catch((err) => {
        logger.error(err)
        reject(err)
      })
  })
}

module.exports = {
  boot,
  ping,
  getDepositAddress,
  withdraw,
  queryTransaction,
  queryBalance
}
