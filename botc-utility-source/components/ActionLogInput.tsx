
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Assignment, Character, NewActionLogEntryData, GamePhase, ActionLogEntry, CharacterType } from '../types';
import { 
    PlusIcon, ArrowsRightLeftIcon, XMarkIcon, UserGroupIcon, 
    SparklesIcon, BookOpenIcon, ChatBubbleOvalLeftEllipsisIcon, 
    SearchIcon, CheckCircleIcon, ClockIcon, HandRaisedIcon,
    FunnelIcon, BoltIcon, ExclamationTriangleIcon, MoonIcon, SunIcon,
    ArrowPathIcon, PencilIcon, CheckIcon
} from './Icons';

interface ActionLogInputProps {
    assignments: Assignment[];
    allCharacters: Character[];
    scriptCharacters?: Character[];
    actionLog?: ActionLogEntry[]; 
    onAddLog: (entry: NewActionLogEntryData) => void;
    onAutoStateUpdate?: (targetIds: string[], action: string, logEntry?: NewActionLogEntryData) => void;
    t: (key: string, options?: { [key: string]: any }) => string;
    // Optimization: Sync props
    setHighlights?: (playerSeats: number[]) => void;
    registerGrimoireHandler?: (handler: ((playerIndex: number) => void) | null) => void;
}

type InputMode = 'nomination' | 'custom' | 'state' | 'transform' | 'storyteller' | 'phase';

interface SelectedTarget {
    id: string;
    type: 'player' | 'character';
    label: string;
}

// --- 子組件: 階段手動輸入 ---
const PhaseLogInput: React.FC<{
    onAddLog: (entry: NewActionLogEntryData) => void;
    t: (key: string, options?: any) => string;
    onComplete?: () => void;
}> = ({ onAddLog, t, onComplete }) => {
    const [phase, setPhase] = useState<GamePhase>('Day');
    const [dayNumber, setDayNumber] = useState(1);

    const handleAdd = () => {
        onAddLog({ type: 'phase_marker', phase, dayNumber });
        if (onComplete) onComplete();
    };

    return (
        <div className="space-y-5 animate-fade-in py-2">
            <div className="bg-slate-50 dark:bg-black/20 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <label className="text-[10px] font-black text-moonlit-stone uppercase tracking-widest mb-3 block">選擇階段類型</label>
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { id: 'FirstNight', label: '首夜', icon: MoonIcon, color: 'text-blood-red' },
                        { id: 'Day', label: '白天', icon: SunIcon, color: 'text-townsfolk-blue' },
                        { id: 'Night', label: '夜晚', icon: MoonIcon, color: 'text-indigo-500' }
                    ].map(p => (
                        <button 
                            key={p.id} 
                            type="button"
                            onClick={() => setPhase(p.id as GamePhase)}
                            className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${phase === p.id ? `border-current ${p.color} bg-white dark:bg-black shadow-md scale-105` : 'border-transparent bg-white dark:bg-ravens-night text-slate-400 opacity-60 hover:opacity-100'}`}
                        >
                            <p.icon className="w-6 h-6 mb-1" />
                            <span className="text-xs font-bold">{p.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {phase !== 'FirstNight' && (
                <div className="bg-slate-50 dark:bg-black/20 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                    <label className="text-[10px] font-black text-moonlit-stone uppercase tracking-widest mb-3 block">設定天數/夜數 (Day Number)</label>
                    <div className="flex items-center justify-between gap-6 max-w-[240px] mx-auto">
                        <button 
                            type="button"
                            onClick={() => setDayNumber(Math.max(1, dayNumber - 1))} 
                            className="w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 hover:text-demon-fire active:scale-90 transition-all"
                        >
                            <XMarkIcon className="w-5 h-5 rotate-45"/>
                        </button>
                        <div className="flex flex-col items-center">
                            <span className="text-3xl font-black font-mono text-ink-text dark:text-parchment leading-none">{dayNumber}</span>
                            <span className="text-[8px] font-bold text-moonlit-stone uppercase mt-1">Number</span>
                        </div>
                        <button 
                            type="button"
                            onClick={() => setDayNumber(dayNumber + 1)} 
                            className="w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 hover:text-townsfolk-blue active:scale-90 transition-all"
                        >
                            <PlusIcon className="w-5 h-5"/>
                        </button>
                    </div>
                </div>
            )}

            <div className="pt-2">
                <button 
                    onClick={handleAdd} 
                    className="w-full py-4 bg-slate-800 dark:bg-slate-700 text-white rounded-xl font-bold shadow-lg hover:bg-slate-900 dark:hover:bg-slate-600 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                >
                    <ClockIcon className="w-5 h-5" /> 插入所選階段標記
                </button>
                <p className="text-[10px] text-moonlit-stone text-center mt-3 font-medium italic">
                    * 手動插入標記後，可點擊日誌頂部的「排列」按鈕調整時間軸位置。
                </p>
            </div>
        </div>
    );
};

// --- 子組件: 提名輸入 ---
const NominationLogInput: React.FC<{
    assignments: Assignment[];
    onAddLog: (entry: NewActionLogEntryData) => void;
    t: (key: string) => string;
    onComplete?: () => void;
    setHighlights?: (seats: number[]) => void;
    registerGrimoireHandler?: (handler: ((playerIndex: number) => void) | null) => void;
}> = ({ assignments, onAddLog, t, onComplete, setHighlights, registerGrimoireHandler }) => {
    // 使用 Seat Number (number) 作為狀態標識
    const [nominatorSeat, setNominatorSeat] = useState<number | null>(null);
    const [nomineeSeat, setNomineeSeat] = useState<number | null>(null);
    
    // 使用 Ref 存儲最新狀態，避免 useEffect 依賴導致的頻繁重註冊
    const stateRef = useRef({ nominatorSeat, nomineeSeat });

    useEffect(() => {
        stateRef.current = { nominatorSeat, nomineeSeat };
    }, [nominatorSeat, nomineeSeat]);
    
    const alivePlayers = assignments.filter(a => a.status === 'alive');

    // Sync highlights
    useEffect(() => {
        if (setHighlights) {
            const seats: number[] = [];
            if (nominatorSeat !== null) seats.push(nominatorSeat);
            if (nomineeSeat !== null) seats.push(nomineeSeat);
            setHighlights(seats);
        }
    }, [nominatorSeat, nomineeSeat, setHighlights]);

    // Register click handler for Grimoire interactions
    useEffect(() => {
        if (registerGrimoireHandler) {
            registerGrimoireHandler((playerIndex) => {
                // 從 Ref 讀取最新狀態，確保閉包中拿到的是最新的值
                const { nominatorSeat, nomineeSeat } = stateRef.current;

                if (nominatorSeat === playerIndex) {
                    setNominatorSeat(null);
                } else if (nomineeSeat === playerIndex) {
                    setNomineeSeat(null);
                } else if (nominatorSeat === null) {
                    setNominatorSeat(playerIndex);
                } else {
                    setNomineeSeat(playerIndex);
                }
            });
            // Cleanup on unmount
            return () => registerGrimoireHandler(null);
        }
    }, [registerGrimoireHandler]); // 移除 nominatorSeat, nomineeSeat 依賴

    const handleAdd = () => {
        if (nominatorSeat === null || nomineeSeat === null) return;
        
        // 查找對應的 Assignment 以獲取 Role ID 進行提交
        const nominator = assignments.find(a => a.player === nominatorSeat);
        const nominee = assignments.find(a => a.player === nomineeSeat);

        if (!nominator || !nominee) return;

        onAddLog({ 
            type: 'nomination', 
            nominatorId: nominator.role.id, 
            nomineeId: nominee.role.id, 
            voters: [] 
        });
        
        setNominatorSeat(null);
        setNomineeSeat(null);
        if (onComplete) onComplete();
    };

    return (
        <div className="flex flex-col h-full space-y-4 pb-4">
            <div className="flex-1 bg-slate-50 dark:bg-white/5 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
                <div>
                    <label className="text-[11px] font-bold text-townsfolk-blue uppercase tracking-widest mb-2 block">{t('roleAssignment.nominator')}</label>
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-32 overflow-y-auto pr-1">
                        {alivePlayers.map(a => (
                            <button 
                                key={a.player} 
                                onClick={() => setNominatorSeat(prev => prev === a.player ? null : a.player)} 
                                className={`p-1.5 rounded-lg border-2 flex flex-col items-center gap-1 transition-all ${nominatorSeat === a.player ? 'border-townsfolk-blue bg-townsfolk-blue/10' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-ravens-night opacity-70'}`}
                            >
                                <span className="text-[9px] font-mono font-bold">#{a.player}</span>
                                <span className="text-[10px] font-bold truncate w-full text-center">{a.role.name}</span>
                            </button>
                        ))}
                    </div>
                </div>
                <div className="h-px bg-slate-200 dark:bg-slate-700"></div>
                <div>
                    <label className="text-[11px] font-bold text-demon-fire uppercase tracking-widest mb-2 block">{t('roleAssignment.nominee')}</label>
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-32 overflow-y-auto pr-1">
                        {alivePlayers.map(a => (
                            <button 
                                key={a.player} 
                                onClick={() => setNomineeSeat(prev => prev === a.player ? null : a.player)} 
                                className={`p-1.5 rounded-lg border-2 flex flex-col items-center gap-1 transition-all ${nomineeSeat === a.player ? 'border-demon-fire bg-demon-fire/10' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-ravens-night opacity-70'}`}
                            >
                                <span className="text-[9px] font-mono font-bold">#{a.player}</span>
                                <span className="text-[10px] font-bold truncate w-full text-center">{a.role.name}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
            <button onClick={handleAdd} disabled={nominatorSeat === null || nomineeSeat === null} className="w-full py-3 bg-blood-red text-white rounded-xl font-bold shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"><HandRaisedIcon className="w-5 h-5" />發起提名</button>
        </div>
    );
};

// --- 子組件: 行動 (自定義) ---
const CustomLogInput: React.FC<{
    assignments: Assignment[];
    allCharacters: Character[];
    scriptCharacters: Character[];
    actionLog: ActionLogEntry[]; 
    onAddLog: (entry: NewActionLogEntryData) => void;
    onAutoStateUpdate?: (targetIds: string[], action: string, logEntry?: NewActionLogEntryData) => void;
    t: (key: string) => string;
    onComplete?: () => void;
    setHighlights?: (seats: number[]) => void;
    registerGrimoireHandler?: (handler: ((playerIndex: number) => void) | null) => void;
}> = ({ assignments, allCharacters, scriptCharacters, actionLog, onAddLog, onAutoStateUpdate, t, onComplete, setHighlights, registerGrimoireHandler }) => {
    const [actorId, setActorId] = useState('general');
    const [text, setText] = useState('');
    const [targetMode, setTargetMode] = useState<'player' | 'character'>('player');
    const [selectedTargets, setSelectedTargets] = useState<SelectedTarget[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isGeneratingSavant, setIsGeneratingSavant] = useState(false);

    // Sync highlights
    useEffect(() => {
        if (setHighlights) {
            const seats: number[] = [];
            // Actor highlight
            const actor = assignments.find(a => a.player.toString() === actorId);
            if (actor) seats.push(actor.player);
            
            // Targets highlight
            selectedTargets.forEach(tgt => {
                if (tgt.type === 'player') {
                    // Try to extract seat number from ID string if it's formatted as role ID
                    const a = assignments.find(x => x.role.id === tgt.id);
                    if (a) seats.push(a.player);
                }
            });
            setHighlights(seats);
        }
    }, [actorId, selectedTargets, setHighlights, assignments]);

    // AI 助手：為博學者生成 1 真 1 假資訊
    const handleSavantAISuggestion = async () => {
        if (!process.env.API_KEY) return alert("未設定 API Key");
        
        setIsGeneratingSavant(true);
        const playerSummary = assignments.map(a => 
            `#${a.player} ${a.role.name} (${a.alignment === 'evil' ? '邪惡' : '善良'})${a.status === 'dead' ? ' [死亡]' : ''}${a.statusMarkers.map(m => ` [${m.text}]`).join('')}`
        ).join('\n');

        const actor = assignments.find(a => a.player.toString() === actorId);
        const isImpaired = actor?.statusMarkers.some(m => ['poisoned', 'drunk'].includes(m.id));

        const prompt = `你是《染鐘樓謎團》資深說書人。現在要為角色「博學者 (Savant)」提供兩條資訊（一真一假）。
        【當前魔典實況】:
        ${playerSummary}
        【特殊標記】: 博學者本人目前${isImpaired ? '【中毒/酒醉】' : '【狀態健康】'}。
        
        任務：
        1. 提供一對簡單的資訊。
        2. 資訊 A 必須是真實的，資訊 B 必須是虛假的。
        3. 內容要簡單，例如指向陣營數量、鄰座關係 or 特定座位身份。
        4. 不要太過影響局勢（不要直接指出惡魔）。
        ${isImpaired ? '5. 注意：由於博學者中毒/酒醉，你可以隨意給出兩條虛假資訊或兩條真實資訊，但仍請按 1真1假格式提供一個有趣的誤導。' : ''}
        
        請直接輸出內容，格式如下：
        1. [資訊A內容]
        2. [資訊B內容]`;

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
            });
            if (response.text) {
                setText(response.text.trim());
            }
        } catch (e) {
            console.error(e);
            alert("AI 生成失敗");
        } finally {
            setIsGeneratingSavant(false);
        }
    };
    
    const isSavantSelected = useMemo(() => {
        const actor = assignments.find(a => a.player.toString() === actorId);
        return actor?.role.name.includes('博學者') || actor?.role.id.toLowerCase().includes('savant');
    }, [actorId, assignments]);

    const fullText = useMemo(() => {
        let content = selectedTargets.length > 0 ? `[${t('keywords.select')} ${selectedTargets.map(t => t.label).join(', ')}] ` : '';
        return content + text.trim();
    }, [selectedTargets, text, t]);

    const handleAdd = () => {
        if (!fullText.trim()) return;

        // --- Automated Logic Check ---
        const actor = assignments.find(a => a.player.toString() === actorId);
        const roleId = actor?.role.id.toLowerCase() || '';
        const roleName = actor?.role.name || '';
        let finalLogText = fullText;

        // 01. 麻臉巫婆 (Pit-Hag): Target Player + Target Character -> Change Role
        if ((roleId.includes('pit_hag') || roleName.includes('麻臉巫婆')) && selectedTargets.length >= 2) {
            const targetPlayer = selectedTargets.find(t => t.type === 'player');
            const targetCharacter = selectedTargets.find(t => t.type === 'character');
            
            if (targetPlayer && targetCharacter) {
                // Find player assignment
                const pAssignment = assignments.find(a => a.role.id === targetPlayer.id);
                if (pAssignment) {
                    onAddLog({
                        type: 'character_change',
                        playerIndex: pAssignment.player,
                        oldRoleId: pAssignment.role.id,
                        newRoleId: targetCharacter.id,
                        reason: '麻臉巫婆變身'
                    });
                    finalLogText += ` (自動執行：將 #${pAssignment.player} 變更為 ${targetCharacter.label})`;
                }
            }
        }

        // 02. 守鴉人 (Ravenkeeper): Dead + Select Player -> Reveal Role
        if ((roleId.includes('ravenkeeper') || roleName.includes('守鴉人')) && actor?.status === 'dead') {
            const targetPlayer = selectedTargets.find(t => t.type === 'player');
            if (targetPlayer) {
                const pAssignment = assignments.find(a => a.role.id === targetPlayer.id);
                if (pAssignment) {
                    finalLogText += ` -> 守鴉人得知 #${pAssignment.player} 是「${pAssignment.role.name}」`;
                }
            }
        }

        // 03. 心上人 (Sweetheart): If died -> Random Drunk
        if ((roleId.includes('sweetheart') || roleName.includes('心上人'))) {
            const lowerText = text.toLowerCase();
            if (lowerText.includes('die') || lowerText.includes('dead') || text.includes('死') || text.includes('亡')) {
                // Find other players
                const others = assignments.filter(a => a.player !== actor?.player && a.status === 'alive');
                if (others.length > 0 && onAutoStateUpdate) {
                    const randomTarget = others[Math.floor(Math.random() * others.length)];
                    onAutoStateUpdate([randomTarget.role.id], 'drunk', {
                        type: 'note', 
                        characterId: 'storyteller', 
                        text: `[系統] 心上人死亡，隨機讓 #${randomTarget.player} (${randomTarget.role.name}) 酒醉。`
                    });
                    finalLogText += ` (已觸發心上人遺言)`;
                }
            }
        }

        // 04. 舞蛇人 (Snake Charmer): Select Demon -> Swap & Poison & Alignment Change
        if ((roleId.includes('snake_charmer') || roleName.includes('舞蛇人'))) {
            const targetPlayer = selectedTargets.find(t => t.type === 'player');
            if (targetPlayer) {
                const targetAssignment = assignments.find(a => a.role.id === targetPlayer.id);
                if (targetAssignment && targetAssignment.role.characterType === 'Demon') {
                    // Trigger Swap
                    if (actor) {
                        // 1. SC becomes Demon (EVIL)
                        onAddLog({
                            type: 'character_change',
                            playerIndex: actor.player,
                            oldRoleId: actor.role.id,
                            newRoleId: targetAssignment.role.id,
                            newAlignment: 'evil', // Changed to Evil
                            reason: '舞蛇人選中惡魔'
                        });
                        // 2. Demon becomes SC (GOOD)
                        onAddLog({
                            type: 'character_change',
                            playerIndex: targetAssignment.player,
                            oldRoleId: targetAssignment.role.id,
                            newRoleId: 'snake_charmer', // assume id is standard
                            newAlignment: 'good', // Changed to Good
                            reason: '被舞蛇人選中'
                        });
                        // 3. New SC (Old Demon) gets Poisoned
                        if (onAutoStateUpdate) {
                            onAutoStateUpdate([targetAssignment.role.id], 'poisoned', {
                                type: 'note',
                                characterId: 'storyteller',
                                text: `[系統] 原惡魔 (#${targetAssignment.player}) 變為舞蛇人(善良)並中毒。`
                            });
                        }
                        finalLogText += ` (自動執行：角色互換、陣營變更與中毒)`;
                    }
                }
            }
        }

        // 05. 亡骨魔 (Fang Gu): Kill Minion -> Minion Die & Retain Ability & Neighbor Poisoned
        if ((roleId.includes('fang_gu') || roleName.includes('亡骨魔'))) {
            const targetPlayer = selectedTargets.find(t => t.type === 'player');
            const lowerText = text.toLowerCase();
            if (targetPlayer && (lowerText.includes('kill') || text.includes('殺') || text.includes('死'))) {
                const targetAssignment = assignments.find(a => a.role.id === targetPlayer.id);
                // Check if target is Minion
                if (targetAssignment && targetAssignment.role.characterType === 'Minion' && onAutoStateUpdate) {
                    // 1. Minion Dies
                    onAutoStateUpdate([targetAssignment.role.id], 'died');
                    // 2. Add custom marker "Retain Ability" (Simulated by note)
                    onAddLog({
                        type: 'note',
                        characterId: targetAssignment.role.id,
                        text: `[系統] 亡骨魔擊殺爪牙，該爪牙保留能力 (請手動標記)。`
                    });
                    
                    // 3. Find Alive Neighbor (Simple logic: next alive player)
                    const sortedAlive = assignments.filter(a => a.status === 'alive' && a.player !== targetAssignment.player).sort((a,b) => a.player - b.player);
                    if (sortedAlive.length > 0) {
                        // Find strictly closest neighbor number logic or just pick one?
                        let closest = sortedAlive[0];
                        let minDiff = 1000;
                        sortedAlive.forEach(p => {
                            let diff = Math.abs(p.player - targetAssignment.player);
                            if (diff > assignments.length / 2) diff = assignments.length - diff; // Wrap around distance
                            if (diff < minDiff) {
                                minDiff = diff;
                                closest = p;
                            }
                        });
                        
                        onAutoStateUpdate([closest.role.id], 'poisoned', {
                            type: 'note',
                            characterId: 'storyteller',
                            text: `[系統] 亡骨魔擊殺爪牙，臨近玩家 #${closest.player} (${closest.role.name}) 中毒。`
                        });
                    }
                    finalLogText += ` (自動執行：亡骨魔跳躍結算)`;
                }
            }
        }

        // Fix: Resolve actorId (which might be a seat number) to a valid Role ID for proper icon rendering in logs
        let resolvedCharacterId = actorId;
        if (actorId !== 'general' && actorId !== 'storyteller') {
            const actorAssignment = assignments.find(a => a.player.toString() === actorId);
            if (actorAssignment) {
                resolvedCharacterId = actorAssignment.role.id;
            }
        }

        onAddLog({ type: 'note', characterId: resolvedCharacterId, text: finalLogText });
        setText(''); setSelectedTargets([]);
        if(onComplete) onComplete();
    };

    const toggleTarget = (id: string, type: 'player' | 'character', label: string) => {
        setSelectedTargets(prev => prev.some(t => t.id === id && t.type === type) ? prev.filter(t => !(t.id === id && t.type === type)) : [...prev, { id, type, label }]);
    };

    const filtered = useMemo(() => {
        if (targetMode === 'player') return assignments.filter(a => a.role.name.toLowerCase().includes(searchTerm.toLowerCase()) || a.player.toString().includes(searchTerm));
        const pool = scriptCharacters.length > 0 ? scriptCharacters : allCharacters;
        return pool.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [targetMode, assignments, scriptCharacters, allCharacters, searchTerm]);

    return (
        <div className="flex flex-col h-full space-y-2 pb-4">
            <div className="flex gap-2">
                <div className="flex-1 bg-slate-50 dark:bg-white/5 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                    <label className="text-[10px] font-bold text-moonlit-stone uppercase mb-1 block">{t('actionTypes.whoActs')}</label>
                    <select value={actorId} onChange={e => { setActorId(e.target.value); setSelectedTargets([]); }} className="w-full bg-white dark:bg-midnight-ink border rounded px-1.5 py-1 text-xs">
                        <option value="general">{t('roleAssignment.generalNote')}</option>
                        <option value="storyteller">{t('keywords.storyteller')}</option>
                        {assignments.map(a => <option key={`${a.player}-${a.role.id}`} value={a.player.toString()}>{a.role.name} ({a.player})</option>)}
                    </select>
                </div>
                <div className="flex-1 bg-slate-50 dark:bg-white/5 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                    <label className="text-[10px] font-bold text-moonlit-stone uppercase mb-1 block">目標模式</label>
                    <button onClick={() => setTargetMode(targetMode === 'player' ? 'character' : 'player')} className="w-full py-1 text-xs font-bold rounded bg-townsfolk-blue text-white">{targetMode === 'player' ? '座位' : '角色'}</button>
                </div>
            </div>

            {isSavantSelected && (
                <button 
                    onClick={handleSavantAISuggestion}
                    disabled={isGeneratingSavant}
                    className="w-full flex items-center justify-center gap-2 px-3 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-bold text-xs shadow-lg hover:shadow-xl transition-all active:scale-[0.98] disabled:opacity-50"
                >
                    {isGeneratingSavant ? <ArrowPathIcon className="w-4 h-4 animate-spin"/> : <SparklesIcon className="w-4 h-4" />}
                    {isGeneratingSavant ? 'AI 分析對局中...' : '✨ 產生博學者建議 (1真1假)'}
                </button>
            )}

            <div className="flex-1 bg-slate-50 dark:bg-white/5 p-2 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col min-h-0">
                <div className="relative mb-2">
                    <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400"/>
                    <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-6 pr-2 py-1 bg-white dark:bg-midnight-ink border rounded text-[11px]" placeholder="搜尋..."/>
                </div>
                <div className="flex-1 overflow-y-auto pr-1">
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-1">
                        {targetMode === 'player' ? (filtered as Assignment[]).map(a => (
                            <button key={a.role.id} onClick={() => toggleTarget(a.role.id, 'player', `#${a.player}`)} className={`p-1 rounded border-2 text-[10px] font-bold truncate transition-all ${selectedTargets.some(t => t.id === a.role.id) ? 'border-townsfolk-blue bg-townsfolk-blue/10' : 'border-transparent bg-white dark:bg-midnight-ink'}`}>#{a.player} {a.role.name}</button>
                        )) : (filtered as Character[]).map(c => (
                            <button key={c.id} onClick={() => toggleTarget(c.id, 'character', c.name)} className={`p-1 rounded border-2 text-[10px] font-bold truncate transition-all ${selectedTargets.some(t => t.id === c.id) ? 'border-townsfolk-blue bg-townsfolk-blue/10' : 'border-transparent bg-white dark:bg-midnight-ink'}`}>{c.name}</button>
                        ))}
                    </div>
                </div>
            </div>
            <textarea value={text} onChange={e => setText(e.target.value)} placeholder={t('roleAssignment.actionPlaceholder')} className="w-full h-16 bg-white dark:bg-midnight-ink border rounded px-2 py-1.5 text-xs resize-none shadow-inner" />
            <button onClick={handleAdd} disabled={!fullText.trim()} className="w-full py-2 bg-townsfolk-blue text-white rounded font-bold text-sm shadow flex items-center justify-center gap-1.5"><PlusIcon className="w-4 h-4" /> {t('roleAssignment.saveLog')}</button>
        </div>
    );
};

// --- 子組件: 狀態變更 (死/活/中毒/酒鬼/陣營) ---
const StateLogInput: React.FC<{
    assignments: Assignment[];
    onAddLog: (entry: NewActionLogEntryData) => void;
    onAutoStateUpdate?: (targetIds: string[], action: string, logEntry?: NewActionLogEntryData) => void;
    t: (key: string) => string;
    onComplete?: () => void;
    setHighlights?: (seats: number[]) => void;
    registerGrimoireHandler?: (handler: ((playerIndex: number) => void) | null) => void;
}> = ({ assignments, onAddLog, onAutoStateUpdate, t, onComplete, setHighlights, registerGrimoireHandler }) => {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    // Optimization 1: Remove default selection to prevent accidental clicks
    const [action, setAction] = useState<'died' | 'revived' | 'poisoned' | 'drunk' | 'normal' | 'maddened' | 'set_good' | 'set_evil' | null>(null);
    const [reason, setReason] = useState('');

    // Sync highlights whenever selection changes
    useEffect(() => {
        if (setHighlights) {
            const seats = selectedIds.map(id => assignments.find(a => a.role.id === id)?.player).filter(p => p !== undefined) as number[];
            setHighlights(seats);
        }
    }, [selectedIds, setHighlights, assignments]);

    // Register Click Handler
    useEffect(() => {
        if (registerGrimoireHandler) {
            registerGrimoireHandler((playerIndex) => {
                const clickedAssignment = assignments.find(a => a.player === playerIndex);
                if (!clickedAssignment) return;
                const roleId = clickedAssignment.role.id;
                
                setSelectedIds(prev => {
                    const next = prev.includes(roleId) ? prev.filter(id => id !== roleId) : [...prev, roleId];
                    return next;
                });
            });
            return () => registerGrimoireHandler(null);
        }
    }, [registerGrimoireHandler, assignments]);

    // Optimization 2 & 3: Color Coded Buttons & Configuration
    const actionConfig = {
        died: { color: 'bg-black text-white border-black dark:bg-slate-700 dark:border-slate-600', label: '死亡 (Died)', icon: '💀' },
        revived: { color: 'bg-green-600 text-white border-green-600', label: '復活 (Revived)', icon: '❤️' },
        poisoned: { color: 'bg-green-700 text-white border-green-700', label: '中毒 (Poisoned)', icon: '🤢' },
        drunk: { color: 'bg-amber-600 text-white border-amber-600', label: '酒醉 (Drunk)', icon: '🍺' },
        maddened: { color: 'bg-purple-600 text-white border-purple-600', label: '瘋狂 (Mad)', icon: '🤪' },
        normal: { color: 'bg-slate-500 text-white border-slate-500', label: '恢復 (Normal)', icon: '✨' },
        set_good: { color: 'bg-townsfolk-blue text-white border-townsfolk-blue', label: '轉善良 (Good)', icon: '😇' },
        set_evil: { color: 'bg-demon-fire text-white border-demon-fire', label: '轉邪惡 (Evil)', icon: '😈' },
    };

    // Optimization 4: Quick Reason Chips
    const quickReasons: Record<string, string[]> = {
        died: ['處決', '惡魔擊殺', '意外', '自殺'],
        revived: ['教授', '沙巴洛斯', '骨扇'],
        poisoned: ['寡婦', '普克', '毒師', 'No-Dashii'],
        drunk: ['水手', '旅店老闆', '哲學家', '傳教士'],
        maddened: ['瑟曦', '畸形秀', '變異'],
        normal: ['酒醒', '解毒'],
        set_good: ['賞金獵人', '蛇郎中', '象牙精'],
        set_evil: ['迷魅之語', '呆瓜', '方古', '政治家'],
    };

    const handleApply = () => {
        if (selectedIds.length === 0 || !action) return;
        
        const reasonText = reason.trim();
        
        selectedIds.forEach(id => {
            const a = assignments.find(x => x.role.id === id);
            if (!a) return;
            
            let fullActionText = '';
            
            if (action === 'set_good') {
                fullActionText = `變更為【善良陣營】${reasonText ? `(${reasonText})` : ''}`;
            } else if (action === 'set_evil') {
                fullActionText = `變更為【邪惡陣營】${reasonText ? `(${reasonText})` : ''}`;
            } else {
                const baseActionText = t(`keywords.townsfolk.${action === 'poisoned' ? 'is_poisoned' : (action === 'drunk' ? 'is_drunk' : (action === 'normal' ? 'is_normal' : (action === 'maddened' ? 'is_maddened' : action)))}`) || action;
                fullActionText = reasonText ? `${baseActionText} (${reasonText})` : baseActionText;
            }

            const logText = `[狀態變更] #${a.player} ${a.role.name} ${fullActionText}`;
            onAddLog({ type: 'note', characterId: id, text: logText });
        });

        if (onAutoStateUpdate) {
            // Optimization: Only create a log entry if there is a reason text to avoid empty notes
            const logEntry = reasonText ? { type: 'note' as const, characterId: 'general', text: reasonText } : undefined;
            onAutoStateUpdate(selectedIds, action, logEntry);
        }
        
        setReason('');
        setSelectedIds([]);
        setAction(null); // Reset action after apply
        if (onComplete) onComplete();
    };

    // Optimization 5: Dynamic Submit Button Text
    const getSubmitLabel = () => {
        if (selectedIds.length === 0) return "請先選擇玩家";
        if (!action) return "請選擇狀態動作";
        const actionLabel = actionConfig[action].label.split(' ')[0];
        return `將 ${selectedIds.length} 名玩家標記為「${actionLabel}」`;
    };

    return (
        <div className="space-y-4">
            {/* Player Selection Grid */}
            <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto p-2 bg-slate-50 dark:bg-black/20 rounded-lg border border-slate-200 dark:border-slate-700">
                {assignments.map(a => {
                    const isSelected = selectedIds.includes(a.role.id);
                    return (
                        <button 
                            key={a.player} 
                            onClick={() => setSelectedIds(prev => prev.includes(a.role.id) ? prev.filter(id => id !== a.role.id) : [...prev, a.role.id])} 
                            className={`relative p-2 rounded-lg text-[10px] font-bold border-2 transition-all flex flex-col items-center gap-1 ${
                                isSelected 
                                    ? 'border-townsfolk-blue bg-townsfolk-blue/20 text-townsfolk-blue shadow-sm scale-95' 
                                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-midnight-ink opacity-80 hover:border-slate-400'
                            }`}
                        >
                            <span className="font-mono text-xs">#{a.player}</span>
                            <span className="truncate w-full text-center">{a.role.name}</span>
                            {isSelected && <div className="absolute top-0 right-0 transform translate-x-1/3 -translate-y-1/3 text-townsfolk-blue bg-white rounded-full"><CheckCircleIcon className="w-4 h-4"/></div>}
                        </button>
                    );
                })}
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(Object.keys(actionConfig) as Array<keyof typeof actionConfig>).map(act => (
                    <button 
                        key={act} 
                        onClick={() => setAction(act)} 
                        className={`py-2 px-1 text-xs font-bold rounded-md border-2 transition-all flex items-center justify-center gap-1.5 ${
                            action === act 
                                ? `${actionConfig[act].color} shadow-md scale-105` 
                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                    >
                        <span>{actionConfig[act].icon}</span>
                        <span>{actionConfig[act].label}</span>
                    </button>
                ))}
            </div>
            
            {/* Reason Input & Quick Chips */}
            <div className="space-y-2">
                <div className="relative">
                    <input 
                        type="text" 
                        value={reason} 
                        onChange={e => setReason(e.target.value)} 
                        placeholder="備註原因 (可選)..." 
                        className="w-full pl-8 pr-3 py-2 rounded-md border border-stone-border dark:border-slate-600 bg-white dark:bg-black focus:ring-amber-500 outline-none text-xs" 
                    />
                    <PencilIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                </div>
                
                {action && quickReasons[action] && (
                    <div className="flex flex-wrap gap-1.5 animate-fade-in">
                        {quickReasons[action].map(r => (
                            <button 
                                key={r} 
                                onClick={() => setReason(r)}
                                className="px-2 py-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded text-[10px] text-slate-600 dark:text-slate-300 transition-colors"
                            >
                                {r}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <button 
                onClick={handleApply} 
                disabled={selectedIds.length === 0 || !action} 
                className={`w-full py-3 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 transition-all ${
                    selectedIds.length > 0 && action 
                        ? 'bg-amber-500 text-white hover:bg-amber-600 active:scale-95' 
                        : 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed'
                }`}
            >
                <BoltIcon className="w-4 h-4" /> {getSubmitLabel()}
            </button>
        </div>
    );
};

// --- 子組件: 角色變換 (Transform) ---
const TransformLogInput: React.FC<{
    assignments: Assignment[];
    allCharacters: Character[];
    scriptCharacters: Character[];
    onAddLog: (entry: NewActionLogEntryData) => void;
    onAutoStateUpdate?: (targetIds: string[], action: string, logEntry?: NewActionLogEntryData) => void;
    t: (key: string) => string;
    onComplete?: () => void;
    setHighlights?: (seats: number[]) => void;
    registerGrimoireHandler?: (handler: ((playerIndex: number) => void) | null) => void;
}> = ({ assignments, allCharacters, scriptCharacters, onAddLog, onAutoStateUpdate, t, onComplete, setHighlights, registerGrimoireHandler }) => {
    const [selectedPlayerIndex, setSelectedPlayerIndex] = useState<number | null>(null);
    const [newRoleId, setNewRoleId] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');
    const [reason, setReason] = useState('');
    const [activeTypeTab, setActiveTypeTab] = useState<CharacterType | 'All'>('All');

    // Sync highlights
    useEffect(() => {
        if (setHighlights) {
            setHighlights(selectedPlayerIndex !== null ? [selectedPlayerIndex] : []);
        }
    }, [selectedPlayerIndex, setHighlights]);

    // Grimoire Click
    useEffect(() => {
        if (registerGrimoireHandler) {
            registerGrimoireHandler((playerIndex) => {
                setSelectedPlayerIndex(playerIndex);
            });
            return () => registerGrimoireHandler(null);
        }
    }, [registerGrimoireHandler]);

    const handleApply = () => {
        if (selectedPlayerIndex === null || !newRoleId) return;
        
        const assignment = assignments.find(a => a.player === selectedPlayerIndex);
        if (!assignment) return;

        const oldRoleId = assignment.role.id;
        
        // Add Log - GameRecordsView's handleAddLog will handle the state update automatically
        onAddLog({
            type: 'character_change',
            playerIndex: selectedPlayerIndex,
            oldRoleId: oldRoleId,
            newRoleId: newRoleId,
            reason: reason
        });

        // Add Note for clarity
        const newRoleName = allCharacters.find(c => c.id === newRoleId)?.name || 'Unknown';
        const noteText = `[變身] #${selectedPlayerIndex} 從 ${assignment.role.name} 變更為 ${newRoleName}。${reason ? `(${reason})` : ''}`;
        onAddLog({ type: 'note', characterId: 'storyteller', text: noteText });

        setSelectedPlayerIndex(null);
        setNewRoleId('');
        setReason('');
        if (onComplete) onComplete();
    };

    const filteredChars = useMemo(() => {
        const pool = scriptCharacters.length > 0 ? scriptCharacters : allCharacters;
        let filtered = pool;
        
        if (activeTypeTab !== 'All') {
            filtered = filtered.filter(c => c.characterType === activeTypeTab);
        }

        if (searchTerm.trim()) {
            filtered = filtered.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
        }
        
        // Prioritize Travelers if not filtering by specific type (optional, but good for transforms often involving travelers)
        return filtered;
    }, [scriptCharacters, allCharacters, searchTerm, activeTypeTab]);

    const characterTypes: CharacterType[] = ['Townsfolk', 'Outsider', 'Minion', 'Demon', 'Traveler'];
    const typeColors: Record<string, string> = {
        'Townsfolk': 'text-townsfolk-blue border-townsfolk-blue',
        'Outsider': 'text-celestial-gold border-celestial-gold',
        'Minion': 'text-demon-fire border-demon-fire',
        'Demon': 'text-blood-red border-blood-red',
        'Traveler': 'text-indigo-500 border-indigo-500'
    };

    return (
        <div className="flex flex-col h-full space-y-4">
            {/* 1. Target Player Selection */}
            <div className="space-y-2">
                <label className="text-[10px] font-bold text-moonlit-stone uppercase block">1. 選擇目標玩家 (點擊左側魔典或下方按鈕)</label>
                <div className="bg-slate-50 dark:bg-white/5 p-2 rounded-lg border border-slate-200 dark:border-slate-700 max-h-24 overflow-y-auto">
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-1">
                        {assignments.map(a => (
                            <button 
                                key={a.player} 
                                onClick={() => setSelectedPlayerIndex(a.player)}
                                className={`p-1 rounded text-[10px] font-bold border transition-all ${selectedPlayerIndex === a.player ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-white dark:bg-black/20 border-slate-200 dark:border-slate-700 opacity-70'}`}
                            >
                                #{a.player} {a.role.name}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* 2. New Role Selection */}
            <div className="space-y-2 flex-1 min-h-0 flex flex-col">
                <label className="text-[10px] font-bold text-moonlit-stone uppercase block">2. 選擇新角色</label>
                
                <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
                    <button 
                        onClick={() => setActiveTypeTab('All')} 
                        className={`px-3 py-1 text-[10px] font-bold rounded-full border transition-all whitespace-nowrap ${activeTypeTab === 'All' ? 'bg-slate-600 text-white border-slate-600' : 'text-slate-500 border-slate-300 dark:border-slate-600'}`}
                    >
                        全部
                    </button>
                    {characterTypes.map(type => (
                        <button 
                            key={type} 
                            onClick={() => setActiveTypeTab(type)}
                            className={`px-3 py-1 text-[10px] font-bold rounded-full border transition-all whitespace-nowrap ${activeTypeTab === type ? `bg-white dark:bg-slate-800 ${typeColors[type]} shadow-sm` : 'text-slate-400 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                        >
                            {t(`characterType.${type}`)}
                        </button>
                    ))}
                </div>

                <div className="bg-slate-50 dark:bg-white/5 p-3 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col flex-1 min-h-0">
                    <div className="relative mb-2 shrink-0">
                        <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400"/>
                        <input 
                            type="text" 
                            value={searchTerm} 
                            onChange={e => setSearchTerm(e.target.value)} 
                            placeholder="搜尋角色..." 
                            className="w-full text-xs pl-7 p-1 border rounded bg-white dark:bg-black/20 focus:ring-1 focus:ring-townsfolk-blue outline-none"
                        />
                    </div>
                    <div className="flex-1 overflow-y-auto grid grid-cols-3 sm:grid-cols-4 gap-2 content-start pr-1">
                        {filteredChars.map(c => (
                            <button 
                                key={c.id} 
                                onClick={() => setNewRoleId(c.id)}
                                className={`flex flex-col items-center p-1.5 rounded border transition-all relative ${newRoleId === c.id ? `bg-white dark:bg-slate-800 ${typeColors[c.characterType]} ring-1` : 'bg-white dark:bg-black/20 border-slate-200 dark:border-slate-700 opacity-70 hover:opacity-100'}`}
                            >
                                <span className="text-[10px] font-bold truncate w-full text-center">{c.name}</span>
                                <span className={`text-[8px] uppercase opacity-60 ${typeColors[c.characterType].split(' ')[0]}`}>{t(`characterType.${c.characterType}`).slice(0, 1)}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* 3. Reason & Submit */}
            <div className="shrink-0 space-y-2">
                <input 
                    type="text" 
                    value={reason} 
                    onChange={e => setReason(e.target.value)} 
                    placeholder="變更原因 (例如: 麻臉巫婆、方古傳遞...)" 
                    className="w-full p-2 text-xs border rounded bg-white dark:bg-black/20 focus:ring-1 focus:ring-indigo-500 outline-none"
                />

                <button 
                    onClick={handleApply} 
                    disabled={selectedPlayerIndex === null || !newRoleId} 
                    className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors"
                >
                    <ArrowsRightLeftIcon className="w-5 h-5" /> 確認變身
                </button>
            </div>
        </div>
    );
};

// --- 子組件: 說書人日誌 ---
const StorytellerLogInput: React.FC<{
    onAddLog: (entry: NewActionLogEntryData) => void;
    t: (key: string) => string;
    onComplete?: () => void;
}> = ({ onAddLog, t, onComplete }) => {
    const [text, setText] = useState('');

    const handleAdd = () => {
        if (!text.trim()) return;
        onAddLog({ type: 'note', characterId: 'storyteller', text: text.trim() });
        setText('');
        if (onComplete) onComplete();
    };

    const quickNotes = [
        "宣佈進入黃昏，禁止私聊。",
        "宣佈提名環節結束。",
        "整理夜晚行動順序。",
        "提示玩家注意遊戲規則。",
        "錯誤修正公告。"
    ];

    return (
        <div className="flex flex-col h-full space-y-4">
            <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <label className="text-[10px] font-bold text-moonlit-stone uppercase tracking-widest mb-3 block">說書人公告 / 備忘</label>
                <div className="flex flex-wrap gap-2 mb-3">
                    {quickNotes.map((note, i) => (
                        <button 
                            key={i} 
                            onClick={() => setText(note)} 
                            className="px-2 py-1 text-[10px] bg-slate-200 dark:bg-slate-700 rounded-md hover:bg-celestial-gold hover:text-white transition-colors"
                        >
                            {note}
                        </button>
                    ))}
                </div>
                <textarea 
                    value={text} 
                    onChange={e => setText(e.target.value)} 
                    placeholder="輸入公告內容..." 
                    className="w-full h-24 p-3 rounded-lg border bg-white dark:bg-black/20 text-sm focus:ring-2 focus:ring-celestial-gold outline-none resize-none"
                />
            </div>
            <button 
                onClick={handleAdd} 
                disabled={!text.trim()} 
                className="w-full py-3 bg-celestial-gold text-midnight-ink rounded-xl font-bold shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
            >
                <ChatBubbleOvalLeftEllipsisIcon className="w-5 h-5" /> 記錄公告
            </button>
        </div>
    );
};

export const ActionLogInput: React.FC<ActionLogInputProps> = (props) => {
    const { assignments, allCharacters, scriptCharacters = [], actionLog = [], onAddLog, onAutoStateUpdate, t, setHighlights, registerGrimoireHandler } = props;
    const [activeTab, setActiveTab] = useState<InputMode>('nomination');
    
    // Clear highlights when tab changes
    useEffect(() => {
        if (setHighlights) setHighlights([]);
        if (registerGrimoireHandler) registerGrimoireHandler(null);
    }, [activeTab, setHighlights, registerGrimoireHandler]);

    const tabs = useMemo(() => [
        { id: 'nomination' as const, label: t('roleAssignment.nominates'), icon: HandRaisedIcon, color: 'text-blood-red' },
        { id: 'custom' as const, label: t('actionTypes.inputModes.custom'), icon: BookOpenIcon, color: 'text-townsfolk-blue' },
        { id: 'state' as const, label: t('actionTypes.inputModes.state'), icon: SparklesIcon, color: 'text-amber-500' },
        { id: 'transform' as const, label: '角色變換', icon: ArrowsRightLeftIcon, color: 'text-indigo-400' },
        { id: 'storyteller' as const, label: t('actionTypes.inputModes.storyteller'), icon: ChatBubbleOvalLeftEllipsisIcon, color: 'text-celestial-gold' },
        { id: 'phase' as const, label: '階段管理', icon: ClockIcon, color: 'text-indigo-400' },
    ], [t]);

    const renderCurrentTab = () => {
        const common = { onComplete: () => {}, setHighlights, registerGrimoireHandler };
        switch (activeTab) {
            case 'nomination': return <NominationLogInput assignments={assignments} onAddLog={onAddLog} t={t} {...common} />;
            case 'custom': return <CustomLogInput assignments={assignments} allCharacters={allCharacters} scriptCharacters={scriptCharacters} actionLog={actionLog} onAddLog={onAddLog} onAutoStateUpdate={onAutoStateUpdate} t={t} {...common} />;
            case 'state': return <StateLogInput assignments={assignments} onAddLog={onAddLog} onAutoStateUpdate={onAutoStateUpdate} t={t} {...common} />;
            case 'transform': return <TransformLogInput assignments={assignments} allCharacters={allCharacters} scriptCharacters={scriptCharacters} onAddLog={onAddLog} onAutoStateUpdate={onAutoStateUpdate} t={t} {...common} />;
            case 'storyteller': return <StorytellerLogInput onAddLog={onAddLog} t={t} {...common} />;
            case 'phase': return <PhaseLogInput onAddLog={onAddLog} t={t} {...common} />;
            default: return null;
        }
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-midnight-ink border-slate-gray overflow-hidden">
            <div className="flex border-b bg-slate-50 dark:bg-black/20 shrink-0 overflow-x-auto scrollbar-hide">
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button 
                            key={tab.id} 
                            onClick={() => setActiveTab(tab.id)} 
                            className={`flex-1 min-w-[70px] py-2 text-[10px] font-bold border-b-2 transition-all flex flex-col items-center justify-center gap-0.5 ${activeTab === tab.id ? `bg-white dark:bg-ravens-night ${tab.color} border-current` : 'text-slate-500 border-transparent hover:bg-slate-100'}`}
                        >
                            <Icon className="w-4 h-4" />
                            <span className="whitespace-nowrap">{tab.label}</span>
                        </button>
                    );
                })}
            </div>
            <div className="flex-1 p-3 overflow-y-auto custom-scrollbar">
                {renderCurrentTab()}
            </div>
        </div>
    );
};
