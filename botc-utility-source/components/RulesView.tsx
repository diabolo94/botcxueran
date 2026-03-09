
import React, { useState, useMemo, useRef } from 'react';
import { RuleDocument, RuleDocType } from '../types';
import { RuleEditor } from './RuleEditor';
import { Modal } from './Modal';
import { PencilIcon, TrashIcon, PlusIcon, Bars3Icon, XMarkIcon, ArrowDownTrayIcon, FolderOpenIcon, ArrowUpTrayIcon, SearchIcon, ArrowsRightLeftIcon, CheckCircleIcon, FolderArrowDownIcon } from './Icons';
import JSZip from 'jszip';

interface RulesSidebarProps {
    documents: RuleDocument[];
    onSelect: (id: string) => void;
    onAdd: (parentId: string | null, type: RuleDocType) => void;
    onDelete: (id: string, name: string) => void;
    onRename: (id: string) => void;
    onToggleFolder: (id: string) => void;
    onToggleSelection: (id: string, isSelected: boolean) => void;
    onMoveRequest: (id: string) => void;
    selectedDocIds: Set<string>;
    activeDocId: string | null;
    isReadOnly: boolean;
    t: (key: string, options?: { [key: string]: string | number }) => string;
    searchTerm: string;
}

const FolderIcon: React.FC<{isOpen?: boolean} & React.SVGProps<SVGSVGElement>> = ({isOpen, ...props}) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    {isOpen 
        ? <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.75h16.5m-16.5 0A2.25 2.25 0 015.25 7.5h13.5a2.25 2.25 0 012.25 2.25m-16.5 0v6.75a2.25 2.25 0 002.25 2.25h13.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003.75 9.75z" />
        : <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
    }
  </svg>
);

const DocumentIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
  </svg>
);


const RulesSidebar: React.FC<RulesSidebarProps> = ({ documents, onSelect, onAdd, onDelete, onRename, onToggleFolder, onToggleSelection, onMoveRequest, selectedDocIds, activeDocId, isReadOnly, t, searchTerm }) => {
    
    // Flattened search result renderer
    const renderSearchResults = () => {
        const matches = documents.filter(doc => doc.name.toLowerCase().includes(searchTerm.toLowerCase()));
        
        if (matches.length === 0) {
            return <p className="text-xs text-moonlit-stone p-2 text-center">No results found.</p>;
        }

        return matches.map(item => (
            <div
                key={item.id}
                className={`group flex items-center justify-between w-full text-left px-2 py-1.5 rounded-md hover:bg-slate-gray/50 ${activeDocId === item.id ? 'bg-slate-gray' : ''}`}
            >
                <div className="flex items-center truncate flex-1 gap-2">
                    {!isReadOnly && (
                        <input 
                            type="checkbox" 
                            checked={selectedDocIds.has(item.id)}
                            onChange={(e) => onToggleSelection(item.id, e.target.checked)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-4 h-4 rounded border-slate-gray text-townsfolk-blue focus:ring-townsfolk-blue cursor-pointer flex-shrink-0"
                        />
                    )}
                    <div className="flex items-center truncate flex-1" onClick={() => item.type === 'document' ? onSelect(item.id) : null}>
                        {item.type === 'folder' && <FolderIcon className="w-5 h-5 mr-1 text-moonlit-stone" />}
                        {item.type === 'document' && <DocumentIcon className="w-5 h-5 mr-1 text-moonlit-stone"/>}
                        <div className="truncate flex-1">
                            <span>{item.name}</span>
                            <span className="text-[10px] text-slate-500 block">
                                {item.parentId ? 'In Folder' : 'Root'}
                            </span>
                        </div>
                    </div>
                </div>
                {!isReadOnly && (
                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 gap-1">
                        <button onClick={() => onMoveRequest(item.id)} className="p-1 text-moonlit-stone hover:text-parchment" title="Move"><FolderArrowDownIcon className="w-4 h-4"/></button>
                        <button onClick={() => onRename(item.id)} className="p-1 text-moonlit-stone hover:text-parchment" title={t('rules.renameTitle')}><PencilIcon className="w-4 h-4"/></button>
                        <button onClick={() => onDelete(item.id, item.name)} className="p-1 text-moonlit-stone hover:text-demon-fire" title={t('header.deleteSelected', {count: 1})}><TrashIcon className="w-4 h-4"/></button>
                    </div>
                )}
            </div>
        ));
    };

    // Recursive Tree Renderer
    const renderTree = (parentId: string | null, level: number) => {
        const items = documents.filter(doc => doc.parentId === parentId);
        
        return items.map(item => (
            <div key={item.id}>
                <div
                    className={`group flex items-center justify-between w-full text-left px-2 py-1.5 rounded-md hover:bg-slate-gray/50 ${activeDocId === item.id ? 'bg-slate-gray' : ''}`}
                >
                    <div className="flex items-center truncate flex-1 gap-2" style={{ paddingLeft: `${level * 1.25}rem` }}>
                        {!isReadOnly && (
                            <input 
                                type="checkbox" 
                                checked={selectedDocIds.has(item.id)}
                                onChange={(e) => onToggleSelection(item.id, e.target.checked)}
                                onClick={(e) => e.stopPropagation()}
                                className="w-4 h-4 rounded border-slate-gray text-townsfolk-blue focus:ring-townsfolk-blue cursor-pointer flex-shrink-0"
                            />
                        )}
                        <div className="flex items-center truncate flex-1">
                            {item.type === 'folder' && (
                            <button onClick={(e) => { e.stopPropagation(); onToggleFolder(item.id); }} className="mr-1 text-moonlit-stone">
                                <FolderIcon isOpen={item.isOpen} className="w-5 h-5" />
                            </button>
                            )}
                            {item.type === 'document' && <DocumentIcon className="w-5 h-5 mr-1 text-moonlit-stone"/>}
                            <span onClick={() => item.type === 'document' ? onSelect(item.id) : onToggleFolder(item.id)} className="truncate cursor-pointer flex-1">{item.name}</span>
                        </div>
                    </div>

                    {!isReadOnly && (
                        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 gap-1">
                            {item.type === 'folder' && (
                                <button onClick={() => onAdd(item.id, 'document')} className="p-1 text-moonlit-stone hover:text-parchment" title={t('rules.addDocument')}><PlusIcon className="w-4 h-4"/></button>
                            )}
                            <button onClick={() => onMoveRequest(item.id)} className="p-1 text-moonlit-stone hover:text-parchment" title="Move"><FolderArrowDownIcon className="w-4 h-4"/></button>
                            <button onClick={() => onRename(item.id)} className="p-1 text-moonlit-stone hover:text-parchment" title={t('rules.renameTitle')}><PencilIcon className="w-4 h-4"/></button>
                            <button onClick={() => onDelete(item.id, item.name)} className="p-1 text-moonlit-stone hover:text-demon-fire" title={t('header.deleteSelected', {count: 1})}><TrashIcon className="w-4 h-4"/></button>
                        </div>
                    )}
                </div>
                {item.type === 'folder' && item.isOpen && renderTree(item.id, level + 1)}
            </div>
        ));
    };

    return (
        <aside className="w-full md:w-80 bg-parchment-white dark:bg-midnight-ink h-full flex-shrink-0 flex flex-col border-r border-stone-border dark:border-slate-gray p-2">
            {!isReadOnly && (
                <div className="flex items-center gap-2 p-2 mb-2 border-b border-slate-gray">
                    <button onClick={() => onAdd(null, 'document')} className="flex-1 text-sm px-2 py-1.5 rounded-md bg-slate-gray text-parchment hover:bg-townsfolk-blue transition-colors text-center">{t('rules.addDocument')}</button>
                    <button onClick={() => onAdd(null, 'folder')} className="flex-1 text-sm px-2 py-1.5 rounded-md bg-slate-gray text-parchment hover:bg-townsfolk-blue transition-colors text-center">{t('rules.addFolder')}</button>
                </div>
            )}
            <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar pb-24">
                {searchTerm ? renderSearchResults() : renderTree(null, 0)}
            </div>
        </aside>
    );
};


const RuleViewer: React.FC<{document: RuleDocument | undefined, t: (key: string) => string}> = ({ document, t }) => {
    if (!document) {
        return (
            <div className="flex items-center justify-center h-full text-moonlit-stone p-4">
                <p>{t('rules.noDocumentSelected')}</p>
            </div>
        );
    }

    return (
        <div className="prose prose-sm sm:prose-base lg:prose-lg dark:prose-invert max-w-none p-4 md:p-12 mx-auto">
             {/* Using dangerouslySetInnerHTML is safe here because the content is user-generated and stored locally, not from an untrusted external source. */}
            <div dangerouslySetInnerHTML={{ __html: document.content || '' }} />
        </div>
    );
};


interface RulesViewProps {
  documents: RuleDocument[];
  isReadOnly: boolean;
  editingDocId: string | null;
  setEditingDocId: (id: string | null) => void;
  onSave: (docId: string, name: string, content: string) => void;
  onAdd: (parentId: string | null, type: RuleDocType) => void;
  onDelete: (id: string) => void;
  onBulkDelete: (ids: string[]) => void;
  onRename: (id: string) => void;
  onToggleFolder: (id: string) => void;
  onImport: (rules: RuleDocument[]) => void;
  onMoveRequest: (id: string, newParentId: string | null) => void;
  t: (key: string, options?: { [key: string]: string | number }) => string;
}

export const RulesView: React.FC<RulesViewProps> = ({ documents, isReadOnly, onSave, onAdd, onDelete, onBulkDelete, onRename, onToggleFolder, onImport, onMoveRequest, t, editingDocId, setEditingDocId }) => {
    const [activeDocId, setActiveDocId] = useState<string | null>(null);
    const [isSidebarVisible, setSidebarVisible] = useState(false);
    const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Move Modal State
    const [moveModalOpen, setMoveModalOpen] = useState(false);
    const [itemToMoveId, setItemToMoveId] = useState<string | null>(null);
    const [targetFolderId, setTargetFolderId] = useState<string | null>(null);

    const activeDocument = useMemo(() => documents.find(d => d.id === (editingDocId || activeDocId)), [documents, activeDocId, editingDocId]);
    const editingDocument = useMemo(() => documents.find(d => d.id === editingDocId), [documents, editingDocId]);

    const handleSelectDocument = (id: string) => {
        setActiveDocId(id);
        if (!isReadOnly) {
            setEditingDocId(id);
        }
        setSidebarVisible(false); // Hide sidebar on selection on mobile
    };

    const handleDelete = (id: string, name: string) => {
        if (window.confirm(t('rules.confirmDelete', { name }))) {
            onDelete(id);
            if (activeDocId === id) setActiveDocId(null);
            if (editingDocId === id) setEditingDocId(null);
        }
    };
    
    const handleEditorSave = (name: string, content: string) => {
        if(editingDocId) {
            onSave(editingDocId, name, content);
            setActiveDocId(editingDocId); // Make sure the saved doc is active
            // Do not close the editor here. This allows auto-save to work without interrupting the user.
        }
    };

    // --- Bulk Selection Logic ---

    // Get visible documents based on search term or all documents if no search
    const visibleDocuments = useMemo(() => {
        if (!searchTerm) return documents;
        return documents.filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [documents, searchTerm]);

    // Get all descendant IDs (including the item itself)
    const getAllDescendantIds = (rootId: string): string[] => {
        const result: string[] = [rootId];
        const children = documents.filter(d => d.parentId === rootId);
        children.forEach(child => {
            result.push(...getAllDescendantIds(child.id));
        });
        return result;
    };

    const handleToggleSelection = (id: string, isSelected: boolean) => {
        let idsToToggle = [id];
        if (!searchTerm) {
             idsToToggle = getAllDescendantIds(id);
        }

        const newSet = new Set(selectedDocIds);
        idsToToggle.forEach(childId => {
            if (isSelected) {
                newSet.add(childId);
            } else {
                newSet.delete(childId);
            }
        });
        setSelectedDocIds(newSet);
    };

    const handleSelectAll = () => {
        const newSet = new Set(selectedDocIds);
        visibleDocuments.forEach(d => newSet.add(d.id));
        setSelectedDocIds(newSet);
    };

    const handleUnselectAll = () => {
        setSelectedDocIds(new Set());
    };

    const handleInverseSelection = () => {
        const newSet = new Set(selectedDocIds);
        visibleDocuments.forEach(d => {
            if (newSet.has(d.id)) {
                newSet.delete(d.id);
            } else {
                newSet.add(d.id);
            }
        });
        setSelectedDocIds(newSet);
    }

    const handleBulkDeleteAction = () => {
        if (selectedDocIds.size === 0) return;
        if (window.confirm(t('rules.deleteSelectedConfirm', { count: selectedDocIds.size }))) {
            onBulkDelete(Array.from(selectedDocIds));
            setSelectedDocIds(new Set());
            // Clear active if deleted
            if (activeDocId && selectedDocIds.has(activeDocId)) setActiveDocId(null);
            if (editingDocId && selectedDocIds.has(editingDocId)) setEditingDocId(null);
        }
    }

    // --- Move Item Logic ---
    const handleMoveRequest = (id: string) => {
        setItemToMoveId(id);
        const item = documents.find(d => d.id === id);
        setTargetFolderId(item?.parentId || null); // Default to current parent
        setMoveModalOpen(true);
    };

    const handleMoveConfirm = () => {
        if (itemToMoveId) {
            // Check for circular dependency if moving a folder into its own child
            if (targetFolderId) {
                const descendants = getAllDescendantIds(itemToMoveId);
                if (descendants.includes(targetFolderId)) {
                    alert("Cannot move a folder into its own sub-folder.");
                    return;
                }
            }
            onMoveRequest(itemToMoveId, targetFolderId);
        }
        setMoveModalOpen(false);
    };

    // --- Export / Import Logic ---

    const handleExportJSON = () => {
        if (selectedDocIds.size === 0) return;
        const docsToExport = documents.filter(d => selectedDocIds.has(d.id));
        
        const data = {
            rulesDocs: docsToExport,
            exportType: 'bulk_rules',
            timestamp: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `rules_backup_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleExportZIP = async () => {
        if (selectedDocIds.size === 0) return;
        const docsToExport = documents.filter(d => selectedDocIds.has(d.id));
        const zip = new JSZip();

        // Helper to reconstruct folder path with sanitized names
        const getPath = (doc: RuleDocument): string => {
            const safeName = doc.name.replace(/[^a-z0-9_\-\u4e00-\u9fa5]/gi, '_');
            if (!doc.parentId) return safeName;
            const parent = documents.find(d => d.id === doc.parentId);
            return parent ? `${getPath(parent)}/${safeName}` : safeName;
        };

        docsToExport.forEach(doc => {
            const path = getPath(doc);
            if (doc.type === 'folder') {
                zip.folder(path);
            } else {
                const fullPath = path + '.html';
                
                const htmlContent = `
                    <!DOCTYPE html>
                    <html>
                    <head><meta charset="utf-8"><title>${doc.name}</title></head>
                    <body>
                        <h1>${doc.name}</h1>
                        ${doc.content}
                    </body>
                    </html>
                `;
                zip.file(fullPath, htmlContent);
            }
        });

        try {
            const content = await zip.generateAsync({ 
                type: "blob",
                compression: "DEFLATE",
                compressionOptions: {
                    level: 6
                }
            });
            const url = URL.createObjectURL(content);
            const link = document.createElement('a');
            link.href = url;
            link.download = `rules_export_${new Date().toISOString().slice(0, 10)}.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Failed to zip files:", error);
            alert("Failed to create zip archive.");
        }
    };

    const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = JSON.parse(e.target?.result as string);
                let importedRules: RuleDocument[] = [];

                if (Array.isArray(json)) {
                    importedRules = json;
                } else if (json.rulesDocs && Array.isArray(json.rulesDocs)) {
                    importedRules = json.rulesDocs;
                }

                // Filter valid rule objects
                importedRules = importedRules.filter(r => r.id && r.name && r.type);

                if (importedRules.length > 0) {
                    onImport(importedRules);
                    alert(t('alert.importSuccess'));
                } else {
                    alert("No valid rule documents found.");
                }
            } catch (err) {
                console.error("Import failed:", err);
                alert(t('alert.importFailed'));
            }
            if (fileInputRef.current) fileInputRef.current.value = '';
        };
        reader.readAsText(file);
    };
    
    if (editingDocument && !isReadOnly) {
        return (
            <RuleEditor
                key={editingDocument.id} // Force re-mount when switching documents
                ruleDoc={editingDocument}
                allDocuments={documents} // Pass all docs for breadcrumbs
                onSave={handleEditorSave}
                onClose={() => setEditingDocId(null)}
                t={t}
            />
        );
    }

    return (
        <div className="flex flex-col md:flex-row h-full relative">
            <div className="md:hidden p-2 border-b border-stone-border dark:border-slate-gray">
                <button onClick={() => setSidebarVisible(!isSidebarVisible)} className="flex items-center gap-2 px-3 py-2 rounded-md bg-slate-gray text-sm w-full justify-center">
                    {isSidebarVisible ? <XMarkIcon className="w-5 h-5"/> : <Bars3Icon className="w-5 h-5"/>}
                    {t('sidebar.rules')}
                </button>
            </div>

            <div className={`
                ${isSidebarVisible ? 'block' : 'hidden'} md:block 
                w-full md:w-80 flex-shrink-0 h-full md:h-auto
                flex flex-col
            `}>
                {!isReadOnly && (
                    <div className="flex flex-col gap-2 p-2 bg-stone-border/20 dark:bg-slate-gray/20 border-b border-stone-border dark:border-slate-gray">
                        <div className="relative">
                            <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-moonlit-stone pointer-events-none"/>
                            <input 
                                type="text"
                                placeholder={t('rules.searchPlaceholder')}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-parchment-white dark:bg-midnight-ink border border-stone-border dark:border-slate-gray rounded-md py-1.5 pl-8 pr-2 text-sm text-ink-text dark:text-parchment focus:ring-townsfolk-blue focus:border-townsfolk-blue"
                            />
                        </div>

                        <div className="flex flex-wrap items-center gap-1">
                            <button onClick={handleSelectAll} className="p-1.5 rounded bg-slate-gray text-parchment hover:bg-slate-600 transition-colors shadow-sm" title={t('bulk.selectAll')}>
                                <CheckCircleIcon className="w-4 h-4"/>
                            </button>
                            <button onClick={handleUnselectAll} className="p-1.5 rounded bg-slate-gray text-parchment hover:bg-slate-600 transition-colors shadow-sm" title={t('bulk.unselectAll')}>
                                <XMarkIcon className="w-4 h-4"/>
                            </button>
                            <button onClick={handleInverseSelection} className="p-1.5 rounded bg-slate-gray text-parchment hover:bg-slate-600 transition-colors shadow-sm" title={t('bulk.invert')}>
                                <ArrowsRightLeftIcon className="w-4 h-4"/>
                            </button>
                            
                            <div className="flex gap-1 ml-auto">
                                <button 
                                    onClick={handleBulkDeleteAction} 
                                    disabled={selectedDocIds.size === 0} 
                                    className="p-1 rounded bg-slate-gray text-demon-fire hover:bg-slate-600 disabled:opacity-50"
                                    title={t('header.delete')}
                                >
                                    <TrashIcon className="w-4 h-4"/>
                                </button>
                                <button 
                                    onClick={handleExportJSON} 
                                    disabled={selectedDocIds.size === 0} 
                                    className="p-1 rounded bg-slate-gray text-townsfolk-blue hover:bg-slate-600 disabled:opacity-50"
                                    title={t('rules.exportJSON')}
                                >
                                    <ArrowDownTrayIcon className="w-4 h-4"/>
                                </button>
                                <button 
                                    onClick={handleExportZIP} 
                                    disabled={selectedDocIds.size === 0} 
                                    className="p-1 rounded bg-slate-gray text-celestial-gold hover:bg-slate-600 disabled:opacity-50"
                                    title={t('rules.exportZIP')}
                                >
                                    <FolderOpenIcon className="w-4 h-4"/>
                                </button>
                                <button 
                                    onClick={() => fileInputRef.current?.click()} 
                                    className="p-1 rounded bg-slate-gray text-demon-fire hover:bg-slate-600"
                                    title={t('rules.importRules')}
                                >
                                    <ArrowUpTrayIcon className="w-4 h-4"/>
                                </button>
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    className="hidden" 
                                    accept=".json" 
                                    onChange={handleImportFile}
                                />
                            </div>
                        </div>
                    </div>
                )}

                <RulesSidebar
                    documents={documents}
                    onSelect={handleSelectDocument}
                    onAdd={onAdd}
                    onDelete={handleDelete}
                    onRename={onRename}
                    onToggleFolder={onToggleFolder}
                    onToggleSelection={handleToggleSelection}
                    onMoveRequest={handleMoveRequest}
                    selectedDocIds={selectedDocIds}
                    activeDocId={activeDocId}
                    isReadOnly={isReadOnly}
                    t={t}
                    searchTerm={searchTerm}
                />
            </div>

            <main className={`flex-1 bg-daylight-bg dark:bg-ravens-night overflow-y-auto custom-scrollbar pb-24 ${isSidebarVisible ? 'hidden' : 'block'} md:block`}>
                {isReadOnly && <RuleViewer document={activeDocument} t={t} />}
                 {!isReadOnly && !editingDocId && (
                    <div className="flex items-center justify-center h-full text-moonlit-stone text-center p-4">
                        <div>
                            <p>{t('rules.noDocumentSelected')}</p>
                            <button 
                                onClick={() => onAdd(null, 'document')} 
                                className="mt-4 px-4 py-2 flex items-center gap-2 mx-auto rounded-md bg-townsfolk-blue text-white hover:bg-opacity-80 transition-colors text-sm">
                                <PlusIcon className="w-4 h-4"/> {t('rules.addDocument')}
                            </button>
                        </div>
                    </div>
                 )}
            </main>

            <Modal isOpen={moveModalOpen} onClose={() => setMoveModalOpen(false)} title="Move Item">
                <div className="space-y-4">
                    <p className="text-sm text-moonlit-stone">Select a new parent folder:</p>
                    <div className="max-h-60 overflow-y-auto border border-stone-border dark:border-slate-gray rounded p-2">
                        <label className="flex items-center gap-2 p-1 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                            <input 
                                type="radio" 
                                name="targetFolder" 
                                checked={targetFolderId === null} 
                                onChange={() => setTargetFolderId(null)}
                            />
                            <span className="text-sm font-bold">Root (Top Level)</span>
                        </label>
                        {documents.filter(d => d.type === 'folder' && d.id !== itemToMoveId).map(folder => (
                            <label key={folder.id} className="flex items-center gap-2 p-1 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer ml-4">
                                <input 
                                    type="radio" 
                                    name="targetFolder" 
                                    checked={targetFolderId === folder.id} 
                                    onChange={() => setTargetFolderId(folder.id)}
                                />
                                <FolderIcon className="w-4 h-4 text-moonlit-stone"/>
                                <span className="text-sm">{folder.name}</span>
                            </label>
                        ))}
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button onClick={() => setMoveModalOpen(false)} className="px-4 py-2 rounded bg-slate-200 dark:bg-slate-700 text-sm">Cancel</button>
                        <button 
                            onClick={handleMoveConfirm} 
                            className="px-4 py-2 rounded bg-townsfolk-blue text-white text-sm"
                        >
                            Move
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
