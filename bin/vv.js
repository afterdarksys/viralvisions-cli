#!/usr/bin/env node
import { run } from '../src/cli.js'

run(process.argv.slice(2), {
  env: process.env,
  stdin: process.stdin,
  stdout: process.stdout,
  stderr: process.stderr,
}).then((code) => {
  process.exitCode = code
}).catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 1
})
