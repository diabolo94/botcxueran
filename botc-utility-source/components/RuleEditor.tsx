
import React, { useState, useEffect, useMemo, useRef } from 'react';
import html2pdf from 'html2pdf.js';
import LZString from 'lz-string';
import { RuleDocument } from '../types';
import { RichTextEditor } from './RichTextEditor';
import { ArrowLeftIcon, CheckIcon, EyeIcon, PencilSquareIcon, PrinterIcon, ShareIcon, DocumentTextIcon } from './Icons';

interface RuleEditorProps {
  ruleDoc: RuleDocument;
  allDocuments: RuleDocument[];
  onSave: (name: string, content: string) => void;
  onClose: () => void;
  t: (key: string, options?: any) => string;
}

const htmlToMarkdown = (html: string) => {
    let md = html;
    // Replace Headings
    md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gim, '# $1\n\n');
    md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gim, '## $1\n\n');
    md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gim, '### $1\n\n');
    md = md.replace(/<h[4-6][^>]*>(.*?)<\/h[4-6]>/gim, '#### $1\n\n');
    
    // Replace Formatting
    md = md.replace(/<strong[^>]*>(.*?)<\/strong>/gim, '**$1**');
    md = md.replace(/<b[^>]*>(.*?)<\/b>/gim, '**$1**');
    md = md.replace(/<em[^>]*>(.*?)<\/em>/gim, '*$1*');
    md = md.replace(/<i[^>]*>(.*?)<\/i>/gim, '*$1*');
    md = md.replace(/<u[^>]*>(.*?)<\/u>/gim, '__$1__');
    
    // Lists
    md = md.replace(/<ul[^>]*>/gim, '');
    md = md.replace(/<\/ul>/gim, '\n');
    md = md.replace(/<ol[^>]*>/gim, '');
    md = md.replace(/<\/ol>/gim, '\n');
    md = md.replace(/<li[^>]*>(.*?)<\/li>/gim, '- $1\n');
    
    // Line breaks and Paragraphs
    md = md.replace(/<br\s*\/?>/gim, '\n');
    md = md.replace(/<p[^>]*>(.*?)<\/p>/gim, '$1\n\n');
    
    // Links
    md = md.replace(/<a[^>]*href="(.*?)"[^>]*>(.*?)<\/a>/gim, '[$2]($1)');

    // Decode HTML entities (basic)
    md = md.replace(/&nbsp;/gim, ' ');
    md = md.replace(/&amp;/gim, '&');
    md = md.replace(/&lt;/gim, '<');
    md = md.replace(/&gt;/gim, '>');
    
    // Remove remaining tags
    md = md.replace(/<[^>]+>/gim, ''); 
    
    return md.trim();
};

export const RuleEditor: React.FC<RuleEditorProps> = ({ ruleDoc, allDocuments, onSave, onClose, t }) => {
  const [name, setName] = useState(ruleDoc.name);
  const [content, setContent] = useState(ruleDoc.content);
  const [isDirty, setIsDirty] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Sync state if ruleDoc changes
  useEffect(() => {
    setName(ruleDoc.name);
    setContent(ruleDoc.content);
    setIsDirty(false);
    setIsEditing(false); // Default to read mode on new doc load
  }, [ruleDoc]);

  // Auto-save effect or manual save handling
  const handleSave = () => {
    onSave(name, content);
    setIsDirty(false);
    setIsEditing(false);
  };

  const handleExportPDF = () => {
      const element = contentRef.current;
      if (!element) return;

      const opt = {
          margin: 10,
          filename: `${name}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      // Wrap content in a styled container for PDF
      const wrapper = document.createElement('div');
      wrapper.innerHTML = `<h1 style="font-size: 24px; margin-bottom: 20px; font-weight: bold;">${name}</h1>` + content;
      wrapper.style.padding = '20px';
      wrapper.style.fontFamily = 'serif';
      
      html2pdf().set(opt).from(wrapper).save();
  };

  const handleExportMarkdown = () => {
      const markdown = htmlToMarkdown(content);
      const blob = new Blob([markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  };

  const handleShare = () => {
      const data = { title: name, content: content };
      const jsonString = JSON.stringify(data);
      const compressed = LZString.compressToEncodedURIComponent(jsonString);
      const url = `${window.location.origin}${window.location.pathname}?shareRule=${compressed}`;
      
      if (url.length > 8000) {
          alert("此文檔過大，生成的鏈接可能超過瀏覽器限制，建議使用導出功能分享。");
      }
      
      navigator.clipboard.writeText(url).then(() => {
          alert("分享鏈接已複製到剪貼簿！");
      }).catch(err => {
          console.error('Failed to copy: ', err);
          alert("複製失敗，請手動複製網址欄（如果已更新）。");
      });
  };

  // Build Breadcrumbs
  const breadcrumbs = useMemo(() => {
      const path: { id: string; name: string }[] = [];
      let currentId: string | null = ruleDoc.parentId;
      
      while (currentId) {
          const parent = allDocuments.find(d => d.id === currentId);
          if (parent) {
              path.unshift({ id: parent.id, name: parent.name });
              currentId = parent.parentId;
          } else {
              break;
          }
      }
      return path;
  }, [ruleDoc, allDocuments]);

  return (
    <div className="flex flex-col h-full bg-parchment-white dark:bg-midnight-ink animate-fade-in">
      <header className="flex flex-col border-b border-stone-border dark:border-slate-gray bg-white dark:bg-black/20 shrink-0">
        {/* Breadcrumbs Bar */}
        <div className="flex items-center gap-1 px-4 py-1 text-xs text-slate-500 bg-slate-50 dark:bg-slate-900 border-b border-stone-border dark:border-slate-700 overflow-x-auto whitespace-nowrap">
            <span className="opacity-70">Root</span>
            {breadcrumbs.map(crumb => (
                <React.Fragment key={crumb.id}>
                    <span className="opacity-50 mx-1">&gt;</span>
                    <span className="font-medium text-townsfolk-blue">{crumb.name}</span>
                </React.Fragment>
            ))}
            <span className="opacity-50 mx-1">&gt;</span>
            <span className="font-bold text-ink-text dark:text-parchment">{name}</span>
        </div>

        <div className="flex items-center justify-between p-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
            <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition-colors">
                <ArrowLeftIcon className="w-5 h-5" />
            </button>
            {isEditing ? (
                <input
                    type="text"
                    value={name}
                    onChange={(e) => { setName(e.target.value); setIsDirty(true); }}
                    className="text-lg font-bold bg-white dark:bg-black/30 border border-slate-300 dark:border-slate-600 rounded px-2 py-1 w-full text-ink-text dark:text-parchment"
                    placeholder={t('editor.documentTitle')}
                />
            ) : (
                <h1 className="text-xl font-bold text-ink-text dark:text-parchment truncate px-2">{name}</h1>
            )}
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
            {isDirty && <span className="text-xs text-demon-fire animate-pulse font-bold hidden sm:inline">{t('editor.unsaved')}</span>}
            
            {!isEditing && (
                <>
                    <button
                        onClick={handleShare}
                        className="p-2 text-slate-500 hover:text-townsfolk-blue hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                        title="Share Link"
                    >
                        <ShareIcon className="w-5 h-5" />
                    </button>
                    <button
                        onClick={handleExportMarkdown}
                        className="p-2 text-slate-500 hover:text-townsfolk-blue hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                        title="Export Markdown"
                    >
                        <DocumentTextIcon className="w-5 h-5" />
                    </button>
                    <button
                        onClick={handleExportPDF}
                        className="p-2 text-slate-500 hover:text-townsfolk-blue hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                        title="Export PDF"
                    >
                        <PrinterIcon className="w-5 h-5" />
                    </button>
                </>
            )}

            {isEditing ? (
                <button
                    onClick={handleSave}
                    className="flex items-center gap-2 px-4 py-2 bg-townsfolk-blue text-white rounded-md font-bold shadow-sm hover:bg-blue-600 transition-colors text-sm"
                >
                    <CheckIcon className="w-4 h-4" />
                    {t('form.saveChanges')}
                </button>
            ) : (
                <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-ink-text dark:text-parchment rounded-md font-bold shadow-sm hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors text-sm"
                >
                    <PencilSquareIcon className="w-4 h-4" />
                    Edit
                </button>
            )}
            </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
        <div className="max-w-4xl mx-auto h-full flex flex-col">
            {isEditing ? (
                <RichTextEditor 
                    value={content} 
                    onChange={(val) => { setContent(val); setIsDirty(true); }} 
                    placeholder="Start writing..." 
                    minHeight="calc(100vh - 200px)"
                />
            ) : (
                <div 
                    ref={contentRef}
                    className="prose prose-sm sm:prose-base lg:prose-lg dark:prose-invert max-w-none p-4 bg-white dark:bg-transparent rounded-lg shadow-sm dark:shadow-none min-h-[50vh]"
                    dangerouslySetInnerHTML={{ __html: content || '<p class="text-slate-400 italic">No content.</p>' }} 
                />
            )}
        </div>
      </div>
    </div>
  );
};
