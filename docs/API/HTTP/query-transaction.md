# `POST` /:app/query-transaction/:core
> Probes the connected RPC provider. Returns metadata like current block height.
<br />

## Structure

  - ### Params

    - app ***[string]*** -> app name
    - core ***[string]*** -> asset core name

  - ### Payload

    ```json
    {
      "txid": "[string] -> transaction ID"
    }
    ```

  - ### Result

    ```json
    {
      "txid": "[string] -> transaction ID",
      "confirmations": "[numstring] -> confirmation count",
      "meta": "[object]? -> additional info"
    }
    ```
<br />

## Sample

  - ### Request
    `POST` http://127.0.0.1:8700/mycryptomall/query-transaction/ethereum
    
    ```json
    {
      "txid": "0x2e7d451a5e3f44080349854235bb740594ddb172118fe09d261a883e1c8d6022"
    }
    ```

  - ### Response
    
    - Success `200`

      ```json
      {
        "request": "/mycryptomall/query-transaction/ethereum",
        "error": null,
        "result": {
          "txid": "0x2e7d451a5e3f44080349854235bb740594ddb172118fe09d261a883e1c8d6022",
          "confirmations": "454",
          "meta": {
            "network": "testnet"
          }
        }
      }
      ```
