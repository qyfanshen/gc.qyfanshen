// js/modules/negotiation.js — Claim Negotiation Simulator (Multi-Role AI Simulation)
;(function() {
  const { ref, reactive, computed, nextTick } = Vue;
  const { ElMessage, ElMessageBox, ElNotification } = ElementPlus;

  // ===== NEGOTIATION STATE =====
  const negoScenario = ref('');
  const negoProjectId = ref('');
  const negoClaimAmount = ref(0);
  const negoRunning = ref(false);
  const negoResults = ref({ ourSide: '', theirSide: '', arbitrator: '', batna: '', strategy: '' });
  const negoHistory = ref([]);

  let negoAbortControllers = [];

  // ===== SYSTEM PROMPTS =====
  const SYSTEM_PROMPTS = {
    ourSide: `你是索赔方造价顾问，代表施工方利益。你的目标是最大化索赔金额。你需要：
1) 找出所有可索赔的合同依据
2) 详细计算每项索赔金额
3) 预判对方可能的反驳点并准备应对
4) 给出谈判策略建议

请按以下格式输出：
【合同依据】
列出可引用的合同条款和规范条文

【索赔明细】
逐项列出索赔金额及计算过程，使用表格格式

【预判反驳】
对方可能提出的质疑及你的应对

【谈判建议】
开价策略、让步空间、建议的谈判节奏

请基于合同规范和行业惯例进行分析。`,

    theirSide: `你是被索赔方（甲方/业主）造价顾问，代表甲方利益。你的目标是合理核减索赔金额。你需要：
1) 找出索赔依据中的漏洞
2) 提出核减理由和计算依据
3) 指出对方应自行承担的部分
4) 给出你认为合理的结算金额

请按以下格式输出：
【依据审查】
逐条审查索赔方引用的合同依据，指出问题

【核减明细】
逐项核减金额及理由，使用表格格式

【责任划分】
哪些费用应由施工方自行承担

【合理结算】
给出你认为公平合理的结算金额及理由

请基于合同规范和行业惯例进行分析。`,

    arbitrator: `你是独立第三方造价仲裁专家。请公正评估双方的依据，给出：
1) 最可能的裁定结果
2) 建议的和解区间
3) 此类争议的行业惯例处理方式

请按以下格式输出：
【争议焦点】
梳理双方核心分歧点

【裁定分析】
基于合同规范和行业惯例逐项分析

【裁定金额】
你认为最可能的裁定金额及计算依据

【和解建议】
建议的和解金额区间及理由

【风险提示】
如果进入正式仲裁/诉讼，各方需注意的风险

请引用相关规范条文（如GB50500、GF-2017-0201建设工程施工合同示范文本等）。`
  };

  // ===== API CALL HELPER =====
  async function callAI(systemPrompt, userMessage, signal) {
    const aiConfig = window.CEM?.aiConfig;
    if (!aiConfig || !aiConfig.apiKey || !aiConfig.endpoint) {
      throw new Error('AI未配置，请先在设置中配置AI API');
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ];

    const response = await fetch(aiConfig.endpoint + '/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + aiConfig.apiKey
      },
      body: JSON.stringify({
        model: aiConfig.model,
        messages: messages,
        temperature: aiConfig.temperature || 0.7,
        max_tokens: aiConfig.maxTokens || 4096,
        stream: false
      }),
      signal: signal
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }

  // ===== BUILD USER MESSAGE =====
  function buildUserMessage() {
    const parts = [];
    parts.push(`## 索赔场景\n${negoScenario.value}`);

    if (negoProjectId.value) {
      const projects = window.CEM?.projects || [];
      const project = projects.find(p => p.id === negoProjectId.value);
      if (project) {
        parts.push(`\n## 关联项目\n- 项目名称: ${project.name || project.projectName || '未知'}`);
        if (project.type || project.projectType) parts.push(`- 项目类型: ${project.type || project.projectType}`);
        if (project.budget) parts.push(`- 项目预算: ${project.budget}万元`);
      }
    }

    parts.push(`\n## 索赔金额\n${negoClaimAmount.value}万元`);
    parts.push(`\n请基于以上信息进行分析，给出专业意见。`);
    return parts.join('\n');
  }

  // ===== START NEGOTIATION =====
  async function startNegotiation() {
    if (!negoScenario.value.trim()) {
      ElMessage.warning('请输入索赔场景描述');
      return;
    }
    if (negoClaimAmount.value <= 0) {
      ElMessage.warning('请输入有效的索赔金额');
      return;
    }

    const aiConfig = window.CEM?.aiConfig;
    if (!aiConfig || !aiConfig.apiKey || !aiConfig.endpoint) {
      ElMessage.warning('请先在设置中配置AI API');
      return;
    }

    negoRunning.value = true;
    negoResults.value = { ourSide: '', theirSide: '', arbitrator: '', batna: '', strategy: '' };
    negoAbortControllers = [];

    const userMessage = buildUserMessage();

    // Launch 3 parallel AI calls
    const roles = [
      { key: 'ourSide', label: '🟢 己方造价师', prompt: SYSTEM_PROMPTS.ourSide },
      { key: 'theirSide', label: '🔴 对方造价师', prompt: SYSTEM_PROMPTS.theirSide },
      { key: 'arbitrator', label: '⚖️ 第三方仲裁', prompt: SYSTEM_PROMPTS.arbitrator }
    ];

    const promises = roles.map(role => {
      const controller = new AbortController();
      negoAbortControllers.push(controller);

      return callAI(role.prompt, userMessage, controller.signal)
        .then(content => {
          negoResults.value[role.key] = content;
          return { role: role.key, label: role.label, success: true, content };
        })
        .catch(err => {
          if (err.name === 'AbortError') {
            negoResults.value[role.key] = '（已中止）';
            return { role: role.key, label: role.label, success: false, content: '已中止' };
          }
          negoResults.value[role.key] = `❌ 分析失败: ${err.message}`;
          return { role: role.key, label: role.label, success: false, content: err.message };
        });
    });

    const results = await Promise.allSettled(promises);

    negoRunning.value = false;
    negoAbortControllers = [];

    // Check if all succeeded
    const allSuccess = results.every(r => r.value?.success);
    if (allSuccess) {
      synthesizeResults();
    } else {
      const failedRoles = results.filter(r => !r.value?.success).map(r => r.value?.label).join('、');
      ElMessage.warning(`${failedRoles} 分析失败，BATNA分析可能不完整`);
      // Still try to synthesize with what we have
      if (negoResults.value.ourSide && negoResults.value.theirSide && negoResults.value.arbitrator) {
        synthesizeResults();
      }
    }

    // Save to history
    saveToHistory();
  }

  // ===== STOP NEGOTIATION =====
  function stopNegotiation() {
    negoAbortControllers.forEach(ctrl => {
      try { ctrl.abort(); } catch (e) { /* ignore */ }
    });
    negoAbortControllers = [];
    negoRunning.value = false;
    ElMessage.info('已中止模拟');
  }

  // ===== SYNTHESIZE RESULTS =====
  function synthesizeResults() {
    const ourSide = negoResults.value.ourSide || '';
    const theirSide = negoResults.value.theirSide || '';
    const arbitrator = negoResults.value.arbitrator || '';

    // Try to extract amounts from the arbitrator's response
    const extractAmount = (text) => {
      const patterns = [
        /裁定金额[：:]\s*([\d,.]+)\s*万/,
        /建议.*?([\d,.]+)\s*[~～\-—至到]\s*([\d,.]+)\s*万/,
        /和解金额[：:]\s*([\d,.]+)\s*[~～\-—至到]\s*([\d,.]+)\s*万/,
        /([\d,.]+)\s*万/  // fallback: first amount found
      ];
      return null;
    };

    // BATNA calculation
    const claimAmount = negoClaimAmount.value;

    // Extract numerical estimates from arbitrator response
    const arbiAmountMatch = arbitrator.match(/(\d+(?:\.\d+)?)\s*万元?/g);
    let arbiAmounts = [];
    if (arbiAmountMatch) {
      arbiAmounts = arbiAmountMatch.map(m => parseFloat(m.replace(/[万元]/g, ''))).filter(n => n > 0 && n <= claimAmount * 1.5);
    }

    // Estimate range from arbitrator text
    const rangeMatch = arbitrator.match(/(\d+(?:\.\d+)?)\s*[~～\-—至到]\s*(\d+(?:\.\d+)?)\s*万/);
    let bestCase = claimAmount;
    let worstCase = Math.round(claimAmount * 0.4);
    let mostLikely = Math.round(claimAmount * 0.65);

    if (rangeMatch) {
      bestCase = parseFloat(rangeMatch[2]);
      worstCase = parseFloat(rangeMatch[1]);
      mostLikely = Math.round((bestCase + worstCase) / 2);
    } else if (arbiAmounts.length >= 2) {
      arbiAmounts.sort((a, b) => a - b);
      worstCase = arbiAmounts[0];
      bestCase = arbiAmounts[arbiAmounts.length - 1];
      mostLikely = arbiAmounts[Math.floor(arbiAmounts.length / 2)];
    }

    const batna = {
      claimAmount: claimAmount,
      bestCase: bestCase,
      mostLikely: mostLikely,
      worstCase: worstCase,
      ourEstimate: estimateFromText(ourSide, claimAmount),
      theirEstimate: estimateFromText(theirSide, claimAmount),
    };

    // Strategy recommendation
    const strategy = {
      openingOffer: Math.round(claimAmount * 1.15),
      target: mostLikely,
      walkAway: worstCase,
      firstConcession: Math.round(claimAmount * 0.08),
      negotiationRounds: '3-4轮',
      recommendedTactics: [
        '首轮坚持合同依据，不急于让步',
        '第二轮在非核心项上做小幅让步（建议5-8%），换取对方对核心项的认可',
        '第三轮以仲裁结果为锚点，提出折中方案',
        '如对方出价低于底线值，可考虑暂停谈判，启动正式争议解决程序'
      ]
    };

    negoResults.value.batna = JSON.stringify(batna, null, 2);
    negoResults.value.strategy = JSON.stringify(strategy, null, 2);
  }

  function estimateFromText(text, claimAmount) {
    if (!text) return claimAmount;
    const match = text.match(/(\d+(?:\.\d+)?)\s*万元?/g);
    if (!match) return claimAmount;
    const amounts = match.map(m => parseFloat(m.replace(/[万元]/g, ''))).filter(n => n > 0 && n <= claimAmount * 1.5);
    if (amounts.length === 0) return claimAmount;
    amounts.sort((a, b) => a - b);
    return amounts[Math.floor(amounts.length / 2)];
  }

  // ===== SAVE TO HISTORY =====
  function saveToHistory() {
    const entry = {
      id: 'nego-' + Date.now(),
      time: new Date().toLocaleString(),
      scenario: negoScenario.value.slice(0, 100),
      projectId: negoProjectId.value,
      claimAmount: negoClaimAmount.value,
      results: JSON.parse(JSON.stringify(negoResults.value)),
    };
    negoHistory.value.unshift(entry);
    // Keep max 20 entries
    if (negoHistory.value.length > 20) {
      negoHistory.value = negoHistory.value.slice(0, 20);
    }
    // Persist to DB
    try {
      window.CEM?.db?.table('settings').put({ key: 'negoHistory', value: JSON.parse(JSON.stringify(negoHistory.value)) });
    } catch (e) { /* ignore */ }
  }

  // ===== LOAD HISTORY =====
  async function loadNegoHistory() {
    try {
      const s = await window.CEM?.db?.table('settings').get('negoHistory');
      if (s?.value) { negoHistory.value = s.value; }
    } catch (e) { /* ignore */ }
  }

  // ===== CLEAR NEGOTIATION =====
  function clearNegotiation() {
    negoScenario.value = '';
    negoProjectId.value = '';
    negoClaimAmount.value = 0;
    negoResults.value = { ourSide: '', theirSide: '', arbitrator: '', batna: '', strategy: '' };
  }

  // ===== DELETE HISTORY ENTRY =====
  function deleteNegoHistory(idx) {
    negoHistory.value.splice(idx, 1);
    try {
      window.CEM?.db?.table('settings').put({ key: 'negoHistory', value: JSON.parse(JSON.stringify(negoHistory.value)) });
    } catch (e) { /* ignore */ }
  }

  // ===== COMPUTED =====
  const negoHasResults = computed(() => {
    return !!(negoResults.value.ourSide || negoResults.value.theirSide || negoResults.value.arbitrator);
  });

  const negoProjectOptions = computed(() => {
    const projects = window.CEM?.projects || [];
    return projects.map(p => ({
      value: p.id,
      label: p.name || p.projectName || '未知项目',
    }));
  });

  // ===== REGISTER =====
  window.CEM = window.CEM || {};
  Object.assign(window.CEM, {
    // Negotiation state
    negoScenario,
    negoProjectId,
    negoClaimAmount,
    negoRunning,
    negoResults,
    negoHistory,
    // Negotiation functions
    startNegotiation,
    stopNegotiation,
    clearNegotiation,
    deleteNegoHistory,
    loadNegoHistory,
    // Computed
    negoHasResults,
    negoProjectOptions,
  });
})();
