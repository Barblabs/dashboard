import { describe, expect, it } from 'vitest'
import { emptyFields } from '../../api/businessContext'
import { canonicalDomain, mergeDraft } from './model'

describe('mergeDraft', () => {
  it('fills what is empty and keeps what the user wrote', () => {
    const current = emptyFields()
    current.profile.summary = 'Our own words.'
    const draft = emptyFields()
    draft.profile.summary = 'The document says otherwise.'
    draft.profile.employees = '250_999'

    const { fields, filled } = mergeDraft(current, draft)

    expect(fields.profile.summary).toBe('Our own words.')
    expect(fields.profile.employees).toBe('250_999')
    expect(filled).toEqual(['profile.employees'])
  })

  it('adds to lists only what they lack, regardless of case', () => {
    const current = emptyFields()
    current.footprint.technologies = ['AWS']
    const draft = emptyFields()
    draft.footprint.technologies = ['aws', 'Salesforce']

    const { fields, filled } = mergeDraft(current, draft)

    expect(fields.footprint.technologies).toEqual(['AWS', 'Salesforce'])
    expect(filled).toEqual(['footprint.technologies'])
  })

  it('merges a critical service of the same name instead of repeating it', () => {
    const current = emptyFields()
    current.operations.critical_services = [
      { name: 'Payroll', description: '', impact: 'high', max_downtime: '', assets: ['hr-01'] },
    ]
    const draft = emptyFields()
    draft.operations.critical_services = [
      { name: 'payroll', description: 'Pays employees.', impact: 'low', max_downtime: '1d_3d', assets: ['hr-01', 'hr-02'] },
      { name: 'Online store', description: '', impact: '', max_downtime: '', assets: [] },
    ]

    const { fields } = mergeDraft(current, draft)

    expect(fields.operations.critical_services).toEqual([
      { name: 'Payroll', description: 'Pays employees.', impact: 'high', max_downtime: '1d_3d', assets: ['hr-01', 'hr-02'] },
      { name: 'Online store', description: '', impact: '', max_downtime: '', assets: [] },
    ])
  })

  it('reports nothing filled when the draft adds nothing', () => {
    const current = emptyFields()
    current.profile.sectors = ['retail']
    const draft = emptyFields()
    draft.profile.sectors = ['retail']

    expect(mergeDraft(current, draft).filled).toEqual([])
  })

  it('leaves the current fields untouched', () => {
    const current = emptyFields()
    const draft = emptyFields()
    draft.footprint.brands = ['ACME Pay']

    mergeDraft(current, draft)

    expect(current.footprint.brands).toEqual([])
  })
})

describe('canonicalDomain', () => {
  it.each([
    ['https://www.Acme.example/contacto', 'acme.example'],
    ['pagos.acme.example.', 'pagos.acme.example'],
    ['xn--caf-dma.mx', 'xn--caf-dma.mx'],
    ['ftp://files.acme.example', 'files.acme.example'],
  ])('keeps the host of %s', (entry, want) => {
    expect(canonicalDomain(entry)).toBe(want)
  })

  it.each(['acme', 'not a domain', '-acme.example', ''])('rejects %j', (entry) => {
    expect(canonicalDomain(entry)).toBeNull()
  })
})
