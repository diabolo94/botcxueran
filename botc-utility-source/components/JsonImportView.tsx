
import React, { useState, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Script, Character, CharacterType, ReminderData, NightOrderItem } from '../types';
import { CloudArrowUpIcon, CodeBracketIcon } from './Icons';

interface JsonImportViewProps {
    allCharacters: Character[];
    onImport: (script: Script, characters: Character[]) => void;
    t: (key: string, options?: any) => string;
}

export const JsonImportView: React.FC<JsonImportViewProps> = ({ allCharacters, onImport, t }) => {
    const [jsonText, setJsonText] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const mapTeamToCharacterType = (team: string): CharacterType => {
        switch (team.toLowerCase()) {
            case 'townsfolk': return 'Townsfolk';
            case 'outsider': return 'Outsider';
            case 'minion': return 'Minion';
            case 'demon': return 'Demon';
            case 'traveler': return 'Traveler';
            case 'fabled': return 'Fabled';
            default: return 'Townsfolk'; // Default fallback
        }
    };

    const processImport = (jsonData: any) => {
        setIsProcessing(true);
        setStatusMessage(null);

        try {
            if (!Array.isArray(jsonData)) throw new Error("JSON must be an array.");

            const meta = jsonData.find(i => i.id === '_meta');
            const charEntries = jsonData.filter(i => i.id !== '_meta');

            if (!meta) throw new Error("Missing '_meta' object in JSON.");

            const newScriptId = uuidv4();
            
            // Process Characters
            const newCharacters: Character[] = charEntries.map((c: any) => {
                const reminders: (string | ReminderData)[] = Array.isArray(c.reminders) 
                    ? c.reminders.map((r: any) => typeof r === 'string' ? { name: r, content: '' } : r)
                    : [];

                // Check if character exists by ID to preserve existing data or merge
                const existingChar = allCharacters.find(ex => ex.id === c.id);
                
                return {
                    id: c.id, // Keep original ID for script compatibility
                    name: c.name || 'Unknown',
                    characterType: mapTeamToCharacterType(c.team || ''),
                    abilityType: existingChar?.abilityType || ['Standard'], // Default or keep existing
                    ability: c.ability || '',
                    bio: existingChar?.bio || '',
                    story: existingChar?.story || '',
                    example: existingChar?.example || '',
                    howItWorks: existingChar?.howItWorks || '',
                    tips: existingChar?.tips || '',
                    reminders: reminders,
                    scriptIds: existingChar ? [...new Set([...existingChar.scriptIds, newScriptId])] : [newScriptId],
                    iconUrl: c.image || '',
                    imageUrl: existingChar?.imageUrl || '',
                    iconStyle: existingChar?.iconStyle || { zoom: 1, offsetX: 50, offsetY: 50 }
                };
            });

            // Process Night Order
            const firstNightChars = charEntries
                .filter((c: any) => typeof c.firstNight === 'number' && c.firstNight > 0)
                .sort((a: any, b: any) => a.firstNight - b.firstNight);
            
            const otherNightChars = charEntries
                .filter((c: any) => typeof c.otherNight === 'number' && c.otherNight > 0)
                .sort((a: any, b: any) => a.otherNight - b.otherNight);

            const firstNightOrder: NightOrderItem[] = firstNightChars.map((c: any) => ({
                id: uuidv4(),
                characterId: c.id,
                customText: c.name // Default text is character name
            }));

            const otherNightsOrder: NightOrderItem[] = otherNightChars.map((c: any) => ({
                id: uuidv4(),
                characterId: c.id,
                customText: c.name
            }));

            // Create Script
            const newScript: Script = {
                id: newScriptId,
                name: meta.name || 'Untitled Script',
                description: meta.author ? `Author: ${meta.author}` : '',
                coverImage: '',
                typeIds: [],
                difficulty: 1,
                characterListImage: meta.logo || '',
                characterIds: newCharacters.map(c => c.id),
                jsonUrl: '',
                handbookUrl: '',
                firstNightOrder: firstNightOrder,
                otherNightsOrder: otherNightsOrder
            };

            // Commit Changes
            onImport(newScript, newCharacters);

            setStatusMessage({ 
                type: 'success', 
                text: t('jsonImport.success', { scriptName: newScript.name, count: newCharacters.length }) 
            });
            setJsonText('');

        } catch (error: any) {
            console.error("Import Error:", error);
            setStatusMessage({ type: 'error', text: t('jsonImport.error') + ` (${error.message})` });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleTextImport = () => {
        if (!jsonText.trim()) return;
        try {
            const data = JSON.parse(jsonText);
            processImport(data);
        } catch (e) {
            setStatusMessage({ type: 'error', text: t('jsonImport.error') });
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target?.result as string);
                processImport(data);
            } catch (err) {
                setStatusMessage({ type: 'error', text: t('jsonImport.error') });
            }
            if (fileInputRef.current) fileInputRef.current.value = '';
        };
        reader.readAsText(file);
    };

    return (
        <div className="p-4 md:p-8 max-w-4xl mx-auto h-full flex flex-col">
            <h2 className="text-3xl font-bold font-serif text-celestial-gold mb-4 flex items-center gap-3">
                <CodeBracketIcon className="w-8 h-8"/>
                {t('jsonImport.title')}
            </h2>
            
            <div className="bg-parchment-white dark:bg-midnight-ink border border-stone-border dark:border-slate-gray rounded-lg p-6 shadow-lg flex-1 flex flex-col">
                <p className="text-moonlit-stone mb-4 text-sm">{t('jsonImport.description')}</p>
                
                {statusMessage && (
                    <div className={`p-4 mb-4 rounded-md font-bold text-sm ${statusMessage.type === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                        {statusMessage.text}
                    </div>
                )}

                <textarea 
                    value={jsonText}
                    onChange={(e) => setJsonText(e.target.value)}
                    placeholder={t('jsonImport.placeholder')}
                    className="flex-1 w-full p-4 mb-4 bg-slate-50 dark:bg-black/30 border border-slate-300 dark:border-slate-600 rounded-md font-mono text-xs focus:ring-2 focus:ring-townsfolk-blue resize-none"
                />

                <div className="flex flex-col sm:flex-row gap-4 items-center">
                    <button 
                        onClick={handleTextImport}
                        disabled={isProcessing || !jsonText.trim()}
                        className="w-full sm:w-auto px-6 py-3 bg-townsfolk-blue text-white rounded-md font-bold hover:bg-opacity-90 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        <CloudArrowUpIcon className="w-5 h-5"/>
                        {isProcessing ? t('jsonImport.importing') : t('jsonImport.analyzeAndImport')}
                    </button>
                    
                    <span className="text-slate-400 text-sm">- {t('keywords.select')} -</span>

                    <label className="w-full sm:w-auto px-6 py-3 bg-slate-700 text-white rounded-md font-bold hover:bg-slate-600 transition-colors shadow-md cursor-pointer text-center flex items-center justify-center gap-2">
                        {t('jsonImport.fileUpload')}
                        <input 
                            type="file" 
                            ref={fileInputRef}
                            className="hidden" 
                            accept=".json" 
                            onChange={handleFileUpload}
                            disabled={isProcessing}
                        />
                    </label>
                </div>
            </div>
        </div>
    );
};
