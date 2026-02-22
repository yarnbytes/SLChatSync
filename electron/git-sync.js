import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import git from 'isomorphic-git';
import http from 'isomorphic-git/http/node';
import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';

function getKey(password) {
    return crypto.scryptSync(password, 'chats-sync-salt', 32);
}

function encryptLine(text, password) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, getKey(password), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
}

function decryptLine(encryptedData, password) {
    try {
        const parts = encryptedData.split(':');
        if (parts.length !== 2) return encryptedData;
        const iv = Buffer.from(parts[0], 'hex');
        const encryptedText = parts[1];
        const decipher = crypto.createDecipheriv(ALGORITHM, getKey(password), iv);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (e) {
        return encryptedData; // Fallback to raw data if decyption fails
    }
}

function decryptContent(content, password) {
    if (!content || !password) return content;
    return content.split(/\r?\n/).map(line => {
        if (line.startsWith('ENC:')) return decryptLine(line.substring(4), password);
        return line;
    }).join('\n');
}

function encryptContent(content, password) {
    if (!content || !password) return content;
    return content.split(/\r?\n/).map(line => {
        if (!line.trim() || line.startsWith('ENC:')) return line;
        return 'ENC:' + encryptLine(line, password);
    }).join('\n');
}

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
    const { appDataPath, accountName, repoUrl, gitUsername, gitToken, encryptPassword } = config;

    // Use accountName as the exact folder name
    const sourcePath = path.join(appDataPath, accountName);
    const syncRepoDir = path.join(os.homedir(), '.chatssync', accountName);

    // Make sure sourcePath exists (the SL logs)
    if (!fs.existsSync(sourcePath)) {
        throw new Error(JSON.stringify({ key: 'app.git.noLogDir', path: sourcePath }));
    }

    // Prepare Git Dir
    fs.ensureDirSync(syncRepoDir);

    updateProgress(JSON.stringify({ key: 'app.git.initEnv' }));
    const isRepo = await git.resolveRef({ fs, dir: syncRepoDir, ref: 'HEAD' }).catch(() => null);

    const authOpts = {
        onAuth: () => ({ username: gitUsername, password: gitToken }),
    };

    if (!isRepo) {
        updateProgress(JSON.stringify({ key: 'app.git.cloneWait' }));
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
        updateProgress(JSON.stringify({ key: 'app.git.pullWait' }));
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
            updateProgress(JSON.stringify({ key: 'app.git.pullNoUpdate' }));
        }
    }

    updateProgress(JSON.stringify({ key: 'app.git.merging' }));

    const getTxtFiles = (dir) => fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.txt')) : [];

    const filesLocal = getTxtFiles(sourcePath);
    const filesRepo = getTxtFiles(syncRepoDir);
    const allFiles = new Set([...filesLocal, ...filesRepo]);

    let changedFilesCount = 0;

    for (const file of allFiles) {
        if (!file.endsWith('.txt')) continue; // Skip non-txt processing if any leaked in

        const pathLocal = path.join(sourcePath, file);
        const pathRepo = path.join(syncRepoDir, file);

        let contentLocal = null;
        let contentRepo = null;

        if (fs.existsSync(pathLocal)) contentLocal = fs.readFileSync(pathLocal, 'utf8');
        if (fs.existsSync(pathRepo)) contentRepo = fs.readFileSync(pathRepo, 'utf8');

        // Decrypt repo content fully before analyzing
        let decryptedRepo = decryptContent(contentRepo, encryptPassword);

        // Optimization: skip identical
        if (contentLocal === contentRepo && !encryptPassword) continue;
        if (contentLocal === decryptedRepo && contentRepo === encryptContent(contentLocal, encryptPassword)) continue;

        const localIsChat = isChatLog(contentLocal);
        const repoIsChat = isChatLog(decryptedRepo);

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
            parseContent(decryptedRepo);

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
            mergedContent = statRepo > statLocal ? (decryptedRepo || contentLocal) : (contentLocal || decryptedRepo);
            if (mergedContent === null) mergedContent = '';
        }

        // Encrypt final output
        const finalRepoContent = encryptContent(mergedContent, encryptPassword);

        // write back exactly the same content to both repo and source if missing or different
        if (contentLocal !== mergedContent && mergedContent !== null) fs.writeFileSync(pathLocal, mergedContent, 'utf8');
        if (contentRepo !== finalRepoContent && finalRepoContent !== null) fs.writeFileSync(pathRepo, finalRepoContent, 'utf8');
        changedFilesCount++;
    }

    updateProgress(JSON.stringify({ key: 'app.git.prepCommit' }));

    for (const file of allFiles) {
        if (file.endsWith('.txt')) {
            await git.add({ fs, dir: syncRepoDir, filepath: file });
        }
    }

    // Check if there are changes to commit
    const statusMatrix = await git.statusMatrix({ fs, dir: syncRepoDir });
    const hasChanges = statusMatrix.some(row => row[1] !== row[2] || row[2] !== row[3]);

    if (hasChanges) {
        updateProgress(JSON.stringify({ key: 'app.git.writeHistory' }));
        await git.commit({
            fs,
            dir: syncRepoDir,
            message: `Sync chat logs at ${new Date().toLocaleString()}`,
            author: { name: 'ChatSync', email: 'sync@local' }
        });

        updateProgress(JSON.stringify({ key: 'app.git.pushing' }));
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

        return { changes: changedFilesCount, message: JSON.stringify({ key: 'app.git.syncSuccess', count: changedFilesCount }) };
    } else {
        return { changes: 0, message: JSON.stringify({ key: 'app.git.noChanges' }) };
    }
}
