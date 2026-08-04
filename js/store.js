/**
 * store.js — Shared global state (CEM core)
 * Loaded first. All module files and app.js depend on this.
 * Module-specific state (allProjects, quantityItems, pricingItems, etc.)
 * lives in their respective module files.
 */
(function () {
  const CEM = window.CEM || {};
  window.CEM = CEM;

  // ============ INDEXEDDB LAYER ============
  const db = new Dexie('CostEngineeringV2');
  db.version(1).stores({
    projects: 'id',
    quantity: '++id,code',
    pricing: '++id,quotaCode',
    audit: '++id,docName',
    lifecycle: '++id,code',
    risks: '++id',
    changes: 'id',
    indicators: '++id',
    logs: '++id',
    tasks: '++id',
    comments: '++id',
    versions: 'id',
    settings: 'key',
    marketPrices: '++id',
  });

  async function dbPut(table, items) {
    try {
      if (!items || !items.length) return;
      // Strip Vue reactive proxies before storing to IndexedDB
      const data = JSON.parse(JSON.stringify(items));
      // Ensure _id for auto-increment tables
      data.forEach((item, i) => { if (!item.id && !item._id) item._id = Date.now() + i; });
      await db.table(table).clear();
      await db.table(table).bulkPut(data);
    } catch (e) { /* tables may need migration - silent fail */ }
  }

  async function dbLoad(table, targetRef) {
    try {
      const data = await db.table(table).toArray();
      if (data.length) targetRef.value = data;
    } catch (e) { /* table may not exist yet */ }
  }

  // Expose so modules can persist their own state
  CEM.db = db;
  CEM.dbPut = dbPut;
  CEM.dbLoad = dbLoad;

  // ============ NAVIGATION STATE ============
  CEM.isDark = Vue.ref(false);
  CEM.currentPage = Vue.ref('dashboard');
  CEM.autoSave = Vue.ref(true);

  CEM.navItems = [
    // ── AI 核心（不变） ──
    { key: 'dashboard',   label: '数据看板',       icon: '📊', badge: null },
    { key: 'ai',          label: 'AI助手',         icon: '🤖', badge: null },
    { key: 'debate',      label: 'Agent辩论室',    icon: '🎭', badge: null },
    { key: 'wargame',     label: '沙盘推演',       icon: '🎲', badge: null },

    // ── 项目工作流（按操作顺序） ──
    { key: 'settings',    label: '① 系统设置',     icon: '⚙️', badge: null },
    { key: 'projects',    label: '② 项目管理',     icon: '📁', badge: null },
    { key: 'upload',      label: '③ 图纸识别',     icon: '📄', badge: null },
    { key: 'quantity',    label: '④ AI自动算量',   icon: '🧮', badge: null },
    { key: 'imports',     label: '⑤ 数据导入',     icon: '📥', badge: null },
    { key: 'pricing',     label: '⑥ 智能组价',     icon: '💰', badge: null },
    { key: 'lifecycle',   label: '⑦ 全生命周期',   icon: '🔄', badge: null },
    { key: 'risk',        label: '⑧ 风险预警',     icon: '⚠️', badge: null },
    { key: 'changes',     label: '⑨ 变更签证',     icon: '📝', badge: null },
    { key: 'indicators',  label: '⑩ 造价指标',     icon: '📈', badge: null },
    { key: 'settlement',  label: '⑪ 结算审核',     icon: '✅', badge: null },

    // ── 辅助工具 ──
    { key: 'collab',      label: '协同工作',       icon: '👥', badge: null },
    { key: 'reports',     label: '报表中心',       icon: '📋', badge: null },
    { key: 'patrol',      label: '智能巡检',       icon: '🦾', badge: null },
    { key: 'negotiation', label: '索赔博弈',       icon: '⚖️', badge: null },
    { key: 'memory',      label: '记忆图谱',       icon: '🧠', badge: null },
  ];

  // ============ NAVIGATION FUNCTIONS ============
  CEM.navigate = function (page) {
    CEM.currentPage.value = page;
    CEM.updateNavBadges();
    // Double nextTick ensures Vue has fully rendered the new page template
    Vue.nextTick(function () {
      Vue.nextTick(function () {
        setTimeout(function () {
          if (page === 'dashboard' && CEM.renderDashboardCharts) CEM.renderDashboardCharts();
          if (page === 'lifecycle' && CEM.renderLifecycleCharts) CEM.renderLifecycleCharts();
          if (page === 'risk' && CEM.renderRiskCharts) CEM.renderRiskCharts();
          if (page === 'pricing' && CEM.renderPricingCharts) CEM.renderPricingCharts();
          if (page === 'settlement' && CEM.renderAuditCharts) CEM.renderAuditCharts();
          if (page === 'indicators' && CEM.renderIndicatorCharts) CEM.renderIndicatorCharts();
          if (page === 'wargame' && CEM.renderWargameChart) CEM.renderWargameChart();
        }, 150);
      });
    });
  };

  CEM.updateNavBadges = function () {
    var riskNav = CEM.navItems.find(function (n) { return n.key === 'risk'; });
    if (riskNav) riskNav.badge = (CEM.riskItems ? CEM.riskItems.value : []).length || null;
  };

  // ============ DEFAULT AI CONFIG (overridden by settings.js) ============
  // Must exist before settings.js loads, otherwise template crashes on aiConfig.xxx
  CEM.aiConfig = Vue.reactive({
    provider: 'deepseek', endpoint: 'https://api.deepseek.com/v1', apiKey: '',
    model: 'deepseek-chat', temperature: 0.7, maxTokens: 4096,
    agentModel: '', visionModel: '', priceModel: '', debateModel: '',
  });
  CEM.aiConfigured = Vue.computed(function () {
    return !!(CEM.aiConfig && CEM.aiConfig.apiKey && CEM.aiConfig.endpoint);
  });

  // ============ DASHBOARD STATE ============
  CEM.dashboardStats = Vue.reactive([
    { label: '项目总数',     value: '127',   icon: '🏗️', color: 'linear-gradient(135deg,#409eff,#337ecc)', trend: 12 },
    { label: '本月算量(万元)', value: '8,562', icon: '📐', color: 'linear-gradient(135deg,#67c23a,#529b2e)', trend: 8 },
    { label: '风险预警项',   value: '23',    icon: '⚠️', color: 'linear-gradient(135deg,#e6a23c,#cf8b2d)', trend: -5 },
    { label: '人均效能提升', value: '68%',   icon: '📈', color: 'linear-gradient(135deg,#6366f1,#4f46e5)', trend: 15 },
  ]);

  // ============ DARK MODE ============
  CEM.toggleDark = function (val) {
    CEM.isDark.value = val;
    document.documentElement.classList.toggle('dark', val);
    localStorage.setItem('cost_app_dark', val ? '1' : '0');
    Vue.nextTick(function () {
      var charts = document.querySelectorAll('[id^="chart-"]');
      charts.forEach(function (c) {
        var chart = echarts.getInstanceByDom(c);
        if (chart) chart.dispose();
      });
      CEM.navigate(CEM.currentPage.value);
    });
  };

  // ============ COMPUTED ============
  CEM.storageSize = Vue.computed(function () {
    var count = 0;
    for (var key in localStorage) {
      if (key.indexOf('cost_app_') === 0) count++;
    }
    return count;
  });

  // ============ LOCAL STORAGE (save/load/export/clear) ============
  // References module-owned refs via CEM.xxx so module files can be loaded
  // before or after store.js.

  // Guard: prevent saveToLocal from running before all modules are loaded
  var _saveGuard = false;
  CEM.markModulesReady = function() { _saveGuard = true; };

  // Get effective model for an agent type (respects per-agent overrides)
  CEM.getEffectiveModel = function(agentType) {
    var cfg = CEM.aiConfig;
    if (!cfg) return 'deepseek-chat';
    switch(agentType) {
      case 'quantity': case 'pricing': case 'risk': case 'audit':
        return cfg.agentModel || cfg.model;
      case 'drawing':
        return cfg.visionModel || cfg.model;
      case 'price':
        return cfg.priceModel || cfg.model;
      case 'debate':
        return cfg.debateModel || cfg.model;
      default:
        return cfg.model;
    }
  };

  // Safe API caller - validates config before calling, returns null if not configured
  CEM.callAI = async function(messages, agentType, opts) {
    opts = opts || {};
    var cfg = CEM.aiConfig;
    if (!cfg || !cfg.apiKey || !cfg.endpoint) {
      ElementPlus.ElMessage.warning('请先在设置中配置AI API Key');
      return null;
    }
    var model = CEM.getEffectiveModel(agentType);
    var controller = opts.signal ? null : new AbortController();
    var signal = opts.signal || (controller ? controller.signal : null);
    try {
      var response = await fetch(cfg.endpoint + '/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + cfg.apiKey },
        body: JSON.stringify({
          model: model,
          messages: messages,
          temperature: opts.temperature || cfg.temperature,
          max_tokens: opts.maxTokens || cfg.maxTokens,
          stream: opts.stream || false,
        }),
        signal: signal,
      });
      if (!response.ok) {
        var err = await response.json().catch(function() { return {}; });
        if (response.status === 401) {
          ElementPlus.ElMessage.error('API Key无效(401)，请检查设置');
        } else {
          ElementPlus.ElMessage.error('AI请求失败: ' + (err.error?.message || 'HTTP '+response.status));
        }
        return null;
      }
      if (opts.stream) return response; // Return raw response for streaming
      var data = await response.json();
      return data.choices?.[0]?.message?.content || '';
    } catch(e) {
      if (e.name !== 'AbortError') ElementPlus.ElMessage.error('网络错误: ' + e.message);
      return null;
    }
  };

  // Shared chart helper (used by dashboard/lifecycle/risk/pricing/settlement/indicators)
  CEM.createChart = function(domId, option) {
    var dom = document.getElementById(domId);
    if (!dom) return null;
    var chart = echarts.getInstanceByDom(dom);
    if (!chart) chart = echarts.init(dom, CEM.isDark ? CEM.isDark.value ? 'dark' : undefined : undefined);
    chart.setOption(option, true);
    return chart;
  };

  CEM.saveToLocal = function () {
    if (!_saveGuard) return;
    if (!CEM.autoSave || !CEM.autoSave.value) return;
    dbPut('quantity',    CEM.quantityItems  ? CEM.quantityItems.value  : []);
    dbPut('pricing',     CEM.pricingItems   ? CEM.pricingItems.value   : []);
    dbPut('audit',       CEM.auditItems     ? CEM.auditItems.value     : []);
    dbPut('lifecycle',   CEM.lifecycleItems ? CEM.lifecycleItems.value : []);
    dbPut('risks',       CEM.riskItems      ? CEM.riskItems.value      : []);
    dbPut('projects',    CEM.allProjects    ? CEM.allProjects.value    : []);
    dbPut('changes',     CEM.changeOrders   ? CEM.changeOrders.value   : []);
    dbPut('indicators',  CEM.indicatorDB    ? CEM.indicatorDB.value    : []);
    dbPut('tasks',       CEM.taskList       ? CEM.taskList.value       : []);
    dbPut('versions',    CEM.versionList    ? CEM.versionList.value    : []);
    dbPut('marketPrices', CEM.marketPrices  ? CEM.marketPrices.value   : []);
  };

  CEM.loadFromLocal = async function () {
    // Ensure refs exist so dbLoad has a .value to write into
    if (!CEM.quantityItems)    CEM.quantityItems    = Vue.ref([]);
    if (!CEM.pricingItems)     CEM.pricingItems     = Vue.ref([]);
    if (!CEM.auditItems)       CEM.auditItems       = Vue.ref([]);
    if (!CEM.lifecycleItems)   CEM.lifecycleItems   = Vue.ref([]);
    if (!CEM.riskItems)        CEM.riskItems        = Vue.ref([]);
    if (!CEM.allProjects)      CEM.allProjects      = Vue.ref([]);
    if (!CEM.changeOrders)     CEM.changeOrders     = Vue.ref([]);
    if (!CEM.indicatorDB)      CEM.indicatorDB      = Vue.ref([]);
    if (!CEM.taskList)         CEM.taskList         = Vue.ref([]);
    if (!CEM.versionList)      CEM.versionList      = Vue.ref([]);
    if (!CEM.marketPrices)     CEM.marketPrices     = Vue.ref([]);

    await Promise.all([
      dbLoad('quantity',    CEM.quantityItems),
      dbLoad('pricing',     CEM.pricingItems),
      dbLoad('audit',       CEM.auditItems),
      dbLoad('lifecycle',   CEM.lifecycleItems),
      dbLoad('risks',       CEM.riskItems),
      dbLoad('projects',    CEM.allProjects),
      dbLoad('changes',     CEM.changeOrders),
      dbLoad('indicators',  CEM.indicatorDB),
      dbLoad('tasks',       CEM.taskList),
      dbLoad('versions',    CEM.versionList),
      dbLoad('marketPrices', CEM.marketPrices),
    ]);
  };

  CEM.loadProjFromLocal = function () {
    if (!CEM.allProjects) CEM.allProjects = Vue.ref([]);
    dbLoad('projects', CEM.allProjects);
  };

  CEM.exportAllData = function () {
    var data = {
      quantity:   CEM.quantityItems  ? CEM.quantityItems.value  : [],
      pricing:    CEM.pricingItems   ? CEM.pricingItems.value   : [],
      audit:      CEM.auditItems     ? CEM.auditItems.value     : [],
      lifecycle:  CEM.lifecycleItems ? CEM.lifecycleItems.value : [],
      risk:       CEM.riskItems      ? CEM.riskItems.value      : [],
      projects:   CEM.allProjects    ? CEM.allProjects.value    : [],
      exportTime: new Date().toISOString(),
    };
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = '智慧造价数据备份_' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(url);
    ElementPlus.ElMessage.success('数据导出成功');
  };

  CEM.clearAllData = function () {
    ElementPlus.ElMessageBox.confirm(
      '此操作将清除所有数据库和本地存储的数据，不可恢复！',
      '危险操作',
      { confirmButtonText: '确定清除', cancelButtonText: '取消', type: 'error' }
    ).then(async function () {
      try {
        var tables = ['projects', 'quantity', 'pricing', 'audit', 'lifecycle', 'risks', 'changes', 'indicators', 'logs', 'tasks', 'comments', 'versions', 'marketPrices', 'settings'];
        for (var i = 0; i < tables.length; i++) {
          await db.table(tables[i]).clear();
        }
      } catch (e) { /* ignore */ }

      var keys = [];
      for (var key in localStorage) {
        if (key.indexOf('cost_app_') === 0) keys.push(key);
      }
      keys.forEach(function (k) { localStorage.removeItem(k); });

      // Reset module refs
      var refNames = ['quantityItems', 'pricingItems', 'auditItems', 'lifecycleItems', 'riskItems', 'allProjects', 'marketPrices', 'changeOrders', 'indicatorDB', 'taskList', 'versionList', 'commentsList', 'logEntries'];
      refNames.forEach(function (k) {
        if (CEM[k]) CEM[k].value = [];
      });

      ElementPlus.ElMessage.success('所有数据已清除');
    }).catch(function () {});
  };

  // ============ LOGGING ============
  CEM.addLog = function (type, action, target, projectId) {
    var log = {
      id: Date.now(),
      type: type,
      action: action,
      target: target,
      projectId: projectId || '',
      user: (CEM.currentUser && CEM.currentUser.value ? CEM.currentUser.value.displayName : '系统'),
      time: new Date().toLocaleString(),
    };
    var entries = CEM.logEntries ? CEM.logEntries.value : [];
    entries.unshift(log);
    if (entries.length > 500) entries.length = 500;
  };

  // ============ UTILITY FUNCTIONS ============
  CEM.stageTagType = function (stage) {
    var map = { decision: 'info', bidding: '', construction: 'warning', completion: 'success' };
    return map[stage] || 'info';
  };

  CEM.stageLabel = function (stage) {
    var map = { decision: '决策', bidding: '招投标', construction: '施工', completion: '竣工' };
    return map[stage] || stage;
  };

  CEM.formatMoney = function (val) {
    if (Math.abs(val) >= 10000) return (val / 10000).toFixed(2) + ' 万元';
    return val.toLocaleString() + ' 元';
  };

  // ============ INIT ============
  CEM.initApp = async function () {
    // Register Service Worker
    if ('serviceWorker' in navigator) {
      var swCode =
        'const CACHE="cost-eng-v1";' +
        'const ASSETS=["/"];' +
        'self.addEventListener("install",function(e){e.waitUntil(caches.open(CACHE).then(function(c){return c.addAll(ASSETS)}))});' +
        'self.addEventListener("fetch",function(e){e.respondWith(caches.match(e.request).then(function(r){return r||fetch(e.request)}))});';
      var blob = new Blob([swCode], { type: 'application/javascript' });
      navigator.serviceWorker.register(URL.createObjectURL(blob)).then(function () {
        console.log('SW registered');
      }).catch(function () {});
    }

    // Check saved user
    var savedUser = localStorage.getItem('cost_app_user');
    if (savedUser) {
      try {
        CEM.currentUser.value = JSON.parse(savedUser);
        CEM.loggedIn.value = true;
        CEM.loginTime.value = localStorage.getItem('cost_app_login_time') || '';
      } catch (e) { /* ignore */ }
    }

    // Check dark mode
    var savedDark = localStorage.getItem('cost_app_dark');
    if (savedDark === '1') {
      CEM.isDark.value = true;
      document.documentElement.classList.add('dark');
    }

    // Check auto save
    var savedAuto = localStorage.getItem('cost_app_auto_save');
    if (savedAuto === '0') CEM.autoSave.value = false;

    // Load data
    if (CEM.loggedIn.value) {
      CEM.loadProjFromLocal();
      await CEM.loadFromLocal();
      if (CEM.loadAIConfig) CEM.loadAIConfig();
      if (CEM.loadAIChatHistory) CEM.loadAIChatHistory();
      Vue.nextTick(function () {
        CEM.navigate('dashboard');
        if (CEM.renderDashboardCharts) CEM.renderDashboardCharts();
      });
    }

    // Watch autoSave
    Vue.watch(CEM.autoSave, function (val) {
      localStorage.setItem('cost_app_auto_save', val ? '1' : '0');
      if (val) CEM.saveToLocal();
    });
  };

})();
