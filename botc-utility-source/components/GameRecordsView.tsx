
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { GameRecord, Character, Script, ActionLogEntry, NewActionLogEntryData, Assignment, StatusMarker } from '../types';
import { 
    TrashIcon, ClockIcon, UserGroupIcon, 
    SparklesIcon, ArrowLeftIcon, CalendarIcon,
    ListBulletIcon, Bars3Icon, EyeIcon, MoonIcon, 
    CheckCircleIcon, XMarkIcon, PlusIcon, SunIcon,
    DocumentArrowDownIcon, SearchIcon, FunnelIcon,
    PinIcon, ArrowDownTrayIcon, ArrowUpTrayIcon
} from './Icons';
import { ActionLogList } from './ActionLogList';
import { ActionLogInput } from './ActionLogInput';
import { PhaseAdvanceButton } from './GameplayControls';
import { AIAnalysisModal } from './AIAnalysisModal';
import { ShowInfoModal } from './ShowInfoModal';
import { Modal } from './Modal';

interface GameRecordsViewProps {
  t: (key: string, options?: any) => string;
  gameRecords: GameRecord[];
  setGameRecords: React.Dispatch<React.SetStateAction<GameRecord[]>>;
  allCharacters: Character[];
  scripts: Script[];
  onAddRuleDoc: (title: string, content: string) => void;
  externalActiveId: string | null;
  onClearExternalId: () => void;
}

// --- Helper Component: Game Statistics Bar ---
const GameStatsBar: React.FC<{ assignments: Assignment[] }> = ({ assignments }) => {
    const stats = useMemo(() => {
        const counts: Record<string, number> = {
            Townsfolk: 0, Outsider: 0, Minion: 0, Demon: 0, Traveler: 0,
            Alive: 0, GhostVotes: 0, Total: assignments.length
        };
        
        assignments.forEach(a => {
            // Defensive check for role existence
            if (!a || !a.role) return;

            if (a.status === 'alive') {
                counts.Alive++;
                if (counts[a.role.characterType] !== undefined) {
                    counts[a.role.characterType]++;
                }
            } else if (a.status === 'dead') {
                if (a.statusMarkers && a.statusMarkers.some(m => m.id === 'ghostVote')) {
                    counts.GhostVotes++;
                }
            }
        });
        return counts;
    }, [assignments]);

    return (
        <div className="flex items-center gap-3 px-3 py-2 bg-slate-100 dark:bg-slate-800/50 border-b border-stone-border dark:border-slate-700 text-[10px] sm:text-xs font-bold overflow-x-auto whitespace-nowrap shrink-0">
            <span className="text-green-600">存活: {stats.Alive}/{stats.Total}</span>
            <span className="w-px h-3 bg-slate-300 dark:bg-slate-600"></span>
            <span className="text-townsfolk-blue">鎮: {stats.Townsfolk}</span>
            <span className="text-celestial-gold">外: {stats.Outsider}</span>
            <span className="text-demon-fire">爪: {stats.Minion}</span>
            <span className="text-blood-red">惡: {stats.Demon}</span>
            <span className="w-px h-3 bg-slate-300 dark:bg-slate-600"></span>
            <span className="text-indigo-500 flex items-center gap-1">
                👻 死票: {stats.GhostVotes}
            </span>
        </div>
    );
};

// --- Helper Component: Night Helper Panel ---
const NightHelperPanel: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    script: Script | null;
    assignments: Assignment[];
    allCharacters: Character[];
    t: (key: string) => string;
    isPinned: boolean;
    onTogglePin: () => void;
}> = ({ isOpen, onClose, script, assignments, allCharacters, t, isPinned, onTogglePin }) => {
    const [tab, setTab] = useState<'first' | 'other'>('first');

    if (!script) return null;

    const inPlayRoleIds = new Set(assignments.map(a => a.role?.id).filter(Boolean));
    
    const filterOrder = (items: any[]) => {
        return items?.filter(item => {
            return item.characterId.startsWith('predefined:') || inPlayRoleIds.has(item.characterId);
        }) || [];
    };

    const displayOrder = filterType => filterOrder(filterType === 'first' ? script.firstNightOrder : script.otherNightsOrder);

    // Common Content Renderer
    const renderContent = () => (
        <div className="flex flex-col h-full bg-white dark:bg-midnight-ink shadow-2xl border-l border-stone-border dark:border-slate-700">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-stone-border dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                <h3 className="font-bold text-lg text-celestial-gold flex items-center gap-2">
                    <MoonIcon className="w-5 h-5" />
                    {t('roleAssignment.helperNightOrder')}
                </h3>
                <div className="flex items-center gap-1">
                    {/* Pin Button (Desktop Only) */}
                    <button 
                        onClick={onTogglePin} 
                        className={`hidden lg:flex p-2 rounded-full transition-colors ${isPinned ? 'text-townsfolk-blue bg-blue-100 dark:bg-blue-900/30 rotate-45' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                        title={isPinned ? "Unpin" : "Pin"}
                    >
                        <PinIcon className="w-4 h-4" />
                    </button>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500">
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="p-2 bg-slate-50 dark:bg-slate-800 border-b border-stone-border dark:border-slate-700 shrink-0">
                <div className="flex bg-slate-200 dark:bg-slate-700 rounded-lg p-1">
                    <button onClick={() => setTab('first')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${tab === 'first' ? 'bg-white dark:bg-slate-600 shadow text-townsfolk-blue' : 'text-slate-500'}`}>{t('form.firstNight')}</button>
                    <button onClick={() => setTab('other')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${tab === 'other' ? 'bg-white dark:bg-slate-600 shadow text-indigo-500' : 'text-slate-500'}`}>{t('form.otherNights')}</button>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                {displayOrder(tab).length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-moonlit-stone opacity-50">
                        <MoonIcon className="w-10 h-10 mb-2" />
                        <p className="text-xs">無行動</p>
                    </div>
                ) : (
                    displayOrder(tab).map((item, idx) => {
                        // Find all players with this character (e.g., Legion)
                        const matchedAssignments = assignments.filter(a => a.role?.id === item.characterId);
                        
                        // Fallback to finding character def if no assignment (shouldn't happen with filter, but good for safety)
                        const charDef = allCharacters.find(c => c.id === item.characterId);
                        const isPredefined = item.characterId.startsWith('predefined:');
                        
                        // Determine display info
                        const iconUrl = isPredefined ? null : (matchedAssignments[0]?.role?.iconUrl || charDef?.iconUrl);
                        const charName = isPredefined ? null : (charDef?.name || matchedAssignments[0]?.role?.name);
                        
                        return (
                            <div key={item.id} className="flex gap-3 p-3 rounded-lg border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm items-start hover:border-townsfolk-blue/50 transition-colors group">
                                <div className="font-mono text-xs font-bold text-slate-300 w-5 pt-1 text-center shrink-0 group-hover:text-townsfolk-blue">{idx + 1}</div>
                                
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        {/* Icon */}
                                        <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center overflow-hidden shrink-0">
                                            {iconUrl ? <img src={iconUrl} className="w-full h-full object-cover" /> : (
                                                isPredefined ? <ClockIcon className="w-4 h-4 text-slate-400"/> : <span className="text-[10px] font-bold text-white">{charName?.[0]}</span>
                                            )}
                                        </div>
                                        {/* Character Name */}
                                        {charName && <span className="text-xs font-bold text-celestial-gold truncate">{charName}</span>}
                                    </div>
                                    
                                    {/* Action Text */}
                                    <div className="text-sm text-ink-text dark:text-parchment leading-tight mb-1">{item.customText}</div>
                                    
                                    {/* Player Badges */}
                                    {!isPredefined && matchedAssignments.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {matchedAssignments.map(a => (
                                                <span key={a.player} className={`text-[10px] px-1.5 py-0.5 rounded border flex items-center gap-1 ${a.status === 'alive' ? 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' : 'bg-slate-200 text-slate-500 border-slate-300 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700 decoration-line-through'}`}>
                                                    #{a.player}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );

    // Responsive Rendering
    return (
        <>
            {/* Desktop Slide-in Panel */}
            <div 
                className={`
                    fixed inset-y-0 right-0 w-80 lg:w-96 z-40 transform transition-transform duration-300 ease-in-out
                    ${isOpen ? 'translate-x-0' : 'translate-x-full'}
                    hidden lg:block
                `}
                style={{ top: '0', height: '100%' }} // Ensure full height coverage inside GameRecordsView relative context if configured, but fixed works better here globally
            >
                {renderContent()}
            </div>

            {/* Desktop Backdrop (Only if NOT pinned and Open) */}
            {isOpen && !isPinned && (
                <div 
                    className="fixed inset-0 bg-black/20 backdrop-blur-[1px] z-30 hidden lg:block"
                    onClick={onClose}
                />
            )}

            {/* Mobile Modal Fallback */}
            <div className="lg:hidden">
                <Modal isOpen={isOpen} onClose={onClose} title={t('roleAssignment.helperNightOrder')}>
                    <div className="h-[70vh] flex flex-col -m-4">
                        {renderContent()}
                    </div>
                </Modal>
            </div>
        </>
    );
};

export const GameRecordsView: React.FC<GameRecordsViewProps> = ({ 
    t, gameRecords, setGameRecords, allCharacters, scripts, onAddRuleDoc, externalActiveId, onClearExternalId 
}) => {
    const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
    const [isAIModalOpen, setIsAIModalOpen] = useState(false);
    const [isNightHelperOpen, setIsNightHelperOpen] = useState(false);
    const [isNightHelperPinned, setIsNightHelperPinned] = useState(false); // New State
    const [isShowInfoOpen, setIsShowInfoOpen] = useState(false);
    const [editingPlayerIndex, setEditingPlayerIndex] = useState<number | null>(null); // For Player Detail Modal
    const [highlightedSeats, setHighlightedSeats] = useState<number[]>([]);
    const [mobileTab, setMobileTab] = useState<'grimoire' | 'logs' | 'console'>('grimoire');
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Filter & Search State
    const [searchTerm, setSearchTerm] = useState('');
    const [filterScript, setFilterScript] = useState('All');

    // Handler for Grimoire interactions (click on player)
    const [grimoireHandler, setGrimoireHandler] = useState<((playerIndex: number) => void) | null>(null);

    // Custom Marker State for Modal
    const [customMarkerText, setCustomMarkerText] = useState('');

    useEffect(() => {
        if (externalActiveId) {
            setSelectedRecordId(externalActiveId);
            onClearExternalId();
        }
    }, [externalActiveId, onClearExternalId]);

    // Sanitized Active Record Calculation
    // Critical Fix: Filter out null/undefined assignments or logs from sparse arrays (Firebase sync issue)
    const activeRecord = useMemo(() => {
        const record = gameRecords.find(r => r.id === selectedRecordId);
        if (!record) return null;

        // Ensure assignments are valid and have role data
        const cleanAssignments = (record.assignments || [])
            .filter(a => a && a.role && a.role.id)
            .map(a => ({
                ...a,
                statusMarkers: a.statusMarkers || [] // Ensure markers array exists
            }));

        // Ensure logs are valid
        const cleanLogs = (record.actionLog || []).filter(l => l);

        return {
            ...record,
            assignments: cleanAssignments,
            actionLog: cleanLogs
        };
    }, [gameRecords, selectedRecordId]);

    const currentScript = useMemo(() => 
        activeRecord ? scripts.find(s => s.name === activeRecord.scriptName) : null,
        [activeRecord, scripts]
    );

    // Derived Lists for Filtering
    const uniqueScripts = useMemo(() => Array.from(new Set(gameRecords.map(r => r.scriptName).filter(Boolean))), [gameRecords]);
    
    const filteredRecords = useMemo(() => {
        return gameRecords.filter(r => {
            const matchesSearch = (r.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                                  (r.scriptName || '').toLowerCase().includes(searchTerm.toLowerCase());
            const matchesScript = filterScript === 'All' || r.scriptName === filterScript;
            return matchesSearch && matchesScript;
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [gameRecords, searchTerm, filterScript]);

    // Character lookup helper
    const getCharacter = (id: string) => allCharacters.find(c => c.id === id);

    const updateCurrentRecord = (updater: (record: GameRecord) => GameRecord) => {
        if (!selectedRecordId) return;
        setGameRecords(prev => prev.map(r => r.id === selectedRecordId ? updater(r) : r));
    };

    const handleDeleteRecord = (id: string) => {
        if (window.confirm(t('gameRecords.deleteConfirm'))) {
            setGameRecords(prev => prev.filter(r => r.id !== id));
            if (selectedRecordId === id) setSelectedRecordId(null);
        }
    };

    // --- Import/Export Records ---
    const handleExportJSON = () => {
        const data = JSON.stringify(gameRecords, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `botc_records_backup_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const imported = JSON.parse(event.target?.result as string);
                if (Array.isArray(imported)) {
                    if (window.confirm(`確定匯入 ${imported.length} 條記錄嗎？系統將自動合併並略過重複的 ID。`)) {
                        setGameRecords(prev => {
                            const existingIds = new Set(prev.map(r => r.id));
                            const newRecords = imported.filter((r: GameRecord) => !existingIds.has(r.id));
                            return [...newRecords, ...prev];
                        });
                        alert('匯入完成！');
                    }
                } else {
                    alert('檔案格式錯誤：必須是對局記錄的陣列 (Array)。');
                }
            } catch (err) {
                alert('匯入失敗，請檢查檔案格式。');
                console.error(err);
            }
            if (fileInputRef.current) fileInputRef.current.value = '';
        };
        reader.readAsText(file);
    };

    // --- Browser Native Print Implementation ---
    const handleExportPDF = () => {
        if (!activeRecord) return;

        // 1. Generate HTML Content string
        const styles = `
            @import url('https://cdn.tailwindcss.com');
            body { font-family: sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .print-container { padding: 20px; max-width: 800px; margin: 0 auto; }
            .page-break { page-break-before: always; }
            .role-icon { width: 30px; height: 30px; border-radius: 50%; object-fit: cover; border: 1px solid #ccc; }
            .status-badge { padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; border: 1px solid #ccc; display: inline-block; margin-right: 2px; }
            .log-item { padding: 8px 0; border-bottom: 1px dashed #eee; font-size: 12px; }
            .grid-cols-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
            .card { border: 1px solid #ddd; border-radius: 8px; padding: 8px; text-align: center; page-break-inside: avoid; }
        `;

        const safeAssignments = activeRecord.assignments || [];
        const assignmentsHTML = safeAssignments.map(a => `
            <div class="card ${a.alignment === 'evil' ? 'bg-red-50 border-red-200' : 'bg-white'}">
                <div class="font-bold text-sm">#${a.player} ${a.role.name}</div>
                <div class="text-xs text-gray-500">${a.role.characterType}</div>
                ${a.pretendRole ? `<div class="text-xs text-purple-600 italic">(${a.pretendRole.name})</div>` : ''}
                <div class="mt-1">
                    <span class="status-badge ${a.status === 'alive' ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'}">${t(`playerStatus.${a.status}`)}</span>
                    ${a.statusMarkers.map(m => `<span class="status-badge bg-white">${m.text}</span>`).join('')}
                </div>
            </div>
        `).join('');

        const safeLogs = activeRecord.actionLog || [];
        const logsHTML = safeLogs.map(log => {
            if (log.type === 'phase_marker') {
                return `<div class="font-bold bg-gray-100 p-2 mt-4 text-xs uppercase tracking-wide border-t border-b border-gray-300">${t(`roleAssignment.${log.phase}`, { day: log.dayNumber })}</div>`;
            }
            let content = '';
            if (log.type === 'note') content = log.text;
            else if (log.type === 'nomination') {
                const n1 = getCharacter(log.nominatorId)?.name || 'Unknown';
                const n2 = getCharacter(log.nomineeId)?.name || 'Unknown';
                content = `<strong>${n1}</strong> 提名 <strong>${n2}</strong> (${log.voters?.length || 0} 票)`;
            } else if (log.type === 'execution') {
                const n = getCharacter(log.nomineeId)?.name || 'Unknown';
                content = log.outcome === 'executed' ? `<span class="text-red-600 font-bold">[處決] ${n} 死亡</span>` : `<span class="text-blue-600 font-bold">[平安] ${n} 獲釋`;
            } else if (log.type === 'character_change') {
                const c1 = getCharacter(log.oldRoleId)?.name || '?';
                const c2 = getCharacter(log.newRoleId)?.name || '?';
                content = `[身份變更] #${log.playerIndex} ${c1} -> ${c2}`;
            }
            return `<div class="log-item">${content}</div>`;
        }).join('');

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>${activeRecord.name} - Replay</title>
                <script src="https://cdn.tailwindcss.com"></script>
                <style>${styles}</style>
            </head>
            <body>
                <div class="print-container">
                    <h1 class="text-2xl font-bold mb-2">${activeRecord.name}</h1>
                    <div class="text-sm text-gray-600 mb-6 flex gap-4">
                        <span>劇本: ${activeRecord.scriptName}</span>
                        <span>日期: ${new Date(activeRecord.date).toLocaleDateString()}</span>
                        <span>人數: ${activeRecord.playerCount}</span>
                    </div>

                    <h2 class="text-lg font-bold mb-3 border-b-2 border-gray-800 pb-1">魔典配置 (Grimoire)</h2>
                    <div class="grid-cols-3 mb-8">
                        ${assignmentsHTML}
                    </div>

                    <h2 class="text-lg font-bold mb-3 border-b-2 border-gray-800 pb-1 page-break">對局日誌 (Timeline)</h2>
                    <div>
                        ${logsHTML}
                    </div>
                </div>
            </body>
            </html>
        `;

        // 2. Create hidden iframe
        const iframe = document.createElement('iframe');
        iframe.style.position = 'absolute';
        iframe.style.width = '0px';
        iframe.style.height = '0px';
        iframe.style.border = 'none';
        document.body.appendChild(iframe);

        // 3. Write content
        const doc = iframe.contentWindow?.document;
        if (doc) {
            doc.open();
            doc.write(htmlContent);
            doc.close();

            // 4. Wait for styles/images then print
            // Using a timeout is the most reliable cross-browser way for injected content
            setTimeout(() => {
                iframe.contentWindow?.focus();
                iframe.contentWindow?.print();
                // 5. Cleanup
                setTimeout(() => document.body.removeChild(iframe), 1000);
            }, 500);
        }
    };

    // ... (handleToggleStatus, handleAddMarker, handleRemoveMarker, handleAddPlayer, handleRemovePlayer, handleAddLog, handleUpdateLog, handleDeleteLog, handleDeletePhase, handleMoveLog, handleInsertLog, handleAdvancePhase, handleRewindPhase, handleAutoStateUpdate, handlePlayerClick, renderGrimoire logic remains unchanged) ...
    // Copied Logic for context completeness but summarized for brevity in this output block
    const handleToggleStatus = (playerIndex: number) => {
        updateCurrentRecord(r => {
            const assignment = r.assignments?.find(a => a.player === playerIndex);
            if (!assignment) return r;
            const newStatus = assignment.status === 'alive' ? 'dead' : 'alive';
            let newMarkers = [...(assignment.statusMarkers || [])];
            if (newStatus === 'dead') {
                if (!newMarkers.some(m => m.id === 'ghostVote')) {
                    newMarkers.push({ id: 'ghostVote', text: t('statusMarkers.ghostVote.text') || '死人票', icon: '👻', color: 'text-indigo-600 border-indigo-600 bg-indigo-50' });
                }
            } else {
                newMarkers = newMarkers.filter(m => m.id !== 'ghostVote');
            }
            const actionText = newStatus === 'dead' ? (t('keywords.townsfolk.died') || '死亡') : (t('keywords.townsfolk.revived') || '復活');
            const logEntry: ActionLogEntry = { id: uuidv4(), type: 'note', characterId: assignment.role.id, text: `[狀態變更] #${playerIndex} ${assignment.role.name} ${actionText}` };
            return { ...r, assignments: r.assignments?.map(a => a.player === playerIndex ? { ...a, status: newStatus, statusMarkers: newMarkers } : a) || [], actionLog: [...(r.actionLog || []), logEntry] };
        });
    };
    const handleAddMarker = (playerIndex: number, marker: StatusMarker) => { updateCurrentRecord(r => ({ ...r, assignments: r.assignments?.map(a => { if (a.player !== playerIndex) return a; const currentMarkers = a.statusMarkers || []; if (currentMarkers.some(m => m.id === marker.id && marker.id !== 'custom')) return a; return { ...a, statusMarkers: [...currentMarkers, marker] }; }) || [] })); };
    const handleRemoveMarker = (playerIndex: number, markerId: string) => { updateCurrentRecord(r => ({ ...r, assignments: r.assignments?.map(a => a.player === playerIndex ? { ...a, statusMarkers: (a.statusMarkers || []).filter(m => m.id !== markerId) } : a) || [] })); };
    const handleAddPlayer = () => {
        updateCurrentRecord(r => {
            const currentAssignments = r.assignments || [];
            const nextPlayerNum = currentAssignments.length > 0 ? Math.max(...currentAssignments.map(a => a.player)) + 1 : 1;
            const newAssignment: Assignment = { player: nextPlayerNum, role: { id: 'unknown', name: '新加入玩家', characterType: 'Traveler', abilityType: ['Standard'], ability: '', reminders: [], scriptIds: [] } as Character, status: 'alive', revealed: false, statusMarkers: [], alignment: 'good' };
            const logEntry: ActionLogEntry = { id: uuidv4(), type: 'note', characterId: 'storyteller', text: `[系統] 新增玩家 #${nextPlayerNum} 加入遊戲。` };
            return { ...r, assignments: [...currentAssignments, newAssignment], playerCount: r.playerCount + 1, actionLog: [...(r.actionLog || []), logEntry] };
        });
    };
    const handleRemovePlayer = (playerNum: number) => {
        if (!window.confirm(`確定要刪除玩家 #${playerNum} 嗎？此操作會將其完全從魔典移除。`)) return;
        updateCurrentRecord(r => {
            const logEntry: ActionLogEntry = { id: uuidv4(), type: 'note', characterId: 'storyteller', text: `[系統] 玩家 #${playerNum} 已從遊戲中移除。` };
            return { ...r, assignments: (r.assignments || []).filter(a => a.player !== playerNum), playerCount: Math.max(0, r.playerCount - 1), actionLog: [...(r.actionLog || []), logEntry] };
        });
    };
    const handleAddLog = (entryData: NewActionLogEntryData) => {
        updateCurrentRecord(r => {
            let newAssignments = r.assignments || [];
            if (entryData.type === 'character_change') {
                const newRole = allCharacters.find(c => c.id === entryData.newRoleId);
                if (newRole) { newAssignments = newAssignments.map(a => { if (a.player === entryData.playerIndex) { return { ...a, role: newRole }; } return a; }); }
            }
            return { ...r, assignments: newAssignments, actionLog: [...(r.actionLog || []), { ...entryData, id: uuidv4() }] };
        });
    };
    const handleUpdateLog = (updatedLog: ActionLogEntry) => { updateCurrentRecord(r => ({ ...r, actionLog: (r.actionLog || []).map(l => l.id === updatedLog.id ? updatedLog : l) })); };
    const handleDeleteLog = (logId: string) => { updateCurrentRecord(r => ({ ...r, actionLog: (r.actionLog || []).filter(l => l.id !== logId) })); };
    const handleDeletePhase = (phaseId: string) => { handleDeleteLog(phaseId); };
    const handleMoveLog = (logId: string, direction: 'up' | 'down') => {
        updateCurrentRecord(r => {
            const logs = [...(r.actionLog || [])];
            const index = logs.findIndex(l => l.id === logId);
            if (index === -1) return r;
            if (direction === 'up' && index > 0) { [logs[index], logs[index - 1]] = [logs[index - 1], logs[index]]; } 
            else if (direction === 'down' && index < logs.length - 1) { [logs[index], logs[index + 1]] = [logs[index + 1], logs[index]]; }
            return { ...r, actionLog: logs };
        });
    };
    const handleInsertLog = (targetLogId: string, entryData: NewActionLogEntryData) => {
        updateCurrentRecord(r => {
            const logs = [...(r.actionLog || [])];
            const index = logs.findIndex(l => l.id === targetLogId);
            if (index === -1) return r;
            const newLog = { ...entryData, id: uuidv4() };
            logs.splice(index + 1, 0, newLog);
            return { ...r, actionLog: logs };
        });
    };
    const handleAdvancePhase = () => {
        updateCurrentRecord(r => {
            let nextPhase = r.currentPhase;
            let nextDay = r.dayNumber;
            if (r.currentPhase === 'FirstNight') { nextPhase = 'Day'; nextDay = 1; } 
            else if (r.currentPhase === 'Day') { nextPhase = 'Night'; } 
            else { nextPhase = 'Day'; nextDay += 1; }
            const newLog: ActionLogEntry = { id: uuidv4(), type: 'phase_marker', phase: nextPhase, dayNumber: nextDay };
            return { ...r, currentPhase: nextPhase, dayNumber: nextDay, actionLog: [...(r.actionLog || []), newLog] };
        });
    };
    const handleRewindPhase = () => {
        updateCurrentRecord(r => {
            let prevPhase = r.currentPhase;
            let prevDay = r.dayNumber;
            if (r.currentPhase === 'Day') {
                if (r.dayNumber === 1) { prevPhase = 'FirstNight'; prevDay = 0; } 
                else { prevPhase = 'Night'; prevDay = r.dayNumber - 1; }
            } else if (r.currentPhase === 'Night') { prevPhase = 'Day'; }
            return { ...r, currentPhase: prevPhase, dayNumber: prevDay };
        });
    };
    const handleAutoStateUpdate = (targetIds: string[], action: string, logEntry?: NewActionLogEntryData) => {
        updateCurrentRecord(r => {
            const newAssignments = (r.assignments || []).map(a => {
                if (a.role && targetIds.includes(a.role.id)) {
                    const newMarkers = [...(a.statusMarkers || [])];
                    let newStatus = a.status;
                    let newAlignment = a.alignment;
                    if (action === 'died') {
                        newStatus = 'dead';
                        if (!newMarkers.some(m => m.id === 'ghostVote')) { newMarkers.push({ id: 'ghostVote', text: '死人票', icon: '👻', color: 'text-indigo-600 border-indigo-600 bg-indigo-50' }); }
                    } else if (action === 'revived') {
                        newStatus = 'alive';
                        const idx = newMarkers.findIndex(m => m.id === 'ghostVote');
                        if (idx !== -1) newMarkers.splice(idx, 1);
                    } else if (action === 'set_good') { newAlignment = 'good'; } 
                    else if (action === 'set_evil') { newAlignment = 'evil'; } 
                    else {
                        const markerMap: Record<string, any> = { 'poisoned': { id: 'poisoned', text: '中毒', icon: '🤢', color: 'text-green-700 border-green-700 bg-green-50' }, 'drunk': { id: 'drunk', text: '酒醉', icon: '🍺', color: 'text-amber-600 border-amber-600 bg-amber-50' }, 'maddened': { id: 'maddened', text: '瘋狂', icon: '🤪', color: 'text-purple-600 border-purple-600 bg-purple-50' }, 'normal': null };
                        if (action === 'normal') { ['poisoned', 'drunk', 'maddened'].forEach(mid => { const idx = newMarkers.findIndex(m => m.id === mid); if (idx !== -1) newMarkers.splice(idx, 1); }); } 
                        else { const def = markerMap[action]; if (def) { if (!newMarkers.some(m => m.id === def.id)) { newMarkers.push(def); } } }
                    }
                    return { ...a, status: newStatus, statusMarkers: newMarkers, alignment: newAlignment };
                }
                return a;
            });
            return { ...r, assignments: newAssignments, actionLog: logEntry ? [...(r.actionLog || []), { ...logEntry, id: uuidv4() }] : (r.actionLog || []) };
        });
    };
    const handlePlayerClick = (playerIndex: number) => {
        if (grimoireHandler) { grimoireHandler(playerIndex); } else { setEditingPlayerIndex(playerIndex); }
    };
    const renderGrimoire = () => {
        if (!activeRecord) return null;
        const assignments = activeRecord.assignments;
        return (
            <div className="h-full flex flex-col bg-slate-100 dark:bg-black/50 relative">
                <GameStatsBar assignments={assignments} />
                <div className="flex items-center justify-between px-3 py-2 border-b border-stone-border dark:border-slate-700 bg-white dark:bg-slate-900/50">
                    <span className="text-xs font-bold text-moonlit-stone uppercase tracking-wider">魔典配置</span>
                    <button onClick={handleAddPlayer} className="px-2 py-1 text-xs bg-townsfolk-blue text-white rounded hover:bg-blue-600 transition-colors flex items-center gap-1 shadow-sm"><PlusIcon className="w-3 h-3"/> 新增玩家</button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                    <div className="flex flex-col space-y-2">
                        {assignments.map(a => {
                            if (!a || !a.role) return null;
                            const isAlive = a.status === 'alive';
                            const isHighlighted = highlightedSeats.includes(a.player);
                            return (
                                <div key={a.player} onClick={() => handlePlayerClick(a.player)} className={`group relative flex items-center gap-3 p-2 rounded-lg border transition-all cursor-pointer select-none ${isHighlighted ? 'ring-2 ring-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 z-10' : 'hover:border-townsfolk-blue'} ${isAlive ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700' : 'bg-slate-200 dark:bg-slate-900 border-slate-300 dark:border-slate-800 opacity-70 grayscale-[0.5]'}`}>
                                    <div className="relative shrink-0">
                                        <div className={`w-10 h-10 rounded-full overflow-hidden border ${isAlive ? 'border-slate-200 dark:border-slate-600' : 'border-slate-400 dark:border-slate-700'}`}>
                                            {a.role.iconUrl ? <img src={a.role.iconUrl} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center bg-slate-500 text-white text-sm font-bold">{a.role.name?.[0] || '?'}</div>}
                                        </div>
                                        <span className="absolute -top-1 -left-1 bg-slate-700 text-white text-[9px] px-1.5 py-0.5 rounded-full font-mono font-bold shadow-sm">#{a.player}</span>
                                    </div>
                                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-sm font-bold truncate ${isAlive ? 'text-ink-text dark:text-parchment' : 'text-slate-500 line-through decoration-slate-400'}`}>{a.role.name}</span>
                                            {a.pretendRole && <span className="text-[10px] text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30 px-1.5 rounded truncate max-w-[80px]">偽裝: {a.pretendRole.name}</span>}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-1 mt-1">
                                            <span className={`text-[9px] px-1.5 py-0.5 rounded border uppercase font-bold ${isAlive ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' : 'bg-slate-300 text-slate-600 border-slate-400 dark:bg-slate-800 dark:text-slate-400'}`}>{t(`playerStatus.${a.status}`)}</span>
                                            <span className={`text-[9px] px-1.5 py-0.5 rounded border uppercase font-bold ${a.alignment === 'evil' ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400' : 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400'}`}>{a.alignment === 'evil' ? '邪惡' : '善良'}</span>
                                            {(a.statusMarkers || []).map(m => <span key={m.id} className={`text-[9px] px-1.5 py-0.5 rounded border flex items-center gap-1 ${m.color}`}>{m.icon} {m.text}</span>)}
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                        <button onClick={(e) => { e.stopPropagation(); handleToggleStatus(a.player); }} className={`p-1.5 rounded-md transition-colors ${isAlive ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-green-100 text-green-600 hover:bg-green-200'}`} title={isAlive ? "標記死亡" : "復活"}>{isAlive ? <span className="text-xs font-bold">☠️</span> : <span className="text-xs font-bold">❤️</span>}</button>
                                        <button onClick={(e) => { e.stopPropagation(); handleRemovePlayer(a.player); }} className="p-1.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-500 hover:text-red-500 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors" title="移除玩家"><TrashIcon className="w-3.5 h-3.5"/></button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };

    if (!activeRecord) {
        return (
            <div className="absolute inset-0 p-4 md:p-8 flex flex-col overflow-hidden max-w-7xl mx-auto w-full">
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 shrink-0">
                    <h2 className="text-3xl font-bold font-serif text-celestial-gold">{t('gameRecords.title')}</h2>
                    
                    {/* Backup Controls */}
                    <div className="flex gap-2">
                        <button 
                            onClick={handleExportJSON}
                            disabled={gameRecords.length === 0}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-ink-text dark:text-parchment rounded-md font-bold text-sm hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-50"
                        >
                            <ArrowDownTrayIcon className="w-4 h-4" /> 備份記錄 (JSON)
                        </button>
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-ink-text dark:text-parchment rounded-md font-bold text-sm hover:bg-slate-300 dark:hover:bg-slate-600"
                        >
                            <ArrowUpTrayIcon className="w-4 h-4" /> 匯入備份
                        </button>
                        <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleImportJSON} />
                    </div>
                </div>

                {/* Filter Bar */}
                <div className="mb-6 flex flex-col md:flex-row gap-4 bg-slate-100 dark:bg-slate-800/50 p-4 rounded-xl border border-stone-border dark:border-slate-700">
                    <div className="relative flex-grow">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"/>
                        <input 
                            type="text" 
                            placeholder={t('header.searchPlaceholder')} 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-black/20 focus:ring-2 focus:ring-townsfolk-blue outline-none"
                        />
                    </div>
                    <div className="relative min-w-[200px]">
                        <FunnelIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"/>
                        <select 
                            value={filterScript} 
                            onChange={(e) => setFilterScript(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-black/20 focus:ring-2 focus:ring-townsfolk-blue outline-none appearance-none"
                        >
                            <option value="All">{t('form.availableScripts')}</option>
                            {uniqueScripts.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto pb-24">
                    {filteredRecords.length === 0 ? (
                        <div className="col-span-full py-20 text-center text-moonlit-stone border-2 border-dashed border-slate-gray/30 rounded-xl">
                            {gameRecords.length === 0 ? t('gameRecords.noRecords') : '沒有找到符合條件的記錄'}
                        </div>
                    ) : (
                        filteredRecords.map(r => (
                            <div key={r.id} onClick={() => setSelectedRecordId(r.id)} className="bg-parchment-white dark:bg-midnight-ink border border-stone-border dark:border-slate-gray rounded-lg p-4 cursor-pointer hover:border-townsfolk-blue transition-all shadow-sm group relative">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-lg text-ink-text dark:text-parchment truncate pr-6">{r.name || t('gameRecords.unnamedSession')}</h3>
                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteRecord(r.id); }} className="text-slate-400 hover:text-demon-fire p-1 absolute top-3 right-3"><TrashIcon className="w-4 h-4"/></button>
                                </div>
                                <div className="text-xs text-moonlit-stone space-y-1">
                                    <div className="flex items-center gap-2"><CalendarIcon className="w-3 h-3"/> {new Date(r.date).toLocaleDateString()} {new Date(r.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                                    <div className="flex items-center gap-2"><UserGroupIcon className="w-3 h-3"/> {r.playerCount} Players ({r.scriptName})</div>
                                    <div className="flex items-center gap-2"><ClockIcon className="w-3 h-3"/> {t(`roleAssignment.${r.currentPhase}`, {day: r.dayNumber})}</div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        );
    }

    // Safely derived editing assignment
    const editingAssignment = editingPlayerIndex !== null && activeRecord.assignments 
        ? activeRecord.assignments.find(a => a.player === editingPlayerIndex) 
        : null;

    return (
        <div className="absolute inset-0 flex flex-col bg-daylight-bg dark:bg-ravens-night overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-3 bg-white dark:bg-midnight-ink border-b border-stone-border dark:border-slate-gray shrink-0 z-20 shadow-sm">
                <div className="flex items-center gap-3 overflow-hidden">
                    <button onClick={() => setSelectedRecordId(null)} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"><ArrowLeftIcon className="w-5 h-5"/></button>
                    <div>
                        <h2 className="font-bold text-lg truncate leading-tight">{activeRecord.name}</h2>
                        <p className="text-xs text-moonlit-stone truncate">{activeRecord.scriptName} | Day {activeRecord.dayNumber} - {t(`roleAssignment.${activeRecord.currentPhase}`, { day: activeRecord.dayNumber })}</p>
                    </div>
                </div>
                <div className="flex gap-2 shrink-0">
                    <button onClick={handleExportPDF} className="p-2 bg-slate-200 dark:bg-slate-700 text-ink-text dark:text-parchment rounded-md shadow hover:brightness-110 transition-all flex items-center gap-1.5" title="匯出 PDF">
                        <DocumentArrowDownIcon className="w-4 h-4"/> <span className="hidden sm:inline">PDF</span>
                    </button>
                    <button onClick={() => setIsNightHelperOpen(true)} className="p-2 bg-slate-200 dark:bg-slate-700 text-ink-text dark:text-parchment rounded-md shadow hover:brightness-110 transition-all flex items-center gap-1.5" title="夜晚行動順序">
                        <MoonIcon className="w-4 h-4"/> <span className="hidden sm:inline">夜序</span>
                    </button>
                    <button onClick={() => setIsShowInfoOpen(true)} className="p-2 bg-slate-200 dark:bg-slate-700 text-ink-text dark:text-parchment rounded-md shadow hover:brightness-110 transition-all flex items-center gap-1.5" title="展示資訊">
                        <EyeIcon className="w-4 h-4"/> <span className="hidden sm:inline">展示</span>
                    </button>
                    <button onClick={() => setIsAIModalOpen(true)} className="p-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-md shadow hover:brightness-110 transition-all flex items-center gap-1.5">
                        <SparklesIcon className="w-4 h-4"/> <span className="hidden sm:inline">AI 分析</span>
                    </button>
                </div>
            </div>

            {/* Desktop Layout (3 Columns) */}
            <div className="hidden lg:grid lg:grid-cols-12 w-full flex-1 overflow-hidden relative">
                {/* Left Column: Grimoire (3 cols) */}
                <div className="lg:col-span-3 h-full border-r border-stone-border dark:border-slate-gray overflow-hidden">
                    {renderGrimoire()}
                </div>

                {/* Middle Column: Logs (5 cols) */}
                <div className="lg:col-span-5 h-full flex flex-col bg-white dark:bg-ravens-night overflow-hidden">
                    <div className="flex-1 overflow-hidden relative">
                        <ActionLogList 
                            game={activeRecord} 
                            assignments={activeRecord.assignments} 
                            getCharacter={getCharacter} 
                            onUpdateLog={handleUpdateLog}
                            onDeleteLog={handleDeleteLog}
                            onDeletePhase={handleDeletePhase}
                            onAddLog={handleAddLog}
                            onMoveLog={handleMoveLog}
                            onInsertLog={handleInsertLog}
                            handleSetPlayerStatus={(id, s) => {
                                const p = activeRecord.assignments.find(x => x.role && x.role.id === id);
                                if(p) handleToggleStatus(p.player);
                            }}
                            t={t}
                            currentScript={currentScript}
                            onHighlight={setHighlightedSeats}
                        />
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-black/20 border-t border-stone-border dark:border-slate-700 shrink-0">
                        <PhaseAdvanceButton 
                            currentPhase={activeRecord.currentPhase} 
                            dayNumber={activeRecord.dayNumber} 
                            onAdvance={handleAdvancePhase} 
                            onRewind={handleRewindPhase}
                            t={t} 
                        />
                    </div>
                </div>

                {/* Right Column: Input (4 cols) */}
                <div className="lg:col-span-4 h-full border-l border-stone-border dark:border-slate-700 bg-parchment-white dark:bg-midnight-ink overflow-hidden">
                    <ActionLogInput 
                        assignments={activeRecord.assignments} 
                        allCharacters={allCharacters} 
                        scriptCharacters={currentScript?.characterIds.map(id => getCharacter(id)).filter(Boolean) as Character[]}
                        actionLog={activeRecord.actionLog}
                        onAddLog={handleAddLog} 
                        onAutoStateUpdate={handleAutoStateUpdate}
                        t={t}
                        setHighlights={setHighlightedSeats}
                        registerGrimoireHandler={setGrimoireHandler}
                    />
                </div>

                {/* Night Helper Panel (Desktop) */}
                <NightHelperPanel 
                    isOpen={isNightHelperOpen} 
                    onClose={() => setIsNightHelperOpen(false)} 
                    script={currentScript} 
                    assignments={activeRecord.assignments}
                    allCharacters={allCharacters}
                    t={t} 
                    isPinned={isNightHelperPinned}
                    onTogglePin={() => setIsNightHelperPinned(!isNightHelperPinned)}
                />
            </div>

            {/* Mobile Layout (Tabs) */}
            <div className="lg:hidden flex-1 flex flex-col min-h-0 overflow-hidden">
                {/* Mobile Tab Bar (Moved to top for better visibility) */}
                <div className="flex bg-white dark:bg-midnight-ink border-b border-stone-border dark:border-slate-700 shrink-0 shadow-sm z-30">
                     {[ 
                         { id: 'grimoire', label: '魔典配置', icon: UserGroupIcon }, 
                         { id: 'logs', label: '日誌', icon: ListBulletIcon }, 
                         { id: 'console', label: '說書人面板', icon: SparklesIcon } 
                     ].map(tab => (
                         <button 
                            key={tab.id} 
                            onClick={() => setMobileTab(tab.id as any)} 
                            className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 transition-all border-b-2 ${mobileTab === tab.id ? 'text-townsfolk-blue border-townsfolk-blue bg-blue-50 dark:bg-blue-900/20 font-bold' : 'text-moonlit-stone border-transparent font-medium'}`}
                         >
                             <tab.icon className="w-4 h-4 shrink-0"/>
                             <span className="text-xs whitespace-nowrap">{tab.label}</span>
                         </button>
                     ))}
                </div>

                <div className="flex-1 relative min-h-0 overflow-hidden">
                    {mobileTab === 'grimoire' && (
                        <div className="absolute inset-0 overflow-hidden">
                            {renderGrimoire()}
                        </div>
                    )}
                    {mobileTab === 'logs' && (
                        <div className="absolute inset-0 flex flex-col overflow-hidden">
                            <div className="flex-1 min-h-0 relative overflow-hidden">
                                <ActionLogList 
                                    game={activeRecord} 
                                    assignments={activeRecord.assignments} 
                                    getCharacter={getCharacter} 
                                    onUpdateLog={handleUpdateLog}
                                    onDeleteLog={handleDeleteLog}
                                    onDeletePhase={handleDeletePhase}
                                    onAddLog={handleAddLog}
                                    onMoveLog={handleMoveLog}
                                    onInsertLog={handleInsertLog}
                                    handleSetPlayerStatus={(id, s) => {
                                        const p = activeRecord.assignments.find(x => x.role && x.role.id === id);
                                        if(p) handleToggleStatus(p.player);
                                    }}
                                    t={t}
                                    currentScript={currentScript}
                                    onHighlight={setHighlightedSeats}
                                />
                            </div>
                            <div className="p-3 bg-slate-50 dark:bg-black/20 border-t border-stone-border dark:border-slate-700 shrink-0">
                                <PhaseAdvanceButton 
                                    currentPhase={activeRecord.currentPhase} 
                                    dayNumber={activeRecord.dayNumber} 
                                    onAdvance={handleAdvancePhase} 
                                    onRewind={handleRewindPhase}
                                    t={t} 
                                />
                            </div>
                        </div>
                    )}
                    {mobileTab === 'console' && (
                        <div className="absolute inset-0 bg-parchment-white dark:bg-midnight-ink overflow-hidden">
                            <ActionLogInput 
                                assignments={activeRecord.assignments} 
                                allCharacters={allCharacters} 
                                scriptCharacters={currentScript?.characterIds.map(id => getCharacter(id)).filter(Boolean) as Character[]}
                                actionLog={activeRecord.actionLog}
                                onAddLog={handleAddLog} 
                                onAutoStateUpdate={handleAutoStateUpdate}
                                t={t}
                                setHighlights={setHighlightedSeats}
                                registerGrimoireHandler={setGrimoireHandler}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            <AIAnalysisModal 
                isOpen={isAIModalOpen} 
                onClose={() => setIsAIModalOpen(false)} 
                gameRecord={activeRecord} 
                onSaveToRules={onAddRuleDoc} 
                t={t} 
            />

            <ShowInfoModal
                isOpen={isShowInfoOpen}
                onClose={() => setIsShowInfoOpen(false)}
                allCharacters={allCharacters}
                charactersInScript={currentScript?.characterIds.map(id => getCharacter(id)).filter(Boolean) as Character[] || []}
                assignments={activeRecord.assignments}
                bluffRoleIds={activeRecord.bluffRoleIds || []}
                t={t}
            />

            {/* Mobile Night Helper Modal (Hidden on Desktop, Logic handled in NightHelperPanel) */}
            <NightHelperPanel 
                isOpen={isNightHelperOpen} 
                onClose={() => setIsNightHelperOpen(false)} 
                script={currentScript} 
                assignments={activeRecord.assignments}
                allCharacters={allCharacters}
                t={t} 
                isPinned={isNightHelperPinned}
                onTogglePin={() => setIsNightHelperPinned(!isNightHelperPinned)}
            />

            {editingAssignment && (
                <Modal isOpen={true} onClose={() => setEditingPlayerIndex(null)} title={`玩家 #${editingAssignment.player} 狀態管理`}>
                    <div className="space-y-6">
                        <div className="flex items-center gap-4 bg-slate-100 dark:bg-slate-800 p-4 rounded-lg">
                            <div className="w-16 h-16 rounded-full overflow-hidden bg-midnight-ink border-2 border-slate-500">
                                {editingAssignment.role.iconUrl ? <img src={editingAssignment.role.iconUrl} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-2xl font-bold">{editingAssignment.role.name?.[0] || '?'}</div>}
                            </div>
                            <div>
                                <h3 className="text-xl font-bold">{editingAssignment.role.name}</h3>
                                <p className="text-sm text-moonlit-stone">{t(`characterType.${editingAssignment.role.characterType}`)}</p>
                            </div>
                            <button 
                                onClick={() => handleToggleStatus(editingAssignment.player)}
                                className={`ml-auto px-4 py-2 rounded-full font-bold transition-all ${editingAssignment.status === 'alive' ? 'bg-green-500 text-white' : 'bg-slate-600 text-slate-300'}`}
                            >
                                {t(`playerStatus.${editingAssignment.status}`)}
                            </button>
                        </div>

                        <div>
                            <h4 className="font-bold text-moonlit-stone mb-2 uppercase text-xs">現有標記</h4>
                            <div className="flex flex-wrap gap-2">
                                {(editingAssignment.statusMarkers || []).length === 0 && <span className="text-sm text-slate-400 italic">無標記</span>}
                                {(editingAssignment.statusMarkers || []).map((m, idx) => (
                                    <span key={idx} className={`px-2 py-1 rounded-md text-sm border flex items-center gap-2 ${m.color}`}>
                                        {m.icon} {m.text}
                                        <button onClick={() => handleRemoveMarker(editingAssignment.player, m.id)} className="hover:text-red-500"><XMarkIcon className="w-4 h-4"/></button>
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div>
                            <h4 className="font-bold text-moonlit-stone mb-2 uppercase text-xs">新增標記</h4>
                            <div className="grid grid-cols-3 gap-2 mb-3">
                                {[
                                    { id: 'poisoned', text: '中毒', icon: '🤢', color: 'text-green-700 border-green-700 bg-green-50' },
                                    { id: 'drunk', text: '酒醉', icon: '🍺', color: 'text-amber-600 border-amber-600 bg-amber-50' },
                                    { id: 'maddened', text: '瘋狂', icon: '🤪', color: 'text-purple-600 border-purple-600 bg-purple-50' },
                                    { id: 'deadVote', text: '死人票', icon: '👻', color: 'text-indigo-600 border-indigo-600 bg-indigo-50' },
                                    { id: 'protected', text: '保護', icon: '🛡️', color: 'text-blue-600 border-blue-600 bg-blue-50' }
                                ].map(m => (
                                    <button 
                                        key={m.id} 
                                        onClick={() => handleAddMarker(editingAssignment.player, m)}
                                        className={`flex items-center justify-center gap-1 py-2 rounded border text-xs font-bold transition-all hover:brightness-95 ${m.color.replace('bg-', 'bg-opacity-20 ')}`}
                                    >
                                        {m.icon} {m.text}
                                    </button>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    value={customMarkerText} 
                                    onChange={e => setCustomMarkerText(e.target.value)} 
                                    placeholder="自定義標記..." 
                                    className="flex-1 px-3 py-2 rounded bg-white dark:bg-black border border-stone-border dark:border-slate-700 text-sm"
                                />
                                <button 
                                    onClick={() => {
                                        if(customMarkerText.trim()) {
                                            handleAddMarker(editingAssignment.player, { id: `custom-${Date.now()}`, text: customMarkerText, icon: '📌', color: 'text-slate-600 border-slate-600 bg-slate-100' });
                                            setCustomMarkerText('');
                                        }
                                    }}
                                    className="px-4 py-2 bg-slate-200 dark:bg-slate-700 rounded hover:bg-slate-300 dark:hover:bg-slate-600"
                                >
                                    <PlusIcon className="w-5 h-5"/>
                                </button>
                            </div>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};
