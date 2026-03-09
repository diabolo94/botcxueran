
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Script, Character, Assignment, GameRecord, SavedSetup, CharacterType } from '../types';
import { Modal } from './Modal';
import { 
    UserGroupIcon, SparklesIcon, ArrowPathIcon, 
    PlayIcon, PlusIcon, TrashIcon, BookmarkIcon,
    MoonIcon, EyeIcon, PencilIcon, ArrowDownTrayIcon,
    ChevronDownIcon, ChevronUpIcon, XMarkIcon,
    Bars3Icon, SearchIcon, CheckCircleIcon, ArrowsRightLeftIcon,
    ChevronLeftIcon, ChevronRightIcon
} from './Icons';

interface RoleAssignmentViewProps {
    allScripts: Script[];
    allCharacters: Character[];
    t: (key: string, options?: any) => string;
    onStartGame: (record: GameRecord) => void;
    savedSetups: SavedSetup[];
    setSavedSetups: React.Dispatch<React.SetStateAction<SavedSetup[]>>;
}

// Helper: Shuffle Array
function shuffle<T>(array: T[]): T[] {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

// Helper: Get Setup Distribution
const getDistribution = (count: number): [number, number, number, number] => {
    const distMap: Record<number, [number, number, number, number]> = {
        5: [3, 0, 1, 1], 6: [3, 1, 1, 1], 7: [5, 0, 1, 1],
        8: [5, 1, 1, 1], 9: [5, 2, 1, 1], 10: [7, 0, 2, 1],
        11: [7, 1, 2, 1], 12: [7, 2, 2, 1], 13: [9, 0, 3, 1],
        14: [9, 1, 3, 1], 15: [9, 2, 3, 1],
    };
    if (count > 15) return distMap[15];
    if (count < 5) return [Math.max(0, count - 1), 0, 0, 1]; // Fallback
    return distMap[count] || [0, 0, 0, 0];
};

// --- Smart Role Selector Component ---
const SmartRoleSelector: React.FC<{
    selectedRoleId: string;
    onChange: (id: string) => void;
    allCharacters: Character[];
    scriptCharacters: Character[];
    t: (key: string) => string;
}> = ({ selectedRoleId, onChange, allCharacters, scriptCharacters, t }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<CharacterType | 'All'>('All');

    const displayChars = useMemo(() => {
        let pool = scriptCharacters.length > 0 ? scriptCharacters : allCharacters;
        
        if (filterType !== 'All') {
            pool = pool.filter(c => c.characterType === filterType);
        }

        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            pool = pool.filter(c => c.name.toLowerCase().includes(lower));
        }
        return pool;
    }, [scriptCharacters, allCharacters, searchTerm, filterType]);

    const types: CharacterType[] = ['Townsfolk', 'Outsider', 'Minion', 'Demon', 'Traveler'];

    return (
        <div className="space-y-3">
            <div className="flex gap-2">
                <div className="relative flex-grow">
                    <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
                    <input 
                        type="text" 
                        placeholder={t('header.searchPlaceholder')}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-8 pr-2 py-2 border rounded-lg text-sm bg-white dark:bg-black/20"
                    />
                </div>
            </div>
            
            <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
                <button 
                    onClick={() => setFilterType('All')}
                    className={`px-3 py-1 text-xs rounded-full border whitespace-nowrap transition-colors ${filterType === 'All' ? 'bg-slate-700 text-white border-slate-700' : 'border-slate-300 text-slate-500'}`}
                >
                    All
                </button>
                {types.map(type => (
                    <button 
                        key={type}
                        onClick={() => setFilterType(type)}
                        className={`px-3 py-1 text-xs rounded-full border whitespace-nowrap transition-colors ${filterType === type ? 'bg-townsfolk-blue text-white border-townsfolk-blue' : 'border-slate-300 text-slate-500'}`}
                    >
                        {t(`characterType.${type}`)}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[40vh] overflow-y-auto p-1 custom-scrollbar">
                {displayChars.map(c => (
                    <button
                        key={c.id}
                        onClick={() => onChange(c.id)}
                        className={`
                            flex flex-col items-center p-2 rounded-lg border transition-all
                            ${selectedRoleId === c.id ? 'border-townsfolk-blue bg-townsfolk-blue/10 ring-2 ring-townsfolk-blue' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'}
                        `}
                    >
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-800 border mb-1 shrink-0">
                            {c.iconUrl ? <img src={c.iconUrl} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-white text-xs">{c.name[0]}</div>}
                        </div>
                        <span className="text-[10px] font-bold text-center leading-tight line-clamp-2 w-full">{c.name}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

// --- Bluff Editor Component ---
const BluffEditor: React.FC<{
    bluffRoleIds: string[];
    setBluffRoleIds: (ids: string[]) => void;
    allCharacters: Character[];
    scriptCharacters: Character[];
    t: (key: string) => string;
}> = ({ bluffRoleIds, setBluffRoleIds, allCharacters, scriptCharacters, t }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAllCharacters, setShowAllCharacters] = useState(false); // Default: Script only

    const toggleBluff = (id: string) => {
        if (bluffRoleIds.includes(id)) {
            setBluffRoleIds(bluffRoleIds.filter(bid => bid !== id));
        } else {
            // Allow adding more than 3, visually distinct
            setBluffRoleIds([...bluffRoleIds, id]);
        }
    };

    const availableChars = useMemo(() => {
        // Core Logic: Use scriptCharacters by default. Use allCharacters only if toggled or script is empty.
        let pool = (scriptCharacters.length > 0 && !showAllCharacters) ? scriptCharacters : allCharacters;
        
        if (searchTerm) {
            pool = pool.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
        }
        return pool.sort((a,b) => a.name.localeCompare(b.name));
    }, [scriptCharacters, allCharacters, searchTerm, showAllCharacters]);

    if (!isEditing) {
        return (
            <div className="flex flex-col gap-1 w-full md:w-auto">
                <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-demon-fire uppercase tracking-widest">{t('roleAssignment.bluffRolesTitle')}</span>
                    <button onClick={() => setIsEditing(true)} className="text-xs text-townsfolk-blue hover:underline flex items-center gap-1">
                        <PencilIcon className="w-3 h-3"/> {t('roleAssignment.editBluffRoles')}
                    </button>
                </div>
                <div className="flex flex-wrap gap-2 min-h-[2rem]">
                    {bluffRoleIds.length === 0 && <span className="text-xs text-slate-400 italic">無偽裝</span>}
                    {bluffRoleIds.map(id => {
                        const char = allCharacters.find(c => c.id === id);
                        return char ? <span key={id} className="text-xs bg-black text-white px-2 py-1 rounded shadow-sm border border-slate-700">{char.name}</span> : null;
                    })}
                </div>
            </div>
        );
    }

    return (
        <div className="w-full bg-slate-100 dark:bg-black/30 p-3 rounded-lg border border-stone-border dark:border-slate-700 max-h-[30vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-2 sticky top-0 bg-slate-100 dark:bg-slate-900 z-10 py-1">
                <h4 className="text-sm font-bold">{t('roleAssignment.editBluffRoles')}</h4>
                <button onClick={() => setIsEditing(false)} className="text-xs bg-slate-300 dark:bg-slate-700 px-2 py-1 rounded hover:bg-slate-400">完成</button>
            </div>
            
            <div className="flex flex-wrap gap-2 mb-3">
                {bluffRoleIds.map(id => {
                    const char = allCharacters.find(c => c.id === id);
                    return char ? (
                        <button key={id} onClick={() => toggleBluff(id)} className="text-xs bg-demon-fire text-white px-2 py-1 rounded flex items-center gap-1 hover:bg-red-700">
                            {char.name} <XMarkIcon className="w-3 h-3"/>
                        </button>
                    ) : null;
                })}
            </div>

            <div className="flex gap-2 mb-2 items-center">
                <div className="relative flex-grow">
                    <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400"/>
                    <input 
                        type="text" 
                        placeholder="搜尋角色..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-7 p-1 text-xs rounded border bg-white dark:bg-black"
                    />
                </div>
                <button 
                    onClick={() => setShowAllCharacters(!showAllCharacters)}
                    className={`p-1.5 rounded border text-xs font-bold whitespace-nowrap ${showAllCharacters ? 'bg-townsfolk-blue text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}
                    title="顯示所有角色 (不限劇本)"
                >
                    {showAllCharacters ? "All" : "Script"}
                </button>
            </div>

            <div className="grid grid-cols-3 gap-1 max-h-32 overflow-y-auto">
                {availableChars.map(c => (
                    <button 
                        key={c.id} 
                        onClick={() => toggleBluff(c.id)}
                        disabled={bluffRoleIds.includes(c.id)}
                        className={`text-[10px] p-1 rounded border truncate text-left ${bluffRoleIds.includes(c.id) ? 'opacity-50 cursor-not-allowed bg-slate-200' : 'hover:bg-white dark:hover:bg-slate-700'}`}
                        title={c.name}
                    >
                        {c.name}
                    </button>
                ))}
                {availableChars.length === 0 && <p className="col-span-3 text-[10px] text-center text-slate-400 py-2">無符合角色</p>}
            </div>
        </div>
    );
};

export const RoleAssignmentView: React.FC<RoleAssignmentViewProps> = ({ 
    allScripts, allCharacters, t, onStartGame, savedSetups, setSavedSetups 
}) => {
    const [selectedScriptId, setSelectedScriptId] = useState<string>('');
    const [playerCount, setPlayerCount] = useState<number>(8);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [bluffRoleIds, setBluffRoleIds] = useState<string[]>([]);
    
    // UI State
    const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);
    
    // Feature: Edit Assignment
    const [editingAssignmentIndex, setEditingAssignmentIndex] = useState<number | null>(null);
    
    // Feature: Reveal Mode
    const [isRevealMode, setIsRevealMode] = useState(false);
    const [revealingSeat, setRevealingSeat] = useState<number | null>(null);

    // Feature: Drag and Drop
    const [draggedSeat, setDraggedSeat] = useState<number | null>(null);

    const selectedScript = useMemo(() => allScripts.find(s => s.id === selectedScriptId), [allScripts, selectedScriptId]);
    
    const charactersInScript = useMemo(() => {
        if (!selectedScript) return [];
        return selectedScript.characterIds
            .map(id => allCharacters.find(c => c.id === id))
            .filter(Boolean) as Character[];
    }, [selectedScript, allCharacters]);

    // Initialize/Reset
    useEffect(() => {
        if (assignments.length === 0) {
            // Initial render with placeholders
            setAssignments(Array.from({ length: playerCount }, (_, i) => ({
                player: i + 1,
                role: { id: 'unknown', name: '未分配', characterType: 'Traveler', abilityType: ['Standard'], ability: '', reminders: [], scriptIds: [] } as Character,
                status: 'alive',
                revealed: false,
                statusMarkers: [],
                alignment: 'good'
            })));
        } else if (assignments.length !== playerCount) {
            // Resize logic preserving existing
            const newAssigments = [...assignments];
            if (playerCount > assignments.length) {
                for(let i=assignments.length; i<playerCount; i++) {
                    newAssigments.push({
                        player: i + 1,
                        role: { id: 'unknown', name: '未分配', characterType: 'Traveler', abilityType: ['Standard'], ability: '', reminders: [], scriptIds: [] } as Character,
                        status: 'alive',
                        revealed: false,
                        statusMarkers: [],
                        alignment: 'good'
                    });
                }
            } else {
                newAssigments.splice(playerCount);
            }
            setAssignments(newAssigments);
        }
    }, [playerCount]);

    const handleRandomize = () => {
        if (!selectedScript || charactersInScript.length === 0) return;

        const [tCount, oCount, mCount, dCount] = getDistribution(playerCount);
        
        const townsfolkPool = charactersInScript.filter(c => c.characterType === 'Townsfolk');
        const outsiderPool = charactersInScript.filter(c => c.characterType === 'Outsider');
        const minionPool = charactersInScript.filter(c => c.characterType === 'Minion');
        const demonPool = charactersInScript.filter(c => c.characterType === 'Demon');

        // Randomly select roles
        const selectedTownsfolk = shuffle<Character>(townsfolkPool).slice(0, tCount);
        const selectedOutsiders = shuffle<Character>(outsiderPool).slice(0, oCount);
        const selectedMinions = shuffle<Character>(minionPool).slice(0, mCount);
        const selectedDemons = shuffle<Character>(demonPool).slice(0, dCount);

        const rolesInPlay: Character[] = [
            ...selectedTownsfolk,
            ...selectedOutsiders,
            ...selectedMinions,
            ...selectedDemons
        ];

        // Fill remaining if pools exhausted (fallback)
        while (rolesInPlay.length < playerCount) {
            const fallback = allCharacters.find(c => c.id === 'traveler') || townsfolkPool[0] || charactersInScript[0] || allCharacters[0];
            if (fallback) rolesInPlay.push(fallback);
            else break; 
        }

        // Shuffle player seats
        const shuffledRoles = shuffle<Character>(rolesInPlay);

        const newAssignments: Assignment[] = shuffledRoles.map((role: Character, index: number) => {
            let pretendRole: Character | undefined = undefined;

            // --- Logic: Auto-generate Pretend Roles for Cognitive Overwrite ---
            if (role && (role.id === 'drunk' || role.name === '酒鬼')) {
                const availablePretends = townsfolkPool.filter(c => !rolesInPlay.some(r => r.id === c.id));
                const pool = availablePretends.length > 0 ? availablePretends : townsfolkPool;
                pretendRole = pool[Math.floor(Math.random() * pool.length)];
            }
            if (role && (role.id === 'lunatic' || role.name === '瘋子')) {
                pretendRole = demonPool[Math.floor(Math.random() * demonPool.length)];
            }
            if (role && (role.id === 'marionette' || role.name === '傀儡')) {
                pretendRole = townsfolkPool[Math.floor(Math.random() * townsfolkPool.length)];
            }
            if (role && (role.id === 'savant' || role.name === '悟道者')) {
                // Savant sometimes needs a fake role if in specific scripts, but usually knows they are Savant.
                // Standard Savant knows they are Savant. Logic removed for standard compliance.
            }

            return {
                player: index + 1,
                role: role,
                pretendRole: pretendRole,
                alignment: (role.characterType === 'Demon' || role.characterType === 'Minion') ? 'evil' : 'good',
                status: 'alive',
                revealed: false,
                statusMarkers: []
            };
        });

        setAssignments(newAssignments);

        // Generate Bluffs (3 roles not in play)
        const inPlayIds = new Set(rolesInPlay.map(c => c.id));
        const availableBluffs = charactersInScript.filter(c => !inPlayIds.has(c.id) && (c.characterType === 'Townsfolk' || c.characterType === 'Outsider'));
        const bluffs = shuffle<Character>(availableBluffs).slice(0, 3).map(c => c.id);
        setBluffRoleIds(bluffs);
    };

    const handleStart = () => {
        if (assignments.length === 0 || !selectedScript) return;
        
        // --- 05. Intelligent Log Generation (First Night Info) ---
        const generatedLogs = [];
        
        // Phase Marker
        generatedLogs.push({ 
            id: uuidv4(), 
            type: 'phase_marker', 
            phase: 'FirstNight', 
            dayNumber: 0 
        });

        // 1. Minion Info (Minions know each other)
        const minions = assignments.filter(a => a.role.characterType === 'Minion');
        if (minions.length > 0) {
            const minionNames = minions.map(m => `#${m.player} ${m.role.name}`).join(', ');
            generatedLogs.push({
                id: uuidv4(),
                type: 'note',
                characterId: 'storyteller',
                text: `【首夜資訊】爪牙彼此認識: ${minionNames}。`
            });
        }

        // 2. Demon Info (Demon knows Minions)
        const demons = assignments.filter(a => a.role.characterType === 'Demon');
        demons.forEach(d => {
            const minionNames = minions.map(m => `#${m.player} ${m.role.name}`).join(', ');
            generatedLogs.push({
                id: uuidv4(),
                type: 'note',
                characterId: d.role.id,
                text: `【首夜資訊】惡魔 (${d.role.name}) 得知爪牙: ${minionNames || '無'}。`
            });
            
            // 3. Demon Bluffs
            const bluffNames = bluffRoleIds.map(bid => {
                const c = allCharacters.find(x => x.id === bid);
                return c ? c.name : bid;
            }).join(', ');
            
            generatedLogs.push({
                id: uuidv4(),
                type: 'note',
                characterId: d.role.id,
                text: `【首夜資訊】惡魔偽裝 (Bluffs): ${bluffNames}。`
            });
        });

        // 4. Lunatic/Marionette Specifics (Simplified)
        const lunatic = assignments.find(a => a.role.id === 'lunatic');
        if (lunatic) {
            generatedLogs.push({
                id: uuidv4(),
                type: 'note',
                characterId: lunatic.role.id,
                text: `【首夜資訊】瘋子 (${lunatic.role.name}) 看見的惡魔是... (請手動選擇)。`
            });
        }

        const record: GameRecord = {
            id: uuidv4(),
            date: new Date().toISOString(),
            name: `${selectedScript.name} - ${new Date().toLocaleDateString()}`,
            scriptName: selectedScript.name,
            playerCount: assignments.length,
            assignments: assignments,
            actionLog: generatedLogs as any, // TypeScript might complain about type mismatch if strict, simplified here
            currentPhase: 'FirstNight',
            dayNumber: 0,
            bluffRoleIds: bluffRoleIds
        };
        onStartGame(record);
    };

    const handleSaveSetup = () => {
        if (!selectedScript || assignments.length === 0) return;
        const name = prompt(t('roleAssignment.setupName'), `${selectedScript.name} (${assignments.length}p)`);
        if (!name) return;

        const newSetup: SavedSetup = {
            id: uuidv4(),
            name,
            date: new Date().toISOString(),
            scriptId: selectedScript.id,
            playerCount: assignments.length,
            roles: assignments.map(a => ({
                seat: a.player,
                roleId: a.role.id,
                alignment: a.alignment,
                pretendRoleId: a.pretendRole?.id
            })),
            bluffRoleIds
        };
        setSavedSetups(prev => [newSetup, ...prev]);
        alert("Setup saved!");
    };

    const handleLoadSetup = (setup: SavedSetup) => {
        if (!window.confirm(t('roleAssignment.confirmLoad'))) return;
        
        setSelectedScriptId(setup.scriptId);
        setPlayerCount(setup.playerCount);
        setBluffRoleIds(setup.bluffRoleIds || []);

        const loadedAssignments: Assignment[] = setup.roles.map(r => {
            const role = allCharacters.find(c => c.id === r.roleId) || allCharacters[0];
            const pretendRole = r.pretendRoleId ? allCharacters.find(c => c.id === r.pretendRoleId) : undefined;
            return {
                player: r.seat,
                role,
                pretendRole,
                alignment: r.alignment || ((role.characterType === 'Demon' || role.characterType === 'Minion') ? 'evil' : 'good'),
                status: 'alive',
                revealed: false,
                statusMarkers: []
            };
        });
        setAssignments(loadedAssignments);
        setIsLoadModalOpen(false);
    };

    const handleDeleteSetup = (id: string) => {
        if (window.confirm(t('roleAssignment.deleteSetupConfirm'))) {
            setSavedSetups(prev => prev.filter(s => s.id !== id));
        }
    };

    const handleUpdateAssignment = (index: number, newRole: Character, newAlign: 'good' | 'evil', newPretend?: Character) => {
        setAssignments(prev => prev.map((a, i) => 
            i === index ? { ...a, role: newRole, alignment: newAlign, pretendRole: newPretend } : a
        ));
        setEditingAssignmentIndex(null);
    };

    // --- Drag and Drop Handlers ---
    const handleDragStart = (e: React.DragEvent, seatNumber: number) => {
        setDraggedSeat(seatNumber);
        e.dataTransfer.effectAllowed = 'move';
        // Optional: Set a drag image
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault(); // Necessary to allow dropping
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, targetSeat: number) => {
        e.preventDefault();
        if (draggedSeat === null || draggedSeat === targetSeat) {
            setDraggedSeat(null);
            return;
        }

        // Swap Logic
        setAssignments(prev => {
            const newArr = [...prev];
            const sourceIdx = newArr.findIndex(a => a.player === draggedSeat);
            const targetIdx = newArr.findIndex(a => a.player === targetSeat);

            if (sourceIdx !== -1 && targetIdx !== -1) {
                // Swap the player numbers to maintain seat integrity, or swap the data?
                // Usually, we want the data to move to the new seat number.
                // So we swap everything BUT the 'player' (seat) property.
                const tempRole = { ...newArr[sourceIdx], player: targetSeat };
                const tempTarget = { ...newArr[targetIdx], player: draggedSeat };
                
                newArr[sourceIdx] = tempTarget;
                newArr[targetIdx] = tempRole;
                
                // Re-sort to keep array index matching seat for safety (though rendering usually maps by prop)
                newArr.sort((a,b) => a.player - b.player);
            }
            return newArr;
        });
        setDraggedSeat(null);
    };

    const distribution = getDistribution(playerCount);

    return (
        <div className="p-4 pb-0 md:p-8 md:pb-8 max-w-5xl mx-auto flex-1 w-full flex flex-col min-h-0 relative">
            <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar -mx-4 px-4 md:mx-0 md:px-0 pb-4">
                <h2 className="text-2xl md:text-3xl font-bold font-serif text-celestial-gold mb-6 shrink-0">{t('sidebar.roleAssignment')}</h2>
                
                <div className="bg-parchment-white dark:bg-midnight-ink border border-stone-border dark:border-slate-gray rounded-xl p-4 md:p-6 shadow-md mb-6 shrink-0">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                    <div className="lg:col-span-2">
                        <label className="block text-sm font-bold text-moonlit-stone mb-2">{t('roleAssignment.selectScript')}</label>
                        <select 
                            value={selectedScriptId} 
                            onChange={(e) => setSelectedScriptId(e.target.value)}
                            className="w-full px-3 py-3 rounded-lg border border-stone-border dark:border-slate-gray bg-daylight-bg dark:bg-ravens-night focus:ring-2 focus:ring-townsfolk-blue text-sm"
                        >
                            <option value="">-- {t('keywords.select')} --</option>
                            {allScripts.map(s => (
                                <option key={s.id} value={s.id}>{s.name} ({s.characterIds.length} roles)</option>
                            ))}
                        </select>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-bold text-moonlit-stone mb-2">{t('roleAssignment.players')} ({playerCount})</label>
                        <div className="flex items-center gap-2 bg-slate-200 dark:bg-slate-700 rounded-lg p-1">
                            <button onClick={() => setPlayerCount(Math.max(5, playerCount - 1))} className="p-2 hover:bg-slate-300 dark:hover:bg-slate-600 rounded"><ChevronDownIcon className="w-4 h-4"/></button>
                            <input 
                                type="range" min="5" max="20" 
                                value={playerCount} 
                                onChange={(e) => setPlayerCount(parseInt(e.target.value))}
                                className="flex-grow accent-townsfolk-blue h-2"
                            />
                            <button onClick={() => setPlayerCount(Math.min(20, playerCount + 1))} className="p-2 hover:bg-slate-300 dark:hover:bg-slate-600 rounded"><ChevronUpIcon className="w-4 h-4"/></button>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button 
                            onClick={handleRandomize} 
                            disabled={!selectedScriptId}
                            className="flex-1 py-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shadow-sm text-sm"
                        >
                            <SparklesIcon className="w-5 h-5"/>
                            {t('roleAssignment.selectRandomly')}
                        </button>
                        <div className="flex flex-col gap-1">
                            <button onClick={handleSaveSetup} disabled={assignments.length === 0} className="p-2 bg-slate-700 text-white rounded hover:bg-slate-600 disabled:opacity-50" title={t('roleAssignment.saveSetup')}><ArrowDownTrayIcon className="w-4 h-4"/></button>
                            <button onClick={() => setIsLoadModalOpen(true)} className="p-2 bg-slate-700 text-white rounded hover:bg-slate-600" title={t('roleAssignment.loadSetup')}><BookmarkIcon className="w-4 h-4"/></button>
                        </div>
                    </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-mono text-moonlit-stone">
                    <span className="bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded">Townsfolk: {distribution[0]}</span>
                    <span className="bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded">Outsider: {distribution[1]}</span>
                    <span className="bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded">Minion: {distribution[2]}</span>
                    <span className="bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded">Demon: {distribution[3]}</span>
                </div>
            </div>

            {assignments.length > 0 && (
                <div className="mb-2 md:mb-6 bg-slate-50 dark:bg-black/20 rounded-xl border border-stone-border dark:border-slate-gray p-4 shadow-inner">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {assignments.map((assignment, idx) => (
                            <div 
                                key={assignment.player} 
                                draggable
                                onDragStart={(e) => handleDragStart(e, assignment.player)}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, assignment.player)}
                                onClick={() => setEditingAssignmentIndex(idx)}
                                className={`
                                    relative p-3 rounded-lg border-2 flex flex-col items-center text-center transition-all cursor-grab active:cursor-grabbing
                                    ${assignment.alignment === 'evil' ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'} 
                                    hover:border-townsfolk-blue hover:shadow-lg group
                                    ${draggedSeat === assignment.player ? 'opacity-50 ring-2 ring-indigo-500' : ''}
                                `}
                            >
                                <div className="absolute top-2 left-2 flex items-center gap-1">
                                    <Bars3Icon className="w-3 h-3 text-slate-400 cursor-grab" />
                                    <span className="text-xs font-mono font-bold text-slate-400">#{assignment.player}</span>
                                </div>
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <PencilIcon className="w-4 h-4 text-slate-400 hover:text-townsfolk-blue"/>
                                </div>
                                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-current mb-2 mt-4 pointer-events-none select-none shrink-0">
                                    {assignment.role.iconUrl ? <img src={assignment.role.iconUrl} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center font-bold text-xl bg-slate-300 dark:bg-slate-600">{assignment.role.name[0]}</div>}
                                </div>
                                <span className={`font-bold text-sm truncate w-full ${assignment.alignment === 'evil' ? 'text-demon-fire' : 'text-townsfolk-blue'}`}>{assignment.role.name}</span>
                                {assignment.pretendRole && (
                                    <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded mt-1 border border-purple-200">
                                        偽: {assignment.pretendRole.name}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
            </div>

            {assignments.length > 0 && (
                <div className="shrink-0 z-20 bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur-md p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] md:pb-4 rounded-t-xl md:rounded-xl flex flex-col md:flex-row justify-between items-center gap-4 border-t md:border border-stone-border dark:border-slate-600 shadow-[0_-4px_10px_rgba(0,0,0,0.1)] md:shadow-lg -mx-4 md:mx-0 mt-2 md:mt-0">
                    
                    {/* 04. Enhanced Bluff Management */}
                    <div className="w-full md:w-auto md:flex-1 overflow-hidden">
                        <BluffEditor 
                            bluffRoleIds={bluffRoleIds} 
                            setBluffRoleIds={setBluffRoleIds}
                            allCharacters={allCharacters}
                            scriptCharacters={charactersInScript}
                            t={t}
                        />
                    </div>

                    <div className="flex gap-3 w-full md:w-auto shrink-0">
                        <button 
                            onClick={() => { setRevealingSeat(assignments[0].player); setIsRevealMode(true); }} 
                            className="flex-1 md:w-auto px-6 py-3 bg-purple-600 text-white rounded-xl font-bold shadow-lg hover:bg-purple-700 hover:scale-105 transition-all flex items-center justify-center gap-2"
                        >
                            <EyeIcon className="w-5 h-5" />
                            {t('roleAssignment.startReveal')}
                        </button>
                        <button 
                            onClick={handleStart} 
                            className="flex-1 md:w-auto px-8 py-3 bg-green-600 text-white rounded-xl font-bold shadow-lg hover:bg-green-700 hover:scale-105 transition-all flex items-center justify-center gap-2"
                        >
                            <PlayIcon className="w-5 h-5" />
                            {t('roleAssignment.start')}
                        </button>
                    </div>
                </div>
            )}

            {/* Load Setup Modal */}
            <Modal isOpen={isLoadModalOpen} onClose={() => setIsLoadModalOpen(false)} title={t('roleAssignment.loadSetupTitle')}>
                <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                    {savedSetups.length === 0 ? <p className="text-center text-slate-500 py-4">{t('roleAssignment.noSavedSetups')}</p> : 
                    savedSetups.map(setup => (
                        <div key={setup.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 hover:border-townsfolk-blue cursor-pointer group" onClick={() => handleLoadSetup(setup)}>
                            <div>
                                <div className="font-bold text-sm text-ink-text dark:text-parchment">{setup.name}</div>
                                <div className="text-xs text-moonlit-stone">{new Date(setup.date).toLocaleDateString()} • {setup.playerCount} Players</div>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteSetup(setup.id); }} className="p-2 text-slate-400 hover:text-demon-fire rounded-full hover:bg-white dark:hover:bg-slate-900 transition-colors">
                                <TrashIcon className="w-4 h-4"/>
                            </button>
                        </div>
                    ))}
                </div>
            </Modal>

            {/* Edit Assignment Modal with Smart Role Picker */}
            {editingAssignmentIndex !== null && assignments[editingAssignmentIndex] && (
                <EditAssignmentModal 
                    isOpen={true}
                    onClose={() => setEditingAssignmentIndex(null)}
                    assignment={assignments[editingAssignmentIndex]}
                    allCharacters={allCharacters}
                    charactersInScript={charactersInScript}
                    onSave={(newRole, newAlign, newPretend) => {
                        if (editingAssignmentIndex !== null) {
                            handleUpdateAssignment(editingAssignmentIndex, newRole, newAlign, newPretend);
                        }
                    }}
                    t={t}
                />
            )}

            {/* Enhanced Reveal Mode Overlay */}
            {isRevealMode && revealingSeat !== null && (
                <RevealOverlay 
                    assignments={assignments}
                    revealingSeat={revealingSeat}
                    setRevealingSeat={setRevealingSeat}
                    onClose={() => { setIsRevealMode(false); setRevealingSeat(null); }}
                    t={t}
                />
            )}
        </div>
    );
};

// Internal Component: Edit Modal (Refactored with Smart Picker)
const EditAssignmentModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    assignment: Assignment;
    allCharacters: Character[];
    charactersInScript: Character[];
    onSave: (role: Character, align: 'good'|'evil', pretend?: Character) => void;
    // Fix: Updated type definition for 't' to accept optional options argument
    t: (key: string, options?: any) => string;
}> = ({ isOpen, onClose, assignment, allCharacters, charactersInScript, onSave, t }) => {
    const [roleId, setRoleId] = useState(assignment.role.id);
    const [alignment, setAlignment] = useState(assignment.alignment || 'good');
    const [pretendId, setPretendId] = useState(assignment.pretendRole?.id || '');
    
    // Auto-update alignment when role changes
    useEffect(() => {
        const char = allCharacters.find(c => c.id === roleId);
        if (char && ['Demon', 'Minion'].includes(char.characterType)) {
            setAlignment('evil');
        } else if (char) {
            setAlignment('good');
        }
    }, [roleId, allCharacters]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('roleAssignment.editPlayer', {player: assignment.player})}>
            <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-2 custom-scrollbar">
                
                <div>
                    <label className="block text-xs font-bold text-moonlit-stone mb-2 uppercase tracking-wider">{t('roleAssignment.role')}</label>
                    <SmartRoleSelector 
                        selectedRoleId={roleId}
                        onChange={setRoleId}
                        allCharacters={allCharacters}
                        scriptCharacters={charactersInScript}
                        t={t}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-moonlit-stone mb-1">{t('roleAssignment.alignment')}</label>
                        <div className="flex gap-2">
                            <button type="button" onClick={() => setAlignment('good')} className={`flex-1 py-2 rounded-lg font-bold border transition-all ${alignment === 'good' ? 'bg-townsfolk-blue text-white border-townsfolk-blue' : 'border-slate-300 dark:border-slate-600'}`}>{t('roleAssignment.good')}</button>
                            <button type="button" onClick={() => setAlignment('evil')} className={`flex-1 py-2 rounded-lg font-bold border transition-all ${alignment === 'evil' ? 'bg-demon-fire text-white border-demon-fire' : 'border-slate-300 dark:border-slate-600'}`}>{t('roleAssignment.evil')}</button>
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-xs font-bold text-moonlit-stone mb-1">{t('roleAssignment.pretendRole')}</label>
                        <select value={pretendId} onChange={e => setPretendId(e.target.value)} className="w-full px-3 py-2 border rounded-lg dark:bg-black dark:border-slate-700 text-sm h-[42px]">
                            <option value="">{t('roleAssignment.none')}</option>
                            {charactersInScript.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-stone-border dark:border-slate-700">
                    <button onClick={onClose} className="px-5 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 font-bold text-sm text-slate-600 dark:text-moonlit-stone hover:bg-slate-300 dark:hover:bg-slate-600">{t('form.cancel')}</button>
                    <button onClick={() => {
                        const r = allCharacters.find(c => c.id === roleId);
                        const p = allCharacters.find(c => c.id === pretendId);
                        if (r) onSave(r, alignment, p);
                    }} className="px-6 py-2 rounded-lg bg-townsfolk-blue text-white font-bold text-sm hover:bg-blue-600 shadow-md">{t('form.saveChanges')}</button>
                </div>
            </div>
        </Modal>
    );
};

// Internal Component: Enhanced Reveal Overlay (03) - UI Optimized for Mobile
const RevealOverlay: React.FC<{
    assignments: Assignment[];
    revealingSeat: number;
    setRevealingSeat: (seat: number) => void;
    onClose: () => void;
    // Fix: Updated type definition for 't' to accept optional options argument
    t: (key: string, options?: any) => string;
}> = ({ assignments, revealingSeat, setRevealingSeat, onClose, t }) => {
    const [isCovered, setIsCovered] = useState(true);
    
    // Sort assignments by seat
    const sortedAssignments = useMemo(() => [...assignments].sort((a,b) => a.player - b.player), [assignments]);
    const currentIndex = sortedAssignments.findIndex(a => a.player === revealingSeat);
    const target = sortedAssignments[currentIndex];
    
    const displayRole = target?.pretendRole || target?.role;

    const handleNext = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setIsCovered(true); // Cover first
        setTimeout(() => {
            const nextIndex = (currentIndex + 1) % sortedAssignments.length;
            setRevealingSeat(sortedAssignments[nextIndex].player);
        }, 150);
    };

    const handlePrev = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setIsCovered(true);
        setTimeout(() => {
            const prevIndex = (currentIndex - 1 + sortedAssignments.length) % sortedAssignments.length;
            setRevealingSeat(sortedAssignments[prevIndex].player);
        }, 150);
    };

    if (!target) return null;

    return (
        <div className="fixed inset-0 z-50 bg-slate-900 text-white flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800 shrink-0">
                <h2 className="text-xl font-bold flex items-center gap-2"><EyeIcon className="w-6 h-6"/> {t('roleAssignment.startReveal')}</h2>
                <button onClick={onClose} className="p-2 bg-slate-700 rounded-full hover:bg-slate-600 transition-colors">
                    <XMarkIcon className="w-6 h-6"/>
                </button>
            </div>
            
            {/* Main Content Area */}
            <div className="flex-1 flex flex-col items-center justify-center p-4 relative min-h-0">
                
                {/* Desktop-only side buttons (Hidden on small mobile screens to prevent overlap) */}
                <button 
                    onClick={handlePrev} 
                    className="absolute left-6 hidden xl:flex p-5 rounded-full bg-white/10 hover:bg-white/20 transition-all border border-white/20 z-30"
                >
                    <ChevronLeftIcon className="w-10 h-10"/>
                </button>
                <button 
                    onClick={handleNext} 
                    className="absolute right-6 hidden xl:flex p-5 rounded-full bg-white/10 hover:bg-white/20 transition-all border border-white/20 z-30"
                >
                    <ChevronRightIcon className="w-10 h-10"/>
                </button>

                {/* Card Container */}
                <div className="w-full max-w-sm sm:max-w-lg perspective-1000 flex flex-col items-center">
                    <div 
                        className={`relative w-full aspect-[3/4] max-h-[60vh] transition-all duration-500 transform-style-3d cursor-pointer ${!isCovered ? 'rotate-y-180' : ''}`}
                        onClick={() => setIsCovered(!isCovered)}
                    >
                        {/* Front (Cover) */}
                        <div className="absolute inset-0 backface-hidden bg-slate-800 border-4 border-slate-600 rounded-2xl flex flex-col items-center justify-center shadow-2xl hover:border-townsfolk-blue transition-colors">
                            <span className="text-6xl sm:text-8xl font-black text-slate-700 mb-4">#{target.player}</span>
                            <EyeIcon className="w-20 h-20 text-slate-600 animate-pulse"/>
                            <p className="mt-8 text-lg sm:text-xl font-bold text-slate-400 uppercase tracking-widest">{t('roleAssignment.holdToReveal')}</p>
                        </div>

                        {/* Back (Reveal) */}
                        <div className="absolute inset-0 backface-hidden rotate-y-180 bg-white border-4 border-celestial-gold rounded-2xl flex flex-col items-center justify-center p-6 sm:p-8 shadow-2xl text-center overflow-y-auto custom-scrollbar">
                            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-black overflow-hidden mb-4 sm:mb-6 shrink-0 shadow-md">
                                {displayRole.iconUrl ? (
                                    <img src={displayRole.iconUrl} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-5xl sm:text-6xl font-bold text-black bg-slate-100">{displayRole.name[0]}</div>
                                )}
                            </div>
                            <h2 className="text-3xl sm:text-4xl font-black text-black mb-1 leading-tight">{displayRole.name}</h2>
                            <p className="text-base sm:text-lg text-slate-500 font-bold uppercase mb-4 sm:mb-6">{t(`characterType.${displayRole.characterType}`)}</p>
                            <div className="w-full h-px bg-slate-200 mb-4"></div>
                            <p className="text-sm sm:text-base text-slate-800 leading-relaxed font-medium">{displayRole.ability}</p>
                            <p className="mt-6 text-xs text-slate-400 font-bold italic opacity-60">(點擊卡片翻回封面)</p>
                        </div>
                    </div>
                    
                    {/* Mobile Navigation Bar (Always Visible at Bottom of Card Area) */}
                    <div className="mt-8 flex items-center justify-between w-full gap-4 shrink-0 px-2 sm:px-0">
                        <button 
                            onClick={handlePrev}
                            className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl flex items-center justify-center gap-2 font-bold transition-all active:scale-95 shadow-lg"
                        >
                            <ChevronLeftIcon className="w-6 h-6"/>
                            <span className="hidden sm:inline">上一個</span>
                        </button>

                        <div className="flex flex-col items-center min-w-[80px]">
                            <span className="text-2xl font-black font-mono text-celestial-gold">{currentIndex + 1}</span>
                            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-tighter">/ {sortedAssignments.length} PLAYERS</span>
                        </div>

                        <button 
                            onClick={handleNext}
                            className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl flex items-center justify-center gap-2 font-bold transition-all active:scale-95 shadow-lg"
                        >
                            <span className="hidden sm:inline">下一個</span>
                            <ChevronRightIcon className="w-6 h-6"/>
                        </button>
                    </div>
                </div>
            </div>

            {/* Bottom Safe Area Spacer */}
            <div className="h-safe-bottom bg-slate-900 shrink-0"></div>
        </div>
    );
};
