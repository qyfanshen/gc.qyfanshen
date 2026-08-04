// js/modules/settings.js — AI Configuration & Chat System (UI state + interaction functions)
// NOTE: AI agent DEFINITIONS (aiAgents, aiProviders) belong in agents.js.
// They are included here temporarily; move to agents.js when that module is created.
;(function() {
  const { ref, reactive, computed, watch, nextTick } = Vue;
  const { ElMessage, ElMessageBox, ElNotification } = ElementPlus;

  // ===== AI CONFIG STATE =====
  const aiConfig = reactive({
    provider: 'deepseek', endpoint: 'https://api.deepseek.com/v1', apiKey: '',
    model: 'deepseek-chat', temperature: 0.7, maxTokens: 4096,
    agentModel: '', visionModel: '', priceModel: '', debateModel: '',
  });

  const aiProviders = [
    { value:'deepseek', label:'DeepSeek (深度求索)', endpoint:'https://api.deepseek.com/v1', models:['deepseek-chat','deepseek-reasoner'] },
    { value:'qwen', label:'通义千问 (阿里云)', endpoint:'https://dashscope.aliyuncs.com/compatible-mode/v1', models:['qwen-turbo','qwen-plus','qwen-max'] },
    { value:'openai', label:'OpenAI', endpoint:'https://api.openai.com/v1', models:['gpt-4o','gpt-4o-mini'] },
    { value:'custom', label:'自定义 (OpenAI兼容)', endpoint:'', models:[] },
  ];

  const aiConfigured = computed(() => !!aiConfig.apiKey && !!aiConfig.endpoint);
  const aiTesting = ref(false);
  const aiTestResult = ref(null);

  // ===== AI AGENT DEFINITIONS (temporary — move to agents.js) =====
  const aiAgents = [
    { key:'general', name:'通用造价助手', icon:'💬', desc:'工程造价知识问答、规范查询、术语解释',
      prompt: '你是资深造价工程师AI助手，拥有20年工程造价经验。精通：GB50500工程量清单计价规范、各地区定额标准、工程造价管理、BIM技术应用、全过程造价咨询。请用专业但易懂的中文回答用户问题，涉及规范时引用具体条文。' },
    { key:'quantity', name:'AI算量Agent', icon:'🧮', desc:'根据项目参数智能生成工程量清单',
      prompt: '你是AI工程量计算专家。根据用户提供的项目参数（建筑类型、结构形式、面积、层数、基础类型等），生成详细的工程量清单。每条清单应包含：清单编码（按GB50500规范）、项目名称、单位、参考工程量、计算依据。请输出markdown表格格式。' },
    { key:'pricing', name:'AI组价Agent', icon:'💰', desc:'智能匹配定额、分析价格合理性',
      prompt: '你是AI智能组价专家。根据用户提供的工程量清单和地区信息，匹配合适的定额标准，分析综合单价的合理性。考虑：定额匹配度、人材机市场价格、地区调整系数、类似项目参考。请给出详细的组价分析报告。' },
    { key:'risk', name:'AI风险Agent', icon:'⚠️', desc:'项目成本风险分析与管理建议',
      prompt: '你是AI工程造价风险分析专家。分析项目成本风险，包括：价格波动风险、工程量偏差风险、合同风险、工期风险、质量风险。对每个风险点给出：风险等级（高/中/低）、影响金额估算、发生概率、应对建议。' },
    { key:'audit', name:'AI审核Agent', icon:'✅', desc:'结算资料自动审查与核减建议',
      prompt: '你是AI结算审核专家。审核结算资料的完整性和合理性，包括：资料清单核验、工程量核对、单价审核、变更签证合理性分析、核减金额计算。对每个审核项给出审核结论和建议。' },
    { key:'drawing', name:'AI图纸Agent', icon:'📐', desc:'图纸内容分析与工程量提取',
      prompt: '你是AI图纸分析专家。分析建筑工程图纸内容，提取关键工程信息：构件尺寸、材料规格、节点构造、标高信息等。注意核查图纸中可能存在的错漏碰缺问题。如果你的模型支持图片识别，请分析用户上传的图纸截图。' },
  ];

  // ===== AI CHAT STATE =====
  const aiActiveAgent = ref('general');
  const aiInput = ref('');
  const aiLoading = ref(false);
  const aiMessagesEl = ref(null);
  const aiInputEl = ref(null);
  const aiChatHistory = ref([]);
  const aiCurrentChatId = ref(null);
  const aiContextData = ref(null);
  const aiContextLabel = ref('');
  let aiAbortController = null;

  // ===== CHAIN-OF-THOUGHT STATE =====
  const cotEnabled = ref(true);
  const cotSteps = ref([]);
  const cotExpanded = ref({});

  // ===== AI CHAT COMPUTED =====
  const currentAgent = computed(() => aiAgents.find(a => a.key === aiActiveAgent.value));
  const currentAIMessages = computed(() => {
    const chat = aiChatHistory.value.find(c => c.id === aiCurrentChatId.value);
    return chat?.messages || [];
  });

  const currentAgentSuggestions = computed(() => {
    const map = {
      general: ['什么是工程量清单计价？','GB50500-2024有哪些主要变化？','如何编制招标控制价？','工程造价指数怎么计算？'],
      quantity: ['计算一个2万㎡框剪结构住宅的混凝土用量','12层框架办公楼钢筋含量估算','地下车库土方工程量怎么算？'],
      pricing: ['HRB400钢筋北京地区最新信息价','分析现浇砼C40柱的综合单价构成','对比三个地区的混凝土价格差异'],
      risk: ['分析当前项目的成本风险点','钢材价格波动对项目成本的影响','施工阶段常见造价风险及对策'],
      audit: ['结算审核需要哪些必备材料？','如何核验工程量计算书？','变更签证审核要点'],
      drawing: ['请分析这张基础平面图','识别图纸中的钢筋标注','提取建筑平面图中的尺寸信息'],
    };
    return map[aiActiveAgent.value] || map.general;
  });

  // ===== AI CONFIG FUNCTIONS =====
  function onAIProviderChange() {
    const p = aiProviders.find(pr => pr.value === aiConfig.provider);
    if (p) { aiConfig.endpoint = p.endpoint; if (p.models.length) aiConfig.model = p.models[0]; }
  }

  async function saveAIConfig() {
    try { await window.CEM.db.table('settings').put({ key:'aiConfig', value:JSON.parse(JSON.stringify(aiConfig)) }); ElMessage.success('AI配置已保存'); } catch(e) { ElMessage.error('保存失败'); }
  }

  async function loadAIConfig() {
    try { const s = await window.CEM.db.table('settings').get('aiConfig'); if (s?.value) Object.assign(aiConfig, s.value); } catch(e) {}
  }

  async function testAIConnection() {
    if (!aiConfig.apiKey || !aiConfig.endpoint) { ElMessage.warning('请先配置API Key和端点'); return; }
    aiTesting.value = true; aiTestResult.value = null;
    try {
      const res = await fetch(aiConfig.endpoint + '/chat/completions', {
        method: 'POST', headers: { 'Content-Type':'application/json', 'Authorization':'Bearer '+aiConfig.apiKey },
        body: JSON.stringify({ model: aiConfig.model, messages:[{role:'user',content:'你好，请回复"连接成功"'}], max_tokens:20 }),
      });
      const data = await res.json();
      if (data.choices?.length) { aiTestResult.value = { ok:true, msg:'✅ 连接成功: '+data.choices[0].message.content }; }
      else { aiTestResult.value = { ok:false, msg:'❌ 错误: '+(data.error?.message||JSON.stringify(data)) }; }
    } catch(e) { aiTestResult.value = { ok:false, msg:'❌ 网络错误: '+e.message }; }
    aiTesting.value = false;
  }

  // ===== AI CHAT FUNCTIONS =====
  function renderMarkdown(text) {
    if (!text) return '';
    let html = text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\*(.+?)\*/g,'<em>$1</em>')
      .replace(/`{3}(\w*)\n?([\s\S]*?)`{3}/g,'<pre><code>$2</code></pre>').replace(/`(.+?)`/g,'<code>$1</code>')
      .replace(/^### (.+)/gm,'<h4>$1</h4>').replace(/^## (.+)/gm,'<h3>$1</h3>').replace(/^# (.+)/gm,'<h2>$1</h2>')
      .replace(/\n/g,'<br>');
    html = html.replace(/\|(.+)\|/g, (match) => {
      const cells = match.split('|').filter(c => c.trim());
      if (cells.every(c => c.trim().match(/^-+$/))) return '';
      return '<tr>'+cells.map(c => `<td>${c.trim()}</td>`).join('')+'</tr>';
    });
    html = html.replace(/(<tr>.*<\/tr>\n?)+/g,'<table>$&</table>');

    // ===== CoT STEP PARSING (post-render) =====
    if (cotEnabled.value) {
      try {
        const steps = parseCoTSteps(text);
        if (steps.length > 0) {
          cotSteps.value = steps;
          const cotHtml = buildCoTHtml(steps);
          html = cotHtml + html;
        }
      } catch (e) { /* CoT parsing is best-effort */ }
    }

    return html;
  }

  function buildAgentContext() {
    const parts = [];
    const ctx = aiContextData.value;
    if (!ctx) return '';
    parts.push('## 当前项目上下文');
    if (ctx.projectName) parts.push(`- 项目: ${ctx.projectName}`);
    if (ctx.projectType) parts.push(`- 项目类型: ${ctx.projectType}`);
    if (ctx.budget) parts.push(`- 预算: ${ctx.budget}万元`);
    if (ctx.stage) parts.push(`- 阶段: ${ctx.stage}`);
    if (ctx.quantityCount) parts.push(`- 工程量清单: ${ctx.quantityCount}项`);
    if (ctx.pricingCount) parts.push(`- 组价项目: ${ctx.pricingCount}项`);
    if (ctx.extraContext) parts.push(ctx.extraContext);
    return parts.join('\n');
  }

  function setAIContext(data, label) { aiContextData.value = data; aiContextLabel.value = label; }
  function clearAIContext() { aiContextData.value = null; aiContextLabel.value = ''; }

  function newAIChat() {
    const id = 'chat-'+Date.now();
    aiChatHistory.value.unshift({ id, title:'新对话', time:new Date().toLocaleString(), messages:[], agent:aiActiveAgent.value });
    aiCurrentChatId.value = id;
    saveAIChatHistory();
  }

  function switchAIChat(id) { aiCurrentChatId.value = id; }

  function deleteAIChat(idx) {
    const chat = aiChatHistory.value[idx];
    aiChatHistory.value.splice(idx, 1);
    if (aiCurrentChatId.value === chat?.id) aiCurrentChatId.value = aiChatHistory.value[0]?.id || null;
    saveAIChatHistory();
  }

  async function saveAIChatHistory() {
    try { await window.CEM.db.table('settings').put({ key:'aiChatHistory', value:JSON.parse(JSON.stringify(aiChatHistory.value)) }); } catch(e) {}
  }

  async function loadAIChatHistory() {
    try { const s = await window.CEM.db.table('settings').get('aiChatHistory'); if (s?.value) { aiChatHistory.value = s.value; if (aiChatHistory.value.length) aiCurrentChatId.value = aiChatHistory.value[0].id; } } catch(e) {}
  }

  async function sendAIMessage() {
    const text = aiInput.value.trim();
    if (!text || aiLoading.value) return;
    if (!aiConfigured.value) { ElMessage.warning('请先在设置中配置AI API'); window.CEM.navigate('settings'); return; }
    aiInput.value = '';
    if (!aiCurrentChatId.value || !aiChatHistory.value.find(c => c.id === aiCurrentChatId.value)) { newAIChat(); }
    const chat = aiChatHistory.value.find(c => c.id === aiCurrentChatId.value);
    if (!chat) return;
    chat.messages.push({ role:'user', content: text });
    if (chat.messages.length === 1) chat.title = text.slice(0, 30) + (text.length > 30 ? '...' : '');
    chat.agent = aiActiveAgent.value;
    saveAIChatHistory();
    const systemPrompt = currentAgent.value?.prompt || aiAgents[0].prompt;
    const context = buildAgentContext();
    const systemContent = context ? systemPrompt + '\n\n' + context : systemPrompt;
    const messages = [{ role:'system', content: systemContent }, ...chat.messages.slice(-20)];
    aiLoading.value = true;
    aiAbortController = new AbortController();
    chat.messages.push({ role:'assistant', content: '' });
    const assistantIdx = chat.messages.length - 1;
    saveAIChatHistory();
    scrollAIMessages();
    try {
      const response = await fetch(aiConfig.endpoint + '/chat/completions', {
        method:'POST', headers:{ 'Content-Type':'application/json', 'Authorization':'Bearer '+aiConfig.apiKey },
        body:JSON.stringify({ model:aiConfig.model, messages, temperature:aiConfig.temperature, max_tokens:aiConfig.maxTokens, stream:true }),
        signal:aiAbortController.signal,
      });
      if (!response.ok) { const err = await response.json().catch(()=>({})); throw new Error(err.error?.message || `HTTP ${response.status}`); }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream:true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;
            try { const json = JSON.parse(data); const delta = json.choices?.[0]?.delta?.content || ''; chat.messages[assistantIdx].content += delta; scrollAIMessages(); } catch(e) {}
          }
        }
      }
    } catch(e) {
      if (e.name !== 'AbortError') { chat.messages[assistantIdx].content = '❌ 请求失败: ' + e.message; ElMessage.error('AI请求失败: '+e.message); }
    }
    aiLoading.value = false;
    aiAbortController = null;
    saveAIChatHistory();
  }

  function stopAIStreaming() { if (aiAbortController) { aiAbortController.abort(); aiLoading.value = false; } }
  function sendSuggestion(text) { aiInput.value = text; sendAIMessage(); }

  function scrollAIMessages() {
    nextTick(() => { if (aiMessagesEl.value) aiMessagesEl.value.scrollTop = aiMessagesEl.value.scrollHeight; });
  }

  // ===== CHAIN-OF-THOUGHT FUNCTIONS =====
  function parseCoTSteps(content) {
    if (!content) return [];
    const steps = [];
    const lines = content.split('\n');

    let currentStep = null;
    let stepIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Detect numbered reasoning steps (1. 2. 3. etc.)
      const stepMatch = line.match(/^(\d+)[\.\、\)]\s*(.+)/);
      if (stepMatch) {
        if (currentStep) steps.push(currentStep);
        stepIndex++;
        currentStep = {
          id: 'step-' + stepIndex,
          type: 'step',
          text: stepMatch[2],
          detail: '',
          confidence: detectConfidence(line),
        };
        continue;
      }

      // Detect references in 【】 brackets
      const refMatch = line.match(/【(.+?)】/g);
      if (refMatch && !stepMatch) {
        const refText = refMatch.map(r => r.replace(/[【】]/g, '')).join(' | ');
        if (currentStep) {
          currentStep.detail += (currentStep.detail ? '\n' : '') + line;
        }
        steps.push({
          id: 'ref-' + (steps.length + 1),
          type: 'reference',
          text: refText,
          detail: line,
          confidence: 'high',
        });
        continue;
      }

      // Detect key findings (bold text or lines with 发现/异常/问题/建议/结论)
      const findingKeywords = /(发现|异常|问题|建议|结论|判定|裁定|核定|确认)[：:]/;
      if (findingKeywords.test(line)) {
        if (currentStep) steps.push(currentStep);
        currentStep = null;
        steps.push({
          id: 'finding-' + (steps.length + 1),
          type: 'finding',
          text: line.replace(/^\*{1,3}|\*{1,3}$/g, '').slice(0, 80),
          detail: line,
          confidence: detectConfidence(line),
        });
        continue;
      }

      // Detect conclusion
      const conclusionKeywords = /^(综上所述|总体而言|最终|综上|总而言之|总结)/;
      if (conclusionKeywords.test(line)) {
        if (currentStep) steps.push(currentStep);
        currentStep = null;
        steps.push({
          id: 'conclusion-' + (steps.length + 1),
          type: 'conclusion',
          text: line.slice(0, 80),
          detail: line,
          confidence: 'high',
        });
        continue;
      }

      // Accumulate detail into current step
      if (currentStep) {
        currentStep.detail += (currentStep.detail ? '\n' : '') + line;
      }
    }

    if (currentStep) steps.push(currentStep);
    return steps;
  }

  function detectConfidence(text) {
    const highPatterns = /(明确|确定|根据.*规范|依据.*合同|第.*条|条规定)/;
    const lowPatterns = /(可能|不确定|有待|需进一步|大概|估计|或许)/;
    if (highPatterns.test(text)) return 'high';
    if (lowPatterns.test(text)) return 'low';
    return 'medium';
  }

  function buildCoTHtml(steps) {
    if (!steps || steps.length === 0) return '';
    const iconMap = {
      step: '📋',
      reference: '📖',
      finding: '🔍',
      conclusion: '✅',
    };
    const labelMap = {
      step: '推理步骤',
      reference: '规范引用',
      finding: '关键发现',
      conclusion: '结论',
    };
    const confidenceLabelMap = {
      high: '高置信度',
      medium: '中置信度',
      low: '低置信度',
    };

    let html = '<div class="cot-container" style="margin-bottom:12px;">';
    html += '<div class="cot-header" style="display:flex;align-items:center;gap:8px;margin-bottom:8px;font-size:13px;font-weight:600;color:var(--text-secondary);">';
    html += '<span>🧠 推理链追踪</span>';
    html += '<span style="font-size:11px;font-weight:400;">(' + steps.length + ' 步)</span>';
    html += '</div>';

    steps.forEach((step, index) => {
      const isExpanded = cotExpanded.value[step.id] || false;
      const icon = iconMap[step.type] || '📌';
      const label = labelMap[step.type] || '步骤';
      const confClass = step.confidence || 'medium';
      const confLabel = confidenceLabelMap[confClass] || '中置信度';

      html += '<div class="cot-step" onclick="CEM.toggleCoTStep(\'' + step.id + '\')" data-step-id="' + step.id + '">';
      html += '<div class="cot-step-header">';
      html += '<span class="cot-step-icon" style="background:var(--primary);">' + icon + '</span>';
      html += '<span style="flex:1;">' + escapeHtml(step.text) + '</span>';
      html += '<span class="cot-confidence ' + confClass + '">' + confLabel + '</span>';
      html += '<span style="font-size:11px;color:var(--text-secondary);">' + (isExpanded ? '▲' : '▼') + '</span>';
      html += '</div>';
      if (step.detail) {
        html += '<div class="cot-step-detail' + (isExpanded ? ' open' : '') + '" style="' + (isExpanded ? 'display:block;' : 'display:none;') + '">';
        html += '<div style="font-size:11px;color:var(--text-secondary);margin-bottom:4px;">' + label + '详情:</div>';
        html += '<div>' + escapeHtml(step.detail).replace(/\n/g, '<br>') + '</div>';
        html += '</div>';
      }
      html += '</div>';
    });

    html += '</div>';
    return html;
  }

  function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function toggleCoTStep(stepId) {
    cotExpanded.value = { ...cotExpanded.value, [stepId]: !cotExpanded.value[stepId] };
  }

  // ===== REGISTER =====
  window.CEM = window.CEM || {};
  Object.assign(window.CEM, {
    // AI config
    aiConfig, aiProviders, onAIProviderChange, aiConfigured, aiTesting, aiTestResult,
    saveAIConfig, loadAIConfig, testAIConnection,
    // AI agents (temporary)
    aiAgents,
    // AI chat state
    aiActiveAgent, aiInput, aiLoading, aiMessagesEl, aiInputEl,
    aiChatHistory, aiCurrentChatId, aiContextData, aiContextLabel,
    // AI chat computed
    currentAgent, currentAIMessages, currentAgentSuggestions,
    // AI chat functions
    renderMarkdown, buildAgentContext,
    setAIContext, clearAIContext,
    newAIChat, switchAIChat, deleteAIChat,
    saveAIChatHistory, loadAIChatHistory,
    sendAIMessage, stopAIStreaming, sendSuggestion, scrollAIMessages,
    // Chain-of-Thought
    cotEnabled, cotSteps, cotExpanded,
    parseCoTSteps, toggleCoTStep,
  });
})();

/*
===== CHAIN-OF-THOUGHT CSS SNIPPET =====
Copy the following CSS into /css/style.css for CoT step visualization:

.cot-step { border-left:3px solid var(--primary); padding:8px 12px; margin:6px 0; background:var(--hover-bg); border-radius:0 8px 8px 0; cursor:pointer; }
.cot-step-header { display:flex; align-items:center; gap:8px; font-size:13px; }
.cot-step-icon { width:24px; height:24px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:12px; color:#fff; }
.cot-step-detail { margin-top:6px; padding:8px; background:var(--bg-card); border-radius:6px; font-size:12px; color:var(--text-secondary); display:none; }
.cot-step-detail.open { display:block; }
.cot-confidence { display:flex; align-items:center; gap:6px; padding:4px 10px; border-radius:12px; font-size:11px; }
.cot-confidence.high { background:rgba(103,194,58,0.1); color:#67c23a; }
.cot-confidence.medium { background:rgba(230,162,60,0.1); color:#e6a23c; }
.cot-confidence.low { background:rgba(245,108,108,0.1); color:#f56c6c; }

===== END CSS SNIPPET =====
*/
