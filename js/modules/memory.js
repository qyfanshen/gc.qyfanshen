// js/modules/memory.js — Agent Memory Graph
;(function() {
  const { ref, reactive, computed, nextTick } = Vue;
  const { ElMessage, ElMessageBox, ElNotification } = ElementPlus;

  // ===== STATE =====
  const decisionTypes = ['项目创建', '变更批准', '定额选用', '风险处理', '结算审核', '组价决策', '清单调整', '其他'];
  const decisionMemory = ref([]);
  const memorySearchQuery = ref('');
  const memoryFilterType = ref('');
  const memoryDetailVisible = ref(false);
  const viewingMemory = ref(null);

  // Common Chinese/English stop words to exclude from keyword extraction
  const STOP_WORDS = new Set([
    '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个',
    '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好',
    '自己', '这', '那', '他', '她', '它', '们', '什么', '哪', '怎么', '吗', '啊',
    '与', '或', '及', '等', '被', '把', '从', '对', '向', '让', '其', '为', '以',
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'can', 'shall', 'to', 'of', 'in', 'for',
    'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during',
    'before', 'after', 'above', 'below', 'between', 'and', 'but', 'or',
    'nor', 'not', 'so', 'yet', 'both', 'either', 'neither', 'each', 'every',
    'all', 'any', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
    'only', 'own', 'same', 'than', 'too', 'very', 'just', 'because',
  ]);

  // ===== FUNCTIONS =====

  function generateKeywords(text) {
    if (!text || typeof text !== 'string') return [];
    // Split on whitespace, Chinese punctuation, and common delimiters
    const segments = text.split(/[\s,，。！？、：；（）\(\)\[\]【】""''\t\n\r]+/).filter(Boolean);
    const seen = new Set();
    const keywords = [];
    for (const w of segments) {
      if (w.length > 1 && !STOP_WORDS.has(w.toLowerCase()) && !seen.has(w)) {
        seen.add(w);
        keywords.push(w);
        if (keywords.length >= 12) break;
      }
    }
    return keywords;
  }

  function recordDecision(type, context, decision, projectId) {
    const mem = {
      id: 'MEM-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
      time: new Date().toISOString(),
      type: decisionTypes.includes(type) ? type : '其他',
      projectId: projectId || '',
      context: context || '',
      decision: decision || '',
      outcome: '',
      keywords: generateKeywords((context || '') + ' ' + (decision || '')),
      embedding: null,
    };
    decisionMemory.value.unshift(mem);
    // Cap at 500 entries to prevent unbounded growth
    if (decisionMemory.value.length > 500) decisionMemory.value.length = 500;
    saveMemoriesToDB();
    window.CEM.addLog?.('memory', '记录决策', `${type}: ${decision}`, projectId);
    return mem;
  }

  function searchMemory() {
    const q = memorySearchQuery.value.toLowerCase().trim();
    if (!q) return decisionMemory.value;
    const results = decisionMemory.value.filter(m => {
      const haystack = [
        m.context || '',
        m.decision || '',
        (m.keywords || []).join(' '),
        m.type || '',
      ].join(' ').toLowerCase();
      return haystack.includes(q);
    });
    return results;
  }

  function getRelevantMemories(context, limit) {
    if (!context || typeof context !== 'string' || !decisionMemory.value.length) return [];
    limit = limit || 3;
    var ctxKeywords = generateKeywords(context);
    if (!ctxKeywords.length) {
      return decisionMemory.value.slice(0, limit);
    }

    var now = Date.now();
    var scored = decisionMemory.value.map(function(m) {
      var score = 0;
      var memText = [
        m.context || '',
        m.decision || '',
        (m.keywords || []).join(' '),
        m.type || '',
      ].join(' ').toLowerCase();

      for (var i = 0; i < ctxKeywords.length; i++) {
        if (memText.indexOf(ctxKeywords[i].toLowerCase()) !== -1) {
          score += 1;
        }
      }

      // Boost by recency: memories decay over 30 days
      var ageHours = (now - new Date(m.time).getTime()) / (1000 * 60 * 60);
      score *= Math.max(0.3, 1 - ageHours / (24 * 30));

      return { mem: m, score: score };
    });

    scored.sort(function(a, b) { return b.score - a.score; });

    var result = [];
    for (var i = 0; i < scored.length && result.length < limit; i++) {
      if (scored[i].score > 0) {
        result.push(scored[i].mem);
      }
    }
    return result;
  }

  function deleteMemory(id) {
    var idx = -1;
    for (var i = 0; i < decisionMemory.value.length; i++) {
      if (decisionMemory.value[i].id === id) { idx = i; break; }
    }
    if (idx >= 0) {
      decisionMemory.value.splice(idx, 1);
      saveMemoriesToDB();
      ElMessage.success('记忆已删除');
    }
  }

  function clearAllMemories() {
    ElMessageBox.confirm(
      '确定要清除所有决策记忆吗？此操作不可恢复！',
      '清除确认',
      { confirmButtonText: '确定清除', cancelButtonText: '取消', type: 'error' }
    ).then(function() {
      decisionMemory.value = [];
      saveMemoriesToDB();
      ElMessage.success('所有决策记忆已清除');
    }).catch(function() {});
  }

  function exportMemories() {
    var data = JSON.stringify(decisionMemory.value, null, 2);
    var blob = new Blob([data], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = '决策记忆导出_' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(url);
    ElMessage.success('记忆导出成功');
  }

  function viewMemoryDetail(mem) {
    viewingMemory.value = mem;
    memoryDetailVisible.value = true;
  }

  function injectContextMemories() {
    var ctx = window.CEM.aiContextData;
    if (!ctx || !ctx.value || !decisionMemory.value.length) return '';

    var contextText = [
      ctx.value.projectName,
      ctx.value.projectType,
      ctx.value.stage,
      ctx.value.extraContext,
    ].filter(Boolean).join(' ');

    if (!contextText) return '';

    var relevant = getRelevantMemories(contextText, 3);
    if (!relevant.length) return '';

    var lines = ['## 相关决策记忆'];
    for (var i = 0; i < relevant.length; i++) {
      var m = relevant[i];
      var dateStr = new Date(m.time).toLocaleDateString();
      lines.push('- [' + m.type + '] ' + m.decision + '（' + dateStr + '）');
    }
    return lines.join('\n');
  }

  async function saveMemoriesToDB() {
    try {
      await window.CEM.db.table('settings').put({
        key: 'decisionMemories',
        value: JSON.parse(JSON.stringify(decisionMemory.value)),
      });
    } catch (e) {
      console.warn('Save decision memories failed:', e);
    }
  }

  async function loadMemoriesFromDB() {
    try {
      var s = await window.CEM.db.table('settings').get('decisionMemories');
      if (s && s.value) {
        decisionMemory.value = s.value;
      }
    } catch (e) {
      // Table or key may not exist yet — safe to ignore
    }
  }

  // ===== COMPUTED =====
  var filteredMemories = computed(function() {
    var list = decisionMemory.value;
    var q = memorySearchQuery.value.toLowerCase().trim();
    if (q) {
      list = list.filter(function(m) {
        var haystack = [
          m.context || '',
          m.decision || '',
          (m.keywords || []).join(' '),
          m.type || '',
        ].join(' ').toLowerCase();
        return haystack.indexOf(q) !== -1;
      });
    }
    var typeFilter = memoryFilterType.value;
    if (typeFilter) {
      list = list.filter(function(m) { return m.type === typeFilter; });
    }
    return list;
  });

  var memoryTimeline = computed(function() {
    var groups = {};
    for (var i = 0; i < decisionMemory.value.length; i++) {
      var m = decisionMemory.value[i];
      var date = new Date(m.time).toLocaleDateString();
      if (!groups[date]) groups[date] = [];
      groups[date].push(m);
    }
    var entries = Object.entries(groups);
    var result = [];
    for (var j = 0; j < entries.length; j++) {
      result.push({ date: entries[j][0], mems: entries[j][1] });
    }
    return result;
  });

  var memoryStats = computed(function() {
    var counts = {};
    for (var i = 0; i < decisionTypes.length; i++) {
      counts[decisionTypes[i]] = 0;
    }
    for (var j = 0; j < decisionMemory.value.length; j++) {
      var t = decisionMemory.value[j].type;
      if (counts[t] !== undefined) {
        counts[t]++;
      } else {
        counts[t] = 1;
      }
    }
    return counts;
  });

  // ===== AUTO-REGISTER HOOKS =====
  // Monkey-patch existing CEM functions to auto-record decisions.
  // Uses deferred execution to ensure target modules are loaded first.

  function setupAutoHooks() {
    var CEM = window.CEM;

    // ── Patch saveProject → record '项目创建' ──
    if (CEM.saveProject && !CEM._saveProjectHooked) {
      CEM._saveProjectHooked = true;
      var _originalSaveProject = CEM.saveProject;
      CEM.saveProject = function() {
        var isNew = !CEM.editingProj || !CEM.editingProj.value;
        var projectName = CEM.projForm ? CEM.projForm.name : '';
        var projectId = CEM.projForm ? CEM.projForm.id : '';
        var result = _originalSaveProject.apply(this, arguments);
        if (isNew && projectName) {
          // saveProject uses internal setTimeout(300ms), so defer past it
          setTimeout(function() {
            recordDecision('项目创建', '创建新项目：' + projectName, '项目「' + projectName + '」已创建并保存', projectId);
          }, 400);
        }
        return result;
      };
    }

    // ── Patch submitChange → record '变更批准' (submission) ──
    if (CEM.submitChange && !CEM._submitChangeHooked) {
      CEM._submitChangeHooked = true;
      var _originalSubmitChange = CEM.submitChange;
      CEM.submitChange = function() {
        var projectId = CEM.changeForm ? CEM.changeForm.projectId : '';
        var reason = CEM.changeForm ? CEM.changeForm.reason : '';
        var result = _originalSubmitChange.apply(this, arguments);
        if (reason) {
          setTimeout(function() {
            recordDecision('变更批准', '提交变更申请：' + reason, '变更申请「' + reason + '」已提交，待审批', projectId);
          }, 150);
        }
        return result;
      };
    }

    // ── Patch approveChangeStep → record '变更批准' (approval) ──
    if (CEM.approveChangeStep && !CEM._approveChangeHooked) {
      CEM._approveChangeHooked = true;
      var _originalApproveChange = CEM.approveChangeStep;
      CEM.approveChangeStep = function(order) {
        var result = _originalApproveChange.apply(this, arguments);
        if (order && order.status === 'approved') {
          var amount = order.approvedAmount || order.estimatedAmount || 0;
          recordDecision(
            '变更批准',
            '变更审批通过：' + order.id,
            '变更「' + order.id + '」已通过全部审批，批准金额：' + amount + '万元',
            order.projectId
          );
        }
        return result;
      };
    }

    // ── Patch buildAgentContext → inject memory context ──
    if (CEM.buildAgentContext && !CEM._buildAgentContextHooked) {
      CEM._buildAgentContextHooked = true;
      var _originalBuildAgentContext = CEM.buildAgentContext;
      CEM.buildAgentContext = function() {
        var base = _originalBuildAgentContext.apply(this, arguments);
        var memContext = injectContextMemories();
        if (memContext) {
          return base + '\n\n' + memContext;
        }
        return base;
      };
    }
  }

  // Defer hook setup: modules may not have registered their functions yet.
  // Try at 50ms, 200ms, and 500ms to cover various load-order scenarios.
  setTimeout(setupAutoHooks, 50);
  setTimeout(setupAutoHooks, 200);
  setTimeout(setupAutoHooks, 500);

  // Utility: get color for decision type tag
  function decisionTypeColor(type) {
    const map = {
      '项目创建':'#409eff','变更批准':'#e6a23c','定额选用':'#67c23a',
      '风险处理':'#f56c6c','结算审核':'#6366f1','组价决策':'#e6a23c',
      '清单调整':'#909399','其他':'#909399',
    };
    return map[type] || '#909399';
  }

  // ===== REGISTER =====
  window.CEM = window.CEM || {};
  Object.assign(window.CEM, {
    decisionTypes,
    decisionMemory,
    memorySearchQuery,
    memoryFilterType,
    memoryDetailVisible,
    viewingMemory,
    recordDecision,
    searchMemory,
    getRelevantMemories,
    deleteMemory,
    clearAllMemories,
    exportMemories,
    viewMemoryDetail,
    injectContextMemories,
    saveMemoriesToDB,
    loadMemoriesFromDB,
    filteredMemories,
    memoryTimeline,
    memoryStats,
    decisionTypes, decisionTypeColor,
  });
})();
