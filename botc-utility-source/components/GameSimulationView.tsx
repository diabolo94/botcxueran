
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { GoogleGenAI } from "@google/genai";
import { GameRecord, Assignment, Character, Script, SimulationSession, NightOrderItem, StatusMarker, SimulationLogEntry } from '../types';
import { 
  BoltIcon, ArrowPathIcon, CheckCircleIcon, PlayIcon, 
  ChatBubbleOvalLeftEllipsisIcon, MoonIcon, SunIcon, 
  UserGroupIcon, TrophyIcon, XMarkIcon, PencilIcon,
  PlusIcon, ArrowUturnLeftIcon, BookmarkIcon,
  TrashIcon, SparklesIcon, ChatBubbleOvalLeftIcon, ArrowRightIcon,
  ListBulletIcon, CheckIcon, ArrowsRightLeftIcon
} from './Icons';
import { useLocalStorage } from '../utils';

interface GameSimulationViewProps {
  allCharacters: Character[];
  gameRecords: GameRecord[];
  scripts: Script[];
  t: (key: string, options?: any) => string;
}

type SimulationStep = 'setup' | 'first-night' | 'day-whisper' | 'day-public' | 'day-nomination' | 'night-actions' | 'game-over';

/**
 * 內部組件：格式化日誌文本
 * 自動處理座位號高亮、角色加粗、以及移除不友好的 Markdown 符號
 */
const FormattedLog: React.FC<{ text: string }> = ({ text }) => {
    const cleanText = text.replace(/\*\*/g, '');
    const lines = cleanText.split('\n');

    return (
        <div className="space-y-1 text-sm leading-relaxed font-medium">
            {lines.map((line, idx) => {
                if (line.startsWith('[') && line.includes(']')) {
                    // 系統/階段標記
                    return (
                        <div key={idx} className="flex items-center gap-2 mt-4 mb-2">
                            <span className="h-px flex-1 bg-celestial-gold/30"></span>
                            <span className="font-bold text-celestial-gold text-xs uppercase tracking-widest bg-celestial-gold/10 px-2 py-1 rounded">{line}</span>
                            <span className="h-px flex-1 bg-celestial-gold/30"></span>
                        </div>
                    );
                }

                // 一般對話/敘述拆解
                const parts = line.split(/(#\d+|「[^」]+」|中毒|酒鬼|瘋狂|死亡|處決|獲勝|復活|提名|辯護|結果|判定)/g);

                return (
                    <div key={idx} className={`text-ink-text dark:text-parchment/90 ${line.startsWith('提名：') || line.startsWith('辯護：') ? 'pl-2 border-l-2 border-slate-300 dark:border-slate-700' : ''}`}>
                        {parts.map((part, pIdx) => {
                            if (part.match(/^#\d+$/)) {
                                return <span key={pIdx} className="inline-block px-1.5 py-0.5 mx-0.5 bg-slate-200 dark:bg-slate-700 text-townsfolk-blue font-mono font-bold rounded text-xs shadow-sm">{part}</span>;
                            }
                            if (part.startsWith('「') && part.endsWith('」')) {
                                return <span key={pIdx} className="text-celestial-gold font-bold mx-0.5">{part}</span>;
                            }
                            if (['中毒', '酒鬼', '瘋狂', '死亡', '處決'].includes(part)) {
                                return <span key={pIdx} className="text-demon-fire font-bold underline decoration-2 underline-offset-2 mx-0.5">{part}</span>;
                            }
                            if (['提名', '辯護', '結果', '判定'].includes(part)) {
                                return <span key={pIdx} className="text-townsfolk-blue font-bold mx-0.5">{part}</span>;
                            }
                            if (part === '獲勝' || part === '復活') {
                                return <span key={pIdx} className="text-green-500 font-bold mx-0.5">{part}</span>;
                            }
                            return <span key={pIdx}>{part}</span>;
                        })}
                    </div>
                );
            })}
        </div>
    );
};

export const GameSimulationView: React.FC<GameSimulationViewProps> = ({ 
  allCharacters, gameRecords, scripts, t 
}) => {
  const [selectedRecordId, setSelectedRecordId] = useState<string>('');
  const [sessions, setSessions] = useLocalStorage<SimulationSession[]>('botc_sim_sessions', []);
  
  // Simulation State
  const [simRecord, setSimRecord] = useState<GameRecord | null>(null);
  const [currentStep, setCurrentStep] = useState<SimulationStep>('setup');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Refactored to Object Array
  const [narrative, setNarrative] = useState<SimulationLogEntry[]>([]);
  
  const [nomsThisDay, setNomsThisDay] = useState<{nominator: number, nominee: number, votes: number}[]>([]);
  const [dayCounter, setDayCounter] = useState(0);
  
  // UI Interaction States
  const [customPrompt, setCustomPrompt] = useState('');
  const [showConsole, setShowConsole] = useState(false);
  const [selectedWhisperPlayers, setSelectedWhisperPlayers] = useState<number[]>([]);

  // Log Management States
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedLogIds, setSelectedLogIds] = useState<Set<string>>(new Set());
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  // Ref for auto-scrolling
  const logContainerRef = useRef<HTMLDivElement>(null);

  const selectedRecord = useMemo(() => gameRecords.find(r => r.id === selectedRecordId), [gameRecords, selectedRecordId]);
  const currentScript = useMemo(() => simRecord ? scripts.find(s => s.name === simRecord.scriptName) : null, [simRecord, scripts]);
  
  // Optimize: Pre-calculate script role names for AI context
  const scriptRoleNames = useMemo(() => {
    if (!currentScript) return "";
    return currentScript.characterIds
        .map(id => allCharacters.find(c => c.id === id)?.name)
        .filter(Boolean)
        .join('、');
  }, [currentScript, allCharacters]);

  // Memoize alivePlayers for safety and scoping
  const alivePlayers = useMemo(() => simRecord?.assignments.filter(a => a.status === 'alive') || [], [simRecord]);
  
  // 自動滾動邏輯 - 僅在新增日誌時滾動
  useEffect(() => {
    if (logContainerRef.current && !selectionMode && !editingLogId) {
        logContainerRef.current.scrollTo({
            top: logContainerRef.current.scrollHeight,
            behavior: 'smooth'
        });
    }
  }, [narrative.length, isProcessing]);

  // 找出今日票數最高且達標的人（潛在處決對象）
  const pendingExecution = useMemo(() => {
    if (nomsThisDay.length === 0) return null;
    const threshold = Math.ceil(alivePlayers.length / 2);
    const validNoms = nomsThisDay.filter(n => n.votes >= threshold);
    if (validNoms.length === 0) return null;
    // 取得票數最高的那位（BOTC 規則：若票數相同，通常無人處決或由說書人裁定，此處簡化為最高票者）
    return [...validNoms].sort((a, b) => b.votes - a.votes)[0];
  }, [nomsThisDay, alivePlayers]);

  // --- Helpers ---
  const addNarrative = (msg: string) => {
      setNarrative(prev => [...prev, { id: uuidv4(), text: msg, timestamp: Date.now() }]);
  };

  const replaceLastNarrative = (msg: string, tag: string) => {
    setNarrative(prev => {
        if (prev.length === 0) return [{ id: uuidv4(), text: msg, timestamp: Date.now() }];
        
        const last = prev[prev.length - 1];
        if (last.text.includes(tag)) {
            // Replace text but keep ID if possible or generate new
            return [...prev.slice(0, -1), { ...last, text: msg }];
        }
        return [...prev, { id: uuidv4(), text: msg, timestamp: Date.now() }];
    });
  };

  // --- Log Management Functions ---
  const handleEditLog = (id: string, currentText: string) => {
      setEditingLogId(id);
      setEditingText(currentText);
  };

  const handleSaveEdit = () => {
      if (editingLogId) {
          setNarrative(prev => prev.map(log => log.id === editingLogId ? { ...log, text: editingText } : log));
          setEditingLogId(null);
          setEditingText('');
      }
  };

  const handleCancelEdit = () => {
      setEditingLogId(null);
      setEditingText('');
  };

  const handleDeleteLog = (id: string) => {
      if (window.confirm('確定刪除此條日誌？')) {
          setNarrative(prev => prev.filter(log => log.id !== id));
      }
  };

  const toggleLogSelection = (id: string) => {
      setSelectedLogIds(prev => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
      });
  };

  const handleBulkDelete = () => {
      if (selectedLogIds.size === 0) return;
      if (window.confirm(`確定刪除選中的 ${selectedLogIds.size} 條日誌？`)) {
          setNarrative(prev => prev.filter(log => !selectedLogIds.has(log.id)));
          setSelectedLogIds(new Set());
          setSelectionMode(false);
      }
  };

  const handleSelectAll = () => {
      setSelectedLogIds(new Set(narrative.map(l => l.id)));
  };

  // ---

  const getInPlayNightOrder = (isFirstNight: boolean) => {
    if (!currentScript || !simRecord) return [];
    const order = isFirstNight ? currentScript.firstNightOrder : currentScript.otherNightsOrder;
    if (!order) return [];

    const inPlayRoleIds = new Set(simRecord.assignments.map(a => a.role.id));
    if (simRecord.specialRoleIds) {
        simRecord.specialRoleIds.forEach(id => inPlayRoleIds.add(id));
    }
    
    return order.filter(item => {
        const isPredefined = item.characterId.startsWith('predefined:');
        return isPredefined || inPlayRoleIds.has(item.characterId);
    });
  };

  const getPlayerStateSummary = (assignments: Assignment[]) => {
    return assignments.map(a => {
        const markers = a.statusMarkers.map(m => `${m.text}`).join('、');
        return `#${a.player} (${a.role.name}) - 陣營: ${a.alignment === 'evil' ? '邪惡' : '善良'} | 狀態: ${t(`playerStatus.${a.status}`)}${markers ? ` [狀態標記: ${markers}]` : ''}`;
    }).join('\n');
  };

  // --- AI Narrator Call ---
  const callAINarrative = async (basePrompt: string) => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const formatInstruction = "\n\n【重要格式要求】: 請直接輸出純文本日誌，禁止使用任何 Markdown 符號（如 ** 或 ###）。提及玩家時請嚴格使用 '#座位號' 格式。提及角色能力時請使用「」括起來。";
      
      const finalPrompt = customPrompt.trim() 
        ? `${basePrompt}${formatInstruction}\n\n【說書人的特別指令】: ${customPrompt}`
        : `${basePrompt}${formatInstruction}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: finalPrompt,
      });
      return response.text || '';
    } catch (e) {
      console.error(e);
      return "AI 敘事生成失敗。";
    }
  };

  // --- Simulation Actions ---

  const handleStartSimulation = () => {
    if (!selectedRecord) return;
    setSimRecord(selectedRecord);
    setCurrentStep('setup');
    setNarrative([{ id: uuidv4(), text: `[初始化] 開始模擬劇本：${selectedRecord.scriptName}`, timestamp: Date.now() }]);
    setDayCounter(0);
    setNomsThisDay([]);
  };

  const handleSaveSession = () => {
    if (!simRecord) return;
    const newSession: SimulationSession = {
      id: uuidv4(),
      lastActive: new Date().toISOString(),
      gameRecord: simRecord,
      narrative: narrative,
      currentStep: currentStep,
      dayCounter: dayCounter,
      nomsThisDay: nomsThisDay
    };
    setSessions(prev => [newSession, ...prev]);
    alert("模擬進度已保存！");
  };

  const loadSession = (session: SimulationSession) => {
    setSimRecord(session.gameRecord);
    
    // Migration logic for old string-only logs
    const migratedNarrative: SimulationLogEntry[] = session.narrative.map(item => {
        if (typeof item === 'string') {
            return { id: uuidv4(), text: item, timestamp: Date.now() };
        }
        return item;
    });

    setNarrative(migratedNarrative);
    setCurrentStep(session.currentStep as SimulationStep);
    setDayCounter(session.dayCounter);
    setNomsThisDay(session.nomsThisDay.map(n => ({ ...n, votes: n.votes || 0 })));
  };

  const deleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('確定刪除此保存的模擬嗎？')) {
      setSessions(prev => prev.filter(s => s.id !== id));
    }
  };

  const handleSetup = async () => {
    if (!simRecord || !currentScript) return;
    setIsProcessing(true);
    const newRecord = { ...simRecord };
    let setupLogs: string[] = [];

    const inPlayIds = new Set(newRecord.assignments.map(a => a.role.id));
    const scriptCharacters = currentScript.characterIds
      .map(id => allCharacters.find(c => c.id === id))
      .filter(c => c && (c.characterType === 'Townsfolk' || c.characterType === 'Outsider')) as Character[];
    
    const availableBluffs = scriptCharacters.filter(c => 
      !inPlayIds.has(c.id) && 
      !['drunk', '酒鬼'].includes(c.name.toLowerCase())
    );

    const finalBluffPool = availableBluffs.length >= 3 
      ? availableBluffs 
      : scriptCharacters.filter(c => !inPlayIds.has(c.id));

    const shuffledBluffs = [...finalBluffPool].sort(() => 0.5 - Math.random());
    const bluffs = shuffledBluffs.slice(0, 3);
    newRecord.bluffRoleIds = bluffs.map(c => c.id);
    
    setupLogs.push(`惡魔偽裝已就緒：${bluffs.map(c => c.name).join('、')}`);

    newRecord.assignments.forEach(a => {
        if (a.pretendRole) {
            setupLogs.push(`特殊身份偵測：#${a.player} (${a.role.name}) 正在偽裝成「${a.pretendRole.name}」`);
        }
    });

    const reportText = `[對局處理]\n${setupLogs.join('\n')}\n\n系統已完成配置。邪惡陣營已知曉偽裝。請點擊「執行首夜行動」。`;
    
    replaceLastNarrative(reportText, '[對局處理]');
    setSimRecord(newRecord);
    setCurrentStep('first-night');
    setIsProcessing(false);
  };

  const handleFirstNight = async (isRegeneration = false) => {
    if (!simRecord || !currentScript) return;
    setIsProcessing(true);
    
    const nightOrder = getInPlayNightOrder(true);
    const orderString = nightOrder.map((it, idx) => `${idx + 1}. ${it.customText}`).join(' -> ');
    const playerList = getPlayerStateSummary(simRecord.assignments);

    // Optimized Prompt with script roles constraint
    const prompt = `你是《染鐘樓謎團》的說書人。這是首夜行動模擬。
    劇本：《${currentScript.name}》
    【本局劇本包含的所有角色 (Script Roles)】:
    ${scriptRoleNames}
    
    【當前玩家狀態與標記】:
    ${playerList}
    【物理行動順序】:
    ${orderString}
    
    任務：
    1. 按照順序生成日誌。
    2. **重要**: 如果玩家有「中毒」或「酒鬼」標記，請在日誌中描述其獲得了錯誤資訊或技能失效。
    3. **角色選擇約束**: 當角色技能涉及「得知/選擇某個角色」時（如洗腦師、寡婦等），**必須優先從【本局劇本包含的所有角色】中選擇**。
    4. 語氣簡短、充滿神祕感。`;
    
    const aiText = await callAINarrative(prompt);
    const logHeader = `[首夜行動日誌]`;
    const fullLog = `${logHeader}\n${aiText}`;

    if (isRegeneration) {
        replaceLastNarrative(fullLog, logHeader);
    } else {
        addNarrative(fullLog);
        setCurrentStep('day-whisper');
        setDayCounter(1);
    }
    setIsProcessing(false);
  };

  // ... handleWhisperChat, handleEndWhispers, handlePublicChat, handleFinishDayChat, handleNominationStep, handleConfirmExecution ...
  const handleWhisperChat = async (isAISelection: boolean, mode: 'new' | 'continue' | 'retry' = 'new') => {
    if (!simRecord) return;
    setIsProcessing(true);
    const playerList = getPlayerStateSummary(simRecord.assignments);
    
    // Use last log text
    const lastNarrativeLog = narrative[narrative.length - 1];
    const lastNarrativeText = lastNarrativeLog ? lastNarrativeLog.text : "";
    
    const isContinue = mode === 'continue';
    
    let targetContext = "";
    if (isContinue) {
        targetContext = `請延續上一段對話的情境與氛圍，深入討論細節。`;
    } else if (!isAISelection && selectedWhisperPlayers.length >= 2) {
        targetContext = `請生成玩家 #${selectedWhisperPlayers.join(' 和 #')} 之間的私聊。`;
    } else {
        targetContext = "請 AI 模擬 1-2 組私聊。考慮角色狀態（如被發瘋的人、中毒的人）。";
    }

    const prompt = `現在是第 ${dayCounter} 天白天【私聊階段】。
    玩家狀態：
    ${playerList}
    ${isContinue ? `延續背景：${lastNarrativeText}` : ''}
    ${targetContext}`;

    const aiText = await callAINarrative(prompt);
    
    setNarrative(prev => {
        if (mode === 'continue' && prev.length > 0) {
            const last = prev[prev.length - 1];
            return [...prev.slice(0, -1), { ...last, text: last.text + "\n\n" + aiText }];
        } else if (mode === 'retry' && prev.length > 0) {
            const last = prev[prev.length - 1];
            return [...prev.slice(0, -1), { ...last, text: aiText }];
        } else {
            return [...prev, { id: uuidv4(), text: aiText, timestamp: Date.now() }];
        }
    });
    
    setSelectedWhisperPlayers([]);
    setIsProcessing(false);
  };

  const handleEndWhispers = async () => {
    setCurrentStep('day-public');
    addNarrative(`[公聊階段]`);
    await handlePublicChat();
  };

  const handlePublicChat = async (isContinue: boolean = false) => {
    if (!simRecord) return;
    setIsProcessing(true);
    const playerList = getPlayerStateSummary(simRecord.assignments);
    
    // Get last 2 logs text for context
    const lastContext = narrative.slice(-2).map(n => n.text).join("\n"); 
    
    const prompt = `現在是第 ${dayCounter} 天白天【全場公聊階段】。
    玩家狀態：
    ${playerList}
    對話背景：
    ${lastContext}
    任務：模擬全場討論。重點放在懷疑對象與資訊交換。`;

    const aiText = await callAINarrative(prompt);
    
    if (isContinue) {
        setNarrative(prev => {
            if (prev.length === 0) return prev;
            const last = prev[prev.length - 1];
            return [...prev.slice(0, -1), { ...last, text: last.text + "\n" + aiText }];
        });
    } else {
        addNarrative(aiText);
    }
    
    setCurrentStep('day-public');
    setIsProcessing(false);
  };

  const handleFinishDayChat = () => {
    setNomsThisDay([]);
    setCurrentStep('day-nomination');
    addNarrative(`[提名與處決環節]`);
  };

  const handleNominationStep = async () => {
    if (!simRecord) return;
    
    try {
        setIsProcessing(true);
        
        const freshAlive = simRecord.assignments.filter(a => a.status === 'alive');
        const freshDeadWithVotes = simRecord.assignments.filter(a => a.status === 'dead' && a.statusMarkers.some(m => m.id === 'ghostVote'));
        const totalPotentialVotes = freshAlive.length + freshDeadWithVotes.length;

        const availableNominators = freshAlive.filter(p => !nomsThisDay.some(n => n.nominator === p.player));
        const availableNominees = freshAlive.filter(p => !nomsThisDay.some(n => n.nominee === p.player));

        if (availableNominators.length === 0 || availableNominees.length === 0) {
            addNarrative(`[提名結束] 已無可用的提名組合。`);
            setIsProcessing(false);
            return;
        }

        const nominator = availableNominators[Math.floor(Math.random() * availableNominators.length)];
        let nominee = availableNominees[Math.floor(Math.random() * availableNominees.length)];
        if (nominator.player === nominee.player && availableNominees.length > 1) {
            nominee = availableNominees.find(p => p.player !== nominator.player) || nominee;
        }

        const playerList = getPlayerStateSummary(simRecord.assignments);
        const lastChat = narrative.slice(-2).map(n => n.text).join("\n");

        const prompt = `現在是第 ${dayCounter} 天提名環節。
        【當前對局狀態】:
        ${playerList}
        【剛才的對話背景】:
        ${lastChat}
        
        任務：
        1. **提名理由**: 玩家 #${nominator.player} (${nominator.role.name}) 提名 #${nominee.player} (${nominee.role.name})。請根據其陣營與狀態給出充滿邏輯或攻擊性的理由。
        2. **辯護發言**: #${nominee.player} 給出反擊或自救辯護（如：跳身份、指責對方中毒、轉移視線）。
        3. **投票結果**: 模擬投票。全場總票權為 ${totalPotentialVotes}。
        4. **後續意願**: 判斷是否有其他玩家還想發起新的提名？
        
        格式：
        提名：#${nominator.player} 表示...
        辯護：#${nominee.player} 回應...
        結果：投出了 X 票。
        判定：[繼續提名/提名結束]`;

        const aiText = await callAINarrative(prompt);
        addNarrative(aiText);

        const voteMatch = aiText.match(/投出了\s*(\d+)\s*票/);
        const voteCount = voteMatch ? parseInt(voteMatch[1]) : 0;
        
        setNomsThisDay(prev => [...prev, { nominator: nominator.player, nominee: nominee.player, votes: voteCount }]);

        const threshold = Math.ceil(freshAlive.length / 2);
        if (voteCount >= threshold) {
            addNarrative(`結果判定：#${nominee.player} 目前獲得最高票 (${voteCount} 票)，且達標 (${threshold})。`);
        } else {
            addNarrative(`結果判定：票數未達門檻 (${voteCount}/${threshold})。`);
        }

    } catch (error) {
        console.error("Nomination Error:", error);
    } finally {
        setIsProcessing(false);
    }
  };

  const handleConfirmExecution = async () => {
    if (!simRecord) return;
    setIsProcessing(true);

    let updatedAssignments = [...simRecord.assignments];
    let executionLog = "[無人處決]";

    if (pendingExecution) {
        const targetPlayer = pendingExecution.nominee;
        executionLog = `說書人宣佈處決 #${targetPlayer}。`;
        
        updatedAssignments = updatedAssignments.map(a => {
            if (a.player === targetPlayer) {
                return { 
                    ...a, 
                    status: 'dead' as const, 
                    statusMarkers: [...a.statusMarkers.filter(m => m.id !== 'ghostVote'), { 
                        id: 'ghostVote', text: '死人票', icon: '👻', color: 'text-indigo-600 border-indigo-600 bg-indigo-50' 
                    }] 
                };
            }
            return a;
        });
    }

    addNarrative(`[處決結果]\n${executionLog}\n\n天色漸暗，所有人回到房間...`);
    
    const nextRecord = { ...simRecord, assignments: updatedAssignments };
    setSimRecord(nextRecord);
    
    setTimeout(() => {
        handleNightActions(false, nextRecord);
    }, 1500);
  };

  const handleNightActions = async (isRegeneration = false, overrideRecord?: GameRecord) => {
    const activeRecord = overrideRecord || simRecord;
    if (!activeRecord || !currentScript) return;
    
    setIsProcessing(true);
    const alive = activeRecord.assignments.filter(a => a.status === 'alive');
    
    const demonAlive = alive.some(a => a.role.characterType === 'Demon');
    if (!demonAlive) {
      setCurrentStep('game-over');
      setSimRecord({...activeRecord, winningTeam: 'good'});
      addNarrative(`[結局] 惡魔已死亡，善良陣營獲勝！`);
      setIsProcessing(false);
      return;
    }
    if (alive.length <= 2) {
      setCurrentStep('game-over');
      setSimRecord({...activeRecord, winningTeam: 'evil'});
      addNarrative(`[結局] 邪惡陣營獲勝（僅剩 2 人）！`);
      setIsProcessing(false);
      return;
    }

    const nightOrder = getInPlayNightOrder(false);
    const orderString = nightOrder.map((it, idx) => `${idx + 1}. ${it.customText}`).join(' -> ');
    const playerList = getPlayerStateSummary(activeRecord.assignments);

    // Optimized Prompt with script roles constraint
    const prompt = `現在是第 ${dayCounter} 夜行動模擬。
    劇本：《${currentScript.name}》
    【本局劇本包含的所有角色 (Script Roles)】:
    ${scriptRoleNames}
    
    【玩家清單與狀態標記】:
    ${playerList}
    【夜晚行動順序鏈】:
    ${orderString}
    任務：
    1. **角色標記感應**: 檢查哪些玩家有「中毒」或「酒鬼」標記。
    2. 在描述受影響的角色（如預言家、共情者、惡魔）時，必須提及他們因為狀態導致資訊出錯或擊殺失效。
    3. **角色選擇邏輯**: 若角色行動需要選擇一個「角色」（例如麻臉巫婆變身、舞蛇人選目標），**必須從【本局劇本包含的所有角色】中選擇**，除非技能描述明確允許選劇本外角色。
    4. 必須包含惡魔的擊殺選擇過程與心理。
    5. 生成專業、富有敘事感的行動日誌。`;

    const aiText = await callAINarrative(prompt);
    const logHeader = `[第 ${dayCounter} 夜行動日誌]`;
    const fullLog = `${logHeader}\n${aiText}`;

    if (isRegeneration) {
        replaceLastNarrative(fullLog, `夜行動日誌]`); 
    } else {
        addNarrative(fullLog);
        
        const victim = alive.filter(a => a.role.characterType !== 'Demon')[Math.floor(Math.random() * (alive.length - 1))];
        if (victim) {
            const finalUpdated = activeRecord.assignments.map(a => 
                a.player === victim.player 
                ? { ...a, status: 'dead' as const, statusMarkers: [...a.statusMarkers, { id: 'ghostVote', text: '死人票', icon: '👻', color: 'text-indigo-600 border-indigo-600 bg-indigo-50' }] } 
                : a
            );
            setSimRecord({ ...activeRecord, assignments: finalUpdated });
            addNarrative(`[天亮] #${victim.player} (${victim.role.name}) 昨晚慘遭殺害。`);
        }

        setDayCounter(prev => prev + 1);
        setCurrentStep('day-whisper');
    }
    setIsProcessing(false);
  };

  // ... Render ...
  const toggleWhisperParticipant = (num: number) => {
    setSelectedWhisperPlayers(prev => prev.includes(num) ? prev.filter(x => x !== num) : [...prev, num]);
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto h-full flex flex-col space-y-4 overflow-hidden">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
            <BoltIcon className="w-10 h-10 text-celestial-gold" />
            <div>
            <h2 className="text-3xl font-bold font-serif text-celestial-gold">{t('simulation.title')}</h2>
            <p className="text-sm text-moonlit-stone">AI 驅動的動態對局模擬測試環境。</p>
            </div>
        </div>
        {simRecord && (
            <div className="flex gap-2">
                <button onClick={handleSaveSession} className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-parchment rounded-md hover:bg-slate-600 transition-all text-sm font-bold shadow-sm">
                    <BookmarkIcon className="w-4 h-4"/> 保存進度
                </button>
                <button onClick={() => { if(window.confirm('確定退出並重置模擬嗎？')) setSimRecord(null); }} className="flex items-center gap-2 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-moonlit-stone rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-colors text-sm font-bold shadow-sm">
                    <XMarkIcon className="w-4 h-4"/> 退出模擬
                </button>
            </div>
        )}
      </div>

      {!simRecord ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1 overflow-y-auto min-h-0">
            <div className="bg-parchment-white dark:bg-midnight-ink border border-stone-border dark:border-slate-gray rounded-xl p-8 text-center shadow-lg h-fit">
                <h4 className="block text-lg font-bold mb-4">啟動全新模擬</h4>
                <select value={selectedRecordId} onChange={e => setSelectedRecordId(e.target.value)} className="w-full p-3 rounded-lg bg-daylight-bg dark:bg-ravens-night border border-stone-border dark:border-slate-gray mb-6 text-ink-text dark:text-parchment">
                    <option value="">-- 選擇對局記錄 --</option>
                    {gameRecords.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                <button onClick={handleStartSimulation} disabled={!selectedRecordId} className="flex items-center gap-2 mx-auto px-10 py-4 bg-blood-red text-white rounded-xl font-bold hover:bg-demon-fire disabled:opacity-50 transition-all">
                    <PlayIcon className="w-5 h-5" /> 啟動模擬
                </button>
            </div>
            <div className="bg-parchment-white dark:bg-midnight-ink border border-stone-border dark:border-slate-gray rounded-xl p-6 shadow-lg h-fit">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-celestial-gold">
                    <BookmarkIcon className="w-5 h-5" /> 恢復模擬進度
                </h3>
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                    {sessions.map(s => (
                        <div key={s.id} onClick={() => loadSession(s)} className="p-3 rounded-lg bg-slate-50 dark:bg-black/20 border border-stone-border dark:border-slate-700 cursor-pointer hover:border-townsfolk-blue group flex justify-between items-center transition-all">
                            <div className="min-w-0">
                                <div className="font-bold truncate text-sm">{s.gameRecord.name}</div>
                                <div className="text-[10px] text-moonlit-stone mt-1">Day {s.dayCounter}</div>
                            </div>
                            <button onClick={(e) => deleteSession(e, s.id)} className="p-2 text-slate-400 hover:text-demon-fire transition-colors"><TrashIcon className="w-4 h-4"/></button>
                        </div>
                    ))}
                    {sessions.length === 0 && <p className="text-sm text-moonlit-stone italic text-center py-4">目前沒有已保存的模擬。</p>}
                </div>
            </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0">
          
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4 flex flex-col overflow-y-auto lg:overflow-visible pr-1 custom-scrollbar max-h-full lg:max-h-none">
            <div className="bg-parchment-white dark:bg-midnight-ink border border-stone-border dark:border-slate-gray rounded-xl p-4 shadow-md">
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] font-bold uppercase text-moonlit-stone tracking-widest">目前狀態</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${currentStep.includes('day') ? 'bg-townsfolk-blue text-white' : 'bg-blood-red text-white'}`}>
                   {dayCounter > 0 ? `DAY ${dayCounter}` : 'PREPARING'}
                </span>
              </div>
              <div className="space-y-1.5 max-h-[300px] lg:max-h-[450px] overflow-y-auto pr-1">
                 {simRecord.assignments.map(a => (
                   <div 
                    key={a.player} 
                    onClick={() => currentStep === 'day-whisper' && a.status === 'alive' && toggleWhisperParticipant(a.player)}
                    className={`flex flex-col gap-1 p-2 rounded border cursor-pointer transition-all ${selectedWhisperPlayers.includes(a.player) ? 'border-townsfolk-blue bg-townsfolk-blue/5' : 'bg-white dark:bg-ravens-night border-stone-border dark:border-slate-gray'} ${a.status === 'dead' ? 'opacity-50 grayscale' : 'hover:border-moonlit-stone'}`}
                   >
                     <div className="flex items-center gap-2">
                        <span className={`w-5 h-5 rounded text-[10px] flex items-center justify-center font-bold ${selectedWhisperPlayers.includes(a.player) ? 'bg-townsfolk-blue text-white' : 'bg-slate-200 dark:bg-slate-700'}`}>#{a.player}</span>
                        <span className="flex-grow font-bold text-xs truncate">{a.role.name}</span>
                        {selectedWhisperPlayers.includes(a.player) && <ChatBubbleOvalLeftIcon className="w-3 h-3 text-townsfolk-blue" />}
                     </div>
                     <div className="flex flex-wrap gap-1 mt-0.5">
                        <span className={`text-[8px] font-bold px-1 py-0.5 rounded border uppercase ${a.alignment === 'evil' ? 'text-demon-fire border-demon-fire' : 'text-townsfolk-blue border-townsfolk-blue'}`}>
                            {a.alignment === 'evil' ? '邪惡' : '善良'}
                        </span>
                        <span className={`text-[8px] font-bold px-1 py-0.5 rounded border uppercase ${a.status === 'alive' ? 'text-green-500 border-green-500' : 'text-slate-400 border-slate-400'}`}>
                            {t(`playerStatus.${a.status}`)}
                        </span>
                        {a.statusMarkers.map((m, idx) => <span key={idx} className={`text-[8px] px-1 rounded border flex items-center gap-0.5 ${m.color}`}>{m.icon} {m.text}</span>)}
                     </div>
                   </div>
                 ))}
              </div>
            </div>
            
            <div className="bg-parchment-white dark:bg-midnight-ink border border-stone-border dark:border-slate-gray rounded-xl p-4 shadow-md">
               <h4 className="font-bold text-[10px] text-moonlit-stone mb-2 uppercase tracking-widest">惡魔偽裝</h4>
               <div className="flex flex-wrap gap-1.5">
                  {simRecord.bluffRoleIds?.map(id => {
                    const char = allCharacters.find(c => c.id === id);
                    return char ? <span key={id} className="px-2 py-0.5 bg-demon-fire/10 text-demon-fire border border-demon-fire/30 rounded-full text-[10px] font-bold">{char.name}</span> : null;
                  })}
               </div>
            </div>

            <div className="bg-parchment-white dark:bg-midnight-ink border border-stone-border dark:border-slate-gray rounded-xl p-4 shadow-md space-y-3">
                <div className="flex justify-between items-center">
                    <h4 className="font-bold text-xs text-celestial-gold uppercase tracking-widest flex items-center gap-1"><SparklesIcon className="w-3 h-3"/> AI 控制台</h4>
                    <button onClick={() => setShowConsole(!showConsole)} className="text-[10px] text-moonlit-stone hover:text-parchment">{showConsole ? '隱藏' : '展開'}</button>
                </div>
                {(showConsole || customPrompt) && (
                    <div className="space-y-2">
                        <textarea value={customPrompt} onChange={e => setCustomPrompt(e.target.value)} placeholder="輸入特別指令（如：讓惡魔被毒）..." className="w-full h-20 p-2 text-xs rounded-md bg-slate-50 dark:bg-black/30 border border-slate-700 resize-none outline-none focus:ring-1 focus:ring-celestial-gold" />
                    </div>
                )}
            </div>
          </div>

          {/* Log Area */}
          <div className="lg:col-span-3 flex flex-col space-y-4 h-full min-h-0">
             <div 
                ref={logContainerRef} 
                className="flex-1 bg-white dark:bg-black rounded-xl border border-stone-border dark:border-slate-gray p-6 overflow-y-auto shadow-inner relative flex flex-col"
             >
                {/* Header Toolbar */}
                <div className="absolute top-4 left-6 right-6 z-10 flex justify-between items-center pointer-events-none">
                    <div className="bg-white dark:bg-black px-3 py-1.5 rounded-lg shadow-sm border border-stone-border dark:border-slate-700 pointer-events-auto flex items-center gap-2">
                        <span className="text-[10px] font-bold text-moonlit-stone uppercase tracking-widest">對局動態日誌</span>
                        <button 
                            onClick={() => { setSelectionMode(!selectionMode); setSelectedLogIds(new Set()); setEditingLogId(null); }}
                            className={`p-1 rounded-full transition-colors ${selectionMode ? 'bg-townsfolk-blue text-white' : 'hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400'}`}
                            title="管理日誌 (批量刪除)"
                        >
                            <ListBulletIcon className="w-3.5 h-3.5"/>
                        </button>
                    </div>

                    {selectionMode && (
                        <div className="bg-white dark:bg-black px-2 py-1 rounded-lg shadow-lg border border-stone-border dark:border-slate-700 pointer-events-auto flex items-center gap-2 animate-fade-in-down">
                            <span className="text-xs font-bold text-townsfolk-blue px-2">{selectedLogIds.size} Selected</span>
                            <button onClick={handleSelectAll} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500" title="Select All"><ArrowsRightLeftIcon className="w-4 h-4"/></button>
                            <button onClick={handleBulkDelete} disabled={selectedLogIds.size === 0} className="p-1.5 bg-demon-fire text-white rounded hover:bg-red-600 disabled:opacity-50 transition-colors shadow-sm" title="Delete Selected"><TrashIcon className="w-4 h-4"/></button>
                            <button onClick={() => setSelectionMode(false)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500"><XMarkIcon className="w-4 h-4"/></button>
                        </div>
                    )}
                </div>

                <div className="space-y-4 pt-12 pb-20">
                   {narrative.map((log, i) => (
                     <div key={log.id} className={`relative group transition-all ${selectionMode ? 'pl-8' : ''}`}>
                        {selectionMode && (
                            <div className="absolute left-0 top-4">
                                <input 
                                    type="checkbox" 
                                    checked={selectedLogIds.has(log.id)}
                                    onChange={() => toggleLogSelection(log.id)}
                                    className="w-4 h-4 rounded text-townsfolk-blue focus:ring-townsfolk-blue cursor-pointer"
                                />
                            </div>
                        )}
                        
                        {editingLogId === log.id ? (
                            <div className="bg-white dark:bg-black border-2 border-townsfolk-blue rounded-lg p-3 shadow-lg animate-fade-in">
                                <textarea 
                                    value={editingText} 
                                    onChange={(e) => setEditingText(e.target.value)}
                                    className="w-full h-32 bg-transparent resize-none outline-none text-sm font-medium leading-relaxed"
                                    autoFocus
                                />
                                <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                    <button onClick={handleCancelEdit} className="px-3 py-1 text-xs rounded hover:bg-slate-100 dark:hover:bg-slate-800">Cancel</button>
                                    <button onClick={handleSaveEdit} className="px-3 py-1 text-xs bg-townsfolk-blue text-white rounded font-bold hover:bg-blue-600">Save</button>
                                </div>
                            </div>
                        ) : (
                            <div className="animate-fade-in border-l-4 border-celestial-gold pl-5 bg-slate-50 dark:bg-ravens-night p-4 rounded-r shadow-sm hover:shadow-md transition-shadow relative">
                                <FormattedLog text={log.text} />
                                
                                {!selectionMode && (
                                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-50 dark:bg-ravens-night p-1 rounded-lg shadow-sm">
                                        <button onClick={() => handleEditLog(log.id, log.text)} className="p-1.5 text-slate-400 hover:text-townsfolk-blue rounded-full hover:bg-white dark:hover:bg-slate-800 transition-colors" title="編輯日誌"><PencilIcon className="w-3.5 h-3.5"/></button>
                                        <button onClick={() => handleDeleteLog(log.id)} className="p-1.5 text-slate-400 hover:text-demon-fire rounded-full hover:bg-white dark:hover:bg-slate-800 transition-colors" title="刪除日誌"><TrashIcon className="w-3.5 h-3.5"/></button>
                                    </div>
                                )}
                            </div>
                        )}
                     </div>
                   ))}
                   {isProcessing && (
                     <div className="flex items-center gap-2 text-moonlit-stone text-xs italic px-4 py-2 bg-slate-100 dark:bg-white/5 rounded-full w-fit mx-auto mt-4 animate-pulse">
                        <ArrowPathIcon className="w-4 h-4 animate-spin" /> AI 正在深思熟慮並編織日誌中...
                     </div>
                   )}
                </div>
             </div>

             {/* Controls */}
             <div className="bg-parchment-white dark:bg-midnight-ink border border-stone-border dark:border-slate-gray rounded-xl p-4 shadow-lg flex gap-3 overflow-x-auto shrink-0 scrollbar-hide">
                {currentStep === 'setup' && (
                  <button onClick={handleSetup} disabled={isProcessing} className="flex-1 py-4 px-6 bg-townsfolk-blue text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-colors min-w-max shadow-md hover:brightness-110">
                    <CheckCircleIcon className="w-5 h-5"/> 初始化模擬
                  </button>
                )}
                {currentStep === 'first-night' && (
                  <button onClick={() => handleFirstNight()} disabled={isProcessing} className="flex-1 py-4 px-6 bg-indigo-600 text-white rounded-lg font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all min-w-max shadow-md hover:brightness-110">
                    <MoonIcon className="w-5 h-5"/> 執行首夜行動
                  </button>
                )}
                {currentStep === 'day-whisper' && (
                    <div className="flex flex-col w-full gap-2">
                        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                            <button onClick={() => handleWhisperChat(true, 'new')} disabled={isProcessing} className="flex-1 py-3 px-4 bg-teal-600 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-colors min-w-max shadow-md hover:brightness-110 text-sm">
                                <SparklesIcon className="w-4 h-4"/> AI 自動私聊
                            </button>
                            <button onClick={() => handleWhisperChat(true, 'continue')} disabled={isProcessing || narrative.length === 0} className="flex-1 py-3 px-4 bg-slate-600 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-colors min-w-max shadow-md hover:brightness-110 text-sm">
                                <ChatBubbleOvalLeftEllipsisIcon className="w-4 h-4"/> 延續私聊
                            </button>
                            <button onClick={() => handleWhisperChat(true, 'retry')} disabled={isProcessing || narrative.length === 0} className="flex-1 py-3 px-4 bg-orange-600 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-colors min-w-max shadow-md hover:brightness-110 text-sm">
                                <ArrowPathIcon className="w-4 h-4"/> 重新生成
                            </button>
                            {selectedWhisperPlayers.length >= 2 && (
                                <button onClick={() => handleWhisperChat(false, 'new')} disabled={isProcessing} className="flex-1 py-3 px-4 bg-emerald-600 text-white rounded-lg font-bold flex items-center justify-center gap-2 animate-pulse min-w-max shadow-md hover:brightness-110 text-sm">
                                    <ChatBubbleOvalLeftIcon className="w-4 h-4"/> 指定私聊
                                </button>
                            )}
                            <button onClick={handleEndWhispers} disabled={isProcessing} className="flex items-center gap-2 px-6 py-3 bg-slate-800 text-white rounded-lg font-bold transition-colors min-w-max shadow-md hover:brightness-110 text-sm">
                                結束私聊進入公聊 <ArrowRightIcon className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="text-[10px] text-moonlit-stone bg-black/5 dark:bg-white/5 p-2 rounded-lg flex gap-4 justify-center">
                            <span className="flex items-center gap-1"><SparklesIcon className="w-3 h-3"/> 自動私聊: 開啟隨機新話題</span>
                            <span className="flex items-center gap-1"><ChatBubbleOvalLeftEllipsisIcon className="w-3 h-3"/> 延續: 讓對話繼續深入</span>
                            <span className="flex items-center gap-1"><ArrowPathIcon className="w-3 h-3"/> 重生成: 不滿意? 替換上一條</span>
                        </div>
                    </div>
                )}
                {currentStep === 'day-public' && (
                    <>
                        <button onClick={() => handlePublicChat()} disabled={isProcessing} className="flex-1 py-4 px-6 bg-celestial-gold text-midnight-ink rounded-lg font-bold flex items-center justify-center gap-2 transition-colors min-w-max shadow-md hover:brightness-110">
                            <ChatBubbleOvalLeftEllipsisIcon className="w-5 h-5"/> 全場公聊
                        </button>
                        <button onClick={handleFinishDayChat} disabled={isProcessing} className="flex items-center gap-2 px-6 py-4 bg-slate-800 text-white rounded-lg font-bold transition-colors min-w-max shadow-md hover:brightness-110">
                            進入提名環節 <ArrowRightIcon className="w-4 h-4" />
                        </button>
                    </>
                )}
                {currentStep === 'day-nomination' && (
                  <>
                    <button onClick={handleNominationStep} disabled={isProcessing} className="flex-1 py-4 px-6 bg-blood-red text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-colors min-w-max shadow-md hover:brightness-110">
                        <UserGroupIcon className="w-5 h-5"/> 模擬一次提名與對話
                    </button>
                    <button 
                        onClick={handleConfirmExecution} 
                        disabled={isProcessing}
                        className={`px-6 py-4 rounded-lg font-bold flex items-center justify-center gap-2 shadow-lg transition-all min-w-max hover:brightness-110 ${pendingExecution ? 'bg-orange-600 text-white animate-pulse' : 'bg-slate-700 text-slate-300'}`}
                    >
                        <CheckCircleIcon className="w-5 h-5"/> 
                        {pendingExecution ? `處決並進入夜晚 (#${pendingExecution.nominee})` : '無人處決進入夜晚'}
                    </button>
                  </>
                )}
                {currentStep === 'night-actions' && (
                  <button onClick={() => handleNightActions()} disabled={isProcessing} className="flex-1 py-4 px-6 bg-slate-800 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-colors min-w-max shadow-md hover:brightness-110">
                    <MoonIcon className="w-5 h-5"/> 進入下一晚
                  </button>
                )}
                {currentStep === 'game-over' && (
                  <button onClick={() => setSimRecord(null)} className="flex-1 py-4 px-6 bg-green-600 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-colors min-w-max shadow-md hover:brightness-110">
                    <TrophyIcon className="w-5 h-5"/> 重置模擬
                  </button>
                )}
             </div>
          </div>

        </div>
      )}
    </div>
  );
};
