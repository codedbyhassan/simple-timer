import useIndexedCollection from './useIndexedCollection.js'

const EMPTY_DEPARTMENTS = []

export default function useLocalDepartments() {
  const collection = useIndexedCollection('admin.facilities.departments', EMPTY_DEPARTMENTS)
  const options = collection.records.map((department) => ({ value: department.name, label: department.name }))
  return { ...collection, options }
}
