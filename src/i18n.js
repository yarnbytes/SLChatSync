import { createI18n } from 'vue-i18n';

const messages = {
    zh: {
        app: {
            title: 'FSChatVault',
            configTitle: '云端同步配置',
            status: {
                completed: '已完成',
                error: '发生错误',
                idle: '准备就绪，等待同步任务',
                syncing: '同步中，请稍候...',
                startSync: '一键云端同步',
                updateAvailable: '🎉 发现新版本 {version}，建议前往下载更新。'
            },
            form: {
                pathLabel: 'Firestorm 数据路径 (留空自动获取)',
                pathPlaceholder: '例如: C:\\Users\\...\\AppData\\...\\Firestorm_x64',
                folderLabel: '选择记录文件夹',
                folderHelp: '选择记录文件夹 (例如: 账户名_resident)',
                folderPlaceholder: '请选择需要同步的本地目录',
                repoLabel: 'Git 仓库地址',
                repoHelp: 'Git 仓库地址 (Github / Gitee)',
                repoPlaceholder: 'https://gitee.com/user/my_slchats.git',
                userLabel: 'Git 平台用户名',
                userPlaceholder: 'git账号',
                tokenLabel: '访问令牌 Token 或 密码',
                tokenPlaceholder: '••••••••••••••••',
                encryptLabel: '聊天记录加密密码 (可选)',
                encryptHelp: '端到端加密密码 (可选，保卫隐私)',
                encryptPlaceholder: '设置后，传到云端的数据将是密文'
            },
            logs: {
                fillInfo: '❌ 请完整填写设置信息',
                start: '🚀 开始同步聊天记录...',
                success: '✅ 同步完成！{msg}',
                error: '❌ 同步异常: {msg}'
            },
            git: {
                noLogDir: '找不到Firestorm日志目录: {path}',
                initEnv: '正在初始化本地同步环境...',
                cloneWait: '正在从远程仓库克隆，这可能需要一些时间...',
                pullWait: '正在从远程仓库拉取最新记录...',
                pullNoUpdate: '拉取未找到更新，继续合并...',
                merging: '正在合并聊天记录...',
                prepCommit: '正在准备提交...',
                writeHistory: '正在写入版本历史...',
                pushing: '成功合并，正在推送至远程服务器...',
                syncSuccess: '合并 {count} 个文件，并成功推送到云端。',
                noChanges: '所有文件均已是最新，无需推送。'
            },
            guide: {
                title: '使用说明',
                content: `
### 🚀 快速开始

1. **准备一个 Git 仓库**
   - 登录 Gitee (国内推荐) 或 Github。
   - 创建一个名为 \`my_slchats\`（或任意名称）的“私有 Git 仓库”。
   - 在个人设置中生成一个 **访问令牌 (Personal Access Token)**，并赋予写入权限。Github 目前**仅支持 Token 验证**，不支持账号密码。对于 Gitee，如果您使用账号密码，请准备好密码。

2. **配置软件**
   打开软件后，依次填写各项配置：
   * **Firestorm 数据路径**: 默认会自动获取。如果您更改了默认位置或者使用绿色版，请手动填写。
   * **选择记录文件夹**: 在下拉列表中选中您的账号对应文件夹（通常为 \`您的账号_resident\`）。
   * **Git 仓库地址**: 填写您刚才建立的仓库的完整链接。
   * **Git 平台用户名**: 您在 Gitee 或 Github 上的登录名。
   * **访问令牌 Token 或 密码**: 如果支持Token建议填写Token，否则填写账号的登录密码。
   * **聊天记录加密密码 (可选)**: 强烈建议填写！这是您的**端到端加密密码**。设置后，上传到云端的聊天记录将会变成加密信息，无法直接阅读，这能有效保护您的隐私不被泄露。**注意：如果你启用了加密，在你的所有互相联机的电脑上，都必须填写一模一样的加密密码。**

3. **一键同步**
   配置完成后，点击底部的“一键云端同步”。
   * **首用**：软件会自动为您搭建系统并将现有的记录上传加密备份。
   * **日常**：每次打开或关闭电脑前点一下，它会自动同步双端数据。`
            },
            footer: {
                version: '当前版本',
                latest: '最新发现',
                checkLatest: '正在云端检查更新...',
                author: '有问题可在SecondLife联系作者ka2s'
            }
        }
    },
    en: {
        app: {
            title: 'FSChatVault',
            configTitle: 'Cloud Sync Configuration',
            status: {
                completed: 'Completed',
                error: 'Error Occurred',
                idle: 'Ready, waiting for sync task',
                syncing: 'Syncing, please wait...',
                startSync: 'One-Click Cloud Sync',
                updateAvailable: '🎉 New version {version} is available for download.'
            },
            form: {
                pathLabel: 'Firestorm Data Path (Leave blank for auto)',
                pathPlaceholder: 'e.g., C:\\Users\\...\\AppData\\...\\Firestorm_x64',
                folderLabel: 'Select Log Folder',
                folderHelp: 'Select Log Folder (e.g., accountName_resident)',
                folderPlaceholder: 'Please select the local directory to sync',
                repoLabel: 'Git Repository URL',
                repoHelp: 'Git Repository URL (Github / Gitee)',
                repoPlaceholder: 'https://github.com/user/my_slchats.git',
                userLabel: 'Git Platform Username',
                userPlaceholder: 'git username',
                tokenLabel: 'Access Token or Password',
                tokenPlaceholder: '••••••••••••••••',
                encryptLabel: 'Chat Log Encryption Password (Optional)',
                encryptHelp: 'End-to-End Encryption Password (Optional for privacy)',
                encryptPlaceholder: 'If set, data synced to the cloud will be encrypted gibberish'
            },
            logs: {
                fillInfo: '❌ Please fill in all settings completely',
                start: '🚀 Starting chat log synchronization...',
                success: '✅ Sync complete! {msg}',
                error: '❌ Sync error: {msg}'
            },
            git: {
                noLogDir: 'Firestorm log directory not found: {path}',
                initEnv: 'Initializing local sync environment...',
                cloneWait: 'Cloning from remote repository, this may take a while...',
                pullWait: 'Pulling latest records from remote repository...',
                pullNoUpdate: 'No updates found on pull, continuing to merge...',
                merging: 'Merging chat logs...',
                prepCommit: 'Preparing to commit...',
                writeHistory: 'Writing version history...',
                pushing: 'Successfully merged, pushing to remote server...',
                syncSuccess: 'Merged {count} files and successfully pushed to cloud.',
                noChanges: 'All files are up to date, no push required.'
            },
            guide: {
                title: 'User Guide',
                content: `
### 🚀 Quick Start

1. **Setup Remote Repository**
   - Create a Private Repository on GitHub or Gitee.
   - Generate a **Personal Access Token** with repository write access in your account settings. GitHub **requires** a Token, passwords are not supported.

2. **Configuration**
   Open the application and fill in the configuration fields:
   * **Firestorm Data Path**: Auto-detected by default. Fill in manually if you are using a portable version or custom path.
   * **Select Log Folder**: Select your avatar's sub-folder from the dropdown list (usually ends with \`_resident\`).
   * **Git Repository URL**: Your remote git clone URL.
   * **Git Platform Username**: Your GitHub / Gitee login name.
   * **Access Token**: Enter the Personal Access Token generated in step 1.
   * **Chat Log Encryption Password**: **Highly Recommended!** This enables AES-256 E2E encryption. Nobody can spy on your logs. **NOTE: You MUST use the exact same password across all your syncing devices to retrieve & merge logs.**

3. **Sync**
   Click the prominent "One-Click Cloud Sync" button.
   - Run this tool before logging into and after exiting Firestorm, it will accurately pull, sort, merge and push all your conversations seamlessly across devices.`
            },
            footer: {
                version: 'Current Version',
                latest: 'Latest Update',
                checkLatest: 'Checking for updates...',
                author: 'Contact ka2s in Second Life if any questions'
            }
        }
    }
};

const i18n = createI18n({
    locale: 'zh', // default locale
    fallbackLocale: 'en',
    messages,
    legacy: false
});

export default i18n;
