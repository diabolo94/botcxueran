
import React, { useState, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Character, Assignment } from '../types';
import { Modal } from './Modal';
import { useLocalStorage } from '../utils';
import { 
    UserGroupIcon, 
    SparklesIcon, ArrowsRightLeftIcon,
    MoonIcon, ArrowPathIcon, BookmarkIcon, TrashIcon, XMarkIcon, PlusIcon, MinusIcon
} from './Icons';

interface ShowInfoModalProps {
    isOpen: boolean;
    onClose: () => void;
    allCharacters: Character[];
    charactersInScript: Character[];
    assignments: Assignment[];
    bluffRoleIds: string[];
    t: (key: string, options?: any) => string;
}

interface InfoState {
    customText: string;
    selectedCharacterIds: string[];
    selectedSeatNumbers: number[];
    alignment: 'good' | 'evil' | null;
}

interface FavoritePhrase {
    id: string;
    name: string;
    text: string;
}

const INITIAL_STATE: InfoState = {
    customText: '',
    selectedCharacterIds: [],
    selectedSeatNumbers: [],
    alignment: null
};

export const ShowInfoModal: React.FC<ShowInfoModalProps> = ({ 
    isOpen, onClose, allCharacters, charactersInScript, assignments, bluffRoleIds, t 
}) => {
    const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
    const [state, setState] = useState<InfoState>(INITIAL_STATE);
    const [favorites, setFavorites] = useLocalStorage<FavoritePhrase[]>('botc_info_favorites', []);
    const [selectionCount, setSelectionCount] = useState(1);

    const minionPlayers = useMemo(() => 
        assignments.filter(a => a.role.characterType === 'Minion'), 
        [assignments]
    );

    const demonPlayer = useMemo(() => 
        assignments.find(a => a.role.characterType === 'Demon'), 
        [assignments]
    );

    // --- Actions ---

    const handleReset = () => {
        setState(INITIAL_STATE);
        setSelectionCount(1);
    };

    const handleSaveFavorite = () => {
        if (!state.customText.trim()) return;
        const name = prompt(t('showInfo.history.namePrompt') || '為此收藏命名:');
        if (name) {
            setFavorites(prev => [...prev, { id: uuidv4(), name, text: state.customText }]);
        }
    };

    const handleDeleteFavorite = (id: string) => {
        if (window.confirm('確定刪除此收藏嗎？')) {
            setFavorites(prev => prev.filter(f => f.id !== id));
        }
    };

    const insertPhrase = (text: string) => {
        setState(prev => ({
            ...prev,
            customText: prev.customText ? `${prev.customText}\n${text}` : text
        }));
    };

    const applyDemonInfo = () => {
        // 1. Minions Seats
        const minionSeats = minionPlayers.map(m => m.player);
        const minionLabel = t('showInfo.phrases.your_minions'); // "這些是你的爪牙"
        const minionString = minionSeats.length > 0 ? minionSeats.map(s => `#${s}`).join(', ') : '無';
        const sectionMinions = `${minionLabel}：${minionString}`;

        // 2. Bluffs Names
        const bluffLabel = t('roleAssignment.bluffRolesTitle'); // "惡魔偽裝"
        const bluffNames = bluffRoleIds.map(id => {
            const c = allCharacters.find(char => char.id === id);
            return c ? c.name : id;
        }).join('、');
        const sectionBluffs = `${bluffLabel}：${bluffNames}`;
        
        // 3. Lunatic Info
        const lunaticPlayers = assignments.filter(a => (a.role.id === 'lunatic' || a.role.name.includes('瘋子')));
        const lunaticString = lunaticPlayers.length > 0
            ? `瘋子是：${lunaticPlayers.map(p => `#${p.player}`).join(', ')}`
            : '';

        const fullText = [sectionMinions, sectionBluffs, lunaticString].filter(Boolean).join('\n\n');
        
        setState({
            customText: fullText,
            selectedSeatNumbers: minionSeats,
            selectedCharacterIds: bluffRoleIds,
            alignment: null // Removed 'evil' alignment display per request
        });
        setActiveTab('preview');
    };

    const applyMinionInfo = () => {
        if (!demonPlayer) return;
        
        const text = t('showInfo.phrases.he_is_demon');
        setState({
            customText: text,
            selectedSeatNumbers: [demonPlayer.player],
            selectedCharacterIds: [],
            alignment: 'evil'
        });
        setActiveTab('preview');
    };

    const applyLunaticInfo = () => {
        const lunatic = assignments.find(a => a.role.id === 'lunatic' || a.role.name.includes('瘋子'));
        if (!lunatic) {
            alert('場上沒有瘋子。');
            return;
        }

        const minionCount = assignments.filter(a => a.role.characterType === 'Minion').length;
        const others = assignments.filter(a => a.player !== lunatic.player);
        const shuffled = [...others].sort(() => 0.5 - Math.random());
        const fakeMinions = shuffled.slice(0, minionCount);

        const fullText = `這些是你的爪牙：\n你的偽裝是：`;

        setState({
            customText: fullText,
            selectedSeatNumbers: fakeMinions.map(f => f.player),
            selectedCharacterIds: bluffRoleIds,
            alignment: 'evil'
        });
        setActiveTab('preview');
    };

    const handleCharacterToggle = (id: string) => {
        setState(prev => {
            const exists = prev.selectedCharacterIds.includes(id);
            return {
                ...prev,
                selectedCharacterIds: exists 
                    ? prev.selectedCharacterIds.filter(c => c !== id) 
                    : [...prev.selectedCharacterIds, id]
            };
        });
    };

    const handleSeatToggle = (seat: number) => {
        setState(prev => {
            const exists = prev.selectedSeatNumbers.includes(seat);
            return {
                ...prev,
                selectedSeatNumbers: exists
                    ? prev.selectedSeatNumbers.filter(s => s !== seat)
                    : [...prev.selectedSeatNumbers, seat]
            };
        });
    };

    // --- Renderers ---

    const renderEditor = () => (
        <div className="space-y-6">
            {/* Top: Preset Modes */}
            <div className="grid grid-cols-3 gap-2">
                <button onClick={applyDemonInfo} className="p-2 bg-red-100 dark:bg-red-900/30 text-demon-fire rounded-lg font-bold flex flex-col items-center justify-center gap-1 hover:bg-red-200 transition-colors text-xs">
                    <MoonIcon className="w-5 h-5"/> 惡魔視角
                </button>
                <button onClick={applyMinionInfo} className="p-2 bg-orange-100 dark:bg-orange-900/30 text-orange-600 rounded-lg font-bold flex flex-col items-center justify-center gap-1 hover:bg-orange-200 transition-colors text-xs">
                    <UserGroupIcon className="w-5 h-5"/> 爪牙視角
                </button>
                <button onClick={applyLunaticInfo} className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-lg font-bold flex flex-col items-center justify-center gap-1 hover:bg-purple-200 transition-colors text-xs">
                    <SparklesIcon className="w-5 h-5"/> 瘋子視角
                </button>
            </div>

            {/* Quick Phrases Section */}
            <div className="space-y-2">
                <label className="text-xs font-bold text-moonlit-stone uppercase">常用短語 (Quick Phrases)</label>
                <div className="flex flex-wrap gap-2">
                    {[
                        'showInfo.phrases.you_are_role',
                        'showInfo.phrases.you_learnt_role',
                        'showInfo.phrases.do_you_want_ability',
                        'showInfo.phrases.be_mad_about',
                        'showInfo.phrases.your_alignment',
                        'showInfo.phrases.cannot_select_rechoose'
                    ].map(key => (
                        <button 
                            key={key} 
                            onClick={() => insertPhrase(t(key))}
                            className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-xs rounded-full hover:bg-townsfolk-blue hover:text-white transition-colors"
                        >
                            {t(key)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Interaction Count Section */}
            <div className="space-y-2">
                <label className="text-xs font-bold text-moonlit-stone uppercase">交互指令 (Interaction)</label>
                <div className="flex items-center gap-2 mb-2">
                    <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                        <button onClick={() => setSelectionCount(Math.max(1, selectionCount - 1))} className="p-1 hover:text-demon-fire"><MinusIcon className="w-4 h-4"/></button>
                        <span className="w-8 text-center font-bold font-mono">{selectionCount}</span>
                        <button onClick={() => setSelectionCount(selectionCount + 1)} className="p-1 hover:text-townsfolk-blue"><PlusIcon className="w-4 h-4"/></button>
                    </div>
                    <span className="text-xs text-moonlit-stone">數量 (X)</span>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button 
                        onClick={() => insertPhrase(t('showInfo.phrases.select_x_players', { count: selectionCount }))}
                        className="px-3 py-1.5 border border-townsfolk-blue text-townsfolk-blue text-xs rounded-full hover:bg-townsfolk-blue hover:text-white transition-colors"
                    >
                        選 {selectionCount} 玩家
                    </button>
                    <button 
                        onClick={() => insertPhrase(t('showInfo.phrases.select_x_characters', { count: selectionCount }))}
                        className="px-3 py-1.5 border border-celestial-gold text-celestial-gold text-xs rounded-full hover:bg-celestial-gold hover:text-midnight-ink transition-colors"
                    >
                        選 {selectionCount} 角色
                    </button>
                    <button 
                        onClick={() => insertPhrase(t('showInfo.phrases.select_x_players_x_characters', { count: selectionCount }))}
                        className="px-3 py-1.5 border border-slate-400 text-slate-500 dark:text-slate-300 text-xs rounded-full hover:bg-slate-500 hover:text-white transition-colors"
                    >
                        選 {selectionCount} 玩家 & {selectionCount} 角色
                    </button>
                </div>
            </div>

            {/* Custom Text Area */}
            <div className="space-y-2">
                <div className="flex justify-between items-end">
                    <label className="text-xs font-bold text-moonlit-stone uppercase">自定義訊息 (Custom Text)</label>
                    <div className="flex gap-2">
                        <button 
                            onClick={handleReset} 
                            className="text-xs text-slate-500 hover:text-demon-fire dark:text-slate-400 dark:hover:text-demon-fire flex items-center gap-1 transition-colors"
                            title={t('showInfo.reset')}
                        >
                            <ArrowPathIcon className="w-3 h-3"/> {t('showInfo.reset')}
                        </button>
                        <button 
                            onClick={handleSaveFavorite} 
                            disabled={!state.customText.trim()} 
                            className="text-xs text-townsfolk-blue hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1 transition-colors disabled:opacity-50"
                            title={t('showInfo.history.saveFavorite')}
                        >
                            <BookmarkIcon className="w-3 h-3"/> {t('showInfo.history.saveFavorite')}
                        </button>
                    </div>
                </div>
                <textarea 
                    value={state.customText}
                    onChange={(e) => setState(prev => ({ ...prev, customText: e.target.value }))}
                    className="w-full h-24 p-3 rounded-lg border border-stone-border dark:border-slate-700 bg-white dark:bg-black/20 resize-none focus:ring-2 focus:ring-townsfolk-blue outline-none"
                    placeholder={t('showInfo.placeholder')}
                />
                
                {/* Favorites List */}
                {favorites.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2 max-h-24 overflow-y-auto">
                        {favorites.map(fav => (
                            <div key={fav.id} className="group flex items-center text-xs bg-slate-100 dark:bg-slate-800 rounded-full pl-3 pr-1 py-1 border border-slate-200 dark:border-slate-700 hover:border-townsfolk-blue transition-colors">
                                <button 
                                    onClick={() => setState(prev => ({...prev, customText: fav.text}))} 
                                    className="hover:text-townsfolk-blue mr-2 font-medium truncate max-w-[120px]" 
                                    title={fav.text}
                                >
                                    {fav.name}
                                </button>
                                <button onClick={() => handleDeleteFavorite(fav.id)} className="p-1 text-slate-400 hover:text-demon-fire rounded-full transition-colors">
                                    <XMarkIcon className="w-3 h-3"/>
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Select Seats */}
            <div className="space-y-2">
                <label className="text-xs font-bold text-moonlit-stone uppercase">選擇座位 (Highlight Seats)</label>
                <div className="flex flex-wrap gap-2">
                    {assignments.map(a => (
                        <button 
                            key={a.player}
                            onClick={() => handleSeatToggle(a.player)}
                            className={`w-10 h-10 rounded-full font-bold border-2 transition-all ${state.selectedSeatNumbers.includes(a.player) ? 'bg-townsfolk-blue text-white border-townsfolk-blue' : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-500'}`}
                        >
                            #{a.player}
                        </button>
                    ))}
                </div>
            </div>

            {/* Select Characters */}
            <div className="space-y-2">
                <label className="text-xs font-bold text-moonlit-stone uppercase">選擇角色 (Highlight Characters)</label>
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 bg-slate-50 dark:bg-black/20 rounded-lg">
                    {charactersInScript.map(c => (
                        <button 
                            key={c.id}
                            onClick={() => handleCharacterToggle(c.id)}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${state.selectedCharacterIds.includes(c.id) ? 'bg-celestial-gold text-midnight-ink border-celestial-gold' : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-500'}`}
                        >
                            {c.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Alignment Toggle */}
            <div className="space-y-2">
                <label className="text-xs font-bold text-moonlit-stone uppercase">展示陣營 (Alignment Change)</label>
                <div className="flex gap-4">
                    <button 
                        onClick={() => setState(prev => ({ ...prev, alignment: prev.alignment === 'good' ? null : 'good' }))}
                        className={`flex-1 py-2 rounded-lg font-bold border-2 transition-all ${state.alignment === 'good' ? 'bg-townsfolk-blue text-white border-townsfolk-blue' : 'border-slate-300 dark:border-slate-600 text-slate-400'}`}
                    >
                        善良 (Good)
                    </button>
                    <button 
                        onClick={() => setState(prev => ({ ...prev, alignment: prev.alignment === 'evil' ? null : 'evil' }))}
                        className={`flex-1 py-2 rounded-lg font-bold border-2 transition-all ${state.alignment === 'evil' ? 'bg-demon-fire text-white border-demon-fire' : 'border-slate-300 dark:border-slate-600 text-slate-400'}`}
                    >
                        邪惡 (Evil)
                    </button>
                </div>
            </div>

            <button 
                onClick={() => setActiveTab('preview')}
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform"
            >
                <SparklesIcon className="w-5 h-5"/> 預覽展示 (Preview)
            </button>
        </div>
    );

    const renderPreview = () => {
        const selectedChars = state.selectedCharacterIds.map(id => allCharacters.find(c => c.id === id)).filter(Boolean) as Character[];
        
        return (
            <div className="flex flex-col h-full bg-black text-white p-6 rounded-xl relative overflow-hidden">
                <button onClick={() => setActiveTab('editor')} className="absolute top-4 left-4 p-2 bg-white/10 rounded-full hover:bg-white/20 z-10 text-white">
                    <ArrowsRightLeftIcon className="w-5 h-5"/> 返回編輯
                </button>

                <div className="flex-1 flex flex-col items-center justify-center space-y-8 text-center animate-fade-in overflow-y-auto">
                    
                    {/* Text */}
                    {state.customText && (
                        <div className="text-3xl md:text-5xl font-bold font-serif text-celestial-gold whitespace-pre-wrap leading-relaxed max-w-3xl">
                            {state.customText}
                        </div>
                    )}

                    {/* Seats */}
                    {state.selectedSeatNumbers.length > 0 && (
                        <div className="flex flex-wrap justify-center gap-4">
                            {state.selectedSeatNumbers.sort((a,b)=>a-b).map(seat => (
                                <div key={seat} className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-slate-800 border-4 border-slate-600 flex items-center justify-center text-4xl md:text-5xl font-bold font-mono shadow-2xl">
                                    #{seat}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Characters */}
                    {selectedChars.length > 0 && (
                        <div className="flex flex-wrap justify-center gap-6">
                            {selectedChars.map(char => (
                                <div key={char.id} className="flex flex-col items-center space-y-2">
                                    <div className="w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden border-4 border-celestial-gold bg-midnight-ink shadow-2xl">
                                        {char.iconUrl ? <img src={char.iconUrl} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-5xl font-bold">{char.name[0]}</div>}
                                    </div>
                                    <span className="text-lg font-bold text-parchment bg-black/50 px-3 py-1 rounded-full">{char.name}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Alignment */}
                    {state.alignment && (
                        <div className={`text-4xl md:text-6xl font-black uppercase tracking-widest px-8 py-4 border-4 rounded-xl ${state.alignment === 'good' ? 'text-townsfolk-blue border-townsfolk-blue' : 'text-demon-fire border-demon-fire'}`}>
                            {state.alignment === 'good' ? '善良 (GOOD)' : '邪惡 (EVIL)'}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('showInfo.title')}>
            <div className="h-[80vh] md:h-[700px] flex flex-col">
                {activeTab === 'editor' ? renderEditor() : renderPreview()}
            </div>
        </Modal>
    );
};
