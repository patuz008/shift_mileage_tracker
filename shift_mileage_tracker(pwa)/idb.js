/* Small promise-based wrapper around IndexedDB for the two record stores. */

const DB_NAME = 'logbookDB';
const DB_VERSION = 1;
const STORES = { shifts: 'shifts', mileage: 'mileage' };

let dbPromise = null;

function openDB(){
  if(dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject)=>{
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e)=>{
      const db = e.target.result;
      if(!db.objectStoreNames.contains(STORES.shifts)){
        const s = db.createObjectStore(STORES.shifts, { keyPath: 'id' });
        s.createIndex('by_date', 'date', { unique: false });
      }
      if(!db.objectStoreNames.contains(STORES.mileage)){
        const m = db.createObjectStore(STORES.mileage, { keyPath: 'id' });
        m.createIndex('by_date', 'date', { unique: false });
      }
    };
    req.onsuccess = ()=> resolve(req.result);
    req.onerror = ()=> reject(req.error);
  });
  return dbPromise;
}

async function dbAll(storeName){
  const db = await openDB();
  return new Promise((resolve, reject)=>{
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = ()=> resolve(req.result);
    req.onerror = ()=> reject(req.error);
  });
}

async function dbPut(storeName, record){
  const db = await openDB();
  return new Promise((resolve, reject)=>{
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).put(record);
    tx.oncomplete = ()=> resolve(record);
    tx.onerror = ()=> reject(tx.error);
  });
}

async function dbDelete(storeName, id){
  const db = await openDB();
  return new Promise((resolve, reject)=>{
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).delete(id);
    tx.oncomplete = ()=> resolve(true);
    tx.onerror = ()=> reject(tx.error);
  });
}

/* One-time migration: if data exists in localStorage from the earlier
   browser-only version of this app, pull it into IndexedDB so nothing is lost. */
async function migrateFromLocalStorageIfNeeded(){
  const flag = 'logbook.migratedToIDB';
  if(localStorage.getItem(flag)) return;
  try{
    const oldShifts = JSON.parse(localStorage.getItem('logbook.shifts') || '[]');
    const oldMileage = JSON.parse(localStorage.getItem('logbook.mileage') || '[]');
    for(const s of oldShifts) await dbPut(STORES.shifts, s);
    for(const m of oldMileage) await dbPut(STORES.mileage, m);
  }catch(e){
    console.warn('Migration skipped:', e);
  }
  localStorage.setItem(flag, '1');
}

const Store = {
  getAllShifts: ()=> dbAll(STORES.shifts),
  putShift: (rec)=> dbPut(STORES.shifts, rec),
  deleteShift: (id)=> dbDelete(STORES.shifts, id),
  getAllMileage: ()=> dbAll(STORES.mileage),
  putMileage: (rec)=> dbPut(STORES.mileage, rec),
  deleteMileage: (id)=> dbDelete(STORES.mileage, id),
  migrate: migrateFromLocalStorageIfNeeded
};
