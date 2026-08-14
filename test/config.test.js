import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, it } from 'node:test'
import { loadConfig, resolveContext, saveConfig } from '../src/config.js'

describe('config', () => {
  it('saves named contexts and resolves env overrides', () => {
    const dir = mkdtempSync(join(tmpdir(), 'vv-config-'))
    const env = {
      VIRALVISIONS_CONFIG: join(dir, 'config.json'),
      VIRALVISIONS_BASE_URL: 'http://localhost:3000',
      VIRALVISIONS_TOKEN: 'dev-token',
    }
    try {
      saveConfig({ currentContext: 'local', contexts: { local: { baseUrl: 'http://example.test' } } }, env)
      const loaded = loadConfig(env)
      assert.equal(loaded.currentContext, 'local')
      const resolved = resolveContext({}, env)
      assert.equal(resolved.baseUrl, 'http://localhost:3000')
      assert.equal(resolved.token, 'dev-token')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
