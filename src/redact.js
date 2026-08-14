const SECRET_PATTERNS = [
  /Bearer\s+[A-Za-z0-9._~+/=-]+/gi,
  /(authorization\s*[:=]\s*)[^\s,}]+/gi,
  /(cookie\s*[:=]\s*)[^\s,}]+/gi,
  /(token\s*[:=]\s*)[^\s,}]+/gi,
  /(X-Amz-Signature=)[^&\s]+/gi,
  /(Signature=)[^&\s]+/gi,
]

export function redact(value) {
  let text = typeof value === 'string' ? value : JSON.stringify(value)
  for (const pattern of SECRET_PATTERNS) {
    text = text.replace(pattern, (match, prefix) => prefix ? `${prefix}[REDACTED]` : '[REDACTED]')
  }
  return text
}
