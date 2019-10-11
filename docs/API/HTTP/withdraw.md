# `POST` /:app/withdraw/:core
> Withdraw assets to any valid wallets.
<br />

## Structure

  - ### Params

    - app ***[string]*** -> app name
    - core ***[string]*** -> asset core name

  - ### Payload

    ```json
    {
      "transfers": [
        {
          "address": "[string] -> beneficiary address",
          "value": "[numstring] -> amount or token ID",
          "meta": "[object]? -> additional info about transfer"
        }
        ...
      ]
    }
    ```

  - ### Result

    ```json
    [
      {
        "address": "[string] -> beneficiary address",
        "value": "[numstring] -> amount or token ID",
        "meta": "[object]? -> additional info about transfer",
        "receipt": {
          "txid": "[string || null] -> transaction ID",
          "meta": "[object]? -> additional info about transaction"
        }
      }
      ...
    ]
    ```
<br />

## Asset-specific Request Payload Params
### Ethereum
- #### transfers[i].meta.contract (optional, string)
  Ethereum token smart contract address. If specified, it implies that this transfer is of the the specified token, otherwise transfer is considered an Ether transfer.
- #### transfers[i].meta.chainId (optional, numstring)
  Override preferred chain ID config. 
<br />

## Asset-specific Response Payload Data
### Ethereum
- #### [i].receipt.meta.mined (boolean)
  True if transaction has been included in a block, false if otherwise.
<br />

## Sample

  - ### Request
    `POST` http://127.0.0.1:8700/mycryptomall/withdraw/ethereum
    
    ```json
    {
      "transfers": [
        {
          "address": "0x03ddfc2629051415ba8cc63c8db4281344abcf06",
          "value": "0.01"
        },
        {
          "address": "0xfcf729b07c12a536f87ee801d3cd8a4c3d4632ea",
          "value": "312",
          "meta": { "contract": "0x5F9b34613D685e5c2b80c453C38cD8Dab0AC7814" }
        }
      ]
    }
    ```

  - ### Response
    
    - Success `200`

      ```json
      {
        "request": "/mycryptomall/withdraw/ethereum",
        "error": null,
        "result": [
          {
            "address": "0x03ddfc2629051415ba8cc63c8db4281344abcf06",
            "value": "0.01",
            "meta": {
              "network": "testnet"
            },
            "receipt": {
              "txid": "0x73903678e19a36503953993ae5d479e9a2e531206a49361a7d795dd7dc9f205c",
              "meta": {
                "mined": false,
                "log": "Success."
              }
            }
          },
          {
            "address": "0xfcf729b07c12a536f87ee801d3cd8a4c3d4632ea",
            "value": "311",
            "meta": {
              "network": "testnet",
              "contract": "0x5F9b34613D685e5c2b80c453C38cD8Dab0AC7814"
            },
            "receipt": {
              "txid": "0x2e7d451a5e3f44080349854235bb740594ddb172118fe09d261a883e1c8d6022",
              "meta": {
                "mined": false,
                "log": "Success."
              }
            }
          }
        ]
      }
      ```
