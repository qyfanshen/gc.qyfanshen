// js/modules/upload.js — 多模态图纸/文件识别模块
;(function() {
  const { ref, reactive, computed, watch, nextTick } = Vue;
  const { ElMessage, ElMessageBox, ElNotification } = ElementPlus;

  // ===== STATE =====
  const fileInput = ref(null);
  const uploadedFiles = ref([]);
  const ocrResults = ref([]);
  const ocrRunning = ref(false);

  const hasPendingFiles = computed(() => uploadedFiles.value.some(f => f.status === 'pending'));
  const allFilesDone = computed(() => uploadedFiles.value.length > 0 && uploadedFiles.value.every(f => f.status === 'done'));

  // ===== FUNCTIONS =====
  function triggerUpload() { fileInput.value?.click(); }

  function handleFileSelect(e) {
    const files = Array.from(e.target.files || []);
    addFiles(files);
    if (fileInput.value) fileInput.value.value = '';
  }

  function handleDrop(e) {
    const files = Array.from(e.dataTransfer.files || []);
    addFiles(files);
  }

  function addFiles(files) {
    files.forEach(f => {
      uploadedFiles.value.push({
        name: f.name,
        size: f.size,
        time: new Date().toLocaleString(),
        status: 'pending',
        progress: 0,
        raw: f,
      });
    });
    ElMessage.success(`已添加 ${files.length} 个文件`);
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

  function removeFile(index) { uploadedFiles.value.splice(index, 1); }

  function startOCR(file, index) {
    file.status = 'processing';
    file.progress = 0;
    const timer = setInterval(() => {
      file.progress += Math.random() * 25 + 10;
      if (file.progress >= 100) {
        file.progress = 100;
        file.status = 'done';
        clearInterval(timer);
        generateOCRResults(file);
        ElNotification({ title: '识别完成', message: `${file.name} 已成功识别`, type: 'success', duration: 2500 });
      }
    }, 400);
  }

  function batchOCR() {
    ocrRunning.value = true;
    uploadedFiles.value.forEach((f, i) => {
      if (f.status === 'pending') {
        setTimeout(() => startOCR(f, i), i * 600);
      }
    });
    setTimeout(() => { ocrRunning.value = false; }, uploadedFiles.value.length * 600 + 3000);
  }

  function generateOCRResults(file) {
    const elements = [
      { element: '项目名称', value: '滨江商务中心1#楼', confidence: 98, source: file.name },
      { element: '建筑面积', value: '48,500 ㎡', confidence: 95, source: file.name },
      { element: '结构类型', value: '框架-核心筒结构', confidence: 92, source: file.name },
      { element: '混凝土用量', value: '12,800 m³', confidence: 89, source: file.name },
      { element: '钢筋用量', value: '2,350 吨', confidence: 91, source: file.name },
      { element: '模板面积', value: '38,200 ㎡', confidence: 87, source: file.name },
      { element: '砌体工程量', value: '5,600 m³', confidence: 85, source: file.name },
      { element: '防水面积', value: '8,900 ㎡', confidence: 88, source: file.name },
    ];
    elements.forEach(e => ocrResults.value.push(e));
    window.CEM.saveToLocal();
  }

  // ===== REGISTER =====
  window.CEM = window.CEM || {};
  Object.assign(window.CEM, {
    fileInput,
    uploadedFiles,
    ocrResults,
    ocrRunning,
    hasPendingFiles,
    allFilesDone,
    triggerUpload,
    handleFileSelect,
    handleDrop,
    addFiles,
    fileIcon,
    formatSize,
    removeFile,
    startOCR,
    batchOCR,
    generateOCRResults,
  });
})();
