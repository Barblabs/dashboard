import { describe, expect, it } from 'vitest'
import { emptyFields, isStated } from './businessContext'

describe('isStated', () => {
  it('counts non-blank text and non-empty lists', () => {
    const fields = emptyFields()
    fields.profile.summary = '   '
    fields.geography.countries = ['MX']

    expect(isStated(fields, 'profile.summary')).toBe(false)
    expect(isStated(fields, 'geography.countries')).toBe(true)
    expect(isStated(fields, 'risk.appetite')).toBe(false)
  })
})
