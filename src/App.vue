<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import { CloudSync, CheckCircle2, User, KeyRound, Github, Folder, AlertCircle, RefreshCw } from 'lucide-vue-next';

const config = ref({
  appDataPath: '',
  accountName: '',
  repoUrl: '',
  gitToken: ''
});

const isSyncing = ref(false);
const syncLog = ref([]);
const syncStatus = ref('idle'); // idle, syncing, success, error
const changesMade = ref(0);

onMounted(async () => {
  // Load saved config
  const saved = localStorage.getItem('chatSyncConfig');
  if (saved) {
    try {
      config.value = JSON.parse(saved);
    } catch(e){}
  }

  if (window.electronAPI && !config.value.appDataPath) {
    config.value.appDataPath = await window.electronAPI.getDefaultPath();
  }

  if (window.electronAPI) {
    window.electronAPI.onSyncProgress((event, message) => {
      addLog(message);
    });
  }
});

const addLog = (msg) => {
  syncLog.value.push({ time: new Date().toLocaleTimeString(), text: msg });
};

const saveConfig = () => {
  localStorage.setItem('chatSyncConfig', JSON.stringify(config.value));
};

const startSync = async () => {
  if (!config.value.accountName || !config.value.repoUrl || !config.value.gitToken) {
    addLog('❌ 请完整填写设置信息');
    syncStatus.value = 'error';
    return;
  }
  
  saveConfig();
  isSyncing.value = true;
  syncStatus.value = 'syncing';
  syncLog.value = [];
  addLog('🚀 开始同步聊天记录...');
  
  if (window.electronAPI) {
    const res = await window.electronAPI.startSync(config.value);
    
    if (res.success) {
      addLog(`✅ 同步完成！${res.message}`);
      changesMade.value = res.changes || 0;
      syncStatus.value = 'success';
      setTimeout(() => {
        if(syncStatus.value === 'success') syncStatus.value = 'idle';
      }, 5000);
    } else {
      addLog(`❌ 同步异常: ${res.message}`);
      syncStatus.value = 'error';
    }
  } else {
    // Dummy dev mode
    await new Promise(r => setTimeout(r, 1500));
    addLog('正在合并聊天记录...');
    await new Promise(r => setTimeout(r, 1500));
    addLog('✅ 同步完成！');
    syncStatus.value = 'success';
  }
  
  isSyncing.value = false;
};

const validateInputs = () => {
  saveConfig();
};
</script>

<template>
  <div class="relative w-full h-full flex items-center justify-center p-6" style="height: 100vh;">
    <!-- Background glows -->
    <div class="glow-orb" style="top: -100px; left: -100px;"></div>
    <div class="glow-orb" style="bottom: -200px; right: -100px; background: radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%);"></div>

    <div class="glass-panel w-full max-w-2xl px-8 py-10 relative flex flex-col gap-6" style="-webkit-app-region: no-drag;">
      <!-- Header -->
      <div class="flex items-center justify-between border-b pb-6" style="border-color: var(--color-border)">
        <div class="flex items-center gap-4">
          <div class="p-3 bg-purple-500/10 rounded-xl">
            <CloudSync class="w-8 h-8 text-purple-400" />
          </div>
          <div>
            <h1 class="text-2xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent m-0" style="margin: 0; padding:0;">ChatSync</h1>
            <p class="text-sm text-slate-400 m-0 mt-1">Firestorm 聊天记录多端同步管家</p>
          </div>
        </div>
        <div v-if="syncStatus === 'success'" class="bg-emerald-500/10 text-emerald-400 px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2">
          <CheckCircle2 class="w-4 h-4" />
          已完成
        </div>
        <div v-if="syncStatus === 'error'" class="bg-red-500/10 text-red-500 px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2">
          <AlertCircle class="w-4 h-4" />
          发生错误
        </div>
      </div>

      <!-- Main Layout: 2 Columns -->
      <div class="flex gap-8 mt-2" style="display: flex; gap: 32px;">
        
        <!-- Left: Settings Form -->
        <div class="flex-1 flex flex-col gap-5" style="flex: 1; display:flex; flex-direction:column; gap:20px;">
          
          <div class="form-group">
            <label class="label"><Folder class="w-3 h-3 inline mr-1" /> Firestorm 路径 (留空自动获)</label>
            <input type="text" v-model="config.appDataPath" placeholder="C:\Users\...\AppData\...\Firestorm_x64" class="input-field text-xs text-slate-400" @change="validateInputs" />
          </div>

          <div class="form-group">
            <label class="label"><User class="w-3 h-3 inline mr-1" /> Second Life 账户名</label>
            <input type="text" v-model="config.accountName" placeholder="例如: ka2s" class="input-field" @change="validateInputs" />
          </div>

          <div class="form-group">
            <label class="label"><Github class="w-3 h-3 inline mr-1" /> Git 仓库地址 (Github / Gitee)</label>
            <input type="text" v-model="config.repoUrl" placeholder="https://gitee.com/user/sl-logs.git" class="input-field" @change="validateInputs" />
          </div>

          <div class="form-group">
            <label class="label"><KeyRound class="w-3 h-3 inline mr-1" /> 访问令牌 Token 或 密码</label>
            <input type="password" v-model="config.gitToken" placeholder="••••••••••••••••" class="input-field" @change="validateInputs" />
          </div>

        </div>

        <!-- Right: Status & Action -->
        <div class="flex-1 flex flex-col justify-between" style="flex: 1; display:flex; flex-direction:column;">
          
          <!-- Terminal / Logger -->
          <div class="bg-slate-900/50 border rounded-xl flex-1 mb-6 p-4 overflow-y-auto" style="border-color: var(--color-border); font-family: monospace; font-size: 12px; min-height: 180px;">
            <div v-if="syncLog.length === 0" class="h-full flex flex-col items-center justify-center text-slate-500 gap-2">
              <RefreshCw class="w-8 h-8 opacity-20" />
              <span>准备就绪，等待同步任务</span>
            </div>
            <div v-else class="flex flex-col gap-1">
              <div v-for="(log, i) in syncLog" :key="i" class="flex gap-3 text-slate-300">
                <span class="text-slate-500 flex-shrink-0">[{{log.time}}]</span>
                <span>{{log.text}}</span>
              </div>
            </div>
          </div>

          <!-- Action Button -->
          <button 
            @click="startSync" 
            :disabled="isSyncing"
            class="btn-primary py-4 text-lg font-bold" 
            :class="{'syncing-glow': isSyncing}">
            <RefreshCw v-if="isSyncing" class="w-6 h-6 animate-spin" style="animation: spin 1s linear infinite;" />
            <CloudSync v-else class="w-6 h-6" />
            {{ isSyncing ? '同步中，请稍候...' : '一键云端同步' }}
          </button>
        </div>

      </div>
    </div>
  </div>
  
  <style>
    @keyframes spin { 100% { transform: rotate(360deg); } }
  </style>
</template>
