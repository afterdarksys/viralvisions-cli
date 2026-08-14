import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { homedir } from 'node:os'

const DEFAULT_BASE_URL = 'https://viralvisions.io'

export function configPath(env = process.env) {
  if (env.VIRALVISIONS_CONFIG) return env.VIRALVISIONS_CONFIG
  const base = env.XDG_CONFIG_HOME || join(homedir(), '.config')
  return join(base, 'viralvisions', 'config.json')
}

export function defaultConfig(env = process.env) {
  return {
    currentContext: 'production',
    contexts: {
      production: {
        baseUrl: env.VIRALVISIONS_BASE_URL || DEFAULT_BASE_URL,
        accountLabel: 'production',
      },
    },
  }
}

export function loadConfig(env = process.env) {
  const path = configPath(env)
  if (!existsSync(path)) return defaultConfig(env)
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8'))
    return {
      ...defaultConfig(env),
      ...parsed,
      contexts: {
        ...defaultConfig(env).contexts,
        ...(parsed.contexts || {}),
      },
    }
  } catch {
    return defaultConfig(env)
  }
}

export function saveConfig(config, env = process.env) {
  const path = configPath(env)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 })
  return path
}

export function resolveContext(options = {}, env = process.env) {
  const config = loadConfig(env)
  const contextName = options.context || config.currentContext || 'production'
  const context = config.contexts[contextName] || config.contexts.production || { baseUrl: DEFAULT_BASE_URL }
  return {
    config,
    contextName,
    baseUrl: options.baseUrl || env.VIRALVISIONS_BASE_URL || context.baseUrl || DEFAULT_BASE_URL,
    token: env.VIRALVISIONS_TOKEN || context.token || null,
  }
}
