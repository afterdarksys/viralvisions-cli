import { existsSync, readFileSync, statSync } from 'node:fs'
import { basename, extname, resolve } from 'node:path'
import { resolveContext, loadConfig, saveConfig } from './config.js'
import { apiRequest, idempotencyKey, uploadBytes } from './api.js'
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
  accounts list|show <id>|capabilities <id>|test <id>
  media upload <path> [--qc]
  media qc <content-id> [--deep] [--expected-aspect 9:16]
  trends opportunities
  trends intelligence
  trends use <trend-id>
  creator-dna show|refresh|export|set|reset|delete
  analyze video --content-id <id>|--media-asset-id <id>|--scheduled-post-id <id>
  experiments list|create|winner <id>
  metrics product
  predictions calibration
  content validate --content-id <id>|--scheduled-post-id <id>
  content list|create|show <id>|update <id>
  publish <post-id> --account <id> --platform <name> [--dry-run] [--yes]
  schedule <post-id> --account <id> --platform <name> --at <RFC3339> [--dry-run] [--yes]
  distribution dry-run --scheduled-post-id <id> --account <id> --platform <name>
  jobs show <id>
  wait <job-or-distribution-id>
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
    if (['quiet', 'no-color', 'yes', 'dry-run', 'qc', 'deep', 'latest', 'require-watermark'].includes(name)) {
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

function mimeTypeForPath(path) {
  const ext = extname(path).toLowerCase()
  if (['.mp4', '.m4v'].includes(ext)) return 'video/mp4'
  if (ext === '.mov') return 'video/quicktime'
  if (ext === '.webm') return 'video/webm'
  if (['.jpg', '.jpeg'].includes(ext)) return 'image/jpeg'
  if (ext === '.png') return 'image/png'
  if (ext === '.gif') return 'image/gif'
  return 'application/octet-stream'
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
  if (area === 'accounts' && (!command || command === 'list')) return request(options, api, 'GET', '/v1/accounts')
  if (area === 'accounts' && command === 'readiness') return request(options, api, 'GET', '/api/accounts/readiness')
  if (area === 'accounts' && ['show', 'capabilities', 'test'].includes(command)) {
    if (!subcommand) throw new Error(`accounts ${command} requires an account id`)
    const suffix = command === 'show' ? '' : `/${command}`
    return request(options, api, 'GET', `/v1/accounts/${encodeURIComponent(subcommand)}${suffix}`)
  }
  if (area === 'metrics' && command === 'product') return request(options, api, 'GET', '/api/metrics/product')
  if (area === 'predictions' && command === 'calibration') return request(options, api, 'GET', '/api/learning/predictions')
  if (area === 'jobs' && (command === 'show' || command)) {
    const jobId = command === 'show' ? subcommand : command
    if (!jobId) throw new Error('jobs show requires a job id')
    return request(options, api, 'GET', `/v1/jobs/${encodeURIComponent(jobId)}`)
  }
  if (area === 'wait') {
    const jobId = command
    if (!jobId) throw new Error('wait requires a job or distribution id')
    return waitForJob(options, api, jobId)
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
  if (area === 'content' && (!command || command === 'list')) return request(options, api, 'GET', '/v1/posts')
  if (area === 'content' && command === 'show') {
    if (!subcommand) throw new Error('content show requires a post id')
    return request(options, api, 'GET', `/v1/posts/${encodeURIComponent(subcommand)}`)
  }
  if (area === 'content' && command === 'create') {
    const body = bodyFromJsonFlag(options) || {
      caption: flag(options, 'caption'),
      hashtags: flag(options, 'hashtags') ? String(flag(options, 'hashtags')).split(',') : [],
      platforms: flag(options, 'platforms') ? String(flag(options, 'platforms')).split(',') : [],
      ...(flag(options, 'contentId') ? { contentId: flag(options, 'contentId') } : {}),
      ...(flag(options, 'scheduledFor') ? { scheduledFor: flag(options, 'scheduledFor') } : {}),
      ...(flag(options, 'youtubeTitle') ? { youtubeTitle: flag(options, 'youtubeTitle') } : {}),
      ...(flag(options, 'youtubeDescription') ? { youtubeDescription: flag(options, 'youtubeDescription') } : {}),
    }
    return request(options, api, 'POST', '/v1/posts', body, true)
  }
  if (area === 'content' && command === 'update') {
    if (!subcommand) throw new Error('content update requires a post id')
    return request(options, api, 'PATCH', `/v1/posts/${encodeURIComponent(subcommand)}`, bodyFromJsonFlag(options) || {}, true)
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

  if (area === 'media' && command === 'upload') {
    const file = subcommand
    if (!file) throw new Error('media upload requires a path')
    const absolute = resolve(file)
    if (!existsSync(absolute)) throw new Error(`Path not found: ${file}`)
    const stats = statSync(absolute)
    if (!stats.isFile() || stats.size <= 0) throw new Error('media upload requires a non-empty regular file')
    const mimeType = flag(options, 'mimeType') || mimeTypeForPath(absolute)
    const reservation = await request(options, api, 'POST', '/v1/media/uploads', {
      fileName: basename(absolute),
      mimeType,
      fileSize: stats.size,
    }, true)
    const upload = reservation.data?.upload
    if (!upload?.uploadUrl) throw new Error('Server did not return an upload URL')
    await uploadBytes({
      uploadUrl: upload.uploadUrl,
      bytes: readFileSync(absolute),
      mimeType,
      timeoutMs: options.timeoutMs,
    })
    const result = {
      ...reservation,
      data: {
        ...reservation.data,
        uploaded: true,
        localPath: absolute,
      },
    }
    if (options.qc) {
      const qc = await runMediaQc(options, api, upload.contentId, {
        deep: Boolean(options.deep),
        expectedAspect: flag(options, 'expectedAspect'),
        requireWatermark: Boolean(options.requireWatermark),
      })
      return {
        ...result,
        data: {
          ...result.data,
          qc: qc.data?.report ?? qc.data,
        },
        warnings: [...(result.warnings ?? []), ...(qc.warnings ?? [])],
        next: qc.next ?? result.next ?? [],
      }
    }
    return result
  }

  if (area === 'media' && command === 'qc') {
    const contentId = subcommand
    if (!contentId) throw new Error('media qc requires a content id')
    return runMediaQc(options, api, contentId, {
      deep: Boolean(options.deep),
      expectedAspect: flag(options, 'expectedAspect'),
      requireWatermark: Boolean(options.requireWatermark),
    })
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

  if (area === 'publish') {
    const postId = command
    if (!postId) throw new Error('publish requires a post id')
    return releaseCommand(options, api, postId, 'immediate')
  }

  if (area === 'schedule') {
    const postId = command
    if (!postId) throw new Error('schedule requires a post id')
    const scheduledFor = flag(options, 'at') || flag(options, 'scheduledFor')
    if (!scheduledFor) throw new Error('schedule requires --at <RFC3339>')
    return releaseCommand(options, api, postId, 'scheduled', scheduledFor)
  }

  throw new Error(`Unknown command: ${[area, command, subcommand].filter(Boolean).join(' ')}`)
}

function releaseBody(options, strategyType, scheduledFor) {
  const account = flag(options, 'account')
  const platform = flag(options, 'platform')
  if (!account) throw new Error('release requires --account <id>')
  if (!platform) throw new Error('release requires --platform <name>')
  return {
    dryRun: options.dryRun || !options.yes,
    confirmed: Boolean(options.yes && !options.dryRun),
    platforms: [{
      platform,
      enabled: true,
      socialAccountIds: [account],
      priority: Number(flag(options, 'priority') || 1),
    }],
    strategy: {
      type: strategyType,
      ...(scheduledFor ? { scheduledFor } : {}),
    },
    ...(flag(options, 'campaignId') ? { campaignId: flag(options, 'campaignId') } : {}),
  }
}

async function releaseCommand(options, api, postId, strategyType, scheduledFor) {
  if (!options.dryRun) mustConfirm(options, strategyType === 'scheduled' ? 'schedule' : 'publish')
  return request(
    options,
    api,
    'POST',
    `/v1/posts/${encodeURIComponent(postId)}/release`,
    releaseBody(options, strategyType, scheduledFor),
    true,
  )
}

async function waitForJob(options, api, jobId) {
  const started = Date.now()
  const timeoutMs = options.timeoutMs
  let last
  while (Date.now() - started <= timeoutMs) {
    last = await request(options, api, 'GET', `/v1/jobs/${encodeURIComponent(jobId)}`)
    const record = last.data?.job?.record
    const status = record?.status
    if (['completed', 'failed', 'published', 'cancelled'].includes(status)) return last
    await new Promise((resolveTimer) => setTimeout(resolveTimer, Math.min(2000, Math.max(250, timeoutMs / 10))))
  }
  throw new Error(`Timed out waiting for ${jobId}${last ? `; last status: ${last.data?.job?.record?.status || 'unknown'}` : ''}`)
}

async function runMediaQc(options, api, contentId, body) {
  if (options.latest) {
    return request(options, api, 'GET', `/v1/media/${encodeURIComponent(contentId)}/qc`)
  }
  return request(options, api, 'POST', `/v1/media/${encodeURIComponent(contentId)}/qc`, body, true)
}
