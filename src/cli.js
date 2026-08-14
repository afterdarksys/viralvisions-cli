import { existsSync, statSync } from 'node:fs'
import { resolveContext, loadConfig, saveConfig } from './config.js'
import { apiRequest, idempotencyKey } from './api.js'
import { parseOutput, render } from './output.js'
import { redact } from './redact.js'

const HELP = `vv - ViralVisions CLI

Usage:
  vv <command> [options]

Global options:
  --base-url <url>       Override API base URL
  --context <name>       Use named context
  --output <format>      table, json, jsonl, yaml
  --quiet                Reduce human output
  --no-color             Disable color
  --request-id <id>      Set request id
  --timeout <ms>         Request timeout in milliseconds

Commands:
  auth status
  auth whoami
  context list|show|use <name>|set <name> --base-url <url>
  accounts readiness
  trends opportunities
  trends intelligence
  trends use <trend-id>
  creator-dna show|refresh|export|set|reset|delete
  analyze video --content-id <id>|--media-asset-id <id>|--scheduled-post-id <id>
  experiments list|create|winner <id>
  metrics product
  predictions calibration
  content validate --content-id <id>|--scheduled-post-id <id>
  distribution dry-run --scheduled-post-id <id> --account <id> --platform <name>
  jobs show <id>
  doctor
`

function parseArgs(args) {
  const globals = {
    output: 'table',
    quiet: false,
    noColor: false,
    yes: false,
    dryRun: false,
    flags: {},
    positionals: [],
  }
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]
    if (!arg.startsWith('--')) {
      globals.positionals.push(arg)
      continue
    }
    const name = arg.slice(2)
    if (['help', 'version'].includes(name)) {
      globals.positionals.push(name)
      continue
    }
    if (['quiet', 'no-color', 'yes', 'dry-run'].includes(name)) {
      if (name === 'no-color') globals.noColor = true
      else globals[name.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = true
      continue
    }
    const value = args[i + 1]
    if (value === undefined || value.startsWith('--')) throw new Error(`Missing value for --${name}`)
    i += 1
    const key = name.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
    globals[key] = value
    globals.flags[key] = value
  }
  globals.output = parseOutput(globals.output)
  globals.timeoutMs = Number(globals.timeout || 30000)
  return globals
}

function requireToken(context) {
  if (!context.token) {
    throw new Error('Not authenticated. Set VIRALVISIONS_TOKEN or add a token to your context.')
  }
}

function mustConfirm(options, action) {
  if (!options.yes && !process.stdin.isTTY) {
    throw new Error(`${action} requires --yes in non-interactive mode.`)
  }
  if (!options.yes) {
    throw new Error(`${action} requires --yes for this first CLI version.`)
  }
}

async function request(options, api, method, path, body, mutation = false) {
  return apiRequest({
    ...api,
    method,
    path,
    body,
    timeoutMs: options.timeoutMs,
    requestId: options.requestId,
    idempotency: mutation ? (options.idempotencyKey || idempotencyKey(path.split('/').filter(Boolean).join('-'))) : undefined,
  }).then((result) => result.body)
}

function flag(options, name) {
  return options.flags[name] ?? options[name]
}

function bodyFromJsonFlag(options) {
  const raw = flag(options, 'json')
  if (!raw) return null
  return JSON.parse(raw)
}

function outputValue(io, options, value) {
  if (options.quiet && options.output === 'table') {
    io.stdout.write(`${value?.data?.id || value?.data?.experiment?.id || value?.requestId || 'ok'}\n`)
    return
  }
  render({ stdout: io.stdout, output: options.output, value })
}

export async function run(args, io) {
  const options = parseArgs(args)
  const [area, command, subcommand] = options.positionals
  if (!area || area === 'help' || area === '--help' || area === '-h') {
    io.stdout.write(HELP)
    return 0
  }

  const context = resolveContext(options, io.env)
  const api = {
    baseUrl: context.baseUrl,
    token: context.token,
  }

  try {
    let value
    if (area === 'context') value = await contextCommand(command, subcommand, options, io)
    else {
      requireToken(context)
      value = await authenticatedCommand(area, command, subcommand, options, api)
    }
    outputValue(io, options, value)
    return 0
  } catch (error) {
    const message = redact(error instanceof Error ? error.message : String(error))
    if (options.output === 'json') {
      render({
        stdout: io.stdout,
        output: 'json',
        value: { ok: false, error: { code: 'cli_error', message } },
      })
    } else {
      io.stderr.write(`${message}\n`)
    }
    return 1
  }
}

async function contextCommand(command, subcommand, options, io) {
  const config = loadConfig(io.env)
  if (command === 'list') return { contexts: Object.keys(config.contexts), currentContext: config.currentContext }
  if (command === 'show' || !command) return { currentContext: config.currentContext, context: config.contexts[config.currentContext] }
  if (command === 'use') {
    if (!subcommand) throw new Error('context use requires a context name')
    if (!config.contexts[subcommand]) throw new Error(`Unknown context: ${subcommand}`)
    config.currentContext = subcommand
    const path = saveConfig(config, io.env)
    return { ok: true, data: { currentContext: subcommand, configPath: path }, warnings: [], next: [] }
  }
  if (command === 'set') {
    if (!subcommand) throw new Error('context set requires a context name')
    const baseUrl = flag(options, 'baseUrl')
    if (!baseUrl) throw new Error('context set requires --base-url')
    config.contexts[subcommand] = { ...(config.contexts[subcommand] || {}), baseUrl }
    config.currentContext = subcommand
    const path = saveConfig(config, io.env)
    return { ok: true, data: { context: subcommand, baseUrl, configPath: path }, warnings: [], next: [] }
  }
  throw new Error(`Unknown context command: ${command}`)
}

async function authenticatedCommand(area, command, subcommand, options, api) {
  if (area === 'auth' && (command === 'status' || command === 'whoami')) return request(options, api, 'GET', '/api/cli/doctor')
  if (area === 'doctor') return request(options, api, 'GET', '/api/cli/doctor')
  if (area === 'capabilities') return request(options, api, 'GET', '/api/cli/capabilities')
  if (area === 'accounts' && (!command || command === 'readiness' || command === 'list')) return request(options, api, 'GET', '/api/accounts/readiness')
  if (area === 'metrics' && command === 'product') return request(options, api, 'GET', '/api/metrics/product')
  if (area === 'predictions' && command === 'calibration') return request(options, api, 'GET', '/api/learning/predictions')
  if (area === 'jobs' && (command === 'show' || command)) {
    const jobId = command === 'show' ? subcommand : command
    if (!jobId) throw new Error('jobs show requires a job id')
    return request(options, api, 'GET', `/api/cli/jobs/${encodeURIComponent(jobId)}`)
  }

  if (area === 'trends') {
    if (!command || command === 'opportunities' || command === 'list') return request(options, api, 'GET', '/api/viral-trends/opportunities')
    if (command === 'intelligence') return request(options, api, 'GET', '/api/viral-trends/intelligence')
    if (command === 'use') {
      if (!subcommand) throw new Error('trends use requires a trend id')
      return request(options, api, 'POST', `/api/viral-trends/${encodeURIComponent(subcommand)}/use`, {}, true)
    }
  }

  if (area === 'creator-dna') {
    if (!command || command === 'show') return request(options, api, 'GET', '/api/creator-dna')
    if (command === 'export') return request(options, api, 'GET', '/api/creator-dna?export=true')
    if (command === 'refresh') return request(options, api, 'POST', '/api/creator-dna', {}, true)
    if (command === 'set') {
      const body = {
        ...(flag(options, 'tone') ? { tone: flag(options, 'tone') } : {}),
        ...(flag(options, 'positioning') ? { positioning: flag(options, 'positioning') } : {}),
        ...(flag(options, 'brandTerm') ? { brandTerms: [flag(options, 'brandTerm')] } : {}),
        ...(flag(options, 'bannedPhrase') ? { bannedPhrases: [flag(options, 'bannedPhrase')] } : {}),
      }
      return request(options, api, 'PATCH', '/api/creator-dna', body, true)
    }
    if (command === 'reset') {
      mustConfirm(options, 'creator-dna reset')
      return request(options, api, 'PATCH', '/api/creator-dna', { resetLearnedData: true }, true)
    }
    if (command === 'delete') {
      mustConfirm(options, 'creator-dna delete')
      return request(options, api, 'DELETE', '/api/creator-dna', undefined, true)
    }
  }

  if (area === 'analyze' && command === 'video') {
    const body = {
      ...(flag(options, 'contentId') ? { contentId: flag(options, 'contentId') } : {}),
      ...(flag(options, 'mediaAssetId') ? { mediaAssetId: flag(options, 'mediaAssetId') } : {}),
      ...(flag(options, 'scheduledPostId') ? { scheduledPostId: flag(options, 'scheduledPostId') } : {}),
    }
    if (!body.contentId && !body.mediaAssetId && !body.scheduledPostId) throw new Error('analyze video requires --content-id, --media-asset-id, or --scheduled-post-id')
    return request(options, api, 'POST', '/api/video-coach/analyze', body, true)
  }

  if (area === 'content' && command === 'validate') {
    const body = {
      ...(flag(options, 'contentId') ? { contentId: flag(options, 'contentId') } : {}),
      ...(flag(options, 'scheduledPostId') ? { scheduledPostId: flag(options, 'scheduledPostId') } : {}),
      ...(flag(options, 'account') ? { accountIds: [flag(options, 'account')] } : {}),
      ...(flag(options, 'platform') ? { platforms: [flag(options, 'platform')] } : {}),
    }
    return request(options, api, 'POST', '/api/cli/content/validate', body, true)
  }

  if (area === 'distribution' && command === 'dry-run') {
    const body = bodyFromJsonFlag(options) || {
      scheduledPostId: flag(options, 'scheduledPostId'),
      platforms: [{
        platform: flag(options, 'platform'),
        enabled: true,
        socialAccountIds: flag(options, 'account') ? [flag(options, 'account')] : [],
        priority: 1,
      }],
      strategy: {
        type: flag(options, 'strategy') || 'immediate',
        ...(flag(options, 'scheduledFor') ? { scheduledFor: flag(options, 'scheduledFor') } : {}),
      },
    }
    return request(options, api, 'POST', '/api/cli/distribution/dry-run', body, true)
  }

  if (area === 'experiments') {
    if (!command || command === 'list') return request(options, api, 'GET', '/api/experiments')
    if (command === 'create') return request(options, api, 'POST', '/api/experiments', bodyFromJsonFlag(options) || {}, true)
    if (command === 'winner') {
      if (!subcommand) throw new Error('experiments winner requires an experiment id')
      return request(options, api, 'POST', `/api/experiments/${encodeURIComponent(subcommand)}/winner`, bodyFromJsonFlag(options) || {}, true)
    }
  }

  if (area === 'media' && command === 'inspect') {
    const file = subcommand
    if (!file) throw new Error('media inspect requires a path')
    if (!existsSync(file)) throw new Error(`Path not found: ${file}`)
    const stats = statSync(file)
    return {
      ok: true,
      data: {
        path: file,
        size: stats.size,
        file: stats.isFile(),
        safeToUpload: stats.isFile() && stats.size > 0,
      },
      warnings: stats.isFile() ? [] : ['Path is not a regular file.'],
      next: [],
    }
  }

  throw new Error(`Unknown command: ${[area, command, subcommand].filter(Boolean).join(' ')}`)
}
