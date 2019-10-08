# Corepay
> A unified, secure and painless self-hosted cryptocurrency payments processor.

## Introduction
### Overview
Integrating payments into applications is practically tedious, unless one is to leverage 3rd party solutions, which packs its own layer of issues among which security, trust (relying on 3rd party solutions) and privacy (KYC requirements by the 3rd party) stand out.

Integrating trustless cryptocurrency payment solutions can be painfully difficult. Security with crypto-based payment systems is no different than traditional payment systems: It depends on several factors beyond the scope of this project.

### How It Works
Corepay server communicates with self-hosted cryptocurrency network nodes like [Bitcoin Core](https://bitcoin.org/en/bitcoin-core), [Go Ethereum](https://geth.ethereum.org) and [Parity Ethereum](https://www.parity.io) primarily over RPC, so in order to enable support for an asset, you'll have to setup a network node client Corepay can talk to.

<p align="center">
  <img src="https://user-images.githubusercontent.com/12427840/66406300-51c19580-e9e3-11e9-8b11-f889b971a8c4.png" alt="Corepay diagram" />
</p>

Corepay uses several mechanisms to monitor blockchain networks and reports transactions you can interpret as deposits. It also packs other features that complete a funds management system.

### Major Features
- Wallet: Can generate wallet addresses for all supported assets via a common API.
- Deposits: Reports incoming transactions for known addresses and status/network confirmations for the concerned transactions.
- Withdrawals: Provides a common, painless API for transferring assets, as well as verifying the transfer transactions.

### Why Corepay?
The volume of code in this repository alone is reason enough for this project to thrive. Corepay aims to mitigate having to write lengthy logic/code for every blockchain and/or network you wish to integrate into your application's funds system.

## Networks & Assets
The following table shows implemented assets and support for address generation (AG), deposits (D), deposit tracking (DT), withdrawals (W) and withdrawal tracking (WT):

| Asset | Network | AG | D | DT | W | WT |
|--|--|--|--|--|--|--|
| BTC | Bitcoin | ✓ | ✓ | ✓ | ✓ | ✓ |
| ETH | Ethereum | ✓ | ✓ | ✓ | ✓ | ✓ |
| ERC-20 standard tokens | Ethereum | ✓ | ✓ | ✓ | ✓ | ✓ |
| ERC-721 standard tokens | Ethereum | ✓ | ✓ | ✓ | ✓ | ✓ |

## Requirements
- Bitcoin
  - RPC-enabled Bitcoin node instance (tested with Bitcoin Core 0.18.0)
- Ethereum
  - RPC-enabled...
    - Parity Ethereum 1.1+ (`pruning="archive"`, `tracing="on"`) **or**
    - Go Ethereum 1.8+ (`gcmode="archive"`, `syncmode="fast"`/`syncmode="full"`)

## Documentation
Usage guide and API documentation are available [here](./docs).

## Donations
You can support development and maintenance of this project by donating to:
- Bitcoin (BTC): `3QVi82eVK2q1juGYvcyQ91pMviSaehumU7`
- Ethereum (ETH): `0xbBBdA47c935cf767286C8bB4006c5F426Cd7e6A1`
