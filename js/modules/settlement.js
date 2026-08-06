// js/modules/settlement.js — 结算资料自动校验模块
;(function() {
  const { ref, reactive, computed, watch, nextTick } = Vue;
  const { ElMessage, ElMessageBox, ElNotification } = ElementPlus;

  // ===== STATE =====
  const auditProject = ref('');
  const auditRunning = ref(false);
  const auditItems = ref([]);

  const auditCompleteness = computed(() => {
    if (!auditItems.value.length) return 0;
    const complete = auditItems.value.filter(i => i.status === '齐全').length;
    return Math.round((complete / auditItems.value.length) * 100);
  });

  const auditReductionTotal = computed(() => auditItems.value.reduce((s, i) => s + (i.reductionAmount || 0), 0));
  const auditDisputeCount = computed(() => auditItems.value.filter(i => i.status === '争议').length);

  // ===== FUNCTIONS =====
  function runAudit() {
    if (!auditProject.value) { ElMessage.warning('请选择项目'); return; }
    auditRunning.value = true;
    auditItems.value = [];
    setTimeout(() => {
      auditItems.value = [
        { docName: '施工合同及补充协议', required: '必选', status: '齐全', checkResult: '合同条款完整，无重大缺陷', reductionAmount: 0 },
        { docName: '竣工图纸', required: '必选', status: '齐全', checkResult: '图纸签章完整，与现场一致', reductionAmount: 0 },
        { docName: '工程量计算书', required: '必选', status: '齐全', checkResult: '计算过程完整，发现3处计算误差', reductionAmount: 12.5 },
        { docName: '综合单价分析表', required: '必选', status: '齐全', checkResult: '单价组成合理，2项需重新组价', reductionAmount: 8.3 },
        { docName: '材料设备价格确认单', required: '必选', status: '争议', checkResult: '部分材料价格缺乏有效签证支撑', reductionAmount: 45.2 },
        { docName: '工程变更签证单', required: '必选', status: '齐全', checkResult: '变更手续完整，签证单齐全', reductionAmount: 5.6 },
        { docName: '隐蔽工程验收记录', required: '必选', status: '缺失', checkResult: '地下室防水隐蔽记录缺失', reductionAmount: 28.0 },
        { docName: '材料检测报告', required: '必选', status: '争议', checkResult: '钢筋检测报告批次与进场记录不对应', reductionAmount: 18.8 },
        { docName: '工程量清单对比表', required: '可选', status: '齐全', checkResult: '清单对比完整，偏差在合理范围内', reductionAmount: 0 },
        { docName: '工程款支付凭证', required: '可选', status: '齐全', checkResult: '支付凭证与合同约定一致', reductionAmount: 0 },
        { docName: '工期延误证明', required: '可选', status: '争议', checkResult: '工期延误责任划分存在分歧', reductionAmount: 35.0 },
        { docName: '竣工验收报告', required: '必选', status: '齐全', checkResult: '验收手续完备', reductionAmount: 0 },
      ];
      auditRunning.value = false;
      ElNotification({ title: '结算审核完成', message: `核减总金额 ${auditReductionTotal.value.toFixed(2)} 万元，发现 ${auditDisputeCount.value} 项争议`, type: 'warning', duration: 4000 });
      window.CEM.saveToLocal?.();
      nextTick(() => { renderAuditCharts(); });
    }, 3000);
  }

  function exportAuditExcel() {
    const data = auditItems.value.map(i => ({
      '资料名称': i.docName, '必要性': i.required, '状态': i.status,
      '核验结果': i.checkResult, '核减金额(万元)': i.reductionAmount,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '结算审核报告');
    XLSX.writeFile(wb, `结算审核报告_${new Date().toISOString().slice(0,10)}.xlsx`);
    ElMessage.success('核验报告导出成功');
  }

  function renderAuditCharts() {
    const reductionData = auditItems.value.filter(i => i.reductionAmount > 0);
    window.CEM.createChart('chart-audit-reduction', {
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: reductionData.map(i => i.docName.substring(0, 8)), axisLabel: { rotate: 30 } },
      yAxis: { type: 'value', name: '万元' },
      series: [{ name: '核减金额', type: 'bar', data: reductionData.map(i => i.reductionAmount), itemStyle: { color: '#f56c6c' } }],
      grid: { left: 50, right: 20, top: 20, bottom: 60 },
    });

    const complete = auditItems.value.filter(i => i.status === '齐全').length;
    const missing = auditItems.value.filter(i => i.status === '缺失').length;
    const dispute = auditItems.value.filter(i => i.status === '争议').length;
    window.CEM.createChart('chart-audit-completeness', {
      tooltip: { trigger: 'item', formatter: '{b}: {c}项 ({d}%)' },
      series: [{
        type: 'pie', radius: '60%', center: ['50%', '55%'],
        data: [
          { value: complete, name: '资料齐全', itemStyle: { color: '#67c23a' } },
          { value: missing, name: '资料缺失', itemStyle: { color: '#f56c6c' } },
          { value: dispute, name: '存在争议', itemStyle: { color: '#e6a23c' } },
        ],
      }],
    });
  }


  // ===== REGISTER =====
  window.CEM = window.CEM || {};
  Object.assign(window.CEM, {
    auditProject,
    auditRunning,
    auditItems,
    auditCompleteness,
    auditReductionTotal,
    auditDisputeCount,
    runAudit,
    exportAuditExcel,
    renderAuditCharts,
  });
})();
