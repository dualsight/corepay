# `POST` /:app/generate-deposit-address/:core
> 
<br />

## Structure

  - ### Params

    - app ***[string]*** -> app name
    - core ***[string]*** -> asset core name

  - ### Payload

    ```json
    {
      "address": "[string]? -> address to get balance for (to prevent including balances of all addresses)",
      "meta": "[object] -> additional params needed to query balance, if any"
    }
    ```

  - ### Result

    ```json
    {
      "balance": "[numstring] -> the queried balance"
    }
    ```
<br />

## Asset-specific Request Payload Params
### Bitcoin
- #### meta.confirmationTarget (optional, numstring, default=6)
  Only include balances from transactions with specified confirmation count.
- #### meta.includeWatchonly (optional, boolean, default=false)
  Only used if `address` is not specified. Include balances of watchonly addresses.

### Ethereum
- #### meta.contract (optional, string)
  Ethereum token smart contract address. If specified, implies that balance query is of specified token, otherwise Ether balance is queried.
<br />

## Asset-specific Response Payload Data
### Ethereum
- #### meta.network (string) -> "mainnet" || "testnet"
  The network type for which balance was queried against.
<br />

## Sample

  - ### Request
    `POST` http://127.0.0.1:8700/mycryptomall/get-deposit-address/ethereum
    
    ```json
    {
      "address": "0xfcf729b07c12a536f87ee801d3cd8a4c3d4632ea"
    }
    ```

  - ### Response
    
    - Success `200`

      ```json
      {
        "request": "/mycryptomall/get-deposit-address/ethereum",
        "error": null,
        "result": {
          "balance": "3.456003",
          "meta": {
            "network": "testnet"
          }
        }
      }
      ```