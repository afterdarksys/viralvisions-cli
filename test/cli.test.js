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

  it('routes publish through a dry-run unless --yes is supplied', async () => {
    const originalFetch = globalThis.fetch
    const calls = []
    globalThis.fetch = async (url, init) => {
      calls.push({ url, init })
      return new Response(JSON.stringify({ ok: true, apiVersion: 'v1', requestId: 'req_1', data: { dryRun: true }, warnings: [], next: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json', 'x-request-id': 'req_1' },
      })
    }
    try {
      const stdout = capture()
      const stderr = capture()
      const code = await run(['publish', 'post_1', '--account', 'acct_1', '--platform', 'youtube', '--dry-run', '--output', 'json'], {
        env: { VIRALVISIONS_TOKEN: 'token', VIRALVISIONS_BASE_URL: 'https://viralvisions.test' },
        stdout: stdout.stream,
        stderr: stderr.stream,
        stdin: { isTTY: false },
      })
      assert.equal(code, 0)
      assert.equal(calls[0].url, 'https://viralvisions.test/v1/posts/post_1/release')
      assert.equal(JSON.parse(calls[0].init.body).dryRun, true)
      assert.ok(calls[0].init.headers['Idempotency-Key'])
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})
