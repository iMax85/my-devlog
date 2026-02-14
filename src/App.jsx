import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, Plus, Trash2, Edit3, Save, X, 
  Search, Menu, ChevronRight, ChevronDown, Layout, Upload, 
  FolderPlus, Folder, FileText, HelpCircle, AlertCircle, 
  Image as ImageIcon, MoreVertical, Type, MoveUp, MoveDown,
  FolderOpen, PenLine, PanelLeftClose, PanelLeftOpen, 
  Maximize2, Minimize2, MoreHorizontal
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
const compressImage = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200; // 提升一點圖片寬度以適應全寬模式
        const scaleSize = MAX_WIDTH / img.width;
        
        if (scaleSize >= 1) {
          resolve(event.target.result);
          return;
        }

        canvas.width = MAX_WIDTH;
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

// 1. 樹狀側邊欄 (Notion Style)
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
      {/* Sidebar Container */}
      <div className={`
        fixed inset-y-0 left-0 z-40 flex flex-col bg-slate-50 border-r border-slate-200 transition-all duration-300 ease-in-out
        ${isSidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full opacity-0 md:opacity-100 md:w-0 md:translate-x-0'}
        overflow-hidden
      `}>
        {/* Header */}
        <div className="h-12 px-4 flex items-center justify-between border-b border-slate-200/50 shrink-0">
          <div className="flex items-center gap-2 font-bold text-slate-700">
            <div className="w-5 h-5 bg-slate-800 text-white rounded flex items-center justify-center text-xs">D</div>
            <span>佳美資訊</span>
          </div>
          {/* Mobile Close Button */}
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-400"><X size={18} /></button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {projects.map(proj => {
            const isProjExpanded = expandedProjects[proj.id];
            const projectChapters = chapters.filter(c => c.projectId === proj.id);

            return (
              <div key={proj.id}>
                {/* Project Item */}
                <div className="group flex items-center justify-between hover:bg-slate-200/60 rounded px-2 py-1 transition-colors cursor-pointer select-none" onClick={() => toggleProject(proj.id)}>
                  <div className="flex-1 flex items-center gap-2 text-sm font-medium text-slate-600 truncate">
                    <span className="text-slate-400">{isProjExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span>
                    <Folder size={15} className={isProjExpanded ? "text-slate-800" : "text-slate-400"} />
                    <span className="truncate">{proj.name}</span>
                  </div>
                  <button onClick={(e) => onDeleteProject(proj.id, e)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 p-0.5"><Trash2 size={12} /></button>
                </div>

                {/* Chapters */}
                {isProjExpanded && (
                  <div className="ml-2 pl-2 border-l border-slate-200 mt-0.5 space-y-0.5">
                    {projectChapters.length === 0 && <div className="text-xs text-slate-400 pl-4 py-1 italic">無章節</div>}
                    
                    {projectChapters.map(chap => {
                      const isChapExpanded = expandedChapters[chap.id];
                      const chapterPosts = posts.filter(p => p.subChapter === chap.id); 
                      
                      return (
                        <div key={chap.id}>
                          <div className="group flex items-center justify-between hover:bg-slate-200/60 rounded px-2 py-1 cursor-pointer select-none" onClick={() => toggleChapter(chap.id)}>
                            <div className="flex-1 flex items-center gap-2 text-xs text-slate-500">
                              <span className="text-slate-300">{isChapExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}</span>
                              <span className="truncate">{chap.name}</span>
                            </div>
                            
                            <div className="flex opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                              <button onClick={(e) => handleEditChapterClick(e, chap)} className="text-slate-400 hover:text-blue-500 p-0.5"><PenLine size={12} /></button>
                              <button onClick={(e) => { e.stopPropagation(); onDeleteChapter(chap.id); }} className="text-slate-400 hover:text-red-500 p-0.5"><Trash2 size={12} /></button>
                              <button onClick={(e) => { e.stopPropagation(); onCreatePost(proj.id, chap.id); }} className="text-slate-400 hover:text-emerald-500 p-0.5"><Plus size={12} /></button>
                            </div>
                          </div>

                          {/* Posts */}
                          {isChapExpanded && (
                            <div className="ml-2 pl-2 border-l border-slate-200 mt-0.5 space-y-0.5">
                              {chapterPosts.length === 0 && <div className="text-[10px] text-slate-400 pl-4 py-1">無文章</div>}
                              {chapterPosts.map(post => (
                                <button
                                  key={post.id}
                                  onClick={() => { onSelectPost(post); if(window.innerWidth < 768) setIsSidebarOpen(false); }}
                                  className={`w-full text-left pl-4 pr-2 py-1 text-xs rounded truncate transition-colors flex items-center gap-2 ${selectedPost?.id === post.id ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-slate-500 hover:bg-slate-100'}`}
                                >
                                  <FileText size={12} className={selectedPost?.id === post.id ? "text-emerald-500" : "text-slate-300"} />
                                  <span className="truncate">{post.title || "未命名"}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    <button onClick={() => handleAddChapterClick(proj.id)} className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 pl-4 py-1 mt-1 w-full hover:bg-slate-100 rounded transition-colors">
                      <Plus size={12} /> 新增章節
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer Input */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 shrink-0">
          <form onSubmit={handleCreateProjectSubmit} className="relative">
            <input 
              ref={inputRef}
              type="text" 
              placeholder="新增專案..." 
              className="w-full bg-white text-slate-700 text-xs rounded border border-slate-200 pl-7 pr-2 py-1.5 focus:border-slate-400 focus:outline-none shadow-sm placeholder:text-slate-300"
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

// 2. 區塊編輯器 (Fluid Layout + Toggle Width)
const BlockEditor = ({ post, chapters, onSave, onDelete, isSidebarOpen, setIsSidebarOpen }) => {
  const initialBlocks = post.blocks || [
    { type: 'text', content: post.content || '' },
    ...(post.image ? [{ type: 'image', content: post.image }] : [])
  ];

  const [title, setTitle] = useState(post.title);
  const [blocks, setBlocks] = useState(initialBlocks);
  const [isSaving, setIsSaving] = useState(false);
  const [isFullWidth, setIsFullWidth] = useState(false); // [Feature] 寬度切換狀態

  useEffect(() => {
    setTitle(post.title);
    setBlocks(post.blocks || [
      { type: 'text', content: post.content || '' },
      ...(post.image ? [{ type: 'image', content: post.image }] : [])
    ]);
  }, [post.id]);

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

  const handleSave = async () => {
    setIsSaving(true);
    const firstTextBlock = blocks.find(b => b.type === 'text');
    const previewContent = firstTextBlock ? firstTextBlock.content.slice(0, 100) : '';
    const firstImageBlock = blocks.find(b => b.type === 'image');
    
    await onSave({
      ...post, title, blocks, content: previewContent, image: firstImageBlock ? firstImageBlock.content : null
    });
    setIsSaving(false);
  };

  const currentChapterName = chapters.find(c => c.id === post.subChapter)?.name || "未知章節";

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Top Navigation Bar (App Chrome) */}
      <div className="h-12 px-3 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-20 shrink-0">
        <div className="flex items-center gap-2 overflow-hidden">
          {/* Sidebar Toggle Button */}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
            className="p-1 hover:bg-slate-100 rounded text-slate-500 transition-colors"
            title={isSidebarOpen ? "收合側邊欄" : "展開側邊欄"}
          >
            {isSidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
          </button>
          
          {/* Breadcrumbs */}
          <div className="hidden md:flex items-center text-sm text-slate-500 gap-2 truncate">
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-slate-100 cursor-default">
              <FolderOpen size={14} /> {currentChapterName}
            </span>
            <span className="text-slate-300">/</span>
            <span className="truncate max-w-[200px]">{title || "未命名"}</span>
          </div>
        </div>

        {/* Top Right Actions */}
        <div className="flex items-center gap-1">
          <div className="text-xs text-slate-300 mr-2 hidden sm:block">
             {isSaving ? "儲存中..." : "已儲存"}
          </div>
          
          {/* [Feature] 寬度切換按鈕 */}
          <button 
            onClick={() => setIsFullWidth(!isFullWidth)} 
            className={`p-1.5 rounded transition-colors hidden md:block ${isFullWidth ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
            title={isFullWidth ? "切換至閱讀模式 (置中)" : "切換至全寬模式"}
          >
            {isFullWidth ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>

          <button onClick={() => onDelete(post.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"><Trash2 size={18} /></button>
          
          <button 
            onClick={handleSave} 
            className="ml-2 flex items-center gap-2 px-3 py-1 bg-slate-900 text-white text-sm rounded hover:bg-slate-800 transition-colors shadow-sm"
          >
            儲存
          </button>
        </div>
      </div>

      {/* Main Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto">
        {/* [Feature] 這裡控制寬度：閱讀模式(max-w-3xl) vs 全寬模式(max-w-none) */}
        <div className={`
          mx-auto py-10 transition-all duration-300 ease-in-out
          ${isFullWidth ? 'max-w-none px-6 md:px-12' : 'max-w-3xl px-6 md:px-0'}
        `}>
          
          {/* Cover Image Placeholder (Optional visual cue) */}
          <div className="group relative h-40 mb-8 -mt-6 rounded-lg bg-gradient-to-r from-slate-50 to-slate-100 flex items-center justify-center border border-dashed border-slate-200 text-slate-300 hover:border-slate-300 transition-colors cursor-pointer opacity-50 hover:opacity-100">
             <div className="flex items-center gap-2 text-sm"><ImageIcon size={16} /> 新增封面 (未來功能)</div>
          </div>

          {/* Title Input */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-4xl font-bold text-slate-800 border-none outline-none placeholder:text-slate-300 bg-transparent mb-6 leading-tight"
            placeholder="未命名文章"
          />

          {/* Blocks */}
          <div className="space-y-2 pb-32">
            {blocks.map((block, index) => (
              <div key={index} className="group relative transition-all">
                {/* Drag Handle & Menu (Notion-like left gutter) */}
                <div className="absolute -left-12 top-1.5 w-10 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex items-center gap-0.5 bg-slate-50 border border-slate-200 rounded p-0.5 shadow-sm">
                    <button onClick={() => moveBlock(index, -1)} className="p-0.5 text-slate-400 hover:text-slate-700"><MoveUp size={12} /></button>
                    <button onClick={() => moveBlock(index, 1)} className="p-0.5 text-slate-400 hover:text-slate-700"><MoveDown size={12} /></button>
                    <button onClick={() => removeBlock(index)} className="p-0.5 text-slate-400 hover:text-red-500"><X size={12} /></button>
                  </div>
                </div>

                <div className="relative">
                  {block.type === 'text' ? (
                    <textarea
                      value={block.content}
                      onChange={(e) => updateBlock(index, e.target.value)}
                      placeholder="輸入內容，或輸入 '/' 命令..."
                      className="w-full min-h-[28px] resize-none bg-transparent border-none outline-none text-base text-slate-700 leading-relaxed py-1 px-0 placeholder:text-slate-300"
                      style={{ height: 'auto' }}
                      onInput={(e) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                    />
                  ) : (
                    <div className="relative my-4 group/img">
                       {block.content ? (
                         <div className="relative inline-block max-w-full">
                           <img src={block.content} alt="Content" className="max-w-full rounded-lg shadow-sm border border-slate-100" />
                           <label className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded opacity-0 group-hover/img:opacity-100 cursor-pointer transition-opacity backdrop-blur-sm">
                             更換 <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(index, e.target.files[0])} />
                           </label>
                         </div>
                       ) : (
                         <label className="flex items-center justify-center gap-2 h-32 bg-slate-50 border border-dashed border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100 hover:border-slate-300 text-slate-400 transition-all">
                           <ImageIcon size={20} /> <span>點擊上傳圖片</span>
                           <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(index, e.target.files[0])} />
                         </label>
                       )}
                    </div>
                  )}
                </div>

                {/* Add Block Trigger (Below each block) */}
                <div className="h-2 -mb-2 group-hover:h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-10">
                   <button onClick={() => addBlock(index, 'text')} className="bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full p-1 shadow-sm border border-slate-200 mr-2" title="插入文字"><Type size={12}/></button>
                   <button onClick={() => addBlock(index, 'image')} className="bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full p-1 shadow-sm border border-slate-200" title="插入圖片"><ImageIcon size={12}/></button>
                </div>
              </div>
            ))}
            
            {blocks.length === 0 && (
               <div className="flex gap-4 py-4 text-slate-400">
                  <button onClick={() => addBlock(-1, 'text')} className="flex items-center gap-2 hover:text-slate-600 transition-colors"><Plus size={18} /> 開始輸入...</button>
               </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// 3. 空狀態 (Notion Style)
const EmptyState = ({ setIsSidebarOpen }) => (
  <div className="flex-1 flex flex-col items-center justify-center bg-white text-slate-400 p-8 h-full">
    <div className="w-16 h-16 bg-slate-50 rounded-xl flex items-center justify-center mb-6 shadow-sm border border-slate-100">
      <Layout size={32} className="text-slate-300" />
    </div>
    <h2 className="text-xl font-semibold text-slate-700 mb-2">準備好紀錄開發歷程了嗎？</h2>
    <p className="max-w-xs text-center text-sm text-slate-500 mb-8 leading-relaxed">
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // [State] 側邊欄狀態

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
    <div className="w-full flex h-screen bg-white font-sans text-slate-900 overflow-hidden selection:bg-emerald-100 selection:text-emerald-900">
      <TreeSidebar 
        projects={projects} chapters={chapters} posts={posts} selectedPost={selectedPost} onSelectPost={setSelectedPost}
        onCreateProject={handleCreateProject} onDeleteProject={handleDeleteProject}
        onCreateChapter={handleCreateChapter} onEditChapter={handleEditChapter} onDeleteChapter={handleDeleteChapter} onCreatePost={handleCreatePost}
        isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen}
      />
      <main className="flex-1 h-full overflow-hidden bg-white relative flex flex-col transition-all duration-300">
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