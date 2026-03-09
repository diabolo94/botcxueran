
import React, { useState, useMemo } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Script, Character } from '../types';
import { SparklesIcon, BeakerIcon, ArrowDownTrayIcon, CheckCircleIcon, BookOpenIcon } from './Icons';
import { useLocalStorage } from '../utils';

interface AIScriptAnalysisViewProps {
  allScripts: Script[];
  allCharacters: Character[];
  onAddRuleDoc: (title: string, content: string) => void;
  t: (key: string, options?: any) => string;
}

export const AIScriptAnalysisView: React.FC<AIScriptAnalysisViewProps> = ({ 
  allScripts, allCharacters, onAddRuleDoc, t 
}) => {
  const [selectedScriptId, setSelectedScriptId] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  const selectedScript = useMemo(() => allScripts.find(s => s.id === selectedScriptId), [allScripts, selectedScriptId]);

  const handleAnalyze = async () => {
    if (!selectedScriptId) {
      return;
    }

    setIsAnalyzing(true);
    setResult(null);
    setIsSaved(false);

    // 1. Prepare Content for AI
    const charactersInScript = allCharacters.filter(c => selectedScript?.characterIds.includes(c.id));
    
    const scriptInfo = `
      劇本名稱: ${selectedScript?.name}
      劇本描述: ${selectedScript?.description}
      難度: ${selectedScript?.difficulty}/5
    `;

    const charactersInfo = charactersInScript.map(c => `
      角色: ${c.name} (${t(`characterType.${c.characterType}`)})
      能力: ${c.ability}
      ${c.howItWorks ? `詳細運作: ${c.howItWorks}` : ''}
      ${c.tips ? `建議: ${c.tips}` : ''}
    `).join('\n');

    const prompt = `
      ${t('aiScriptAnalysis.promptSystem')}
      
      以下是待分析的劇本資料：
      ${scriptInfo}
      
      劇本包含的角色詳細資料：
      ${charactersInfo}

      ${t('aiScriptAnalysis.promptInstruction')}
    `;

    try {
      // 2. Call Gemini API using environment variable
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
            thinkingConfig: { thinkingBudget: 32768 }
        }
      });

      // Access text via property
      const generatedText = response.text || '';
      
      // Cleanup: remove accidental markdown wrappers
      const cleanedHtml = generatedText.replace(/^```html/, '').replace(/```$/, '').trim();
      
      setResult(cleanedHtml);

      // 3. Automatically Save to Rules
      const ruleTitle = `【教學手冊】${selectedScript?.name}`;
      onAddRuleDoc(ruleTitle, cleanedHtml);
      setIsSaved(true);

    } catch (error: any) {
      console.error("AI Analysis Error:", error);
      alert(`${t('aiAnalysis.errorFailed')} (${error.message})`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto h-full flex flex-col space-y-8">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-celestial-gold/20 rounded-xl">
          <BeakerIcon className="w-8 h-8 text-celestial-gold" />
        </div>
        <div>
          <h2 className="text-3xl font-bold font-serif text-celestial-gold">{t('aiScriptAnalysis.title')}</h2>
          <p className="text-sm text-moonlit-stone">{t('aiScriptAnalysis.description')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Config Panel - Removed API Key input UI */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-parchment-white dark:bg-midnight-ink border border-stone-border dark:border-slate-gray rounded-xl p-6 shadow-md space-y-6">
            <div>
              <label className="block text-sm font-bold text-moonlit-stone mb-2 uppercase tracking-wider">{t('aiScriptAnalysis.selectScript')}</label>
              <select 
                value={selectedScriptId} 
                onChange={(e) => setSelectedScriptId(e.target.value)}
                className="w-full px-3 py-3 rounded-lg border border-stone-border dark:border-slate-gray bg-daylight-bg dark:bg-ravens-night focus:ring-2 focus:ring-townsfolk-blue"
              >
                <option value="">-- {t('keywords.select')} --</option>
                {allScripts.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.characterIds.length} roles)</option>
                ))}
              </select>
            </div>

            <button 
              onClick={handleAnalyze} 
              disabled={isAnalyzing || !selectedScriptId}
              className="w-full py-4 bg-gradient-to-br from-townsfolk-blue to-indigo-600 hover:to-indigo-700 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-95"
            >
              {isAnalyzing ? (
                <>
                  <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
                  {t('aiScriptAnalysis.analyzing')}
                </>
              ) : (
                <>
                  <SparklesIcon className="w-5 h-5" />
                  {t('aiScriptAnalysis.startAnalysis')}
                </>
              )}
            </button>
          </div>

          {isAnalyzing && (
            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg animate-pulse">
              <p className="text-xs text-townsfolk-blue leading-relaxed">
                {t('aiScriptAnalysis.analyzingDesc')}
              </p>
            </div>
          )}
        </div>

        {/* Preview Panel */}
        <div className="md:col-span-2">
          <div className="bg-parchment-white dark:bg-midnight-ink border border-stone-border dark:border-slate-gray rounded-xl h-[70vh] flex flex-col overflow-hidden shadow-lg">
            <div className="p-4 border-b border-stone-border dark:border-slate-gray bg-slate-50 dark:bg-black/20 flex justify-between items-center">
              <h3 className="font-bold text-moonlit-stone flex items-center gap-2">
                <BookOpenIcon className="w-5 h-5"/>
                {t('aiScriptAnalysis.previewTitle')}
              </h3>
              {isSaved && (
                <span className="flex items-center gap-1 text-green-500 text-sm font-bold animate-fade-in">
                  <CheckCircleIcon className="w-4 h-4"/> {t('aiScriptAnalysis.saved')}
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-daylight-bg dark:bg-ravens-night">
              {result ? (
                <div 
                  className="prose prose-sm sm:prose-base lg:prose-lg dark:prose-invert max-w-none animate-fade-in"
                  dangerouslySetInnerHTML={{ __html: result }}
                />
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-moonlit-stone text-center space-y-4">
                  <BeakerIcon className="w-16 h-16 opacity-20" />
                  <p className="max-w-xs">{t('aiScriptAnalysis.description')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
