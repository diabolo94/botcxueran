
import React, { useState, useMemo } from 'react';
import { Script, Character, ScriptType, CharacterType } from '../types';
import { ScriptModal } from './ScriptModal';
import { ScriptReaderView } from './ScriptReaderView';
import { CharacterModal } from './CharacterModal';
import { SearchIcon, PlusIcon, PencilIcon, TrashIcon, BookOpenIcon, FunnelIcon, UserGroupIcon, ChartBarIcon } from './Icons';
import { getOptimizedImageUrl } from '../utils';

interface ScriptsViewProps {
  scripts: Script[];
  setScripts: React.Dispatch<React.SetStateAction<Script[]>>;
  allCharacters: Character[];
  setCharacters: React.Dispatch<React.SetStateAction<Character[]>>;
  allScriptTypes: ScriptType[];
  onManageScriptTypes: () => void;
  t: (key: string, options?: any) => string;
}

export const ScriptsView: React.FC<ScriptsViewProps> = ({ 
  scripts, setScripts, allCharacters, setCharacters, allScriptTypes, onManageScriptTypes, t 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTypeId, setFilterTypeId] = useState<string>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingScript, setEditingScript] = useState<Script | null>(null);
  const [readingScript, setReadingScript] = useState<Script | null>(null);
  const [viewingCharacter, setViewingCharacter] = useState<Character | null>(null);

  const filteredScripts = useMemo(() => {
    let result = scripts;

    if (filterTypeId !== 'All') {
        result = result.filter(s => s.typeIds.includes(filterTypeId));
    }

    if (searchTerm.trim()) {
        const lowerTerm = searchTerm.toLowerCase();
        result = result.filter(s => s.name.toLowerCase().includes(lowerTerm));
    }

    // Sort by recently modified (fallback to creation time/ID)
    return result.sort((a, b) => {
        const timeA = a.lastModified || parseInt(a.id) || 0;
        const timeB = b.lastModified || parseInt(b.id) || 0;
        return timeB - timeA;
    });
  }, [scripts, searchTerm, filterTypeId]);

  const handleSaveScript = (scriptData: Omit<Script, 'id'> & { id?: string }) => {
    const timestamp = Date.now();
    let finalScript: Script;

    if (scriptData.id) {
      // Update existing script
      finalScript = { ...scriptData, lastModified: timestamp } as Script;
      setScripts(prev => prev.map(s => s.id === scriptData.id ? finalScript : s));
    } else {
      // Create new script
      finalScript = { ...scriptData, id: timestamp.toString(), lastModified: timestamp } as Script;
      setScripts(prev => [...prev, finalScript]);
    }

    // --- Bi-directional Sync: Update Characters ---
    // When a script is saved, we must ensure that all characters included in this script
    // have this script's ID in their `scriptIds` list.
    // Conversely, characters NOT in this script should NOT have this script ID (if they previously did).
    const targetScriptId = finalScript.id;
    const selectedCharIds = new Set(finalScript.characterIds);

    setCharacters(prevChars => prevChars.map(char => {
        const hasScriptId = char.scriptIds.includes(targetScriptId);
        const shouldHaveScriptId = selectedCharIds.has(char.id);

        if (shouldHaveScriptId && !hasScriptId) {
            // Character is in script but missing the link -> Add it
            return { ...char, scriptIds: [...char.scriptIds, targetScriptId] };
        } else if (!shouldHaveScriptId && hasScriptId) {
            // Character is NOT in script but has the link -> Remove it
            return { ...char, scriptIds: char.scriptIds.filter(id => id !== targetScriptId) };
        }
        return char; // No change needed
    }));

    setIsModalOpen(false);
    setEditingScript(null);
  };

  const handleDeleteScript = (id: string) => {
    if (window.confirm(t('confirmDelete.item', { name: scripts.find(s => s.id === id)?.name }))) {
      // Remove script
      setScripts(prev => prev.filter(s => s.id !== id));
      
      // Also remove this script ID from all characters
      setCharacters(prev => prev.map(c => ({
          ...c,
          scriptIds: c.scriptIds.filter(sid => sid !== id)
      })));
    }
  };

  // Helper to calculate character type counts for a script
  const getCharacterStats = (script: Script) => {
      const stats: Record<string, number> = { Townsfolk: 0, Outsider: 0, Minion: 0, Demon: 0, Traveler: 0, Fabled: 0 };
      script.characterIds.forEach(id => {
          const char = allCharacters.find(c => c.id === id);
          if (char && stats[char.characterType] !== undefined) {
              stats[char.characterType]++;
          }
      });
      return stats;
  };

  // Helper to get difficulty label and color
  const getDifficultyMeta = (diff: number) => {
      if (diff >= 4) return { label: 'Hard', color: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800' };
      if (diff === 3) return { label: 'Medium', color: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800' };
      return { label: 'Easy', color: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' };
  };

  if (readingScript) {
    return (
      <>
        <ScriptReaderView 
          script={readingScript}
          allCharacters={allCharacters}
          allScriptTypes={allScriptTypes}
          t={t}
          onClose={() => setReadingScript(null)}
          onViewCharacter={setViewingCharacter}
          onEdit={(s) => {
            setReadingScript(null);
            setEditingScript(s);
            setIsModalOpen(true);
          }}
          onDelete={(id) => {
            handleDeleteScript(id);
            setReadingScript(null);
          }}
        />
        {viewingCharacter && (
          <CharacterModal
            isOpen={true}
            onClose={() => setViewingCharacter(null)}
            onSave={() => {}}
            characterToEdit={viewingCharacter}
            allScripts={scripts}
            t={t}
            isReadOnly={true}
          />
        )}
      </>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto h-full flex flex-col min-h-0">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 shrink-0">
        <h2 className="text-2xl md:text-3xl font-bold font-serif text-celestial-gold">{t('sidebar.scripts')}</h2>
        <button 
            onClick={() => { setEditingScript(null); setIsModalOpen(true); }} 
            className="px-4 py-2 bg-townsfolk-blue text-white rounded-md flex items-center gap-2 shadow-md hover:bg-blue-600 transition-colors shrink-0"
        >
          <PlusIcon className="w-5 h-5" /> 
          <span className="hidden sm:inline">{t('header.addScript')}</span>
          <span className="sm:hidden">新增劇本</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6 bg-slate-100 dark:bg-slate-800/50 p-4 rounded-xl border border-stone-border dark:border-slate-700 shrink-0">
        <div className="relative min-w-[150px] shrink-0">
            <FunnelIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-moonlit-stone" />
            <select 
                value={filterTypeId} 
                onChange={(e) => setFilterTypeId(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-stone-border dark:border-slate-600 bg-white dark:bg-black focus:ring-2 focus:ring-townsfolk-blue outline-none appearance-none cursor-pointer text-sm"
            >
                <option value="All">{t('form.allTypes')}</option>
                {allScriptTypes.map(type => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                ))}
            </select>
        </div>

        <div className="relative flex-grow">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-moonlit-stone" />
            <input 
                type="text" 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder={t('header.searchPlaceholder')} 
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-stone-border dark:border-slate-600 bg-white dark:bg-black focus:ring-2 focus:ring-townsfolk-blue outline-none text-sm"
            />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pb-32 px-1 custom-scrollbar flex-grow content-start min-h-0">
        {filteredScripts.map(script => {
          const stats = getCharacterStats(script);
          const difficultyMeta = getDifficultyMeta(script.difficulty);
          
          return (
            <article 
                key={script.id} 
                className="flex flex-col h-full min-h-[400px] bg-white dark:bg-midnight-ink border border-stone-border dark:border-slate-700 rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all group duration-300"
            >
                {/* 1. Image Section */}
                <div 
                    className="relative w-full h-48 bg-slate-200 dark:bg-slate-800 cursor-pointer overflow-hidden shrink-0"
                    onClick={() => setReadingScript(script)}
                >
                    {script.coverImage ? (
                        <img 
                            src={getOptimizedImageUrl(script.coverImage, { width: 400 })} 
                            alt={script.name} 
                            loading="lazy"
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                        />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-moonlit-stone bg-slate-100 dark:bg-slate-800/50 pattern-grid">
                            <BookOpenIcon className="w-12 h-12 opacity-30 mb-2" />
                            <span className="text-xs font-bold uppercase opacity-50 tracking-widest">No Cover</span>
                        </div>
                    )}
                    
                    {/* Gradient Overlay for better contrast */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity pointer-events-none" />

                    {/* Role Count Badge */}
                    <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-sm border border-white/20">
                        <UserGroupIcon className="w-3 h-3" />
                        {script.characterIds.length}
                    </div>
                </div>
                
                {/* 2. Content Body */}
                <div 
                    className="p-4 flex flex-col flex-1 cursor-pointer relative bg-white dark:bg-midnight-ink overflow-hidden"
                    onClick={() => setReadingScript(script)}
                >
                    {/* Title & Difficulty */}
                    <div className="flex justify-between items-start gap-2 mb-3">
                        <h3 className="text-lg font-bold text-ink-text dark:text-parchment leading-tight group-hover:text-townsfolk-blue transition-colors line-clamp-2" title={script.name}>
                            {script.name}
                        </h3>
                    </div>

                    {/* Meta Tags Row */}
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border flex items-center gap-1 ${difficultyMeta.color}`}>
                            <ChartBarIcon className="w-3 h-3" />
                            {difficultyMeta.label} ({script.difficulty}/5)
                        </span>
                        {script.typeIds.slice(0, 2).map(tid => {
                            const tName = allScriptTypes.find(t => t.id === tid)?.name;
                            return tName ? (
                                <span key={tid} className="text-[10px] px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-600 truncate max-w-[80px]">
                                    {tName}
                                </span>
                            ) : null;
                        })}
                    </div>

                    {/* Character Stats Bar */}
                    <div className="grid grid-cols-4 gap-1 mb-4 w-full bg-slate-50 dark:bg-slate-900/50 p-1 rounded-lg border border-stone-border dark:border-slate-800">
                        <div className="flex flex-col items-center justify-center p-1 bg-townsfolk-blue/5 rounded">
                            <span className="text-[9px] text-townsfolk-blue font-bold uppercase">Town</span>
                            <span className="text-xs font-black text-ink-text dark:text-parchment">{stats.Townsfolk}</span>
                        </div>
                        <div className="flex flex-col items-center justify-center p-1 bg-celestial-gold/5 rounded">
                            <span className="text-[9px] text-celestial-gold font-bold uppercase">Out</span>
                            <span className="text-xs font-black text-ink-text dark:text-parchment">{stats.Outsider}</span>
                        </div>
                        <div className="flex flex-col items-center justify-center p-1 bg-demon-fire/5 rounded">
                            <span className="text-[9px] text-demon-fire font-bold uppercase">Min</span>
                            <span className="text-xs font-black text-ink-text dark:text-parchment">{stats.Minion}</span>
                        </div>
                        <div className="flex flex-col items-center justify-center p-1 bg-blood-red/5 rounded">
                            <span className="text-[9px] text-blood-red font-bold uppercase">Dem</span>
                            <span className="text-xs font-black text-ink-text dark:text-parchment">{stats.Demon}</span>
                        </div>
                    </div>
                    
                    {/* Description */}
                    <div className="flex-1 min-h-0">
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed">
                            {script.description || <span className="italic opacity-50">No description provided.</span>}
                        </p>
                    </div>
                </div>

                {/* 3. Footer Actions */}
                <div className="flex justify-between items-center p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/30 mt-auto shrink-0 backdrop-blur-sm gap-2">
                    <button 
                        onClick={(e) => { e.stopPropagation(); setReadingScript(script); }} 
                        className="flex-1 flex items-center justify-center gap-2 text-townsfolk-blue hover:text-white hover:bg-townsfolk-blue font-bold text-xs px-3 py-2 rounded-md border border-townsfolk-blue transition-colors"
                    >
                        <BookOpenIcon className="w-4 h-4"/> 
                        {t('form.viewRule')}
                    </button>
                    
                    <div className="flex gap-2">
                        <button 
                            onClick={(e) => { e.stopPropagation(); setEditingScript(script); setIsModalOpen(true); }} 
                            className="p-2 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-townsfolk-blue hover:text-white hover:border-townsfolk-blue transition-all shadow-sm"
                            title={t('header.edit')}
                            aria-label={t('header.edit')}
                        >
                            <PencilIcon className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteScript(script.id); }} 
                            className="p-2 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-demon-fire hover:text-white hover:border-demon-fire transition-all shadow-sm"
                            title={t('header.delete')}
                            aria-label={t('header.delete')}
                        >
                            <TrashIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </article>
          );
        })}
      </div>

      {isModalOpen && (
        <ScriptModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveScript}
          scriptToEdit={editingScript}
          allScriptTypes={allScriptTypes}
          allCharacters={allCharacters}
          t={t}
          onManageScriptTypes={onManageScriptTypes}
        />
      )}
    </div>
  );
};
