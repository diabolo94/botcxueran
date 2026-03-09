
import React, { useState, useRef } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase, ref, set, get } from 'firebase/database';
import { Script, Character, GameRecord } from '../types';
import { ArrowDownTrayIcon, CloudArrowUpIcon, ArrowPathIcon, ArrowUpTrayIcon, CheckCircleIcon } from './Icons';
import { useLocalStorage } from '../utils';

interface SyncViewProps {
    scripts: Script[];
    setScripts: React.Dispatch<React.SetStateAction<Script[]>>;
    characters: Character[];
    setCharacters: React.Dispatch<React.SetStateAction<Character[]>>;
    gameRecords: GameRecord[];
    setGameRecords: React.Dispatch<React.SetStateAction<GameRecord[]>>;
    rules: RuleDocument[];
    setRules: React.Dispatch<React.SetStateAction<RuleDocument[]>>;
    t: (key: string, options?: any) => string;
}

export const SyncView: React.FC<SyncViewProps> = ({ 
    scripts, setScripts, characters, setCharacters, gameRecords, setGameRecords, rules, setRules, t 
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [syncKey, setSyncKey] = useLocalStorage<string>('botc_sync_key', '');
    const [fbConfig, setFbConfig] = useLocalStorage<string>('botc_fb_config', '');
    const [isSyncing, setIsSyncing] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    
    // New: Granular Sync Options
    const [syncOptions, setSyncOptions] = useState({
        scripts: true,
        characters: true,
        gameRecords: true,
        rules: true
    });

    const addLog = (msg: string) => setLogs(p => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...p].slice(0, 5));

    const getDB = () => {
        if (!fbConfig) throw new Error(t('sync.firebaseMissingConfig'));
        try {
            const config = JSON.parse(fbConfig);
            // Check if app already initialized to prevent duplicate initialization errors
            const app = getApps().length === 0 ? initializeApp(config) : getApp();
            return getDatabase(app);
        } catch (e) {
            console.error("Firebase init error:", e);
            throw new Error('Firebase 配置格式錯誤或初始化失敗。請檢查 JSON。');
        }
    };

    const handleFirebaseError = (e: any, action: string) => {
        console.error(`${action} error:`, e);
        if (e.message && e.message.includes('PERMISSION_DENIED')) {
            alert(`${action}失敗: 權限被拒絕 (PERMISSION_DENIED)。\n\n請至 Firebase Console -> Realtime Database -> Rules，將 ".write" 和 ".read" 設為 true。`);
        } else {
            alert(`${action}失敗: ${e.message}`);
        }
    };

    const handlePushToCloud = async () => {
        if (!syncKey) return alert('請先設定同步金鑰。');
        if (!syncOptions.scripts && !syncOptions.characters && !syncOptions.gameRecords && !syncOptions.rules) return alert('請至少選擇一項資料。');
        
        setIsSyncing(true);
        try {
            const db = getDB();
            
            // First get existing data to merge/preserve unchecked items if needed, 
            // but for simplicity and safety, we might assume the user wants to overwrite what they check.
            // A safer approach is to update only specific paths.
            
            const updates: Record<string, any> = {};
            updates[`sync_nodes/${syncKey}/lastUpdated`] = Date.now();
            
            if (syncOptions.scripts) {
                updates[`sync_nodes/${syncKey}/scripts`] = JSON.parse(JSON.stringify(scripts));
            }
            if (syncOptions.characters) {
                updates[`sync_nodes/${syncKey}/characters`] = JSON.parse(JSON.stringify(characters));
            }
            if (syncOptions.gameRecords) {
                updates[`sync_nodes/${syncKey}/gameRecords`] = JSON.parse(JSON.stringify(gameRecords));
            }
            if (syncOptions.rules) {
                updates[`sync_nodes/${syncKey}/rules`] = JSON.parse(JSON.stringify(rules));
            }

            // Using 'update' at the root level merges these branches without deleting others (like if we didn't check scripts)
            // However, Firebase `update` behaves differently on root. 
            // Better to fetch current state if we want to be truly safe, but update is generally okay for non-overlapping keys.
            // Wait, we are writing to `sync_nodes/KEY/scripts`, etc.
            // `update` on `sync_nodes/KEY` works perfectly.
            
            const { update } = await import('firebase/database');
            await update(ref(db, `sync_nodes/${syncKey}`), updates);

            addLog('選定的資料已推送到雲端資料庫。');
        } catch (e: any) {
            handleFirebaseError(e, '推送');
        } finally {
            setIsSyncing(false);
        }
    };

    const handlePullFromCloud = async () => {
        if (!syncKey) return alert('請先設定同步金鑰。');
        if (!syncOptions.scripts && !syncOptions.characters && !syncOptions.gameRecords && !syncOptions.rules) return alert('請至少選擇一項資料。');

        setIsSyncing(true);
        try {
            const db = getDB();
            const snapshot = await get(ref(db, `sync_nodes/${syncKey}`));
            if (snapshot.exists()) {
                const data = snapshot.val();
                let confirmMsg = '確定要拉取雲端資料嗎？\n\n將覆蓋以下本地資料：';
                if (syncOptions.scripts) confirmMsg += '\n- 劇本庫';
                if (syncOptions.characters) confirmMsg += '\n- 角色庫';
                if (syncOptions.gameRecords) confirmMsg += '\n- 對局記錄';
                if (syncOptions.rules) confirmMsg += '\n- 規則書';

                if (window.confirm(confirmMsg)) {
                    if (syncOptions.scripts && data.scripts) setScripts(data.scripts);
                    if (syncOptions.characters && data.characters) setCharacters(data.characters);
                    if (syncOptions.gameRecords && data.gameRecords) setGameRecords(data.gameRecords);
                    if (syncOptions.rules && data.rules) setRules(data.rules);
                    addLog('選定的資料已從雲端拉取並覆蓋本地。');
                }
            } else {
                alert('雲端找不到對應金鑰的資料。');
            }
        } catch (e: any) {
            handleFirebaseError(e, '拉取');
        } finally {
            setIsSyncing(false);
        }
    };

    const handleManualExport = () => {
        const data: any = { timestamp: new Date().toISOString() };
        if (syncOptions.scripts) data.scripts = scripts;
        if (syncOptions.characters) data.characters = characters;
        if (syncOptions.gameRecords) data.gameRecords = gameRecords;
        if (syncOptions.rules) data.rules = rules;

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `BOTC_Backup_${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        addLog('已匯出備份檔案。');
    };

    const handleManualImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target?.result as string);
                
                let confirmMsg = '確定要從檔案匯入嗎？\n\n將合併以下選定的資料：';
                if (syncOptions.scripts) confirmMsg += '\n- 劇本庫';
                if (syncOptions.characters) confirmMsg += '\n- 角色庫';
                if (syncOptions.gameRecords) confirmMsg += '\n- 對局記錄';
                if (syncOptions.rules) confirmMsg += '\n- 規則書';

                if (window.confirm(confirmMsg)) {
                    // Smart Merge Logic: Only add if ID doesn't exist
                    let addedCount = 0;

                    if (syncOptions.scripts && data.scripts) {
                        setScripts(prev => {
                            const newItems = data.scripts.filter((s: Script) => !prev.some(p => p.id === s.id));
                            if(newItems.length) addedCount += newItems.length;
                            return [...prev, ...newItems];
                        });
                    }
                    if (syncOptions.characters && data.characters) {
                        setCharacters(prev => {
                            const newItems = data.characters.filter((c: Character) => !prev.some(p => p.id === c.id));
                            if(newItems.length) addedCount += newItems.length;
                            return [...prev, ...newItems];
                        });
                    }
                    if (syncOptions.gameRecords && data.gameRecords) {
                        setGameRecords(prev => {
                            const newItems = data.gameRecords.filter((g: GameRecord) => !prev.some(p => p.id === g.id));
                            if(newItems.length) addedCount += newItems.length;
                            return [...prev, ...newItems];
                        });
                    }
                    if (syncOptions.rules && data.rules) {
                        setRules(prev => {
                            const newItems = data.rules.filter((r: RuleDocument) => !prev.some(p => p.id === r.id));
                            if(newItems.length) addedCount += newItems.length;
                            return [...prev, ...newItems];
                        });
                    }
                    addLog(`資料已匯入。共新增 ${addedCount} 筆資料。`);
                }
            } catch (err) {
                alert('匯入失敗，請檢查檔案格式是否正確。');
            }
        };
        reader.readAsText(file);
    };

    const toggleOption = (key: keyof typeof syncOptions) => {
        setSyncOptions(prev => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <div className="h-full overflow-y-auto custom-scrollbar p-4 md:p-8 pb-32">
            <div className="max-w-5xl mx-auto space-y-8">
                <h2 className="text-3xl font-bold font-serif text-celestial-gold">{t('sync.title')}</h2>

                {/* Option Selector */}
                <div className="bg-slate-100 dark:bg-slate-800/50 p-4 rounded-lg border border-stone-border dark:border-slate-700">
                    <label className="block text-xs font-bold text-moonlit-stone uppercase mb-3">選擇要同步/備份的資料項目</label>
                    <div className="flex flex-wrap gap-4">
                        <button 
                            onClick={() => toggleOption('scripts')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${syncOptions.scripts ? 'border-townsfolk-blue bg-townsfolk-blue/10 text-townsfolk-blue font-bold' : 'border-slate-300 dark:border-slate-600 text-slate-500'}`}
                        >
                            {syncOptions.scripts && <CheckCircleIcon className="w-5 h-5"/>} 劇本庫
                        </button>
                        <button 
                            onClick={() => toggleOption('characters')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${syncOptions.characters ? 'border-townsfolk-blue bg-townsfolk-blue/10 text-townsfolk-blue font-bold' : 'border-slate-300 dark:border-slate-600 text-slate-500'}`}
                        >
                            {syncOptions.characters && <CheckCircleIcon className="w-5 h-5"/>} 角色庫
                        </button>
                        <button 
                            onClick={() => toggleOption('gameRecords')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${syncOptions.gameRecords ? 'border-townsfolk-blue bg-townsfolk-blue/10 text-townsfolk-blue font-bold' : 'border-slate-300 dark:border-slate-600 text-slate-500'}`}
                        >
                            {syncOptions.gameRecords && <CheckCircleIcon className="w-5 h-5"/>} 對局記錄
                        </button>
                        <button 
                            onClick={() => toggleOption('rules')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${syncOptions.rules ? 'border-townsfolk-blue bg-townsfolk-blue/10 text-townsfolk-blue font-bold' : 'border-slate-300 dark:border-slate-600 text-slate-500'}`}
                        >
                            {syncOptions.rules && <CheckCircleIcon className="w-5 h-5"/>} 規則書
                        </button>
                    </div>
                </div>

                <div className="bg-parchment-white dark:bg-midnight-ink border border-stone-border dark:border-slate-gray rounded-lg p-6 shadow-md space-y-6">
                    <div className="flex items-center gap-3">
                        <CloudArrowUpIcon className="w-8 h-8 text-townsfolk-blue" />
                        <div>
                            <h3 className="text-xl font-bold text-ink-text dark:text-parchment">{t('sync.firebaseTitle')}</h3>
                            <p className="text-xs text-moonlit-stone">網路資料庫同步 (需要配置 Firebase)。</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-moonlit-stone uppercase mb-1">{t('sync.pasteConfigLabel')}</label>
                            <textarea 
                                value={fbConfig} 
                                onChange={e => setFbConfig(e.target.value)}
                                placeholder='{"apiKey": "...", "projectId": "...", "databaseURL": "..."}'
                                className="w-full h-24 bg-slate-50 dark:bg-black/40 border border-stone-border dark:border-slate-700 rounded p-3 text-xs font-mono"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-moonlit-stone uppercase mb-1">{t('sync.yourSyncKey')}</label>
                            <input 
                                type="text" 
                                value={syncKey} 
                                onChange={e => setSyncKey(e.target.value)}
                                className="w-full bg-white dark:bg-black border border-stone-border dark:border-slate-700 p-3 rounded font-mono"
                                placeholder="自定義同步金鑰..."
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button onClick={handlePushToCloud} disabled={isSyncing || !fbConfig || !syncKey} className="p-4 rounded-lg bg-indigo-600/10 border border-indigo-600 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all flex flex-col items-center disabled:opacity-30">
                            <CloudArrowUpIcon className="w-8 h-8 mb-2" />
                            <span className="font-bold">{t('sync.pushToCloud')}</span>
                        </button>
                        <button onClick={handlePullFromCloud} disabled={isSyncing || !fbConfig || !syncKey} className="p-4 rounded-lg bg-teal-600/10 border border-teal-600 text-teal-600 hover:bg-teal-600 hover:text-white transition-all flex flex-col items-center disabled:opacity-30">
                            <ArrowPathIcon className="w-8 h-8 mb-2" />
                            <span className="font-bold">{t('sync.pullFromCloud')}</span>
                        </button>
                    </div>
                </div>

                <div className="bg-parchment-white dark:bg-midnight-ink border border-stone-border dark:border-slate-gray rounded-lg p-6 shadow-md">
                    <h3 className="text-xl font-bold text-ink-text dark:text-parchment mb-4 flex items-center gap-2">
                        <ArrowDownTrayIcon className="w-6 h-6" /> {t('sync.manualBackupTitle')}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button onClick={handleManualExport} className="py-3 bg-slate-700 text-white rounded-md font-bold hover:bg-slate-600 transition-colors flex items-center justify-center gap-2">
                            <ArrowDownTrayIcon className="w-5 h-5" /> 匯出資料檔案 (.json)
                        </button>
                        <button onClick={() => fileInputRef.current?.click()} className="py-3 bg-townsfolk-blue text-white rounded-md font-bold hover:bg-blue-600 transition-colors flex items-center justify-center gap-2">
                            <ArrowUpTrayIcon className="w-5 h-5" /> 匯入資料檔案 (.json)
                        </button>
                        <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleManualImport} />
                    </div>
                </div>

                <div className="bg-black/5 dark:bg-black/30 p-4 rounded text-xs font-mono text-moonlit-stone min-h-[100px] border border-slate-800">
                    {logs.length === 0 ? '無系統日誌...' : logs.map((l, i) => <div key={i}>{l}</div>)}
                </div>
            </div>
        </div>
    );
};
