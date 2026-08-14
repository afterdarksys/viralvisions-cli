import { redact } from './redact.js'

export function parseOutput(value = 'table') {
  if (['table', 'json', 'jsonl', 'yaml'].includes(value)) return value
  throw new Error(`Unsupported output format: ${value}`)
}

export function writeJson(stdout, value) {
  stdout.write(`${redact(JSON.stringify(value, null, 2))}\n`)
}

export function writeJsonl(stdout, value) {
  stdout.write(`${redact(JSON.stringify(value))}\n`)
}

export function writeYaml(stdout, value, indent = 0) {
  const pad = ' '.repeat(indent)
  if (Array.isArray(value)) {
    for (const item of value) {
      if (item && typeof item === 'object') {
        stdout.write(`${pad}-\n`)
        writeYaml(stdout, item, indent + 2)
      } else {
        stdout.write(`${pad}- ${redact(String(item))}\n`)
      }
    }
    return
  }
  if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      if (item && typeof item === 'object') {
        stdout.write(`${pad}${key}:\n`)
        writeYaml(stdout, item, indent + 2)
      } else {
        stdout.write(`${pad}${key}: ${redact(String(item))}\n`)
      }
    }
    return
  }
  stdout.write(`${pad}${redact(String(value))}\n`)
}

export function renderHuman(stdout, value) {
  if (value == null) {
    stdout.write('No data\n')
    return
  }
  const data = value.data ?? value
  if (value.warnings?.length) {
    stdout.write('Warnings:\n')
    for (const warning of value.warnings) stdout.write(`- ${warning}\n`)
    stdout.write('\n')
  }
  if (Array.isArray(data)) {
    for (const item of data) stdout.write(`${redact(JSON.stringify(item))}\n`)
  } else if (data && typeof data === 'object') {
    for (const [key, item] of Object.entries(data)) {
      if (Array.isArray(item)) {
        stdout.write(`${key}: ${item.length}\n`)
      } else if (item && typeof item === 'object') {
        stdout.write(`${key}: ${redact(JSON.stringify(item))}\n`)
      } else {
        stdout.write(`${key}: ${redact(String(item))}\n`)
      }
    }
  } else {
    stdout.write(`${redact(String(data))}\n`)
  }
  if (value.next?.length) {
    stdout.write('\nNext:\n')
    for (const step of value.next) stdout.write(`- ${step}\n`)
  }
}

export function render({ stdout, output, value }) {
  if (output === 'json') return writeJson(stdout, value)
  if (output === 'jsonl') return writeJsonl(stdout, value)
  if (output === 'yaml') return writeYaml(stdout, value)
  return renderHuman(stdout, value)
}
