// js/modules/imports.js — 数据导入模块（工程量清单 / 市场价格）
;(function() {
  const { ref, reactive, computed, watch, nextTick } = Vue;
  const { ElMessage, ElMessageBox, ElNotification } = ElementPlus;

  // ===== STATE =====
  const importTab = ref('quantity');
  const importStep = ref(0);
  const importFileName = ref('');
  const importFileInput = ref(null);
  const importHeader = ref([]);
  const importPreviewRows = ref([]);
  const importPreviewCols = computed(() => importHeader.value.length);
  const importColumns = ref([]);
  const importTarget = ref('quantity');
  const importConfirming = ref(false);
  const importReady = computed(() => importPreviewRows.value.length > 0 && importColumns.value.some(c => c.mappedTo));

  const importFields = [
    { label: '清单编码', value: 'code' }, { label: '项目名称', value: 'name' }, { label: '单位', value: 'unit' },
    { label: '工程量', value: 'quantity' }, { label: '综合单价(元)', value: 'unitPrice' },
    { label: '合价(元)', value: 'totalPrice' }, { label: '分类', value: 'category' },
    { label: '定额编号', value: 'quotaCode' }, { label: '定额名称', value: 'quotaName' },
    { label: '人工费', value: 'laborCost' }, { label: '材料费', value: 'materialCost' },
    { label: '机械费', value: 'machineCost' }, { label: '综合单价(定额)', value: 'compositePrice' },
    { label: '价格来源', value: 'priceSource' }, { label: '匹配度', value: 'matchScore' },
  ];

  // ===== FUNCTIONS =====
  function triggerImportUpload() { importFileInput.value?.click(); }
  function triggerImportMarketUpload() { importMarketInput.value?.click(); }

  function clearImportFile() {
    importFileName.value = ''; importHeader.value = []; importPreviewRows.value = []; importColumns.value = [];
    importStep.value = 0;
  }

  function handleImportFile(e) { parseImportFile(e.target.files[0]); if (importFileInput.value) importFileInput.value.value = ''; }
  function handleImportDrop(e) {
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length) parseImportFile(files[0]);
  }

  function parseImportFile(file) {
    if (!file) return;
    if (!file.name.match(/\.(xlsx|xls)$/i)) { ElMessage.error('请上传 .xlsx 或 .xls 格式文件'); return; }
    importFileName.value = file.name;
    importTarget.value = 'quantity';
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        if (!data.length) { ElMessage.error('Excel文件为空'); return; }
        importHeader.value = data[0].map(String);
        importPreviewRows.value = data.slice(1).filter(r => r.some(c => c !== ''));
        // Auto-detect target
        if (importHeader.value.some(h => String(h).includes('定额') || String(h).includes('人工费'))) {
          importTarget.value = 'pricing';
        }
        // Auto-map columns
        importColumns.value = importHeader.value.map(h => {
          const hStr = String(h).toLowerCase();
          let mappedTo = '', matched = false;
          for (const f of importFields) {
            if (hStr.includes(f.label.toLowerCase()) || hStr.includes(f.value.toLowerCase())) {
              mappedTo = f.value; matched = true; break;
            }
          }
          return { name: h, mappedTo, matched };
        });
        importStep.value = 3;
        ElMessage.success(`已解析 ${importPreviewRows.value.length} 行数据`);
      } catch(ex) {
        ElMessage.error('文件解析失败: ' + ex.message);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function confirmImport() {
    importConfirming.value = true;
    setTimeout(() => {
      const mapping = {};
      importColumns.value.forEach(c => { if (c.mappedTo) mapping[c.name] = c.mappedTo; });
      const headerNames = importHeader.value.map(String);
      const items = [];
      importPreviewRows.value.forEach(row => {
        const obj = {};
        headerNames.forEach((h, i) => {
          const mapped = mapping[h];
          if (mapped) {
            const val = row[i];
            obj[mapped] = ['quantity','unitPrice','totalPrice','laborCost','materialCost','machineCost','compositePrice','matchScore'].includes(mapped) ? (Number(val)||0) : val;
          }
        });
        if (obj.name || obj.quotaName) items.push(obj);
      });

      if (importTarget.value === 'quantity') {
        items.forEach(item => {
          if (item.quantity && item.unitPrice) item.totalPrice = parseFloat((item.quantity * item.unitPrice).toFixed(2));
          window.CEM.quantityItems.value.push(item);
        });
        ElMessage.success(`已导入 ${items.length} 条工程量清单`);
      } else {
        items.forEach(item => {
          if (!item.totalPrice) item.totalPrice = (item.compositePrice || 0) * (item.quantity || 1);
          if (!item.compositePrice) item.compositePrice = (item.laborCost||0)+(item.materialCost||0)+(item.machineCost||0);
          window.CEM.pricingItems.value.push(item);
        });
        ElMessage.success(`已导入 ${items.length} 条定额数据`);
      }
      importConfirming.value = false;
      clearImportFile();
      window.CEM.saveToLocal();
    }, 500);
  }

  function cancelImport() { clearImportFile(); }

  function downloadQuantityTemplate() {
    const template = [
      ['清单编码','项目名称','单位','工程量','综合单价(元)','分类'],
      ['010101001001','平整场地','㎡','5000','8.50','土方'],
      ['010402001001','现浇混凝土矩形柱C40','m³','185','1250.80','混凝土'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '工程量清单模板');
    XLSX.writeFile(wb, '工程量清单导入模板.xlsx');
    ElMessage.success('模板已下载，请按格式填写后上传');
  }

  function downloadPricingTemplate() {
    const template = [
      ['定额编号','定额名称','单位','数量','人工费','材料费','机械费','综合单价(元)','价格来源','匹配度'],
      ['1-1-1','平整场地','100㎡','1','320','85','155','560','信息价','96'],
      ['4-1-8','现浇砼矩形柱C40','10m³','1','6850','4820','1850','13520','信息价','97'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '定额数据模板');
    XLSX.writeFile(wb, '定额数据导入模板.xlsx');
    ElMessage.success('模板已下载，请按格式填写后上传');
  }

  // ============ MARKET PRICE IMPORT ============
  const importMarketInput = ref(null);
  const marketPrices = ref([]);

  function handleImportMarketFile(e) { parseMarketFile(e.target.files[0]); if (importMarketInput.value) importMarketInput.value.value = ''; }
  function handleImportMarketDrop(e) {
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length) parseMarketFile(files[0]);
  }

  function parseMarketFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, { defval: '' });
        marketPrices.value = data.map(r => ({
          name: r['材料名称']||r['name']||'', spec: r['规格型号']||r['spec']||'',
          unit: r['单位']||r['unit']||'', price: Number(r['单价(元)']||r['price']||0),
          region: r['地区']||r['region']||'', date: r['日期']||r['date']||'',
        })).filter(r => r.name && r.price > 0);
        ElMessage.success(`已导入 ${marketPrices.value.length} 条市场价格`);
        try { window.CEM.dbPut('marketPrices', marketPrices.value); } catch(e) {}
      } catch(ex) { ElMessage.error('文件解析失败'); }
    };
    reader.readAsArrayBuffer(file);
  }

  function applyMarketPrices() {
    if (!marketPrices.value.length) { ElMessage.warning('暂无市场价格数据'); return; }
    window.CEM.pricingItems.value.forEach(pi => {
      const match = marketPrices.value.find(m => m.name && pi.quotaName.includes(m.name));
      if (match && match.price > 0) {
        pi.compositePrice = match.price;
        pi.totalPrice = parseFloat((pi.compositePrice * pi.quantity).toFixed(2));
        pi.priceSource = '市场价';
      }
    });
    ElMessage.success('已应用市场价格到组价结果');
    window.CEM.saveToLocal();
  }

  function generateSampleMarketPrices() {
    const samples = [
      { name:'HRB400螺纹钢Φ12', spec:'Φ12mm 9m定尺', unit:'吨', price:3850, region:'北京市', date:'2024-06' },
      { name:'HRB400螺纹钢Φ25', spec:'Φ25mm 9m定尺', unit:'吨', price:3780, region:'北京市', date:'2024-06' },
      { name:'商品混凝土C30', spec:'泵送 坍落度180mm', unit:'m³', price:485, region:'北京市', date:'2024-06' },
      { name:'商品混凝土C40', spec:'泵送 坍落度180mm', unit:'m³', price:545, region:'北京市', date:'2024-06' },
      { name:'SBS防水卷材3mm', spec:'聚酯胎 Ⅰ型', unit:'㎡', price:28.5, region:'北京市', date:'2024-06' },
      { name:'水泥P.O42.5', spec:'散装', unit:'吨', price:420, region:'北京市', date:'2024-06' },
      { name:'中砂', spec:'河砂 含泥量<3%', unit:'m³', price:135, region:'北京市', date:'2024-06' },
      { name:'碎石5-31.5mm', spec:'连续级配', unit:'m³', price:128, region:'北京市', date:'2024-06' },
      { name:'HRB400螺纹钢Φ12', spec:'Φ12mm', unit:'吨', price:3680, region:'上海市', date:'2024-06' },
      { name:'商品混凝土C30', spec:'泵送', unit:'m³', price:465, region:'上海市', date:'2024-06' },
      { name:'HRB400螺纹钢Φ12', spec:'Φ12mm', unit:'吨', price:3720, region:'广东省', date:'2024-06' },
      { name:'商品混凝土C30', spec:'泵送', unit:'m³', price:470, region:'广东省', date:'2024-06' },
      { name:'商品混凝土C40', spec:'泵送', unit:'m³', price:530, region:'四川省', date:'2024-06' },
      { name:'SBS防水卷材4mm', spec:'聚酯胎 Ⅱ型', unit:'㎡', price:35.8, region:'北京市', date:'2024-06' },
      { name:'镀锌钢管DN100', spec:'Q235B 热镀锌', unit:'m', price:185, region:'北京市', date:'2024-06' },
      { name:'配电箱AP-1', spec:'800×600×200 IP54', unit:'台', price:18500, region:'北京市', date:'2024-06' },
      { name:'消火栓SN65', spec:'减压稳压型', unit:'套', price:1250, region:'北京市', date:'2024-06' },
      { name:'铝合金断桥窗', spec:'6Low-E+12A+6 1.8W/(㎡·K)', unit:'㎡', price:680, region:'北京市', date:'2024-06' },
      { name:'岩棉保温板60mm', spec:'密度120kg/m³ A级', unit:'㎡', price:58, region:'北京市', date:'2024-06' },
      { name:'轻钢龙骨石膏板', spec:'12mm耐火纸面', unit:'㎡', price:88, region:'北京市', date:'2024-06' },
    ];
    marketPrices.value = samples;
    window.CEM.saveToLocal();
    ElMessage.success('已生成 20 条市场价数据(北京/上海/广东/四川)');
  }

  // ===== REGISTER =====
  window.CEM = window.CEM || {};
  Object.assign(window.CEM, {
    importTab,
    importStep,
    importFileName,
    importFileInput,
    importHeader,
    importPreviewRows,
    importPreviewCols,
    importColumns,
    importTarget,
    importConfirming,
    importReady,
    importFields,
    triggerImportUpload,
    triggerImportMarketUpload,
    clearImportFile,
    handleImportFile,
    handleImportDrop,
    parseImportFile,
    confirmImport,
    cancelImport,
    downloadQuantityTemplate,
    downloadPricingTemplate,
    importMarketInput,
    marketPrices, generateSampleMarketPrices,
    handleImportMarketFile,
    handleImportMarketDrop,
    parseMarketFile,
    applyMarketPrices,
  });
})();
