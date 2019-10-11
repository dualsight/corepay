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
  .option('-v, --version', 'print Corepay version')

program
  .command('configure')
  .description('configure Corepay')
  .action((env, options) => {
    require('./bootstrap')
  })

  program
    .command('status')
    .description('Corepay daemon status')
    .action((env, options) => {
      runtime
        .status()
        .then((msg) => {
          screen.success(`Corepay: ${msg}`)
          process.exit(0)
        })
        .catch((err) => {
          screen.error(`Failed to check Corepay status: ${err.message}`)
          process.exit(1)
        })
    })

  program
    .command('start')
    .description('start Corepay daemon')
    .action((env, options) => {
      runtime
        .start()
        .then((msg) => {
          screen.success(`Corepay: ${msg}`)
          process.exit(0)
        })
        .catch((err) => {
          screen.error(`Failed to start Corepay: ${err.message}`)
          process.exit(1)
        })
    })

  program
    .command('reload')
    .description('reload Corepay daemon')
    .action(async (env, options) => {
      runtime
        .reload()
        .then((msg) => {
          screen.success(`Corepay: ${msg}`)
          process.exit(0)
        })
        .catch((err) => {
          screen.error(`Failed to reload Corepay: ${err.message}`)
          process.exit(1)
        })
    })

  program
    .command('restart')
    .description('restart Corepay daemon')
    .action(async (env, options) => {
      runtime
        .restart()
        .then((msg) => {
          screen.success(`Corepay: ${msg}`)
          process.exit(0)
        })
        .catch((err) => {
          screen.error(`Failed to restart Corepay: ${err.message}`)
          process.exit(1)
        })
    })

    program
      .command('stop')
      .description('stop Corepay daemon')
      .action(async (env, options) => {
        runtime
          .stop()
          .then((msg) => {
            screen.success(`Corepay: ${msg}`)
            process.exit(0)
          })
          .catch((err) => {
            screen.error(`Failed to stop Corepay: ${err.message}`)
            process.exit(1)
          })
      })

program.parse(process.argv)
