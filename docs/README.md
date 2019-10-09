# Corepay Documentation
> This documentation is a work in progress and only gets better with each update.

## Getting Started
### Prerequisites:
- Ensure you have installed Node.js v8+ & NPM with the command `node -v; npm -v`

### Install via NPM:
- `npm i -g corepay` to install Corepay.

### Manual Installation
- Download/clone this repository and `cd` to it.
- `npm run setup` to register current directory as Corepay installation (may require elevated privileges depending on Node.js installation).

### Corepay CLI
The Corepay CLI simpliflies controlling the Corepay daemon.
After successful setup, you may use the CLI from anywhere with command `corepay`. Unless you've manually created a configuration file, you'll need to run `corepay configure` to generate one for you. This will auto-generate and configure a `config.json` file in the installation directory with passphrases and mnemonics as well as the Corepay installation ID.

## Configuring Corepay
Corepay's configuration is JSON-based. The `config.json` file is how you configure Corepay. Corepay's CLI tool will auto-generate some configuration for you when you run `corepay configure`. It is paramount to backup the sensitive values in `config.json` before proceeding to run Corepay.

## Running Corepay
You may proceed to start the Corepay daemon with `corepay start`.

The following are basic Corepay CLI commands for controlling the Corepay daemon:
- `corepay start`: Starts Corepay daemon.
- `corepay status`: Reports Corepay daemon status.
- `corepay reload`: Safely restarts Corepay daemon (useful when you've changed configuration or updated Corepay).
- `corepay stop`: Safely stops Corepay daemon.

## API

### Client API
Corepay Client is the recommended way to connect to Corepay. It allows for commanding Corepay (invoking operations, e.g. `get-deposit-address`) and listening for events (e.g. `deposit_alert`) without having to fiddle with the underlying transport logic (HTTP API).

Official client modules:
- JavaScript: [https://github.com/dualsight/corepay-client](https://github.com/dualsight/corepay-client)

### HTTP API
Should you choose to fiddle with the underlying transport logic, the HTTP API is a RESTful JSON-based interface that can be invoked with any regular HTTP request library/tool. Note that Corepay allows to adjust or disable timeout on the underlying connection socket to favour operations that span long intervals, so it's up to you to configure your HTTP client to not timeout on Corepay's endpoints and configure Corepay to not timeout on lengthy requests.

All endpoints return the following payload structure:

```
{
  "request": string -> the original request URI,
  "error": null || {
    "message": null || string -> error message,
    "code": null || number -> error code,
    "name": null || string -> error name
  },
  "result": null || object -> result of the operation
}
```

All responses are delivered with HTTP success status `200` regardless of error occurence. You must explicitly check if the error placeholder in the payload is an object (signifying occurence of an error) or null (depicting absence of error).

All endpoints must be constructed as `/<app name>/<operation>/<asset core>`, where `<app name>` is an app you've defined in Corepay's configuration, `<operation>` is a supported Corepay operation and `<asset core>` is a supported asset core in Corepay.

For example, a `POST` request to `http://localhost:8700/mycryptomall/ping/bitcoin` with supported parameters would return a payload as described in [ping](./API/HTTP/ping.md).

All requests must carry a `X-Corepay-Signature` header. This is HMAC signature obtained by hashing the request payload with the app secret that corresponds to the request `<app name>` param. This is used to verify the integrity and authenticity of the request, to ensure that only your configured apps can access Corepay's endpoints. With Node.js, you could do the following:

  ```javascript
  const fetch = require('node-fetch')
  const CryptoJS = require('crypto-js')

  const payload = JSON.stringify({
    meta: {
      type: 'testnet'
    }
  })

  const hash = CryptoJS.HmacSHA1(
    payload,
    '<app secret as configured in Corepay>'
  ).toString(CryptoJS.enc.Hex)
  

  fetch('http://localhost:8700/mycryptomall/get-deposit-address/bitcoin', {
      method: 'post',
      body: payload,
      headers: {
        'Content-Type': 'application/json',
        'X-Corepay-Signature': `sha1=${hash}`
      },
  })
    .then(res => res.json())
    .then(json => console.log(json))
  ```
<br />

### Asset cores:
- bitcoin -> Bitcoin
- ethereum -> Ether and Ethereum-based assets

### Operations:
- [ping](./API/HTTP/ping.md) -> Probe the connected RPC provider. Returns metadata like current block height and sync status.
- [get-deposit-address](./API/HTTP/get-deposit-address.md) -> Get a deposit address that can be assigned to a user in your app.
- [withdraw](./API/HTTP/withdraw.md) -> Submit withdrawal requests (with the defined main wallet as benefactor, where applicable).
- [query-transaction](./API/HTTP/query-transaction.md) -> Get transaction status, confirmation count, etc.
- [query-balance](./API/HTTP/query-balance.md) -> Get the balance of a specific wallet or summation of all wallets mapped to app.

## Miscellaneous
- [Setup Bitcoin Core on AWS EC2](./guides/Setup%20Bitcoin%20Core%20on%20AWS%20EC2.md)
- [Setup Parity Ethereum on AWS EC2](./guides/Setup%20Parity%20Ethereum%20on%20AWS%20EC2.md)

## Notes
### Safety
- Be sure to backup any passhprases, mnemonics, etc. that are auto-generated by Corepay as there's no other way to recover them if lost.
### Security
- Despite inbuilt HMAC verification, you should setup firewall rules to grant access to Corepay to only designated apps.
- If Corepay is to be accessed outside localhost, you most definitely should put it behind a TLS-enabled proxy.
