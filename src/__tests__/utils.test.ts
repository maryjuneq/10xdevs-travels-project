import { describe, it, expect } from 'vitest'
import { capitalize, isEmail } from '../lib/utils'

describe('capitalize', () => {
  it('should capitalize the first letter of a string', () => {
    expect(capitalize('hello')).toBe('Hello')
    expect(capitalize('world')).toBe('World')
  })

  it('should handle empty strings', () => {
    expect(capitalize('')).toBe('')
  })

  it('should handle single character strings', () => {
    expect(capitalize('a')).toBe('A')
  })
})

describe('isEmail', () => {
  it('should return true for valid email addresses', () => {
    expect(isEmail('test@example.com')).toBe(true)
    expect(isEmail('user.name+tag@domain.co.uk')).toBe(true)
  })

  it('should return false for invalid email addresses', () => {
    expect(isEmail('invalid-email')).toBe(false)
    expect(isEmail('@example.com')).toBe(false)
    expect(isEmail('test@')).toBe(false)
    expect(isEmail('')).toBe(false)
  })
})