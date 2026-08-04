// js/modules/patrol.js — Autonomous Patrol Agent
;(function() {
  const { ref, reactive, computed, nextTick } = Vue;
  const { ElMessage, ElMessageBox, ElNotification } = ElementPlus;

  // ===== STATE =====
  const patrolRules = ref([
    {
      id: 'rule-1',
      name: '材料价格异常波动检测',
      icon: '🔍',
      description: '扫描pricingItems中材料市场价格，检测超出历史均值±15%的异常波动',
      enabled: true,
      category: '价格',
      severity: 'high',
    },
    {
      id: 'rule-2',
      name: '项目成本偏差监控',
      icon: '📊',
      description: '检查所有项目的实际成本vs预算，超出10%偏差标记预警',
      enabled: true,
      category: '成本',
      severity: 'high',
    },
    {
      id: 'rule-3',
      name: '变更累计超限预警',
      icon: '⚠️',
      description: '统计各项目已批准变更累计金额，超预算5%触发预警',
      enabled: true,
      category: '变更',
      severity: 'medium',
    },
    {
      id: 'rule-4',
      name: '清单完整性检查',
      icon: '📋',
      description: '验证quantityItems必需字段（编码、名称、单位、工程量）完整，缺失项标示',
      enabled: true,
      category: '数据',
      severity: 'low',
    },
    {
      id: 'rule-5',
      name: '工期风险扫描',
      icon: '🕐',
      description: '识别施工阶段进度滞后超15%的项目，评估工期风险',
      enabled: true,
      category: '工期',
      severity: 'medium',
    },
  ]);

  const patrolRunning = ref(false);
  const patrolResults = ref([]);
  const patrolHistory = ref([]);
  const patrolSchedule = ref(3600);       // seconds, default 1 hour
  const patrolTimer = ref(null);          // setInterval ID
  const patrolAutoMode = ref(false);

  // ===== FUNCTIONS =====

  /**
   * Build a context-data snapshot from all relevant CEM state
   * to pass into each patrol rule's analysis.
   */
  function buildPatrolContext() {
    var ctx = {};

    // Projects
    var projects = window.CEM.allProjects ? window.CEM.allProjects.value : [];
    ctx.projectCount = projects.length;
    ctx.projects = [];
    for (var i = 0; i < projects.length; i++) {
      var p = projects[i];
      ctx.projects.push({
        id: p.id,
        name: p.name,
        budget: p.budget,
        actual: p.actual,
        stage: p.stage,
        progress: p.progress,
        status: p.status,
      });
    }

    // Pricing items
    var pricingItems = window.CEM.pricingItems ? window.CEM.pricingItems.value : [];
    ctx.pricingCount = pricingItems.length;
    if (pricingItems.length <= 30) {
      ctx.pricingSample = [];
      for (var j = 0; j < pricingItems.length; j++) {
        var pi = pricingItems[j];
        ctx.pricingSample.push({
          quotaCode: pi.quotaCode,
          name: pi.name,
          unitPrice: pi.unitPrice,
          totalPrice: pi.totalPrice,
          quantity: pi.quantity,
        });
      }
    }

    // Change orders
    var changeOrders = window.CEM.changeOrders ? window.CEM.changeOrders.value : [];
    ctx.changeCount = changeOrders.length;
    ctx.approvedChangeCount = 0;
    ctx.totalApprovedAmount = 0;
    for (var k = 0; k < changeOrders.length; k++) {
      var co = changeOrders[k];
      if (co.status === 'approved') {
        ctx.approvedChangeCount++;
        ctx.totalApprovedAmount += (co.approvedAmount || 0);
      }
    }

    // Quantity items
    var quantityItems = window.CEM.quantityItems ? window.CEM.quantityItems.value : [];
    ctx.quantityCount = quantityItems.length;

    return ctx;
  }

  /**
   * Local (non-AI) analysis fallback for each rule.
   * Provides deterministic rule-based checks using available project data.
   */
  function getLocalAnalysis(rule, contextData) {
    switch (rule.id) {
      case 'rule-1': {
        // 材料价格异常波动检测
        var items = contextData.pricingSample || [];
        if (!items.length) return '暂无定价数据可供分析。';
        var prices = [];
        for (var i = 0; i < items.length; i++) {
          var p = items[i].unitPrice || items[i].totalPrice || 0;
          if (p > 0) prices.push(p);
        }
        if (!prices.length) return '无有效价格数据。';
        var sum = 0;
        for (var j = 0; j < prices.length; j++) sum += prices[j];
        var avg = sum / prices.length;
        var anomalies = [];
        for (var k = 0; k < items.length; k++) {
          var ip = items[k].unitPrice || items[k].totalPrice || 0;
          if (ip > 0 && avg > 0 && Math.abs(ip - avg) / avg > 0.15) {
            anomalies.push(items[k].name || items[k].quotaCode);
          }
        }
        if (anomalies.length) {
          return '⚠️ 发现 ' + anomalies.length + ' 项材料价格超出均值±15%。均价 ' + avg.toFixed(2) + '，异常项：' +
            anomalies.slice(0, 3).join('、') + (anomalies.length > 3 ? '等' : '') + '。建议人工复核市场价格。';
        }
        return '✅ 材料价格整体稳定，无显著异常波动（均价 ' + avg.toFixed(2) + '，波动在正常范围内）。';
      }

      case 'rule-2': {
        // 项目成本偏差监控
        var projects = contextData.projects || [];
        if (!projects.length) return '暂无项目数据。';
        var overBudget = [];
        for (var i = 0; i < projects.length; i++) {
          var p = projects[i];
          if (p.budget > 0 && p.actual > p.budget * 1.1) {
            var deviation = ((p.actual / p.budget - 1) * 100).toFixed(1);
            overBudget.push(p.name + '(偏差+' + deviation + '%)');
          }
        }
        if (overBudget.length) {
          return '⚠️ ' + overBudget.length + ' 个项目成本偏差超10%：' + overBudget.join('、') + '。建议启动成本管控专项审查。';
        }
        return '✅ 所有项目成本偏差均在10%以内，成本整体受控。';
      }

      case 'rule-3': {
        // 变更累计超限预警
        var changes = window.CEM.changeOrders ? window.CEM.changeOrders.value : [];
        var approved = [];
        for (var i = 0; i < changes.length; i++) {
          if (changes[i].status === 'approved') approved.push(changes[i]);
        }
        if (!approved.length) return '暂无已批准变更记录。';

        var byProject = {};
        for (var j = 0; j < approved.length; j++) {
          var c = approved[j];
          var pid = c.projectId;
          if (!byProject[pid]) {
            byProject[pid] = { id: pid, name: c.projectName || pid, totalChanges: 0 };
          }
          byProject[pid].totalChanges += (c.approvedAmount || 0);
        }

        var projects = contextData.projects || [];
        var overLimit = [];
        var keys = Object.keys(byProject);
        for (var k = 0; k < keys.length; k++) {
          var bp = byProject[keys[k]];
          var proj = null;
          for (var m = 0; m < projects.length; m++) {
            if (projects[m].id === bp.id) { proj = projects[m]; break; }
          }
          if (proj && proj.budget > 0 && bp.totalChanges / proj.budget > 0.05) {
            var ratio = (bp.totalChanges / proj.budget * 100).toFixed(1);
            overLimit.push(bp.name + '(变更累计' + bp.totalChanges.toFixed(0) + '万，占预算' + ratio + '%)');
          }
        }

        if (overLimit.length) {
          return '⚠️ ' + overLimit.length + ' 个项目变更累计超预算5%阈值：' + overLimit.join('、') + '。建议审查变更合理性与必要性。';
        }
        return '✅ 所有项目变更累计均在预算5%以内，变更管控有效。';
      }

      case 'rule-4': {
        // 清单完整性检查
        var qItems = window.CEM.quantityItems ? window.CEM.quantityItems.value : [];
        if (!qItems.length) return '暂无工程量清单数据。';
        var incomplete = [];
        for (var i = 0; i < qItems.length; i++) {
          var item = qItems[i];
          if (!item.code || !item.name || !item.unit || item.quantity === undefined || item.quantity === null) {
            incomplete.push(item.code || item.name || '(无标识)');
          }
        }
        if (incomplete.length) {
          return '⚠️ ' + incomplete.length + '/' + qItems.length + ' 项清单存在字段缺失（编码/名称/单位/工程量不完整）。示例：' +
            incomplete.slice(0, 3).join('、') + '。请及时补全数据。';
        }
        return '✅ 全部 ' + qItems.length + ' 项清单字段完整，数据质量良好。';
      }

      case 'rule-5': {
        // 工期风险扫描
        var projects = contextData.projects || [];
        var constructionProjects = [];
        for (var i = 0; i < projects.length; i++) {
          if (projects[i].stage === 'construction') constructionProjects.push(projects[i]);
        }
        if (!constructionProjects.length) return '暂无在建项目。';

        var now = new Date();
        var behind = [];
        for (var j = 0; j < constructionProjects.length; j++) {
          var p = constructionProjects[j];
          if (!p.startDate || !p.endDate) continue;
          var totalDays = (new Date(p.endDate) - new Date(p.startDate)) / (1000 * 60 * 60 * 24);
          var elapsedDays = (now - new Date(p.startDate)) / (1000 * 60 * 60 * 24);
          if (totalDays <= 0) continue;
          var expectedProgress = (elapsedDays / totalDays) * 100;
          if (p.progress < expectedProgress - 15) {
            behind.push(p.name + '(进度' + p.progress + '%，预计应达' + Math.round(expectedProgress) + '%)');
          }
        }

        if (behind.length) {
          return '⚠️ ' + behind.length + ' 个在建项目进度滞后超15%：' + behind.join('、') + '。建议核查施工组织计划并调整资源配置。';
        }
        return '✅ ' + constructionProjects.length + ' 个在建项目工期进度正常，暂无显著滞后风险。';
      }

      default:
        return '✅ 已完成基础检查，未发现异常。';
    }
  }

  /**
   * Analyze a patrol rule using AI if configured, falling back to local analysis.
   *
   * @param {Object} rule   - One of the patrolRules entries
   * @param {Object} contextData - Data snapshot from buildPatrolContext()
   * @returns {Promise<string>} Analysis text
   */
  async function analyzeRuleWithAI(rule, contextData) {
    // Check AI configuration
    var isConfigured = window.CEM.aiConfigured ? window.CEM.aiConfigured.value : false;
    if (!isConfigured) {
      return getLocalAnalysis(rule, contextData);
    }

    var config = window.CEM.aiConfig;
    if (!config || !config.apiKey || !config.endpoint) {
      return getLocalAnalysis(rule, contextData);
    }

    var prompt = [
      '你是工程造价AI巡检助手。请对以下巡检规则进行快速分析：',
      '',
      '**巡检规则**：' + rule.name,
      '**规则描述**：' + rule.description,
      '**严重级别**：' + (rule.severity === 'high' ? '高' : rule.severity === 'medium' ? '中' : '低'),
      '',
      '**当前项目数据上下文**：',
      '```json',
      JSON.stringify(contextData, null, 2),
      '```',
      '',
      '请按以下格式输出（200字以内，简洁专业）：',
      '1. 异常发现（如果有，以⚠️开头）或正常结论（以✅开头）',
      '2. 关键数据支撑',
      '3. 处置建议（如有异常）',
    ].join('\n');

    var controller = new AbortController();
    var timeoutId = setTimeout(function() { controller.abort(); }, 30000);

    try {
      var response = await fetch(config.endpoint + '/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + config.apiKey,
        },
        body: JSON.stringify({
          model: config.model || 'deepseek-chat',
          messages: [
            { role: 'system', content: '你是工程造价AI巡检助手。回复简洁专业，200字以内。' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.3,
          max_tokens: 600,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error('HTTP ' + response.status);
      }

      var data = await response.json();
      var content = data.choices && data.choices[0] && data.choices[0].message
        ? data.choices[0].message.content
        : null;

      return content || getLocalAnalysis(rule, contextData);
    } catch (e) {
      clearTimeout(timeoutId);
      console.warn('AI patrol analysis failed for rule "' + rule.name + '", using local fallback:', e.message);
      return getLocalAnalysis(rule, contextData);
    }
  }

  /**
   * Manually trigger a full patrol across all enabled rules.
   */
  async function runPatrol() {
    if (patrolRunning.value) return;

    patrolRunning.value = true;
    var startTime = new Date();
    var contextData = buildPatrolContext();

    var enabledRules = [];
    for (var i = 0; i < patrolRules.value.length; i++) {
      if (patrolRules.value[i].enabled) enabledRules.push(patrolRules.value[i]);
    }

    var results = [];

    for (var j = 0; j < enabledRules.length; j++) {
      var rule = enabledRules[j];
      var ruleStart = Date.now();
      try {
        var analysis = await analyzeRuleWithAI(rule, contextData);
        var hasAlert = analysis.indexOf('⚠️') !== -1 ||
                       analysis.indexOf('异常') !== -1 ||
                       analysis.indexOf('风险') !== -1 ||
                       analysis.indexOf('超限') !== -1 ||
                       analysis.indexOf('缺失') !== -1 ||
                       analysis.indexOf('滞后') !== -1;

        results.push({
          ruleId: rule.id,
          ruleName: rule.name,
          icon: rule.icon,
          category: rule.category,
          severity: rule.severity,
          analysis: analysis,
          hasAlert: hasAlert,
          timestamp: new Date().toISOString(),
          duration: Date.now() - ruleStart,
        });
      } catch (e) {
        results.push({
          ruleId: rule.id,
          ruleName: rule.name,
          icon: rule.icon,
          category: rule.category,
          severity: rule.severity,
          analysis: '分析异常：' + (e.message || '未知错误'),
          hasAlert: true,
          timestamp: new Date().toISOString(),
          duration: Date.now() - ruleStart,
        });
      }
    }

    patrolResults.value = results;

    // Build history record
    var alertCount = 0;
    for (var k = 0; k < results.length; k++) {
      if (results[k].hasAlert) alertCount++;
    }

    var record = {
      id: 'PTR-' + Date.now(),
      time: startTime.toISOString(),
      timeFormatted: startTime.toLocaleString(),
      totalRules: results.length,
      alertCount: alertCount,
      results: JSON.parse(JSON.stringify(results)),
    };

    patrolHistory.value.unshift(record);
    // Cap history
    if (patrolHistory.value.length > 200) patrolHistory.value.length = 200;

    savePatrolHistory();
    patrolRunning.value = false;

    // Notify user
    if (alertCount > 0) {
      ElNotification({
        title: '巡检完成',
        message: '完成 ' + results.length + ' 项巡检，发现 ' + alertCount + ' 项预警',
        type: alertCount > 3 ? 'error' : 'warning',
        duration: 5000,
      });
    } else {
      ElMessage.success('巡检完成，' + results.length + ' 项规则全部通过');
    }

    window.CEM.addLog && window.CEM.addLog('patrol', '自动巡检', '发现' + alertCount + '项预警', '');
  }

  /**
   * Start autonomous patrol on a setInterval schedule.
   */
  function startAutoPatrol() {
    if (patrolTimer.value) {
      ElMessage.info('自动巡检已在运行中');
      return;
    }
    patrolAutoMode.value = true;
    var intervalMs = patrolSchedule.value * 1000;
    patrolTimer.value = setInterval(function() {
      runPatrol();
    }, intervalMs);

    var minutes = Math.round(patrolSchedule.value / 60);
    ElMessage.success('自动巡检已启动，间隔 ' + minutes + ' 分钟');
    window.CEM.addLog && window.CEM.addLog('patrol', '启动自动巡检', '间隔' + minutes + '分钟', '');
  }

  /**
   * Stop autonomous patrol.
   */
  function stopAutoPatrol() {
    if (patrolTimer.value) {
      clearInterval(patrolTimer.value);
      patrolTimer.value = null;
    }
    patrolAutoMode.value = false;
    ElMessage.info('自动巡检已停止');
    window.CEM.addLog && window.CEM.addLog('patrol', '停止自动巡检', '', '');
  }

  /**
   * Generate a morning brief summary of the latest patrol,
   * formatted as a "每日造价晨报" with weather-style emoji indicators.
   *
   * ☀️  normal   — no alerts
   * 🌤️  warning  — minor issues
   * ⛈️  alert    — significant risks detected
   */
  function generateMorningBrief() {
    var lines = [];

    lines.push('═══════════════════════════════');
    lines.push('   📋 每日造价晨报');
    lines.push('═══════════════════════════════');
    lines.push('📅 日期：' + new Date().toLocaleDateString());
    lines.push('🕐 生成时间：' + new Date().toLocaleTimeString());
    lines.push('');

    // Determine overall status from projects
    var projects = window.CEM.allProjects ? window.CEM.allProjects.value : [];
    var riskCount = 0;
    var warningCount = 0;
    for (var i = 0; i < projects.length; i++) {
      if (projects[i].status === 'risk') riskCount++;
      if (projects[i].status === 'warning') warningCount++;
    }

    if (riskCount > 0) {
      lines.push('⛈️ 整体状态：预警 (存在 ' + riskCount + ' 个高风险项目)');
    } else if (warningCount > 0) {
      lines.push('🌤️ 整体状态：关注 (存在 ' + warningCount + ' 个预警项目)');
    } else {
      lines.push('☀️ 整体状态：正常');
    }
    lines.push('');

    // Project overview
    lines.push('─── 📊 项目概览 ───');
    lines.push('   项目总数：' + projects.length);
    var inConstruction = 0;
    for (var ci = 0; ci < projects.length; ci++) {
      if (projects[ci].stage === 'construction') inConstruction++;
    }
    lines.push('   在建项目：' + inConstruction);
    lines.push('   风险项目：' + riskCount + (riskCount ? ' ⛈️' : ''));
    lines.push('   预警项目：' + warningCount + (warningCount ? ' 🌤️' : ''));
    lines.push('');

    // Latest patrol results
    var lastPatrol = patrolHistory.value[0];
    if (lastPatrol) {
      lines.push('─── 🔍 最近巡检 ───');
      lines.push('   巡检时间：' + lastPatrol.timeFormatted);
      lines.push('   巡检项数：' + lastPatrol.totalRules);
      lines.push('   预警数量：' + lastPatrol.alertCount + (lastPatrol.alertCount > 0 ? ' ⚠️' : ' ✅'));
      if (lastPatrol.results) {
        for (var r = 0; r < lastPatrol.results.length; r++) {
          var res = lastPatrol.results[r];
          var icon = res.hasAlert ? '⚠️' : '✅';
          lines.push('   ' + icon + ' ' + res.ruleName);
          if (res.hasAlert && res.analysis) {
            var shortAnalysis = res.analysis.length > 70
              ? res.analysis.slice(0, 70) + '...'
              : res.analysis;
            lines.push('      ' + shortAnalysis);
          }
        }
      }
      lines.push('');
    } else {
      lines.push('─── 🔍 最近巡检 ───');
      lines.push('   暂无巡检记录，建议手动执行一次巡检。');
      lines.push('');
    }

    // High-risk project details
    if (riskCount > 0) {
      lines.push('─── ⛈️ 高风险项目 ───');
      for (var ri = 0; ri < projects.length; ri++) {
        if (projects[ri].status === 'risk') {
          lines.push('   • ' + projects[ri].name + ' (预算' + projects[ri].budget + '万，实际' + projects[ri].actual + '万，进度' + projects[ri].progress + '%)');
        }
      }
      lines.push('');
    }

    lines.push('═══════════════════════════════');
    lines.push('   智慧造价AI巡检系统 · 自动生成');
    lines.push('═══════════════════════════════');

    return lines.join('\n');
  }

  /**
   * Clear all patrol history.
   */
  function clearPatrolHistory() {
    ElMessageBox.confirm(
      '确定要清除所有巡检历史记录吗？',
      '清除确认',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    ).then(function() {
      patrolHistory.value = [];
      patrolResults.value = [];
      savePatrolHistory();
      ElMessage.success('巡检历史已清除');
    }).catch(function() {});
  }

  /**
   * Export the latest patrol results as an Excel file (XLSX).
   */
  function exportPatrolReport() {
    if (!patrolResults.value.length) {
      ElMessage.warning('暂无巡检结果可导出，请先执行巡检');
      return;
    }

    var data = [];
    for (var i = 0; i < patrolResults.value.length; i++) {
      var r = patrolResults.value[i];
      data.push({
        '巡检规则': r.ruleName,
        '类别': r.category,
        '严重级别': r.severity === 'high' ? '高' : r.severity === 'medium' ? '中' : '低',
        '是否预警': r.hasAlert ? '是' : '否',
        '分析结果': r.analysis,
        '巡检时间': r.timestamp,
        '耗时(ms)': r.duration,
      });
    }

    var ws = XLSX.utils.json_to_sheet(data);
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '巡检报告');
    XLSX.writeFile(wb, '巡检报告_' + new Date().toISOString().slice(0, 10) + '.xlsx');
    ElMessage.success('巡检报告导出成功');
  }

  /**
   * Persist patrol history to IndexedDB.
   */
  async function savePatrolHistory() {
    try {
      await window.CEM.db.table('settings').put({
        key: 'patrolHistory',
        value: JSON.parse(JSON.stringify(patrolHistory.value)),
      });
    } catch (e) {
      console.warn('Save patrol history failed:', e);
    }
  }

  /**
   * Load patrol history from IndexedDB.
   */
  async function loadPatrolHistory() {
    try {
      var s = await window.CEM.db.table('settings').get('patrolHistory');
      if (s && s.value) {
        patrolHistory.value = s.value;
      }
    } catch (e) {
      // Table or key may not exist yet — safe to ignore
    }
  }

  /**
   * Toggle a patrol rule on/off.
   */
  function togglePatrolRule(ruleId) {
    for (var i = 0; i < patrolRules.value.length; i++) {
      if (patrolRules.value[i].id === ruleId) {
        patrolRules.value[i].enabled = !patrolRules.value[i].enabled;
        break;
      }
    }
  }

  /**
   * Update the patrol schedule interval.
   * If auto mode is active, restart the timer with the new interval.
   */
  function updatePatrolSchedule(seconds) {
    patrolSchedule.value = seconds;
    if (patrolAutoMode.value && patrolTimer.value) {
      clearInterval(patrolTimer.value);
      patrolTimer.value = setInterval(function() {
        runPatrol();
      }, patrolSchedule.value * 1000);
      ElMessage.success('巡检间隔已更新为 ' + Math.round(seconds / 60) + ' 分钟');
    }
  }

  // ===== COMPUTED =====
  var patrolAlertCount = computed(function() {
    var count = 0;
    for (var i = 0; i < patrolResults.value.length; i++) {
      if (patrolResults.value[i].hasAlert) count++;
    }
    return count;
  });

  var patrolStatusClass = computed(function() {
    var count = patrolAlertCount.value;
    if (patrolResults.value.length === 0) return 'normal';
    if (count === 0) return 'normal';
    if (count <= 2) return 'warning';
    return 'danger';
  });

  var nextPatrolTime = computed(function() {
    if (!patrolAutoMode.value) return '未启动';
    var next = new Date(Date.now() + patrolSchedule.value * 1000);
    return next.toLocaleTimeString();
  });

  // ===== REGISTER =====
  window.CEM = window.CEM || {};
  Object.assign(window.CEM, {
    // State
    patrolRules,
    patrolRunning,
    patrolResults,
    patrolHistory,
    patrolSchedule,
    patrolTimer,
    patrolAutoMode,
    // Functions
    runPatrol,
    startAutoPatrol,
    stopAutoPatrol,
    generateMorningBrief,
    clearPatrolHistory,
    exportPatrolReport,
    analyzeRuleWithAI,
    savePatrolHistory,
    loadPatrolHistory,
    togglePatrolRule,
    updatePatrolSchedule,
    buildPatrolContext,
    // Computed
    patrolAlertCount,
    patrolStatusClass,
    nextPatrolTime,
  });
})();
