
import React, { useState, useRef, useEffect } from 'react';
import { ListBulletIcon, ListNumberIcon, LinkIcon } from './Icons';

export const RichTextEditor: React.FC<{ value: string; onChange: (value: string) => void; placeholder?: string; minHeight?: string }> = ({ value, onChange, placeholder, minHeight = "8rem" }) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const [isFocused, setIsFocused] = useState(false);

    // Sync external value changes to innerHTML only when not focused (to prevent cursor jumping) or empty
    useEffect(() => {
        if (editorRef.current && (document.activeElement !== editorRef.current || editorRef.current.innerHTML !== value)) {
            // Only update if the content is actually different to avoid cursor reset issues
            if (editorRef.current.innerHTML !== value) {
                editorRef.current.innerHTML = value;
            }
        }
    }, [value]);

    const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
        onChange(e.currentTarget.innerHTML);
    };

    const execCmd = (command: string, value: string | undefined = undefined) => {
        document.execCommand(command, false, value);
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
            editorRef.current.focus();
        }
    };

    const handleCreateLink = () => {
        const url = prompt("Enter URL:");
        if (url) {
            execCmd('createLink', url);
        }
    };

    const ToolbarButton: React.FC<{ onClick: () => void; label?: string; icon?: React.ReactNode; active?: boolean; title?: string }> = ({ onClick, label, icon, active, title }) => (
        <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); onClick(); }} // onMouseDown prevents focus loss from editor
            className={`p-1.5 rounded text-xs font-bold transition-colors border ${active ? 'bg-townsfolk-blue text-white border-townsfolk-blue' : 'bg-transparent border-transparent text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 dark:text-moonlit-stone'}`}
            title={title}
        >
            {icon || label}
        </button>
    );

    return (
        <div className={`bg-parchment-white dark:bg-ravens-night border rounded-md transition-all duration-150 overflow-hidden ${isFocused ? 'border-townsfolk-blue ring-1 ring-townsfolk-blue' : 'border-stone-border dark:border-slate-gray'}`}>
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-1 p-1.5 border-b border-stone-border dark:border-slate-gray bg-slate-50 dark:bg-slate-800/50">
                <ToolbarButton onClick={() => execCmd('formatBlock', 'H1')} label="H1" title="Heading 1" />
                <ToolbarButton onClick={() => execCmd('formatBlock', 'H2')} label="H2" title="Heading 2" />
                <ToolbarButton onClick={() => execCmd('formatBlock', 'H3')} label="H3" title="Heading 3" />
                <div className="w-px h-4 bg-slate-300 dark:bg-slate-600 mx-1"></div>
                <ToolbarButton onClick={() => execCmd('bold')} label="B" title="Bold" />
                <ToolbarButton onClick={() => execCmd('italic')} label="I" title="Italic" />
                <ToolbarButton onClick={handleCreateLink} icon={<LinkIcon className="w-4 h-4"/>} title="Insert Link" />
                <div className="w-px h-4 bg-slate-300 dark:bg-slate-600 mx-1"></div>
                <ToolbarButton onClick={() => execCmd('insertUnorderedList')} icon={<ListBulletIcon className="w-4 h-4"/>} title="Bullet List" />
                <ToolbarButton onClick={() => execCmd('insertOrderedList')} icon={<ListNumberIcon className="w-4 h-4"/>} title="Numbered List" />
                <div className="w-px h-4 bg-slate-300 dark:bg-slate-600 mx-1"></div>
                <div className="flex items-center gap-1 px-1" title="Text Color">
                    <input 
                        type="color" 
                        onChange={(e) => execCmd('foreColor', e.target.value)} 
                        className="w-5 h-5 cursor-pointer bg-transparent border-none p-0"
                    />
                </div>
                <ToolbarButton onClick={() => execCmd('removeFormat')} label="Tx" title="Clear Formatting" />
            </div>

            {/* Editor Area */}
            <div className="relative">
                <div 
                    ref={editorRef} 
                    contentEditable={true} 
                    onInput={handleInput}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    className="w-full p-3 text-ink-text dark:text-parchment focus:outline-none prose prose-sm dark:prose-invert max-w-none [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:text-xl [&_h2]:font-bold [&_h3]:text-lg [&_h3]:font-bold [&_a]:text-townsfolk-blue [&_a]:underline"
                    style={{ minHeight }}
                />
                {(!value || value === '') && placeholder && (
                    <div className="absolute top-3 left-3 text-slate-text/50 dark:text-moonlit-stone/50 pointer-events-none text-sm select-none">
                        {placeholder}
                    </div>
                )}
            </div>
        </div>
    );
};
