# `POST` /:app/generate-deposit-address/:core
> Generates/derives a new deposit address and returns the address.
<br />

## Structure

  - ### Params

    - app ***[string]*** -> app name
    - core ***[string]*** -> asset core name

  - ### Payload

    ```json
    {
      "meta": "[object] -> additional params needed for generating addresses, if any"
    }
    ```

  - ### Result

    ```json
    {
      "address": "[string] -> newly generated deposit address",
      "meta": "[object]? -> additional info about returned address"
    }
    ```
<br />

## Asset-specific Request Payload Params
### Bitcoin
- #### meta.addressType (optional, string) -> "legacy" || "p2sh-segwit" || "bech32"
  Address of specified type will be generated, otherwise type will default to `addresstype` bitcoind config.
<br />

## Asset-specific Response Payload Data
### Bitcoin
- #### meta.network (optional, string) -> "mainnet" || "testnet"
  If "mainnet" is returned, HD wallet derivation path will be `m/44'/60'/<app id>'/0/<address index>` and encrypted keystore file will be stored in `storage/wallets/bitcoin/mainnet/<app id>`. If "testnet" is returned, HD wallet derivation path will be `m/44'/1'/<app id>'/0/<address index>` and encrypted keystore file will be stored in `storage/wallets/bitcoin/testnet/<app id>`.

### Ethereum
- #### meta.network (optional, string) -> "mainnet" || "testnet"
  If "mainnet" is returned, HD wallet derivation path will be `m/44'/60'/<app id>'/0/<address index>` and encrypted keystore file will be stored in `storage/wallets/ethereum/mainnet/<app id>`. If "testnet" is returned, HD wallet derivation path will be `m/44'/1'/<app id>'/0/<address index>` and encrypted keystore file will be stored in `storage/wallets/ethereum/testnet/<app id>`.
- #### meta.nonce (numstring)
  The HD wallet address index of the returned address.
<br />

## Sample

  - ### Request
    `POST` http://127.0.0.1:8700/mycryptomall/get-deposit-address/ethereum
    
    ```json
    {}
    ```

  - ### Response
    
    - Success `200`

      ```json
      {
        "request": "/mycryptomall/get-deposit-address/ethereum",
        "error": null,
        "result": {
          "address": "0x80cdCc4e53eD1c4a4E124Ca12594cf41247a1481",
          "meta": {
            "network": "testnet",
            "nonce": "6"
          }
        }
      }
      ```
