import { describe, expect, it } from 'vitest'
import { mockDeliveryOne, mockInstallationActive, slackDeliveriesStore, slackInstallationStore } from './slack-store'
import { areasStore } from './areas-store'
import { assetsStore } from './assets-store'
import { businessContextStore, unsaved } from './business-context-store'
import { mockSource, sourceStore } from './cmdb-store'
import { customersStore } from './customers-store'
import { prioritizationsStore } from './prioritizations-store'
import { usersStore } from './users-store'

// What a store hands out after a reload: what it saved, read back from storage.
function reloaded<T>(store: { load(): T; save(value: T): void }, value: T): T {
  store.save(value)
  return store.load()
}

describe('mock stores', () => {
  // A schema leaving out a field, even an optional one, fails here: the stores parse strictly.
  it.each([
    ['areas', () => areasStore],
    ['assets', () => assetsStore],
    ['customers', () => customersStore],
    ['prioritizations', () => prioritizationsStore],
    ['users', () => usersStore],
  ])('read the %s fixture back as it was saved', (_, store) => {
    const fixture = store().load()
    expect(reloaded(store(), fixture)).toEqual(fixture)
  })

  it('read the other fixtures back as they were saved', () => {
    const context = { ...unsaved(), version: 3, saved_at: '2026-11-01T00:00:00Z', saved_by: 'admin@acme.example' }
    expect(reloaded(businessContextStore, context)).toEqual(context)
    const source = { ...mockSource, last_sync: '2026-11-01T00:00:00Z' }
    expect(reloaded(sourceStore, source)).toEqual(source)
    expect(reloaded(slackInstallationStore, mockInstallationActive)).toEqual(mockInstallationActive)
    expect(reloaded(slackDeliveriesStore, [mockDeliveryOne])).toEqual([mockDeliveryOne])
  })

  it('refuses stored data that does not fit, naming the store', () => {
    localStorage.setItem('barbattack_mock_users', JSON.stringify([{ id: 'user-1', role: 'owner' }]))

    expect(() => usersStore.load()).toThrow(/barbattack_mock_users/)
  })

  it('refuses a field the schema does not know rather than dropping it', () => {
    localStorage.setItem('barbattack_slack_installation', JSON.stringify({ ...mockInstallationActive, extra: true }))

    expect(() => slackInstallationStore.load()).toThrow(/extra/)
  })
})
