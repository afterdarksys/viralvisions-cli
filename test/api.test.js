import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { joinUrl } from '../src/api.js'

describe('api helpers', () => {
  it('joins base URLs and API paths without duplicate slashes', () => {
    assert.equal(joinUrl('https://viralvisions.io/', '/api/cli/doctor'), 'https://viralvisions.io/api/cli/doctor')
    assert.equal(joinUrl('http://localhost:3000', 'api/cli/doctor'), 'http://localhost:3000/api/cli/doctor')
  })
})
