import { describe, expect, it } from 'vitest'
import { emailInput } from './auth'

describe('emailInput', () => {
  it('accepts a valid email', () => {
    const r = emailInput.safeParse({ email: 'anna@example.com' })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.email).toBe('anna@example.com')
  })

  it('trims and lowercases', () => {
    const r = emailInput.safeParse({ email: '  Anna@Example.COM  ' })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.email).toBe('anna@example.com')
  })

  it('rejects an obviously invalid string', () => {
    const r = emailInput.safeParse({ email: 'not-an-email' })
    expect(r.success).toBe(false)
  })

  it('rejects an empty string', () => {
    const r = emailInput.safeParse({ email: '' })
    expect(r.success).toBe(false)
  })
})
