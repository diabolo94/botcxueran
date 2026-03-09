
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { GameRecord, Assignment, Character, ActionLogEntry, NewActionLogEntryData, Script } from '../types';
import { 
    TrashIcon, MoonIcon, SunIcon, ArrowsRightLeftIcon, 
    ChevronDownIcon, ChevronUpIcon, PencilIcon, CheckIcon, 
    XMarkIcon, ArrowDownTrayIcon, SearchIcon, FunnelIcon,
    ListBulletIcon, ClipboardDocumentListIcon, Bars3Icon,
    PlusIcon // Import PlusIcon
} from './Icons';

interface ActionLogListProps {
    game: GameRecord;
    assignments: Assignment[];
    getCharacter: (id: string) => Character | undefined;
    onUpdateLog: (log: ActionLogEntry) => void;
    onDeleteLog: (id: string) => void;
    onDeletePhase: (phaseLogId: string) => void;
    onAddLog: (entry: NewActionLogEntryData) => void;
    onMoveLog?: (logId: string, direction: 'up' | 'down') => void; // New Prop
    onInsertLog?: (targetLogId: string, entry: NewActionLogEntryData) => void; // New Prop
    handleSetPlayerStatus: (playerRoleID: string, status: 'alive' | 'dead') => void;
    t: (key: string, options?: { [key: string]: any }) => string;
    isReadOnly?: boolean;
    currentScript?: Script | null;
    onHighlight?: (playerSeats: number[]) => void;
    className?: string;
}

export const ActionLogList: React.FC<ActionLogListProps> = ({ 
    game, assignments = [], getCharacter, onUpdateLog, onDeleteLog, onDeletePhase, onAddLog, 
    onMoveLog, onInsertLog, handleSetPlayerStatus, t, isReadOnly = false, onHighlight,
    className = ''
}) => {
    const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
    const [collapsedPhases, setCollapsedPhases] = useState<Set<string>>(new Set());
    
    // Feature States
    const [filterType, setFilterType] = useState<'all' | 'votes' | 'deaths' | 'notes'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [isCompact, setIsCompact] = useState(false);
    
    // Editing State
    const [editingLogId, setEditingLogId] = useState<string | null>(null);
    const [editingText, setEditingText] = useState('');

    // Ref for Auto-scroll
    const bottomRef = useRef<HTMLDivElement>(null);

    const logs = useMemo(() => game?.actionLog || [], [game?.actionLog]);

    // Auto-scroll to bottom when logs change (only if not filtering/searching)
    useEffect(() => {
        if (bottomRef.current && filterType === 'all' && !searchTerm) {
            bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
    }, [logs.length, filterType, searchTerm]);

    // --- Filtering Logic ---
    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            // 1. Filter by Type
            if (filterType === 'votes') {
                if (log.type !== 'nomination' && log.type !== 'execution') return false;
            } else if (filterType === 'deaths') {
                // Check note text or execution for death related keywords
                if (log.type === 'execution' && log.outcome === 'executed') return true;
                if (log.type === 'note' && (log.text.includes('死亡') || log.text.includes('died'))) return true;
                return false;
            } else if (filterType === 'notes') {
                if (log.type !== 'note' && log.type !== 'character_change') return false;
            }

            // 2. Filter by Search Term
            if (searchTerm.trim()) {
                const term = searchTerm.toLowerCase();
                let content = '';
                
                if (log.type === 'note') content = log.text;
                else if (log.type === 'nomination') {
                    const n1 = getCharacter(log.nominatorId)?.name || '';
                    const n2 = getCharacter(log.nomineeId)?.name || '';
                    content = `${n1} ${n2} nomination`;
                } else if (log.type === 'character_change') {
                    const c1 = getCharacter(log.oldRoleId)?.name || '';
                    const c2 = getCharacter(log.newRoleId)?.name || '';
                    content = `${c1} ${c2} change`;
                }
                
                if (!content.toLowerCase().includes(term)) return false;
            }

            return true;
        });
    }, [logs, filterType, searchTerm, getCharacter]);

    // --- Grouping Logic ---
    const isFiltering = filterType !== 'all' || !!searchTerm;

    const phaseGroups = useMemo(() => {
        if (isFiltering) return { groups: [], orphans: filteredLogs.filter(l => l.type !== 'phase_marker') };

        const groups: { header: ActionLogEntry; items: ActionLogEntry[] }[] = [];
        let currentGroup: { header: ActionLogEntry; items: ActionLogEntry[] } | null = null;
        const orphans: ActionLogEntry[] = [];

        logs.forEach(log => {
            if (log.type === 'phase_marker') {
                if (currentGroup) groups.push(currentGroup);
                currentGroup = { header: log, items: [] };
            } else {
                if (currentGroup) currentGroup.items.push(log);
                else orphans.push(log);
            }
        });
        if (currentGroup) groups.push(currentGroup);
        
        return { groups, orphans };
    }, [logs, filteredLogs, isFiltering]);

    const togglePhase = (id: string) => {
        setCollapsedPhases(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // --- Hover Logic for Highlighting ---
    const handleMouseEnterLog = (log: ActionLogEntry) => {
        if (!onHighlight) return;
        const seats: number[] = [];

        if (log.type === 'nomination') {
            const n1 = assignments.find(a => a.role.id === log.nominatorId);
            const n2 = assignments.find(a => a.role.id === log.nomineeId);
            if (n1) seats.push(n1.player);
            if (n2) seats.push(n2.player);
        } else if (log.type === 'execution') {
            const n = assignments.find(a => a.role.id === log.nomineeId);
            if (n) seats.push(n.player);
        } else if (log.type === 'character_change') {
            seats.push(log.playerIndex);
        } else if (log.type === 'note' && log.characterId !== 'general' && log.characterId !== 'storyteller') {
            const n = assignments.find(a => a.role.id === log.characterId);
            if (n) seats.push(n.player);
        }

        if (seats.length > 0) onHighlight(seats);
    };

    const handleMouseLeaveLog = () => {
        if (onHighlight) onHighlight([]);
    };

    // --- Copy to Clipboard ---
    const handleCopyLog = () => {
        const textLines = filteredLogs.map(log => {
            if (log.type === 'phase_marker') {
                return `\n=== ${t(`roleAssignment.${log.phase}`, { day: log.dayNumber })} ===`;
            }
            if (log.type === 'nomination') {
                const n1 = getCharacter(log.nominatorId)?.name || 'Unknown';
                const n2 = getCharacter(log.nomineeId)?.name || 'Unknown';
                const votes = log.voters?.length || 0;
                return `[提名] ${n1} 提名 ${n2} (${votes} 票)`;
            }
            if (log.type === 'execution') {
                const n = getCharacter(log.nomineeId)?.name || 'Unknown';
                return log.outcome === 'executed' ? `[處決] ${n} 死亡` : `[平安] ${n} 獲釋`;
            }
            if (log.type === 'note') return `• ${log.text}`;
            if (log.type === 'character_change') {
                const c1 = getCharacter(log.oldRoleId)?.name || '?';
                const c2 = getCharacter(log.newRoleId)?.name || '?';
                return `[變更] #${log.playerIndex} ${c1} -> ${c2}`;
            }
            return '';
        }).filter(Boolean).join('\n');

        navigator.clipboard.writeText(textLines).then(() => alert('日誌已複製到剪貼簿'));
    };

    // --- Editing Handlers ---
    const startEditing = (log: ActionLogEntry) => {
        if (log.type === 'note') {
            setEditingLogId(log.id);
            setEditingText(log.text);
        }
    };

    const saveEditing = (log: ActionLogEntry) => {
        if (log.type === 'note') {
            onUpdateLog({ ...log, text: editingText });
        }
        setEditingLogId(null);
        setEditingText('');
    };

    const cancelEditing = () => {
        setEditingLogId(null);
        setEditingText('');
    };

    // --- Insert Log Handler ---
    const triggerInsert = (targetLogId: string) => {
        if (!onInsertLog) return;
        const newEntry: NewActionLogEntryData = {
            type: 'note',
            characterId: 'storyteller',
            text: '' // Start empty
        };
        onInsertLog(targetLogId, newEntry);
        
        // Hack: We don't have the new ID yet easily here without return value.
        // A better UX might be just opening a prompt or having onInsertLog return the ID.
        // For simplicity, we just rely on the user clicking edit on the new row, 
        // OR we can make the newly added row default to edit mode if we modify GameRecordsView to track "newly added".
        // Given constraints, let's keep it simple: Add row, user clicks edit if needed.
        // Actually, we can assume the new row will appear.
    };

    // --- Item Renderer ---
    const renderLogItem = (log: ActionLogEntry, showDayContext: boolean = false) => {
        if (!log) return null;

        const ContextTag = showDayContext ? (
            <span className="text-[9px] text-moonlit-stone bg-slate-100 dark:bg-slate-800 px-1 rounded mr-2 shrink-0">
               Log
            </span>
        ) : null;

        // Common wrapper to handle hover
        const wrapperProps = {
            onMouseEnter: () => handleMouseEnterLog(log),
            onMouseLeave: handleMouseLeaveLog
        };

        const ControlButtons = (
            <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-50 dark:bg-ravens-night p-1 rounded-lg shadow-sm z-10">
                {onMoveLog && !isFiltering && (
                    <>
                        <button onClick={(e) => { e.stopPropagation(); onMoveLog(log.id, 'up'); }} className="p-1 text-slate-400 hover:text-townsfolk-blue rounded hover:bg-white dark:hover:bg-slate-800" title="上移"><ChevronUpIcon className="w-3 h-3"/></button>
                        <button onClick={(e) => { e.stopPropagation(); onMoveLog(log.id, 'down'); }} className="p-1 text-slate-400 hover:text-townsfolk-blue rounded hover:bg-white dark:hover:bg-slate-800" title="下移"><ChevronDownIcon className="w-3 h-3"/></button>
                    </>
                )}
                {onInsertLog && !isFiltering && (
                    <button onClick={(e) => { e.stopPropagation(); triggerInsert(log.id); }} className="p-1 text-slate-400 hover:text-green-500 rounded hover:bg-white dark:hover:bg-slate-800" title="向下插入"><PlusIcon className="w-3 h-3"/></button>
                )}
                {!isReadOnly && log.type === 'note' && (
                    <button onClick={(e) => { e.stopPropagation(); startEditing(log); }} className="p-1 text-slate-400 hover:text-townsfolk-blue rounded hover:bg-white dark:hover:bg-slate-800"><PencilIcon className="w-3 h-3"/></button>
                )}
                {!isReadOnly && (
                    <button onClick={(e) => { e.stopPropagation(); onDeleteLog(log.id); }} className="p-1 text-slate-400 hover:text-demon-fire rounded hover:bg-white dark:hover:bg-slate-800"><TrashIcon className="w-3 h-3"/></button>
                )}
            </div>
        );

        // Nomination
        if (log.type === 'nomination') {
            const nominator = getCharacter(log.nominatorId);
            const nominee = getCharacter(log.nomineeId);
            const isExpanded = expandedLogId === log.id;
            
            if (isCompact) {
                return (
                    <div {...wrapperProps} key={log.id} className="relative group flex items-center text-xs py-1 border-b border-dashed border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-white/5 cursor-crosshair">
                        {ContextTag}
                        <span className="text-townsfolk-blue font-bold">{nominator?.name}</span>
                        <span className="mx-1 text-slate-400">提名</span>
                        <span className="text-demon-fire font-bold">{nominee?.name}</span>
                        <span className="ml-auto font-mono text-[10px] bg-slate-200 dark:bg-slate-700 px-1 rounded">{log.voters?.length || 0}票</span>
                        {ControlButtons}
                    </div>
                );
            }

            return (
                <div {...wrapperProps} key={log.id} className={`relative group bg-white dark:bg-midnight-ink rounded-lg border-2 mb-2 transition-colors ${isExpanded ? 'border-townsfolk-blue' : 'border-slate-gray/20 hover:border-slate-400'}`}>
                    <div className="p-3 flex justify-between items-center cursor-pointer" onClick={() => setExpandedLogId(isExpanded ? null : log.id)}>
                        <div className="text-xs font-bold truncate flex-grow flex items-center">
                            {ContextTag}
                            <span className="text-townsfolk-blue">{nominator?.name || '未知'}</span> 
                            <span className="mx-1 text-slate-400">提名</span> 
                            <span className="text-demon-fire">{nominee?.name || '未知'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-[10px] font-bold">{log.voters?.length || 0} 票</span>
                        </div>
                    </div>
                    {ControlButtons}
                    {isExpanded && !isReadOnly && (
                        <div className="p-3 border-t bg-slate-50/50 space-y-3">
                            <div className="flex flex-wrap gap-1">
                                {assignments.map(p => {
                                    const isVoter = log.voters?.includes(p.role.id);
                                    return <button key={p.player} onClick={() => onUpdateLog({...log, voters: isVoter ? log.voters.filter(v=>v!==p.role.id) : [...(log.voters || []), p.role.id]})} className={`px-2 py-1 rounded text-[10px] border ${isVoter ? 'bg-townsfolk-blue text-white' : 'bg-white'}`}>#{p.player}</button>;
                                })}
                            </div>
                            <div className="flex justify-end gap-2">
                                <button onClick={() => { onAddLog({type:'execution', nomineeId:log.nomineeId, outcome:'executed'}); handleSetPlayerStatus(log.nomineeId, 'dead'); }} className="px-3 py-1 bg-blood-red text-white text-[10px] rounded">執行處決</button>
                                <button onClick={() => { onAddLog({type:'execution', nomineeId:log.nomineeId, outcome:'spared'}); }} className="px-3 py-1 bg-townsfolk-blue text-white text-[10px] rounded">平安</button>
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        // Execution
        if (log.type === 'execution') {
            const nominee = getCharacter(log.nomineeId);
            
            if (isCompact) {
                return (
                    <div {...wrapperProps} key={log.id} className={`relative group flex items-center text-xs py-1 font-bold ${log.outcome === 'executed' ? 'text-demon-fire' : 'text-townsfolk-blue'} cursor-crosshair hover:bg-slate-50 dark:hover:bg-white/5`}>
                        {ContextTag}
                        <span>[{log.outcome === 'executed' ? '處決' : '平安'}] {nominee?.name}</span>
                        {ControlButtons}
                    </div>
                );
            }

            return (
                <div {...wrapperProps} key={log.id} className={`relative group p-2 rounded border-2 mb-2 text-center text-[10px] font-bold cursor-crosshair ${log.outcome === 'executed' ? 'border-demon-fire text-demon-fire bg-red-50' : 'border-townsfolk-blue text-townsfolk-blue bg-blue-50'}`}>
                    {ContextTag}
                    {log.outcome === 'executed' ? `[處決] ${nominee?.name || '未知'} 死亡` : `[平安] ${nominee?.name || '未知'} 獲釋`}
                    {ControlButtons}
                </div>
            );
        }

        // Note / Character Change (Editable)
        if (log.type === 'note' || log.type === 'character_change') {
            const isTransform = log.type === 'character_change';
            const isEditing = editingLogId === log.id;
            
            let char = null;
            let displayTitle = '';
            let displayText = '';

            if (log.type === 'note') {
                const charId = (log as any).characterId;
                char = charId === 'storyteller' || charId === 'general' ? null : getCharacter(charId);
                displayTitle = charId === 'storyteller' ? '說書人' : (char?.name || '全局筆記');
                displayText = log.text;
            } else if (log.type === 'character_change') {
                const oldC = getCharacter(log.oldRoleId);
                const newC = getCharacter(log.newRoleId);
                displayTitle = '身份異動';
                displayText = `玩家 #${log.playerIndex} (${oldC?.name || '未知'}) 變成了「${newC?.name || '未知'}」`;
            }

            if (isCompact) {
                return (
                    <div {...wrapperProps} key={log.id} className="relative group flex items-start text-xs py-1 border-b border-dashed border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-white/5 cursor-crosshair">
                        {ContextTag}
                        <span className="font-bold text-slate-500 mr-2 shrink-0 w-16 truncate" title={displayTitle}>{displayTitle}</span>
                        <span className="text-ink-text dark:text-parchment truncate flex-grow" title={displayText}>{displayText}</span>
                        {ControlButtons}
                    </div>
                );
            }

            return (
                <div {...wrapperProps} key={log.id} className={`relative group flex gap-3 p-3 bg-white dark:bg-midnight-ink border rounded-lg mb-2 shadow-sm animate-fade-in items-start transition-colors ${isEditing ? 'border-townsfolk-blue ring-1 ring-townsfolk-blue' : 'hover:border-slate-400'}`}>
                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 border overflow-hidden mt-0.5">
                        {isTransform ? <ArrowsRightLeftIcon className="w-4 h-4 text-indigo-500" /> : (char?.iconUrl ? <img src={char.iconUrl} className="w-full h-full object-cover" /> : <span className="text-[10px] font-bold">ST</span>)}
                    </div>
                    
                    <div className="flex-grow min-w-0">
                        <div className="flex items-center gap-2">
                            {ContextTag}
                            <p className="text-[9px] font-bold text-moonlit-stone uppercase mb-0.5">{displayTitle}</p>
                        </div>
                        
                        {isEditing ? (
                            <div className="space-y-2">
                                <textarea 
                                    value={editingText}
                                    onChange={e => setEditingText(e.target.value)}
                                    className="w-full text-xs p-2 border rounded bg-slate-50 dark:bg-black/20 dark:border-slate-700 resize-none h-24 focus:outline-none"
                                    autoFocus
                                />
                                <div className="flex gap-2 justify-end">
                                    <button onClick={cancelEditing} className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500"><XMarkIcon className="w-4 h-4"/></button>
                                    <button onClick={() => saveEditing(log)} className="p-1 rounded bg-townsfolk-blue text-white hover:bg-blue-600"><CheckIcon className="w-4 h-4"/></button>
                                </div>
                            </div>
                        ) : (
                            <p className="text-xs leading-tight whitespace-pre-wrap">{displayText}</p>
                        )}
                    </div>

                    {!isReadOnly && !isEditing && ControlButtons}
                </div>
            );
        }
        return null;
    };

    // --- Main Render ---
    return (
        <div className={`flex flex-col h-full bg-slate-50 dark:bg-black/20 rounded-xl overflow-hidden border border-stone-border dark:border-slate-gray/50 ${className}`}>
            {/* Toolbar */}
            <div className="p-2 border-b border-stone-border dark:border-slate-gray bg-white dark:bg-midnight-ink flex flex-col gap-2 shrink-0 z-10 shadow-sm">
                <div className="flex items-center gap-2">
                    <div className="relative flex-grow">
                        <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400"/>
                        <input 
                            type="text" 
                            placeholder="搜尋日誌..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-7 pr-2 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-black/20 text-xs focus:ring-1 focus:ring-townsfolk-blue outline-none"
                        />
                    </div>
                    <div className="flex bg-slate-100 dark:bg-slate-800 rounded-md p-0.5">
                        <button onClick={() => setIsCompact(false)} className={`p-1.5 rounded ${!isCompact ? 'bg-white dark:bg-slate-600 shadow text-townsfolk-blue' : 'text-slate-400'}`} title="卡片檢視"><ListBulletIcon className="w-4 h-4"/></button>
                        <button onClick={() => setIsCompact(true)} className={`p-1.5 rounded ${isCompact ? 'bg-white dark:bg-slate-600 shadow text-townsfolk-blue' : 'text-slate-400'}`} title="緊湊檢視"><Bars3Icon className="w-4 h-4"/></button>
                    </div>
                    <button onClick={handleCopyLog} className="p-1.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-townsfolk-blue hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" title="複製純文字報表">
                        <ClipboardDocumentListIcon className="w-4 h-4"/>
                    </button>
                </div>
                
                <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
                    {[
                        { id: 'all', label: t('roleAssignment.filters.all') },
                        { id: 'votes', label: t('roleAssignment.filters.votes') },
                        { id: 'deaths', label: t('roleAssignment.filters.deaths') },
                        { id: 'notes', label: t('roleAssignment.filters.notes') },
                    ].map(f => (
                        <button 
                            key={f.id}
                            onClick={() => setFilterType(f.id as any)}
                            className={`px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap border transition-colors ${filterType === f.id ? 'bg-townsfolk-blue text-white border-townsfolk-blue' : 'bg-transparent border-slate-300 dark:border-slate-600 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                {logs.length === 0 ? (
                    <div className="py-20 text-center text-moonlit-stone border-2 border-dashed border-slate-gray/30 rounded-xl text-sm italic">尚無記錄</div>
                ) : isFiltering ? (
                    /* Filtering View: Flat List */
                    <div className="space-y-2">
                        {filteredLogs.length === 0 && <p className="text-center text-xs text-moonlit-stone py-4">無符合條件的記錄</p>}
                        {filteredLogs.map(log => renderLogItem(log, true))}
                    </div>
                ) : (
                    /* Standard Grouped View */
                    <>
                        {phaseGroups.orphans.map(log => renderLogItem(log))}
                        {phaseGroups.groups.map(group => {
                            const { header, items } = group;
                            const isCollapsed = collapsedPhases.has(header.id);
                            // Cast header to specific phase_marker type to access phase and dayNumber safely
                            const headerPhase = header as Extract<ActionLogEntry, { type: 'phase_marker' }>;
                            const title = t(`roleAssignment.${headerPhase.phase}`, { day: headerPhase.dayNumber });
                            
                            return (
                                <div key={header.id} className="border border-stone-border dark:border-slate-gray/60 rounded-xl overflow-hidden shadow-sm animate-fade-in bg-white dark:bg-slate-900/50 mb-3">
                                    {/* Header */}
                                    <div 
                                        className="relative group flex items-center justify-between bg-slate-50 dark:bg-slate-800 p-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors select-none"
                                        onClick={() => togglePhase(header.id)}
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className={`p-1.5 rounded-lg ${headerPhase.phase === 'Day' ? 'text-townsfolk-blue bg-blue-100 dark:bg-blue-900/30' : 'text-blood-red bg-red-100 dark:bg-red-900/30'}`}>
                                                {headerPhase.phase === 'Day' ? <SunIcon className="w-4 h-4"/> : <MoonIcon className="w-4 h-4"/>}
                                            </div>
                                            <span className="font-bold uppercase tracking-widest text-xs text-ink-text dark:text-parchment">{title}</span>
                                            <span className="text-[10px] text-slate-400 bg-slate-200 dark:bg-slate-700 px-1.5 rounded-full">{items.length}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {onMoveLog && (
                                                    <>
                                                        <button onClick={(e) => { e.stopPropagation(); onMoveLog(header.id, 'up'); }} className="text-slate-400 hover:text-townsfolk-blue p-1" title="上移"><ChevronUpIcon className="w-3 h-3"/></button>
                                                        <button onClick={(e) => { e.stopPropagation(); onMoveLog(header.id, 'down'); }} className="text-slate-400 hover:text-townsfolk-blue p-1" title="下移"><ChevronDownIcon className="w-3 h-3"/></button>
                                                    </>
                                                )}
                                                {!isReadOnly && <button onClick={(e) => { e.stopPropagation(); onDeletePhase(header.id); }} className="text-slate-400 hover:text-red-500 p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"><TrashIcon className="w-3.5 h-3.5" /></button>}
                                            </div>
                                            {isCollapsed ? <ChevronDownIcon className="w-4 h-4 text-slate-400"/> : <ChevronUpIcon className="w-4 h-4 text-slate-400"/>}
                                        </div>
                                    </div>

                                    {/* Body */}
                                    {!isCollapsed && (
                                        <div className="p-2 space-y-2 border-t border-stone-border dark:border-slate-700">
                                            {items.length === 0 && <p className="text-center text-[10px] text-moonlit-stone py-2 italic">此階段暫無事件</p>}
                                            {items.map(log => renderLogItem(log))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        <div ref={bottomRef} className="h-1" />
                    </>
                )}
            </div>
        </div>
    );
};
