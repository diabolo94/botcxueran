
import React, { useState, useMemo, useRef } from 'react';
import { AbilityTypeDefinition, Character } from '../types';
import { Modal } from './Modal';
import { RichTextEditor } from './RichTextEditor';
import { 
    SearchIcon, PlusIcon, PencilIcon, TrashIcon, CheckCircleIcon, XMarkIcon, 
    ArrowsRightLeftIcon, ArrowDownTrayIcon, ArrowUpTrayIcon,
    StarIcon, MoonIcon, SunIcon, BoltIcon, ClockIcon, EyeIcon, UserGroupIcon
} from './Icons';

// --- Icons & Colors Mapping ---
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

interface AbilityTypesViewProps {
    abilityTypes: AbilityTypeDefinition[];
    onAdd: (type: AbilityTypeDefinition) => void;
    onUpdate: (oldName: string, newType: AbilityTypeDefinition) => void;
    onDelete: (name: string) => void;
    onBulkDelete: (names: string[]) => void;
    onImport: (types: AbilityTypeDefinition[]) => void;
    t: (key: string, options?: any) => string;
    allCharacters: Character[]; 
}

export const AbilityTypesView: React.FC<AbilityTypesViewProps> = ({ 
    abilityTypes, onAdd, onUpdate, onDelete, onBulkDelete, onImport, t, allCharacters 
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingType, setEditingType] = useState<{ oldName: string, data: AbilityTypeDefinition } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Modal State
    const [formName, setFormName] = useState('');
    const [formDesc, setFormDesc] = useState('');
    const [formColor, setFormColor] = useState<string>('slate');
    const [formIcon, setFormIcon] = useState<string>('');
    const [formPhase, setFormPhase] = useState<string>('');

    // Usage Stats Modal
    const [usageModalOpen, setUsageModalOpen] = useState(false);
    const [usageList, setUsageList] = useState<Character[]>([]);
    const [usageTypeName, setUsageTypeName] = useState('');

    const filteredTypes = useMemo(() => {
        if (!searchTerm) return abilityTypes;
        return abilityTypes.filter(type => 
            type.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            (type.isCustom ? type.description : t(type.description)).toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [abilityTypes, searchTerm, t]);

    // Usage Statistics Calculation
    const getUsageCount = (typeName: string) => {
        return allCharacters.filter(c => c.abilityType.includes(typeName)).length;
    };

    const handleShowUsage = (typeName: string) => {
        const usingChars = allCharacters.filter(c => c.abilityType.includes(typeName));
        setUsageList(usingChars);
        setUsageTypeName(typeName);
        setUsageModalOpen(true);
    };

    const handleOpenModal = (typeToEdit?: AbilityTypeDefinition) => {
        if (typeToEdit) {
            setEditingType({ oldName: typeToEdit.name, data: typeToEdit });
            setFormName(typeToEdit.name);
            setFormDesc(typeToEdit.isCustom ? typeToEdit.description : t(typeToEdit.description));
            setFormColor(typeToEdit.color || 'slate');
            setFormIcon(typeToEdit.icon || '');
            setFormPhase(typeToEdit.phase || '');
        } else {
            setEditingType(null);
            setFormName('');
            setFormDesc('');
            setFormColor('slate');
            setFormIcon('');
            setFormPhase('');
        }
        setIsModalOpen(true);
    };

    const handleSave = () => {
        if (!formName.trim()) return;

        const newTypeData: AbilityTypeDefinition = {
            name: formName.trim(),
            description: formDesc,
            isCustom: true, 
            color: formColor as any,
            icon: formIcon as any,
            phase: formPhase as any
        };

        if (editingType) {
            onUpdate(editingType.oldName, newTypeData);
        } else {
            // Check duplicate name
            if (abilityTypes.some(at => at.name === newTypeData.name)) {
                alert('Type name already exists.');
                return;
            }
            onAdd(newTypeData);
        }
        setIsModalOpen(false);
    };

    const handleDelete = (name: string) => {
        const count = getUsageCount(name);
        if (count > 0) {
            alert(t('abilityTypesManager.cannotDelete', { count }));
            return;
        }
        if (window.confirm(t('abilityTypesManager.deleteConfirm', { name }))) {
            onDelete(name);
        }
    };

    const handleToggleSelection = (name: string) => {
        const newSet = new Set(selectedTypes);
        if (newSet.has(name)) newSet.delete(name);
        else newSet.add(name);
        setSelectedTypes(newSet);
    };

    const handleSelectAll = () => {
        const newSet = new Set<string>();
        filteredTypes.filter(t => t.isCustom).forEach(t => newSet.add(t.name)); 
        setSelectedTypes(newSet);
    };

    const handleUnselectAll = () => setSelectedTypes(new Set());

    const handleInverseSelection = () => {
        const newSet = new Set(selectedTypes);
        filteredTypes.filter(t => t.isCustom).forEach(t => {
            if (newSet.has(t.name)) newSet.delete(t.name);
            else newSet.add(t.name);
        });
        setSelectedTypes(newSet);
    };

    const handleBulkDeleteAction = () => {
        if (selectedTypes.size === 0) return;
        const typesInUse = (Array.from(selectedTypes) as string[]).filter(name => getUsageCount(name) > 0);
        if (typesInUse.length > 0) {
            alert(`${t('abilityTypesManager.cannotDelete', { count: typesInUse.length })}\n(${typesInUse.join(', ')})`);
            return;
        }

        if (window.confirm(t('abilityTypesManager.bulkDeleteConfirm', { count: selectedTypes.size }))) {
            onBulkDelete(Array.from(selectedTypes));
            setSelectedTypes(new Set());
        }
    };

    const handleExportJSON = () => {
        if (selectedTypes.size === 0) return;
        const typesToExport = abilityTypes.filter(t => selectedTypes.has(t.name));
        const data = {
            customAbilityTypes: typesToExport,
            exportType: 'ability_types',
            timestamp: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `ability_types_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                // Use explicit type assertion for safety
                const target = e.target as FileReader;
                if (!target || typeof target.result !== 'string') return;

                const result = target.result;
                const json = JSON.parse(result);
                const imported = json.customAbilityTypes || (Array.isArray(json) ? json : []);
                if (imported.length > 0) {
                    onImport(imported as AbilityTypeDefinition[]);
                    alert(t('alert.importSuccess'));
                } else {
                    alert("No valid ability types found.");
                }
            } catch (err: any) {
                console.error(err);
                let errorMessage = 'Unknown error';
                if (err instanceof Error) errorMessage = err.message;
                else if (typeof err === 'string') errorMessage = err;
                
                alert(t('alert.importFailed') + ` (${errorMessage})`);
            }
            if (fileInputRef.current) fileInputRef.current.value = '';
        };
        reader.readAsText(file);
    };

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto h-full flex flex-col">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 flex-shrink-0">
                <h2 className="text-3xl font-bold font-serif text-celestial-gold">{t('abilityTypesManager.title')}</h2>
                <button onClick={() => handleOpenModal()} className="px-4 py-2 bg-townsfolk-blue hover:bg-blue-600 text-white rounded-md flex items-center gap-2 shadow-md transition-colors">
                    <PlusIcon className="w-5 h-5" /> {t('abilityTypesManager.add')}
                </button>
            </div>

            <div className="flex flex-wrap gap-4 mb-6 bg-slate-100 dark:bg-slate-800/50 p-3 rounded-lg flex-shrink-0">
                <div className="relative flex-grow min-w-[200px]">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-moonlit-stone" />
                    <input type="text" placeholder={t('header.searchPlaceholder')} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-9 pr-3 py-2 rounded-md border border-stone-border dark:border-slate-600 bg-white dark:bg-black focus:ring-townsfolk-blue" />
                </div>
                
                <div className="flex gap-1">
                    <button onClick={handleSelectAll} className="p-2 rounded bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600" title={t('bulk.selectAll')}><CheckCircleIcon className="w-5 h-5"/></button>
                    <button onClick={handleUnselectAll} className="p-2 rounded bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600" title={t('bulk.unselectAll')}><XMarkIcon className="w-5 h-5"/></button>
                    <button onClick={handleInverseSelection} className="p-2 rounded bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600" title={t('bulk.invert')}><ArrowsRightLeftIcon className="w-5 h-5"/></button>
                </div>

                <div className="flex gap-1 border-l border-slate-300 dark:border-slate-600 pl-4">
                    <button onClick={handleBulkDeleteAction} disabled={selectedTypes.size === 0} className="p-2 rounded bg-white dark:bg-slate-700 text-demon-fire hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50"><TrashIcon className="w-5 h-5"/></button>
                    <button onClick={handleExportJSON} disabled={selectedTypes.size === 0} className="p-2 rounded bg-white dark:bg-slate-700 text-townsfolk-blue hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50"><ArrowDownTrayIcon className="w-5 h-5"/></button>
                    <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded bg-white dark:bg-slate-700 text-celestial-gold hover:bg-slate-200 dark:hover:bg-slate-600"><ArrowUpTrayIcon className="w-5 h-5"/></button>
                    <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleImportFile} />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto">
                {filteredTypes.map(type => {
                    const usageCount = getUsageCount(type.name);
                    const colorClass = COLOR_MAP[type.color || 'slate'];
                    const IconComponent = type.icon ? ICON_MAP[type.icon] : null;

                    return (
                        <div key={type.name} className={`bg-parchment-white dark:bg-midnight-ink border rounded-lg p-4 shadow-sm hover:shadow-md transition-all relative group flex flex-col h-full ${selectedTypes.has(type.name) ? 'border-townsfolk-blue ring-1 ring-townsfolk-blue' : 'border-stone-border dark:border-slate-gray'}`}>
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2 max-w-[80%]">
                                    <div className={`px-2 py-1 rounded text-xs font-bold border flex items-center gap-1 ${colorClass}`}>
                                        {IconComponent && <IconComponent className="w-3 h-3" />}
                                        <span className="truncate">{type.isCustom ? type.name : t(type.name.startsWith('abilityType') ? type.name : `abilityType.desc.${type.name}`) || type.name}</span>
                                    </div>
                                    {type.phase && (
                                        <span className="text-[10px] text-slate-500 border border-slate-300 dark:border-slate-600 px-1.5 py-0.5 rounded">
                                            {t(`abilityTypesManager.phases.${type.phase}`) || type.phase}
                                        </span>
                                    )}
                                </div>
                                
                                {type.isCustom ? (
                                    <input 
                                        type="checkbox" 
                                        checked={selectedTypes.has(type.name)} 
                                        onChange={() => handleToggleSelection(type.name)}
                                        className="w-5 h-5 rounded text-townsfolk-blue focus:ring-townsfolk-blue cursor-pointer shrink-0"
                                    />
                                ) : (
                                    <span className="text-xs px-2 py-1 bg-slate-200 dark:bg-slate-700 rounded text-slate-500 whitespace-nowrap">{t('abilityTypesManager.isStandard')}</span>
                                )}
                            </div>
                            
                            <div className="text-sm text-moonlit-stone line-clamp-3 mb-4 prose prose-sm dark:prose-invert flex-grow" dangerouslySetInnerHTML={{ __html: type.isCustom ? type.description : t(type.description) }} />

                            <div className="flex justify-between items-center mt-auto pt-3 border-t border-slate-100 dark:border-slate-800">
                                <button 
                                    onClick={() => handleShowUsage(type.name)}
                                    className="text-xs text-slate-500 hover:text-townsfolk-blue flex items-center gap-1 transition-colors"
                                >
                                    <UserGroupIcon className="w-3 h-3"/>
                                    {t('abilityTypesManager.usedBy', { count: usageCount })}
                                </button>

                                {type.isCustom && (
                                    <div className="flex gap-2">
                                        <button onClick={() => handleOpenModal(type)} className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-townsfolk-blue hover:text-white rounded-md transition-colors"><PencilIcon className="w-3.5 h-3.5"/></button>
                                        <button onClick={() => handleDelete(type.name)} className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-demon-fire hover:text-white rounded-md transition-colors"><TrashIcon className="w-3.5 h-3.5"/></button>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingType ? t('abilityTypesManager.edit') : t('abilityTypesManager.add')}>
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-moonlit-stone mb-1">{t('abilityTypesManager.name')}</label>
                            <input type="text" value={formName} onChange={e => setFormName(e.target.value)} className="w-full bg-slate-100 dark:bg-black border border-stone-border dark:border-slate-600 rounded px-3 py-2" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-moonlit-stone mb-1">{t('abilityTypesManager.phase')}</label>
                            <select value={formPhase} onChange={e => setFormPhase(e.target.value)} className="w-full bg-slate-100 dark:bg-black border border-stone-border dark:border-slate-600 rounded px-3 py-2">
                                <option value="">None</option>
                                <option value="Setup">{t('abilityTypesManager.phases.Setup')}</option>
                                <option value="FirstNight">{t('abilityTypesManager.phases.FirstNight')}</option>
                                <option value="EveryNight">{t('abilityTypesManager.phases.EveryNight')}</option>
                                <option value="Day">{t('abilityTypesManager.phases.Day')}</option>
                                <option value="Passive">{t('abilityTypesManager.phases.Passive')}</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-moonlit-stone mb-2">{t('abilityTypesManager.visuals')}</label>
                        <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 space-y-4">
                            <div>
                                <span className="text-xs text-slate-500 mb-2 block">Badge Color</span>
                                <div className="flex flex-wrap gap-2">
                                    {Object.keys(COLOR_MAP).map(color => (
                                        <button
                                            key={color}
                                            type="button"
                                            onClick={() => setFormColor(color)}
                                            className={`w-6 h-6 rounded-full border-2 transition-transform ${formColor === color ? 'scale-125 ring-2 ring-offset-1 ring-slate-400' : ''} ${COLOR_MAP[color].split(' ')[0]} ${COLOR_MAP[color].split(' ')[2]}`}
                                            title={t(`abilityTypesManager.colors.${color}`)}
                                        />
                                    ))}
                                </div>
                            </div>
                            
                            <div>
                                <span className="text-xs text-slate-500 mb-2 block">Badge Icon</span>
                                <div className="flex flex-wrap gap-2">
                                    <button 
                                        type="button"
                                        onClick={() => setFormIcon('')}
                                        className={`p-1.5 rounded border ${formIcon === '' ? 'bg-slate-300 dark:bg-slate-600 border-slate-500' : 'bg-white dark:bg-black border-slate-300 dark:border-slate-700'}`}
                                        title="None"
                                    >
                                        <span className="text-xs font-bold">None</span>
                                    </button>
                                    {Object.keys(ICON_MAP).map(iconName => {
                                        const Icon = ICON_MAP[iconName];
                                        return (
                                            <button
                                                key={iconName}
                                                type="button"
                                                onClick={() => setFormIcon(iconName)}
                                                className={`p-1.5 rounded border transition-colors ${formIcon === iconName ? 'bg-townsfolk-blue text-white border-townsfolk-blue' : 'bg-white dark:bg-black border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                                                title={iconName}
                                            >
                                                <Icon className="w-4 h-4" />
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                                <span className="text-xs text-slate-500 mb-1 block">Preview</span>
                                <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-sm font-bold border ${COLOR_MAP[formColor || 'slate']}`}>
                                    {formIcon && ICON_MAP[formIcon] && React.createElement(ICON_MAP[formIcon], { className: "w-3 h-3" })}
                                    <span>{formName || 'Type Name'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-moonlit-stone mb-1">{t('abilityTypesManager.description')}</label>
                        <RichTextEditor value={formDesc} onChange={setFormDesc} minHeight="8rem" />
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t border-stone-border dark:border-slate-gray">
                        <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded bg-slate-200 dark:bg-slate-700">{t('form.cancel')}</button>
                        <button onClick={handleSave} className="px-4 py-2 rounded bg-townsfolk-blue text-white hover:bg-blue-600">{t('form.saveChanges')}</button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={usageModalOpen} onClose={() => setUsageModalOpen(false)} title={`${usageTypeName} - ${t('abilityTypesManager.usage')}`}>
                <div className="max-h-[60vh] overflow-y-auto">
                    {usageList.length === 0 ? (
                        <p className="text-center text-slate-500 py-4">No characters using this type.</p>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {usageList.map(char => (
                                <div key={char.id} className="p-2 border rounded bg-slate-50 dark:bg-slate-800 flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-white text-xs font-bold">
                                        {char.name[0]}
                                    </div>
                                    <span className="text-sm truncate">{char.name}</span>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="mt-4 flex justify-end">
                        <button onClick={() => setUsageModalOpen(false)} className="px-4 py-2 bg-slate-200 dark:bg-slate-700 rounded text-sm">Close</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
