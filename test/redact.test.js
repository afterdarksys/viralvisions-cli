import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { redact } from '../src/redact.js'

describe('redaction', () => {
  it('redacts bearer tokens and signed URL signatures', () => {
    const output = redact('Authorization: Bearer secret-token X-Amz-Signature=abc123')
    assert.doesNotMatch(output, /secret-token/)
    assert.doesNotMatch(output, /abc123/)
    assert.match(output, /REDACTED/)
  })
})
