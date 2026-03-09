
import React, { useState } from 'react';
import { GamePhase, Assignment, NewActionLogEntryData } from '../types';
import { ArrowUturnLeftIcon } from './Icons';

interface PhaseAdvanceButtonProps {
  currentPhase: GamePhase;
  dayNumber: number;
  onAdvance: () => void;
  onRewind?: () => void; // New prop for rewind
  t: (key: string, options?: { [key: string]: string | number }) => string;
}

export const PhaseAdvanceButton: React.FC<PhaseAdvanceButtonProps> = ({ currentPhase, dayNumber, onAdvance, onRewind, t }) => {
    const buttonText: Record<string, string> = { 
        'FirstNight': t('roleAssignment.endFirstNight'), 
        'Day': t('roleAssignment.endDay', { day: dayNumber }), 
        'Night': t('roleAssignment.endNight', { day: dayNumber + 1 }) 
    };

    const showRewind = currentPhase !== 'FirstNight';

    return (
        <div className="flex gap-2">
            {showRewind && onRewind && (
                <button
                    onClick={onRewind}
                    className="flex items-center gap-2 px-4 py-3 rounded-md bg-slate-500 hover:bg-slate-600 text-white transition-colors shadow-md border-2 border-transparent font-bold text-sm whitespace-nowrap"
                    title={t('gameRecords.rewindPhase')}
                >
                    <ArrowUturnLeftIcon className="w-5 h-5" />
                    <span>{t('gameRecords.rewindPhase')}</span>
                </button>
            )}
            <button 
                onClick={onAdvance} 
                className="flex-grow px-6 py-3 text-md font-bold rounded-md bg-blood-red hover:bg-demon-fire text-white transition-colors shadow-md border-2 border-transparent hover:border-parchment whitespace-nowrap"
            >
                {buttonText[currentPhase] || 'Advance Phase'}
            </button>
        </div>
    );
};

interface NominationInputProps {
    livingPlayers: Assignment[];
    onAddLog: (entry: NewActionLogEntryData) => void;
    onCancel: () => void;
    t: (key: string) => string;
}

export const NominationInput: React.FC<NominationInputProps> = ({ livingPlayers, onAddLog, onCancel, t }) => {
    const [nominatorId, setNominatorId] = useState('');
    const [nomineeId, setNomineeId] = useState('');

    const handleAddNomination = () => {
        if (!nominatorId || !nomineeId || nominatorId === nomineeId) return;
        onAddLog({ type: 'nomination', nominatorId, nomineeId, voters: [] });
        onCancel();
    };

    return (
      <div className="mt-2 p-4 bg-ravens-night rounded-md space-y-3 max-w-md mx-auto border border-slate-gray shadow-lg animate-fade-in-up">
        <h4 className="text-sm font-semibold text-celestial-gold text-center">{t('roleAssignment.recordNomination')}</h4>
        <div className="grid grid-cols-2 gap-3">
            <div>
                <label className="block text-xs text-moonlit-stone mb-1">{t('roleAssignment.nominator')}</label>
                <select value={nominatorId} onChange={e => setNominatorId(e.target.value)} className="w-full bg-slate-gray border border-slate-gray rounded-md px-2 py-2 text-parchment text-sm focus:ring-townsfolk-blue focus:border-townsfolk-blue">
                    <option value="">-- {t('keywords.select')} --</option>
                    {livingPlayers.map(p => <option key={p.role.id} value={p.role.id}>{p.role.name}</option>)}
                </select>
            </div>
            <div>
                <label className="block text-xs text-moonlit-stone mb-1">{t('roleAssignment.nominee')}</label>
                <select value={nomineeId} onChange={e => setNomineeId(e.target.value)} className="w-full bg-slate-gray border border-slate-gray rounded-md px-2 py-2 text-parchment text-sm focus:ring-townsfolk-blue focus:border-townsfolk-blue">
                    <option value="">-- {t('keywords.select')} --</option>
                    {livingPlayers.map(p => <option key={p.role.id} value={p.role.id}>{p.role.name}</option>)}
                </select>
            </div>
        </div>
        <div className="flex gap-2">
            <button onClick={onCancel} className="flex-1 px-3 py-2 text-sm rounded bg-slate-gray text-moonlit-stone hover:bg-opacity-80 transition-colors">{t('form.cancel')}</button>
            <button onClick={handleAddNomination} disabled={!nominatorId || !nomineeId} className="flex-1 px-3 py-2 text-sm rounded bg-townsfolk-blue text-white hover:bg-opacity-80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">{t('roleAssignment.saveLog')}</button>
        </div>
      </div>
    );
};
