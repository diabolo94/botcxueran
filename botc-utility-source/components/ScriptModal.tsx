
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Script, ScriptType, Character, NightOrderItem, CharacterType } from '../types';
import { Modal } from './Modal';
import { ImageUploader } from './ImageUploader';
import { SearchIcon, XMarkIcon, PencilIcon, PlusIcon, TrashIcon, ClockIcon, ChevronRightIcon, ChevronLeftIcon, CheckCircleIcon, ArrowPathIcon } from './Icons';
import { getOptimizedImageUrl } from '../utils';

// Reusable Night Order Editor Component
const NightOrderEditor: React.FC<{
  title: string;
  order: NightOrderItem[];
  onOrderChange: (newOrder: NightOrderItem[]) => void;
  availableCharacters: Character[];
  allCharacters: Character[];
  predefinedActions: { id: string; text: string }[];
  t: (key: string) => string;
}> = ({ title, order, onOrderChange, availableCharacters, allCharacters, predefinedActions, t }) => {
  const [newActionCharId, setNewActionCharId] = useState<string>('');
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const handleAddAction = () => {
    if (!newActionCharId) return;

    if (newActionCharId.startsWith('predefined:')) {
        const actionId = newActionCharId.replace('predefined:', '');
        const action = predefinedActions.find(a => a.id === actionId);
        if (action) {
            const newItem: NightOrderItem = {
                id: uuidv4(),
                characterId: newActionCharId, // Store the full 'predefined:...' string
                customText: action.text,
            };
            onOrderChange([...order, newItem]);
            setNewActionCharId('');
        }
    } else {
        const character = allCharacters.find(c => c.id === newActionCharId);
        if (!character) return;
        
        const newItem: NightOrderItem = {
            id: uuidv4(),
            characterId: newActionCharId,
            customText: character.name,
        };
        onOrderChange([...order, newItem]);
        setNewActionCharId('');
    }
  };

  const handleRemoveAction = (id: string) => {
    onOrderChange(order.filter(item => item.id !== id));
  };

  const handleTextChange = (id: string, newText: string) => {
    onOrderChange(order.map(item => item.id === id ? { ...item, customText: newText } : item));
  };
  
  const handleDragSort = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    const newOrder = [...order];
    const draggedItemContent = newOrder.splice(dragItem.current, 1)[0];
    newOrder.splice(dragOverItem.current, 0, draggedItemContent);
    dragItem.current = null;
    dragOverItem.current = null;
    onOrderChange(newOrder);
  };

  return (
    <div>
      <h4 className="font-semibold mb-2 text-moonlit-stone">{title}</h4>
      <div className="space-y-2 p-2 border border-stone-border dark:border-slate-gray rounded-md min-h-[10rem] max-h-[15rem] overflow-y-auto custom-scrollbar">
        {order.length === 0 ? (
           <p className="text-center text-sm text-slate-text dark:text-moonlit-stone py-4">{t('form.noActionsYet')}</p>
        ) : (
          order.map((item, index) => {
            const isPredefined = item.characterId.startsWith('predefined:');
            const character = isPredefined ? null : allCharacters.find(c => c.id === item.characterId);
            return (
              <div
                key={item.id}
                draggable
                onDragStart={() => dragItem.current = index}
                onDragEnter={() => dragOverItem.current = index}
                onDragEnd={handleDragSort}
                onDragOver={(e) => e.preventDefault()}
                className="flex items-center gap-2 p-2 bg-daylight-bg dark:bg-ravens-night rounded-md cursor-grab active:cursor-grabbing"
              >
                <div className="w-8 h-8 rounded-full bg-midnight-ink overflow-hidden flex-shrink-0 flex items-center justify-center border border-slate-600">
                  {isPredefined ? (
                    <ClockIcon className="w-5 h-5 text-parchment" />
                  ) : character?.iconUrl ? (
                    <img src={character.iconUrl} alt={character.name} className="w-full h-full object-cover"/>
                  ) : (
                    <div className="w-full h-full bg-slate-gray flex items-center justify-center text-sm font-serif">{character?.name.charAt(0)}</div>
                  )}
                </div>
                <input
                  type="text"
                  value={item.customText}
                  onChange={(e) => handleTextChange(item.id, e.target.value)}
                  placeholder={t('form.customActionText')}
                  className="flex-grow bg-transparent focus:outline-none text-sm"
                />
                <button type="button" onClick={() => handleRemoveAction(item.id)} className="text-moonlit-stone hover:text-demon-fire"><TrashIcon className="w-4 h-4"/></button>
              </div>
            );
          })
        )}
      </div>
      <div className="flex items-center gap-2 mt-2">
        <select value={newActionCharId} onChange={(e) => setNewActionCharId(e.target.value)} className="flex-grow bg-parch-white dark:bg-ravens-night border border-stone-border dark:border-slate-gray rounded-md px-3 py-2 text-ink-text dark:text-parchment focus:ring-townsfolk-blue focus:border-townsfolk-blue text-sm">
          <option value="">{t('form.selectCharacterOrAction')}</option>
           <optgroup label={t('form.characters')}>
              {availableCharacters.map(char => (
                <option key={char.id} value={char.id}>{char.name}</option>
              ))}
            </optgroup>
            {predefinedActions.length > 0 && (
              <optgroup label={t('form.predefinedActions')}>
                {predefinedActions.map(action => (
                  <option key={action.id} value={`predefined:${action.id}`}>
                    {action.text.substring(0, 40)}{action.text.length > 40 ? '...' : ''}
                  </option>
                ))}
              </optgroup>
            )}
        </select>
        <button type="button" onClick={handleAddAction} disabled={!newActionCharId} className="p-2 rounded-md bg-townsfolk-blue text-white disabled:opacity-50 disabled:cursor-not-allowed">
          <PlusIcon className="w-5 h-5"/>
        </button>
      </div>
    </div>
  );
};


interface ScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (script: Omit<Script, 'id'> & { id?: string }) => void;
  scriptToEdit: Script | null;
  allScriptTypes: ScriptType[];
  allCharacters: Character[];
  t: (key: string, options?: { [key: string]: string | number }) => string;
  onManageScriptTypes: () => void;
}

const emptyScript: Omit<Script, 'id'> = {
  name: '',
  description: '',
  coverImage: '',
  typeIds: [],
  difficulty: 1,
  characterListImage: '',
  characterIds: [],
  jsonUrl: '',
  handbookUrl: '',
  firstNightOrder: [],
  otherNightsOrder: [],
};

export const ScriptModal: React.FC<ScriptModalProps> = ({ isOpen, onClose, onSave, scriptToEdit, allScriptTypes, allCharacters, t, onManageScriptTypes }) => {
  const [script, setScript] = useState<Omit<Script, 'id'> & { id?: string }>({ ...emptyScript });
  const [characterSearch, setCharacterSearch] = useState('');
  const [selectedCharacterSearch, setSelectedCharacterSearch] = useState('');
  const [availableTypeFilter, setAvailableTypeFilter] = useState<CharacterType | 'All'>('All');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<CharacterType | 'All'>('All');
  const [mobileTab, setMobileTab] = useState<'available' | 'selected'>('available'); // Optimization 1: Mobile Tabs
  
  // Staging for Batch Operations
  const [stagedCharacterIds, setStagedCharacterIds] = useState<Set<string>>(new Set());
  const [stagedForRemovalCharacterIds, setStagedForRemovalCharacterIds] = useState<Set<string>>(new Set());

  const predefinedFirstNightActions = useMemo(() => [
    { id: 'night-check', text: t('nightActions.firstNight.checkEyes') },
    { id: 'minions-info', text: t('nightActions.firstNight.minionsInfo') },
    { id: 'demon-info', text: t('nightActions.firstNight.demonInfo') },
    { id: 'dawn', text: t('nightActions.firstNight.dawn') },
  ], [t]);

  const predefinedOtherNightActions = useMemo(() => [
    { id: 'night-check', text: t('nightActions.otherNights.checkEyes') },
    { id: 'dawn', text: t('nightActions.otherNights.dawn') },
  ], [t]);


  useEffect(() => {
    if (scriptToEdit) {
      setScript({ ...emptyScript, ...scriptToEdit });
    } else {
      setScript({ ...emptyScript });
    }
    setCharacterSearch('');
    setSelectedCharacterSearch('');
    setAvailableTypeFilter('All');
    setSelectedTypeFilter('All');
    setStagedCharacterIds(new Set());
    setStagedForRemovalCharacterIds(new Set());
    setMobileTab('available');
  }, [scriptToEdit, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setScript(prev => ({ ...prev, [name]: name === 'difficulty' ? parseInt(value) : value }));
  };

  const handleTypeToggle = (typeId: string) => {
    setScript(prev => {
      const newTypeIds = prev.typeIds.includes(typeId)
        ? prev.typeIds.filter(id => id !== typeId)
        : [...prev.typeIds, typeId];
      return { ...prev, typeIds: newTypeIds };
    });
  };
  
  // Advanced Search Logic
  const filterCharacters = (pool: Character[], query: string, typeFilter: CharacterType | 'All' = 'All') => {
      let result = pool;

      // 1. Filter by Type
      if (typeFilter !== 'All') {
          result = result.filter(c => c.characterType === typeFilter);
      }

      // 2. Filter by Query
      if (!query.trim()) return result;
      
      const terms = query.toLowerCase().split(/[:;,\n|]/).map(t => t.trim()).filter(Boolean);
      if (terms.length === 0) return result;

      return result.filter(char => {
          const charNameLower = char.name.toLowerCase();
          return terms.some(term => charNameLower.includes(term));
      });
  };

  // --- Staging Handlers ---

  const toggleStaged = (id: string) => {
      setStagedCharacterIds(prev => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
      });
  };

  const toggleStagedRemoval = (id: string) => {
      setStagedForRemovalCharacterIds(prev => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
      });
  };

  const handleBatchAdd = () => {
      if (stagedCharacterIds.size === 0) return;
      setScript(prev => ({
          ...prev,
          characterIds: [...new Set([...prev.characterIds, ...Array.from(stagedCharacterIds)])]
      }));
      setStagedCharacterIds(new Set());
      // Optional: clear search but keep type filter
      setCharacterSearch('');
  };

  const handleBatchRemove = () => {
      if (stagedForRemovalCharacterIds.size === 0) return;
      setScript(prev => ({
          ...prev,
          characterIds: prev.characterIds.filter(id => !stagedForRemovalCharacterIds.has(id))
      }));
      setStagedForRemovalCharacterIds(new Set());
  };

  // --- Memoized Lists ---

  const availableCharacters = useMemo(() => 
      allCharacters.filter(c => !script.characterIds.includes(c.id)).sort((a,b) => a.name.localeCompare(b.name)),
      [allCharacters, script.characterIds]
  );

  const selectedCharacters = useMemo(() => 
      script.characterIds.map(id => allCharacters.find(c => c.id === id)).filter(Boolean) as Character[],
      [allCharacters, script.characterIds]
  );

  // Apply filters to both columns
  const filteredAvailable = useMemo(() => filterCharacters(availableCharacters, characterSearch, availableTypeFilter), [availableCharacters, characterSearch, availableTypeFilter]);
  const filteredSelected = useMemo(() => filterCharacters(selectedCharacters, selectedCharacterSearch, selectedTypeFilter), [selectedCharacters, selectedCharacterSearch, selectedTypeFilter]);

  // Optimization 3: Script Balance Summary
  const typeDistribution = useMemo(() => {
      const counts: Record<string, number> = { Townsfolk: 0, Outsider: 0, Minion: 0, Demon: 0, Traveler: 0, Fabled: 0, Loric: 0 };
      selectedCharacters.forEach(c => {
          if (counts[c.characterType] !== undefined) counts[c.characterType]++;
      });
      return counts;
  }, [selectedCharacters]);

  const selectAllAvailable = () => {
      const newSet = new Set(stagedCharacterIds);
      filteredAvailable.forEach(c => newSet.add(c.id));
      setStagedCharacterIds(newSet);
  };

  const deselectAllAvailable = () => {
      setStagedCharacterIds(prev => {
          const next = new Set(prev);
          filteredAvailable.forEach(c => next.delete(c.id));
          return next;
      });
  };

  const selectAllSelected = () => {
      const newSet = new Set(stagedForRemovalCharacterIds);
      filteredSelected.forEach(c => newSet.add(c.id));
      setStagedForRemovalCharacterIds(newSet);
  };

  const deselectAllSelected = () => {
      setStagedForRemovalCharacterIds(prev => {
          const next = new Set(prev);
          filteredSelected.forEach(c => next.delete(c.id));
          return next;
      });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (script.name.trim() === '') {
        alert(t('alert.nameRequired'));
        return;
    }
    
    if (scriptToEdit) {
      onSave({ ...script, id: scriptToEdit.id });
    } else {
      onSave(script);
    }
      
    onClose();
  };

  // Optimization 5: Keyboard Shortcuts
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (!isOpen) return;
          // Check if user is typing in an input
          const tagName = (e.target as HTMLElement).tagName;
          if (tagName === 'INPUT' || tagName === 'TEXTAREA') return;

          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
              e.preventDefault();
              handleBatchAdd();
          } else if (e.key === 'Delete' || e.key === 'Backspace') {
              // Only trigger if we have items to remove and NOT editing text
              if (stagedForRemovalCharacterIds.size > 0) {
                  e.preventDefault();
                  handleBatchRemove();
              }
          }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, stagedCharacterIds, stagedForRemovalCharacterIds]);

  const title = scriptToEdit ? t('scriptModal.editTitle') : t('scriptModal.addTitle');

  // Type Color Mapping for UI
  const getTypeColor = (type: CharacterType) => {
      switch(type) {
          case 'Townsfolk': return 'text-townsfolk-blue border-townsfolk-blue bg-townsfolk-blue/10';
          case 'Outsider': return 'text-celestial-gold border-celestial-gold bg-celestial-gold/10';
          case 'Minion': return 'text-demon-fire border-demon-fire bg-demon-fire/10';
          case 'Demon': return 'text-blood-red border-blood-red bg-blood-red/10';
          case 'Traveler': return 'text-indigo-500 border-indigo-500 bg-indigo-500/10';
          case 'Fabled': return 'text-yellow-600 border-yellow-600 bg-yellow-600/10';
          case 'Loric': return 'text-purple-500 border-purple-500 bg-purple-500/10';
          default: return 'text-slate-500 border-slate-500 bg-slate-500/10';
      }
  };

  const renderTypeFilterBar = (currentFilter: CharacterType | 'All', setFilter: (t: CharacterType | 'All') => void) => (
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide shrink-0">
          <button type="button" onClick={() => setFilter('All')} className={`px-2 py-0.5 text-[10px] rounded border transition-colors ${currentFilter === 'All' ? 'bg-slate-700 text-white border-slate-700' : 'border-slate-300 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>All</button>
          {['Townsfolk', 'Outsider', 'Minion', 'Demon', 'Traveler', 'Fabled', 'Loric'].map(type => (
              <button 
                  type="button"
                  key={type} 
                  onClick={() => setFilter(type as CharacterType)} 
                  className={`px-2 py-0.5 text-[10px] rounded border whitespace-nowrap transition-colors ${currentFilter === type ? getTypeColor(type as CharacterType) : 'border-slate-300 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              >
                  {type.slice(0, 3)}
              </button>
          ))}
      </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-6">
          <InputField label={t('form.name')} name="name" value={script.name} onChange={handleChange} required />
          <TextAreaField label={t('form.description')} name="description" value={script.description} onChange={handleChange} />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ImageUploader label={t('form.coverImageUrl')} value={script.coverImage} onChange={(newValue) => setScript(prev => ({ ...prev, coverImage: newValue }))} t={t} />
            <ImageUploader label={t('form.characterListImageUrl')} value={script.characterListImage} onChange={(newValue) => setScript(prev => ({ ...prev, characterListImage: newValue }))} t={t} />
          </div>
      
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputField label={t('form.jsonUrl')} name="jsonUrl" value={script.jsonUrl} onChange={handleChange} placeholder="https://example.com/script.json" />
            <InputField label={t('form.handbookUrl')} name="handbookUrl" value={script.handbookUrl} onChange={handleChange} placeholder="https://example.com/handbook.pdf" />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-slate-text dark:text-moonlit-stone">{t('form.scriptTypes')}</label>
                <button type="button" onClick={onManageScriptTypes} className="p-1 text-moonlit-stone hover:text-parchment rounded-full hover:bg-slate-gray/50 transition-colors">
                    <PencilIcon className="w-4 h-4" />
                </button>
            </div>
            <div className="flex flex-wrap gap-2">
                {allScriptTypes.map(type => (
                <button
                    key={type.id}
                    type="button"
                    onClick={() => handleTypeToggle(type.id)}
                    className={`px-3 py-1 text-sm rounded-full transition-colors ${script.typeIds.includes(type.id) ? 'bg-townsfolk-blue text-white' : 'bg-stone-border dark:bg-slate-gray text-ink-text dark:text-parchment hover:bg-opacity-80'}`}
                >
                    {type.name}
                </button>
                ))}
            </div>
          </div>
          
          {/* Enhanced Character Selector - FIXED HEIGHT & FLEXBOX */}
          <div>
            <div className="flex justify-between items-end mb-2">
                <label className="block text-sm font-medium text-slate-text dark:text-moonlit-stone">
                    {t('form.characters')} ({script.characterIds.length})
                </label>
            </div>
            
            {/* Mobile Tabs */}
            <div className="md:hidden flex mb-2 border-b border-stone-border dark:border-slate-700">
                <button 
                    type="button"
                    onClick={() => setMobileTab('available')}
                    className={`flex-1 py-2 text-sm font-bold border-b-2 transition-colors ${mobileTab === 'available' ? 'border-townsfolk-blue text-townsfolk-blue' : 'border-transparent text-slate-500'}`}
                >
                    {t('form.availableCharacters')}
                </button>
                <button 
                    type="button"
                    onClick={() => setMobileTab('selected')}
                    className={`flex-1 py-2 text-sm font-bold border-b-2 transition-colors ${mobileTab === 'selected' ? 'border-demon-fire text-demon-fire' : 'border-transparent text-slate-500'}`}
                >
                    {t('form.selectedCharacters')} ({script.characterIds.length})
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-11 gap-4 items-start">
                
                {/* Left Column: Available - FLEX CONTAINER WITH STRICT HEIGHT */}
                <div className={`${mobileTab === 'available' ? 'block' : 'hidden'} md:block md:col-span-5 border border-stone-border dark:border-slate-gray rounded-md flex flex-col h-[60vh] md:h-[450px] bg-white dark:bg-black/20 overflow-hidden`}>
                    {/* Header */}
                    <div className="p-2 border-b border-stone-border dark:border-slate-gray bg-slate-100 dark:bg-slate-900 shrink-0 space-y-2">
                        <div className="flex justify-between items-center">
                            <h4 className="font-bold text-xs text-moonlit-stone">{t('form.availableCharacters')} ({filteredAvailable.length})</h4>
                            <div className="flex gap-2">
                                <button onClick={selectAllAvailable} type="button" className="text-xs text-townsfolk-blue hover:underline">{t('bulk.selectAll')}</button>
                                <button onClick={deselectAllAvailable} type="button" className="text-xs text-slate-500 hover:underline">{t('bulk.unselectAll')}</button>
                            </div>
                        </div>
                        
                        {/* Type Filters */}
                        {renderTypeFilterBar(availableTypeFilter, setAvailableTypeFilter)}

                        <div className="relative">
                            <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-moonlit-stone pointer-events-none"/>
                            <input 
                                type="text"
                                placeholder={t('form.searchCharacters')}
                                value={characterSearch}
                                onChange={(e) => setCharacterSearch(e.target.value)}
                                className="w-full bg-white dark:bg-black border border-stone-border dark:border-slate-700 rounded-md py-1 pl-7 pr-2 text-xs focus:ring-1 focus:ring-townsfolk-blue"
                            />
                        </div>
                    </div>
                    {/* Scrollable List Area - min-h-0 is crucial for flex children scrolling */}
                    <div className="flex-grow overflow-y-auto p-1 space-y-0.5 custom-scrollbar min-h-0">
                        {filteredAvailable.map(char => (
                            // Optimization 4: Tooltip
                            <label key={`avail-${char.id}`} className={`flex items-center p-1.5 rounded cursor-pointer transition-colors group ${stagedCharacterIds.has(char.id) ? 'bg-townsfolk-blue/10 dark:bg-townsfolk-blue/20' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`} title={char.ability}>
                                <input
                                    type="checkbox"
                                    checked={stagedCharacterIds.has(char.id)}
                                    onChange={() => toggleStaged(char.id)}
                                    className="h-4 w-4 rounded border-slate-300 text-townsfolk-blue focus:ring-townsfolk-blue bg-white dark:bg-black shrink-0"
                                />
                                <span className="ml-2 text-sm text-ink-text dark:text-parchment truncate flex-1">{char.name}</span>
                                <span className={`text-[9px] px-1.5 rounded font-bold uppercase shrink-0 ${getTypeColor(char.characterType).replace('bg-', 'text-').split(' ')[0]}`}>
                                    {char.characterType.slice(0, 1)}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>
                
                {/* Center: Controls (Responsive) */}
                <div className="md:col-span-1 flex flex-row md:flex-col justify-center items-center gap-2 h-auto md:h-full py-2 sticky bottom-0 md:static bg-daylight-bg dark:bg-ravens-night md:bg-transparent z-20 border-t md:border-t-0 border-stone-border dark:border-slate-700">
                    {/* Show Add button if on Desktop OR on Available Tab */}
                    <button
                        type="button"
                        onClick={handleBatchAdd}
                        disabled={stagedCharacterIds.size === 0}
                        className={`${mobileTab === 'available' ? 'flex' : 'hidden'} md:flex p-2 w-full rounded-md bg-townsfolk-blue text-white disabled:opacity-50 disabled:bg-slate-400 hover:bg-blue-600 transition-colors shadow-sm flex-col items-center justify-center gap-1`}
                        title={t('form.addSelected')}
                    >
                        <ChevronRightIcon className="w-5 h-5 hidden md:block" />
                        <span className="text-xs font-bold whitespace-nowrap">{stagedCharacterIds.size > 0 ? `+${stagedCharacterIds.size}` : 'Add'}</span>
                        <ChevronRightIcon className="w-5 h-5 rotate-90 md:hidden" />
                    </button>

                    {/* Show Remove button if on Desktop OR on Selected Tab */}
                    <button
                        type="button"
                        onClick={handleBatchRemove}
                        disabled={stagedForRemovalCharacterIds.size === 0}
                        className={`${mobileTab === 'selected' ? 'flex' : 'hidden'} md:flex p-2 w-full rounded-md bg-demon-fire text-white disabled:opacity-50 disabled:bg-slate-400 hover:bg-red-600 transition-colors shadow-sm flex-col items-center justify-center gap-1`}
                        title={t('form.removeSelected')}
                    >
                        <ChevronLeftIcon className="w-5 h-5 hidden md:block" />
                        <span className="text-xs font-bold whitespace-nowrap">{stagedForRemovalCharacterIds.size > 0 ? `-${stagedForRemovalCharacterIds.size}` : 'Rem'}</span>
                        <ChevronLeftIcon className="w-5 h-5 rotate-90 md:hidden" />
                    </button>
                </div>
                
                {/* Right Column: Selected - FLEX CONTAINER WITH STRICT HEIGHT */}
                <div className={`${mobileTab === 'selected' ? 'block' : 'hidden'} md:block md:col-span-5 border border-stone-border dark:border-slate-gray rounded-md flex flex-col h-[60vh] md:h-[450px] bg-white dark:bg-black/20 overflow-hidden`}>
                    {/* Header */}
                    <div className="p-2 border-b border-stone-border dark:border-slate-gray bg-slate-100 dark:bg-slate-900 shrink-0 space-y-2">
                        <div className="flex justify-between items-center">
                            <div className="flex flex-col">
                                <h4 className="font-bold text-xs text-moonlit-stone">{t('form.selectedCharacters')} ({script.characterIds.length})</h4>
                                {/* Optimization 3: Balance Summary */}
                                <div className="flex gap-1 mt-0.5">
                                    <span className="text-[8px] bg-townsfolk-blue/20 text-townsfolk-blue px-1 rounded">T:{typeDistribution.Townsfolk}</span>
                                    <span className="text-[8px] bg-celestial-gold/20 text-celestial-gold px-1 rounded">O:{typeDistribution.Outsider}</span>
                                    <span className="text-[8px] bg-demon-fire/20 text-demon-fire px-1 rounded">M:{typeDistribution.Minion}</span>
                                    <span className="text-[8px] bg-blood-red/20 text-blood-red px-1 rounded">D:{typeDistribution.Demon}</span>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={selectAllSelected} type="button" className="text-xs text-demon-fire hover:underline">{t('bulk.selectAll')}</button>
                                <button onClick={deselectAllSelected} type="button" className="text-xs text-slate-500 hover:underline">{t('bulk.unselectAll')}</button>
                            </div>
                        </div>
                        
                        {/* Type Filters for Selected Column */}
                        {renderTypeFilterBar(selectedTypeFilter, setSelectedTypeFilter)}

                        <div className="relative">
                            <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-moonlit-stone pointer-events-none"/>
                            <input 
                                type="text"
                                placeholder={t('form.searchSelectedCharacters')}
                                value={selectedCharacterSearch}
                                onChange={(e) => setSelectedCharacterSearch(e.target.value)}
                                className="w-full bg-white dark:bg-black border border-stone-border dark:border-slate-700 rounded-md py-1 pl-7 pr-2 text-xs focus:ring-1 focus:ring-demon-fire"
                            />
                        </div>
                    </div>
                    <div className="flex-grow overflow-y-auto p-1 space-y-0.5 custom-scrollbar min-h-0">
                        {filteredSelected.map(char => (
                            <label key={`sel-${char.id}`} className={`flex items-center p-1.5 rounded cursor-pointer transition-colors ${stagedForRemovalCharacterIds.has(char.id) ? 'bg-demon-fire/10 dark:bg-demon-fire/20' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`} title={char.ability}>
                                <input
                                    type="checkbox"
                                    checked={stagedForRemovalCharacterIds.has(char.id)}
                                    onChange={() => toggleStagedRemoval(char.id)}
                                    className="h-4 w-4 rounded border-slate-300 text-demon-fire focus:ring-demon-fire bg-white dark:bg-black shrink-0"
                                />
                                <span className="ml-2 text-sm text-ink-text dark:text-parchment truncate flex-1">{char.name}</span>
                                <span className={`text-[9px] px-1.5 rounded font-bold uppercase shrink-0 ${getTypeColor(char.characterType).replace('bg-', 'text-').split(' ')[0]}`}>
                                    {char.characterType.slice(0, 1)}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>
            </div>
          </div>

          <div className="border-t border-stone-border dark:border-slate-gray pt-6">
            <h3 className="text-lg font-semibold text-ink-text dark:text-parchment mb-4">{t('form.nightOrder')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <NightOrderEditor
                title={t('form.firstNight')}
                order={script.firstNightOrder || []}
                onOrderChange={(newOrder) => setScript(prev => ({...prev, firstNightOrder: newOrder}))}
                availableCharacters={selectedCharacters}
                allCharacters={allCharacters}
                predefinedActions={predefinedFirstNightActions}
                t={t}
              />
              <NightOrderEditor
                title={t('form.otherNights')}
                order={script.otherNightsOrder || []}
                onOrderChange={(newOrder) => setScript(prev => ({...prev, otherNightsOrder: newOrder}))}
                availableCharacters={selectedCharacters}
                allCharacters={allCharacters}
                predefinedActions={predefinedOtherNightActions}
                t={t}
              />
            </div>
          </div>


          <div className="flex justify-end space-x-4 pt-4 border-t border-stone-border dark:border-slate-gray">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-md bg-stone-border dark:bg-slate-gray hover:bg-opacity-80 transition-colors text-ink-text dark:text-parchment">{t('form.cancel')}</button>
            <button type="submit" className="px-6 py-2 rounded-md bg-blood-red hover:bg-demon-fire text-white transition-colors shadow-md">{t('form.saveScript')}</button>
          </div>
      </form>
    </Modal>
  );
};

const InputField: React.FC<any> = ({ label, ...props }) => (
  <div>
    <label htmlFor={props.name} className="block text-sm font-medium text-slate-text dark:text-moonlit-stone mb-1">{label}</label>
    <input id={props.name} {...props} className="w-full bg-parchment-white dark:bg-ravens-night border border-stone-border dark:border-slate-gray rounded-md px-3 py-2 text-ink-text dark:text-parchment focus:ring-townsfolk-blue focus:border-townsfolk-blue" />
  </div>
);

const TextAreaField: React.FC<any> = ({ label, ...props }) => (
  <div>
    <label htmlFor={props.name} className="block text-sm font-medium text-slate-text dark:text-moonlit-stone mb-1">{label}</label>
    <textarea id={props.name} {...props} rows={3} className="w-full bg-parchment-white dark:bg-ravens-night border border-stone-border dark:border-slate-gray rounded-md px-3 py-2 text-ink-text dark:text-parchment focus:ring-townsfolk-blue focus:border-townsfolk-blue" />
  </div>
);
