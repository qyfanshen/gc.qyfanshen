// js/db.js — IndexedDB 数据访问层
;(function() {
  const db = new Dexie('CostEngineeringDB');
  db.version(1).stores({
    projects: 'id',
    quantity: 'code',
    pricing: 'quotaCode',
    audit: 'docName',
    lifecycle: 'code',
    risks: 'id',
    changes: 'id',
    indicators: '++id',
    logs: '++id',
    tasks: '++id',
    comments: '++id',
    versions: 'id',
    settings: 'key',
    marketPrices: '++id',
  });

  // Helper: persist arrays to IndexedDB
  async function dbPut(table, items) {
    try { await db.table(table).clear(); if (items.length) await db.table(table).bulkPut(items); } catch(e) { console.warn('DB put failed:', e); }
  }

  async function dbLoad(table, targetRef) {
    try { const data = await db.table(table).toArray(); if (data.length) targetRef.value = data; } catch(e) {}
  }

  window.CEM = window.CEM || {};
  window.CEM.db = db;
  window.CEM.dbPut = dbPut;
  window.CEM.dbLoad = dbLoad;
})();
