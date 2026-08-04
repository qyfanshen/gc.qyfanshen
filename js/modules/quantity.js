// js/modules/quantity.js — AI自动算量 + 手工算量公式引擎
;(function() {
  const { ref, reactive, computed, watch, nextTick } = Vue;
  const { ElMessage, ElMessageBox, ElNotification } = ElementPlus;

  // ===== STATE =====
  const calcDiscipline = ref('建筑工程');
  const calcProject = ref('');
  const calcRunning = ref(false);
  const quantityItems = ref([]);
  const editDialogVisible = ref(false);
  const editValue = ref(0);
  const editTarget = ref(null);
  const editField = ref('');

  const disciplines = ['建筑工程', '结构工程', '机电工程', '装饰装修', '市政工程', '园林绿化', '安装工程'];

  const quantityTotal = computed(() => quantityItems.value.reduce((s, i) => s + i.totalPrice, 0));

  const mockQuantityData = [
    { code: '010101001001', name: '平整场地', unit: '㎡', quantity: 4850, unitPrice: 8.5, category: '土方' },
    { code: '010101003001', name: '挖基础土方（三类土，深4m）', unit: 'm³', quantity: 12800, unitPrice: 35.2, category: '土方' },
    { code: '010103001001', name: '土方回填（夯填）', unit: 'm³', quantity: 6200, unitPrice: 28.6, category: '土方' },
    { code: '010401001001', name: '现浇混凝土基础垫层C15', unit: 'm³', quantity: 420, unitPrice: 685.3, category: '混凝土' },
    { code: '010402001001', name: '现浇混凝土矩形柱C40', unit: 'm³', quantity: 1850, unitPrice: 1250.8, category: '混凝土' },
    { code: '010405001001', name: '现浇混凝土有梁板C30', unit: 'm³', quantity: 3850, unitPrice: 980.5, category: '混凝土' },
    { code: '010416001001', name: '现浇混凝土钢筋HRB400 Φ12', unit: 't', quantity: 285, unitPrice: 4850.0, category: '钢筋' },
    { code: '010416001002', name: '现浇混凝土钢筋HRB400 Φ25', unit: 't', quantity: 420, unitPrice: 4780.0, category: '钢筋' },
    { code: '010701001001', name: '屋面卷材防水SBS 3mm', unit: '㎡', quantity: 3200, unitPrice: 85.6, category: '防水' },
    { code: '020101001001', name: '水泥砂浆楼地面', unit: '㎡', quantity: 18500, unitPrice: 68.4, category: '装饰' },
    { code: '020201001001', name: '墙面一般抹灰', unit: '㎡', quantity: 28600, unitPrice: 42.8, category: '装饰' },
    { code: '030204001001', name: '配电箱安装 AP-1', unit: '台', quantity: 48, unitPrice: 1850.0, category: '机电' },
    { code: '030212001001', name: '电气配管 SC20 暗敷', unit: 'm', quantity: 8600, unitPrice: 28.5, category: '机电' },
    { code: '030801001001', name: '镀锌钢管DN100（给水）', unit: 'm', quantity: 1250, unitPrice: 185.6, category: '给排水' },
    { code: '030901001001', name: '消火栓安装 SN65', unit: '套', quantity: 85, unitPrice: 1250.0, category: '消防' },
  ];

  // ============ FORMULA CALC ENGINE ============
  const showFormulaEngine = ref(false);
  const formulaComponent = ref('');
  const formulaCalcDiscipline = ref('建筑工程');
  const formulaParams = ref([]);
  const formulaResult = ref(0);
  const formulaItemName = ref('');
  const formulaUnitPrice = ref(0);

  const formulaComponents = [
    { icon: '🧱', type: '现浇混凝土柱C40', formula: '截面宽×截面高×柱高×数量', params: ['截面宽度(m)','截面高度(m)','柱高(m)','数量'], calc: (p) => p[0]*p[1]*p[2]*p[3], unit: 'm³', category: '混凝土', code: '010402001' },
    { icon: '🏛️', type: '现浇混凝土梁C30', formula: '梁宽×梁高×梁长×数量', params: ['梁宽(m)','梁高(m)','梁长(m)','数量'], calc: (p) => p[0]*p[1]*p[2]*p[3], unit: 'm³', category: '混凝土', code: '010403001' },
    { icon: '🟫', type: '现浇混凝土板C30', formula: '板面积×板厚×数量', params: ['面积(m²)','板厚(m)','数量'], calc: (p) => p[0]*p[1]*p[2], unit: 'm³', category: '混凝土', code: '010405001' },
    { icon: '🧱', type: '现浇混凝土墙C35', formula: '墙长×墙高×墙厚×数量', params: ['墙长(m)','墙高(m)','墙厚(m)','数量'], calc: (p) => p[0]*p[1]*p[2]*p[3], unit: 'm³', category: '混凝土', code: '010404001' },
    { icon: '🪝', type: '现浇钢筋HRB400 Φ12', formula: '混凝土量×含钢量系数', params: ['混凝土量(m³)','含钢量(kg/m³)','数量'], calc: (p) => p[0]*p[1]/1000*p[2], unit: '吨', category: '钢筋', code: '010416001' },
    { icon: '🪝', type: '现浇钢筋HRB400 Φ25', formula: '混凝土量×含钢量系数', params: ['混凝土量(m³)','含钢量(kg/m³)','数量'], calc: (p) => p[0]*p[1]/1000*p[2], unit: '吨', category: '钢筋', code: '010416002' },
    { icon: '📐', type: '模板（矩形柱）', formula: '周长×柱高×数量', params: ['截面周长(m)','柱高(m)','数量'], calc: (p) => p[0]*p[1]*p[2], unit: 'm²', category: '模板', code: '011701001' },
    { icon: '📐', type: '模板（有梁板）', formula: '板面积×数量', params: ['板面积(m²)','数量'], calc: (p) => p[0]*p[1], unit: 'm²', category: '模板', code: '011702001' },
    { icon: '⛏️', type: '挖基础土方(三类土)', formula: '底长×底宽×深度×放坡系数', params: ['底长(m)','底宽(m)','挖深(m)','放坡系数'], calc: (p) => p[0]*p[1]*p[2]*p[3], unit: 'm³', category: '土方', code: '010101003' },
    { icon: '⛏️', type: '土方回填(夯填)', formula: '开挖量-基础体积', params: ['开挖量(m³)','基础体积(m³)'], calc: (p) => p[0]-p[1], unit: 'm³', category: '土方', code: '010103001' },
    { icon: '🧱', type: '砖砌体(240墙)', formula: '墙长×墙高×墙厚×数量', params: ['墙长(m)','墙高(m)','墙厚=0.24(m)','数量'], calc: (p) => p[0]*p[1]*(p[2]||0.24)*p[3], unit: 'm³', category: '砌体', code: '010401002' },
    { icon: '💧', type: '屋面SBS防水', formula: '屋面面积×层数', params: ['面积(m²)','层数'], calc: (p) => p[0]*p[1], unit: 'm²', category: '防水', code: '010701001' },
    { icon: '🖌️', type: '内墙抹灰', formula: '墙面净面积×数量', params: ['净面积(m²)','数量'], calc: (p) => p[0]*p[1], unit: 'm²', category: '装饰', code: '020201001' },
    { icon: '🖌️', type: '水泥砂浆楼地面', formula: '面积×数量', params: ['面积(m²)','数量'], calc: (p) => p[0]*p[1], unit: 'm²', category: '装饰', code: '020101001' },
    { icon: '⚡', type: '电缆桥架安装', formula: '桥架长度×数量', params: ['长度(m)','数量'], calc: (p) => p[0]*p[1], unit: 'm', category: '机电', code: '030408001' },
    { icon: '💡', type: '电气配管敷设', formula: '配管长度×数量', params: ['长度(m)','数量'], calc: (p) => p[0]*p[1], unit: 'm', category: '机电', code: '030212001' },
    { icon: '🔧', type: '镀锌钢管DN100安装', formula: '长度×数量', params: ['长度(m)','数量'], calc: (p) => p[0]*p[1], unit: 'm', category: '给排水', code: '030801001' },
    { icon: '🔥', type: '消火栓安装DN65', formula: '数量', params: ['数量'], calc: (p) => p[0], unit: '套', category: '消防', code: '030901001' },
  ];

  const currentFormula = computed(() => formulaComponents.find(fc => fc.type === formulaComponent.value) || null);

  // ===== FUNCTIONS =====
  function runAutoCalc() {
    if (!calcProject.value) {
      ElMessage.warning('请先选择项目');
      return;
    }
    calcRunning.value = true;
    quantityItems.value = [];
    setTimeout(() => {
      quantityItems.value = mockQuantityData.map(item => ({
        ...item,
        totalPrice: parseFloat((item.quantity * item.unitPrice).toFixed(2)),
      }));
      calcRunning.value = false;
      ElNotification({ title: 'AI算量完成', message: `已生成 ${quantityItems.value.length} 项工程量清单`, type: 'success', duration: 3000 });
      window.CEM.saveToLocal();
      nextTick(() => window.CEM.navigate('pricing'));
    }, 2000);
  }

  function editCell(row, field) {
    editTarget.value = row;
    editField.value = field;
    editValue.value = row[field];
    editDialogVisible.value = true;
  }

  function saveEdit() {
    if (editTarget.value && editField.value) {
      editTarget.value[editField.value] = editValue.value;
      editTarget.value.totalPrice = parseFloat((editTarget.value.quantity * editTarget.value.unitPrice).toFixed(2));
      ElMessage.success('已更新');
      window.CEM.saveToLocal();
    }
    editDialogVisible.value = false;
  }

  function editTableCell(row, column, cell) {
    // double-click to edit - handled by @cell-dblclick
  }

  function exportQuantityExcel() {
    const data = quantityItems.value.map(i => ({
      '清单编码': i.code, '项目名称': i.name, '单位': i.unit,
      '工程量': i.quantity, '综合单价(元)': i.unitPrice, '合价(元)': i.totalPrice, '分类': i.category,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '工程量清单');
    XLSX.writeFile(wb, `工程量清单_${new Date().toISOString().slice(0,10)}.xlsx`);
    ElMessage.success('Excel导出成功');
  }

  function exportQuantityPDF() {
    ElMessage.info('正在生成PDF...');
    const el = document.querySelector('#app .card');
    if (el) {
      html2canvas(el, { scale: 2, useCORS: true }).then(canvas => {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('l', 'mm', 'a4');
        const w = pdf.internal.pageSize.getWidth();
        const h = (canvas.height * w) / canvas.width;
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, w, h);
        pdf.save(`工程量清单_${new Date().toISOString().slice(0,10)}.pdf`);
      });
    }
  }

  // ===== FORMULA ENGINE FUNCTIONS =====
  function onFormulaComponentChange() {
    formulaParams.value = [];
    formulaResult.value = 0;
    formulaItemName.value = formulaComponent.value || '';
  }

  function calcFormulaResult() {
    if (!currentFormula.value) return;
    const params = formulaParams.value.map(v => Number(v) || 0);
    if (params.some(p => p === 0 && currentFormula.value.params.length === params.length)) { formulaResult.value = 0; return; }
    try {
      formulaResult.value = currentFormula.value.calc(params);
      if (isNaN(formulaResult.value)) formulaResult.value = 0;
    } catch(e) { formulaResult.value = 0; }
  }

  function addFormulaToQuantity() {
    if (!formulaComponent.value || formulaResult.value <= 0) { ElMessage.warning('请先完成计算'); return; }
    if (!formulaItemName.value) { ElMessage.warning('请输入清单项目名称'); return; }
    const fc = currentFormula.value;
    const newItem = {
      code: fc.code + String(Math.floor(Math.random()*9000+1000)),
      name: formulaItemName.value,
      unit: fc.unit,
      quantity: formulaResult.value,
      unitPrice: formulaUnitPrice.value || 0,
      totalPrice: parseFloat((formulaResult.value * (formulaUnitPrice.value || 0)).toFixed(2)),
      category: fc.category,
    };
    quantityItems.value.push(newItem);
    ElMessage.success(`已添加：${formulaItemName.value}`);
    formulaResult.value = 0;
    formulaComponent.value = '';
    formulaItemName.value = '';
    formulaParams.value = [];
    window.CEM.saveToLocal();
  }

  // ===== REGISTER =====
  window.CEM = window.CEM || {};
  Object.assign(window.CEM, {
    calcDiscipline,
    calcProject,
    calcRunning,
    quantityItems,
    quantityTotal,
    disciplines,
    mockQuantityData,
    runAutoCalc,
    editCell,
    editDialogVisible,
    editValue,
    editTarget,
    editField,
    saveEdit,
    editTableCell,
    exportQuantityExcel,
    exportQuantityPDF,
    showFormulaEngine,
    formulaComponent,
    formulaCalcDiscipline,
    formulaParams,
    formulaResult,
    formulaItemName,
    formulaUnitPrice,
    formulaComponents,
    currentFormula,
    onFormulaComponentChange,
    calcFormulaResult,
    addFormulaToQuantity,
  });
})();
