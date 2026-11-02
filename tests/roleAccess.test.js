import test from 'node:test'
import assert from 'node:assert/strict'
import {
  defaultRolePermissions,
  getHomePage,
  getPageFromPath,
  getPageRoute,
  getVisibleNavigation,
  mergePermissions,
  roleDefinitions,
} from '../src/access/roleAccess.js'

const menuEntries = roleDefinitions.flatMap((role) => role.groups.flatMap((group) => group.items))

test('every navigation entry has a unique stable ID', () => {
  const ids = menuEntries.map((item) => item.id)
  assert.equal(new Set(ids).size, ids.length)
})

test('every default role grant exposes its intended menu entries', () => {
  for (const role of roleDefinitions) {
    const grants = defaultRolePermissions[role.id] || []
    const permissions = mergePermissions([role.id], defaultRolePermissions)
    const visible = getVisibleNavigation([role.id], permissions).flatMap((group) => group.items)
    const hidden = role.groups.flatMap((group) => group.items).filter((item) => !visible.some((entry) => entry.id === item.id))
    assert.deepEqual(hidden, [], `${role.id} has default-hidden menu entries: ${hidden.map((item) => item.id).join(', ')}`)
    assert.ok(grants.length > 0, `${role.id} has no default permissions`)
  }
})

test('every menu destination resolves to its own round-trip route', () => {
  const paths = menuEntries.map((item) => {
    const path = getPageRoute(item.id)
    assert.notEqual(path, '/', `${item.id} has no route`)
    assert.equal(getPageFromPath(path), item.id, `${item.id} does not round-trip through ${path}`)
    return path
  })
  assert.equal(new Set(paths).size, paths.length, 'Two menu destinations share a route path')
})

test('every non-administrator role lands on its own overview destination', () => {
  for (const role of roleDefinitions.filter((item) => item.id !== 'hospital-admin')) {
    const home = getHomePage([role.id], { [role.id]: defaultRolePermissions[role.id] })
    assert.equal(home, role.homePage)
    assert.ok(role.groups.flatMap((group) => group.items).some((item) => item.id === home && item.page === 'role-dashboard'))
  }
})
