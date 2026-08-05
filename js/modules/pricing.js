// js/modules/pricing.js — Smart Pricing & Quota Database
;(function() {
  const { ref, reactive, computed, watch, nextTick } = Vue;
  const { ElMessage, ElMessageBox, ElNotification } = ElementPlus;

  // ===== STATE =====
  const pricingRegion = ref('北京市');
  const pricingStandard = ref('《建设工程工程量清单计价规范》(GB50500-2024)');
  const pricingDate = ref(new Date());
  const pricingRunning = ref(false);
  const pricingItems = ref([]);

  const regions = ['北京市', '上海市', '广东省', '江苏省', '浙江省', '四川省', '湖北省', '山东省'];
  const quotaStandards = [
    '《建设工程工程量清单计价规范》(GB50500-2024)',
    '《房屋建筑与装饰工程消耗量定额》(2024)',
    '《市政工程消耗量定额》(2024)',
    '《安装工程消耗量定额》(2024)',
  ];

  const pricingTotal = computed(() => pricingItems.value.reduce((s, i) => s + i.totalPrice, 0));

  // ===== QUOTA DATABASE STATE =====
  const showQuotaBrowser = ref(false);
  const quotaSearch = ref('');
  const quotaCatFilter = ref('');
  const quotaRegionFilter = ref('');
  const quotaPage = ref(1);
  const quotaPageSize = ref(10);

  const quotaCategories = ['土石方工程','混凝土及钢筋混凝土','砌筑工程','防水保温','装饰装修','金属结构','门窗工程','楼地面','墙柱面','天棚工程','措施项目'];

  const quotaDB = ref([
    // 土石方工程
    { quotaCode:'1-1-1', quotaName:'平整场地', unit:'100㎡', category:'土石方工程', laborCost:320, materialCost:85, machineCost:155, compositePrice:560, region:'全国通用' },
    { quotaCode:'1-2-8', quotaName:'人工挖基坑土方(三类土,深2m内)', unit:'100m³', category:'土石方工程', laborCost:4850, materialCost:0, machineCost:120, compositePrice:4970, region:'全国通用' },
    { quotaCode:'1-2-15', quotaName:'机械挖基础土方(三类土)', unit:'100m³', category:'土石方工程', laborCost:1850, materialCost:120, machineCost:1650, compositePrice:3620, region:'全国通用' },
    { quotaCode:'1-3-5', quotaName:'土方回填(夯填)', unit:'100m³', category:'土石方工程', laborCost:1860, materialCost:50, machineCost:480, compositePrice:2390, region:'全国通用' },
    { quotaCode:'1-4-2', quotaName:'余方弃置(运距5km)', unit:'100m³', category:'土石方工程', laborCost:320, materialCost:0, machineCost:2850, compositePrice:3170, region:'全国通用' },
    { quotaCode:'1-5-3', quotaName:'凿桩头(灌注桩)', unit:'个', category:'土石方工程', laborCost:185, materialCost:15, machineCost:80, compositePrice:280, region:'全国通用' },
    // 混凝土及钢筋混凝土
    { quotaCode:'4-1-3', quotaName:'现浇砼基础垫层C15', unit:'10m³', category:'混凝土及钢筋混凝土', laborCost:3280, materialCost:2850, machineCost:420, compositePrice:6550, region:'全国通用' },
    { quotaCode:'4-1-5', quotaName:'现浇砼独立基础C30', unit:'10m³', category:'混凝土及钢筋混凝土', laborCost:3580, materialCost:3120, machineCost:520, compositePrice:7220, region:'全国通用' },
    { quotaCode:'4-1-8', quotaName:'现浇砼矩形柱C40', unit:'10m³', category:'混凝土及钢筋混凝土', laborCost:6850, materialCost:4820, machineCost:1850, compositePrice:13520, region:'全国通用' },
    { quotaCode:'4-2-3', quotaName:'现浇砼矩形梁C30', unit:'10m³', category:'混凝土及钢筋混凝土', laborCost:5280, materialCost:3650, machineCost:1380, compositePrice:10310, region:'全国通用' },
    { quotaCode:'4-2-22', quotaName:'现浇砼有梁板C30', unit:'10m³', category:'混凝土及钢筋混凝土', laborCost:5280, materialCost:3850, machineCost:1420, compositePrice:10550, region:'全国通用' },
    { quotaCode:'4-3-6', quotaName:'现浇砼直形墙C35', unit:'10m³', category:'混凝土及钢筋混凝土', laborCost:4850, materialCost:3980, machineCost:1520, compositePrice:10350, region:'全国通用' },
    { quotaCode:'4-4-8', quotaName:'现浇砼楼梯C30', unit:'10㎡投影', category:'混凝土及钢筋混凝土', laborCost:2850, materialCost:1580, machineCost:580, compositePrice:5010, region:'全国通用' },
    { quotaCode:'4-5-3', quotaName:'现浇砼钢筋HRB400 Φ12', unit:'t', category:'混凝土及钢筋混凝土', laborCost:680, materialCost:4280, machineCost:320, compositePrice:5280, region:'全国通用' },
    { quotaCode:'4-5-5', quotaName:'现浇砼钢筋HRB400 Φ25', unit:'t', category:'混凝土及钢筋混凝土', laborCost:620, materialCost:4150, machineCost:350, compositePrice:5120, region:'全国通用' },
    { quotaCode:'4-5-7', quotaName:'现浇砼钢筋HRB400 Φ8(箍筋)', unit:'t', category:'混凝土及钢筋混凝土', laborCost:850, materialCost:4380, machineCost:280, compositePrice:5510, region:'全国通用' },
    { quotaCode:'4-6-4', quotaName:'预埋铁件制作安装', unit:'t', category:'混凝土及钢筋混凝土', laborCost:2850, materialCost:6850, machineCost:1850, compositePrice:11550, region:'全国通用' },
    // 砌筑工程
    { quotaCode:'3-1-3', quotaName:'砖基础(M10水泥砂浆)', unit:'10m³', category:'砌筑工程', laborCost:2850, materialCost:3280, machineCost:280, compositePrice:6410, region:'全国通用' },
    { quotaCode:'3-2-4', quotaName:'烧结多孔砖墙(240厚)', unit:'10m³', category:'砌筑工程', laborCost:3280, materialCost:3850, machineCost:320, compositePrice:7450, region:'全国通用' },
    { quotaCode:'3-3-2', quotaName:'加气砼砌块墙(200厚)', unit:'10m³', category:'砌筑工程', laborCost:2850, materialCost:2980, machineCost:280, compositePrice:6110, region:'全国通用' },
    { quotaCode:'3-4-5', quotaName:'石砌挡土墙', unit:'10m³', category:'砌筑工程', laborCost:5280, materialCost:4850, machineCost:580, compositePrice:10710, region:'全国通用' },
    // 防水保温
    { quotaCode:'7-1-6', quotaName:'屋面SBS改性沥青防水(3mm)', unit:'100㎡', category:'防水保温', laborCost:2580, materialCost:5680, machineCost:180, compositePrice:8440, region:'全国通用' },
    { quotaCode:'7-1-12', quotaName:'屋面SBS防水(4mm)', unit:'100㎡', category:'防水保温', laborCost:2850, materialCost:5680, machineCost:180, compositePrice:8710, region:'全国通用' },
    { quotaCode:'7-2-3', quotaName:'地下室外墙防水', unit:'100㎡', category:'防水保温', laborCost:3280, materialCost:6850, machineCost:220, compositePrice:10350, region:'全国通用' },
    { quotaCode:'7-3-5', quotaName:'屋面挤塑板保温(50mm)', unit:'100㎡', category:'防水保温', laborCost:1850, materialCost:3850, machineCost:120, compositePrice:5820, region:'全国通用' },
    { quotaCode:'7-4-8', quotaName:'外墙岩棉板保温(60mm)', unit:'100㎡', category:'防水保温', laborCost:2850, materialCost:5850, machineCost:280, compositePrice:8980, region:'全国通用' },
    // 装饰装修
    { quotaCode:'10-1-5', quotaName:'水泥砂浆楼地面(20mm)', unit:'100㎡', category:'装饰装修', laborCost:3280, materialCost:2850, machineCost:320, compositePrice:6450, region:'全国通用' },
    { quotaCode:'10-2-3', quotaName:'陶瓷地砖楼地面(800×800)', unit:'100㎡', category:'装饰装修', laborCost:4850, materialCost:12850, machineCost:380, compositePrice:18080, region:'全国通用' },
    { quotaCode:'10-3-5', quotaName:'花岗岩楼地面', unit:'100㎡', category:'装饰装修', laborCost:6850, materialCost:22850, machineCost:580, compositePrice:30280, region:'全国通用' },
    { quotaCode:'11-1-8', quotaName:'墙面一般抹灰(水泥砂浆)', unit:'100㎡', category:'装饰装修', laborCost:2680, materialCost:1280, machineCost:280, compositePrice:4240, region:'全国通用' },
    { quotaCode:'11-2-5', quotaName:'墙面瓷砖粘贴(300×600)', unit:'100㎡', category:'装饰装修', laborCost:5280, materialCost:8850, machineCost:350, compositePrice:14480, region:'全国通用' },
    { quotaCode:'11-3-4', quotaName:'外墙真石漆涂料', unit:'100㎡', category:'装饰装修', laborCost:3850, materialCost:6850, machineCost:180, compositePrice:10880, region:'全国通用' },
    { quotaCode:'12-1-6', quotaName:'天棚抹灰', unit:'100㎡', category:'装饰装修', laborCost:2850, materialCost:980, machineCost:220, compositePrice:4050, region:'全国通用' },
    { quotaCode:'12-2-3', quotaName:'轻钢龙骨石膏板吊顶', unit:'100㎡', category:'装饰装修', laborCost:4850, materialCost:8850, machineCost:350, compositePrice:14050, region:'全国通用' },
    // 金属结构
    { quotaCode:'6-1-3', quotaName:'钢柱制作安装(Q355B)', unit:'t', category:'金属结构', laborCost:2850, materialCost:8850, machineCost:2580, compositePrice:14280, region:'全国通用' },
    { quotaCode:'6-2-5', quotaName:'钢梁制作安装(Q355B)', unit:'t', category:'金属结构', laborCost:2680, materialCost:8650, machineCost:2420, compositePrice:13750, region:'全国通用' },
    { quotaCode:'6-3-4', quotaName:'钢桁架制作安装', unit:'t', category:'金属结构', laborCost:3850, materialCost:9850, machineCost:3280, compositePrice:16980, region:'全国通用' },
    { quotaCode:'6-5-2', quotaName:'钢结构防火涂料(薄型)', unit:'100㎡', category:'金属结构', laborCost:1850, materialCost:3850, machineCost:280, compositePrice:5980, region:'全国通用' },
    // 门窗工程
    { quotaCode:'8-1-5', quotaName:'铝合金断桥平开窗', unit:'100㎡', category:'门窗工程', laborCost:3850, materialCost:28500, machineCost:580, compositePrice:32930, region:'全国通用' },
    { quotaCode:'8-2-3', quotaName:'钢制防火门(甲级)', unit:'100㎡', category:'门窗工程', laborCost:4850, materialCost:32850, machineCost:680, compositePrice:38380, region:'全国通用' },
    { quotaCode:'8-3-6', quotaName:'成品木门(含门套)', unit:'樘', category:'门窗工程', laborCost:280, materialCost:1850, machineCost:50, compositePrice:2180, region:'全国通用' },
    // 措施项目
    { quotaCode:'17-1-5', quotaName:'综合脚手架(高层)', unit:'100㎡', category:'措施项目', laborCost:3850, materialCost:4850, machineCost:1280, compositePrice:9980, region:'全国通用' },
    { quotaCode:'17-2-8', quotaName:'满堂脚手架(基本层)', unit:'100㎡', category:'措施项目', laborCost:1850, materialCost:2850, machineCost:580, compositePrice:5280, region:'全国通用' },
    { quotaCode:'17-3-3', quotaName:'垂直运输(高层建筑)', unit:'项', category:'措施项目', laborCost:0, materialCost:0, machineCost:185000, compositePrice:185000, region:'全国通用' },
    { quotaCode:'17-4-4', quotaName:'大型机械进出场费', unit:'台次', category:'措施项目', laborCost:0, materialCost:0, machineCost:12500, compositePrice:12500, region:'全国通用' },
    // 北京地区专项
    { quotaCode:'京1-2-8', quotaName:'挖基础土方(北京,三类土)', unit:'100m³', category:'土石方工程', laborCost:2150, materialCost:150, machineCost:1850, compositePrice:4150, region:'北京市' },
    { quotaCode:'京4-1-8', quotaName:'现浇砼矩形柱C40(北京)', unit:'10m³', category:'混凝土及钢筋混凝土', laborCost:7280, materialCost:5150, machineCost:1980, compositePrice:14410, region:'北京市' },
    { quotaCode:'粤4-1-8', quotaName:'现浇砼矩形柱C40(广东)', unit:'10m³', category:'混凝土及钢筋混凝土', laborCost:6580, materialCost:4680, machineCost:1780, compositePrice:13040, region:'广东省' },
    { quotaCode:'苏4-1-8', quotaName:'现浇砼矩形柱C40(江苏)', unit:'10m³', category:'混凝土及钢筋混凝土', laborCost:6720, materialCost:4750, machineCost:1820, compositePrice:13290, region:'江苏省' },
    { quotaCode:'川4-1-8', quotaName:'现浇砼矩形柱C40(四川)', unit:'10m³', category:'混凝土及钢筋混凝土', laborCost:6380, materialCost:4580, machineCost:1720, compositePrice:12680, region:'四川省' },
    { quotaCode:'沪10-1-5', quotaName:'水泥砂浆楼地面(上海)', unit:'100㎡', category:'装饰装修', laborCost:3580, materialCost:3150, machineCost:380, compositePrice:7110, region:'上海市' },
  ]);

  const filteredQuotaDB = computed(() => {
    let list = quotaDB.value;
    if (quotaSearch.value) {
      const kw = quotaSearch.value.toLowerCase();
      list = list.filter(q => q.quotaName.toLowerCase().includes(kw) || q.quotaCode.toLowerCase().includes(kw));
    }
    if (quotaCatFilter.value) list = list.filter(q => q.category === quotaCatFilter.value);
    if (quotaRegionFilter.value) list = list.filter(q => q.region === quotaRegionFilter.value);
    return list;
  });

  const quotaTotalPages = computed(() => Math.max(1, Math.ceil(filteredQuotaDB.value.length / quotaPageSize.value)));

  const paginatedQuotaDB = computed(() => {
    const start = (quotaPage.value - 1) * quotaPageSize.value;
    return filteredQuotaDB.value.slice(start, start + quotaPageSize.value);
  });

  // ===== FUNCTIONS =====
  function filterQuotaDB() { quotaPage.value = 1; }

  function applyQuotaToPricing(quota) {
    pricingItems.value.push({
      quotaCode: quota.quotaCode, quotaName: quota.quotaName, unit: quota.unit,
      quantity: 1, laborCost: quota.laborCost, materialCost: quota.materialCost,
      machineCost: quota.machineCost, compositePrice: quota.compositePrice,
      totalPrice: quota.compositePrice, priceSource: '定额库', matchScore: 100,
    });
    ElMessage.success(`已添加定额：${quota.quotaName}`);
    window.CEM.saveToLocal();
  }

  function runAutoPricing() {
    pricingRunning.value = true;
    pricingItems.value = [];
    setTimeout(() => {
      pricingItems.value = [
        { quotaCode: '1-1-1', quotaName: '平整场地', unit: '100㎡', quantity: 48.5, laborCost: 320, materialCost: 85, machineCost: 155, compositePrice: 560, totalPrice: 27160, priceSource: '信息价', matchScore: 96 },
        { quotaCode: '1-2-15', quotaName: '挖基础土方(三类土)', unit: '100m³', quantity: 128, laborCost: 1850, materialCost: 120, machineCost: 1650, compositePrice: 3620, totalPrice: 463360, priceSource: '信息价', matchScore: 94 },
        { quotaCode: '4-1-8', quotaName: '现浇砼矩形柱C40', unit: '10m³', quantity: 185, laborCost: 6850, materialCost: 4820, machineCost: 1850, compositePrice: 13520, totalPrice: 2501200, priceSource: '信息价', matchScore: 97 },
        { quotaCode: '4-2-22', quotaName: '现浇砼有梁板C30', unit: '10m³', quantity: 385, laborCost: 5280, materialCost: 3850, machineCost: 1420, compositePrice: 10550, totalPrice: 4061750, priceSource: '信息价', matchScore: 95 },
        { quotaCode: '4-5-3', quotaName: '现浇砼钢筋HRB400 Φ12', unit: 't', quantity: 285, laborCost: 680, materialCost: 4280, machineCost: 320, compositePrice: 5280, totalPrice: 1504800, priceSource: '市场价', matchScore: 91 },
        { quotaCode: '4-5-5', quotaName: '现浇砼钢筋HRB400 Φ25', unit: 't', quantity: 420, laborCost: 620, materialCost: 4150, machineCost: 350, compositePrice: 5120, totalPrice: 2150400, priceSource: '市场价', matchScore: 92 },
        { quotaCode: '7-1-12', quotaName: '屋面SBS防水3mm', unit: '100㎡', quantity: 32, laborCost: 2850, materialCost: 5680, machineCost: 180, compositePrice: 8710, totalPrice: 278720, priceSource: '信息价', matchScore: 98 },
        { quotaCode: '10-1-5', quotaName: '水泥砂浆楼地面', unit: '100㎡', quantity: 185, laborCost: 3280, materialCost: 2850, machineCost: 320, compositePrice: 6450, totalPrice: 1193250, priceSource: '信息价', matchScore: 93 },
        { quotaCode: '10-2-8', quotaName: '墙面一般抹灰', unit: '100㎡', quantity: 286, laborCost: 2680, materialCost: 1280, machineCost: 280, compositePrice: 4240, totalPrice: 1212640, priceSource: '信息价', matchScore: 95 },
        { quotaCode: '12-1-18', quotaName: '配电箱安装AP-1', unit: '台', quantity: 48, laborCost: 520, materialCost: 21800, machineCost: 180, compositePrice: 22500, totalPrice: 1080000, priceSource: '市场价', matchScore: 88 },
      ];
      pricingRunning.value = false;
      ElNotification({ title: '智能组价完成', message: `已匹配 ${pricingItems.value.length} 项定额，总造价 ${window.CEM.formatMoney(pricingTotal.value)}`, type: 'success', duration: 3500 });
      window.CEM.saveToLocal();
      nextTick(() => { renderPricingCharts(); });
    }, 2500);
  }

  function exportPricingExcel() {
    const data = pricingItems.value.map(i => ({
      '定额编号': i.quotaCode, '定额名称': i.quotaName, '单位': i.unit, '数量': i.quantity,
      '人工费': i.laborCost, '材料费': i.materialCost, '机械费': i.machineCost,
      '综合单价': i.compositePrice, '合价': i.totalPrice, '价格来源': i.priceSource, '匹配度': i.matchScore,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '组价结果');
    XLSX.writeFile(wb, `智能组价_${new Date().toISOString().slice(0,10)}.xlsx`);
    ElMessage.success('Excel导出成功');
  }

  function exportPricingPDF() {
    ElMessage.info('正在生成PDF...');
    const el = document.querySelector('#app .card');
    if (el) {
      html2canvas(el, { scale: 2, useCORS: true }).then(canvas => {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('l', 'mm', 'a4');
        const w = pdf.internal.pageSize.getWidth();
        const h = (canvas.height * w) / canvas.width;
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, w, h);
        pdf.save(`智能组价_${new Date().toISOString().slice(0,10)}.pdf`);
      });
    }
  }

  function renderPricingCharts() {
    const breakdown = pricingItems.value;
    const laborSum = breakdown.reduce((s, i) => s + i.laborCost * (i.quantity || 1), 0);
    const materialSum = breakdown.reduce((s, i) => s + i.materialCost * (i.quantity || 1), 0);
    const machineSum = breakdown.reduce((s, i) => s + i.machineCost * (i.quantity || 1), 0);

    window.CEM.createChart('chart-cost-breakdown', {
      tooltip: { trigger: 'item', formatter: '{b}: {c}元 ({d}%)' },
      series: [{
        type: 'pie', radius: '60%', center: ['50%', '55%'],
        data: [
          { value: laborSum, name: '人工费', itemStyle: { color: '#409eff' } },
          { value: materialSum, name: '材料费', itemStyle: { color: '#67c23a' } },
          { value: machineSum, name: '机械费', itemStyle: { color: '#e6a23c' } },
        ],
      }],
    });

    window.CEM.createChart('chart-price-compare', {
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: breakdown.slice(0, 6).map(i => i.quotaName.substring(0, 8)), axisLabel: { rotate: 30 } },
      yAxis: { type: 'value', name: '元' },
      series: [
        { name: '信息价', type: 'bar', data: breakdown.slice(0, 6).map(i => i.compositePrice * 0.95), itemStyle: { color: '#409eff' } },
        { name: '市场价', type: 'bar', data: breakdown.slice(0, 6).map(i => i.compositePrice), itemStyle: { color: '#e6a23c' } },
        { name: '企业定额', type: 'bar', data: breakdown.slice(0, 6).map(i => i.compositePrice * 0.88), itemStyle: { color: '#67c23a' } },
      ],
      grid: { left: 50, right: 20, top: 20, bottom: 60 },
    });
  }

  // ===== REGISTER =====
  window.CEM = window.CEM || {};
  Object.assign(window.CEM, {
    pricingRegion,
    pricingStandard,
    pricingDate,
    pricingRunning,
    pricingItems,
    pricingTotal,
    regions,
    quotaStandards,
    runAutoPricing,
    exportPricingExcel,
    exportPricingPDF,
    renderPricingCharts,
    showQuotaBrowser,
    quotaSearch,
    quotaCatFilter,
    quotaRegionFilter,
    quotaPage,
    quotaPageSize,
    quotaCategories,
    quotaDB,
    filteredQuotaDB,
    quotaTotalPages,
    paginatedQuotaDB,
    filterQuotaDB,
    applyQuotaToPricing,
  });
})();
