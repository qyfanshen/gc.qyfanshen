// js/modules/changes.js — 变更签证管理模块
;(function() {
  const { ref, reactive, computed, watch, nextTick } = Vue;
  const { ElMessage, ElMessageBox, ElNotification } = ElementPlus;

  // ===== STATE =====
  const changeOrders = ref([]);
  const changeProjectFilter = ref('');
  const changeStatusFilter = ref('');
  const changeDialogVisible = ref(false);
  const changeDetailVisible = ref(false);
  const viewingChange = ref(null);
  const changeTypes = ['设计变更', '现场签证', '技术核定', '材料替换', '工期变更', '范围变更', '其他'];

  const defaultChangeForm = () => ({
    projectId: '', type: '设计变更', location: '', reason: '', estimatedAmount: 0,
    relatedItems: [], attachment: '',
  });
  const changeForm = reactive(defaultChangeForm());

  const changeStats = computed(() => {
    const cs = changeOrders.value;
    return [
      { label: '变更总数', value: cs.length, icon:'📝', color:'linear-gradient(135deg,#409eff,#337ecc)' },
      { label: '审批中', value: cs.filter(c=>c.status==='pending').length, icon:'⏳', color:'linear-gradient(135deg,#e6a23c,#cf8b2d)' },
      { label: '已批准', value: cs.filter(c=>c.status==='approved').length, icon:'✅', color:'linear-gradient(135deg,#67c23a,#529b2e)' },
      { label: '累计变更(万元)', value: cs.filter(c=>c.status==='approved').reduce((s,c)=>s+c.approvedAmount,0).toFixed(0), icon:'💰', color:'linear-gradient(135deg,#6366f1,#4f46e5)' },
    ];
  });

  const filteredChanges = computed(() => {
    let list = changeOrders.value;
    if (changeProjectFilter.value) list = list.filter(c => c.projectId === changeProjectFilter.value);
    if (changeStatusFilter.value) list = list.filter(c => c.status === changeStatusFilter.value);
    return list;
  });

  const overLimitProjects = computed(() => {
    const map = {};
    changeOrders.value.filter(c => c.status === 'approved').forEach(c => {
      if (!map[c.projectId]) map[c.projectId] = { id: c.projectId, name: c.projectName, totalChanges: 0, budget: 0 };
      map[c.projectId].totalChanges += c.approvedAmount;
    });
    const allProjects = window.CEM.allProjects;
    if (window.CEM.allProjects) {
      window.CEM.allProjects.value.forEach(p => { if (map[p.id]) map[p.id].budget = p.budget; });
    }
    return Object.values(map).filter(p => p.budget > 0).map(p => ({
      ...p, changeRatio: (p.totalChanges / p.budget) * 100,
    })).filter(p => p.changeRatio > 5).sort((a,b) => b.changeRatio - a.changeRatio);
  });

  // ===== FUNCTIONS =====
  function changeStatusLabel(s) {
    const map = { draft: '草稿', pending: '审批中', approved: '已批准', rejected: '已驳回' };
    return map[s] || s;
  }

  function openChangeDialog() { Object.assign(changeForm, defaultChangeForm()); changeDialogVisible.value = true; }

  function onChangeProjectSelect(pid) {
    const allProjects = window.CEM.allProjects;
    if (!allProjects) return;
    const proj = window.CEM.allProjects.value.find(p => p.id === pid);
    if (proj) changeForm.projectName = proj.name;
  }

  function submitChange() {
    if (!changeForm.projectId || !changeForm.reason) { ElMessage.warning('请填写关联项目和变更原因'); return; }
    const allProjects = window.CEM.allProjects;
    const proj = allProjects ? window.CEM.allProjects.value.find(p => p.id === changeForm.projectId) : null;
    const order = {
      id: 'CV-' + new Date().getFullYear() + '-' + String(changeOrders.value.length+1).padStart(3,'0'),
      ...changeForm,
      projectName: proj?.name || changeForm.projectId,
      estimatedAmount: Number(changeForm.estimatedAmount)||0,
      approvedAmount: 0,
      status: 'pending',
      approvalFlow: [
        { role: '施工方', status: 'approved', date: new Date().toLocaleString(), comment: '提交申请' },
        { role: '监理方', status: 'pending', date: '', comment: '' },
        { role: '造价咨询', status: 'pending', date: '', comment: '' },
        { role: '甲方', status: 'pending', date: '', comment: '' },
      ],
      createdAt: new Date().toLocaleString(),
      beforeCost: proj?.actual || 0,
      afterCost: (proj?.actual || 0) + Number(changeForm.estimatedAmount)||0,
    };
    changeOrders.value.unshift(order);
    changeDialogVisible.value = false;
    window.CEM.addLog?.('create', '提交变更申请', order.id, order.projectId);
    ElMessage.success('变更申请已提交');
    window.CEM.saveToLocal?.();
  }

  function viewChange(order) { viewingChange.value = order; changeDetailVisible.value = true; }

  function deleteChange(order) {
    changeOrders.value = changeOrders.value.filter(c => c.id !== order.id);
    window.CEM.addLog?.('delete', '删除变更', order.id, order.projectId);
    window.CEM.saveToLocal?.();
    ElMessage.success('已删除');
  }

  function approveChangeStep(order) {
    const pendingIdx = order.approvalFlow.findIndex(n => n.status === 'pending');
    if (pendingIdx >= 0) {
      order.approvalFlow[pendingIdx].status = 'approved';
      order.approvalFlow[pendingIdx].date = new Date().toLocaleString();
      order.approvalFlow[pendingIdx].comment = '审批通过';
      // Check if all approved
      if (order.approvalFlow.every(n => n.status === 'approved')) {
        order.status = 'approved';
        order.approvedAmount = order.estimatedAmount;
        ElNotification({ title: '变更已批准', message: `${order.id} 已通过全部审批`, type: 'success' });
      }
    }
    window.CEM.addLog?.('approve', '审批通过', order.id, order.projectId);
    window.CEM.saveToLocal?.();
  }

  function rejectChange(order) {
    const pendingIdx = order.approvalFlow.findIndex(n => n.status === 'pending');
    if (pendingIdx >= 0) {
      order.approvalFlow[pendingIdx].status = 'rejected';
      order.approvalFlow[pendingIdx].date = new Date().toLocaleString();
      order.approvalFlow[pendingIdx].comment = '审批驳回';
      order.status = 'rejected';
    }
    window.CEM.addLog?.('approve', '驳回变更', order.id, order.projectId);
    window.CEM.saveToLocal?.();
    ElMessage.warning('变更已驳回');
  }

  // ===== REGISTER =====
  window.CEM = window.CEM || {};
  Object.assign(window.CEM, {
    changeOrders,
    changeProjectFilter,
    changeStatusFilter,
    changeDialogVisible,
    changeDetailVisible,
    viewingChange,
    changeTypes,
    changeForm,
    changeStats,
    filteredChanges,
    overLimitProjects,
    changeStatusLabel,
    defaultChangeForm,
    openChangeDialog,
    onChangeProjectSelect,
    submitChange,
    viewChange,
    deleteChange,
    approveChangeStep,
    rejectChange,
  });
})();
