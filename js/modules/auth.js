// js/modules/auth.js — Authentication (login, logout, password change)
;(function() {
  const { ref, reactive, computed, watch, nextTick } = Vue;
  const { ElMessage, ElMessageBox, ElNotification } = ElementPlus;

  // ===== STATE =====
  const loggedIn = ref(false);
  const currentUser = ref(null);
  const loginTime = ref('');
  const loginLoading = ref(false);
  const loginForm = reactive({ username: 'admin', password: '123456' });
  const loginFormRef = ref(null);
  const loginRules = {
    username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
    password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
  };
  const changePasswordDialog = ref(false);
  const pwdForm = reactive({ oldPwd: '', newPwd: '', confirmPwd: '' });

  // ===== FUNCTIONS =====
  function handleLogin() {
    if (!loginFormRef.value) return;
    loginFormRef.value.validate(valid => {
      if (!valid) return;
      loginLoading.value = true;
      setTimeout(() => {
        if (loginForm.username === 'admin' && loginForm.password === '123456') {
          doLogin({ username: 'admin', displayName: '造价管理员' });
        } else if (loginForm.username && loginForm.password.length >= 4) {
          doLogin({ username: loginForm.username, displayName: loginForm.username });
        } else {
          ElMessage.error('用户名或密码错误（演示：admin/123456）');
        }
        loginLoading.value = false;
      }, 800);
    });
  }

  function loginAsGuest() {
    doLogin({ username: 'guest', displayName: '游客用户' });
  }

  function doLogin(user) {
    currentUser.value = user;
    loggedIn.value = true;
    loginTime.value = new Date().toLocaleString();
    localStorage.setItem('cost_app_user', JSON.stringify(user));
    localStorage.setItem('cost_app_login_time', loginTime.value);
    ElNotification({ title: '登录成功', message: `欢迎使用智慧造价平台，${user.displayName}！`, type: 'success', duration: 2500 });
    nextTick(() => {
      window.CEM.navigate('dashboard');
      window.CEM.renderDashboardCharts();
    });
  }

  function handleLogout() {
    ElMessageBox.confirm('确定要退出登录吗？', '提示', { confirmButtonText: '确定', cancelButtonText: '取消' })
      .then(() => {
        loggedIn.value = false;
        currentUser.value = null;
        ElMessage.success('已退出登录');
      }).catch(() => {});
  }

  function doChangePassword() {
    if (!pwdForm.oldPwd || !pwdForm.newPwd) {
      ElMessage.warning('请填写完整信息');
      return;
    }
    if (pwdForm.newPwd !== pwdForm.confirmPwd) {
      ElMessage.error('两次输入的新密码不一致');
      return;
    }
    ElMessage.success('密码修改成功（演示环境）');
    changePasswordDialog.value = false;
    Object.assign(pwdForm, { oldPwd: '', newPwd: '', confirmPwd: '' });
  }

  // ===== REGISTER =====
  window.CEM = window.CEM || {};
  Object.assign(window.CEM, {
    loggedIn,
    currentUser,
    loginTime,
    loginLoading,
    loginForm,
    loginRules,
    loginFormRef,
    changePasswordDialog,
    pwdForm,
    handleLogin,
    loginAsGuest,
    doLogin,
    handleLogout,
    doChangePassword,
  });
})();
