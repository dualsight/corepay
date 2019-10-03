# `POST` /:app/ping/:core
> Probes the connected RPC provider. Returns metadata like current block height.
<br />

## Structure

  - ### Params

    - app ***[string]*** -> app name
    - core ***[string]*** -> asset core name

  - ### Payload

    ```json
    {}
    ```

  - ### Result

    ```json
    {
      "pong": "[boolean] -> true if node was reachable",
      "meta": "[object]? -> additional info about returned address"
    }
    ```
<br />

## Asset-specific Response Payload Data
### Bitcoin
- #### meta.blockHeight (numstring)
  Current block height of node.

### Ethereum
- #### meta.syncing (boolean)
  Indicates that node is presently syncing new blocks.
- #### meta.blockHeight (numstring)
  Current block height of node.
<br />

## Sample

  - ### Request
    `POST` http://127.0.0.1:8700/mycryptomall/ping/ethereum
    
    ```json
    {}
    ```

  - ### Response
    
    - Success `200`

      ```json
      {
        "request": "/mycryptomall/ping/ethereum",
        "error": null,
        "result": {
          "pong": true,
          "meta": {
            "syncing": true,
            "blockHeight": "8848099"
          }
        }
      }
      ```
