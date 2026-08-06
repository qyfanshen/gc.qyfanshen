// js/modules/debate.js — 多Agent辩论室
;(function() {
  const { ref, reactive, computed, nextTick } = Vue;
  const { ElMessage, ElNotification } = ElementPlus;

  // Agent roles
  const debateAgents = [
    { key:'optimistic', name:'激进派', role:'optimistic', icon:'🟢', color:'#67c23a',
      desc:'追求成本最优，善于发现降本空间',
      prompt:'你是激进派造价估算师，核心信念是"没有降不下来的成本"。你善于发现优化空间、提出替代方案、挑战不必要的冗余。辩论中你要：1)找出对方方案中的成本优化点 2)提出至少2个降本替代方案 3)用具体数据说服他人。每次发言控制在300字以内，用中文。' },
    { key:'conservative', name:'保守派', role:'conservative', icon:'🔴', color:'#f56c6c',
      desc:'风险厌恶，坚持规范底线',
      prompt:'你是保守派造价估算师，核心信念是"安全和质量不可妥协"。你重视风险预留、考虑最坏情况、坚持规范底线。辩论中你要：1)指出激进方案中的风险隐患 2)引用规范条文支持你的观点 3)计算风险发生后的实际损失。每次发言控制在300字以内，用中文。' },
    { key:'devil', name:'魔鬼代言人', role:'devil', icon:'🟡', color:'#e6a23c',
      desc:'挑战一切假设，发现隐藏盲区',
      prompt:'你是魔鬼代言人造价顾问，核心信念是"每个估算都有盲区"。你专门挑战假设、发现逻辑漏洞、提出被忽视的风险。辩论中你要：1)质疑双方的假设前提 2)提出3个"如果...会怎样"的反事实场景 3)指出双方都忽视的隐性成本。每次发言控制在300字以内，用中文。' },
  ];

  const debateTopic = ref('');
  const debating = ref(false);
  const debatePhase = ref('ready'); // ready, debating, arbitrating, done
  const debateResults = ref([]); // {agentKey, content, done}
  const debateConsensus = ref('');
  const debateAbortControllers = ref([]);

  function validateDebateAPI() {
    if (!window.CEM.aiConfigured) { ElMessage.warning('请先在设置中配置AI API'); return false; }
    if (!debateTopic.value.trim()) { ElMessage.warning('请输入辩论议题'); return false; }
    return true;
  }

  async function callDebateAgent(agent, topic, otherOpinions) {
    const cfg = window.CEM.aiConfig;
    const controller = new AbortController();
    debateAbortControllers.value.push(controller);

    const contextMsg = otherOpinions.length > 0
      ? `\n\n以下是其他辩论方的观点摘要，请针对性回应：\n${otherOpinions.join('\n')}`
      : '';

    const messages = [
      { role:'system', content: agent.prompt },
      { role:'user', content: `辩论议题：${topic}${contextMsg}\n\n请发表你的观点。` },
    ];

    let fullContent = '';
    try {
      const response = await fetch(cfg.endpoint + '/chat/completions', {
        method:'POST',
        headers:{ 'Content-Type':'application/json', 'Authorization':'Bearer '+cfg.apiKey },
        body:JSON.stringify({ model:cfg.model, messages, temperature:0.8, max_tokens:cfg.maxTokens, stream:true }),
        signal:controller.signal,
      });
      if (!response.ok) throw new Error('HTTP '+response.status);
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
            try {
              const json = JSON.parse(data);
              fullContent += json.choices?.[0]?.delta?.content || '';
              // Update debate result in real-time
              const result = debateResults.value.find(r => r.agentKey === agent.key);
              if (result) result.content = fullContent;
            } catch(e) {}
          }
        }
      }
    } catch(e) {
      if (e.name !== 'AbortError') fullContent = `❌ ${agent.name}请求失败: ${e.message}`;
    }
    return fullContent;
  }

  async function startDebate() {
    if (!validateDebateAPI()) return;
    debating.value = true;
    debatePhase.value = 'debating';
    debateConsensus.value = '';
    debateResults.value = debateAgents.map(a => ({ agentKey:a.key, name:a.name, icon:a.icon, color:a.color, content:'', done:false }));

    // Round 1: All 3 agents speak in parallel
    const round1Promises = debateAgents.map(agent =>
      callDebateAgent(agent, debateTopic.value, []).then(content => {
        const r = debateResults.value.find(rr => rr.agentKey === agent.key);
        if (r) { r.content = content; r.done = true; }
        return { agent, content };
      })
    );

    const round1Results = await Promise.all(round1Promises);
    window.CEM.addLog?.('create', 'Agent辩论Round1', debateTopic.value, '');

    // Round 2: Each agent sees others' opinions and rebuts
    debatePhase.value = 'arbitrating';
    const round2Promises = debateAgents.map(agent => {
      const others = round1Results
        .filter(r => r.agent.key !== agent.key)
        .map(r => `【${r.agent.name}】: ${r.content.slice(0, 200)}...`);
      return callDebateAgent(agent, debateTopic.value, others).then(content => {
        const r = debateResults.value.find(rr => rr.agentKey === agent.key);
        if (r) { r.content += '\n\n---\n** rebuttal **\n' + content; }
        return content;
      });
    });

    await Promise.all(round2Promises);
    window.CEM.addLog?.('create', 'Agent辩论Round2', debateTopic.value, '');

    // Arbitration
    debatePhase.value = 'arbitrating';
    const allOpinions = debateResults.value.map(r => `【${r.name}】:\n${r.content}`).join('\n\n');
    const arbitrationContent = await callDebateAgent({
      key:'arbitrator', name:'首席仲裁师',
      prompt:'你是首席仲裁造价师，拥有30年经验。你需要分析三方的论点，找出共识和分歧，给出综合建议。输出格式：\n## 共识点\n(列出三方一致的观点)\n\n## 分歧点\n(列出主要分歧及各自依据)\n\n## 建议方案\n(给出你的综合建议，包含推荐的成本区间和理由)\n\n## 风险提示\n(需要关注的剩余风险)',
    }, `原始议题：${debateTopic.value}\n\n各方观点：\n${allOpinions}`, []);

    debateConsensus.value = arbitrationContent;
    debatePhase.value = 'done';
    debating.value = false;
    window.CEM.saveToLocal?.();
  }

  function stopDebate() {
    debateAbortControllers.value.forEach(c => { try { c.abort(); } catch(e) {} });
    debateAbortControllers.value = [];
    debating.value = false;
    debatePhase.value = 'done';
  }

  window.CEM = window.CEM || {};
  Object.assign(window.CEM, {
    debateAgents, debateTopic, debating, debatePhase, debateResults, debateConsensus,
    startDebate, stopDebate,
  });
})();
