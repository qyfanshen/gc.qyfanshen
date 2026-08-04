// js/modules/risk.js — Cost Risk Real-time Warning
;(function() {
  const { ref, reactive, computed, watch, nextTick } = Vue;
  const { ElMessage, ElMessageBox, ElNotification } = ElementPlus;

  // ===== STATE =====
  const riskStats = reactive({ high: 5, medium: 12, low: 6, total: 23 });

  const riskItems = ref([
    { time: '2024-06-25 14:30', project: '滨江商务中心', type: '价格风险', level: 'high', description: 'HRB400钢筋市场价连续上涨12%，已超投标价8.5%', impact: 186.5, suggestion: '建议立即与供应商协商锁价协议，或考察替代供应商' },
    { time: '2024-06-25 11:15', project: '城北地铁3号线', type: '图纸错漏', level: 'high', description: '结构图与建筑图轴线尺寸不一致(A轴偏移150mm)', impact: 320, suggestion: '立即组织图纸会审，确认设计意图后修改' },
    { time: '2024-06-25 09:40', project: '滨江商务中心', type: '成本超支', level: 'medium', description: '机电安装实际成本超出预算11.9%，主要因电缆价格上涨', impact: 380, suggestion: '启动成本预警机制，评估替代材料可行性' },
    { time: '2024-06-24 16:20', project: '高新科技园二期', type: '工期风险', level: 'medium', description: '主体结构施工进度滞后12天，可能影响后续工序', impact: 65, suggestion: '增加施工班组，优化施工组织设计' },
    { time: '2024-06-24 14:00', project: '阳光花园', type: '合同风险', level: 'medium', description: '材料调价条款约定不明确，可能引发结算争议', impact: 150, suggestion: '建议补充协议明确材料调价计算规则' },
    { time: '2024-06-24 10:30', project: '城北地铁3号线', type: '价格风险', level: 'low', description: '水泥价格小幅波动，+2.3%', impact: 28, suggestion: '持续关注，暂不介入' },
    { time: '2024-06-23 15:45', project: '东海跨海大桥', type: '设计优化', level: 'low', description: '桥墩基础方案可优化，预估节省成本8-12%', impact: -450, suggestion: '建议设计院进行方案比选，优化桩基布置' },
    { time: '2024-06-23 13:20', project: '滨江商务中心', type: '质量风险', level: 'medium', description: '地下室防水施工存在渗漏隐患', impact: 85, suggestion: '停工整改，增加防水层附加层' },
  ]);

  // ===== FUNCTIONS =====
  function handleRisk(row) {
    ElMessageBox.confirm(`处理方案：${row.suggestion}`, '风险处理', { confirmButtonText: '确认处理', cancelButtonText: '稍后处理', type: 'warning' })
      .then(() => ElMessage.success('风险已标记为处理中'));
  }

  function dismissRisk(index) {
    riskItems.value.splice(index, 1);
    ElMessage.info('已忽略该风险项');
  }

  function renderRiskCharts() {
    window.CEM.createChart('chart-risk-trend', {
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: Array.from({length:30},(_,i)=>`${i+1}日`) },
      yAxis: { type: 'value', name: '风险项数' },
      series: [
        { name: '高风险', type: 'line', data: Array.from({length:30},()=>Math.floor(Math.random()*3+1)), smooth: true, itemStyle:{color:'#f56c6c'}, areaStyle:{color:'rgba(245,108,108,0.15)'} },
        { name: '中风险', type: 'line', data: Array.from({length:30},()=>Math.floor(Math.random()*5+5)), smooth: true, itemStyle:{color:'#e6a23c'}, areaStyle:{color:'rgba(230,162,60,0.15)'} },
        { name: '低风险', type: 'line', data: Array.from({length:30},()=>Math.floor(Math.random()*4+2)), smooth: true, itemStyle:{color:'#67c23a'}, areaStyle:{color:'rgba(103,194,58,0.15)'} },
      ],
      grid: { left: 50, right: 20, top: 20, bottom: 30 },
    });

    window.CEM.createChart('chart-risk-pie', {
      tooltip: { trigger: 'item', formatter: '{b}: {c}项 ({d}%)' },
      series: [{
        type: 'pie', radius: ['50%', '75%'], center: ['50%', '55%'],
        data: [
          { value: 8, name: '价格风险', itemStyle: { color: '#f56c6c' } },
          { value: 5, name: '图纸错漏', itemStyle: { color: '#e6a23c' } },
          { value: 4, name: '成本超支', itemStyle: { color: '#6366f1' } },
          { value: 3, name: '工期风险', itemStyle: { color: '#409eff' } },
          { value: 2, name: '合同风险', itemStyle: { color: '#67c23a' } },
          { value: 1, name: '质量风险', itemStyle: { color: '#909399' } },
        ],
      }],
    });
  }

  // ===== REGISTER =====
  window.CEM = window.CEM || {};
  Object.assign(window.CEM, {
    riskStats,
    riskItems,
    handleRisk,
    dismissRisk,
    renderRiskCharts,
  });
})();
