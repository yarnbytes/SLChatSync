import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import git from 'isomorphic-git';
import http from 'isomorphic-git/http/node';

const timestampRegex = /^\[(\d{4})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2})(?::(\d{2}))?\]/;

function parseDate(dateStr) {
    const match = dateStr.match(/^(\d{4})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2})(?::(\d{2}))?$/);
    if (!match) return new Date(dateStr).getTime();
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const day = parseInt(match[3], 10);
    const hour = parseInt(match[4], 10);
    const minute = parseInt(match[5], 10);
    const second = match[6] ? parseInt(match[6], 10) : 0;
    return new Date(year, month, day, hour, minute, second).getTime();
}

const isChatLog = (content) => {
    if (!content) return false;
    const lines = content.split(/\r?\n/);
    const nonEmpty = lines.filter(l => l.trim().length > 0);
    for (let i = 0; i < Math.min(nonEmpty.length, 10); i++) {
        if (timestampRegex.test(nonEmpty[i])) return true;
    }
    return false;
};

export async function syncChats(config, updateProgress) {
    const { appDataPath, accountName, repoUrl, gitToken } = config;

    const sourcePath = path.join(appDataPath, `${accountName}_resident`);
    const syncRepoDir = path.join(os.homedir(), '.chatssync', accountName);

    // Make sure sourcePath exists (the SL logs)
    if (!fs.existsSync(sourcePath)) {
        throw new Error(`找不到Firestorm日志目录: ${sourcePath}`);
    }

    // Prepare Git Dir
    fs.ensureDirSync(syncRepoDir);

    updateProgress('正在初始化本地同步环境...');
    const isRepo = await git.resolveRef({ fs, dir: syncRepoDir, ref: 'HEAD' }).catch(() => null);

    const authOpts = {
        onAuth: () => ({ username: gitToken, password: '' }),
    };

    if (!isRepo) {
        updateProgress('正在从远程仓库克隆，这可能需要一些时间...');
        // empty dir check
        fs.emptyDirSync(syncRepoDir);
        await git.clone({
            fs,
            http,
            dir: syncRepoDir,
            url: repoUrl,
            ...authOpts,
            singleBranch: true,
            depth: 1
        });
    } else {
        updateProgress('正在从远程仓库拉取最新记录...');
        // try pull, ignore errors if empty repo or failing to merge (fast-forward)
        try {
            await git.pull({
                fs,
                http,
                dir: syncRepoDir,
                author: { name: 'ChatSync', email: 'sync@local' },
                ...authOpts
            });
        } catch (err) {
            console.log("Pull error:", err);
            updateProgress('拉取未找到更新，继续合并...');
        }
    }

    updateProgress('正在合并聊天记录...');

    const getTxtFiles = (dir) => fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.txt')) : [];

    const filesLocal = getTxtFiles(sourcePath);
    const filesRepo = getTxtFiles(syncRepoDir);
    const allFiles = new Set([...filesLocal, ...filesRepo]);

    let changedFilesCount = 0;

    for (const file of allFiles) {
        const pathLocal = path.join(sourcePath, file);
        const pathRepo = path.join(syncRepoDir, file);

        let contentLocal = null;
        let contentRepo = null;

        if (fs.existsSync(pathLocal)) contentLocal = fs.readFileSync(pathLocal, 'utf8');
        if (fs.existsSync(pathRepo)) contentRepo = fs.readFileSync(pathRepo, 'utf8');

        if (contentLocal === contentRepo) continue; // Same file

        const localIsChat = isChatLog(contentLocal);
        const repoIsChat = isChatLog(contentRepo);

        let mergedContent = '';

        if (localIsChat || repoIsChat) {
            // MERGE LOGIC
            const entries = [];
            const parseContent = (content) => {
                if (!content) return;
                const lines = content.split(/\r?\n/);
                let currentEntry = null;

                lines.forEach((line) => {
                    if (!line.trim()) return;
                    const match = line.match(timestampRegex);
                    if (match) {
                        if (currentEntry) entries.push(currentEntry);
                        const dateStr = `${match[1]}/${match[2]}/${match[3]} ${match[4]}:${match[5]}` + (match[6] ? `:${match[6]}` : '');
                        currentEntry = { timestamp: parseDate(dateStr), lines: [line] };
                    } else {
                        if (!currentEntry) {
                            currentEntry = { timestamp: 0, lines: [] };
                        }
                        currentEntry.lines.push(line);
                    }
                });
                if (currentEntry) entries.push(currentEntry);
            };

            parseContent(contentLocal);
            parseContent(contentRepo);

            const uniqueEntries = new Map();
            entries.forEach(e => {
                const key = e.lines.map(l => l.trimEnd()).join('\n');
                if (!uniqueEntries.has(key)) {
                    uniqueEntries.set(key, e);
                }
            });

            const sortedEntries = Array.from(uniqueEntries.values()).sort((a, b) => a.timestamp - b.timestamp);
            const EOL = '\r\n';
            mergedContent = sortedEntries.map(e => e.lines.join(EOL)).join(EOL) + EOL;

        } else {
            // COPY LOGIC (Pick latest modified or just repo prioritizing)
            let statLocal = fs.existsSync(pathLocal) ? fs.statSync(pathLocal).mtimeMs : 0;
            let statRepo = fs.existsSync(pathRepo) ? fs.statSync(pathRepo).mtimeMs : 0;
            mergedContent = statRepo > statLocal ? (contentRepo || contentLocal) : (contentLocal || contentRepo);
        }

        // write back exactly the same content to both repo and source if missing or different
        if (contentLocal !== mergedContent) fs.writeFileSync(pathLocal, mergedContent, 'utf8');
        if (contentRepo !== mergedContent) fs.writeFileSync(pathRepo, mergedContent, 'utf8');
        changedFilesCount++;
    }

    updateProgress('正在准备提交...');

    await git.add({ fs, dir: syncRepoDir, filepath: '.' });

    // Check if there are changes to commit
    const statusMatrix = await git.statusMatrix({ fs, dir: syncRepoDir });
    const hasChanges = statusMatrix.some(row => row[1] !== row[2] || row[2] !== row[3]);

    if (hasChanges) {
        updateProgress('正在写入版本历史...');
        await git.commit({
            fs,
            dir: syncRepoDir,
            message: `Sync chat logs at ${new Date().toLocaleString('zh-CN')}`,
            author: { name: 'ChatSync', email: 'sync@local' }
        });

        updateProgress('成功合并，正在推送至远程服务器...');
        await git.push({
            fs,
            http,
            dir: syncRepoDir,
            remote: 'origin',
            ref: 'master',
            ...authOpts
        }).catch(async (e) => {
            // Sometimes it is main instead of master
            await git.push({
                fs,
                http,
                dir: syncRepoDir,
                remote: 'origin',
                ref: 'main',
                ...authOpts
            });
        });

        return { changes: changedFilesCount, message: `合并 ${changedFilesCount} 个文件，并成功推送到云端。` };
    } else {
        return { changes: 0, message: "所有文件均已是最新，无需推送。" };
    }
}
