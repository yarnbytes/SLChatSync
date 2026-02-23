<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import { CloudSync, CheckCircle2, User, KeyRound, Github, Folder, AlertCircle, RefreshCw, HelpCircle } from 'lucide-vue-next';
import { MessagePlugin } from 'tdesign-vue-next';

const { t, locale } = useI18n();

const toggleLanguage = () => {
  locale.value = locale.value === 'zh' ? 'en' : 'zh';
};

const showGuide = ref(false);

const parsedGuideContent = computed(() => {
  let raw = t('app.guide.content');
  raw = raw.replace(/### (.*)/g, '<h3 class="guide-title">$1</h3>');
  raw = raw.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  raw = raw.replace(/1\. (.*)/g, '<div class="guide-list-item"><b>1.</b> $1</div>');
  raw = raw.replace(/2\. (.*)/g, '<div class="guide-list-item"><b>2.</b> $1</div>');
  raw = raw.replace(/3\. (.*)/g, '<div class="guide-list-item"><b>3.</b> $1</div>');
  // For spaces + hyphen or spaces + asterisk
  raw = raw.replace(/\n\s+- (.*)/g, '\n<div class="guide-bullet">• $1</div>');
  raw = raw.replace(/\n\s+\* (.*)/g, '\n<div class="guide-bullet">• $1</div>');
  raw = raw.replace(/`([^`]+)`/g, '<code class="guide-code">$1</code>');
  raw = raw.replace(/\n\n/g, '<br/>');
  return raw;
});

const config = ref({
  appDataPath: '',
  accountName: '',
  repoUrl: '',
  gitUsername: '',
  gitToken: '',
  encryptPassword: ''
});

const isSyncing = ref(false);
const syncLog = ref([]);
const syncStatus = ref('idle'); // idle, syncing, success, error
const changesMade = ref(0);
const availableAccounts = ref([]);

const appVersion = __APP_VERSION__;
const latestVer = ref(null);

const loadAccounts = async () => {
  if (config.value.appDataPath && window.electronAPI) {
    availableAccounts.value = await window.electronAPI.getAccountFolders(config.value.appDataPath);
  }
};

const checkUpdate = async () => {
  try {
    const currentVersion = __APP_VERSION__;
    let data;

    // Try Github API first
    try {
      const gRes = await fetch('https://api.github.com/repos/yarnbytes/fs-chat-vault/releases/latest');
      if (gRes.ok) data = await gRes.json();
    } catch (e) { }

    // Backup: Try Gitee API if Github is inaccessible
    if (!data) {
      try {
        const giteeRes = await fetch('https://gitee.com/api/v5/repos/yarnbytes/fs-chat-vault/releases/latest');
        if (giteeRes.ok) data = await giteeRes.json();
      } catch (e) { }
    }

    if (data && data.tag_name) {
      latestVer.value = data.tag_name;
      const latestVersion = data.tag_name.replace('v', '');
      const p1 = latestVersion.split('.').map(Number);
      const p2 = currentVersion.split('.').map(Number);
      let isNew = false;
      for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
        const n1 = p1[i] || 0;
        const n2 = p2[i] || 0;
        if (n1 > n2) { isNew = true; break; }
        if (n1 < n2) { break; }
      }

      if (isNew) {
        MessagePlugin.info({
          content: t('app.status.updateAvailable', { version: data.tag_name }),
          duration: 15000,
          closeBtn: true
        });
      }
    }
  } catch (e) {
    console.warn('Update check failed:', e);
  }
};

onMounted(async () => {
  checkUpdate();
  // Load saved config
  const saved = localStorage.getItem('fsChatVaultConfig');
  if (saved) {
    try {
      config.value = JSON.parse(saved);
    } catch (e) { }
  }

  if (window.electronAPI && !config.value.appDataPath) {
    config.value.appDataPath = await window.electronAPI.getDefaultPath();
  }

  await loadAccounts();

  if (window.electronAPI) {
    window.electronAPI.onSyncProgress((event, message) => {
      try {
        const payload = JSON.parse(message);
        addLog(t(payload.key, payload));
      } catch (e) {
        addLog(message);
      }
    });
  }
});

const addLog = (msg) => {
  syncLog.value.push({ time: new Date().toLocaleTimeString(), text: msg });
};

const saveConfig = () => {
  localStorage.setItem('fsChatVaultConfig', JSON.stringify(config.value));
};

const startSync = async () => {
  if (!config.value.accountName || !config.value.repoUrl || !config.value.gitUsername || !config.value.gitToken) {
    addLog(t('app.logs.fillInfo'));
    syncStatus.value = 'error';
    return;
  }

  saveConfig();
  isSyncing.value = true;
  syncStatus.value = 'syncing';
  syncLog.value = [];
  addLog(t('app.logs.start'));

  if (window.electronAPI) {
    const plainConfig = { ...config.value };
    const res = await window.electronAPI.startSync(plainConfig);

    if (res.success) {
      try {
        const payload = JSON.parse(res.message);
        addLog(t('app.logs.success', { msg: t(payload.key, payload) }));
      } catch (e) {
        addLog(t('app.logs.success', { msg: res.message }));
      }
      changesMade.value = res.changes || 0;
      syncStatus.value = 'success';
      setTimeout(() => {
        if (syncStatus.value === 'success') syncStatus.value = 'idle';
      }, 5000);
    } else {
      try {
        const payload = JSON.parse(res.message);
        addLog(t('app.logs.error', { msg: t(payload.key, payload) }));
      } catch (e) {
        addLog(t('app.logs.error', { msg: res.message }));
      }
      syncStatus.value = 'error';
    }
  } else {
    // Dummy dev mode
    await new Promise(r => setTimeout(r, 1500));
    addLog(t('app.git.merging'));
    await new Promise(r => setTimeout(r, 1500));
    addLog(t('app.logs.success', { msg: '' }));
    syncStatus.value = 'success';
  }

  isSyncing.value = false;
};

const validateInputs = () => {
  saveConfig();
};

const handlePathChange = async () => {
  await loadAccounts();
  saveConfig();
};

const handleMin = () => {
  if (window.electronAPI) window.electronAPI.minWindow();
};

const handleClose = () => {
  if (window.electronAPI) window.electronAPI.closeWindow();
};

const openExternalLink = (url) => {
  if (window.electronAPI) window.electronAPI.openUrl(url);
};
</script>

<template>
  <div class="app-container">
    <!-- Custom Title Bar -->
    <div class="title-bar" style="-webkit-app-region: drag;">
      <div class="title-bar-left">
        <CloudSync class="w-4 h-4 text-primary" />
        <span class="title-text">{{ $t('app.title') }}</span>
      </div>
      <div class="title-bar-right" style="-webkit-app-region: no-drag;">
        <button class="title-btn" @click="showGuide = true" title="使用说明 / Guide">
          <HelpCircle class="w-4 h-4" />
        </button>
        <button class="title-btn" @click="toggleLanguage" title="切换语言 / Language"
          style="font-size: 11px; font-weight: bold;">
          {{ locale === 'zh' ? 'EN' : 'ZH' }}
        </button>
        <button class="title-btn" @click="handleMin">
          <svg viewBox="0 0 16 16">
            <path d="M14 8v1H2V8h12z" fill="currentColor" />
          </svg>
        </button>
        <button class="title-btn close-btn" @click="handleClose">
          <svg viewBox="0 0 16 16">
            <path
              d="M14 3.41L12.59 2 8 6.59 3.41 2 2 3.41 6.59 8 2 12.59 3.41 14 8 9.41 12.59 14 14 12.59 9.41 8 14 3.41z"
              fill="currentColor" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Main Content -->
    <div class="main-content">
      <t-card class="sync-card" :bordered="false">

        <div class="header-section">
          <h2>{{ $t('app.configTitle') }}</h2>
          <div v-if="syncStatus === 'success'" class="status-badge success">
            <CheckCircle2 class="w-4 h-4" />{{ $t('app.status.completed') }}
          </div>
          <div v-if="syncStatus === 'error'" class="status-badge error">
            <AlertCircle class="w-4 h-4" />{{ $t('app.status.error') }}
          </div>
        </div>

        <t-row :gutter="24" class="main-row">
          <!-- Left Column: Form -->
          <t-col :span="6" class="form-column">
            <t-form :data="config" layout="vertical" labelAlign="top" class="config-form">
              <t-form-item :label="$t('app.form.pathLabel')" name="appDataPath">
                <template #label>
                  <Folder class="w-4 h-4 mr-1" /> {{ $t('app.form.pathLabel') }}
                </template>
                <t-input v-model="config.appDataPath" :placeholder="$t('app.form.pathPlaceholder')"
                  @change="handlePathChange" />
              </t-form-item>

              <t-form-item :label="$t('app.form.folderLabel')" name="accountName">
                <template #label>
                  <User class="w-4 h-4 mr-1" /> {{ $t('app.form.folderHelp') }}
                </template>
                <t-select v-model="config.accountName" :placeholder="$t('app.form.folderPlaceholder')"
                  @change="validateInputs" :options="availableAccounts.map(a => ({ label: a, value: a }))">
                </t-select>
              </t-form-item>

              <t-form-item :label="$t('app.form.repoLabel')" name="repoUrl">
                <template #label>
                  <Github class="w-4 h-4 mr-1" /> {{ $t('app.form.repoHelp') }}
                </template>
                <t-input v-model="config.repoUrl" :placeholder="$t('app.form.repoPlaceholder')"
                  @change="validateInputs" />
              </t-form-item>

              <t-form-item :label="$t('app.form.userLabel')" name="gitUsername">
                <template #label>
                  <User class="w-4 h-4 mr-1" /> {{ $t('app.form.userLabel') }}
                </template>
                <t-input v-model="config.gitUsername" :placeholder="$t('app.form.userPlaceholder')"
                  @change="validateInputs" />
              </t-form-item>

              <t-form-item :label="$t('app.form.tokenLabel')" name="gitToken">
                <template #label>
                  <KeyRound class="w-4 h-4 mr-1" /> {{ $t('app.form.tokenLabel') }}
                </template>
                <t-input type="password" v-model="config.gitToken" :placeholder="$t('app.form.tokenPlaceholder')"
                  @change="validateInputs" />
              </t-form-item>

              <t-form-item :label="$t('app.form.encryptLabel')" name="encryptPassword">
                <template #label>
                  <KeyRound class="w-4 h-4 mr-1 text-purple-500" />
                  <span class="text-purple-600 font-medium">{{ $t('app.form.encryptHelp') }}</span>
                </template>
                <t-input type="password" v-model="config.encryptPassword"
                  :placeholder="$t('app.form.encryptPlaceholder')" @change="validateInputs" />
              </t-form-item>
            </t-form>
          </t-col>

          <!-- Right Column: Log and Action -->
          <t-col :span="6" class="action-column">

            <div class="log-container">
              <div v-if="syncLog.length === 0" class="empty-log">
                <RefreshCw class="w-8 h-8 opacity-20 mb-2" />
                <span>{{ $t('app.status.idle') }}</span>
              </div>
              <div v-else class="log-list">
                <div v-for="(log, i) in syncLog" :key="i" class="log-item">
                  <span class="log-time">[{{ log.time }}]</span>
                  <span class="log-text">{{ log.text }}</span>
                </div>
              </div>
            </div>

            <t-button theme="primary" size="large" block :loading="isSyncing" @click="startSync" class="sync-btn">
              <template #icon>
                <CloudSync v-if="!isSyncing" />
              </template>
              {{ isSyncing ? $t('app.status.syncing') : $t('app.status.startSync') }}
            </t-button>

          </t-col>
        </t-row>

      </t-card>

      <!-- App Footer Information -->
      <div class="app-footer"
        style="margin-top: 12px; flex-shrink: 0; text-align: center; color: #888; font-size: 12px; display: flex; justify-content: center; align-items: center; gap: 8px;">
        <span>{{ $t('app.footer.version') }}: v{{ appVersion }}</span>
        <span v-if="latestVer">{{ $t('app.footer.latest') }}: {{ latestVer }}</span>
        <span v-else>{{ $t('app.footer.checkLatest') }}</span>
        <span style="opacity: 0.5; margin: 0 4px;">|</span>
        <a href="#" @click.prevent="openExternalLink('https://github.com/yarnbytes/fs-chat-vault')"
          style="color: #0052d9; text-decoration: none; cursor: pointer;">Github</a>
        <a href="#" @click.prevent="openExternalLink('https://gitee.com/yarnbyte/fs-chat-vault')"
          style="color: #0052d9; text-decoration: none; cursor: pointer;">Gitee</a>
        <span style="opacity: 0.5; margin: 0 4px;">|</span>
        <span>{{ $t('app.footer.author') }}</span>
      </div>
    </div>

    <!-- Guide Dialog -->
    <t-dialog v-model:visible="showGuide" :header="$t('app.guide.title')" :footer="false" width="700px"
      placement="center">
      <div class="guide-content" v-html="parsedGuideContent"></div>
    </t-dialog>
  </div>
</template>

<style>
:root {
  --primary-color: #0052d9;
  --bg-color: #f3f4f6;
}

body {
  background-color: transparent !important;
  overflow: hidden;
}

.app-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-color);
  border-radius: 8px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
  border: 1px solid #e5e7eb;
  overflow: hidden;
}

/* Custom Title Bar */
.title-bar {
  height: 38px;
  background-color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 0 0 16px;
  user-select: none;
  border-bottom: 1px solid #e5e7eb;
}

.title-bar-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.text-primary {
  color: var(--primary-color);
}

.title-text {
  font-size: 13px;
  font-weight: 600;
  color: #4b5563;
}

.title-bar-right {
  display: flex;
  height: 100%;
}

.title-btn {
  width: 46px;
  height: 100%;
  border: none;
  background: transparent;
  color: #6b7280;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s;
}

.title-btn svg {
  width: 14px;
  height: 14px;
}

.title-btn:hover {
  background: #e5e7eb;
}

.close-btn:hover {
  background: #ef4444;
  color: white;
}

/* Main Layout */
.main-content {
  flex: 1;
  padding: 24px;
  display: flex;
  flex-direction: column;
  overflow-y: hidden;
}

.sync-card {
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Make the card body stretch and flex */
.sync-card .t-card__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 24px;
  overflow-y: auto;
}

.main-row {
  flex: 1;
  display: flex;
}

.form-column,
.action-column {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f3f4f6;
  flex-shrink: 0;
}

.header-section h2 {
  margin: 0;
  font-size: 20px;
  color: #111827;
}

.status-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
}

.status-badge.success {
  background: #dcfce7;
  color: #166534;
}

.status-badge.error {
  background: #fee2e2;
  color: #991b1b;
}

.mr-1 {
  display: inline-block;
  vertical-align: middle;
  margin-right: 4px;
}

.config-form .t-form__label {
  font-size: 13px;
  color: #4b5563;
}

.log-container {
  flex: 1;
  background: #1f2937;
  border-radius: 8px;
  margin-bottom: 24px;
  padding: 16px;
  color: #e5e7eb;
  font-family: inherit;
  font-size: 13px;
  overflow-y: auto;
  min-height: 250px;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
}

.empty-log {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
}

.log-item {
  margin-bottom: 6px;
}

.log-time {
  color: #6b7280;
  margin-right: 8px;
}

.log-text {
  line-height: 1.5;
}

.sync-btn {
  height: 48px;
  font-size: 16px;
  font-weight: 600;
  border-radius: 8px;
  flex-shrink: 0;
}

/* Guide Content Styles */
.guide-content {
  font-size: 14px;
  line-height: 1.6;
  color: #4b5563;
  padding-bottom: 20px;
  max-height: 60vh;
  overflow-y: auto;
}

.guide-title {
  margin-top: 16px;
  margin-bottom: 8px;
  color: var(--primary-color);
}

.guide-list-item {
  margin-top: 12px;
}

.guide-bullet {
  margin-left: 16px;
  margin-top: 2px;
  color: #6b7280;
}

.guide-code {
  background: #f3f4f6;
  padding: 2px 4px;
  border-radius: 4px;
  font-family: inherit;
  color: #ef4444;
}
</style>
