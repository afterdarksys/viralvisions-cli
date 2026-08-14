import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { idempotencyKey, joinUrl } from '../src/api.js'

describe('api helpers', () => {
  it('joins base URLs and API paths without duplicate slashes', () => {
    assert.equal(joinUrl('https://viralvisions.io/', '/api/cli/doctor'), 'https://viralvisions.io/api/cli/doctor')
    assert.equal(joinUrl('https://viralvisions.io/', '/v1/accounts'), 'https://viralvisions.io/v1/accounts')
    assert.equal(joinUrl('http://localhost:3000', 'api/cli/doctor'), 'http://localhost:3000/api/cli/doctor')
  })

  it('generates idempotency keys with caller-visible prefixes', () => {
    assert.match(idempotencyKey('v1-posts'), /^v1-posts-[0-9a-f-]+$/)
  })
})
