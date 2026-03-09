
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Character, Script, AbilityTypeDefinition } from '../types';
import { Modal } from './Modal';
import { ImageUploader } from './ImageUploader';
import { SearchIcon, XMarkIcon, TrashIcon, PencilIcon, PlusIcon, BookOpenIcon, CheckIcon, ArrowsRightLeftIcon, StarIcon, MoonIcon, SunIcon, BoltIcon, CheckCircleIcon, ClockIcon, EyeIcon } from './Icons';
import { RichTextEditor } from './RichTextEditor';

// --- Icons & Colors Mapping (Replicated for Tags) ---
const ICON_MAP: Record<string, React.FC<React.SVGProps<SVGSVGElement>>> = {
    'Star': StarIcon,
    'Moon': MoonIcon,
    'Sun': SunIcon,
    'Bolt': BoltIcon,
    'Shield': CheckCircleIcon,
    'Skull': TrashIcon,
    'Clock': ClockIcon,
    'Eye': EyeIcon,
};

const COLOR_MAP: Record<string, string> = {
    'blue': 'bg-blue-100 text-blue-700 border-blue-300',
    'red': 'bg-red-100 text-red-700 border-red-300',
    'gold': 'bg-yellow-100 text-yellow-700 border-yellow-300',
    'green': 'bg-green-100 text-green-700 border-green-300',
    'purple': 'bg-purple-100 text-purple-700 border-purple-300',
    'gray': 'bg-gray-100 text-gray-700 border-gray-300',
    'slate': 'bg-slate-200 text-slate-700 border-slate-300',
};

// --- Editor Field Component ---
const EditorField: React.FC<{ label: string; value: string; onChange: (value: string) => void; placeholder?: string }> = ({ label, value, onChange, placeholder }) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-slate-text dark:text-moonlit-stone mb-1">{label}</label>
    <RichTextEditor value={value} onChange={onChange} placeholder={placeholder} />
  </div>
);

// --- Ability Type Selector Component (Multi-Select) ---
const AbilityTypeSelector: React.FC<{
  value: string[];
  onChange: (value: string[]) => void;
  abilityTypes: AbilityTypeDefinition[];
  onAddType: (type: AbilityTypeDefinition) => void;
  onDeleteType: (name: string) => void;
  t: (key: string, options?: any) => string;
}> = ({ value, onChange, abilityTypes, onAddType, onDeleteType, t }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeDesc, setNewTypeDesc] = useState('');

  const handleCreateNew = () => {
    if (newTypeName.trim()) {
      onAddType({
        name: newTypeName.trim(),
        description: newTypeDesc.trim() || t('abilityType.noDescription'),
        isCustom: true
      });
      setNewTypeName('');
      setNewTypeDesc('');
      setIsAdding(false);
      // Automatically select the newly created type
      if (!value.includes(newTypeName.trim())) {
          onChange([...value, newTypeName.trim()]);
      }
    }
  };

  const handleAddSelection = (typeName: string) => {
      if (typeName === '___CREATE_NEW___') {
          setIsAdding(true);
      } else if (typeName && !value.includes(typeName)) {
          onChange([...value, typeName]);
      }
  };

  const handleRemoveSelection = (typeName: string) => {
      onChange(value.filter(v => v !== typeName));
  };

  // Filter out types that are already selected
  const availableTypes = abilityTypes.filter(type => !value.includes(type.name));

  return (
    <div className="space-y-2 mb-4">
      <label className="block text-sm font-medium text-slate-text dark:text-moonlit-stone mb-1">
        {t('form.abilityType')}
      </label>
      
      {!isAdding ? (
        <div className="flex flex-col gap-2">
            {/* Selected Tags */}
            <div className="flex flex-wrap gap-2 mb-1">
                {value.map(typeName => {
                    const typeDef = abilityTypes.find(at => at.name === typeName);
                    // Determine style
                    const colorClass = typeDef?.color ? COLOR_MAP[typeDef.color] : 'bg-townsfolk-blue/10 border-townsfolk-blue text-townsfolk-blue';
                    const IconComponent = typeDef?.icon ? ICON_MAP[typeDef.icon] : null;
                    const desc = typeDef ? (typeDef.isCustom ? typeDef.description : t(typeDef.description)) : '';
                    
                    return (
                        <div key={typeName} className={`flex items-center gap-1 px-2 py-1 border rounded text-sm ${colorClass}`}>
                            {IconComponent && <IconComponent className="w-3 h-3" />}
                            <span title={desc}>{typeDef ? (typeDef.isCustom ? typeDef.name : t(typeDef.name.startsWith('abilityType') ? typeDef.name : `abilityType.desc.${typeDef.name}`) || typeDef.name) : typeName}</span>
                            <button 
                                type="button" 
                                onClick={() => handleRemoveSelection(typeName)}
                                className="hover:text-demon-fire rounded-full p-0.5"
                            >
                                <XMarkIcon className="w-3 h-3" />
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* Add Dropdown */}
            <div className="relative">
                <select 
                    value="" // Always reset to empty after selection
                    onChange={(e) => handleAddSelection(e.target.value)} 
                    className="w-full bg-parchment-white dark:bg-ravens-night border border-stone-border dark:border-slate-gray rounded-md px-3 py-2 text-ink-text dark:text-parchment focus:ring-townsfolk-blue focus:border-townsfolk-blue appearance-none text-sm"
                >
                    <option value="" disabled>+ {t('abilityType.selectOrType')}</option>
                    {availableTypes.map((type) => (
                        <option key={type.name} value={type.name}>
                        {type.isCustom ? type.name : t(type.name.startsWith('abilityType') ? type.name : `abilityType.desc.${type.name}`) || type.name}
                        </option>
                    ))}
                    <option value="___CREATE_NEW___" className="font-bold text-townsfolk-blue">+ {t('abilityType.addCustom')}</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                    <PlusIcon className="w-4 h-4" />
                </div>
            </div>
        </div>
      ) : (
        <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-md border border-slate-300 dark:border-slate-600 space-y-3 animate-fade-in">
            <h4 className="text-xs font-bold uppercase text-townsfolk-blue">{t('abilityType.createTitle', {name: newTypeName || '...'})}</h4>
            <input type="text" value={newTypeName} onChange={e => setNewTypeName(e.target.value)} placeholder={t('form.name')} className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-black text-sm"/>
            <textarea value={newTypeDesc} onChange={e => setNewTypeDesc(e.target.value)} placeholder={t('abilityType.newDescriptionPlaceholder')} className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-black text-sm h-20" />
            <p className="text-xs text-moonlit-stone italic">* {t('alert.ruleNotFound').replace('找不到', '將自動創建')}</p>
            <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setIsAdding(false)} className="text-xs px-3 py-1 rounded bg-slate-300 dark:bg-slate-600">{t('form.cancel')}</button>
                <button type="button" onClick={handleCreateNew} disabled={!newTypeName.trim()} className="text-xs px-3 py-1 rounded bg-townsfolk-blue text-white disabled:opacity-50">{t('form.saveChanges')}</button>
            </div>
        </div>
      )}
    </div>
  );
};

// --- New Tooltip-enabled Tag Component (Enhanced with Visuals) ---
const AbilityTypeTag: React.FC<{
    type: string;
    abilityTypes: AbilityTypeDefinition[];
    t: (key: string) => string;
    onViewRule?: (name: string) => void;
}> = ({ type, abilityTypes, t, onViewRule }) => {
    const [showTooltip, setShowTooltip] = useState(false);
    
    // Find definition
    const typeDef = abilityTypes.find(at => at.name === type);
    const displayName = typeDef 
        ? (typeDef.isCustom ? typeDef.name : t(typeDef.name.startsWith('abilityType') ? typeDef.name : `abilityType.desc.${typeDef.name}`) || typeDef.name) 
        : type;
    const description = typeDef 
        ? (typeDef.isCustom ? typeDef.description : t(typeDef.description)) 
        : '';

    // Determine style
    const colorClass = typeDef?.color ? COLOR_MAP[typeDef.color] : 'bg-townsfolk-blue/10 border-townsfolk-blue text-townsfolk-blue';
    const IconComponent = typeDef?.icon ? ICON_MAP[typeDef.icon] : null;

    // Click handler for mobile/desktop unified experience
    const toggleTooltip = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setShowTooltip(prev => !prev);
    };

    return (
        <div 
            className="relative inline-block"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
        >
            <div 
                onClick={toggleTooltip}
                className={`flex items-center gap-1 border px-2 py-0.5 rounded text-xs cursor-pointer select-none transition-colors ${colorClass}`}
            >
                {IconComponent && <IconComponent className="w-3 h-3" />}
                <span className="font-semibold">{displayName}</span>
                {onViewRule && (
                    <button 
                        type="button" 
                        onClick={(e) => { e.stopPropagation(); onViewRule(type); }} 
                        className="p-0.5 hover:bg-black/10 rounded-full transition-colors" 
                        title={t('form.viewRule')}
                    >
                        <BookOpenIcon className="w-3 h-3" />
                    </button>
                )}
            </div>

            {/* Tooltip */}
            {showTooltip && description && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-800 text-white text-xs rounded shadow-xl z-50 pointer-events-none animate-fade-in border border-slate-600">
                    <p>{description}</p>
                    {/* Arrow */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                </div>
            )}
        </div>
    );
};

// --- Character Detail View ---
const CharacterDetailView: React.FC<{ 
    character: Character; 
    allScripts: Script[]; 
    t: (key: string) => string; 
    onClose: () => void;
    onEdit?: () => void; 
    onViewRule?: (name: string) => void;
    abilityTypes: AbilityTypeDefinition[];
}> = ({ character, allScripts, t, onClose, onEdit, onViewRule, abilityTypes: allAbilityTypes }) => {
    const defaultIconStyle = { zoom: 1, offsetX: 50, offsetY: 50 };
    const iconStyle = { ...defaultIconStyle, ...character.iconStyle };
    const associatedScripts = character.scriptIds.map(id => allScripts.find(s => s.id === id)).filter(Boolean) as Script[];
    const normalizedReminders = (character.reminders || []).map(r => typeof r === 'string' ? { name: r, content: '' } : r).filter(r => r.name.trim() !== '');

    // Ensure abilityType is treated as array
    const abilityTypes = Array.isArray(character.abilityType) ? character.abilityType : [character.abilityType || 'Standard'];

    return (
        <div className="text-parchment relative" onClick={() => {}}>
            {onEdit && <button onClick={onEdit} className="absolute top-0 right-0 p-2 bg-slate-gray/30 hover:bg-townsfolk-blue text-slate-400 hover:text-white rounded-full transition-colors z-10"><PencilIcon className="w-5 h-5" /></button>}
            <header className="flex flex-col sm:flex-row items-start gap-4 mb-6 pr-10">
                <div className="w-24 h-24 rounded-full border-4 border-slate-gray overflow-hidden bg-midnight-ink flex-shrink-0 relative">
                    {character.iconUrl ? <img src={character.iconUrl} alt={character.name} className="absolute max-w-none" style={{ width: `${iconStyle.zoom * 100}%`, height: `${iconStyle.zoom * 100}%`, left: `${iconStyle.offsetX}%`, top: `${iconStyle.offsetY}%`, transform: `translate(-${iconStyle.offsetX}%, -${iconStyle.offsetY}%)` }} /> : <div className="w-full h-full flex items-center justify-center bg-slate-gray text-3xl font-serif text-parchment">{character.name.charAt(0)}</div>}
                </div>
                <div className="flex-grow pt-2">
                    <h2 className="text-3xl md:text-4xl font-bold font-serif text-celestial-gold">{character.name}</h2>
                    <span className="px-3 py-1 text-xs sm:text-sm font-semibold rounded-full border bg-slate-gray/50 border-slate-500">{t(`characterType.${character.characterType}`)}</span>
                </div>
            </header>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <main className="lg:col-span-2 space-y-6">
                    <div><h3 className="text-lg font-bold font-serif text-blood-red border-b-2 border-blood-red/20 pb-1">{t('form.ability')}</h3>
                        <div className="bg-ravens-night p-4 rounded-lg border border-slate-gray mt-2">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                {abilityTypes.map(type => (
                                    <AbilityTypeTag 
                                        key={type} 
                                        type={type} 
                                        abilityTypes={allAbilityTypes} 
                                        t={t} 
                                        onViewRule={onViewRule} 
                                    />
                                ))}
                            </div>
                            <div className="text-parchment prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: character.ability || '' }} />
                        </div>
                    </div>
                    {character.bio && <div><h3 className="text-lg font-bold font-serif text-blood-red border-b-2 border-blood-red/20 pb-1">{t('form.bio')}</h3><div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{__html: character.bio || ''}} /></div>}
                    {character.story && <div><h3 className="text-lg font-bold font-serif text-blood-red border-b-2 border-blood-red/20 pb-1">{t('form.story')}</h3><div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{__html: character.story || ''}} /></div>}
                    {character.example && <div><h3 className="text-lg font-bold font-serif text-blood-red border-b-2 border-blood-red/20 pb-1">{t('form.example')}</h3><div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{__html: character.example || ''}} /></div>}
                    {character.howItWorks && <div><h3 className="text-lg font-bold font-serif text-blood-red border-b-2 border-blood-red/20 pb-1">{t('form.howItWorks')}</h3><div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{__html: character.howItWorks || ''}} /></div>}
                    {character.tips && <div><h3 className="text-lg font-bold font-serif text-blood-red border-b-2 border-blood-red/20 pb-1">{t('form.tips')}</h3><div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{__html: character.tips || ''}} /></div>}
                </main>
                <aside className="lg:col-span-1 space-y-6">
                    {character.imageUrl && <img src={character.imageUrl} alt={character.name} className="w-full object-contain rounded-lg border-2 border-slate-gray" />}
                    
                    {normalizedReminders.length > 0 && (
                        <div><h3 className="text-lg font-bold font-serif text-blood-red border-b-2 border-blood-red/20 pb-1">{t('form.reminders')}</h3>
                            <ul className="space-y-3 mt-2">{normalizedReminders.map((r, i) => <li key={i} className="bg-ravens-night p-3 rounded-md border border-slate-gray/50"><div className="font-bold text-celestial-gold">{r.name}</div><div className="text-sm text-moonlit-stone prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{__html: r.content}}/></li>)}</ul>
                        </div>
                    )}

                    {associatedScripts.length > 0 && (
                        <div>
                            <h3 className="text-lg font-bold font-serif text-blood-red border-b-2 border-blood-red/20 pb-1">{t('form.associatedScripts')}</h3>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {associatedScripts.map(s => <span key={s.id} className="px-2 py-1 bg-slate-gray text-xs rounded-md">{s.name}</span>)}
                            </div>
                        </div>
                    )}
                </aside>
            </div>
            <div className="flex justify-end mt-6 pt-4 border-t border-stone-border dark:border-slate-gray">
                <button type="button" onClick={onClose} className="px-6 py-2 rounded-md bg-townsfolk-blue text-white hover:bg-opacity-80 transition-colors">{t('form.close')}</button>
            </div>
        </div>
    );
}

// ... (Rest of CharacterModal.tsx remains largely the same, but imports might need adjusting if they were moved)
// Actually, since I'm rewriting the whole file, I will include the rest of the CharacterModal implementation as provided in original but with updated Tag usage.

interface CharacterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (character: Omit<Character, 'id'> & { id?: string }) => void;
  characterToEdit: Character | null;
  allScripts: Script[];
  t: (key: string, options?: any) => string;
  isReadOnly: boolean;
  onSwitchToEdit?: () => void;
  abilityTypes?: AbilityTypeDefinition[];
  onAddAbilityType?: (type: AbilityTypeDefinition) => void;
  onDeleteAbilityType?: (name: string) => void;
  onViewRule?: (name: string) => void;
}

export const CharacterModal: React.FC<CharacterModalProps> = ({ isOpen, onClose, onSave, characterToEdit, allScripts, t, isReadOnly, onSwitchToEdit, abilityTypes = [], onAddAbilityType = () => {}, onDeleteAbilityType = () => {}, onViewRule }) => {
  const [character, setCharacter] = useState<any>({ 
      name: '', characterType: 'Townsfolk', abilityType: ['Standard'], ability: '', bio: '', story: '', example: '', howItWorks: '', tips: '', reminders: [{name:'', content:''}], scriptIds: [], iconUrl: '', imageUrl: '', iconStyle: { zoom: 1, offsetX: 50, offsetY: 50 }
  });

  const [scriptSearch, setScriptSearch] = useState('');

  useEffect(() => {
    if (characterToEdit) {
      // Normalize abilityType to array if it comes in as string (for safety)
      const typeArray = Array.isArray(characterToEdit.abilityType) ? characterToEdit.abilityType : [characterToEdit.abilityType || 'Standard'];
      
      setCharacter({ 
          ...characterToEdit, 
          abilityType: typeArray,
          reminders: (characterToEdit.reminders || []).map(r => typeof r === 'string' ? { name: r, content: '' } : r), 
          iconStyle: { zoom: 1, offsetX: 50, offsetY: 50, ...characterToEdit.iconStyle } 
      });
    } else {
      setCharacter({ name: '', characterType: 'Townsfolk', abilityType: ['Standard'], ability: '', bio: '', story: '', example: '', howItWorks: '', tips: '', reminders: [{name:'', content:''}], scriptIds: [], iconUrl: '', imageUrl: '', iconStyle: { zoom: 1, offsetX: 50, offsetY: 50 } });
    }
    setScriptSearch('');
  }, [characterToEdit, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setCharacter((prev: any) => ({ ...prev, [e.target.name]: e.target.value }));
  
  const updateIconStyle = (key: string, value: number) => {
    setCharacter((prev: any) => ({ ...prev, iconStyle: { ...prev.iconStyle, [key]: value } }));
  };

  const updateReminder = (index: number, field: string, value: string) => {
      const newReminders = [...character.reminders];
      newReminders[index] = { ...newReminders[index], [field]: value };
      setCharacter((prev: any) => ({ ...prev, reminders: newReminders }));
  };

  const addReminder = () => {
      setCharacter((prev: any) => ({ ...prev, reminders: [...prev.reminders, { name: '', content: '' }] }));
  };

  const removeReminder = (index: number) => {
      setCharacter((prev: any) => ({ ...prev, reminders: prev.reminders.filter((_: any, i: number) => i !== index) }));
  };

  const toggleScript = (scriptId: string) => {
      setCharacter((prev: any) => {
          const ids = prev.scriptIds.includes(scriptId)
              ? prev.scriptIds.filter((id: string) => id !== scriptId)
              : [...prev.scriptIds, scriptId];
          return { ...prev, scriptIds: ids };
      });
  };

  const filteredScripts = useMemo(() => {
      if (!scriptSearch.trim()) return allScripts;
      const terms = scriptSearch.toLowerCase().split(/[:;,\n]/).map(t => t.trim()).filter(Boolean);
      if (terms.length === 0) return allScripts;

      return allScripts.filter(s => {
          const nameLower = s.name.toLowerCase();
          return terms.some(term => nameLower.includes(term));
      });
  }, [allScripts, scriptSearch]);

  const handleSelectAll = () => {
      const visibleIds = filteredScripts.map(s => s.id);
      setCharacter((prev: any) => ({
          ...prev,
          scriptIds: Array.from(new Set([...prev.scriptIds, ...visibleIds]))
      }));
  };

  const handleDeselectAll = () => {
      const visibleIds = new Set(filteredScripts.map(s => s.id));
      setCharacter((prev: any) => ({
          ...prev,
          scriptIds: prev.scriptIds.filter((id: string) => !visibleIds.has(id))
      }));
  };

  const handleInverseSelection = () => {
      const visibleIds = new Set(filteredScripts.map(s => s.id));
      setCharacter((prev: any) => {
          const currentSelected = new Set(prev.scriptIds);
          const newSelected = new Set(prev.scriptIds);

          visibleIds.forEach(id => {
              if (currentSelected.has(id)) {
                  newSelected.delete(id);
              } else {
                  newSelected.add(id);
              }
          });

          return { ...prev, scriptIds: Array.from(newSelected) };
      });
  };

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSave(character); onClose(); };
  
  if (isReadOnly && characterToEdit) {
      return (
        <Modal isOpen={isOpen} onClose={onClose} title={characterToEdit.name}>
            <CharacterDetailView 
                character={characterToEdit} 
                allScripts={allScripts} 
                t={t} 
                onClose={onClose} 
                onEdit={onSwitchToEdit} 
                onViewRule={onViewRule}
                abilityTypes={abilityTypes} 
            />
        </Modal>
      );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={characterToEdit ? t('characterModal.editTitle') : t('characterModal.addTitle')}>
      <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div><label className="block text-sm font-medium text-slate-text dark:text-moonlit-stone mb-1">{t('form.name')}</label><input name="name" value={character.name} onChange={handleChange} className="w-full bg-parchment-white dark:bg-ravens-night border border-stone-border dark:border-slate-gray rounded-md px-3 py-2 text-ink-text dark:text-parchment" required /></div>
             <div>
                 <label className="block text-sm font-medium text-slate-text dark:text-moonlit-stone mb-1">{t('form.characterType')}</label>
                 <select name="characterType" value={character.characterType} onChange={handleChange} className="w-full bg-parchment-white dark:bg-ravens-night border border-stone-border dark:border-slate-gray rounded-md px-3 py-2 text-ink-text dark:text-parchment">
                     {['Townsfolk', 'Outsider', 'Minion', 'Demon', 'Traveler', 'Fabled', 'Loric'].map(type => (
                         <option key={type} value={type}>{t(`characterType.${type}`)}</option>
                     ))}
                 </select>
             </div>
          </div>
          
          <AbilityTypeSelector 
            value={character.abilityType} 
            onChange={(val) => setCharacter((prev: any) => ({ ...prev, abilityType: val }))} 
            abilityTypes={abilityTypes} 
            onAddType={onAddAbilityType} 
            onDeleteType={onDeleteAbilityType} 
            t={t} 
          />
          
          <EditorField label={t('form.ability')} value={character.ability} onChange={val => setCharacter((p: any) => ({ ...p, ability: val }))} />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <ImageUploader label={t('form.iconUrl')} value={character.iconUrl} onChange={val => setCharacter((p: any) => ({ ...p, iconUrl: val }))} t={t} />
             <ImageUploader label={t('form.imageUrl')} value={character.imageUrl} onChange={val => setCharacter((p: any) => ({ ...p, imageUrl: val }))} t={t} />
          </div>

          {character.iconUrl && (
            <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-md border border-slate-300 dark:border-slate-600">
                <label className="block text-sm font-bold text-slate-text dark:text-moonlit-stone mb-2">{t('form.adjustIconFit')}</label>
                <div className="flex gap-4 items-center">
                     <div className="w-16 h-16 rounded-full bg-midnight-ink overflow-hidden relative flex-shrink-0 border-2 border-slate-500">
                         <img 
                            src={character.iconUrl} 
                            style={{ 
                                width: `${character.iconStyle.zoom * 100}%`, 
                                height: `${character.iconStyle.zoom * 100}%`, 
                                left: `${character.iconStyle.offsetX}%`, 
                                top: `${character.iconStyle.offsetY}%`, 
                                transform: `translate(-${character.iconStyle.offsetX}%, -${character.iconStyle.offsetY}%)`,
                                position: 'absolute',
                                maxWidth: 'none'
                            }} 
                         />
                     </div>
                     <div className="flex-grow grid grid-cols-1 sm:grid-cols-3 gap-4">
                         <label className="text-xs">
                            {t('form.zoom')} ({character.iconStyle.zoom.toFixed(1)}x)
                            <input type="range" min="0.5" max="3" step="0.1" value={character.iconStyle.zoom} onChange={(e) => updateIconStyle('zoom', parseFloat(e.target.value))} className="w-full accent-townsfolk-blue" />
                         </label>
                         <label className="text-xs">
                            {t('form.offsetX')} ({character.iconStyle.offsetX}%)
                            <input type="range" min="0" max="100" step="1" value={character.iconStyle.offsetX} onChange={(e) => updateIconStyle('offsetX', parseFloat(e.target.value))} className="w-full accent-townsfolk-blue" />
                         </label>
                         <label className="text-xs">
                            {t('form.offsetY')} ({character.iconStyle.offsetY}%)
                            <input type="range" min="0" max="100" step="1" value={character.iconStyle.offsetY} onChange={(e) => updateIconStyle('offsetY', parseFloat(e.target.value))} className="w-full accent-townsfolk-blue" />
                         </label>
                     </div>
                </div>
            </div>
          )}

          <div className="space-y-4 pt-4 border-t border-stone-border dark:border-slate-gray">
              <h4 className="font-semibold text-moonlit-stone">{t('sidebar.rules')} & {t('form.bio')}</h4>
              <EditorField label={t('form.bio')} value={character.bio} onChange={val => setCharacter((p: any) => ({ ...p, bio: val }))} />
              <EditorField label={t('form.story')} value={character.story} onChange={val => setCharacter((p: any) => ({ ...p, story: val }))} />
              <EditorField label={t('form.example')} value={character.example} onChange={val => setCharacter((p: any) => ({ ...p, example: val }))} />
              <EditorField label={t('form.howItWorks')} value={character.howItWorks} onChange={val => setCharacter((p: any) => ({ ...p, howItWorks: val }))} />
              <EditorField label={t('form.tips')} value={character.tips} onChange={val => setCharacter((p: any) => ({ ...p, tips: val }))} />
          </div>

          <div className="pt-4 border-t border-stone-border dark:border-slate-gray">
              <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-slate-text dark:text-moonlit-stone">{t('form.reminders')}</label>
                  <button type="button" onClick={addReminder} className="text-sm text-townsfolk-blue hover:underline flex items-center gap-1"><PlusIcon className="w-4 h-4" /> {t('form.addReminder')}</button>
              </div>
              <div className="space-y-3">
                  {character.reminders.map((r: any, i: number) => (
                      <div key={i} className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded border border-stone-border dark:border-slate-gray flex gap-2 items-start">
                          <div className="flex-1 space-y-2">
                              <div>
                                  <label className="block text-xs font-bold text-moonlit-stone mb-1">{t('form.reminderName')}</label>
                                  <input 
                                    type="text" 
                                    value={r.name} 
                                    onChange={(e) => updateReminder(i, 'name', e.target.value)} 
                                    placeholder={t('form.reminderName')} 
                                    className="w-full bg-parchment-white dark:bg-ravens-night border border-stone-border dark:border-slate-gray rounded-md px-3 py-1.5 text-ink-text dark:text-parchment text-sm" 
                                  />
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-moonlit-stone mb-1">{t('form.reminderContent')}</label>
                                  <RichTextEditor 
                                    value={r.content} 
                                    onChange={(val) => updateReminder(i, 'content', val)} 
                                    placeholder={t('form.reminderContent')} 
                                    minHeight="4rem"
                                  />
                              </div>
                          </div>
                          <button type="button" onClick={() => removeReminder(i)} className="p-2 text-demon-fire hover:bg-demon-fire/10 rounded mt-5" title={t('header.delete')}>
                              <TrashIcon className="w-5 h-5" />
                          </button>
                      </div>
                  ))}
              </div>
          </div>

          <div className="pt-4 border-t border-stone-border dark:border-slate-gray">
               <label className="block text-sm font-medium text-slate-text dark:text-moonlit-stone mb-2">{t('form.associatedScripts')}</label>
               <div className="flex flex-wrap gap-2 mb-2 items-center">
                   <div className="relative flex-grow min-w-[200px]">
                      <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-moonlit-stone pointer-events-none"/>
                      <input 
                        type="text"
                        placeholder="Search or 'Script A; Script B'"
                        value={scriptSearch}
                        onChange={(e) => setScriptSearch(e.target.value)}
                        className="w-full bg-parchment-white dark:bg-ravens-night border border-stone-border dark:border-slate-gray rounded-md py-1.5 pl-8 pr-2 text-sm text-ink-text dark:text-parchment focus:ring-townsfolk-blue focus:border-townsfolk-blue"
                      />
                   </div>
                   <div className="flex gap-1">
                       <button 
                        type="button" 
                        onClick={handleSelectAll} 
                        className="p-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-townsfolk-blue hover:text-white rounded-md text-sm transition-colors"
                        title={t('bulk.selectAll')}
                       >
                           <CheckIcon className="w-4 h-4" />
                       </button>
                       <button 
                        type="button" 
                        onClick={handleDeselectAll} 
                        className="p-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-demon-fire hover:text-white rounded-md text-sm transition-colors"
                        title={t('bulk.unselectAll')}
                       >
                           <XMarkIcon className="w-4 h-4" />
                       </button>
                       <button 
                        type="button" 
                        onClick={handleInverseSelection} 
                        className="p-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-celestial-gold hover:text-midnight-ink rounded-md text-sm transition-colors"
                        title={t('bulk.invert')}
                       >
                           <ArrowsRightLeftIcon className="w-4 h-4" />
                       </button>
                   </div>
               </div>
               <div className="max-h-40 overflow-y-auto border border-stone-border dark:border-slate-gray rounded-md p-2 grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-800/50">
                   {filteredScripts.map(script => (
                       <label key={script.id} className="flex items-center space-x-2 text-sm p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded cursor-pointer">
                           <input 
                              type="checkbox" 
                              checked={character.scriptIds.includes(script.id)} 
                              onChange={() => toggleScript(script.id)}
                              className="rounded border-slate-gray text-townsfolk-blue focus:ring-townsfolk-blue bg-slate-700"
                           />
                           <span className="truncate text-ink-text dark:text-parchment">{script.name}</span>
                       </label>
                   ))}
                   {filteredScripts.length === 0 && <p className="text-xs text-moonlit-stone p-2 col-span-2 text-center">{allScripts.length === 0 ? t('form.noAssociatedScripts') : 'No matching scripts found.'}</p>}
               </div>
          </div>
          
          <div className="flex justify-end space-x-4 pt-4 border-t border-stone-border dark:border-slate-gray mt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-md bg-stone-border dark:bg-slate-gray hover:bg-opacity-80 transition-colors text-ink-text dark:text-parchment">{t('form.cancel')}</button>
            <button type="submit" className="px-4 py-2 rounded-md bg-blood-red text-white hover:bg-demon-fire transition-colors shadow-md">{t('form.saveCharacter')}</button>
          </div>
      </form>
    </Modal>
  );
};
