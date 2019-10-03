#!/bin/sh 
":" //; exec /usr/bin/env node "$0" "$@"

const { version } = require('./package.json')
const fs = require('fs')
const path = require('path')
const program = require('commander')
const screen = require('./lib/screen')
const runtime = require('./lib/runtime')

program
  .version(version)
  .option('-v, --version', 'print dPay version')

program
  .command('configure')
  .description('configure dPay')
  .action((env, options) => {
    require('./bootstrap')
  })

  program
    .command('start')
    .description('start dPay daemon')
    .action((env, options) => {
      runtime
        .start()
        .then((msg) => {
          screen.success(`dPay: ${msg}`)
          process.exit(0)
        })
        .catch((err) => {
          screen.error(`Failed to start dPay: ${err.message}`)
          process.exit(1)
        })
    })

  program
    .command('reload')
    .description('reload dPay daemon')
    .action(async (env, options) => {
      runtime
        .reload()
        .then((msg) => {
          screen.success(`dPay: ${msg}`)
          process.exit(0)
        })
        .catch((err) => {
          screen.error(`Failed to reload dPay: ${err.message}`)
          process.exit(1)
        })
    })

    program
      .command('stop')
      .description('stop dPay daemon')
      .action(async (env, options) => {
        runtime
          .stop()
          .then((msg) => {
            screen.success(`dPay: ${msg}`)
            process.exit(0)
          })
          .catch((err) => {
            screen.error(`Failed to stop dPay: ${err.message}`)
            process.exit(1)
          })
      })

program.parse(process.argv)
