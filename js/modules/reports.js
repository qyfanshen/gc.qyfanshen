// js/modules/reports.js — Report Center: templates, field picker, drill-down, export
;(function() {
  const { ref, reactive, computed, watch, nextTick } = Vue;
  const { ElMessage, ElMessageBox, ElNotification } = ElementPlus;

  // ===== STATE =====
  const selectedReport = ref('');
  const reportProject = ref('');
  const reportDateRange = ref([]);
  const reportGenerated = ref(false);
  const selectedFields = ref([]);
  const drillDownItem = ref(null);

  const reportTemplates = [
    { key:'estimate', name:'投资估算书', icon:'📊', desc:'决策阶段投资估算报告' },
    { key:'budget', name:'施工图预算书', icon:'📋', desc:'施工图预算完整报表' },
    { key:'settlement', name:'竣工结算书', icon:'✅', desc:'竣工结算审核报告' },
    { key:'progress', name:'进度款报表', icon:'💰', desc:'月度进度款申请报表' },
    { key:'summary', name:'项目成本汇总', icon:'📈', desc:'全项目成本汇总对比' },
    { key:'change', name:'变更台账报表', icon:'📝', desc:'变更签证汇总台账' },
  ];

  const availableFields = [
    { key:'code', label:'编码' }, { key:'name', label:'项目名称' }, { key:'unit', label:'单位' },
    { key:'quantity', label:'工程量' }, { key:'unitPrice', label:'综合单价' },
    { key:'totalPrice', label:'合价' }, { key:'category', label:'分类' },
    { key:'laborCost', label:'人工费' }, { key:'materialCost', label:'材料费' },
    { key:'machineCost', label:'机械费' },
  ];

  // ===== COMPUTED =====
  const currentReportTitle = computed(() => reportTemplates.find(r=>r.key===selectedReport.value)?.name || '');
  const reportProjectName = computed(() => window.CEM.allProjects.value.find(p=>p.id===reportProject.value)?.name || '');
  const reportDateLabel = computed(() => {
    if (!reportDateRange.value?.length) return '全部';
    return reportDateRange.value.map(d => d instanceof Date ? d.toLocaleDateString() : d).join(' 至 ');
  });

  const reportColumns = computed(() => availableFields.filter(f => selectedFields.value.includes(f.key)));

  const reportTableData = computed(() => {
    const source = window.CEM.quantityItems.value.length > 0 ? window.CEM.quantityItems.value : window.CEM.pricingItems.value;
    if (!selectedFields.value.length) return source;
    return source.map(row => {
      const obj = {};
      selectedFields.value.forEach(k => { obj[k] = row[k]; });
      return obj;
    });
  });

  const reportSummary = computed(() => {
    const data = reportTableData.value;
    return [
      { label:'数据项数', value: data.length },
      { label:'总合价(元)', value: data.reduce((s,r)=>s+(Number(r.totalPrice)||0),0).toLocaleString() },
      { label:'平均单价(元)', value: data.length ? Math.round(data.reduce((s,r)=>s+(Number(r.unitPrice)||0),0)/data.length).toLocaleString() : '0' },
      { label:'编制日期', value: new Date().toLocaleDateString() },
    ];
  });

  const drillDownData = computed(() => {
    if (!drillDownItem.value) return [];
    return window.CEM.quantityItems.value.filter(q => q.category === drillDownItem.value?.category || q.code === drillDownItem.value?.code);
  });

  // ===== FUNCTIONS =====
  function selectReport(key) {
    selectedReport.value = key;
    selectedFields.value = ['code','name','unit','quantity','unitPrice','totalPrice'];
    reportGenerated.value = false;
    drillDownItem.value = null;
  }

  function toggleField(key) {
    const idx = selectedFields.value.indexOf(key);
    if (idx >= 0) selectedFields.value.splice(idx, 1);
    else selectedFields.value.push(key);
  }

  function generateReport() {
    if (!reportProject.value) { ElMessage.warning('请选择项目'); return; }
    reportGenerated.value = true;
    window.CEM.addLog('create', '生成报表', currentReportTitle.value, reportProject.value);
  }

  function exportReportExcel() {
    const data = reportTableData.value;
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, currentReportTitle.value);
    XLSX.writeFile(wb, `${currentReportTitle.value}_${new Date().toISOString().slice(0,10)}.xlsx`);
    ElMessage.success('Excel导出成功');
  }

  function exportReportWord() {
    const el = document.getElementById('report-preview-content');
    if (!el) { ElMessage.error('请先生成报表'); return; }
    const html = el.outerHTML;
    const blob = new Blob(['<html><head><meta charset="UTF-8"><style>table{border-collapse:collapse}td,th{border:1px solid #ccc;padding:6px}</style></head><body>'+html+'</body></html>'], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `${currentReportTitle.value}_${new Date().toISOString().slice(0,10)}.doc`;
    a.click();
    URL.revokeObjectURL(url);
    ElMessage.success('Word文档导出成功');
  }

  function printReport() {
    const el = document.getElementById('report-preview-content');
    if (!el) return;
    const win = window.open('', '_blank', 'width=900,height=700');
    win.document.write('<html><head><meta charset="UTF-8"><title>打印报表</title><style>body{font-family:sans-serif;padding:20px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:8px;text-align:left}th{background:#f5f7fa}</style></head><body>'+el.innerHTML+'</body></html>');
    win.document.close();
    setTimeout(() => win.print(), 500);
  }

  // ===== REGISTER =====
  window.CEM = window.CEM || {};
  Object.assign(window.CEM, {
    selectedReport, reportProject, reportDateRange, reportGenerated, selectedFields,
    drillDownItem, reportTemplates, availableFields,
    reportColumns, currentReportTitle, reportProjectName,
    reportDateLabel, reportTableData, reportSummary, drillDownData,
    selectReport, toggleField, generateReport,
    exportReportExcel, exportReportWord, printReport,
  });
})();
