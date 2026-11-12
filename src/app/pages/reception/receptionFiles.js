const DATABASE = 'ascend-reception-files'
const STORE = 'documents'
const VERSION = 1

function openDatabase() {
  if (!window.indexedDB) return Promise.reject(new Error('This browser does not support local document storage.'))
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DATABASE, VERSION)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('Unable to open the document library.'))
  })
}

async function accessStore(mode, action, id, file) {
  const database = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE, mode)
    const store = transaction.objectStore(STORE)
    const request = action === 'put' ? store.put(file, id) : action === 'delete' ? store.delete(id) : store.get(id)
    let result
    request.onsuccess = () => { result = request.result }
    request.onerror = () => reject(request.error || new Error('Unable to access the document file.'))
    transaction.oncomplete = () => {
      database.close()
      resolve(result)
    }
    transaction.onerror = () => {
      database.close()
      reject(transaction.error || new Error('Unable to complete the document file operation.'))
    }
    transaction.onabort = () => {
      database.close()
      reject(transaction.error || new Error('The document file operation was cancelled.'))
    }
  })
}

export const saveReceptionFile = (id, file) => accessStore('readwrite', 'put', id, file)
export const getReceptionFile = (id) => accessStore('readonly', 'get', id)
export const deleteReceptionFile = (id) => accessStore('readwrite', 'delete', id)
