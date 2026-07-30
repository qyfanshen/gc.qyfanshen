// js/modules/projects.js — Project CRUD management
;(function() {
  const { ref, reactive, computed, watch, nextTick } = Vue;
  const { ElMessage, ElMessageBox, ElNotification } = ElementPlus;

  // ===== STATE =====
  const allProjects = ref([
    { id: 'P2024-001', name: '滨江商务中心1#楼', type: '房建', discipline: '建筑工程', budget: 12500, actual: 11820, stage: 'construction', progress: 65, status: 'normal', location: '杭州市滨江区', startDate: '2024-03-01', endDate: '2025-12-31', description: '框剪结构，地上28层，地下2层' },
    { id: 'P2024-002', name: '城北地铁3号线A标段', type: '市政', discipline: '市政工程', budget: 38600, actual: 35100, stage: 'construction', progress: 42, status: 'risk', location: '成都市城北区', startDate: '2024-01-15', endDate: '2026-06-30', description: '明挖+盾构区间，含2站3区间' },
    { id: 'P2024-003', name: '高新科技园二期', type: '工业', discipline: '建筑工程', budget: 8900, actual: 9100, stage: 'bidding', progress: 100, status: 'normal', location: '深圳市南山区', startDate: '2024-05-01', endDate: '2025-08-31', description: '钢结构厂房+研发办公楼' },
    { id: 'P2024-004', name: '阳光花园住宅小区', type: '房建', discipline: '建筑工程', budget: 22300, actual: 22450, stage: 'completion', progress: 95, status: 'warning', location: '南京市江宁区', startDate: '2022-06-01', endDate: '2024-09-30', description: '12栋高层住宅+配套商业' },
    { id: 'P2024-005', name: '东海跨海大桥连接线', type: '公路', discipline: '市政工程', budget: 56200, actual: 0, stage: 'decision', progress: 10, status: 'normal', location: '宁波市镇海区', startDate: '2024-09-01', endDate: '2027-12-31', description: '全长8.6km，含主跨480m斜拉桥' },
  ]);

  const projSearch = ref('');
  const projTypeFilter = ref('');
  const projStageFilter = ref('');
  const projStatusFilter = ref('');
  const projDialogVisible = ref(false);
  const editingProj = ref(null);
  const projSaving = ref(false);
  const selectedProjs = ref([]);
  const projTypes = ['房建', '市政', '工业', '公路', '水利', '铁路', '机场', '港口', '能源', '园林绿化'];

  function defaultProjForm() {
    return {
      id: 'P' + new Date().getFullYear() + '-' + String(allProjects.value.length + 1).padStart(3,'0'),
      name: '', type: '房建', discipline: '建筑工程', budget: 0, actual: 0,
      stage: 'decision', progress: 0, status: 'normal', location: '',
      startDate: '', endDate: '', description: '',
    };
  }
  const projForm = reactive(defaultProjForm());

  const projectStatsChips = computed(function() {
    return [
      { icon: '🏗️', label: '项目总数', value: allProjects.value.length },
      { icon: '💰', label: '总预算(万元)', value: allProjects.value.reduce(function(s,p){return s+p.budget;},0).toLocaleString() },
      { icon: '📊', label: '在建项目', value: allProjects.value.filter(function(p){return p.stage==='construction';}).length },
      { icon: '⚠️', label: '风险项目', value: allProjects.value.filter(function(p){return p.status==='risk';}).length },
    ];
  });

  const filteredProjects = computed(function() {
    var list = allProjects.value;
    if (projSearch.value) {
      var kw = projSearch.value.toLowerCase();
      list = list.filter(function(p) { return p.name.toLowerCase().indexOf(kw)>=0 || p.id.toLowerCase().indexOf(kw)>=0 || (p.location||'').toLowerCase().indexOf(kw)>=0; });
    }
    if (projTypeFilter.value) list = list.filter(function(p) { return p.type === projTypeFilter.value; });
    if (projStageFilter.value) list = list.filter(function(p) { return p.stage === projStageFilter.value; });
    if (projStatusFilter.value) list = list.filter(function(p) { return p.status === projStatusFilter.value; });
    return list;
  });

  function filterProjects() {}
  function onProjSelect(sel) { selectedProjs.value = sel; }

  function resetProjForm() {
    Object.assign(projForm, defaultProjForm());
    editingProj.value = null;
  }

  function openProjDialog(proj) {
    if (proj) {
      editingProj.value = proj;
      Object.assign(projForm, { ...proj });
    } else {
      editingProj.value = null;
      resetProjForm();
      projForm.id = 'P' + new Date().getFullYear() + '-' + String(allProjects.value.length + 1).padStart(3,'0');
    }
    projDialogVisible.value = true;
  }

  function saveProject() {
    if (!projForm.name || !projForm.id) { ElMessage.warning('请填写项目编号和名称'); return; }
    projSaving.value = true;
    setTimeout(function() {
      var data = { ...projForm, budget: Number(projForm.budget)||0, actual: Number(projForm.actual)||0, progress: Number(projForm.progress)||0 };
      if (editingProj.value) {
        var idx = allProjects.value.findIndex(function(p) { return p.id === editingProj.value.id; });
        if (idx >= 0) allProjects.value[idx] = data;
        ElMessage.success('项目已更新');
      } else {
        if (allProjects.value.find(function(p) { return p.id === data.id; })) { ElMessage.error('项目编号已存在'); projSaving.value = false; return; }
        allProjects.value.push(data);
        ElMessage.success('项目已创建');
      }
      projSaving.value = false;
      projDialogVisible.value = false;
      saveProjToLocal();
    }, 300);
  }

  function deleteProject(proj) {
    ElMessageBox.confirm('确定要删除项目「' + proj.name + '」吗？此操作不可恢复！', '删除确认', { confirmButtonText: '确定删除', cancelButtonText: '取消', type: 'error' })
      .then(function() {
        allProjects.value = allProjects.value.filter(function(p) { return p.id !== proj.id; });
        saveProjToLocal();
        ElMessage.success('项目已删除');
      }).catch(function() {});
  }

  function exportProjectsExcel() {
    var data = filteredProjects.value.map(function(p) { return { '项目编号':p.id, '项目名称':p.name, '类型':p.type, '专业':p.discipline, '预算(万元)':p.budget, '实际(万元)':p.actual, '阶段': window.CEM.stageLabel(p.stage), '进度':p.progress+'%', '状态':p.status==='normal'?'正常':p.status==='warning'?'预警':'风险', '地点':p.location, '开工':p.startDate, '竣工':p.endDate, '描述':p.description }; });
    var ws = XLSX.utils.json_to_sheet(data);
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '项目清单');
    XLSX.writeFile(wb, '项目清单_' + new Date().toISOString().slice(0,10) + '.xlsx');
    ElMessage.success('项目清单导出成功');
  }

  function saveProjToLocal() { window.CEM.dbPut('projects', allProjects.value); }
  function loadProjFromLocal() { window.CEM.dbLoad('projects', allProjects); }

  // === GUARANTEED WORKING: goCreateProject directly available ===
  function goCreateProject() {
    window.CEM.currentPage.value = 'projects';
    setTimeout(function() { projDialogVisible.value = true; }, 50);
  }

  // ===== REGISTER =====
  window.CEM = window.CEM || {};
  Object.assign(window.CEM, {
    allProjects, projSearch, projTypeFilter, projStageFilter, projStatusFilter,
    projDialogVisible, editingProj, projSaving, selectedProjs, projTypes,
    projForm, projectStatsChips, filteredProjects,
    filterProjects, onProjSelect, resetProjForm, openProjDialog,
    saveProject, deleteProject, exportProjectsExcel,
    saveProjToLocal, loadProjFromLocal, goCreateProject,
  });

  // Also set on window directly for bulletproof template access
  window.projDialogVisible = projDialogVisible;
  window.projForm = projForm;
  window.openProjDialog = openProjDialog;
  window.saveProject = saveProject;
  window.goCreateProject = goCreateProject;
  window.projTypes = projTypes;
  window.allProjects = allProjects;
  window.filteredProjects = filteredProjects;
  window.projSaving = projSaving;
  window.editingProj = editingProj;
  window.resetProjForm = resetProjForm;
})();