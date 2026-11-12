import useIndexedCollection from '@core/storage/useIndexedCollection.js'

export default function useAdminCollection(storageKey, defaults) {
  return useIndexedCollection(`admin.${storageKey}`, defaults)
}
