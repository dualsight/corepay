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
  .option('-v, --version', 'print corepay version')

program
  .command('configure')
  .description('configure corepay')
  .action((env, options) => {
    require('./bootstrap')
  })

  program
    .command('status')
    .description('corepay daemon status')
    .action((env, options) => {
      runtime
        .status()
        .then((msg) => {
          screen.success(`corepay: ${msg}`)
          process.exit(0)
        })
        .catch((err) => {
          screen.error(`Failed to check corepay status: ${err.message}`)
          process.exit(1)
        })
    })

  program
    .command('start')
    .description('start corepay daemon')
    .action((env, options) => {
      runtime
        .start()
        .then((msg) => {
          screen.success(`corepay: ${msg}`)
          process.exit(0)
        })
        .catch((err) => {
          screen.error(`Failed to start corepay: ${err.message}`)
          process.exit(1)
        })
    })

  program
    .command('reload')
    .description('reload corepay daemon')
    .action(async (env, options) => {
      runtime
        .reload()
        .then((msg) => {
          screen.success(`corepay: ${msg}`)
          process.exit(0)
        })
        .catch((err) => {
          screen.error(`Failed to reload corepay: ${err.message}`)
          process.exit(1)
        })
    })

    program
      .command('stop')
      .description('stop corepay daemon')
      .action(async (env, options) => {
        runtime
          .stop()
          .then((msg) => {
            screen.success(`corepay: ${msg}`)
            process.exit(0)
          })
          .catch((err) => {
            screen.error(`Failed to stop corepay: ${err.message}`)
            process.exit(1)
          })
      })

program.parse(process.argv)
