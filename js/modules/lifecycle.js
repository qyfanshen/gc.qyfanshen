// js/modules/lifecycle.js — Full Lifecycle Cost Control
;(function() {
  const { ref, reactive, computed, watch, nextTick } = Vue;
  const { ElMessage, ElMessageBox, ElNotification } = ElementPlus;

  // ===== STATE =====
  const activeStage = ref('decision');
  const lifecycleStages = [
    { key: 'decision', label: '决策阶段', icon: '📋', desc: '投资估算·方案比选', color: '#409eff', completion: 100 },
    { key: 'bidding', label: '招投标阶段', icon: '📝', desc: '招标控制价·清标', color: '#6366f1', completion: 85 },
    { key: 'construction', label: '施工阶段', icon: '🏗️', desc: '进度款·变更签证', color: '#e6a23c', completion: 45 },
    { key: 'completion', label: '竣工阶段', icon: '✅', desc: '结算审核·资料归档', color: '#67c23a', completion: 10 },
  ];

  const activeStageLabel = computed(() => lifecycleStages.find(s => s.key === activeStage.value)?.label || '');

  const lifecycleItems = ref([
    { code: 'DC-001', name: '项目建议书投资估算', budgetCost: 500, actualCost: 485, variance: -3, status: 'normal', stage: 'decision', suggestion: '估算精度满足要求' },
    { code: 'DC-002', name: '可行性研究成本分析', budgetCost: 800, actualCost: 820, variance: 2.5, status: 'normal', stage: 'decision', suggestion: '地勘费用略超，建议优化地勘方案' },
    { code: 'ZB-001', name: '招标控制价编制', budgetCost: 18500, actualCost: 18200, variance: -1.6, status: 'normal', stage: 'bidding', suggestion: '控制价编制合理' },
    { code: 'ZB-002', name: '工程量清单编制', budgetCost: 350, actualCost: 420, variance: 20, status: 'warning', stage: 'bidding', suggestion: '清单漏项风险，建议复核钢结构部分' },
    { code: 'ZB-003', name: '清标对比分析', budgetCost: 150, actualCost: 145, variance: -3.3, status: 'normal', stage: 'bidding', suggestion: '' },
    { code: 'SG-001', name: '主体结构施工', budgetCost: 8500, actualCost: 8920, variance: 4.9, status: 'warning', stage: 'construction', suggestion: '混凝土价格波动导致成本上浮，建议锁定材料价格' },
    { code: 'SG-002', name: '机电安装工程', budgetCost: 3200, actualCost: 3580, variance: 11.9, status: 'overrun', stage: 'construction', suggestion: '⚠️ 严重超支！电缆价格大幅上涨，建议重新招标' },
    { code: 'SG-003', name: '装饰装修工程', budgetCost: 2800, actualCost: 2650, variance: -5.4, status: 'normal', stage: 'construction', suggestion: '成本控制良好' },
    { code: 'SG-004', name: '变更签证-地基处理', budgetCost: 0, actualCost: 680, variance: 100, status: 'overrun', stage: 'construction', suggestion: '⚠️ 重大变更！建议启动索赔程序' },
    { code: 'JG-001', name: '竣工结算编制', budgetCost: 200, actualCost: 0, variance: -100, status: 'normal', stage: 'completion', suggestion: '待竣工后启动' },
    { code: 'JG-002', name: '结算资料归档', budgetCost: 50, actualCost: 0, variance: -100, status: 'normal', stage: 'completion', suggestion: '' },
  ]);

  const filteredLifecycleItems = computed(() => lifecycleItems.value.filter(i => i.stage === activeStage.value));

  // ===== FUNCTIONS =====
  function renderLifecycleCharts() {
    window.CEM.createChart('chart-lifecycle-cost', {
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: ['决策', '招投标', '施工前期', '施工中期', '施工后期', '竣工'] },
      yAxis: { type: 'value', name: '累计成本(万元)' },
      series: [
        { name: '计划成本', type: 'line', data: [500, 2500, 8000, 18000, 26000, 32000], smooth: true, itemStyle: { color: '#409eff' }, areaStyle: { color: 'rgba(64,158,255,0.1)' } },
        { name: '实际成本', type: 'line', data: [490, 2600, 8500, 19200, 27500, 0], smooth: true, itemStyle: { color: '#f56c6c' }, areaStyle: { color: 'rgba(245,108,108,0.1)' } },
      ],
      grid: { left: 60, right: 20, top: 20, bottom: 30 },
    });

    window.CEM.createChart('chart-budget-actual', {
      tooltip: { trigger: 'axis' },
      legend: { data: ['预算', '实际', '偏差'] },
      xAxis: { type: 'category', data: ['主体结构', '机电安装', '装饰装修', '给排水', '消防工程', '室外工程'] },
      yAxis: [{ type: 'value', name: '万元' }, { type: 'value', name: '偏差%' }],
      series: [
        { name: '预算', type: 'bar', data: [8500, 3200, 2800, 1800, 2200, 1500], itemStyle: { color: '#409eff' } },
        { name: '实际', type: 'bar', data: [8920, 3580, 2650, 1750, 2150, 0], itemStyle: { color: '#f56c6c' } },
        { name: '偏差', type: 'line', yAxisIndex: 1, data: [4.9, 11.9, -5.4, -2.8, -2.3, 0], itemStyle: { color: '#e6a23c' } },
      ],
      grid: { left: 50, right: 50, top: 40, bottom: 30 },
    });
  }

  // ===== REGISTER =====
  window.CEM = window.CEM || {};
  Object.assign(window.CEM, {
    activeStage,
    lifecycleStages,
    activeStageLabel,
    lifecycleItems,
    filteredLifecycleItems,
    renderLifecycleCharts,
  });
})();
