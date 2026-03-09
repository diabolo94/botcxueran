
// types.ts
export type CharacterType = 'Townsfolk' | 'Outsider' | 'Minion' | 'Demon' | 'Traveler' | 'Fabled' | 'Loric';
export type AbilityType = 'Standard' | 'Triggered' | 'Once per game' | 'Passive';
export type View = 'home' | 'scripts' | 'characters' | 'rules' | 'sync' | 'role-assignment' | 'game-records' | 'ability-types' | 'json-import' | 'ai-script-analysis' | 'game-simulation' | 'character-learning' | 'online-game';
export type Language = 'en' | 'zh-TW' | 'zh-CN' | 'ja';
export type Theme = 'light' | 'dark';
export type CharacterTypeFilter = CharacterType | 'All';
export type ScriptTypeFilter = string | 'All'; // ID of the script type, or 'All'
export type GamePhase = 'FirstNight' | 'Day' | 'Night';

export interface AbilityTypeDefinition {
  name: string;
  description: string;
  isCustom: boolean;
  // New Metadata Features
  color?: 'blue' | 'red' | 'gold' | 'green' | 'purple' | 'gray' | 'slate';
  icon?: 'Star' | 'Moon' | 'Sun' | 'Bolt' | 'Shield' | 'Skull' | 'Clock' | 'Eye';
  phase?: 'Setup' | 'FirstNight' | 'EveryNight' | 'Day' | 'Passive';
}

export interface IconStyle {
  zoom: number;
  offsetX: number;
  offsetY: number;
}

export interface ReminderData {
  name: string;
  content: string;
}

export interface Character {
  id: string;
  name: string;
  characterType: CharacterType;
  abilityType: string[]; // Changed to array
  ability: string;
  bio?: string;
  story?: string;
  example?: string;
  howItWorks?: string;
  tips?: string;
  reminders: (string | ReminderData)[];
  scriptIds: string[];
  iconUrl?: string;
  imageUrl?: string;
  iconStyle?: IconStyle;
}

export interface ScriptType {
  id: string;
  name: string;
}

export interface NightOrderItem {
  id: string; // Unique ID for drag-and-drop key
  characterId: string;
  customText: string;
}

export interface Script {
  id: string;
  name: string;
  description: string;
  coverImage: string;
  typeIds: string[];
  difficulty: number;
  characterListImage: string;
  characterIds: string[];
  jsonUrl: string;
  handbookUrl: string;
  firstNightOrder?: NightOrderItem[];
  otherNightsOrder?: NightOrderItem[];
  lastModified?: number; // New field for sorting
}

export type RuleDocType = 'folder' | 'document';

export interface RuleDocument {
    id: string;
    name: string;
    content: string;
    parentId: string | null;
    type: RuleDocType;
    isOpen?: boolean;
}

// State for modals to ensure type safety
export type ModalState = 
  | { type: 'OFF' }
  | { type: 'ADD_CHARACTER' }
  | { type: 'EDIT_CHARACTER', data: Character }
  | { type: 'VIEW_CHARACTER', data: Character }
  | { type: 'ADD_SCRIPT' }
  | { type: 'EDIT_SCRIPT', data: Script }
  | { type: 'VIEW_SCRIPT', data: Script }
  | { type: 'SCRIPT_QUICK_VIEW', data: Script }
  | { type: 'MANAGE_SCRIPT_TYPES' }
  | { type: 'ADD_RULE_ITEM', data: { parentId: string | null; itemType: RuleDocType } }
  | { type: 'RENAME_RULE_ITEM', data: RuleDocument };

export type ExportScope = 'all' | 'allScripts' | 'allCharacters' | 'selected';

// --- Game Record and Action Log Types ---
export interface StatusMarker {
  id: string;
  text: string;
  icon: string;
  color: string;
}

export type InfoTag = 'truth' | 'falsehood' | 'key_play';

export type NewActionLogEntryData =
  | { type: 'phase_marker'; phase: GamePhase; dayNumber: number }
  | { type: 'note'; characterId: string | 'general'; text: string; infoTag?: InfoTag }
  | { type: 'nomination'; nominatorId: string; nomineeId: string; voters: string[]; linkedExecutionId?: string; infoTag?: InfoTag }
  | { type: 'execution'; nomineeId: string; outcome: 'executed' | 'spared' }
  | { type: 'character_change'; playerIndex: number; oldRoleId: string; newRoleId: string; reason?: string; newAlignment?: 'good' | 'evil'; killPlayerIndex?: number };

export type ActionLogEntry = NewActionLogEntryData & { id: string };


export interface Assignment {
  player: number;
  role: Character;
  pretendRole?: Character; // For Drunk, Marionette, Lunatic - the role they THINK they are
  alignment?: 'good' | 'evil'; // Tracks current alignment
  revealed: boolean;
  status: 'alive' | 'dead';
  statusMarkers: StatusMarker[];
}

export interface GameRecord {
  id: string;
  date: string;
  name: string;
  scriptName: string;
  playerCount: number;
  assignments: Assignment[];
  actionLog: ActionLogEntry[];
  currentPhase: GamePhase;
  dayNumber: number;
  bluffRoleIds?: string[];
  winningTeam?: 'good' | 'evil';
  specialRoleIds?: string[]; // IDs of Fabled/Loric characters not in seats
}

export interface SavedSetup {
  id: string;
  name: string;
  date: string;
  scriptId: string;
  playerCount: number;
  roles: { seat: number; roleId: string; alignment?: 'good' | 'evil'; pretendRoleId?: string }[];
  bluffRoleIds?: string[];
}

export interface SimulationLogEntry {
  id: string;
  text: string;
  timestamp?: number;
}

export interface SimulationSession {
  id: string;
  lastActive: string;
  gameRecord: GameRecord;
  narrative: SimulationLogEntry[] | string[]; // Support both new and legacy formats
  currentStep: string;
  dayCounter: number;
  nomsThisDay: {nominator: number, nominee: number, votes?: number}[];
}
