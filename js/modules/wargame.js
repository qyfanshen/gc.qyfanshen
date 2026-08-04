// js/modules/wargame.js — 造价沙盘推演
;(function() {
  const { ref, reactive, computed, nextTick } = Vue;
  const { ElMessage, ElNotification } = ElementPlus;

  const wargameProject = ref('');
  const wargameRunning = ref(false);
  const wargameResults = ref([]);
  const wargameProgress = ref(0);
  const wargameChartRendered = ref(false);

  const wargameScenarios = reactive([
    { id:'steel', name:'钢材价格暴涨40%', icon:'🏗️', desc:'类似2021年市场行情，HRB400螺纹钢价格短期内暴涨40%', severity:8, prob:'中' },
    { id:'weather', name:'极端天气停工60天', icon:'🌧️', desc:'连续暴雨导致施工现场停工60天，工期延误', severity:7, prob:'中低' },
    { id:'regulation', name:'环保法规材料升级', icon:'📜', desc:'新环保法规要求关键材料升级为更高环保等级', severity:6, prob:'中' },
    { id:'budget_cut', name:'业主压缩成本15%', icon:'💰', desc:'业主资金链紧张，要求整体造价压缩15%', severity:9, prob:'中' },
    { id:'interest', name:'利率上调融资+2%', icon:'🏦', desc:'央行加息导致项目融资成本上升2个百分点', severity:5, prob:'中高' },
    { id:'supply', name:'供应链中断材料断供', icon:'🔗', desc:'关键进口材料因国际形势断供，需寻找替代', severity:8, prob:'低' },
  ]);

  const resilienceScore = computed(() => {
    if (!wargameResults.value.length) return null;
    const avgImpact = wargameResults.value.reduce((s,r) => s + (r.impactPercent||0), 0) / wargameResults.value.length;
    const score = Math.max(0, Math.min(100, Math.round(100 - avgImpact * 8)));
    return { score, level: score >= 70 ? '高韧性' : score >= 40 ? '中等韧性' : '低韧性', color: score >= 70 ? '#67c23a' : score >= 40 ? '#e6a23c' : '#f56c6c' };
  });

  function validateWargame() {
    if (!window.CEM.aiConfigured) { ElMessage.warning('请先在设置中配置AI API'); return false; }
    if (!wargameProject.value) { ElMessage.warning('请选择目标项目'); return false; }
    return true;
  }

  function buildProjectContext() {
    const pid = wargameProject.value;
    const proj = window.CEM.allProjects?.value?.find(p => p.id === pid);
    if (!proj) return '项目: 未知';
    const quantityItems = window.CEM.quantityItems?.value || [];
    const pricingItems = window.CEM.pricingItems?.value || [];
    return [
      `项目: ${proj.name}`, `类型: ${proj.type}`, `预算: ${proj.budget}万元`,
      `实际成本: ${proj.actual}万元`, `阶段: ${proj.stage}`,
      `地点: ${proj.location||'未知'}`, `描述: ${proj.description||''}`,
      `工程量清单: ${quantityItems.length}项`,
      `组价项目: ${pricingItems.length}项`,
    ].join('\n');
  }

  async function analyzeScenario(scenario) {
    const cfg = window.CEM.aiConfig;
    const projCtx = buildProjectContext();
    const messages = [
      { role:'system', content:'你是工程造价风险分析专家。你需要模拟特定场景对项目成本的影响。请按以下格式输出分析：\n## 影响评估\n(对项目成本的具体影响描述)\n\n## 影响金额\n估计影响金额: XXX万元\n占预算比例: XX%\n\n## 受影响最大的3个成本项\n1. XXX\n2. XXX\n3. XXX\n\n## 应对策略\n1. XXX\n2. XXX\n3. XXX\n\n## 严重程度评分\n(1-10分)\n' },
      { role:'user', content: `项目背景：\n${projCtx}\n\n模拟场景：${scenario.name}\n场景描述：${scenario.desc}\n\n请分析此场景对上述项目的成本影响。` },
    ];

    try {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 60000);
      const response = await fetch(cfg.endpoint + '/chat/completions', {
        method:'POST',
        headers:{ 'Content-Type':'application/json', 'Authorization':'Bearer '+cfg.apiKey },
        body:JSON.stringify({ model:cfg.model, messages, temperature:0.7, max_tokens:2048 }),
        signal:controller.signal,
      });
      if (!response.ok) throw new Error('HTTP '+response.status);
      const data = await response.json();
      return data.choices?.[0]?.message?.content || '';
    } catch(e) {
      return localAnalyzeScenario(scenario);
    }
  }

  function localAnalyzeScenario(scenario) {
    const proj = window.CEM.allProjects?.value?.find(p => p.id === wargameProject.value);
    const budget = proj?.budget || 10000;
    const impactMap = {
      steel: { pct:35, desc:'钢材价格暴涨40%，直接影响钢筋、钢结构等材料成本', items:'钢筋HRB400、钢结构构件、预埋件', strategies:'提前锁价锁量采购、优化钢筋用量设计、考察替代供应商' },
      weather: { pct:18, desc:'停工60天导致人工费、设备租赁费、管理费持续支出', items:'人工费、机械租赁费、现场管理费', strategies:'调整施工组织计划、增加施工班组赶工、申请工期顺延' },
      regulation: { pct:12, desc:'材料环保升级增加采购成本，可能涉及设计变更', items:'防水材料、涂料、保温材料', strategies:'提前与设计沟通材料选型、批量采购议价、评估替代材料' },
      budget_cut: { pct:15, desc:'业主强制压缩15%造价，需全面优化方案', items:'装饰标准降低、设备品牌替换、景观优化', strategies:'价值工程分析、分阶段实施、保留核心功能优化辅助功能' },
      interest: { pct:8, desc:'融资成本上升影响项目整体收益率和现金流', items:'财务费用、资金占用成本', strategies:'加快施工进度缩短周期、优化付款节点、争取政府贴息' },
      supply: { pct:22, desc:'关键材料断供导致工期延误和替代材料溢价', items:'进口设备、特种钢材、专用管材', strategies:'建立多源供应体系、提前备货安全库存、国产替代方案评估' },
    };
    const imp = impactMap[scenario.id] || { pct:15, desc:'场景影响', items:'待评估', strategies:'加强风险监控' };
    return `## 影响评估\n${imp.desc}\n\n## 影响金额\n估计金额: ${(budget*imp.pct/100).toFixed(0)}万元\n占预算: ${imp.pct}%\n\n## 受影响最大项\n1. ${imp.items.split('、')[0]||'N/A'}\n2. ${imp.items.split('、')[1]||'N/A'}\n3. ${imp.items.split('、')[2]||'N/A'}\n\n## 应对策略\n1. ${imp.strategies.split('、')[0]||'N/A'}\n2. ${imp.strategies.split('、')[1]||'N/A'}\n3. ${imp.strategies.split('、')[2]||'N/A'}\n\n## 严重程度\n${scenario.severity}/10`;
  }

  function parseImpactPercent(analysis) {
    const match = analysis.match(/占预算[：:]\s*(\d+)%/);
    return match ? parseInt(match[1]) : 0;
  }

  async function runWarGame() {
    if (!validateWargame()) return;
    wargameRunning.value = true;
    wargameResults.value = [];
    wargameProgress.value = 0;
    wargameChartRendered.value = false;

    for (let i = 0; i < wargameScenarios.length; i++) {
      const scenario = wargameScenarios[i];
      wargameProgress.value = Math.round((i / wargameScenarios.length) * 100);
      const analysis = await analyzeScenario(scenario);
      wargameResults.value.push({
        ...scenario,
        analysis,
        impactPercent: parseImpactPercent(analysis),
        timestamp: new Date().toLocaleString(),
      });
      wargameProgress.value = Math.round(((i + 1) / wargameScenarios.length) * 100);
    }

    wargameRunning.value = false;
    wargameProgress.value = 100;
    window.CEM.addLog?.('create', '沙盘推演完成', wargameResults.value.length+'个场景', wargameProject.value);
    nextTick(() => renderWargameChart());
  }

  function renderWargameChart() {
    if (!wargameResults.value.length) return;
    const dom = document.getElementById('chart-wargame');
    if (!dom) return;
    let chart = window.echarts.getInstanceByDom(dom);
    if (!chart) chart = window.echarts.init(dom);
    const data = wargameResults.value.map(r => ({
      name: r.icon+' '+r.name, value: r.impactPercent,
      severity: r.severity, itemStyle: { color: r.impactPercent > 20 ? '#f56c6c' : r.impactPercent > 10 ? '#e6a23c' : '#409eff' },
    }));
    chart.setOption({
      tooltip: { trigger:'axis', formatter: p => `${p[0].name}<br/>影响: ${p[0].value}%` },
      xAxis: { type:'category', data: data.map(d=>d.name), axisLabel:{rotate:20,fontSize:11} },
      yAxis: { type:'value', name:'占预算%' },
      series: [{ type:'bar', data, label:{show:true,formatter:'{c}%'} }],
      grid: { left:50, right:20, top:20, bottom:80 },
    }, true);
    wargameChartRendered.value = true;
  }

  function clearWargame() {
    wargameResults.value = [];
    wargameProgress.value = 0;
    wargameChartRendered.value = false;
  }

  window.CEM = window.CEM || {};
  Object.assign(window.CEM, {
    wargameProject, wargameRunning, wargameResults, wargameProgress,
    wargameScenarios, wargameChartRendered, resilienceScore,
    runWarGame, clearWargame, renderWargameChart,
  });
})();
