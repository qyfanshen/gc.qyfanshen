// js/agents.js — AI Agent定义与Prompt模板
;(function() {
  const { ref, reactive, computed } = Vue;

  const aiProviders = [
    { value:'deepseek', label:'DeepSeek (深度求索)', endpoint:'https://api.deepseek.com/v1', models:['deepseek-chat','deepseek-reasoner'] },
    { value:'qwen', label:'通义千问 (阿里云)', endpoint:'https://dashscope.aliyuncs.com/compatible-mode/v1', models:['qwen-turbo','qwen-plus','qwen-max'] },
    { value:'openai', label:'OpenAI', endpoint:'https://api.openai.com/v1', models:['gpt-4o','gpt-4o-mini'] },
    { value:'custom', label:'自定义 (OpenAI兼容)', endpoint:'', models:[] },
  ];

  function onAIProviderChange() {
    const p = aiProviders.find(pr => pr.value === aiConfig.provider);
    if (p) { aiConfig.endpoint = p.endpoint; if (p.models.length) aiConfig.model = p.models[0]; }
  }

  // Agent Definitions
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

  window.CEM = window.CEM || {};
  Object.assign(window.CEM, {
    aiProviders, aiAgents, onAIProviderChange,
    renderMarkdown, buildAgentContext,
  });
})();
