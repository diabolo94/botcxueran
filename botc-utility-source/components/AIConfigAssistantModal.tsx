
import React, { useState } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { Modal } from './Modal';
import { Character, Script, Assignment } from '../types';
import { SparklesIcon, CpuChipIcon, CheckCircleIcon, ArrowDownTrayIcon, ArrowPathIcon } from './Icons';
import { useLocalStorage } from '../utils';

interface AIConfigAssistantModalProps {
    isOpen: boolean;
    onClose: () => void;
    script: Script;
    assignments: Assignment[];
    allCharacters: Character[];
    onApplyBluffs?: (bluffIds: string[]) => void;
    onApplySeating?: (orderedRoleIds: string[]) => void;
    t: (key: string, options?: any) => string;
    mode?: 'analysis' | 'seating';
}

interface AIResponse {
    analysis?: string; // For analysis mode
    bluffSuggestions?: { id: string; reason: string; name?: string }[]; // For analysis mode
    
    reasoning?: string; // For seating mode
    newOrder?: string[]; // For seating mode (List of Character IDs)
}

export const AIConfigAssistantModal: React.FC<AIConfigAssistantModalProps> = ({ 
    isOpen, onClose, script, assignments, allCharacters, onApplyBluffs, onApplySeating, t, mode = 'analysis'
}) => {
    // API key is now handled exclusively via process.env.API_KEY
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<AIResponse | null>(null);
    
    // Prepare Data
    const preparePrompt = () => {
        const inPlayRoles = assignments.map(a => `${a.role.name} (ID: ${a.role.id})`).join(', ');
        const inPlayRoleIds = assignments.map(a => a.role.id).join(', ');

        if (mode === 'seating') {
            return `
            你是《染鐘樓謎團 (Blood on the Clocktower)》的資深說書人。
            
            當前場上角色列表 (順序不拘): ${inPlayRoles}
            
            你的任務是：**重新排列這些角色的座位順序**，以創造最有趣、平衡且具挑戰性的遊戲局勢。
            
            優化目標：
            1. **資訊位平衡:** 考慮「共情者 (Empath)」、「廚師 (Chef)」、「洗衣婦 (Washerwoman)」等角色的鄰座關係。例如：讓共情者夾在善惡之間(得到 "1" 的資訊)，或者決定給廚師 "0" 或 "1" 的開局資訊。
            2. **保護與威脅:** 考慮「僧侶 (Monk)」、「士兵 (Soldier)」與重要角色的距離。
            3. **硬性規則 (必須遵守):** 
               - 如果場上有「傀儡 (Marionette)」，盡量安排在惡魔的鄰座 (雖然程式會強制修正，但請你主動安排好)。
               - 如果場上有「玩偶 (Doll)」，盡量安排在惡魔的鄰座。
            4. **隨機性與混淆:** 不要讓邪惡玩家過於集中，也不要過於分散，製造一些邏輯上的混淆。

            請以 JSON 格式回傳。結構如下：
            {
                "reasoning": "HTML格式的理由說明，解釋你為何這樣安排座位（針對共情者、廚師等關鍵角色的考量）。使用 <p>, <strong> 標籤。",
                "newOrder": ["ID1", "ID2", "ID3", ...] // 必須包含所有輸入的角色 ID，且數量一致，只是順序改變。
            }
            請使用繁體中文。
            請確保 newOrder 陣列包含以下所有 ID，一個都不能少，也不能多：
            [${inPlayRoleIds}]
            `;
        }

        // Analysis Mode (Default)
        const scriptRoles = script.characterIds.map(id => {
            const c = allCharacters.find(char => char.id === id);
            return c ? `${c.name} (${c.characterType})` : '';
        }).filter(Boolean).join(', ');

        return `
        你是《染鐘樓謎團 (Blood on the Clocktower)》的資深說書人與遊戲設計專家。
        
        當前劇本: ${script.name}
        場上玩家配置 (In Play): ${inPlayRoles}
        劇本包含的所有角色: ${scriptRoles}

        請完成以下兩個任務：
        1. 【平衡性分析】: 分析當前場上配置的平衡性。
           - 善良陣營的資訊能力是否過強或過弱？
           - 邪惡陣營是否有足夠的空間？
           - 是否有特殊的 Jinx 或互動需要注意？
           - 給出 1-10 的平衡分數與簡短評語。
        
        2. 【偽裝建議 (Bluffs)】: 為惡魔推薦 3 個最佳的偽裝角色。
           - 規則：必須是劇本內、但「不在場」的角色。
           - 規則：通常選擇鎮民 (Townsfolk) 或外來者 (Outsider)。
           - 請給出每個選擇的戰術理由（例如：為了剋制某個在場角色，或為了製造特定混亂）。
           - 嚴格檢查：推薦的角色絕對不能出現在 "In Play" 清單中。

        請以 JSON 格式回傳，不要使用 Markdown。結構如下：
        {
            "analysis": "HTML格式的分析文本，使用 <p>, <ul>, <li>, <strong> 標籤排版。",
            "bluffSuggestions": [
                { "id": "角色名稱(請盡量匹配官方名稱)", "reason": "簡短理由" },
                { "id": "角色名稱", "reason": "簡短理由" },
                { "id": "角色名稱", "reason": "簡短理由" }
            ]
        }
        請使用繁體中文。
        `;
    };

    const handleAnalyze = async () => {
        setLoading(true);
        setResult(null);

        try {
            // Using gemini-3-pro-preview for complex reasoning tasks
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = preparePrompt();
            
            // Define schema based on mode
            let schema;
            if (mode === 'seating') {
                schema = {
                    type: Type.OBJECT,
                    properties: {
                        reasoning: { type: Type.STRING },
                        newOrder: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        }
                    }
                };
            } else {
                schema = {
                    type: Type.OBJECT,
                    properties: {
                        analysis: { type: Type.STRING },
                        bluffSuggestions: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    id: { type: Type.STRING },
                                    reason: { type: Type.STRING }
                                }
                            }
                        }
                    }
                };
            }

            const response = await ai.models.generateContent({
                model: 'gemini-3-pro-preview',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: schema,
                    // Advanced tasks benefit from a higher thinking budget
                    thinkingConfig: { thinkingBudget: 32768 }
                }
            });

            if (response.text) {
                const parsed = JSON.parse(response.text) as AIResponse;
                
                if (mode === 'analysis' && parsed.bluffSuggestions) {
                    // Map names back to IDs for bluffs
                    const mappedSuggestions = parsed.bluffSuggestions.map(s => {
                        let char = allCharacters.find(c => c.name === s.id);
                        if (!char) {
                            char = allCharacters.find(c => c.name.includes(s.id) || s.id.includes(c.name));
                        }
                        return {
                            id: char ? char.id : '',
                            name: s.id,
                            reason: s.reason
                        };
                    }).filter(s => s.id !== '');
                    
                    setResult({ ...parsed, bluffSuggestions: mappedSuggestions });
                } else {
                    // For seating, we assume IDs are correct as we fed them into the prompt
                    setResult(parsed);
                }
            }

        } catch (error: any) {
            console.error("AI Config Error:", error);
            alert(`${t('aiAnalysis.errorFailed')} (${error.message})`);
        } finally {
            setLoading(false);
        }
    };

    const handleApply = () => {
        if (mode === 'analysis' && onApplyBluffs && result && result.bluffSuggestions) {
            if (result.bluffSuggestions.length === 3) {
                onApplyBluffs(result.bluffSuggestions.map(s => s.id));
                onClose();
            }
        } else if (mode === 'seating' && onApplySeating && result && result.newOrder) {
            onApplySeating(result.newOrder);
            onClose();
        }
    };

    const titleKey = mode === 'seating' ? 'aiSeating.title' : 'aiConfig.title';
    const descriptionKey = mode === 'seating' ? 'aiSeating.description' : 'aiConfig.description';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t(titleKey)}>
            <div className="space-y-4 md:space-y-6 flex flex-col h-full md:h-auto overflow-y-auto md:overflow-visible">
                
                {/* Configuration Area - Removed API Key input UI as per guidelines */}
                <div className={`bg-slate-100 dark:bg-slate-800 p-3 md:p-4 rounded-lg border border-slate-300 dark:border-slate-600 transition-all ${result ? 'hidden md:block' : ''}`}>
                    <p className="text-sm text-slate-600 dark:text-moonlit-stone mb-4 hidden md:block">
                        {t(descriptionKey)}
                    </p>
                    
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex items-end w-full">
                            <button 
                                onClick={handleAnalyze} 
                                disabled={loading}
                                className="w-full py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold rounded-md shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {loading ? (
                                    <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                                ) : (
                                    <>
                                        {result ? <ArrowPathIcon className="w-4 h-4" /> : <SparklesIcon className="w-4 h-4" />}
                                        {result ? t('aiConfig.retry') : t('aiConfig.startAnalysis')}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* --- Results Section --- */}
                {result && (
                    <div className="animate-fade-in flex flex-col h-full md:h-auto">
                        
                        {/* Mobile Header with Retry Button */}
                        <div className="md:hidden flex justify-between items-center mb-2">
                            <h3 className="font-bold text-celestial-gold">{t('aiConfig.balanceReport')}</h3>
                            <button onClick={handleAnalyze} className="text-xs bg-slate-700 text-white px-2 py-1 rounded flex items-center gap-1">
                                <ArrowPathIcon className="w-3 h-3" /> {t('aiConfig.retry')}
                            </button>
                        </div>

                        {mode === 'analysis' && (
                            <div className="flex flex-col lg:flex-row gap-4 md:gap-6 flex-grow">
                                {/* Left: Analysis Text */}
                                <div className="flex-1 order-2 lg:order-1 min-h-0 flex flex-col">
                                    <h4 className="font-bold text-moonlit-stone mb-2 hidden lg:block">{t('aiConfig.balanceReport')}</h4>
                                    <div className="bg-white dark:bg-black p-4 rounded-md border border-stone-border dark:border-slate-gray prose prose-sm dark:prose-invert max-w-none overflow-y-auto max-h-[30vh] lg:max-h-[400px]">
                                        <div dangerouslySetInnerHTML={{ __html: result.analysis || '' }} />
                                    </div>
                                </div>

                                {/* Right: Suggestions */}
                                <div className="lg:w-1/3 order-1 lg:order-2 flex flex-col">
                                    <h4 className="font-bold text-townsfolk-blue mb-2">{t('aiConfig.suggestedBluffs')}</h4>
                                    <div className="space-y-2 overflow-y-auto max-h-[25vh] lg:max-h-[400px] pr-1">
                                        {result.bluffSuggestions?.map((suggestion, idx) => (
                                            <div key={idx} className="bg-parchment-white dark:bg-midnight-ink border border-stone-border dark:border-slate-gray p-3 rounded-lg shadow-sm">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-white text-xs font-bold">
                                                        {idx + 1}
                                                    </div>
                                                    <span className="font-bold text-ink-text dark:text-parchment">{suggestion.name}</span>
                                                </div>
                                                <p className="text-xs text-slate-500 dark:text-moonlit-stone leading-tight">
                                                    {suggestion.reason}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                    <button 
                                        onClick={handleApply}
                                        className="mt-4 w-full py-3 bg-townsfolk-blue text-white rounded-md font-bold hover:bg-opacity-90 transition-colors shadow-lg flex items-center justify-center gap-2"
                                    >
                                        <CheckCircleIcon className="w-5 h-5" />
                                        {t('aiConfig.applyBluffs')}
                                    </button>
                                </div>
                            </div>
                        )}

                        {mode === 'seating' && (
                            <div className="flex flex-col gap-4">
                                <div className="bg-white dark:bg-black p-4 rounded-md border border-stone-border dark:border-slate-gray prose prose-sm dark:prose-invert max-w-none max-h-[40vh] overflow-y-auto">
                                    <h4 className="text-md font-bold text-celestial-gold mb-2 sticky top-0 bg-white dark:bg-black py-2">{t('aiSeating.analysisReport')}</h4>
                                    <div dangerouslySetInnerHTML={{ __html: result.reasoning || '' }} />
                                </div>
                                <button 
                                    onClick={handleApply}
                                    className="w-full py-3 bg-townsfolk-blue text-white rounded-md font-bold hover:bg-opacity-90 transition-colors shadow-lg flex items-center justify-center gap-2"
                                >
                                    <ArrowDownTrayIcon className="w-5 h-5" />
                                    {t('aiSeating.applyOrder')}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Modal>
    );
};
