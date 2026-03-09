import React, { useState, useEffect } from 'react';
import { ScriptType } from '../types';
import { Modal } from './Modal';
import { PencilIcon, TrashIcon, PlusIcon } from './Icons';

interface ScriptTypeManagerProps {
  isOpen: boolean;
  onClose: () => void;
  scriptTypes: ScriptType[];
  onSave: (updatedTypes: ScriptType[]) => void;
  t: (key: string) => string;
}

export const ScriptTypeManager: React.FC<ScriptTypeManagerProps> = ({ isOpen, onClose, scriptTypes, onSave, t }) => {
  const [types, setTypes] = useState<ScriptType[]>([]);
  const [newTypeName, setNewTypeName] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTypes(JSON.parse(JSON.stringify(scriptTypes))); // Deep copy to avoid mutating parent state directly
    }
  }, [isOpen, scriptTypes]);

  const handleAddType = () => {
    if (newTypeName.trim() && !types.some(t => t.name.toLowerCase() === newTypeName.trim().toLowerCase())) {
      setTypes([...types, { id: Date.now().toString(), name: newTypeName.trim() }]);
      setNewTypeName('');
    }
  };
  
  const handleUpdateType = (id: string, newName: string) => {
    if (newName.trim() && !types.some(t => t.id !== id && t.name.toLowerCase() === newName.trim().toLowerCase())) {
        setTypes(types.map(t => t.id === id ? { ...t, name: newName.trim() } : t));
    }
  };

  const handleDeleteType = (id: string) => {
    setTypes(types.filter(t => t.id !== id));
  };
  
  const handleSaveChanges = () => {
    onSave(types);
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('scriptTypeManager.title')}>
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-ink-text dark:text-parchment mb-2">{t('scriptTypeManager.existing')}</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
            {types.map(type => (
              <div key={type.id} className="flex items-center justify-between bg-daylight-bg dark:bg-ravens-night p-2 rounded-md border border-stone-border dark:border-slate-gray">
                <input
                  type="text"
                  value={type.name}
                  onChange={(e) => handleUpdateType(type.id, e.target.value)}
                  className="bg-transparent text-ink-text dark:text-parchment w-full focus:outline-none"
                />
                <button onClick={() => handleDeleteType(type.id)} className="text-slate-text dark:text-moonlit-stone hover:text-demon-fire ml-2">
                  <TrashIcon />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-ink-text dark:text-parchment mb-2">{t('scriptTypeManager.addNew')}</h3>
          <div className="flex space-x-2">
            <input
              type="text"
              value={newTypeName}
              onChange={(e) => setNewTypeName(e.target.value)}
              placeholder={t('scriptTypeManager.newPlaceholder')}
              className="flex-grow bg-parchment-white dark:bg-ravens-night border border-stone-border dark:border-slate-gray rounded-md px-3 py-2 text-ink-text dark:text-parchment focus:ring-townsfolk-blue focus:border-townsfolk-blue"
            />
            <button onClick={handleAddType} className="p-2 bg-townsfolk-blue text-white rounded-md hover:bg-opacity-80">
              <PlusIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
       <div className="flex justify-end space-x-4 pt-6 mt-4 border-t border-stone-border dark:border-slate-gray">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-md bg-stone-border dark:bg-slate-gray hover:bg-opacity-80 transition-colors">{t('form.cancel')}</button>
          <button type="button" onClick={handleSaveChanges} className="px-4 py-2 rounded-md bg-blood-red hover:bg-demon-fire text-white transition-colors">{t('form.saveChanges')}</button>
        </div>
    </Modal>
  );
};