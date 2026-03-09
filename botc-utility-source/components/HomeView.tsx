import React from 'react';
import { View } from '../types';
import { 
  BookOpenIcon, UserGroupIcon, ClipboardDocumentListIcon, 
  ListBulletIcon, FolderOpenIcon, BoltIcon, PlayIcon, 
  StarIcon, BeakerIcon, WifiIcon, CodeBracketIcon, ArrowPathIcon 
} from './Icons';

interface HomeViewProps {
  onNavigate: (view: View) => void;
  t: (key: string) => string;
}

export const HomeView: React.FC<HomeViewProps> = ({ onNavigate, t }) => {
  const features: { id: View; label: string; desc: string; icon: React.FC<any>; color: string; bgColor: string }[] = [
    { id: 'scripts', label: t('sidebar.scripts'), desc: t('home.features.scripts'), icon: BookOpenIcon, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
    { id: 'characters', label: t('sidebar.characters'), desc: t('home.features.characters'), icon: UserGroupIcon, color: 'text-green-500', bgColor: 'bg-green-500/10' },
    { id: 'role-assignment', label: t('sidebar.roleAssignment'), desc: t('home.features.roleAssignment'), icon: ClipboardDocumentListIcon, color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
    { id: 'game-records', label: t('sidebar.gameRecords'), desc: t('home.features.gameRecords'), icon: ListBulletIcon, color: 'text-yellow-500', bgColor: 'bg-yellow-500/10' },
    { id: 'rules', label: t('sidebar.rules'), desc: t('home.features.rules'), icon: FolderOpenIcon, color: 'text-red-500', bgColor: 'bg-red-500/10' },
    { id: 'ability-types', label: t('sidebar.abilityTypes'), desc: t('home.features.abilityTypes'), icon: BoltIcon, color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
    { id: 'game-simulation', label: t('sidebar.gameSimulation'), desc: t('home.features.gameSimulation'), icon: PlayIcon, color: 'text-teal-500', bgColor: 'bg-teal-500/10' },
    { id: 'character-learning', label: t('sidebar.characterLearning'), desc: t('home.features.characterLearning'), icon: StarIcon, color: 'text-indigo-500', bgColor: 'bg-indigo-500/10' },
    { id: 'ai-script-analysis', label: t('sidebar.aiScriptAnalysis'), desc: t('home.features.aiScriptAnalysis'), icon: BeakerIcon, color: 'text-pink-500', bgColor: 'bg-pink-500/10' },
    { id: 'online-game', label: t('sidebar.onlineGame'), desc: t('home.features.onlineGame'), icon: WifiIcon, color: 'text-cyan-500', bgColor: 'bg-cyan-500/10' },
    { id: 'json-import', label: t('sidebar.jsonImport'), desc: t('home.features.jsonImport'), icon: CodeBracketIcon, color: 'text-gray-500', bgColor: 'bg-gray-500/10' },
    { id: 'sync', label: t('sidebar.sync'), desc: t('home.features.sync'), icon: ArrowPathIcon, color: 'text-slate-500', bgColor: 'bg-slate-500/10' },
  ];

  return (
    <div className="h-full overflow-y-auto p-6 bg-daylight-bg dark:bg-ravens-night custom-scrollbar">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 text-center pt-10">
          <h1 className="text-4xl font-bold font-serif text-ink-text dark:text-parchment mb-4">
            {t('home.title')}
          </h1>
          <p className="text-lg text-slate-text dark:text-moonlit-stone max-w-2xl mx-auto">
            {t('home.subtitle')}
          </p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
          {features.map((feature) => (
            <button
              key={feature.id}
              onClick={() => onNavigate(feature.id)}
              className="flex flex-col items-center p-6 bg-parchment-white dark:bg-midnight-ink rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border border-stone-border dark:border-slate-gray hover:border-townsfolk-blue dark:hover:border-townsfolk-blue group text-center h-full"
            >
              <div className={`p-4 rounded-full mb-4 group-hover:scale-110 transition-transform duration-200 ${feature.bgColor}`}>
                <feature.icon className={`w-8 h-8 ${feature.color}`} />
              </div>
              <h3 className="text-xl font-bold text-ink-text dark:text-parchment mb-2 group-hover:text-townsfolk-blue transition-colors">
                {feature.label}
              </h3>
              <p className="text-sm text-slate-text dark:text-moonlit-stone">
                {feature.desc}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
