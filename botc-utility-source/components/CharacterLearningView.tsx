
import React, { useState, useMemo } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { Character } from '../types';
import { useLocalStorage } from '../utils';
import { 
    SearchIcon, 
    SparklesIcon, 
    CheckCircleIcon, 
    StarIcon, 
    ArrowPathIcon,
    BeakerIcon,
    TrophyIcon,
    XMarkIcon,
    BookOpenIcon,
    ArrowsRightLeftIcon,
    UserGroupIcon,
    PlusIcon
} from './Icons';

interface CharacterLearningViewProps {
    allCharacters: Character[];
    masteredCharacterIds: string[];
    setMasteredCharacterIds: React.Dispatch<React.SetStateAction<string[]>>;
    t: (key: string, options?: any) => string;
}

interface LearningData {
    infographicHtml?: string;
    interactions?: { partner: string; logic: string; risk: string }[];
    quiz?: { question: string; options: string[]; answerIndex: number; explanation: string }[];
}

type ModuleType = 'infographic' | 'interactions' | 'quiz';

export const CharacterLearningView: React.FC<CharacterLearningViewProps> = ({ 
    allCharacters, masteredCharacterIds, setMasteredCharacterIds, t 
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCharId, setSelectedCharId] = useState<string | null>(null);
    
    // 模組獨立的加載狀態
    const [loadingStates, setLoadingStates] = useState<Record<ModuleType, boolean>>({
        infographic: false,
        interactions: false,
        quiz: false
    });

    const [quizIndex, setQuizIndex] = useState(0);
    const [showQuizResult, setShowQuizResult] = useState<boolean | null>(null);
    const [showExplanation, setShowExplanation] = useState(false);

    // 持久化緩存已生成的學習內容
    const [learnedCache, setLearnedCache] = useLocalStorage<Record<string, LearningData>>('botc_learned_cache', {});

    const selectedCharacter = useMemo(() => allCharacters.find(c => c.id === selectedCharId), [allCharacters, selectedCharId]);
    const currentData = useMemo(() => (selectedCharId ? learnedCache[selectedCharId] || {} : {}), [learnedCache, selectedCharId]);

    const filteredChars = useMemo(() => {
        return allCharacters
            .filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [allCharacters, searchTerm]);

    const isMastered = selectedCharId ? masteredCharacterIds.includes(selectedCharId) : false;

    const toggleMastery = () => {
        if (!selectedCharId) return;
        setMasteredCharacterIds(prev => 
            prev.includes(selectedCharId) 
                ? prev.filter(id => id !== selectedCharId)
                : [...prev, selectedCharId]
        );
    };

    /**
     * 生成指定模組的內容
     * 優化：針對考題使用 Flash 模型並極致精簡 Prompt 以提升速度，並確保索引重置防止黑屏
     */
    const generateModule = async (char: Character, moduleType: ModuleType) => {
        // 先清理 UI 狀態，避免渲染舊數據導致報錯
        if (moduleType === 'quiz') {
            setQuizIndex(0);
            setShowQuizResult(null);
            setShowExplanation(false);
        }

        setLoadingStates(prev => ({ ...prev, [moduleType]: true }));
        
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            let prompt = "";
            let schema: any = {};
            let model = 'gemini-3-pro-preview';

            if (moduleType === 'infographic') {
                model = 'gemini-3-flash-preview';
                prompt = `你是染鐘樓謎團導師。請為角色「${char.name}」生成 HTML 全息圖。包含：優勢、弱點、說書人帶本建議。使用 Tailwind CSS。能力：${char.ability}`;
                schema = { type: Type.OBJECT, properties: { infographicHtml: { type: Type.STRING } } };
            } else if (moduleType === 'interactions') {
                prompt = `精煉分析角色「${char.name}」與其它 2 個角色的深度交互邏輯。角色能力：${char.ability}`;
                schema = {
                    type: Type.OBJECT,
                    properties: {
                        interactions: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: { partner: { type: Type.STRING }, logic: { type: Type.STRING }, risk: { type: Type.STRING } }
                            }
                        }
                    }
                };
            } else if (moduleType === 'quiz') {
                model = 'gemini-3-flash-preview'; 
                prompt = `【極速任務】為角色「${char.name}」設計 2 個單選題。
                規則：
                1. 題目背景必須極簡（30字內）。
                2. 考點聚焦於容易誤判的規則細節。
                3. 解析不超過 50 字，直接點出規則點。
                角色能力：${char.ability}`;
                schema = {
                    type: Type.OBJECT,
                    properties: {
                        quiz: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    question: { type: Type.STRING },
                                    options: { type: Type.ARRAY, items: { type: Type.STRING } },
                                    answerIndex: { type: Type.NUMBER },
                                    explanation: { type: Type.STRING }
                                }
                            }
                        }
                    }
                };
            }

            const response = await ai.models.generateContent({
                model: model,
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: schema,
                }
            });

            if (response.text) {
                const newData = JSON.parse(response.text);
                setLearnedCache(prev => {
                    const charCache = prev[char.id] || {};
                    return { ...prev, [char.id]: { ...charCache, ...newData } };
                });
            }
        } catch (e) {
            console.error(e);
            alert("AI 導師生成此模組時發生錯誤，請稍後再試。");
        } finally {
            setLoadingStates(prev => ({ ...prev, [moduleType]: false }));
        }
    };

    const handleSelectChar = (char: Character) => {
        setSelectedCharId(char.id);
        setQuizIndex(0);
        setShowQuizResult(null);
        setShowExplanation(false);
    };

    const handleAnswer = (index: number) => {
        const quizList = currentData.quiz;
        if (!Array.isArray(quizList) || !quizList[quizIndex]) return;
        const isCorrect = index === quizList[quizIndex].answerIndex;
        setShowQuizResult(isCorrect);
        setShowExplanation(true);
    };

    return (
        <div className="flex flex-col lg:flex-row h-full">
            {/* Sidebar: Character Search List */}
            <aside className="w-full lg:w-72 border-r border-stone-border dark:border-slate-gray flex flex-col bg-slate-50 dark:bg-black/20">
                <div className="p-4 border-b border-stone-border dark:border-slate-gray space-y-3">
                    <h3 className="font-bold text-celestial-gold flex items-center gap-2">
                        <StarIcon className="w-5 h-5"/> {t('learning.progress')}
                    </h3>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 relative">
                        <div 
                            className="bg-celestial-gold h-2 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(227,179,65,0.5)]" 
                            style={{ width: `${(masteredCharacterIds.length / Math.max(1, allCharacters.length)) * 100}%` }}
                        ></div>
                    </div>
                    <p className="text-[10px] text-center text-moonlit-stone uppercase tracking-widest">
                        {t('learning.stats', { count: masteredCharacterIds.length })}
                    </p>
                </div>
                
                <div className="p-3">
                    <div className="relative">
                        <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-moonlit-stone" />
                        <input 
                            type="text" 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder={t('learning.searchPrompt')}
                            className="w-full pl-8 pr-2 py-2 bg-parchment-white dark:bg-midnight-ink border border-stone-border dark:border-slate-gray rounded-md text-sm focus:ring-1 focus:ring-townsfolk-blue outline-none"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {filteredChars.map(char => {
                        const isCharMastered = masteredCharacterIds.includes(char.id);
                        const isLearned = !!learnedCache[char.id];
                        return (
                            <button 
                                key={char.id}
                                onClick={() => handleSelectChar(char)}
                                className={`w-full flex items-center gap-3 p-3 text-left border-b border-stone-border/30 dark:border-slate-gray/30 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all ${selectedCharId === char.id ? 'bg-townsfolk-blue/10 border-l-4 border-l-townsfolk-blue' : ''}`}
                            >
                                <div className="w-8 h-8 rounded-full bg-midnight-ink overflow-hidden border border-slate-700 flex-shrink-0 relative">
                                    {char.iconUrl ? <img src={char.iconUrl} className="w-full h-full object-cover"/> : <span className="flex items-center justify-center h-full text-xs">{char.name[0]}</span>}
                                    {isCharMastered && <div className="absolute inset-0 bg-green-500/30 flex items-center justify-center"><CheckCircleIcon className="w-4 h-4 text-green-500 bg-white rounded-full"/></div>}
                                </div>
                                <div className="min-w-0 flex-grow">
                                    <div className="flex items-center gap-1">
                                        <h4 className={`text-sm font-bold truncate ${isCharMastered ? 'text-green-500' : 'text-ink-text dark:text-parchment'}`}>{char.name}</h4>
                                        {isLearned && <span title="已緩存教學內容"><SparklesIcon className="w-3 h-3 text-celestial-gold opacity-50" /></span>}
                                    </div>
                                    <p className="text-[10px] text-moonlit-stone uppercase">{t(`characterType.${char.characterType}`)}</p>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </aside>

            {/* Main Area: Learning Dashboard */}
            <main className="flex-1 bg-daylight-bg dark:bg-ravens-night overflow-y-auto">
                {!selectedCharacter ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-10 space-y-4">
                        <div className="w-32 h-32 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center animate-pulse">
                            <SparklesIcon className="w-16 h-16 text-celestial-gold opacity-50" />
                        </div>
                        <h2 className="text-2xl font-serif text-celestial-gold font-bold">{t('learning.title')}</h2>
                        <p className="max-w-md text-moonlit-stone">{t('learning.description')}</p>
                        <p className="text-sm italic animate-bounce mt-8">{t('learning.selectChar')}</p>
                    </div>
                ) : (
                    <div className="max-w-4xl mx-auto p-4 md:p-10 space-y-10">
                        {/* Header & Master Toggle */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-border dark:border-slate-gray pb-6">
                            <div className="flex items-center gap-6">
                                <div className="w-20 h-20 rounded-full border-4 border-celestial-gold overflow-hidden bg-midnight-ink relative shadow-xl">
                                    {selectedCharacter.iconUrl ? <img src={selectedCharacter.iconUrl} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-4xl">{selectedCharacter.name[0]}</div>}
                                </div>
                                <div>
                                    <h2 className="text-4xl font-bold font-serif text-celestial-gold">{selectedCharacter.name}</h2>
                                    <span className="text-sm font-bold px-2 py-1 bg-slate-700 text-parchment rounded uppercase">{t(`characterType.${selectedCharacter.characterType}`)}</span>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={toggleMastery}
                                    className={`px-6 py-3 rounded-full font-bold flex items-center gap-2 transition-all shadow-md ${isMastered ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-moonlit-stone hover:bg-townsfolk-blue hover:text-white'}`}
                                >
                                    {isMastered ? <TrophyIcon className="w-5 h-5" /> : <StarIcon className="w-5 h-5" />}
                                    {isMastered ? t('learning.mastered') : t('learning.markMastered')}
                                </button>
                            </div>
                        </div>

                        {/* Speed Optimization Notice */}
                        <div className="p-3 bg-townsfolk-blue/10 border border-townsfolk-blue/30 rounded-lg text-xs text-townsfolk-blue flex items-center gap-2">
                            <SparklesIcon className="w-4 h-4"/> {t('learning.speedNotice')}
                        </div>

                        {/* 01 Infographic */}
                        <section className="space-y-4">
                            <div className="flex justify-between items-center border-b-2 border-blood-red/20 pb-2">
                                <h3 className="text-2xl font-serif text-blood-red font-bold flex items-center gap-2">
                                    <BookOpenIcon className="w-6 h-6"/> {t('learning.infographic')}
                                </h3>
                                {currentData.infographicHtml && (
                                    <button onClick={() => generateModule(selectedCharacter, 'infographic')} className="text-xs text-moonlit-stone hover:text-parchment flex items-center gap-1">
                                        <ArrowPathIcon className={`w-3 h-3 ${loadingStates.infographic ? 'animate-spin' : ''}`}/> {t('learning.regenerate')}
                                    </button>
                                )}
                            </div>
                            
                            {loadingStates.infographic ? (
                                <div className="p-20 text-center space-y-4 bg-white/5 rounded-xl border border-dashed border-slate-700">
                                    <ArrowPathIcon className="w-10 h-10 text-townsfolk-blue animate-spin mx-auto" />
                                    <p className="text-sm italic text-moonlit-stone">AI 導師正在繪製全息圖...</p>
                                </div>
                            ) : currentData.infographicHtml ? (
                                <div className="rounded-xl overflow-hidden shadow-lg bg-white dark:bg-midnight-ink border border-stone-border dark:border-slate-gray animate-fade-in">
                                    <div 
                                        className="p-6 prose prose-sm sm:prose-base dark:prose-invert max-w-none"
                                        dangerouslySetInnerHTML={{ __html: currentData.infographicHtml }}
                                    />
                                </div>
                            ) : (
                                <div className="p-10 text-center space-y-6 bg-white/5 rounded-xl border border-dashed border-slate-700">
                                    <p className="text-sm text-moonlit-stone">{t('learning.moduleEmpty')}</p>
                                    <button onClick={() => generateModule(selectedCharacter, 'infographic')} className="px-8 py-3 bg-blood-red text-white rounded-full font-bold flex items-center gap-2 mx-auto shadow-lg hover:scale-105 transition-transform">
                                        <SparklesIcon className="w-5 h-5"/> {t('learning.generateInfographic')}
                                    </button>
                                </div>
                            )}
                        </section>

                        {/* 02 Interaction Map */}
                        <section className="space-y-4">
                            <div className="flex justify-between items-center border-b-2 border-townsfolk-blue/20 pb-2">
                                <h3 className="text-2xl font-serif text-townsfolk-blue font-bold flex items-center gap-2">
                                    <ArrowsRightLeftIcon className="w-6 h-6"/> {t('learning.interactions')}
                                </h3>
                                {currentData.interactions && (
                                    <button onClick={() => generateModule(selectedCharacter, 'interactions')} className="text-xs text-moonlit-stone hover:text-parchment flex items-center gap-1">
                                        <ArrowPathIcon className={`w-3 h-3 ${loadingStates.interactions ? 'animate-spin' : ''}`}/> {t('learning.regenerate')}
                                    </button>
                                )}
                            </div>

                            {loadingStates.interactions ? (
                                <div className="p-20 text-center space-y-4 bg-white/5 rounded-xl border border-dashed border-slate-700">
                                    <ArrowPathIcon className="w-10 h-10 text-townsfolk-blue animate-spin mx-auto" />
                                    <p className="text-sm italic text-moonlit-stone">AI 導師正在進行兵棋推演...</p>
                                </div>
                            ) : currentData.interactions ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                                    {currentData.interactions.map((inter, i) => (
                                        <div key={i} className="bg-slate-100 dark:bg-slate-800/50 p-4 rounded-lg border border-stone-border dark:border-slate-700 flex flex-col hover:shadow-md transition-shadow">
                                            <div className="font-bold text-celestial-gold text-lg mb-2 flex items-center gap-2">
                                                <UserGroupIcon className="w-4 h-4" /> {inter.partner}
                                            </div>
                                            <div className="text-sm text-ink-text dark:text-parchment flex-grow mb-3 leading-relaxed">
                                                <strong>邏輯：</strong> {inter.logic}
                                            </div>
                                            <div className="text-[10px] bg-red-500/10 text-demon-fire p-2 rounded border border-demon-fire/30">
                                                <strong>說書人提醒：</strong> {inter.risk}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-10 text-center space-y-6 bg-white/5 rounded-xl border border-dashed border-slate-700">
                                    <p className="text-sm text-moonlit-stone">{t('learning.moduleEmpty')}</p>
                                    <button onClick={() => generateModule(selectedCharacter, 'interactions')} className="px-8 py-3 bg-townsfolk-blue text-white rounded-full font-bold flex items-center gap-2 mx-auto shadow-lg hover:scale-105 transition-transform">
                                        <ArrowsRightLeftIcon className="w-5 h-5"/> {t('learning.generateInteractions')}
                                    </button>
                                </div>
                            )}
                        </section>

                        {/* 03 Quiz Section - 修復黑屏與安全性 */}
                        <section className="space-y-4 pb-20">
                            <div className="flex justify-between items-center border-b-2 border-purple-500/20 pb-2">
                                <h3 className="text-2xl font-serif text-purple-500 font-bold flex items-center gap-2">
                                    <BeakerIcon className="w-6 h-6"/> {t('learning.quiz')}
                                </h3>
                                {Array.isArray(currentData.quiz) && currentData.quiz.length > 0 && (
                                    <button onClick={() => generateModule(selectedCharacter, 'quiz')} className="text-xs text-moonlit-stone hover:text-parchment flex items-center gap-1">
                                        <ArrowPathIcon className={`w-3 h-3 ${loadingStates.quiz ? 'animate-spin' : ''}`}/> {t('learning.regenerate')}
                                    </button>
                                )}
                            </div>

                            {loadingStates.quiz ? (
                                <div className="p-20 text-center space-y-4 bg-white/5 rounded-xl border border-dashed border-slate-700">
                                    <ArrowPathIcon className="w-10 h-10 text-purple-500 animate-spin mx-auto" />
                                    <p className="text-sm italic text-moonlit-stone">AI 導師正在設計考題...</p>
                                </div>
                            ) : (Array.isArray(currentData.quiz) && currentData.quiz.length > 0 && currentData.quiz[quizIndex]) ? (
                                <div className="bg-gradient-to-br from-purple-500/5 to-indigo-600/10 p-6 rounded-xl border border-purple-500/30 shadow-inner animate-fade-in">
                                    <div className="space-y-6">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-bold text-purple-500 uppercase tracking-widest">Question {quizIndex + 1} of {currentData.quiz.length}</span>
                                        </div>
                                        <p className="text-lg font-bold text-parchment">{currentData.quiz[quizIndex]?.question}</p>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {currentData.quiz[quizIndex]?.options?.map((opt, i) => (
                                                <button 
                                                    key={i}
                                                    onClick={() => !showExplanation && handleAnswer(i)}
                                                    disabled={showExplanation}
                                                    className={`p-4 rounded-lg border-2 text-left transition-all ${showExplanation ? (i === currentData.quiz[quizIndex]?.answerIndex ? 'border-green-500 bg-green-500/10' : 'border-slate-300 dark:border-slate-700 opacity-50') : 'border-slate-300 dark:border-slate-700 hover:border-purple-500 hover:bg-purple-500/5'}`}
                                                >
                                                    <span className="inline-block w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-center text-xs font-bold mr-2">{String.fromCharCode(65 + i)}</span>
                                                    {opt}
                                                </button>
                                            ))}
                                        </div>

                                        {showExplanation && (
                                            <div className="animate-fade-in-up space-y-4">
                                                <div className={`p-4 rounded-lg flex items-center gap-3 ${showQuizResult ? 'bg-green-500/20 text-green-500 border border-green-500/30' : 'bg-red-500/20 text-red-500 border border-red-500/30'}`}>
                                                    {showQuizResult ? <CheckCircleIcon className="w-6 h-6" /> : <XMarkIcon className="w-6 h-6" />}
                                                    <span className="font-bold">{showQuizResult ? t('learning.quizCorrect') : t('learning.quizWrong')}</span>
                                                </div>
                                                <div className="bg-white dark:bg-black/40 p-4 rounded-lg border border-slate-700 text-sm leading-relaxed">
                                                    <strong className="text-celestial-gold block mb-1">🔍 詳細解析：</strong>
                                                    {currentData.quiz[quizIndex]?.explanation}
                                                </div>
                                                <div className="flex justify-end">
                                                    {quizIndex < (currentData.quiz?.length || 0) - 1 ? (
                                                        <button 
                                                            onClick={() => { setQuizIndex(prev => prev + 1); setShowExplanation(false); setShowQuizResult(null); }}
                                                            className="px-6 py-2 bg-purple-600 text-white rounded-md font-bold"
                                                        >
                                                            下一題
                                                        </button>
                                                    ) : !isMastered && (
                                                        <button 
                                                            onClick={toggleMastery}
                                                            className="px-6 py-2 bg-green-600 text-white rounded-md font-bold flex items-center gap-2"
                                                        >
                                                            <TrophyIcon className="w-4 h-4"/> 課程完成，標記為已掌握
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="p-10 text-center space-y-6 bg-white/5 rounded-xl border border-dashed border-slate-700">
                                    <p className="text-sm text-moonlit-stone">{t('learning.moduleEmpty')}</p>
                                    <button onClick={() => generateModule(selectedCharacter, 'quiz')} className="px-8 py-3 bg-purple-600 text-white rounded-full font-bold flex items-center gap-2 mx-auto shadow-lg hover:scale-105 transition-transform">
                                        <BeakerIcon className="w-5 h-5"/> {t('learning.generateQuiz')}
                                    </button>
                                </div>
                            )}
                        </section>
                    </div>
                )}
            </main>
        </div>
    );
};
