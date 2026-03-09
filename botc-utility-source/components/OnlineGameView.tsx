
import React, { useState, useEffect, useRef, useMemo } from 'react';
import Peer, { DataConnection } from 'peerjs';
import { Script, Character, Assignment, GameRecord, GamePhase, StatusMarker } from '../types';
import { 
    WifiIcon, UserGroupIcon, ChatBubbleOvalLeftEllipsisIcon, 
    CheckCircleIcon, XMarkIcon, ArrowPathIcon, SparklesIcon, 
    CopyIcon, PlayIcon, ArrowLeftIcon, HandRaisedIcon, 
    EyeIcon, EyeSlashIcon, MoonIcon, SunIcon, BookOpenIcon,
    ClockIcon, PlusIcon, TrashIcon, BoltIcon, PencilIcon,
    CheckIcon, ExclamationTriangleIcon, TrophyIcon
} from './Icons';
import { useLocalStorage } from '../utils';
import { Modal } from './Modal';

// --- Types ---

type ConnectionStep = 'menu' | 'host-setup' | 'join-setup' | 'lobby' | 'game';

interface OnlineGameViewProps {
    allScripts: Script[];
    allCharacters: Character[];
    t: (key: string, options?: any) => string;
}

interface OnlinePlayer {
    peerId: string;
    name: string;
    isHost: boolean;
    seatNumber?: number;
    status: 'alive' | 'dead';
    hasGhostVote: boolean; // Has the player USED their ghost vote? (false = still has it)
}

interface VotingState {
    isOpen: boolean;
    nominatorId: string | null; // PeerID
    nomineeId: string | null;   // PeerID
    votes: Record<string, boolean>; // PeerID -> Voted Yes/No
    history: string[]; // Log of finished votes
}

interface GameState {
    phase: GamePhase;
    dayNumber: number;
    scriptId: string;
    assignments: Assignment[]; // Host manages this. IMPORTANT: assignments uses seat/player index logic usually, but here we might map to PeerID for online.
    nomination: VotingState;
}

// Extension to Assignment to link with Online Player
interface OnlineAssignment extends Assignment {
    peerId: string; // Link to the connection
}

interface NetworkMessage {
    type: 'JOIN' | 'WELCOME' | 'PLAYER_UPDATE' | 'GAME_START' | 'STATE_UPDATE' | 'CHAT' | 'ACTION' | 'VOTE' | 'PRIVATE_MSG';
    payload: any;
}

// --- Helpers ---

const getDistribution = (count: number): [number, number, number, number] => {
    const distMap: Record<number, [number, number, number, number]> = {
        5: [3, 0, 1, 1], 6: [3, 1, 1, 1], 7: [5, 0, 1, 1],
        8: [5, 1, 1, 1], 9: [5, 2, 1, 1], 10: [7, 0, 2, 1],
        11: [7, 1, 2, 1], 12: [7, 2, 2, 1], 13: [9, 0, 3, 1],
        14: [9, 1, 3, 1], 15: [9, 2, 3, 1],
    };
    if (count > 15) return distMap[15];
    if (count < 5) return [Math.max(0, count - 1), 0, 0, 1];
    return distMap[count] || [0, 0, 0, 0];
};

function shuffle<T>(array: T[]): T[] {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

// --- Main Component ---

export const OnlineGameView: React.FC<OnlineGameViewProps> = ({ allScripts, allCharacters, t }) => {
    // --- Global UI State ---
    const [step, setStep] = useState<ConnectionStep>('menu');
    const [playerName, setPlayerName] = useLocalStorage('botc_player_name', '');
    const [roomId, setRoomId] = useState('');
    const [statusMsg, setStatusMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    // --- P2P State ---
    const [myPeerId, setMyPeerId] = useState('');
    const [peer, setPeer] = useState<Peer | null>(null);
    const [connections, setConnections] = useState<DataConnection[]>([]); 
    const isHost = step === 'host-setup' || (step !== 'menu' && step !== 'join-setup' && myPeerId === roomId);

    // --- Game Data State ---
    const [players, setPlayers] = useState<OnlinePlayer[]>([]);
    const [chatMessages, setChatMessages] = useState<{sender: string, text: string, isSystem?: boolean, isPrivate?: boolean}[]>([]);
    const [chatInput, setChatInput] = useState('');
    
    // Host Specific State
    const [selectedScriptId, setSelectedScriptId] = useState<string>('');
    const [gameState, setGameState] = useState<GameState>({
        phase: 'FirstNight',
        dayNumber: 0,
        scriptId: '',
        assignments: [], // This will hold OnlineAssignment
        nomination: { isOpen: false, nominatorId: null, nomineeId: null, votes: {}, history: [] }
    });

    // UI Modals & Panels
    const [editingPlayerPeerId, setEditingPlayerPeerId] = useState<string | null>(null); // For Host Grimoire Modal
    const [isNightSheetOpen, setIsNightSheetOpen] = useState(false);
    const [privateMsgTarget, setPrivateMsgTarget] = useState<string | null>(null); // PeerID
    const [privateMsgContent, setPrivateMsgContent] = useState('');

    // Client Specific State
    const [myRole, setMyRole] = useState<Character | null>(null);
    const [isRoleRevealed, setIsRoleRevealed] = useState(false);

    // --- Initialization & Cleanup ---
    useEffect(() => {
        return () => {
            peer?.destroy();
        };
    }, []);

    // --- PeerJS Logic ---

    const initializePeer = (id?: string) => {
        setStatusMsg('正在初始化連線...');
        setErrorMsg('');
        
        const newPeer = id ? new Peer(id) : new Peer();

        newPeer.on('open', (pid) => {
            setMyPeerId(pid);
            if (id) { 
                // Host Mode
                setRoomId(pid);
                setPlayers([{ peerId: pid, name: playerName, isHost: true, status: 'alive', hasGhostVote: false }]);
                setStep('lobby');
            } else {
                // Client Mode - Ready to connect
                connectToHost(newPeer, roomId);
            }
            setStatusMsg('');
        });

        newPeer.on('error', (err) => {
            console.error(err);
            setErrorMsg(`連線錯誤: ${err.type}`);
            setStep('menu');
        });

        newPeer.on('connection', (conn) => {
            handleConnection(conn, true);
        });

        setPeer(newPeer);
    };

    const connectToHost = (currentPeer: Peer, targetId: string) => {
        setStatusMsg(`正在連接至房間 ${targetId}...`);
        const conn = currentPeer.connect(targetId, {
            metadata: { name: playerName }
        });
        handleConnection(conn, false);
    };

    const handleConnection = (conn: DataConnection, amIHost: boolean) => {
        conn.on('open', () => {
            setConnections(prev => [...prev, conn]);
            
            if (amIHost) {
                // Host receives connection
            } else {
                // Client connected
                setStep('lobby');
                conn.send({ type: 'JOIN', payload: { name: playerName } });
            }
        });

        conn.on('data', (data: any) => {
            handleIncomingData(data as NetworkMessage, conn);
        });

        conn.on('close', () => {
            setConnections(prev => prev.filter(c => c.connectionId !== conn.connectionId));
            if (!amIHost) {
                alert("與主機斷開連線");
                setStep('menu');
            } else {
                // Host: remove player
                setPlayers(prev => {
                    const newPlayers = prev.filter(p => p.peerId !== conn.peer);
                    broadcast({ type: 'PLAYER_UPDATE', payload: newPlayers });
                    return newPlayers;
                });
            }
        });
    };

    const handleIncomingData = (msg: NetworkMessage, conn: DataConnection) => {
        switch (msg.type) {
            case 'JOIN': // Host receives
                if (isHost) {
                    const newPlayer: OnlinePlayer = { 
                        peerId: conn.peer, 
                        name: msg.payload.name, 
                        isHost: false,
                        status: 'alive',
                        hasGhostVote: false
                    };
                    setPlayers(prev => {
                        const updated = [...prev, newPlayer];
                        broadcast({ type: 'PLAYER_UPDATE', payload: updated });
                        conn.send({ 
                            type: 'WELCOME', 
                            payload: { 
                                gameState, 
                                players: updated,
                                scriptId: selectedScriptId 
                            } 
                        });
                        return updated;
                    });
                }
                break;
            case 'WELCOME': // Client receives
                setGameState(msg.payload.gameState);
                setPlayers(msg.payload.players);
                if (msg.payload.scriptId) setSelectedScriptId(msg.payload.scriptId);
                // Check if I have a role assigned
                checkMyRole(msg.payload.gameState.assignments, myPeerId);
                break;
            case 'PLAYER_UPDATE':
                setPlayers(msg.payload);
                break;
            case 'GAME_START':
                setStep('game');
                break;
            case 'STATE_UPDATE':
                setGameState(msg.payload);
                checkMyRole(msg.payload.assignments, myPeerId);
                break;
            case 'CHAT':
                setChatMessages(prev => [...prev, msg.payload]);
                break;
            case 'PRIVATE_MSG':
                setChatMessages(prev => [...prev, { ...msg.payload, isPrivate: true }]);
                alert(`收到私訊: ${msg.payload.text}`);
                break;
            case 'VOTE': // Host receives vote from client
                if (isHost) {
                    const { voterId, vote } = msg.payload;
                    setGameState(prev => {
                        const newState = { ...prev };
                        newState.nomination.votes[voterId] = vote;
                        broadcast({ type: 'STATE_UPDATE', payload: newState });
                        return newState;
                    });
                }
                break;
        }
    };

    const checkMyRole = (assignments: OnlineAssignment[], myId: string) => {
        const myAssignment = assignments.find(a => a.peerId === myId);
        if (myAssignment) {
            setMyRole(myAssignment.role);
        } else {
            setMyRole(null);
        }
    };

    const broadcast = (msg: NetworkMessage) => {
        connections.forEach(c => c.send(msg));
    };

    const sendToPlayer = (peerId: string, msg: NetworkMessage) => {
        const conn = connections.find(c => c.peer === peerId);
        if (conn) conn.send(msg);
    };

    // --- Game Logic (Host) ---

    const startGame = () => {
        if (!selectedScriptId) return alert('請先選擇一個劇本');
        broadcast({ type: 'GAME_START', payload: {} });
        
        // Init placeholders if not already
        if (gameState.assignments.length === 0) {
            const initialAssignments = players.map((p, idx) => ({
                player: idx + 1,
                peerId: p.peerId,
                role: { id: 'unknown', name: '未分配', characterType: 'Traveler' } as Character,
                status: 'alive',
                revealed: false,
                statusMarkers: []
            } as OnlineAssignment));

            const newState = {
                ...gameState,
                scriptId: selectedScriptId,
                assignments: initialAssignments
            };
            setGameState(newState);
            broadcast({ type: 'STATE_UPDATE', payload: newState });
        }
        
        setStep('game');
    };

    const handleRandomAssign = () => {
        if (!selectedScriptId) return;
        const script = allScripts.find(s => s.id === selectedScriptId);
        if (!script) return;

        const scriptChars = script.characterIds.map(id => allCharacters.find(c => c.id === id)).filter(Boolean) as Character[];
        
        // 1. Calculate distribution
        const playerCount = players.length; // Or active players?
        const [tCount, oCount, mCount, dCount] = getDistribution(playerCount);

        // 2. Select roles
        const townsfolk = shuffle(scriptChars.filter(c => c.characterType === 'Townsfolk')).slice(0, tCount);
        const outsiders = shuffle(scriptChars.filter(c => c.characterType === 'Outsider')).slice(0, oCount);
        const minions = shuffle(scriptChars.filter(c => c.characterType === 'Minion')).slice(0, mCount);
        const demons = shuffle(scriptChars.filter(c => c.characterType === 'Demon')).slice(0, dCount);

        const rolesInPlay = shuffle([...townsfolk, ...outsiders, ...minions, ...demons]);

        // Fill remaining with Travelers/Townsfolk if not enough (edge case)
        while (rolesInPlay.length < playerCount) {
            rolesInPlay.push(scriptChars[0]); 
        }

        // 3. Assign to players
        const newAssignments = gameState.assignments.map((a, idx) => ({
            ...a,
            role: rolesInPlay[idx] || a.role,
            status: 'alive', // Reset status on re-roll? Optional.
            statusMarkers: []
        }));

        const newState = { ...gameState, assignments: newAssignments };
        setGameState(newState);
        broadcast({ type: 'STATE_UPDATE', payload: newState });
        
        // Broadcast System Message
        const msg = { sender: 'System', text: '說書人已重新隨機分配角色。', isSystem: true };
        setChatMessages(prev => [...prev, msg]);
        broadcast({ type: 'CHAT', payload: msg });
    };

    const handleUpdatePlayer = (peerId: string, updates: Partial<OnlineAssignment>) => {
        const newState = {
            ...gameState,
            assignments: gameState.assignments.map(a => 
                (a as OnlineAssignment).peerId === peerId ? { ...a, ...updates } : a
            )
        };
        setGameState(newState);
        broadcast({ type: 'STATE_UPDATE', payload: newState });
    };

    const handleAddMarker = (peerId: string, marker: StatusMarker) => {
        const assignment = gameState.assignments.find(a => (a as OnlineAssignment).peerId === peerId);
        if (!assignment) return;
        const currentMarkers = assignment.statusMarkers || [];
        if (!currentMarkers.some(m => m.id === marker.id)) {
            handleUpdatePlayer(peerId, { statusMarkers: [...currentMarkers, marker] });
        }
    };

    const handleRemoveMarker = (peerId: string, markerId: string) => {
        const assignment = gameState.assignments.find(a => (a as OnlineAssignment).peerId === peerId);
        if (!assignment) return;
        handleUpdatePlayer(peerId, { statusMarkers: (assignment.statusMarkers || []).filter(m => m.id !== markerId) });
    };

    const handleSendPrivateInfo = () => {
        if (!privateMsgTarget || !privateMsgContent.trim()) return;
        const msg = { sender: 'Storyteller (Private)', text: privateMsgContent };
        sendToPlayer(privateMsgTarget, { type: 'PRIVATE_MSG', payload: msg });
        // Log for host
        setChatMessages(prev => [...prev, { ...msg, isPrivate: true, text: `To Player: ${privateMsgContent}` }]);
        setPrivateMsgContent('');
        setPrivateMsgTarget(null);
    };

    // --- Voting Logic (Host) ---

    const startNomination = () => {
        const newState = {
            ...gameState,
            nomination: { 
                isOpen: true, 
                nominatorId: null, 
                nomineeId: null, 
                votes: {}, 
                history: gameState.nomination.history 
            }
        };
        setGameState(newState);
        broadcast({ type: 'STATE_UPDATE', payload: newState });
    };

    const closeNomination = () => {
        // Tally votes
        const yesVotes = Object.values(gameState.nomination.votes).filter(v => v).length;
        const resultMsg = `投票結束！贊成票: ${yesVotes}`;
        
        const newState = {
            ...gameState,
            nomination: { ...gameState.nomination, isOpen: false },
        };
        // Add result to history log if needed (omitted for brevity)
        
        setGameState(newState);
        broadcast({ type: 'STATE_UPDATE', payload: newState });
        
        const msg = { sender: 'System', text: resultMsg, isSystem: true };
        setChatMessages(prev => [...prev, msg]);
        broadcast({ type: 'CHAT', payload: msg });
    };

    // --- Voting Logic (Client) ---
    
    const castVote = (vote: boolean) => {
        // Send vote to host
        const conn = connections[0]; // Client only has one connection to host
        if (conn) {
            conn.send({ type: 'VOTE', payload: { voterId: myPeerId, vote } });
        }
    };

    // --- Handlers for Connection Actions ---

    const handleCreateRoom = () => {
        // Generate a simple random ID for the room (e.g. 6 characters)
        const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
        initializePeer(newRoomId);
    };

    const handleJoinRoom = () => {
        if (!roomId) return;
        initializePeer(); // No ID means client mode, will connect using roomId state
    };

    const sendChat = () => {
        if (!chatInput.trim()) return;
        const msg: NetworkMessage = { 
            type: 'CHAT', 
            payload: { sender: playerName, text: chatInput } 
        };
        
        setChatMessages(prev => [...prev, { sender: playerName, text: chatInput }]);
        
        if (isHost) {
            broadcast(msg);
        } else {
            // Client sends to Host
            const hostConn = connections[0];
            if (hostConn) hostConn.send(msg);
        }
        
        setChatInput('');
    };

    // --- UI Renderers ---

    const renderMenu = () => (
        <div className="flex flex-col items-center justify-center h-full p-6 space-y-8 max-w-lg mx-auto">
            <h1 className="text-3xl font-serif font-bold text-celestial-gold">線上血染鐘樓</h1>
            <input type="text" value={playerName} onChange={e => setPlayerName(e.target.value)} className="w-full p-3 bg-white/5 border border-slate-600 rounded text-center" placeholder="輸入暱稱..." />
            <div className="flex gap-4 w-full">
                <button onClick={() => setStep('host-setup')} disabled={!playerName} className="flex-1 p-4 bg-townsfolk-blue rounded text-white font-bold disabled:opacity-50">建立房間 (Host)</button>
                <button onClick={() => setStep('join-setup')} disabled={!playerName} className="flex-1 p-4 bg-indigo-600 rounded text-white font-bold disabled:opacity-50">加入房間 (Join)</button>
            </div>
            {errorMsg && <p className="text-red-400">{errorMsg}</p>}
        </div>
    );

    const renderHostSetup = () => (
        <div className="flex flex-col items-center justify-center h-full p-6">
            <button onClick={() => setStep('menu')} className="mb-4 text-moonlit-stone"><ArrowLeftIcon className="w-6 h-6"/></button>
            <h2 className="text-xl font-bold mb-4">Host Setup</h2>
            <button onClick={handleCreateRoom} className="px-6 py-3 bg-townsfolk-blue text-white rounded font-bold">{statusMsg || '啟動伺服器'}</button>
        </div>
    );

    const renderJoinSetup = () => (
        <div className="flex flex-col items-center justify-center h-full p-6">
            <button onClick={() => setStep('menu')} className="mb-4 text-moonlit-stone"><ArrowLeftIcon className="w-6 h-6"/></button>
            <h2 className="text-xl font-bold mb-4">Join Room</h2>
            <input type="text" value={roomId} onChange={e => setRoomId(e.target.value)} className="w-full max-w-xs p-3 mb-4 bg-black/40 border border-slate-600 rounded text-center" placeholder="Room ID" />
            <button onClick={handleJoinRoom} disabled={!roomId} className="px-6 py-3 bg-indigo-600 text-white rounded font-bold disabled:opacity-50">{statusMsg || '連線'}</button>
        </div>
    );

    const renderLobby = () => (
        <div className="h-full flex flex-col p-6 max-w-4xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-celestial-gold">遊戲大廳</h2>
                <div className="flex gap-2">
                    <div onClick={() => navigator.clipboard.writeText(myPeerId || roomId)} className="bg-slate-800 px-3 py-1 rounded cursor-pointer flex items-center gap-2">
                        <span className="font-mono">{myPeerId || roomId}</span> <CopyIcon className="w-4 h-4"/>
                    </div>
                    <button onClick={() => { peer?.destroy(); setStep('menu'); }} className="px-3 py-1 bg-red-900/50 text-red-400 rounded">離開</button>
                </div>
            </div>
            
            <div className="bg-white/5 p-4 rounded-lg">
                <h3 className="font-bold mb-2">已加入玩家 ({players.length})</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {players.map(p => (
                        <div key={p.peerId} className="p-2 bg-slate-700 rounded flex items-center gap-2">
                            <div className="w-8 h-8 bg-slate-500 rounded-full flex items-center justify-center">{p.name[0]}</div>
                            <span>{p.name}</span>
                        </div>
                    ))}
                </div>
            </div>

            {isHost && (
                <div className="bg-white/5 p-4 rounded-lg">
                    <label className="block text-sm font-bold mb-2">選擇劇本</label>
                    <select value={selectedScriptId} onChange={e => setSelectedScriptId(e.target.value)} className="w-full p-2 bg-slate-800 rounded mb-4">
                        <option value="">-- 選擇 --</option>
                        {allScripts.map(s => <option key={s.id} value={s.id}>{s.name} ({s.characterIds.length})</option>)}
                    </select>
                    <button onClick={startGame} disabled={!selectedScriptId} className="w-full py-3 bg-green-600 text-white rounded font-bold disabled:opacity-50 flex items-center justify-center gap-2"><PlayIcon className="w-5 h-5"/> 開始遊戲</button>
                </div>
            )}
            {!isHost && <div className="text-center text-moonlit-stone animate-pulse">等待說書人開始...</div>}
        </div>
    );

    // --- GAME RENDERER ---

    const renderGame = () => {
        const script = allScripts.find(s => s.id === gameState.scriptId);
        
        // Helper to get character details
        const getChar = (id: string) => allCharacters.find(c => c.id === id);

        return (
            <div className="h-full flex flex-col md:flex-row overflow-hidden bg-slate-900">
                {/* --- LEFT: Game Area (Grimoire or Player View) --- */}
                <div className="flex-1 flex flex-col overflow-hidden relative">
                    
                    {/* Header */}
                    <div className="p-3 border-b border-slate-700 flex justify-between items-center bg-slate-800">
                        <div className="flex items-center gap-4">
                            <h2 className="font-bold text-parchment">{script?.name}</h2>
                            <span className="text-xs bg-slate-700 px-2 py-1 rounded text-moonlit-stone">Day {gameState.dayNumber} | {t(`roleAssignment.${gameState.phase}`)}</span>
                        </div>
                        {isHost && (
                            <div className="flex gap-2">
                                <button onClick={() => setIsNightSheetOpen(true)} className="p-2 bg-indigo-900/50 rounded text-indigo-300 hover:bg-indigo-900" title="夜序"><MoonIcon className="w-4 h-4"/></button>
                                <button onClick={handleRandomAssign} className="p-2 bg-townsfolk-blue/20 rounded text-townsfolk-blue hover:bg-townsfolk-blue/30" title="隨機分配"><SparklesIcon className="w-4 h-4"/></button>
                                <button onClick={() => { if(confirm('結束?')) setStep('lobby'); }} className="p-2 bg-red-900/20 rounded text-red-400 hover:bg-red-900/40" title="結束"><XMarkIcon className="w-4 h-4"/></button>
                            </div>
                        )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                        
                        {/* Voting Overlay */}
                        {gameState.nomination.isOpen && (
                            <div className="mb-6 p-4 bg-indigo-900/20 border border-indigo-500/50 rounded-xl animate-pulse">
                                <h3 className="text-lg font-bold text-center text-indigo-300 mb-2">投票進行中...</h3>
                                {!isHost ? (
                                    <div className="flex gap-4 justify-center">
                                        <button onClick={() => castVote(true)} className="px-6 py-2 bg-green-600 rounded font-bold hover:bg-green-500">是 (Yes)</button>
                                        <button onClick={() => castVote(false)} className="px-6 py-2 bg-red-600 rounded font-bold hover:bg-red-500">否 (No)</button>
                                    </div>
                                ) : (
                                    <div className="text-center">
                                        <p className="text-2xl font-bold">{Object.values(gameState.nomination.votes).filter(v => v).length} 票</p>
                                        <button onClick={closeNomination} className="mt-2 px-4 py-1 bg-slate-700 rounded text-sm hover:bg-slate-600">結束投票</button>
                                    </div>
                                )}
                            </div>
                        )}

                        {isHost ? (
                            // --- Host Grimoire View ---
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                {gameState.assignments.map((assignment: any) => { // Cast to any to access OnlineAssignment props easily
                                    const playerInfo = players.find(p => p.peerId === assignment.peerId);
                                    const char = getChar(assignment.role.id);
                                    const isDead = assignment.status === 'dead';
                                    
                                    return (
                                        <div 
                                            key={assignment.peerId} 
                                            onClick={() => setEditingPlayerPeerId(assignment.peerId)}
                                            className={`relative p-3 rounded-xl border-2 cursor-pointer transition-all hover:scale-105 group ${isDead ? 'bg-slate-800 border-slate-700 grayscale-[0.8]' : 'bg-slate-700/50 border-slate-600 hover:border-townsfolk-blue'}`}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="text-xs font-mono font-bold text-slate-400">#{assignment.player}</span>
                                                {assignment.statusMarkers.length > 0 && <span className="w-2 h-2 rounded-full bg-yellow-500"></span>}
                                            </div>
                                            <div className="flex flex-col items-center text-center">
                                                <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-500 flex items-center justify-center mb-2 overflow-hidden">
                                                    {char?.iconUrl ? <img src={char.iconUrl} className="w-full h-full object-cover"/> : <span className="font-bold">{char?.name[0]}</span>}
                                                </div>
                                                <div className="text-sm font-bold text-parchment truncate w-full">{playerInfo?.name}</div>
                                                <div className="text-xs text-townsfolk-blue truncate w-full">{char?.name}</div>
                                            </div>
                                            {/* Quick Actions Overlay */}
                                            <div className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <PencilIcon className="w-6 h-6 text-white"/>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            // --- Client Player View ---
                            <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-6">
                                <div 
                                    onClick={() => setIsRoleRevealed(!isRoleRevealed)}
                                    className="relative w-64 h-96 perspective-1000 cursor-pointer group"
                                >
                                    <div className={`relative w-full h-full transition-all duration-500 transform-style-3d ${isRoleRevealed ? 'rotate-y-180' : ''}`}>
                                        <div className="absolute inset-0 backface-hidden bg-slate-800 border-4 border-slate-600 rounded-2xl flex flex-col items-center justify-center shadow-2xl group-hover:border-townsfolk-blue">
                                            <EyeIcon className="w-16 h-16 text-slate-500 mb-4"/>
                                            <p className="font-bold text-slate-500 uppercase tracking-widest">點擊查看身分</p>
                                        </div>
                                        <div className="absolute inset-0 backface-hidden rotate-y-180 bg-white rounded-2xl border-4 border-celestial-gold flex flex-col items-center justify-center p-6 text-center shadow-2xl">
                                            {myRole ? (
                                                <>
                                                    <div className="w-24 h-24 bg-slate-200 rounded-full mb-4 overflow-hidden">
                                                        {myRole.iconUrl ? <img src={myRole.iconUrl} className="w-full h-full object-cover"/> : <span className="text-4xl flex items-center justify-center h-full text-black">{myRole.name[0]}</span>}
                                                    </div>
                                                    <h3 className="text-2xl font-black text-black mb-1">{myRole.name}</h3>
                                                    <p className="text-xs font-bold text-slate-500 uppercase mb-3">{t(`characterType.${myRole.characterType}`)}</p>
                                                    <p className="text-xs text-slate-800 leading-relaxed overflow-y-auto">{myRole.ability}</p>
                                                </>
                                            ) : <div className="text-black">等待分配...</div>}
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 max-w-sm w-full">
                                    <h4 className="text-sm font-bold text-moonlit-stone mb-2 uppercase">狀態</h4>
                                    <div className="flex gap-2">
                                        <span className="px-2 py-1 bg-green-900/30 text-green-400 border border-green-800 rounded text-xs">存活</span>
                                        <span className="px-2 py-1 bg-indigo-900/30 text-indigo-400 border border-indigo-800 rounded text-xs">有票</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* --- RIGHT: Chat & Info --- */}
                <div className="w-full md:w-80 bg-black/40 border-l border-slate-700 flex flex-col">
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {chatMessages.map((msg, i) => (
                            <div key={i} className={`p-2 rounded text-sm ${msg.isPrivate ? 'bg-purple-900/30 border border-purple-700' : msg.isSystem ? 'bg-yellow-900/20 text-yellow-200' : 'bg-slate-800'}`}>
                                <span className={`font-bold mr-1 ${msg.sender === playerName ? 'text-townsfolk-blue' : 'text-slate-400'}`}>{msg.sender}:</span>
                                {msg.text}
                            </div>
                        ))}
                    </div>
                    <div className="p-2 border-t border-slate-700 flex gap-2">
                        <input 
                            className="flex-1 bg-slate-800 rounded border border-slate-600 px-2 py-1 text-sm text-white" 
                            value={chatInput} 
                            onChange={e => setChatInput(e.target.value)} 
                            onKeyDown={e => e.key === 'Enter' && sendChat()}
                            placeholder="輸入訊息..." 
                        />
                        <button onClick={sendChat} className="p-2 bg-townsfolk-blue rounded text-white"><ArrowLeftIcon className="w-4 h-4 rotate-180"/></button>
                    </div>
                </div>

                {/* --- MODALS --- */}
                
                {/* Host: Edit Player Modal */}
                {editingPlayerPeerId && (
                    <Modal isOpen={!!editingPlayerPeerId} onClose={() => { setEditingPlayerPeerId(null); setPrivateMsgTarget(null); }} title="魔典操作">
                        {(() => {
                            const assignment = gameState.assignments.find(a => (a as OnlineAssignment).peerId === editingPlayerPeerId) as OnlineAssignment;
                            const char = getChar(assignment?.role.id || '');
                            if (!assignment) return null;

                            return (
                                <div className="space-y-6">
                                    <div className="flex items-center gap-4 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
                                        <div className="w-16 h-16 bg-slate-500 rounded-full flex items-center justify-center text-2xl font-bold text-white overflow-hidden">
                                            {char?.iconUrl ? <img src={char.iconUrl} className="w-full h-full object-cover"/> : char?.name[0]}
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold">{players.find(p=>p.peerId===assignment.peerId)?.name}</h3>
                                            <p className="text-townsfolk-blue">{char?.name}</p>
                                        </div>
                                    </div>

                                    {/* Change Role */}
                                    <div>
                                        <label className="text-xs font-bold text-moonlit-stone block mb-2">變更角色</label>
                                        <select 
                                            value={assignment.role.id}
                                            onChange={(e) => {
                                                const newRole = allCharacters.find(c => c.id === e.target.value);
                                                if (newRole) handleUpdatePlayer(assignment.peerId, { role: newRole });
                                            }}
                                            className="w-full p-2 rounded border bg-white dark:bg-black"
                                        >
                                            {script?.characterIds.map(id => {
                                                const c = allCharacters.find(ch => ch.id === id);
                                                return c ? <option key={id} value={id}>{c.name}</option> : null;
                                            })}
                                        </select>
                                    </div>

                                    {/* Status & Markers */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <button 
                                            onClick={() => handleUpdatePlayer(assignment.peerId, { status: assignment.status === 'alive' ? 'dead' : 'alive' })}
                                            className={`p-3 rounded font-bold ${assignment.status === 'alive' ? 'bg-green-600 text-white' : 'bg-slate-600 text-slate-300'}`}
                                        >
                                            {assignment.status === 'alive' ? '存活 (點擊賜死)' : '死亡 (點擊復活)'}
                                        </button>
                                        
                                        <div className="flex flex-wrap gap-2">
                                            {[
                                                { id: 'poisoned', text: '中毒', icon: '🤢', color: 'text-green-700 bg-green-100' },
                                                { id: 'drunk', text: '酒醉', icon: '🍺', color: 'text-amber-600 bg-amber-100' },
                                                { id: 'ghostVote', text: '死票', icon: '👻', color: 'text-indigo-600 bg-indigo-100' }
                                            ].map(m => (
                                                <button 
                                                    key={m.id} 
                                                    onClick={() => assignment.statusMarkers.some(sm => sm.id === m.id) ? handleRemoveMarker(assignment.peerId, m.id) : handleAddMarker(assignment.peerId, m)}
                                                    className={`px-2 py-1 rounded text-xs border ${assignment.statusMarkers.some(sm => sm.id === m.id) ? 'border-townsfolk-blue bg-blue-50' : 'border-slate-300'}`}
                                                >
                                                    {m.icon} {m.text}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Private Message */}
                                    <div className="border-t pt-4 border-slate-700">
                                        <label className="text-xs font-bold text-moonlit-stone block mb-2">發送私訊 / 資訊</label>
                                        <div className="flex gap-2">
                                            <input 
                                                type="text" 
                                                value={privateMsgContent} 
                                                onChange={e => { setPrivateMsgContent(e.target.value); setPrivateMsgTarget(assignment.peerId); }} 
                                                placeholder="輸入給該玩家的資訊..."
                                                className="flex-1 p-2 rounded border bg-white dark:bg-black"
                                            />
                                            <button onClick={handleSendPrivateInfo} className="px-4 bg-purple-600 text-white rounded hover:bg-purple-700">發送</button>
                                        </div>
                                    </div>
                                    
                                    {/* Voting & Kick */}
                                    <div className="flex justify-between border-t pt-4 border-slate-700">
                                        <button onClick={() => {
                                            const newState = { ...gameState, nomination: { ...gameState.nomination, isOpen: true, nominatorId: myPeerId, nomineeId: assignment.peerId } };
                                            setGameState(newState);
                                            broadcast({ type: 'STATE_UPDATE', payload: newState });
                                            setEditingPlayerPeerId(null);
                                        }} className="text-townsfolk-blue text-sm flex items-center gap-1"><HandRaisedIcon className="w-4 h-4"/> 發起提名</button>
                                        
                                        <button className="text-red-500 text-sm flex items-center gap-1"><TrashIcon className="w-4 h-4"/> 踢出房間</button>
                                    </div>
                                </div>
                            );
                        })()}
                    </Modal>
                )}

                {/* Host: Night Order Sheet */}
                {isNightSheetOpen && isHost && (
                    <div className="fixed right-0 top-0 bottom-0 w-80 bg-slate-900 border-l border-slate-700 shadow-2xl p-4 overflow-y-auto z-50 animate-fade-in-right">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-parchment flex items-center gap-2"><MoonIcon className="w-5 h-5"/> 夜晚行動順序</h3>
                            <button onClick={() => setIsNightSheetOpen(false)}><XMarkIcon className="w-5 h-5 text-slate-400"/></button>
                        </div>
                        
                        {script && (
                            <div className="space-y-6">
                                <div>
                                    <h4 className="text-xs font-bold text-celestial-gold uppercase mb-2">首夜 (First Night)</h4>
                                    <ul className="space-y-2">
                                        {script.firstNightOrder?.filter(item => {
                                            // Filter only in-play characters
                                            const inPlayIds = gameState.assignments.map(a => a.role.id);
                                            return item.characterId.startsWith('predefined:') || inPlayIds.includes(item.characterId);
                                        }).map(item => (
                                            <li key={item.id} className="text-sm text-slate-300 border-b border-slate-800 pb-1">
                                                {item.customText}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-indigo-400 uppercase mb-2">其他夜晚 (Other Nights)</h4>
                                    <ul className="space-y-2">
                                        {script.otherNightsOrder?.filter(item => {
                                            const inPlayIds = gameState.assignments.map(a => a.role.id);
                                            return item.characterId.startsWith('predefined:') || inPlayIds.includes(item.characterId);
                                        }).map(item => (
                                            <li key={item.id} className="text-sm text-slate-300 border-b border-slate-800 pb-1">
                                                {item.customText}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    // --- Main Render Switch ---
    return (
        <div className="h-full w-full bg-slate-900 text-parchment overflow-hidden">
            {step === 'menu' && renderMenu()}
            {step === 'host-setup' && renderHostSetup()}
            {step === 'join-setup' && renderJoinSetup()}
            {step === 'lobby' && renderLobby()}
            {step === 'game' && renderGame()}
        </div>
    );
};
