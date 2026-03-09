
import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Script, Character, View, Theme, Language, GameRecord, 
  AbilityTypeDefinition, RuleDocument, SavedSetup 
} from './types';
import { useAppStorage, useLocalStorage } from './utils';
import { 
  SunIcon, MoonIcon, Bars3Icon, XMarkIcon, LanguageIcon, 
  BookOpenIcon, UserGroupIcon, ClipboardDocumentListIcon, 
  SparklesIcon, CodeBracketIcon, ArrowPathIcon, PlusIcon,
  PencilIcon, TrashIcon, SearchIcon, FunnelIcon, ArrowsUpDownIcon,
  BeakerIcon, BoltIcon, StarIcon, DocumentArrowDownIcon, ListBulletIcon,
  FolderOpenIcon, CheckCircleIcon, ArrowsRightLeftIcon, WifiIcon, PlayIcon, HomeIcon
} from './components/Icons';

// Views
import { HomeView } from './components/HomeView';
import { RulesView } from './components/RulesView';
import { SyncView } from './components/SyncView';
import { RoleAssignmentView } from './components/RoleAssignmentView';
import { GameRecordsView } from './components/GameRecordsView';
import { AbilityTypesView } from './components/AbilityTypesView';
import { JsonImportView } from './components/JsonImportView';
import { AIScriptAnalysisView } from './components/AIScriptAnalysisView';
import { GameSimulationView } from './components/GameSimulationView';
import { CharacterLearningView } from './components/CharacterLearningView';
import { OnlineGameView } from './components/OnlineGameView';

// Assuming these exist based on context, even if not in the provided snippet list
// We need to import them to make the app work. 
// If they are missing, the user will get a different error (Module not found), which is better than SyntaxError.
import { ScriptsView } from './components/ScriptsView';
import { CharactersView } from './components/CharactersView';
import { ScriptTypeManager } from './components/ScriptTypeManager';

const defaultAbilityTypes: AbilityTypeDefinition[] = [
  { name: 'Standard', description: 'abilityType.desc.Standard', isCustom: false },
  { name: 'Triggered', description: 'abilityType.desc.Triggered', isCustom: false },
  { name: 'Once per game', description: 'abilityType.desc.Once per game', isCustom: false },
  { name: 'Passive', description: 'abilityType.desc.Passive', isCustom: false },
];

export const App: React.FC = () => {
  const { t, i18n } = useTranslation();
  
  // --- Global State ---
  const [currentView, setCurrentView] = useState<View>('home');
  const [theme, setTheme] = useLocalStorage<Theme>('botc_theme', 'dark');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Data State (using IndexedDB wrapper)
  const [scripts, setScripts] = useAppStorage<Script[]>('botc_scripts', []);
  const [characters, setCharacters] = useAppStorage<Character[]>('botc_characters', []);
  const [gameRecords, setGameRecords] = useAppStorage<GameRecord[]>('botc_records', []);
  const [rules, setRules] = useAppStorage<RuleDocument[]>('botc_rules', []);
  const [abilityTypes, setAbilityTypes] = useAppStorage<AbilityTypeDefinition[]>('botc_ability_types', defaultAbilityTypes);
  const [scriptTypes, setScriptTypes] = useAppStorage<{id:string, name:string}[]>('botc_script_types', []);
  
  // Aux State
  const [savedSetups, setSavedSetups] = useAppStorage<SavedSetup[]>('botc_saved_setups', []);
  const [masteredCharacterIds, setMasteredCharacterIds] = useAppStorage<string[]>('botc_mastered_chars', []);
  const [activeRuleDocId, setActiveRuleDocId] = useState<string | null>(null); // For linking from other views

  // Manage Script Types Modal
  const [isScriptTypeManagerOpen, setIsScriptTypeManagerOpen] = useState(false);

  // --- Effects ---
  useEffect(() => {
    document.documentElement.className = theme;
  }, [theme]);

  // --- Handlers ---
  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');
  
  const changeLanguage = () => {
    const langs: Language[] = ['en', 'zh-TW', 'zh-CN', 'ja'];
    const currentIdx = langs.indexOf(i18n.language as Language);
    const nextLang = langs[(currentIdx + 1) % langs.length];
    i18n.changeLanguage(nextLang);
  };

  const handleAddRuleDoc = (title: string, content: string) => {
      const newDoc: RuleDocument = {
          id: Date.now().toString(),
          name: title,
          content: content,
          parentId: null,
          type: 'document'
      };
      setRules(prev => [...prev, newDoc]);
      // Optional: Switch to rules view
      // setCurrentView('rules');
  };

  // --- Render Content Switch ---
  const renderContent = () => {
    switch (currentView) {
      case 'home':
        return <HomeView onNavigate={setCurrentView} t={t} />;
      case 'scripts':
        return <ScriptsView 
                  scripts={scripts} 
                  setScripts={setScripts} 
                  allCharacters={characters} 
                  setCharacters={setCharacters}
                  allScriptTypes={scriptTypes}
                  onManageScriptTypes={() => setIsScriptTypeManagerOpen(true)}
                  t={t} 
               />;
      case 'characters':
        return <CharactersView 
                  characters={characters} 
                  setCharacters={setCharacters} 
                  allScripts={scripts}
                  setScripts={setScripts}
                  abilityTypes={abilityTypes}
                  onAddAbilityType={(nt) => setAbilityTypes(p => [...p, nt])}
                  onDeleteAbilityType={(n) => setAbilityTypes(p => p.filter(x => x.name !== n))}
                  onViewRule={(name) => {
                      // Logic to find rule doc could go here
                      alert(`View rule: ${name}`);
                  }}
                  t={t} 
               />;
      case 'rules':
        return <RulesView 
                  documents={rules} 
                  isReadOnly={false} 
                  editingDocId={activeRuleDocId}
                  setEditingDocId={setActiveRuleDocId}
                  onSave={(id, name, content) => setRules(p => p.map(d => d.id === id ? { ...d, name, content } : d))}
                  onAdd={(parentId, type) => setRules(p => [...p, { id: Date.now().toString(), name: type === 'folder' ? t('rules.newFolder') : t('rules.newDocument'), content: '', parentId, type, isOpen: true }])}
                  onDelete={(id) => {
                      const deleteIds = [id];
                      const gatherChildren = (pid: string) => rules.filter(r => r.parentId === pid).forEach(c => { deleteIds.push(c.id); gatherChildren(c.id); });
                      gatherChildren(id);
                      setRules(p => p.filter(r => !deleteIds.includes(r.id)));
                  }}
                  onBulkDelete={(ids) => setRules(p => p.filter(r => !ids.includes(r.id)))}
                  onRename={(id) => {
                      const newName = prompt(t('rules.renameTitle'));
                      if (newName) setRules(p => p.map(d => d.id === id ? { ...d, name: newName } : d));
                  }}
                  onToggleFolder={(id) => setRules(p => p.map(d => d.id === id ? { ...d, isOpen: !d.isOpen } : d))}
                  onImport={(newRules) => setRules(p => [...p, ...newRules])}
                  onMoveRequest={(id, newParentId) => setRules(p => p.map(d => d.id === id ? { ...d, parentId: newParentId } : d))}
                  t={t} 
               />;
      case 'role-assignment':
        return <RoleAssignmentView 
                  allScripts={scripts} 
                  allCharacters={characters} 
                  t={t} 
                  savedSetups={savedSetups}
                  setSavedSetups={setSavedSetups}
                  onStartGame={(record) => {
                      setGameRecords(prev => [record, ...prev]);
                      setCurrentView('game-records');
                      // set active record id logic if needed
                  }}
               />;
      case 'game-records':
        return <GameRecordsView 
                  gameRecords={gameRecords} 
                  setGameRecords={setGameRecords} 
                  allCharacters={characters} 
                  scripts={scripts}
                  onAddRuleDoc={handleAddRuleDoc}
                  externalActiveId={null} // Pass ID if linking from other views
                  onClearExternalId={() => {}}
                  t={t} 
               />;
      case 'ability-types':
        return <AbilityTypesView 
                  abilityTypes={abilityTypes} 
                  onAdd={(nt) => setAbilityTypes(p => [...p, nt])} 
                  onUpdate={(old, nt) => setAbilityTypes(p => p.map(x => x.name === old ? nt : x))} 
                  onDelete={(n) => setAbilityTypes(p => p.filter(x => x.name !== n))} 
                  onBulkDelete={(ns) => setAbilityTypes(p => p.filter(x => !ns.includes(x.name)))} 
                  onImport={(its) => setAbilityTypes(p => [...p, ...its])} 
                  t={t} 
                  allCharacters={characters} 
               />;
      case 'json-import':
        return <JsonImportView 
                  allCharacters={characters} 
                  onImport={(script, newChars) => {
                      setScripts(prev => [...prev, script]);
                      // Merge characters avoiding duplicates
                      setCharacters(prev => {
                          const existingIds = new Set(prev.map(c => c.id));
                          const uniqueNewChars = newChars.filter(c => !existingIds.has(c.id));
                          return [...prev, ...uniqueNewChars];
                      });
                      setCurrentView('scripts');
                  }} 
                  t={t} 
               />;
      case 'ai-script-analysis':
        return <AIScriptAnalysisView 
                  allScripts={scripts} 
                  allCharacters={characters} 
                  onAddRuleDoc={handleAddRuleDoc}
                  t={t} 
               />;
      case 'game-simulation':
        return <GameSimulationView 
                  allCharacters={characters} 
                  gameRecords={gameRecords} 
                  scripts={scripts} 
                  t={t} 
               />;
      case 'character-learning':
        return <CharacterLearningView 
                  allCharacters={characters} 
                  masteredCharacterIds={masteredCharacterIds}
                  setMasteredCharacterIds={setMasteredCharacterIds}
                  t={t} 
               />;
      case 'sync':
        return <SyncView 
                  scripts={scripts} setScripts={setScripts} 
                  characters={characters} setCharacters={setCharacters} 
                  gameRecords={gameRecords} setGameRecords={setGameRecords} 
                  rules={rules} setRules={setRules}
                  t={t} 
               />;
      case 'online-game':
        return <OnlineGameView 
                  allScripts={scripts} 
                  allCharacters={characters} 
                  t={t} 
               />;
      default:
        return <div>Select a view</div>;
    }
  };

  const navItems: { id: View; label: string; icon: React.FC<any> }[] = [
    { id: 'home', label: t('sidebar.home'), icon: HomeIcon },
    { id: 'scripts', label: t('sidebar.scripts'), icon: BookOpenIcon },
    { id: 'characters', label: t('sidebar.characters'), icon: UserGroupIcon },
    { id: 'role-assignment', label: t('sidebar.roleAssignment'), icon: ClipboardDocumentListIcon },
    { id: 'game-records', label: t('sidebar.gameRecords'), icon: ListBulletIcon },
    { id: 'rules', label: t('sidebar.rules'), icon: FolderOpenIcon },
    { id: 'ability-types', label: t('sidebar.abilityTypes'), icon: BoltIcon },
    { id: 'game-simulation', label: t('sidebar.gameSimulation'), icon: PlayIcon },
    { id: 'character-learning', label: t('sidebar.characterLearning'), icon: StarIcon },
    { id: 'ai-script-analysis', label: t('sidebar.aiScriptAnalysis'), icon: BeakerIcon },
    { id: 'online-game', label: t('sidebar.onlineGame'), icon: WifiIcon },
    { id: 'json-import', label: t('sidebar.jsonImport'), icon: CodeBracketIcon },
    { id: 'sync', label: t('sidebar.sync'), icon: ArrowPathIcon },
  ];

  return (
    <div className="fixed inset-0 flex overflow-hidden bg-daylight-bg dark:bg-ravens-night text-ink-text dark:text-parchment font-sans">
      {/* Mobile Menu Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-parchment-white dark:bg-midnight-ink border-r border-stone-border dark:border-slate-gray transform transition-transform duration-300 ease-in-out flex flex-col
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-4 border-b border-stone-border dark:border-slate-gray flex items-center justify-between shrink-0">
          <h1 className="text-xl font-bold font-serif text-celestial-gold">BOTC Master</h1>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-slate-text dark:text-moonlit-stone">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        
        <nav className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => { setCurrentView(item.id); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium ${
                currentView === item.id 
                  ? 'bg-townsfolk-blue text-white shadow-md' 
                  : 'text-slate-text dark:text-moonlit-stone hover:bg-stone-border dark:hover:bg-slate-gray'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
          
          <div className="pt-4 mt-4 border-t border-stone-border dark:border-slate-gray">
            <a
              href="/source-code.zip"
              download="botc-utility-source.zip"
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-bold bg-green-600 text-white hover:bg-green-700 shadow-md"
            >
              <DocumentArrowDownIcon className="w-5 h-5" />
              下載原始碼 (ZIP)
            </a>
          </div>
        </nav>

        <div className="p-4 border-t border-stone-border dark:border-slate-gray flex items-center justify-between shrink-0">
          <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-stone-border dark:hover:bg-slate-gray text-slate-text dark:text-moonlit-stone transition-colors" title="Toggle Theme">
            {theme === 'dark' ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
          </button>
          <button onClick={changeLanguage} className="p-2 rounded-full hover:bg-stone-border dark:hover:bg-slate-gray text-slate-text dark:text-moonlit-stone transition-colors font-bold text-xs flex items-center gap-1" title="Change Language">
            <LanguageIcon className="w-5 h-5" /> {i18n.language.toUpperCase()}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="lg:hidden h-14 bg-parchment-white dark:bg-midnight-ink border-b border-stone-border dark:border-slate-gray flex items-center px-4 shrink-0 z-30">
          <button onClick={() => setIsSidebarOpen(true)} className="text-slate-text dark:text-moonlit-stone p-1 -ml-1">
            <Bars3Icon className="w-6 h-6" />
          </button>
          <span className="ml-3 font-bold text-lg text-ink-text dark:text-parchment truncate">
            {t(`sidebar.${currentView}` as any)}
          </span>
        </header>
        
        <div className="flex-1 flex flex-col overflow-hidden relative min-h-0">
          {renderContent()}
        </div>
      </main>

      {/* Modals */}
      {isScriptTypeManagerOpen && (
        <ScriptTypeManager 
          isOpen={isScriptTypeManagerOpen}
          onClose={() => setIsScriptTypeManagerOpen(false)}
          scriptTypes={scriptTypes}
          onSave={setScriptTypes}
          t={t}
        />
      )}
    </div>
  );
};
