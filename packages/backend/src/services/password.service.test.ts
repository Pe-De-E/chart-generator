import { describe, it, expect, vi } from 'vitest'

vi.mock('../config/env.js', () => ({
  env: {
    BCRYPT_ROUNDS: 4, // Fast rounds for tests
  },
}))

import { PasswordService } from './password.service.js'

describe('PasswordService', () => {
  describe('validate()', () => {
    it('accepts a password that meets all requirements', () => {
      const result = PasswordService.validate('SecurePass1')
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('rejects passwords shorter than 8 characters', () => {
      const result = PasswordService.validate('Sh0rt')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Password must be at least 8 characters long')
    })

    it('rejects passwords without an uppercase letter', () => {
      const result = PasswordService.validate('lowercase1')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Password must contain at least one uppercase letter')
    })

    it('rejects passwords without a lowercase letter', () => {
      const result = PasswordService.validate('UPPERCASE1')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Password must contain at least one lowercase letter')
    })

    it('rejects passwords without a number', () => {
      const result = PasswordService.validate('NoNumbers!')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Password must contain at least one number')
    })

    it('returns multiple errors for a very weak password', () => {
      const result = PasswordService.validate('weak')
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(1)
    })

    it('accepts various valid passwords', () => {
      const validPasswords = ['Password1', 'MySecure99Pass', 'A1bcdefgh', 'Xz9aaaaa']
      for (const password of validPasswords) {
        const result = PasswordService.validate(password)
        expect(result.valid, `Expected "${password}" to be valid`).toBe(true)
      }
    })
  })

  describe('hash() and verify()', () => {
    it('returns a bcrypt hash string', async () => {
      const hash = await PasswordService.hash('Password1')
      expect(hash).toMatch(/^\$2b\$/)
    })

    it('verify() returns true for the correct password', async () => {
      const hash = await PasswordService.hash('Password1')
      expect(await PasswordService.verify('Password1', hash)).toBe(true)
    })

    it('verify() returns false for the wrong password', async () => {
      const hash = await PasswordService.hash('Password1')
      expect(await PasswordService.verify('WrongPass1', hash)).toBe(false)
    })

    it('two hashes of the same password are not equal (salted)', async () => {
      const hash1 = await PasswordService.hash('Password1')
      const hash2 = await PasswordService.hash('Password1')
      expect(hash1).not.toBe(hash2)
    })
  })
})
