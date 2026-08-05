// js/modules/indicators.js — 造价指标库与智能估算模块
;(function() {
  const { ref, reactive, computed, watch, nextTick } = Vue;
  const { ElMessage, ElMessageBox, ElNotification } = ElementPlus;

  // ===== STATE =====
  const indicatorDB = ref([]);
  const indBuildingFilter = ref('');
  const indStructureFilter = ref('');
  const estBuildingType = ref('住宅');
  const estStructureType = ref('框剪');
  const estArea = ref(50000);
  const estFloors = ref(28);
  const estUnderground = ref(2);
  const estRegion = ref('北京市');
  const estRunning = ref(false);
  const estimationResult = ref(null);

  const buildingTypes = ['住宅', '商业', '办公', '酒店', '医院', '学校', '工业厂房', '体育馆', '展览馆', '超高层'];
  const structureTypes = ['框架', '框剪', '剪力墙', '框架-核心筒', '钢结构', '砌体', '混合结构'];

  const filteredIndicators = computed(() => {
    let list = indicatorDB.value;
    if (indBuildingFilter.value) list = list.filter(i => i.buildingType === indBuildingFilter.value);
    if (indStructureFilter.value) list = list.filter(i => i.structureType === indStructureFilter.value);
    return list;
  });

  // ===== FUNCTIONS =====
  function extractIndicators() {
    const allProjects = window.CEM.allProjects;
    const newItems = (allProjects ? allProjects.value : []).filter(p => p.budget > 0).map(p => ({
      projectName: p.name,
      buildingType: p.type === '房建' ? '住宅' : p.type === '工业' ? '工业厂房' : '商业',
      structureType: p.discipline === '建筑工程' ? '框剪' : '框架',
      area: Math.floor(p.budget * 10000 / 2500), costPerSqm: 2500 + Math.floor(Math.random()*800),
      steelKgPerSqm: 40 + Math.floor(Math.random()*30),
      concreteM3PerSqm: (0.3 + Math.random()*0.2).toFixed(2),
      floorCount: p.stage === 'construction' ? 28 : 18,
      abnormal: false,
    }));
    indicatorDB.value = [...indicatorDB.value, ...newItems];
    ElMessage.success(`已从 ${newItems.length} 个项目提取指标`);
    window.CEM.saveToLocal?.();
    nextTick(() => renderIndicatorCharts());
  }

  function addSampleIndicator() {
    const samples = [
      { projectName:'行业基准-高层住宅(北京)', buildingType:'住宅', structureType:'框剪', area:45000, costPerSqm:2850, steelKgPerSqm:52, concreteM3PerSqm:0.42, floorCount:28 },
      { projectName:'行业基准-商业综合体(上海)', buildingType:'商业', structureType:'框架-核心筒', area:82000, costPerSqm:4250, steelKgPerSqm:68, concreteM3PerSqm:0.48, floorCount:32 },
      { projectName:'行业基准-标准厂房(深圳)', buildingType:'工业厂房', structureType:'钢结构', area:25000, costPerSqm:1850, steelKgPerSqm:85, concreteM3PerSqm:0.22, floorCount:3 },
      { projectName:'行业基准-甲级写字楼', buildingType:'办公', structureType:'框剪', area:68000, costPerSqm:3850, steelKgPerSqm:58, concreteM3PerSqm:0.44, floorCount:35 },
      { projectName:'行业基准-三甲医院', buildingType:'医院', structureType:'框剪', area:55000, costPerSqm:5200, steelKgPerSqm:62, concreteM3PerSqm:0.46, floorCount:16 },
      { projectName:'行业基准-学校教学楼', buildingType:'学校', structureType:'框架', area:18000, costPerSqm:2200, steelKgPerSqm:42, concreteM3PerSqm:0.35, floorCount:6 },
    ];
    indicatorDB.value = [...indicatorDB.value, ...samples];
    ElMessage.success('已添加6条行业基准数据');
    window.CEM.saveToLocal?.();
    nextTick(() => renderIndicatorCharts());
  }

  function runEstimation() {
    if (!estArea.value) { ElMessage.warning('请输入建筑面积'); return; }
    estRunning.value = true;
    setTimeout(() => {
      const matches = indicatorDB.value.filter(i =>
        i.buildingType === estBuildingType.value && i.structureType === estStructureType.value
      );
      const baseCost = matches.length ? matches.reduce((s,i)=>s+i.costPerSqm,0)/matches.length : 2800;
      const baseSteel = matches.length ? matches.reduce((s,i)=>s+i.steelKgPerSqm,0)/matches.length : 50;
      const baseConcrete = matches.length ? matches.reduce((s,i)=>s+Number(i.concreteM3PerSqm||0),0)/matches.length : 0.4;
      // Region adjustment
      const regionFactor = { '北京市':1.05,'上海市':1.05,'广东省':1.0,'四川省':0.9,'湖北省':0.92 }[estRegion.value] || 1.0;
      const adjCost = Math.round(baseCost * regionFactor);
      estimationResult.value = {
        costPerSqm: adjCost,
        costRange: `${Math.round(adjCost*0.9).toLocaleString()} ~ ${Math.round(adjCost*1.1).toLocaleString()}`,
        steelPerSqm: Math.round(baseSteel),
        steelRange: `${Math.round(baseSteel*0.85)} ~ ${Math.round(baseSteel*1.15)}`,
        concretePerSqm: baseConcrete.toFixed(2),
        concreteRange: `${(baseConcrete*0.85).toFixed(2)} ~ ${(baseConcrete*1.15).toFixed(2)}`,
        sampleCount: Math.max(matches.length, 1),
        confidence: Math.min(60 + matches.length * 8, 95),
      };
      estRunning.value = false;
      window.CEM.addLog?.('create', '智能估算', estBuildingType.value + '/' + estStructureType.value, '');
    }, 1000);
  }

  function deleteIndicator(idx) { indicatorDB.value.splice(idx, 1); window.CEM.saveToLocal?.(); }

  function renderIndicatorCharts() {
    const types = [...new Set(indicatorDB.value.map(i => i.buildingType))];
    window.CEM.createChart('chart-indicator-bar', {
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: types, axisLabel: { rotate: 30 } },
      yAxis: { type: 'value', name: '元/㎡' },
      series: [{
        type: 'bar', data: types.map(t => {
          const items = indicatorDB.value.filter(i => i.buildingType === t);
          return items.length ? Math.round(items.reduce((s,i)=>s+i.costPerSqm,0)/items.length) : 0;
        }), itemStyle: { color: '#409eff' },
      }],
      grid: { left: 60, right: 20, top: 20, bottom: 60 },
    });
    window.CEM.createChart('chart-indicator-radar', {
      radar: { indicator: [
        { name: '综合单价', max: 6000 }, { name: '钢筋含量', max: 100 },
        { name: '混凝土含量', max: 0.6 }, { name: '模板含量', max: 5 },
        { name: '砌体含量', max: 0.3 }, { name: '安装占比', max: 35 },
      ]},
      series: [{
        type: 'radar',
        data: [
          { value: [3850, 58, 0.44, 3.2, 0.18, 25], name: '本项目', areaStyle: { color: 'rgba(64,158,255,0.2)' } },
          { value: [3200, 48, 0.38, 2.8, 0.15, 20], name: '企业标准', areaStyle: { color: 'rgba(103,194,58,0.2)' } },
          { value: [3500, 55, 0.42, 3.0, 0.16, 22], name: '行业标准', areaStyle: { color: 'rgba(230,162,60,0.2)' } },
        ],
      }],
    });
  }


  // ===== REGISTER =====
  window.CEM = window.CEM || {};
  Object.assign(window.CEM, {
    indicatorDB,
    indBuildingFilter,
    indStructureFilter,
    estBuildingType,
    estStructureType,
    estArea,
    estFloors,
    estUnderground,
    estRegion,
    estRunning,
    estimationResult,
    buildingTypes,
    structureTypes,
    filteredIndicators,
    extractIndicators,
    addSampleIndicator,
    runEstimation,
    deleteIndicator,
    renderIndicatorCharts,
  });
})();
