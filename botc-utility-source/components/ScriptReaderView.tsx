
import React, { useMemo } from 'react';
import { Script, Character, ScriptType, NightOrderItem } from '../types';
import { getOptimizedImageUrl } from '../utils';
import { ArrowLeftIcon, ClockIcon, PencilIcon, TrashIcon } from './Icons';

interface ScriptReaderViewProps {
  script: Script;
  allCharacters: Character[];
  allScriptTypes: ScriptType[];
  t: (key: string, options?: any) => string;
  onClose: () => void;
  onViewCharacter: (character: Character) => void;
  onEdit: (script: Script) => void;
  onDelete: (scriptId: string) => void;
}

const DetailSection: React.FC<{ title: string; children?: React.ReactNode }> = ({ title, children }) => {
    if (!children || (Array.isArray(children) && children.length === 0)) return null;
    return (
        <div className="mb-8">
            <h3 className="text-xl font-bold font-serif text-blood-red mb-3 border-b-2 border-blood-red/20 pb-2">{title}</h3>
            <div className="text-moonlit-stone space-y-2">{children}</div>
        </div>
    );
};

const NightOrderList: React.FC<{
  title: string;
  order: NightOrderItem[];
  allCharacters: Character[];
}> = ({ title, order, allCharacters }) => {
  if (!order || order.length === 0) return null;

  return (
    <DetailSection title={title}>
      <ol className="space-y-3 list-decimal list-inside">
        {order.map((item) => {
            const isPredefined = item.characterId.startsWith('predefined:');

            if (isPredefined) {
              return (
                <li key={item.id} className="flex items-start gap-3 p-2 bg-ravens-night/50 rounded-md">
                  <div className="w-8 h-8 rounded-full bg-midnight-ink overflow-hidden flex-shrink-0 border border-slate-gray flex items-center justify-center">
                    <ClockIcon className="w-5 h-5 text-parchment" />
                  </div>
                  <div className="self-center">
                    <span className="text-moonlit-stone">{item.customText}</span>
                  </div>
                </li>
              );
            }

            const character = allCharacters.find(c => c.id === item.characterId);
            if (!character) return null;

            return (
              <li key={item.id} className="flex items-start gap-3 p-2 bg-ravens-night/50 rounded-md">
                <div className="w-8 h-8 rounded-full bg-midnight-ink overflow-hidden flex-shrink-0 border border-slate-gray">
                  {character.iconUrl ? (
                    <img src={character.iconUrl} alt={character.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-slate-gray flex items-center justify-center text-sm font-serif">{character.name.charAt(0)}</div>
                  )}
                </div>
                <div className="pt-1">
                  <span className="font-semibold text-parchment">{character.name}{item.customText !== character.name ? ':' : ''}</span>
                  {item.customText !== character.name && <span className="ml-2 text-moonlit-stone">{item.customText}</span>}
                </div>
              </li>
            );
        })}
      </ol>
    </DetailSection>
  );
};

export const ScriptReaderView: React.FC<ScriptReaderViewProps> = ({ 
    script, allCharacters, allScriptTypes, t, onClose, onViewCharacter, onEdit, onDelete 
}) => {
    const charactersInScript = useMemo(() => 
        script.characterIds.map(id => allCharacters.find(c => c.id === id)).filter(Boolean) as Character[],
        [script.characterIds, allCharacters]
    );
    
    const scriptTypesInScript = useMemo(() =>
        script.typeIds.map(id => allScriptTypes.find(st => st.id === id)).filter(Boolean) as ScriptType[],
        [script.typeIds, allScriptTypes]
    );

    const sortedCharacters = useMemo(() => {
        const characterOrder: Character['characterType'][] = ['Townsfolk', 'Outsider', 'Minion', 'Demon', 'Traveler', 'Fabled'];
        const groupedCharacters: Record<string, Character[]> = {};
        
        characterOrder.forEach(type => {
            groupedCharacters[type] = [];
        });

        charactersInScript.forEach(char => {
            if (groupedCharacters[char.characterType]) {
                groupedCharacters[char.characterType].push(char);
            }
        });
        
        return characterOrder.map(type => ({
            type,
            characters: groupedCharacters[type]
        })).filter(group => group.characters.length > 0);

    }, [charactersInScript]);

    const defaultIconStyle = { zoom: 1, offsetX: 50, offsetY: 50 };

    return (
        <div className="absolute inset-0 bg-daylight-bg dark:bg-ravens-night z-30 flex flex-col overflow-y-auto">
            <header className="relative w-full flex-shrink-0 bg-midnight-ink border-b-4 border-blood-red/50 sticky top-0 z-10">
                <div className="w-full max-w-7xl mx-auto p-4 md:p-6 flex items-center gap-6">
                    <button onClick={onClose} className="flex-shrink-0 flex items-center gap-2 text-parchment/80 hover:text-parchment transition-colors p-2 rounded-md bg-slate-gray/30 hover:bg-slate-gray/50">
                        <ArrowLeftIcon className="w-6 h-6" />
                        <span className="hidden sm:inline">{t('form.backToList')}</span>
                    </button>
                    <h1 className="text-2xl md:text-4xl font-bold font-serif text-celestial-gold break-words flex-grow">{script.name}</h1>
                    
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => onEdit(script)}
                            className="p-2 text-parchment/80 hover:text-white hover:bg-townsfolk-blue transition-all rounded-md bg-slate-gray/30"
                            title={t('header.edit')}
                        >
                            <PencilIcon className="w-5 h-5" />
                        </button>
                        <button 
                            onClick={() => onDelete(script.id)}
                            className="p-2 text-parchment/80 hover:text-white hover:bg-demon-fire transition-all rounded-md bg-slate-gray/30"
                            title={t('header.delete')}
                        >
                            <TrashIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </header>

            <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
                    <div className="lg:col-span-2">
                        {script.description && (
                            <DetailSection title={t('form.description')}>
                                <p className="text-lg text-parchment whitespace-pre-wrap">{script.description}</p>
                            </DetailSection>
                        )}
                        
                        {(script.firstNightOrder && script.firstNightOrder.length > 0) || (script.otherNightsOrder && script.otherNightsOrder.length > 0) ? (
                            <DetailSection title={t('form.nightOrder')}>
                                <div className="space-y-8">
                                    <NightOrderList title={t('form.firstNight')} order={script.firstNightOrder || []} allCharacters={allCharacters} />
                                    <NightOrderList title={t('form.otherNights')} order={script.otherNightsOrder || []} allCharacters={allCharacters} />
                                </div>
                            </DetailSection>
                        ) : null}

                        {script.characterListImage ? (
                            <div className="mb-8">
                                <img 
                                    src={getOptimizedImageUrl(script.characterListImage)} 
                                    alt={t('form.characterListImageUrl')} 
                                    className="w-full object-contain rounded-lg border-2 border-slate-gray"
                                />
                            </div>
                        ) : (
                            <div className="mb-8 p-8 text-center border-2 border-dashed border-slate-gray rounded-lg">
                                <p className="text-moonlit-stone">{t('form.noCharacterListImage')}</p>
                            </div>
                        )}
                    </div>

                    <aside className="lg:col-span-1">
                        <div className="lg:sticky top-28 space-y-8">
                             {script.coverImage ? (
                                <div>
                                    <img 
                                        src={getOptimizedImageUrl(script.coverImage)} 
                                        alt={script.name} 
                                        className="w-full object-contain rounded-lg border-2 border-slate-gray shadow-lg"
                                    />
                                </div>
                            ) : (
                                <div className="w-full aspect-[2/3] bg-ravens-night flex items-center justify-center text-center border-2 border-dashed border-slate-gray rounded-lg">
                                    <p className="text-moonlit-stone">{t('form.noCoverImage')}</p>
                                </div>
                            )}

                             <DetailSection title={t('form.difficulty')}>
                                <div className="w-full bg-ravens-night rounded-full h-2.5 border border-slate-gray">
                                    <div className="bg-celestial-gold h-2 rounded-full" style={{ width: `${(script.difficulty / 5) * 100}%` }}></div>
                                </div>
                                <p className="text-center text-sm mt-1">{script.difficulty} / 5</p>
                            </DetailSection>

                             <DetailSection title={t('form.scriptTypes')}>
                               {scriptTypesInScript.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {scriptTypesInScript.map(type => (
                                            <span key={type.id} className="px-3 py-1 text-xs sm:text-sm font-semibold rounded-full bg-townsfolk-blue/20 text-townsfolk-blue border border-townsfolk-blue/50 whitespace-nowrap">{type.name}</span>
                                        ))}
                                    </div>
                                ) : <p className="text-sm">{t('form.noAssociatedTypes')}</p>}
                            </DetailSection>
                            
                            <DetailSection title={`${t('form.characters')} (${charactersInScript.length})`}>
                                <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
                                    {sortedCharacters.map(group => (
                                        <div key={group.type}>
                                            <h4 className="font-semibold text-celestial-gold">{t(`characterType.${group.type}`)} <span className="text-moonlit-stone font-normal">({group.characters.length})</span></h4>
                                            <ul className="mt-1 space-y-1">
                                                {group.characters.map(char => {
                                                    const iconStyle = { ...defaultIconStyle, ...char.iconStyle };
                                                    return (
                                                        <li key={char.id} className="flex items-center gap-3 p-1.5 rounded-md hover:bg-slate-gray/20 cursor-pointer transition-colors" onClick={() => onViewCharacter(char)}>
                                                            <div className="w-8 h-8 rounded-full bg-midnight-ink overflow-hidden flex-shrink-0 relative">
                                                                {char.iconUrl ? (
                                                                    <img
                                                                        src={char.iconUrl}
                                                                        alt={char.name}
                                                                        className="absolute max-w-none"
                                                                        style={{
                                                                            width: `${iconStyle.zoom * 100}%`,
                                                                            height: `${iconStyle.zoom * 100}%`,
                                                                            left: `${iconStyle.offsetX}%`,
                                                                            top: `${iconStyle.offsetY}%`,
                                                                            transform: `translate(-${iconStyle.offsetX}%, -${iconStyle.offsetY}%)`,
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    <div className="w-full h-full bg-slate-gray flex items-center justify-center text-sm font-serif">{char.name.charAt(0)}</div>
                                                                )}
                                                            </div>
                                                            <span className="text-sm text-parchment truncate">{char.name}</span>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                            </DetailSection>

                            {(script.jsonUrl || script.handbookUrl) && (
                                <DetailSection title={t('form.links')}>
                                    <div className="space-y-2">
                                        {script.jsonUrl && <a href={script.jsonUrl} target="_blank" rel="noopener noreferrer" className="text-townsfolk-blue hover:underline block truncate">{t('form.jsonUrl')}</a>}
                                        {script.handbookUrl && <a href={script.handbookUrl} target="_blank" rel="noopener noreferrer" className="text-townsfolk-blue hover:underline block truncate">{t('form.handbookUrl')}</a>}
                                    </div>
                                </DetailSection>
                            )}
                        </div>
                    </aside>
                </div>
            </main>
        </div>
    );
};
