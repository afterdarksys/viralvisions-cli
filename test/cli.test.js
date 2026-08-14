import assert from 'node:assert/strict'
import { Writable } from 'node:stream'
import { describe, it } from 'node:test'
import { run } from '../src/cli.js'

function capture() {
  let data = ''
  return {
    stream: new Writable({
      write(chunk, _encoding, callback) {
        data += chunk.toString()
        callback()
      },
    }),
    get data() {
      return data
    },
  }
}

describe('cli', () => {
  it('prints help', async () => {
    const stdout = capture()
    const stderr = capture()
    const code = await run(['help'], { env: {}, stdout: stdout.stream, stderr: stderr.stream, stdin: { isTTY: false } })
    assert.equal(code, 0)
    assert.match(stdout.data, /Usage:/)
  })

  it('prints help with --help', async () => {
    const stdout = capture()
    const stderr = capture()
    const code = await run(['--help'], { env: {}, stdout: stdout.stream, stderr: stderr.stream, stdin: { isTTY: false } })
    assert.equal(code, 0)
    assert.match(stdout.data, /Usage:/)
  })

  it('returns valid JSON errors without a token', async () => {
    const stdout = capture()
    const stderr = capture()
    const code = await run(['doctor', '--output', 'json'], { env: {}, stdout: stdout.stream, stderr: stderr.stream, stdin: { isTTY: false } })
    assert.equal(code, 1)
    const parsed = JSON.parse(stdout.data)
    assert.equal(parsed.ok, false)
    assert.match(parsed.error.message, /Not authenticated/)
  })

  it('requires --yes for creator DNA reset', async () => {
    const stdout = capture()
    const stderr = capture()
    const code = await run(['creator-dna', 'reset'], {
      env: { VIRALVISIONS_TOKEN: 'token' },
      stdout: stdout.stream,
      stderr: stderr.stream,
      stdin: { isTTY: false },
    })
    assert.equal(code, 1)
    assert.match(stderr.data, /requires --yes/)
  })

  it('requires a job id for jobs show', async () => {
    const stdout = capture()
    const stderr = capture()
    const code = await run(['jobs', 'show'], {
      env: { VIRALVISIONS_TOKEN: 'token' },
      stdout: stdout.stream,
      stderr: stderr.stream,
      stdin: { isTTY: false },
    })
    assert.equal(code, 1)
    assert.match(stderr.data, /requires a job id/)
  })
})
