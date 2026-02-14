import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  BookOpen, Plus, Trash2, Edit3, Save, X, 
  Search, Menu, ChevronRight, ChevronDown, Layout, Upload, 
  FolderPlus, Folder, FileText, HelpCircle, AlertCircle, 
  Image as ImageIcon, MoreVertical, Type, MoveUp, MoveDown,
  FolderOpen, PenLine, PanelLeftClose, PanelLeftOpen, 
  Maximize2, Minimize2, MoreHorizontal, Bold, Italic, Underline, 
  Heading1, Heading2, Heading3, Highlighter
} from 'lucide-react';

// --- Firebase SDK Imports ---
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, addDoc, getDocs, doc, 
  deleteDoc, updateDoc, query, where, onSnapshot, orderBy 
} from 'firebase/firestore';

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyDNJjp4khyFQ3rFzfvt0qjLskggC8YgIhk", 
  authDomain: "devlogformax85.firebaseapp.com",
  projectId: "devlogformax85",
  storageBucket: "devlogformax85.firebasestorage.app",
  messagingSenderId: "65839306064",
  appId: "1:65839306064:web:868e99c27741b6ab28c855",
  measurementId: "G-EV1NM1JNJR"
};

let app, db;
try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
} catch (error) {
  console.error("Firebase 初始化失敗:", error);
}

// --- Helpers ---
const compressImage = (file, maxWidth = 1200) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scaleSize = maxWidth / img.width;
        
        if (scaleSize >= 1) {
          resolve(event.target.result);
          return;
        }

        canvas.width = maxWidth;
        canvas.height = img.height * scaleSize;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        resolve(dataUrl);
      };
    };
  });
};

// --- Components ---

// 1. 浮動文字工具列 (Floating Toolbar)
const FloatingToolbar = ({ position, onFormat }) => {
  if (!position) return null;

  return (
    <div 
      className="fixed z-50 flex items-center gap-1 p-1 bg-slate-800 text-slate-200 rounded-lg shadow-xl animate-in fade-in zoom-in-95 duration-150"
      style={{ top: position.top - 50, left: position.left }}
      onMouseDown={(e) => e.preventDefault()} // 防止失去焦點
    >
      <button onClick={() => onFormat('bold')} className="p-1.5 hover:bg-slate-700 rounded"><Bold size={16} /></button>
      <button onClick={() => onFormat('italic')} className="p-1.5 hover:bg-slate-700 rounded"><Italic size={16} /></button>
      <button onClick={() => onFormat('underline')} className="p-1.5 hover:bg-slate-700 rounded"><Underline size={16} /></button>
      <div className="w-px h-4 bg-slate-600 mx-1"></div>
      <button onClick={() => onFormat('formatBlock', 'H1')} className="p-1.5 hover:bg-slate-700 rounded"><Heading1 size={16} /></button>
      <button onClick={() => onFormat('formatBlock', 'H2')} className="p-1.5 hover:bg-slate-700 rounded"><Heading2 size={16} /></button>
      <button onClick={() => onFormat('formatBlock', 'P')} className="p-1.5 hover:bg-slate-700 rounded text-xs font-bold w-7">Normal</button>
    </div>
  );
};

// 2. 內容區塊元件 (Content Block - Replace Textarea)
// 使用 contentEditable 讓 div 變成可編輯，支援 Rich Text
const ContentBlock = ({ html, tagName, className, onInput, onFocus, placeholder }) => {
  const contentEditableRef = useRef(null);

  // 避免 Cursor 跳動：只有當內容真的變更且非當前編輯狀態時才更新 innerHTML
  useEffect(() => {
    if (contentEditableRef.current && contentEditableRef.current.innerHTML !== html) {
      // 只有在初始化或外部更新時才設值，避免打字時重繪導致光標跳到最前面
      if (document.activeElement !== contentEditableRef.current) {
        contentEditableRef.current.innerHTML = html;
      }
    }
  }, [html]);

  const handleInput = (e) => {
    onInput(e.currentTarget.innerHTML);
  };

  const Tag = tagName || 'div';

  return (
    <Tag
      ref={contentEditableRef}
      className={`outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-slate-300 dark:empty:before:text-slate-600 cursor-text ${className}`}
      contentEditable
      suppressContentEditableWarning
      onInput={handleInput}
      onFocus={onFocus}
      onBlur={handleInput} // 確保最後狀態同步
      data-placeholder={placeholder}
    />
  );
};

// 3. 樹狀側邊欄 (Updated with Dark Mode)
const TreeSidebar = ({ 
  projects, chapters, posts, selectedPost, onSelectPost, 
  onCreateProject, onDeleteProject, 
  onCreateChapter, onEditChapter, onDeleteChapter,
  onCreatePost, isSidebarOpen, setIsSidebarOpen
}) => {
  const [expandedProjects, setExpandedProjects] = useState({});
  const [expandedChapters, setExpandedChapters] = useState({});
  const inputRef = useRef(null);

  const toggleProject = (pid) => setExpandedProjects(prev => ({ ...prev, [pid]: !prev[pid] }));
  const toggleChapter = (chapId) => setExpandedChapters(prev => ({ ...prev, [chapId]: !prev[chapId] }));

  const handleCreateProjectSubmit = (e) => {
    e.preventDefault();
    if (inputRef.current?.value) {
      onCreateProject(inputRef.current.value);
      inputRef.current.value = '';
    }
  };

  const handleAddChapterClick = (projectId) => {
    const name = window.prompt("請輸入新章節名稱：");
    if (name) onCreateChapter(projectId, name);
  };

  const handleEditChapterClick = (e, chapter) => {
    e.stopPropagation();
    const newName = window.prompt("修改章節名稱：", chapter.name);
    if (newName && newName !== chapter.name) onEditChapter(chapter.id, newName);
  };

  // Mobile Overlay
  if (!isSidebarOpen && window.innerWidth < 768) return null;

  return (
    <>
      <div className={`
        fixed inset-y-0 left-0 z-40 flex flex-col 
        bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 
        transition-all duration-300 ease-in-out text-slate-700 dark:text-slate-300
        ${isSidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full opacity-0 md:opacity-100 md:w-0 md:translate-x-0'}
        overflow-hidden
      `}>
        {/* Header */}
        <div className="h-12 px-4 flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800/50 shrink-0">
          <div className="flex items-center gap-2 font-bold dark:text-white">
            <div className="w-5 h-5 bg-slate-800 dark:bg-slate-700 text-white rounded flex items-center justify-center text-xs">D</div>
            <span>佳美資訊</span>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-400"><X size={18} /></button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {projects.map(proj => {
            const isProjExpanded = expandedProjects[proj.id];
            const projectChapters = chapters.filter(c => c.projectId === proj.id);

            return (
              <div key={proj.id}>
                <div className="group flex items-center justify-between hover:bg-slate-200/60 dark:hover:bg-slate-800/60 rounded px-2 py-1 transition-colors cursor-pointer select-none" onClick={() => toggleProject(proj.id)}>
                  <div className="flex-1 flex items-center gap-2 text-sm font-medium truncate">
                    <span className="text-slate-400">{isProjExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span>
                    <Folder size={15} className={isProjExpanded ? "text-slate-800 dark:text-slate-200" : "text-slate-400"} />
                    <span className="truncate">{proj.name}</span>
                  </div>
                  <button onClick={(e) => onDeleteProject(proj.id, e)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 p-0.5"><Trash2 size={12} /></button>
                </div>

                {isProjExpanded && (
                  <div className="ml-2 pl-2 border-l border-slate-200 dark:border-slate-700 mt-0.5 space-y-0.5">
                    {projectChapters.length === 0 && <div className="text-xs text-slate-400 pl-4 py-1 italic">無章節</div>}
                    
                    {projectChapters.map(chap => {
                      const isChapExpanded = expandedChapters[chap.id];
                      const chapterPosts = posts.filter(p => p.subChapter === chap.id); 
                      
                      return (
                        <div key={chap.id}>
                          <div className="group flex items-center justify-between hover:bg-slate-200/60 dark:hover:bg-slate-800/60 rounded px-2 py-1 cursor-pointer select-none" onClick={() => toggleChapter(chap.id)}>
                            <div className="flex-1 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                              <span className="text-slate-300 dark:text-slate-600">{isChapExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}</span>
                              <span className="truncate">{chap.name}</span>
                            </div>
                            
                            <div className="flex opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                              <button onClick={(e) => handleEditChapterClick(e, chap)} className="text-slate-400 hover:text-blue-500 p-0.5"><PenLine size={12} /></button>
                              <button onClick={(e) => { e.stopPropagation(); onDeleteChapter(chap.id); }} className="text-slate-400 hover:text-red-500 p-0.5"><Trash2 size={12} /></button>
                              <button onClick={(e) => { e.stopPropagation(); onCreatePost(proj.id, chap.id); }} className="text-slate-400 hover:text-emerald-500 p-0.5"><Plus size={12} /></button>
                            </div>
                          </div>

                          {isChapExpanded && (
                            <div className="ml-2 pl-2 border-l border-slate-200 dark:border-slate-700 mt-0.5 space-y-0.5">
                              {chapterPosts.length === 0 && <div className="text-[10px] text-slate-400 pl-4 py-1">無文章</div>}
                              {chapterPosts.map(post => (
                                <button
                                  key={post.id}
                                  onClick={() => { onSelectPost(post); if(window.innerWidth < 768) setIsSidebarOpen(false); }}
                                  className={`w-full text-left pl-4 pr-2 py-1 text-xs rounded truncate transition-colors flex items-center gap-2 
                                    ${selectedPost?.id === post.id 
                                      ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-medium' 
                                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                                >
                                  <FileText size={12} className={selectedPost?.id === post.id ? "text-emerald-500" : "text-slate-300 dark:text-slate-600"} />
                                  <span className="truncate">{post.title || "未命名"}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    <button onClick={() => handleAddChapterClick(proj.id)} className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 pl-4 py-1 mt-1 w-full hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors">
                      <Plus size={12} /> 新增章節
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer Input */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shrink-0">
          <form onSubmit={handleCreateProjectSubmit} className="relative">
            <input 
              ref={inputRef}
              type="text" 
              placeholder="新增專案..." 
              className="w-full bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs rounded border border-slate-200 dark:border-slate-700 pl-7 pr-2 py-1.5 focus:border-slate-400 dark:focus:border-slate-500 focus:outline-none shadow-sm placeholder:text-slate-300 dark:placeholder:text-slate-600"
            />
            <FolderPlus size={12} className="absolute left-2.5 top-2 text-slate-400" />
          </form>
        </div>
      </div>
      
      {/* Mobile Overlay */}
      {isSidebarOpen && window.innerWidth < 768 && (
        <div className="fixed inset-0 bg-black/20 z-30 md:hidden backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
      )}
    </>
  );
};

// 4. 區塊編輯器 (Enhanced: Dark Mode, Rich Text, Cover Image)
const BlockEditor = ({ post, chapters, onSave, onDelete, isSidebarOpen, setIsSidebarOpen }) => {
  const initialBlocks = post.blocks || [
    { type: 'text', content: post.content || '' },
    ...(post.image && !post.blocks ? [{ type: 'image', content: post.image }] : [])
  ];

  const [title, setTitle] = useState(post.title);
  const [blocks, setBlocks] = useState(initialBlocks);
  const [coverImage, setCoverImage] = useState(post.coverImage || null); // [New] Cover Image State
  const [isSaving, setIsSaving] = useState(false);
  const [isFullWidth, setIsFullWidth] = useState(false);
  
  // Toolbar State
  const [toolbarPosition, setToolbarPosition] = useState(null);

  useEffect(() => {
    setTitle(post.title);
    setBlocks(post.blocks || [
      { type: 'text', content: post.content || '' },
      ...(post.image && !post.blocks ? [{ type: 'image', content: post.image }] : [])
    ]);
    setCoverImage(post.coverImage || null);
  }, [post.id]);

  // Handle Text Selection for Toolbar
  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setToolbarPosition(null);
      return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    // Only show if selection is within the editor
    setToolbarPosition({
      top: rect.top,
      left: rect.left + rect.width / 2 - 100 // Center align roughly
    });
  };

  const handleFormat = (command, value = null) => {
    document.execCommand(command, false, value);
    // document.execCommand works on contentEditable, but allows us to keep 'single file' structure easily
    // without heavy libraries like Slate.js.
  };

  const addBlock = (index, type) => {
    const newBlocks = [...blocks];
    newBlocks.splice(index + 1, 0, { type, content: '' });
    setBlocks(newBlocks);
  };

  const removeBlock = (index) => {
    if (blocks.length <= 1) return;
    setBlocks(blocks.filter((_, i) => i !== index));
  };

  const updateBlock = (index, content) => {
    const newBlocks = [...blocks];
    newBlocks[index].content = content;
    setBlocks(newBlocks);
  };

  const moveBlock = (index, direction) => {
    if ((direction === -1 && index === 0) || (direction === 1 && index === blocks.length - 1)) return;
    const newBlocks = [...blocks];
    const temp = newBlocks[index];
    newBlocks[index] = newBlocks[index + direction];
    newBlocks[index + direction] = temp;
    setBlocks(newBlocks);
  };

  const handleImageUpload = async (index, file) => {
    if (!file) return;
    try {
      const base64 = await compressImage(file);
      updateBlock(index, base64);
    } catch (e) { alert("圖片處理失敗"); }
  };

  const handleCoverImageUpload = async (file) => {
    if (!file) return;
    try {
      const base64 = await compressImage(file, 1600); // Higher res for cover
      setCoverImage(base64);
    } catch (e) { alert("封面圖片處理失敗"); }
  };

  const handleSave = async () => {
    setIsSaving(true);
    // Clean up content for preview (remove html tags)
    const firstTextBlock = blocks.find(b => b.type === 'text');
    const rawText = firstTextBlock ? firstTextBlock.content.replace(/<[^>]*>?/gm, '') : '';
    const previewContent = rawText.slice(0, 100);
    const firstImageBlock = blocks.find(b => b.type === 'image');
    
    await onSave({
      ...post, 
      title, 
      blocks, 
      coverImage, // Save cover image
      content: previewContent, 
      image: firstImageBlock ? firstImageBlock.content : null
    });
    setIsSaving(false);
  };

  const currentChapterName = chapters.find(c => c.id === post.subChapter)?.name || "未知章節";

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors" onMouseUp={handleMouseUp} onKeyUp={handleMouseUp}>
      <FloatingToolbar position={toolbarPosition} onFormat={handleFormat} />

      {/* Top Navigation Bar */}
      <div className="h-12 px-3 flex items-center justify-between sticky top-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md z-20 shrink-0 border-b border-transparent dark:border-slate-800">
        <div className="flex items-center gap-2 overflow-hidden">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500 dark:text-slate-400 transition-colors"
          >
            {isSidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
          </button>
          
          <div className="hidden md:flex items-center text-sm text-slate-500 dark:text-slate-400 gap-2 truncate">
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-default">
              <FolderOpen size={14} /> {currentChapterName}
            </span>
            <span className="text-slate-300 dark:text-slate-600">/</span>
            <span className="truncate max-w-[200px]">{title || "未命名"}</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <div className="text-xs text-slate-300 dark:text-slate-600 mr-2 hidden sm:block">
             {isSaving ? "儲存中..." : "已儲存"}
          </div>
          
          <button 
            onClick={() => setIsFullWidth(!isFullWidth)} 
            className={`p-1.5 rounded transition-colors hidden md:block ${isFullWidth ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            title={isFullWidth ? "切換至閱讀模式" : "切換至全寬模式"}
          >
            {isFullWidth ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>

          <button onClick={() => onDelete(post.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"><Trash2 size={18} /></button>
          
          <button 
            onClick={handleSave} 
            className="ml-2 flex items-center gap-2 px-3 py-1 bg-slate-900 dark:bg-slate-200 text-white dark:text-slate-900 text-sm rounded hover:bg-slate-800 dark:hover:bg-white transition-colors shadow-sm font-medium"
          >
            儲存
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* [Feature] 封面圖片區域 */}
        <div className="relative group/cover w-full">
          {coverImage ? (
            <div className="relative w-full h-48 md:h-72 bg-slate-100 dark:bg-slate-900">
              <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
              <div className="absolute bottom-4 right-4 flex gap-2 opacity-0 group-hover/cover:opacity-100 transition-opacity">
                <label className="bg-white/80 dark:bg-black/50 backdrop-blur text-xs px-3 py-1.5 rounded-md cursor-pointer hover:bg-white dark:hover:bg-black/70 transition-colors shadow-sm">
                  更換封面
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleCoverImageUpload(e.target.files[0])} />
                </label>
                <button 
                  onClick={() => setCoverImage(null)}
                  className="bg-white/80 dark:bg-black/50 backdrop-blur text-xs px-3 py-1.5 rounded-md hover:text-red-500 transition-colors shadow-sm"
                >
                  移除
                </button>
              </div>
            </div>
          ) : (
            // [Feature] 無封面時顯示的按鈕區 (在內容上方)
            <div className="pt-10 px-10 max-w-3xl mx-auto opacity-0 hover:opacity-100 transition-opacity -mb-10 relative z-10 h-10">
               <label className="flex items-center gap-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer text-sm w-fit">
                 <ImageIcon size={16} /> 新增封面
                 <input type="file" accept="image/*" className="hidden" onChange={(e) => handleCoverImageUpload(e.target.files[0])} />
               </label>
            </div>
          )}
        </div>

        <div className={`
          mx-auto py-12 transition-all duration-300 ease-in-out
          ${isFullWidth ? 'max-w-none px-6 md:px-12' : 'max-w-3xl px-6 md:px-0'}
        `}>
          
          {/* Title Input */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-4xl font-bold text-slate-800 dark:text-slate-100 border-none outline-none placeholder:text-slate-300 dark:placeholder:text-slate-700 bg-transparent mb-8 leading-tight"
            placeholder="未命名文章"
          />

          {/* Blocks */}
          <div className="space-y-2 pb-32">
            {blocks.map((block, index) => (
              <div key={index} className="group relative transition-all">
                {/* Drag Handle */}
                <div className="absolute -left-12 top-1.5 w-10 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex items-center gap-0.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-0.5 shadow-sm">
                    <button onClick={() => moveBlock(index, -1)} className="p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"><MoveUp size={12} /></button>
                    <button onClick={() => moveBlock(index, 1)} className="p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"><MoveDown size={12} /></button>
                    <button onClick={() => removeBlock(index)} className="p-0.5 text-slate-400 hover:text-red-500"><X size={12} /></button>
                  </div>
                </div>

                <div className="relative">
                  {block.type === 'text' ? (
                    // [Feature] 改用 ContentBlock 支援 Rich Text
                    <ContentBlock
                      html={block.content}
                      onInput={(content) => updateBlock(index, content)}
                      placeholder='輸入內容，選取文字可調整樣式...'
                      className="w-full min-h-[28px] text-base text-slate-700 dark:text-slate-300 leading-relaxed py-1 px-0"
                    />
                  ) : (
                    <div className="relative my-4 group/img">
                       {block.content ? (
                         <div className="relative inline-block max-w-full">
                           <img src={block.content} alt="Content" className="max-w-full rounded-lg shadow-sm border border-slate-100 dark:border-slate-800" />
                           <label className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded opacity-0 group-hover/img:opacity-100 cursor-pointer transition-opacity backdrop-blur-sm">
                             更換 <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(index, e.target.files[0])} />
                           </label>
                         </div>
                       ) : (
                         <label className="flex items-center justify-center gap-2 h-32 bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 text-slate-400 transition-all">
                           <ImageIcon size={20} /> <span>點擊上傳圖片</span>
                           <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(index, e.target.files[0])} />
                         </label>
                       )}
                    </div>
                  )}
                </div>

                {/* Add Block Trigger */}
                <div className="h-2 -mb-2 group-hover:h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-10">
                   <button onClick={() => addBlock(index, 'text')} className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 rounded-full p-1 shadow-sm border border-slate-200 dark:border-slate-700 mr-2" title="插入文字"><Type size={12}/></button>
                   <button onClick={() => addBlock(index, 'image')} className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 rounded-full p-1 shadow-sm border border-slate-200 dark:border-slate-700" title="插入圖片"><ImageIcon size={12}/></button>
                </div>
              </div>
            ))}
            
            {blocks.length === 0 && (
               <div className="flex gap-4 py-4 text-slate-400">
                  <button onClick={() => addBlock(-1, 'text')} className="flex items-center gap-2 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"><Plus size={18} /> 開始輸入...</button>
               </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// 5. 空狀態 (Updated with Dark Mode)
const EmptyState = ({ setIsSidebarOpen }) => (
  <div className="flex-1 flex flex-col items-center justify-center bg-white dark:bg-slate-950 text-slate-400 p-8 h-full transition-colors">
    <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900 rounded-xl flex items-center justify-center mb-6 shadow-sm border border-slate-100 dark:border-slate-800">
      <Layout size={32} className="text-slate-300 dark:text-slate-600" />
    </div>
    <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">準備好紀錄開發歷程了嗎？</h2>
    <p className="max-w-xs text-center text-sm text-slate-500 dark:text-slate-500 mb-8 leading-relaxed">
      點擊左上角 <PanelLeftOpen size={14} className="inline"/> 展開側邊欄，<br/>選擇專案並開始撰寫文章。
    </p>
    <button onClick={() => setIsSidebarOpen(true)} className="md:hidden px-4 py-2 bg-slate-900 text-white rounded text-sm">
      開啟選單
    </button>
  </div>
);

// --- Main App Component ---
export default function App() {
  const [projects, setProjects] = useState([]);
  const [chapters, setChapters] = useState([]); 
  const [posts, setPosts] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    if (!db) return;
    const unsubProjects = onSnapshot(query(collection(db, "projects"), orderBy("createdAt", "desc")), (s) => setProjects(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubChapters = onSnapshot(query(collection(db, "chapters"), orderBy("createdAt", "asc")), (s) => setChapters(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubPosts = onSnapshot(query(collection(db, "posts"), orderBy("date", "desc")), (s) => setPosts(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => { unsubProjects(); unsubChapters(); unsubPosts(); };
  }, []);

  const handleCreateProject = async (name) => { try { await addDoc(collection(db, "projects"), { name, createdAt: new Date().toISOString() }); } catch (e) { alert("建立專案失敗"); } };
  const handleDeleteProject = async (id, e) => { e.stopPropagation(); if (window.confirm("確定刪除此專案？")) { await deleteDoc(doc(db, "projects", id)); if (selectedPost?.projectId === id) setSelectedPost(null); } };
  const handleCreateChapter = async (projectId, name) => { try { await addDoc(collection(db, "chapters"), { projectId, name, createdAt: new Date().toISOString() }); } catch (e) { alert("建立章節失敗"); } };
  const handleEditChapter = async (chapterId, newName) => { try { await updateDoc(doc(db, "chapters", chapterId), { name: newName }); } catch (e) { alert("修改章節失敗"); } };
  const handleDeleteChapter = async (chapterId) => { if (window.confirm("確定刪除此章節？")) { await deleteDoc(doc(db, "chapters", chapterId)); } };

  const handleCreatePost = (projectId, chapterId) => {
    setSelectedPost({ id: 'temp-' + Date.now(), title: '', projectId, subChapter: chapterId, date: new Date().toISOString().split('T')[0], blocks: [{ type: 'text', content: '' }], isNew: true });
  };
  const handleSavePost = async (postData) => {
    const { isNew, id, ...data } = postData;
    try {
      if (isNew || id.startsWith('temp-')) { const docRef = await addDoc(collection(db, "posts"), data); setSelectedPost({ ...data, id: docRef.id }); } 
      else { await updateDoc(doc(db, "posts", id), data); setSelectedPost(postData); }
    } catch (e) { alert("儲存失敗"); }
  };
  const handleDeletePost = async (id) => { if (id.startsWith('temp-')) { setSelectedPost(null); return; } if (window.confirm("確定刪除此文章？")) { await deleteDoc(doc(db, "posts", id)); setSelectedPost(null); } };

  if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "YOUR_API_KEY") return <div className="h-screen flex items-center justify-center text-slate-500">請設定 Firebase Config</div>;

  return (
    <div className="w-full flex h-screen bg-white dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 overflow-hidden selection:bg-emerald-100 selection:text-emerald-900">
      <TreeSidebar 
        projects={projects} chapters={chapters} posts={posts} selectedPost={selectedPost} onSelectPost={setSelectedPost}
        onCreateProject={handleCreateProject} onDeleteProject={handleDeleteProject}
        onCreateChapter={handleCreateChapter} onEditChapter={handleEditChapter} onDeleteChapter={handleDeleteChapter} onCreatePost={handleCreatePost}
        isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen}
      />
      <main className="flex-1 h-full overflow-hidden bg-white dark:bg-slate-950 relative flex flex-col transition-all duration-300">
        {selectedPost ? (
          <BlockEditor 
            post={selectedPost} 
            chapters={chapters} 
            onSave={handleSavePost} 
            onDelete={handleDeletePost}
            isSidebarOpen={isSidebarOpen}
            setIsSidebarOpen={setIsSidebarOpen}
          />
        ) : (
          <EmptyState setIsSidebarOpen={setIsSidebarOpen} />
        )}
      </main>
    </div>
  );
}