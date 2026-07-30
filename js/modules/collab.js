// js/modules/collab.js — Collaboration: tasks, logs, versions, comments
;(function() {
  const { ref, reactive, computed, watch, nextTick } = Vue;
  const { ElMessage, ElMessageBox, ElNotification } = ElementPlus;

  // ===== STATE =====
  const collabTab = ref('tasks');
  const logEntries = ref([]);
  const logProjectFilter = ref('');
  const logActionFilter = ref('');
  const taskList = ref([]);
  const taskProjectFilter = ref('');
  const taskDialogVisible = ref(false);
  const versionList = ref([]);
  const versionTarget = ref('quantity');
  const versionDiff = ref(null);
  const commentTarget = ref('');
  const newComment = ref('');
  const commentsList = ref([]);

  const teamMembers = ['张工(土建)', '李工(安装)', '王工(装饰)', '赵工(市政)', '造价主管-陈', '项目经理-周'];

  const defaultTaskForm = () => ({ title:'', projectId:'', assignee:'', discipline:'建筑工程', priority:'medium', deadline:'', description:'' });
  const taskForm = reactive(defaultTaskForm());

  // ===== COMPUTED =====
  const filteredLogs = computed(() => {
    let list = logEntries.value;
    if (logProjectFilter.value) list = list.filter(l => l.projectId === logProjectFilter.value);
    if (logActionFilter.value) list = list.filter(l => l.type === logActionFilter.value);
    return list;
  });

  const filteredTasks = computed(() => {
    if (!taskProjectFilter.value) return taskList.value;
    return taskList.value.filter(t => t.projectId === taskProjectFilter.value);
  });

  const currentComments = computed(() => {
    if (!commentTarget.value) return [];
    return commentsList.value.filter(c => c.target === commentTarget.value);
  });

  // ===== FUNCTIONS =====
  function openTaskDialog() { Object.assign(taskForm, defaultTaskForm()); taskDialogVisible.value = true; }

  function createTask() {
    if (!taskForm.title) { ElMessage.warning('请输入任务名称'); return; }
    taskList.value.unshift({
      id: 'TASK-'+Date.now(), ...taskForm,
      projectName: window.CEM.allProjects.value.find(p=>p.id===taskForm.projectId)?.name || '',
      status: 'todo',
      createdAt: new Date().toLocaleString(),
    });
    taskDialogVisible.value = false;
    window.CEM.addLog('create', '创建任务', taskForm.title, taskForm.projectId);
    window.CEM.saveToLocal();
  }

  function toggleTaskStatus(task) {
    const order = ['todo','doing','done'];
    const idx = order.indexOf(task.status);
    task.status = order[(idx+1) % 3];
    window.CEM.addLog('edit', '更新任务状态', task.title, task.projectId);
    window.CEM.saveToLocal();
  }

  function deleteTask(idx) { const t = taskList.value[idx]; taskList.value.splice(idx,1); window.CEM.addLog('delete','删除任务',t.title,t.projectId); window.CEM.saveToLocal(); }

  function saveVersion() {
    const target = versionTarget.value === 'quantity' ? window.CEM.quantityItems.value : window.CEM.pricingItems.value;
    const ver = {
      id: 'V-' + Date.now(),
      time: new Date().toLocaleString(),
      user: currentUser?.value?.displayName || '系统',
      itemCount: target.length,
      data: JSON.parse(JSON.stringify(target)),
      type: versionTarget.value,
    };
    versionList.value.unshift(ver);
    window.CEM.saveToLocal();
    ElMessage.success('版本已保存');
  }

  function previewVersion(ver) {
    const current = ver.type === 'quantity' ? window.CEM.quantityItems.value : window.CEM.pricingItems.value;
    const lines = [];
    lines.push({ text: `=== 版本对比: ${ver.id} (${ver.time}) vs 当前 ===`, type: '' });
    const oldMap = {}; ver.data.forEach(d => { oldMap[d.code||d.quotaCode] = d; });
    const currentMap = {}; current.forEach(d => { currentMap[d.code||d.quotaCode] = d; });
    // Find additions
    Object.keys(currentMap).forEach(k => {
      if (!oldMap[k]) lines.push({ text: `+ 新增: ${currentMap[k].name||currentMap[k].quotaName}`, type: 'diff-add' });
    });
    // Find removals
    Object.keys(oldMap).forEach(k => {
      if (!currentMap[k]) lines.push({ text: `- 删除: ${oldMap[k].name||oldMap[k].quotaName}`, type: 'diff-remove' });
    });
    versionDiff.value = { v1: ver.id, v2: '当前', lines: lines.length > 2 ? lines : [{ text: '无差异', type: '' }] };
  }

  function restoreVersion(ver) {
    ElMessageBox.confirm(`确定恢复到版本 ${ver.id}？当前数据将丢失！`, '恢复确认', { type: 'warning' })
      .then(() => {
        if (ver.type === 'quantity') window.CEM.quantityItems.value = ver.data;
        else window.CEM.pricingItems.value = ver.data;
        window.CEM.addLog('edit', '恢复版本', ver.id, '');
        window.CEM.saveToLocal();
        ElMessage.success('已恢复');
      }).catch(()=>{});
  }

  function deleteVersion(idx) { versionList.value.splice(idx,1); window.CEM.saveToLocal(); }

  function addComment() {
    if (!commentTarget.value || !newComment.value.trim()) { ElMessage.warning('请选择对象并输入内容'); return; }
    commentsList.value.unshift({
      target: commentTarget.value, text: newComment.value.trim(),
      user: currentUser?.value?.displayName || '匿名',
      time: new Date().toLocaleString(),
    });
    newComment.value = '';
    window.CEM.saveToLocal();
  }

  // ===== REGISTER =====
  window.CEM = window.CEM || {};
  Object.assign(window.CEM, {
    collabTab, logEntries, logProjectFilter, logActionFilter,
    taskList, taskProjectFilter, taskDialogVisible,
    versionList, versionTarget, versionDiff,
    commentTarget, newComment, commentsList,
    teamMembers, taskForm, defaultTaskForm,
    filteredLogs, filteredTasks, currentComments,
    openTaskDialog, createTask, toggleTaskStatus, deleteTask,
    saveVersion, previewVersion, restoreVersion, deleteVersion,
    addComment,
  });
})();
