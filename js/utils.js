// js/utils.js — 通用工具函数
;(function() {
  function formatMoney(val) {
    if (Math.abs(val) >= 10000) return (val / 10000).toFixed(2) + ' 万元';
    return val.toLocaleString() + ' 元';
  }

  function fileIcon(name) {
    const ext = name.split('.').pop().toLowerCase();
    const map = { dwg: '📐', dxf: '📐', pdf: '📑', xlsx: '📊', xls: '📊', png: '🖼️', jpg: '🖼️', jpeg: '🖼️', tiff: '🖼️', tif: '🖼️' };
    return map[ext] || '📎';
  }

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(2) + ' MB';
  }

  function stageTagType(stage) {
    const map = { decision: 'info', bidding: '', construction: 'warning', completion: 'success' };
    return map[stage] || 'info';
  }

  function stageLabel(stage) {
    const map = { decision: '决策', bidding: '招投标', construction: '施工', completion: '竣工' };
    return map[stage] || stage;
  }

  function changeStatusLabel(s) {
    const map = { draft: '草稿', pending: '审批中', approved: '已批准', rejected: '已驳回' };
    return map[s] || s;
  }

  function defaultProjForm() {
    return {
      id: 'P' + new Date().getFullYear() + '-' + String(allProjects.value.length + 1).padStart(3,'0'),
      name: '', type: '房建', discipline: '建筑工程', budget: 0, actual: 0,
      stage: 'decision', progress: 0, status: 'normal', location: '',
      startDate: '', endDate: '', description: '',
    };
  }

  function defaultChangeForm() {
    return {
      projectId: '', type: '设计变更', location: '', reason: '', estimatedAmount: 0,
      relatedItems: [], attachment: '',
    };
  }

  function defaultTaskForm() {
    return { title:'', projectId:'', assignee:'', discipline:'建筑工程', priority:'medium', deadline:'', description:'' };
  }

  window.CEM = window.CEM || {};
  Object.assign(window.CEM, {
    formatMoney, fileIcon, formatSize, stageTagType, stageLabel,
    changeStatusLabel, defaultProjForm, defaultChangeForm, defaultTaskForm,
  });
})();
