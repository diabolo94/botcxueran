
import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Modal } from './Modal';
import { GameRecord, Assignment } from '../types';
import { SparklesIcon, CpuChipIcon } from './Icons';
import { useLocalStorage } from '../utils';

interface AIAnalysisModalProps {
    isOpen: boolean;
    onClose: () => void;
    gameRecord: GameRecord;
    onSaveToRules: (title: string, content: string) => void;
    t: (key: string, options?: any) => string;
}

export const AIAnalysisModal: React.FC<AIAnalysisModalProps> = ({ isOpen, onClose, gameRecord, onSaveToRules, t }) => {
    // API key is now handled exclusively via process.env.API_KEY
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState('');
    const [saved, setSaved] = useState(false);

    // Prepare Game Data for AI
    const preparePrompt = () => {
        const assignmentsText = gameRecord.assignments.map(a => 
            `Player ${a.player}: ${a.role.name} (${a.role.characterType}) ${a.pretendRole ? `[Pretends to be ${a.pretendRole.name}]` : ''}`
        ).join('\n');

        const logsText = gameRecord.actionLog.map(log => {
            let text = '';
            if (log.type === 'phase_marker') text = `--- ${log.phase} ${log.dayNumber} ---`;
            else if (log.type === 'note') text = log.text;
            else if (log.type === 'nomination') text = `Nomination: Player (ID: ${log.nominatorId}) nominated Player (ID: ${log.nomineeId}). Result: ${log.linkedExecutionId ? 'Voted' : 'Pending'}`;
            else if (log.type === 'execution') text = `Execution Result: ${log.outcome === 'executed' ? 'Executed' : 'Spared'}`;
            else if (log.type === 'character_change') text = `Character Change: Player ${log.playerIndex} became ${log.newRoleId}`;
            return text;
        }).join('\n');

        const winnerText = gameRecord.winningTeam ? `Winner: ${gameRecord.winningTeam}` : 'Winner: Undecided';

        return `${t('aiAnalysis.prompt')}\n\nGame Data:\nScript: ${gameRecord.scriptName}\n${winnerText}\n\nRoles:\n${assignmentsText}\n\nLogs:\n${logsText}`;
    };

    const handleAnalyze = async () => {
        setLoading(true);
        setSaved(false);
        const prompt = preparePrompt();

        try {
            // Initialization using named parameter and environment variable as per guidelines
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
            });
            // Accessing .text property directly
            let generatedText = response.text || '';

            // Simple cleanup if AI wraps in ```html ... ```
            generatedText = generatedText.replace(/^```html/, '').replace(/```$/, '').trim();
            setResult(generatedText);

        } catch (error: any) {
            console.error("AI Analysis Error:", error);
            alert(`${t('aiAnalysis.errorFailed')} (${error.message})`);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = () => {
        const title = `Replay: ${gameRecord.name}`;
        onSaveToRules(title, result);
        setSaved(true);
        setTimeout(() => {
            onClose(); // Auto close after save for better UX
        }, 1000);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('aiAnalysis.title')}>
            <div className="space-y-6">
                
                {/* Configuration Section - Removed API Key input UI as per guidelines */}
                <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg border border-slate-300 dark:border-slate-600">
                    <button 
                        onClick={handleAnalyze} 
                        disabled={loading}
                        className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold rounded-md shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {loading ? (
                            <>
                                <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                                {t('aiAnalysis.analyzing')}
                            </>
                        ) : (
                            <>
                                <SparklesIcon className="w-5 h-5" />
                                {t('aiAnalysis.analyze')}
                            </>
                        )}
                    </button>
                </div>

                {/* Result Section */}
                {result && (
                    <div className="animate-fade-in space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-lg text-celestial-gold">{t('aiAnalysis.resultPreview')}</h3>
                            <button 
                                onClick={handleSave} 
                                disabled={saved}
                                className={`px-4 py-2 rounded-md font-bold text-white transition-colors shadow-sm ${saved ? 'bg-green-600' : 'bg-townsfolk-blue hover:bg-blue-600'}`}
                            >
                                {saved ? t('aiAnalysis.saved') : t('aiAnalysis.saveToRules')}
                            </button>
                        </div>
                        <div className="p-4 bg-white dark:bg-black border border-stone-border dark:border-slate-gray rounded-md h-96 overflow-y-auto prose prose-sm dark:prose-invert max-w-none">
                            <div dangerouslySetInnerHTML={{ __html: result }} />
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};
