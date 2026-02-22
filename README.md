# ChatSync for Firestorm

[中文](#使用说明) | [English](#user-guide)

---

## 使用说明

ChatSync 是一个专为 Second Life 的 Firestorm 客户端设计的第三方跨设备聊天记录同步工具。它使用 Git 原理并在后台静默运行，可以让您毫无察觉地享受多电脑聊天记录同步。

### 🚀 快速开始

1. **准备一个 Git 仓库**
   - 登录 [Gitee](https://gitee.com) (国内推荐) 或 Github。
   - 创建一个名为 `sl_chats`（或任意名称）的“私有 Git 仓库”。
   - 在个人设置中生成一个 **访问令牌 (Personal Access Token)**，并赋予写入权限。或者如果您使用账号密码，请准备好密码。

2. **配置软件**
   打开软件后，依次填写各项配置：
   * **Firestorm 数据路径**: 默认会自动获取。如果您更改了默认位置或者使用绿色版，请手动填写。
   * **选择记录文件夹**: 在下拉列表中选中您的账号对应文件夹（通常为 `您的账号_resident`）。
   * **Git 仓库地址**: 填写您刚才建立的仓库的完整链接，例如 `https://gitee.com/您的用户名/sl_chats.git`。
   * **Git 平台用户名**: 您在 Gitee 或 Github 上的登录名。
   * **访问令牌 Token 或 密码**: 如果支持Token建议填写Token，否则填写账号的登录密码。
   * **聊天记录加密密码 (可选)**: 强烈建议填写！这是您的**端到端加密密码**。设置后，上传到云端的聊天记录将会变成乱码，即便 Gitee 遭到攻击或仓库泄露，没有任何人（包括作者）能够偷窥您的隐私。**注意：如果你启用了加密，在你的所有互相联机的电脑上，都必须填写一模一样的加密密码。**

3. **一键同步**
   配置完成后，点击底部的“一键云端同步”。
   * **如果您是初次使用**：软件会自动为您搭建系统并将现有的记录上传加密备份。
   * **日常使用**每次打开或关闭电脑前点一下，它会自动将云端的新记录合并到本地，并将本地的新记录上传。

---

## User Guide

ChatSync is a third-party, cross-device chat log synchronization tool tailored specifically for the Firestorm viewer (Second Life). 

### 🚀 Quick Start

1. **Setup Remote Repository**
   - Create a Private Repository on GitHub or Gitee.
   - Generate a **Personal Access Token** with repository write access in your account settings.

2. **Configuration**
   Open the application and fill in the configuration fields:
   * **Firestorm Data Path**: Auto-detected by default. Fill in manually if you are using a portable version or custom path.
   * **Select Log Folder**: Select your avatar's sub-folder from the dropdown list (usually ends with `_resident`).
   * **Git Repository URL**: Your remote git clone URL.
   * **Git Platform Username**: Your GitHub / Gitee login name.
   * **Access Token**: Enter the Personal Access Token generated in step 1.
   * **Chat Log Encryption Password (Optional)**: **Highly Recommended!** This enables AES-256 E2E encryption. Once set, your chat logs will be 100% encrypted gibberish on the cloud. Nobody can spy on your logs. **NOTE: You MUST use the exact same password across all your syncing devices to retrieve & merge logs.**

3. **Sync**
   Click the prominent "One-Click Cloud Sync" button.
   - Run this tool before logging into and after exiting Firestorm, it will accurately pull, sort, merge and push all your conversations seamlessly across devices.
