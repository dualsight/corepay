const config = require('../../lib/config')
const fs = require('fs')
const glob = require('glob')
const path = require('path')
const coreIdentifier = path.basename(path.dirname(__filename))
const push = require('../../lib/push')
const provider = require('./provider')
const rpc = (...args) => provider.send(...args)
const ethers = require('ethers')
const contractHelper = require('./contracts')
const abi = require('./abi')
const BigNumber = require('bignumber.js')
const storage = require('../../lib/db')()
const { stringEquals } = require('../../lib/utils')
const states = require('../../lib/states')
const logger = require('../../lib/logger')(`core:${coreIdentifier}`)
const walletTypes = [ 'mainnet', 'testnet' ]
const clientLib = {
  parity: require('./clients/parity'),
  geth: require('./clients/geth')
}
const walletBasePath = path.join(
  __dirname, '..', '..', 'storage', 'wallets', coreIdentifier
)
let cfgCollection
let addrCollection
let addrNonceCollection
let hotWallet
let nodeNetworkType

const parseTokenDeposits = (tx, receipt, addrCollection, highestBlock) => {
  let deposits = []
  const recipient = String(tx.to).toLowerCase()

  if (
    !stringEquals(tx.from, recipient) &&
    !stringEquals(tx.from, config.cores[coreIdentifier].wallet.sweeper)
  ) {
    const contractMeta = config
      .cores[coreIdentifier]
      .tokens[recipient]

    // if recipient is known contract address
    if (contractMeta) {
      deposits = contractHelper.parseDeposits(contractMeta.standard, addrCollection, receipt, contractMeta, highestBlock)
    }
  }

  return deposits
}

const parseBlockByHeight = (blockNumber, highestBlock, addrCollection, nodeClient) => {
  return new Promise(resolveBlock => {
    const blockProgress = BigNumber(blockNumber)
    const blockDeposits = []

    try {
      rpc(
        'eth_getBlockByNumber',
        [`0x${blockProgress.toString(16)}`, true]
      )
        .then(async block => {
          if (!block) {
            return resolveBlock([blockProgress, blockDeposits])
          }

          for (const tx of block.transactions) {
            await rpc(
              'eth_getTransactionReceipt',
              [tx.hash]
            )
              .then(receipt => {
                if (
                  // undefined in geth, null in parity
                  ![undefined, null].includes(receipt.status) &&
                  !BigNumber(receipt.status).isEqualTo(1)
                ) return

                return Promise.all([
                  // token deposits
                  parseTokenDeposits(tx, receipt, addrCollection, highestBlock),

                  // ETH deposits
                  clientLib[nodeClient.name].parseInternalDeposits(receipt, addrCollection, highestBlock)
                ])
                  .then(depositsWrapper => {
                    depositsWrapper.forEach(deposits => {
                      if (deposits.length) blockDeposits.push(...deposits)
                    })
                  })
                  .catch(err => {
                    logger.error(err)
                    return resolveBlock([blockProgress, blockDeposits])
                  })
              })
              .catch(err => {
                logger.error(err)
                return resolveBlock([blockProgress, blockDeposits])
              })
          }

          resolveBlock([blockProgress.plus(1), blockDeposits])
        })
          .catch(err => {
            logger.error(err)
            return resolveBlock([blockProgress, blockDeposits])
          })

      logger.info('Ethereum \u2714 Block', blockProgress.toString())
    } catch (e) {
      logger.error(e)
      resolveBlock([blockProgress, blockDeposits]) // reparse this block
    }
  })
}

const parseNextBlock = (cfgCollection, addrCollection, nodeClient) => {
  return new Promise(resolveRun => {
    rpc(
      'eth_blockNumber'
    ) // get current block height from node
      .then(async bh => {
        const blockHeight = BigNumber(bh)
        const [$bp, isInitial] = await new Promise(resolve => {
          // fetch block progress from storage
          const bp = cfgCollection.findObject({ $: 'block_progress' })

          if (bp) {
            resolve([bp, false])
          } else { // if progress doesn't exist, set initial
            const initialBlock = BigNumber(config.cores[coreIdentifier].initialBlockHeight)
            const newHeight = (initialBlock.isEqualTo(0) || initialBlock.isNaN())
              ? blockHeight.toString()
              : config.cores[coreIdentifier].initialBlockHeight

            resolve([cfgCollection.insert({ $: 'block_progress', value: newHeight }), true])
          }
        })

        // set block progress to current block height if unset
        let blockProgress = BigNumber($bp.value)
        if (blockProgress.isNaN() || (!isInitial && blockProgress.minus(1).isEqualTo(bh))) return resolveRun(true)

        const [nextBlockHeight, deposits] = await parseBlockByHeight(blockProgress, blockHeight, addrCollection, nodeClient)

        if (nextBlockHeight.isGreaterThan(blockProgress)) {
          // store progress in db
          $bp.value = nextBlockHeight.toString()
          cfgCollection.update($bp)

          // push deposits
          if (deposits.length > 0) {
            push('deposit_alert', deposits)

            // TODO: Sweep if configured
            // if (config.cores[coreIdentifier].wallet.sweeper) {
            //   targets = {}

            //   for (const deposit of deposits) {
            //     if (!targets[deposit.beneficiary]) {
            //       targets[deposit.beneficiary] = {}
            //     }

            //     if (!targets[deposit.beneficiary][deposit.symbol]) {
            //       targets[deposit.beneficiary][deposit.symbol] = BigNumber(0)
            //     }

            //     targets[deposit.beneficiary][deposit.symbol] = targets[deposit.beneficiary][deposit.symbol].plus(deposit.value)
            //   }

            //   sweep(targets)
            // }
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

// TODO: Implement sweep/consolidation logic
// const sweep = (targets) => {
//   console.log(JSON.stringify(targets))
// }

const boot = () => {
  return new Promise(async resolveBoot => {
    // step 1A: create/fetch stored config collection
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

    // step 1B: create/fetch stored address collection
    addrCollection = await new Promise(resolve => {
      storage.removeCollection(`${coreIdentifier}.addresses`)
      resolve(storage.addCollection(
        `${coreIdentifier}.addresses`),
        { unique: ['$'] }
      )
    })

    // step 1C: create/fetch address nonce collection
    addrNonceCollection = await new Promise(resolve => {
      storage.removeCollection(`${coreIdentifier}.address_nonces`)
      resolve(storage.addCollection(
        `${coreIdentifier}.address_nonces`)
      )
    })

    // step 2A: fetch client+version
    rpc(
      'web3_clientVersion',
      []
    )
      .then(async clientInfo => {
        let nodeClient

        clientInfo = clientInfo.toLowerCase()

        for (const client of Object.keys(clientLib)) {
          if (clientInfo.match(client)) {
            // step 2B: identify node client
            cfgCollection.remove(cfgCollection.find({ $: 'node_client' }))
            nodeClient = cfgCollection.insert({ $: 'node_client', name: client })
            break
          }
        }

        if (nodeClient) {
          // step 2C: identify node client network
          await rpc(
            'net_version',
            []
          )
            .then(async networkId => {
              const remoteId = BigNumber(networkId)
              const localId = config.cores[coreIdentifier].network.chainId

              if (!remoteId.isEqualTo(localId)) {
                logger.error(`Remote chain ID (${remoteId}) is different than configured chain ID (${localId})`)
                return resolveBoot(false)
              }

              nodeNetworkType = remoteId.isEqualTo(1)
                ? 'mainnet'
                : 'testnet'
            })
            .catch((err) => {
              logger.error(err)
              return resolveBoot(false)
            })

          // step 3A: read derived HD wallets
          if (!await new Promise(async resolve => {
            for (const walletType of walletTypes) {
              try {
                const dirs = Object.keys(config.apps).map(key => `${config.apps[key].id}`)
                
                for (const dir of dirs) {
                  fs.mkdirSync(path.join(walletBasePath, walletType, dir), { recursive: true })

                  const keystoreFiles = glob.sync(`${path.join(walletBasePath, walletType)}/${dir}/UTC--*`)
    
                  if (walletType === nodeNetworkType) {
                    for (const file of keystoreFiles) {
                      const addr = `0x${file.split('--')[2]}`.toLowerCase()
      
                      addrCollection.insert({$: addr, account: parseInt(dir) })
      
                      // step 3B: set hot wallet
                      if (stringEquals(
                        addr,
                        String(config.cores[coreIdentifier].wallet.main)
                      )) {
                        hotWallet = await new Promise((resolve, reject) => {
                          fs.readFile(file, { encoding: 'UTF-8' }, (err, data) => {
                            if (err) {
                              logger.error('Could not load hot wallet!')
                              return resolveBoot(false)
                            }
      
                            ethers.Wallet.fromEncryptedJson(
                              data.toString(),
                              config.cores[coreIdentifier].wallet.passphrase
                            )
                              .then(wallet => resolve(wallet.connect(provider)))
                              .catch(err => () => {
                                logger.error(err)
                                resolveBoot(false)
                              })
                          })
                        })
                      }
                    }
                  }
    
                  // step 3C: set address nonce for sequencial HD derivations
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

            resolve(true)
          })) {
            return resolveBoot(false)
          }

          // step 4: start parsing blocks 
          setInterval(async () => {
            if (!states.running[coreIdentifier]) {
              states.running[coreIdentifier] = true
  
              await parseNextBlock(cfgCollection, addrCollection, nodeClient)
  
              if (states.shuttingDown[coreIdentifier]) {
                states.readyToShutdown[coreIdentifier] = true
              } else {
                states.running[coreIdentifier] = false
              }
            }
          }, config.cores[coreIdentifier].parserDelay)
  
          resolveBoot(`${clientInfo}#${nodeNetworkType}`)
        } else {
          logger.error(new Error(`Unsupported Ethereum Client: ${clientInfo}`))
          return resolveBoot(false)
        }
      })
      .catch((err) => {
        logger.error(err)
        return resolveBoot(false)
      })
  })
}

const ping = (app) => {
  return new Promise((resolve, reject) => {
    rpc(
      'eth_syncing',
      []
    )
      .then(result => {
        const response = {
          pong: true
        }

        if (result) {
          response.meta = {
            network: nodeNetworkType,
            syncing: true,
            blockHeight: BigNumber(result.currentBlock).toString()
          }
        }
        
        resolve(response)
      })
      .catch((err) => {
        logger.error(err)
        reject(err)
      })
  })
}

const getDepositAddress = (app, meta) => {
  return new Promise(async (resolve, reject) => {
    const $addrNonce = addrNonceCollection.findObject({
      $: nodeNetworkType,
      appId: app.id
    })
    let wallet
    let $addr = 'TRUTH_VALUE'

    while ($addr) {
      // derive wallet from mnemonic
      wallet = ethers.Wallet.fromMnemonic(
        config.cores[coreIdentifier].wallet.mnemonic,
        `m/44'/${nodeNetworkType === 'testnet' ? 1 : 60}'/${app.id}'/0/${$addrNonce.value}`
      )
      $addr = addrCollection.findObject({
        $: String(wallet.signingKey.address).toLowerCase()
      })
      $addrNonce.value = BigNumber($addrNonce.value).plus(1).toString()
    }

    // encrypt wallet
    wallet.encrypt(config.cores[coreIdentifier].wallet.passphrase)
      .then(json => {
        const rawWallet = JSON.parse(json)

        fs.writeFile(
          path.join(
            walletBasePath,
            nodeNetworkType,
            app.id,
            rawWallet['x-ethers'].gethFilename
          ),
          json,
          (err) => {
            if (err) reject(err)

            addrCollection.insert({ $: String(wallet.signingKey.address).toLowerCase(), account: parseInt(app.id) })
            addrNonceCollection.update($addrNonce)
            resolve({ 
              address: wallet.signingKey.address,
              meta: {
                network: nodeNetworkType,
                nonce: $addrNonce.value
              }
            })
          })
      })
      .catch((err) => {
        logger.error(err)
        reject(err)
      })
  })
}

const withdraw = async (app, transfers, meta) => {
  return new Promise(async (resolveWithdrawal, rejectWithdrawal) => {
    if (hotWallet && hotWallet.signingKey) {
      const report = []
      let nonce = BigNumber(await new Promise(resolve => {
        provider.getTransactionCount(hotWallet.signingKey.address, 'pending')
          .then(num => resolve(num))
          .catch(err => { return rejectWithdrawal(err) })
      }))

      for (const transfer of transfers) {
        const chainId = BigNumber(
          config.cores[coreIdentifier].network.chainId
        ).toNumber()

        transfer.meta = transfer.meta || {}
        transfer.meta.network = nodeNetworkType
        transfer.receipt = await new Promise(resolveReceipt => {
          if (transfer.meta.contract) { // is token transfer
            const contractAddr = String(transfer.meta.contract).toLowerCase()
            const contractMeta = config
              .cores[coreIdentifier]
              .tokens[contractAddr]
            
            if (contractMeta) {
              const contract = new ethers.Contract(
                contractAddr,
                abi.get(contractMeta.symbol, contractMeta.standard),
                hotWallet
              )

              new Promise((resolve, reject) => {
                switch (contractMeta.standard) {
                  case 'ERC-20': {
                    return resolve(contract.transfer(
                      transfer.address,
                      ethers.utils.parseUnits(transfer.value, contractMeta.decimals),
                      {
                        nonce: `0x${nonce.toString(16)}`,
                        chainId
                      }
                    ))
                  }
                  case 'ERC-721': {
                    if (transfer.meta.data) {
                      return resolve(contract['safeTransferFrom(address,address,uint256,bytes)'](
                        hotWallet.signingKey.address,
                        transfer.address,
                        ethers.utils.parseUnits(transfer.value, contractMeta.decimals),
                        transfer.meta.data,
                        {
                          nonce: `0x${nonce.toString(16)}`,
                          chainId
                        }
                      ))
                    } else {
                      return resolve(contract['safeTransferFrom(address,address,uint256)'](
                        hotWallet.signingKey.address,
                        transfer.address,
                        ethers.utils.parseUnits(transfer.value, contractMeta.decimals),
                        {
                          nonce: `0x${nonce.toString(16)}`,
                          chainId
                        }
                      ))
                    }
                  }
                  default: return reject(new Error('Unsupported token standard!'))
                }
              })
                .then(tx => {
                  nonce = nonce.plus(1)
                  resolveReceipt({
                    txid: tx.hash,
                    meta: {
                      mined: tx.blockNumber || false
                    }
                  })
                })
                .catch(err => {
                  logger.warn(err)
                  resolveReceipt(null)
                })
            } else {
              logger.warn(new Error('Target contract:', transfer.meta.contract, 'not configured!'))
              resolveReceipt(null)
            }
          } else { // is Ether transfer
            const tx = {
              to: transfer.address,
              gasPrice: provider.getGasPrice(),
              nonce: `0x${nonce.toString(16)}`,
              data: transfer.meta.data || '0x',
              value: ethers.utils.parseUnits(transfer.value, 18),
              chainId
            }
            tx.gasLimit = provider.estimateGas(tx)

            hotWallet.sign(tx)
              .then(signedTx => {
                provider.sendTransaction(signedTx)
                  .then(tx => {
                    nonce = nonce.plus(1)
                    resolveReceipt({ mined: tx.blockNumber || false, txid: tx.hash })
                  })
                  .catch(err => {
                    logger.warn(err)
                    resolveReceipt(null)
                  })
              })
              .catch(err => resolveReceipt(null))
          }
        })

        report.push(transfer)
      }

      resolveWithdrawal(report)
    } else {
      return rejectWithdrawal(new Error('Hot wallet is undefined!'))
    }
  })
}

const queryTransaction = (app, txid, meta) => {
  return new Promise((resolve, reject) => {
    provider.getTransactionReceipt(txid)
      .then(receipt => {
        resolve({
          txid: receipt.transactionHash,
          confirmations: BigNumber(receipt.confirmations).toString()
        })
      })
      .catch((err) => {
        logger.error(err)
        reject(err)
      })
  })
}

const queryBalance = (app, address, meta) => {
  return new Promise(async (resolveQuery, rejectQuery) => {
    let balance = BigNumber(0)
    let keystoreFiles

    if (address) {
      keystoreFiles = glob.sync(
        path.join(walletBasePath, nodeNetworkType, app.id) +
        `/UTC--*--${String(address).toLowerCase().substr(2)}`
      )

      if (!keystoreFiles || !keystoreFiles.length) {
        return rejectQuery(new Error('No such wallet address is associated with app!'))
      }
    } else {
      keystoreFiles = glob.sync(
        `${path.join(walletBasePath, nodeNetworkType, app.id)}/UTC--*`
      )
    }

    if (meta && meta.contract) { // is token
      const contractAddr = String(meta.contract).toLowerCase()
      const contractMeta = config
        .cores[coreIdentifier]
        .tokens[contractAddr]
      
      if (contractMeta) {
        const contract = new ethers.Contract(
          contractAddr,
          abi.get(contractMeta.symbol, contractMeta.standard),
          hotWallet
        )

        for (const file of keystoreFiles) {
          const addr = `0x${file.split('--')[2]}`
          await contract.balanceOf(addr)
            .then(rawBalance => {
              balance.plus(ethers.utils.formatUnits(rawBalance, contractMeta.decimals))
            })
            .catch(err => rejectQuery(err))
        }
  
        resolve({
          balance
        })
      } else {
        rejectQuery(new Error('Queried contract:', meta.contract, 'not configured!'))
      }
    } else { // is Ether
      for (const file of keystoreFiles) {
        const addr = `0x${file.split('--')[2]}`
        await provider.getBalance(addr)
          .then(rawBalance => {
            balance = balance.plus(ethers.utils.formatUnits(rawBalance, 18))
          })
          .catch(err => rejectQuery(err))
      }

      resolveQuery({
        balance,
        meta: { network: nodeNetworkType }
      })
    }
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
