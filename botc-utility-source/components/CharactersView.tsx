
import React, { useState, useMemo } from 'react';
import { Character, Script, AbilityTypeDefinition, CharacterType } from '../types';
import { CharacterModal } from './CharacterModal';
import { SearchIcon, PlusIcon, PencilIcon, TrashIcon, CheckCircleIcon, FunnelIcon, BookOpenIcon } from './Icons';

interface CharactersViewProps {
  characters: Character[];
  setCharacters: React.Dispatch<React.SetStateAction<Character[]>>;
  allScripts: Script[];
  setScripts: React.Dispatch<React.SetStateAction<Script[]>>;
  abilityTypes: AbilityTypeDefinition[];
  onAddAbilityType: (type: AbilityTypeDefinition) => void;
  onDeleteAbilityType: (name: string) => void;
  onViewRule: (name: string) => void;
  t: (key: string, options?: any) => string;
}

const TYPE_ORDER: CharacterType[] = ['Townsfolk', 'Outsider', 'Minion', 'Demon', 'Traveler', 'Fabled', 'Loric'];

export const CharactersView: React.FC<CharactersViewProps> = ({ 
  characters, setCharacters, allScripts, setScripts, abilityTypes, 
  onAddAbilityType, onDeleteAbilityType, onViewRule, t 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterScriptId, setFilterScriptId] = useState<string>('All');
  const [filterCharType, setFilterCharType] = useState<CharacterType | 'All'>('All');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReadOnlyMode, setIsReadOnlyMode] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);

  const filteredCharacters = useMemo(() => {
    let result = characters;

    // 1. Filter by Script
    if (filterScriptId !== 'All') {
        const selectedScript = allScripts.find(s => s.id === filterScriptId);
        if (selectedScript) {
            // Create a Set for O(1) lookup
            const allowedIds = new Set(selectedScript.characterIds);
            result = result.filter(c => allowedIds.has(c.id));
        } else {
            // If script not found (e.g. deleted), show nothing or all? 
            // Showing empty is safer to indicate mismatch.
            result = []; 
        }
    }

    // 2. Filter by Character Type
    if (filterCharType !== 'All') {
        result = result.filter(c => c.characterType === filterCharType);
    }

    // 3. Filter by Search Term
    if (searchTerm.trim()) {
        const lowerTerm = searchTerm.toLowerCase();
        result = result.filter(c => 
            c.name.toLowerCase().includes(lowerTerm) || 
            c.ability.toLowerCase().includes(lowerTerm)
        );
    }

    // 4. Sort by Type Order then Name
    return result.sort((a, b) => {
        const indexA = TYPE_ORDER.indexOf(a.characterType);
        const indexB = TYPE_ORDER.indexOf(b.characterType);
        
        // Handle types not in the list (fallback to end)
        const safeIndexA = indexA === -1 ? 99 : indexA;
        const safeIndexB = indexB === -1 ? 99 : indexB;

        if (safeIndexA !== safeIndexB) {
            return safeIndexA - safeIndexB;
        }
        
        return a.name.localeCompare(b.name);
    });
  }, [characters, searchTerm, filterScriptId, filterCharType, allScripts]);

  const handleSaveCharacter = (charData: Omit<Character, 'id'> & { id?: string }) => {
    let finalCharacter: Character;

    if (charData.id) {
      // Update Existing
      finalCharacter = { ...charData } as Character;
      setCharacters(prev => prev.map(c => c.id === charData.id ? finalCharacter : c));
    } else {
      // Create New
      finalCharacter = { ...charData, id: Date.now().toString() } as Character;
      setCharacters(prev => [...prev, finalCharacter]);
    }

    // --- Bi-directional Sync: Update Scripts ---
    // Update all scripts to include/exclude this character based on charData.scriptIds
    const targetCharId = finalCharacter.id;
    const selectedScriptIds = new Set(finalCharacter.scriptIds);

    setScripts(prevScripts => prevScripts.map(script => {
        const hasCharId = script.characterIds.includes(targetCharId);
        const shouldHaveCharId = selectedScriptIds.has(script.id);

        if (shouldHaveCharId && !hasCharId) {
            // Script is selected for char but missing the link -> Add it
            return { ...script, characterIds: [...script.characterIds, targetCharId], lastModified: Date.now() };
        } else if (!shouldHaveCharId && hasCharId) {
            // Script is NOT selected but has the link -> Remove it
            return { ...script, characterIds: script.characterIds.filter(id => id !== targetCharId), lastModified: Date.now() };
        }
        return script;
    }));

    setIsModalOpen(false);
    setEditingCharacter(null);
  };

  const handleDeleteCharacter = (id: string) => {
    if (window.confirm(t('confirmDelete.item', { name: characters.find(c => c.id === id)?.name }))) {
      // Remove character
      setCharacters(prev => prev.filter(c => c.id !== id));

      // Also remove this character ID from all scripts
      setScripts(prev => prev.map(s => ({
          ...s,
          characterIds: s.characterIds.filter(cid => cid !== id),
          lastModified: Date.now()
      })));
    }
  };

  const handleViewDetails = (char: Character) => {
      setEditingCharacter(char);
      setIsReadOnlyMode(true);
      setIsModalOpen(true);
  };

  const handleEdit = (char: Character) => {
      setEditingCharacter(char);
      setIsReadOnlyMode(false);
      setIsModalOpen(true);
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto h-full flex flex-col min-h-0">
      <div className="flex justify-between items-center mb-6 shrink-0">
        <h2 className="text-2xl md:text-3xl font-bold font-serif text-celestial-gold">{t('sidebar.characters')}</h2>
        <button onClick={() => { setEditingCharacter(null); setIsReadOnlyMode(false); setIsModalOpen(true); }} className="px-4 py-2 bg-townsfolk-blue text-white rounded-md flex items-center gap-2 shadow-md hover:bg-blue-600 transition-colors shrink-0">
          <PlusIcon className="w-5 h-5" /> 
          <span className="hidden sm:inline">{t('header.addCharacter')}</span>
          <span className="sm:hidden">新增角色</span>
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6 shrink-0">
        {/* Script Filter */}
        <div className="relative min-w-[150px] md:max-w-[200px] shrink-0">
            <FunnelIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-moonlit-stone" />
            <select 
                value={filterScriptId} 
                onChange={(e) => setFilterScriptId(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-stone-border dark:border-slate-gray bg-white dark:bg-black focus:ring-2 focus:ring-townsfolk-blue outline-none appearance-none cursor-pointer truncate text-sm"
            >
                <option value="All">{t('form.availableScripts')}</option>
                {allScripts.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                ))}
            </select>
        </div>

        {/* Character Type Filter */}
        <div className="relative min-w-[150px] md:max-w-[180px] shrink-0">
            <FunnelIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-moonlit-stone" />
            <select 
                value={filterCharType} 
                onChange={(e) => setFilterCharType(e.target.value as CharacterType | 'All')}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-stone-border dark:border-slate-gray bg-white dark:bg-black focus:ring-2 focus:ring-townsfolk-blue outline-none appearance-none cursor-pointer text-sm"
            >
                <option value="All">{t('form.allCharacterTypes')}</option>
                {TYPE_ORDER.map(type => (
                    <option key={type} value={type}>{t(`characterType.${type}`)}</option>
                ))}
            </select>
        </div>

        {/* Search Bar */}
        <div className="relative flex-grow">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-moonlit-stone" />
            <input 
            type="text" 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder={t('header.searchPlaceholder')} 
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-stone-border dark:border-slate-gray bg-white dark:bg-black focus:ring-2 focus:ring-townsfolk-blue outline-none text-sm"
            />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto pb-32 custom-scrollbar min-h-0">
        {filteredCharacters.length === 0 ? (
            <div className="col-span-full py-12 text-center text-moonlit-stone border-2 border-dashed border-stone-border dark:border-slate-gray rounded-xl">
                No characters found matching current filters.
            </div>
        ) : (
            filteredCharacters.map(char => (
            <div key={char.id} onClick={() => handleViewDetails(char)} className="bg-parchment-white dark:bg-midnight-ink border border-stone-border dark:border-slate-gray rounded-lg p-4 shadow-sm hover:shadow-md transition-all flex flex-col group relative cursor-pointer">
                <div className="flex items-start gap-4 mb-3">
                <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 flex-shrink-0 overflow-hidden border border-slate-400">
                    {char.iconUrl ? <img src={char.iconUrl} alt={char.name} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center font-bold text-xl">{char.name[0]}</div>}
                </div>
                <div className="min-w-0">
                    <h3 className="font-bold text-lg text-ink-text dark:text-parchment truncate">{char.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${
                        char.characterType === 'Townsfolk' ? 'bg-townsfolk-blue/10 text-townsfolk-blue border-townsfolk-blue/30' :
                        char.characterType === 'Outsider' ? 'bg-celestial-gold/10 text-celestial-gold border-celestial-gold/30' :
                        char.characterType === 'Minion' ? 'bg-demon-fire/10 text-demon-fire border-demon-fire/30' :
                        char.characterType === 'Demon' ? 'bg-blood-red/10 text-blood-red border-blood-red/30' :
                        'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600'
                    }`}>
                    {t(`characterType.${char.characterType}`)}
                    </span>
                </div>
                </div>
                <p className="text-sm text-moonlit-stone line-clamp-3 mb-4 flex-grow prose prose-sm dark:prose-invert" dangerouslySetInnerHTML={{ __html: char.ability }} />
                
                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={(e) => { e.stopPropagation(); handleViewDetails(char); }} className="p-2 text-slate-500 hover:text-townsfolk-blue bg-slate-100 dark:bg-slate-800 rounded-full" title={t('form.viewRule')}>
                    <BookOpenIcon className="w-4 h-4" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); handleEdit(char); }} className="p-2 text-slate-500 hover:text-townsfolk-blue bg-slate-100 dark:bg-slate-800 rounded-full" title={t('header.edit')}>
                    <PencilIcon className="w-4 h-4" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); handleDeleteCharacter(char.id); }} className="p-2 text-slate-500 hover:text-demon-fire bg-slate-100 dark:bg-slate-800 rounded-full" title={t('header.delete')}>
                    <TrashIcon className="w-4 h-4" />
                </button>
                </div>
            </div>
            ))
        )}
      </div>

      {isModalOpen && (
        <CharacterModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveCharacter}
          characterToEdit={editingCharacter}
          allScripts={allScripts}
          t={t}
          isReadOnly={isReadOnlyMode}
          onSwitchToEdit={() => setIsReadOnlyMode(false)}
          abilityTypes={abilityTypes}
          onAddAbilityType={onAddAbilityType}
          onDeleteAbilityType={onDeleteAbilityType}
          onViewRule={onViewRule}
        />
      )}
    </div>
  );
};
