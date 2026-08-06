// js/modules/dashboard.js — Dashboard statistics and chart rendering
;(function() {
  const { ref, reactive, computed, watch, nextTick } = Vue;
  const { ElMessage, ElMessageBox, ElNotification } = ElementPlus;

  // ===== STATE =====
  const dashboardStats = reactive([
    { label: '项目总数', value: '127', icon: '🏗️', color: 'linear-gradient(135deg,#409eff,#337ecc)', trend: 12 },
    { label: '本月算量(万元)', value: '8,562', icon: '📐', color: 'linear-gradient(135deg,#67c23a,#529b2e)', trend: 8 },
    { label: '风险预警项', value: '23', icon: '⚠️', color: 'linear-gradient(135deg,#e6a23c,#cf8b2d)', trend: -5 },
    { label: '人均效能提升', value: '68%', icon: '📈', color: 'linear-gradient(135deg,#6366f1,#4f46e5)', trend: 15 },
  ]);

  // ===== FUNCTIONS =====
  function renderDashboardCharts() {
    // Cost Trend
    window.CEM.createChart('chart-cost-trend', {
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'] },
      yAxis: { type: 'value', name: '万元' },
      series: [
        { name: '预算成本', type: 'line', data: [820,850,920,1100,1350,1580,1820,2100,2400,2650,2850,3200], smooth: true, itemStyle: { color: '#409eff' } },
        { name: '实际成本', type: 'line', data: [815,860,935,1080,1380,1620,1850,2150,2380,2700,2900,3180], smooth: true, itemStyle: { color: '#f56c6c' } },
        { name: 'AI预测', type: 'line', data: [820,855,928,1105,1355,1585,1825,2105,2395,2645,2845,3195], smooth: true, lineStyle: { type: 'dashed' }, itemStyle: { color: '#67c23a' } },
      ],
      grid: { left: 50, right: 20, top: 20, bottom: 30 },
    });

    // Cost Pie
    window.CEM.createChart('chart-cost-pie', {
      tooltip: { trigger: 'item', formatter: '{b}: {c}万元 ({d}%)' },
      series: [{
        type: 'pie', radius: ['45%', '75%'], center: ['50%', '55%'],
        data: [
          { value: 28500, name: '材料费' }, { value: 12800, name: '人工费' },
          { value: 6500, name: '机械费' }, { value: 4200, name: '管理费' },
          { value: 3800, name: '利润' }, { value: 2200, name: '规费税金' },
        ],
        emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.5)' } },
      }],
    });

    // Efficiency Bar
    window.CEM.createChart('chart-efficiency', {
      tooltip: { trigger: 'axis' },
      legend: { data: ['传统模式', 'AI辅助模式'] },
      xAxis: { type: 'category', data: ['算量', '组价', '清标', '结算', '变更审核', '资料归档'] },
      yAxis: { type: 'value', name: '耗时(小时)' },
      series: [
        { name: '传统模式', type: 'bar', data: [80, 120, 40, 60, 30, 20], itemStyle: { color: '#909399' } },
        { name: 'AI辅助模式', type: 'bar', data: [15, 25, 8, 12, 6, 4], itemStyle: { color: '#409eff' } },
      ],
      grid: { left: 50, right: 20, top: 40, bottom: 30 },
    });

    // Risk Distribution
    window.CEM.createChart('chart-risk', {
      tooltip: { trigger: 'item' },
      radar: {
        indicator: [
          { name: '价格风险', max: 100 }, { name: '图纸质量', max: 100 },
          { name: '工期风险', max: 100 }, { name: '质量风险', max: 100 },
          { name: '合同风险', max: 100 }, { name: '安全风险', max: 100 },
        ],
      },
      series: [{
        type: 'radar',
        data: [
          { value: [75, 45, 55, 40, 60, 30], name: '当前项目', areaStyle: { color: 'rgba(245,108,108,0.3)' } },
          { value: [40, 30, 35, 25, 40, 20], name: '行业平均', areaStyle: { color: 'rgba(64,158,255,0.2)' } },
        ],
      }],
    });
  }

  // ===== REGISTER =====
  window.CEM = window.CEM || {};
  Object.assign(window.CEM, {
    dashboardStats,
    renderDashboardCharts,
  });
})();
