/**
 * app.js — Vue application assembly
 * Enumerates all window.CEM properties at setup() time.
 * Also exposes key functions on window for direct template access.
 */
(function () {
  var createApp = Vue.createApp;
  var onMounted = Vue.onMounted;

  function collectAllCEM() {
    var obj = {};
    if (window.CEM) {
      var keys = Object.keys(window.CEM);
      for (var i = 0; i < keys.length; i++) {
        obj[keys[i]] = window.CEM[keys[i]];
      }
    }
    return obj;
  }

  var app = createApp({
    setup: function () {
      onMounted(function () {
        if (window.CEM && window.CEM.initApp) {
          window.CEM.initApp().then(function() {
            if (window.CEM.markModulesReady) window.CEM.markModulesReady();
          });
        }
      });

      // Enumerate all CEM properties at setup time.
      // All module scripts have already run, so this is complete.
      return collectAllCEM();
    },
  });

  try {
    app.use(ElementPlus, { locale: ElementPlus.localeZhCn || ElementPlus.localeEn });
  } catch (e) { app.use(ElementPlus); }
  app.mount('#app');

  console.log('✅ 智慧造价平台 v3.0 已启动 · AI Agent架构');
  console.log('📋 CEM keys:', Object.keys(window.CEM || {}).length, 'properties');
  // Verify critical template bindings
  ['openProjDialog','saveProject','allProjects','projTypes','disciplines','stageLabel','filteredProjects','projDialogVisible','projForm'].forEach(function(k) {
    console.log('  ' + k + ':', window.CEM && k in window.CEM ? '✅' : '❌ MISSING');
  });
})();
