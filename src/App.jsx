import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, Plus, Trash2, Edit3, Save, X, 
  Search, Menu, ChevronRight, ChevronDown, Layout, Upload, 
  FolderPlus, Folder, FileText, HelpCircle, AlertCircle, 
  Image as ImageIcon, MoreVertical, Type, MoveUp, MoveDown,
  FolderOpen, PenLine
} from 'lucide-react';

// --- Firebase SDK Imports ---
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, addDoc, getDocs, doc, 
  deleteDoc, updateDoc, query, where, onSnapshot, orderBy 
} from 'firebase/firestore';

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyDNJjp4khyFQ3rFzfvt0qjLskggC8YgIhk", // 請確認這裡填回您的 API Key
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
        const MAX_WIDTH = 800;
        const scaleSize = MAX_WIDTH / img.width;
        
        if (scaleSize >= 1) {
          resolve(event.target.result);
          return;
        }

        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        resolve(dataUrl);
      };
    };
  });
};

// --- Components ---

// 1. 樹狀側邊欄元件 (維持不變)
const TreeSidebar = ({ 
  projects, chapters, posts, selectedPost, onSelectPost, 
  onCreateProject, onDeleteProject, 
  onCreateChapter, onEditChapter, onDeleteChapter,
  onCreatePost 
}) => {
  const [expandedProjects, setExpandedProjects] = useState({});
  const [expandedChapters, setExpandedChapters] = useState({});
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const inputRef = useRef(null);

  const toggleProject = (pid) => {
    setExpandedProjects(prev => ({ ...prev, [pid]: !prev[pid] }));
  };

  const toggleChapter = (chapId) => {
    setExpandedChapters(prev => ({ ...prev, [chapId]: !prev[chapId] }));
  };

  const handleCreateProjectSubmit = (e) => {
    e.preventDefault();
    if (inputRef.current?.value) {
      onCreateProject(inputRef.current.value);
      inputRef.current.value = '';
    }
  };

  const handleAddChapterClick = (projectId) => {
    const name = window.prompt("請輸入新章節名稱 (例如：API 規格)：");
    if (name) onCreateChapter(projectId, name);
  };

  const handleEditChapterClick = (e, chapter) => {
    e.stopPropagation();
    const newName = window.prompt("修改章節名稱：", chapter.name);
    if (newName && newName !== chapter.name) {
      onEditChapter(chapter.id, newName);
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-slate-800 text-white rounded-lg shadow-lg"
      >
        <Menu size={20} />
      </button>

      <div className={`
        fixed inset-y-0 left-0 z-40 w-72 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-300 shadow-2xl
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:relative
      `}>
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
          <h1 className="font-bold text-white tracking-wider flex items-center gap-2">
            <Layout className="text-emerald-400" size={20} /> DevLog
          </h1>
          <button onClick={() => setIsMobileOpen(false)} className="md:hidden"><X size={20} /></button>
        </div>

        {/* Project List (Tree) */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {projects.map(proj => {
            const isProjExpanded = expandedProjects[proj.id];
            // Filter chapters for this project
            const projectChapters = chapters.filter(c => c.projectId === proj.id);

            return (
              <div key={proj.id} className="mb-1">
                {/* Project Item */}
                <div className="group flex items-center justify-between hover:bg-slate-800 rounded-lg pr-2 transition-colors">
                  <button 
                    onClick={() => toggleProject(proj.id)}
                    className="flex-1 flex items-center gap-2 p-2 text-sm font-medium text-slate-200"
                  >
                    {isProjExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    <Folder size={16} className={isProjExpanded ? "text-emerald-400" : "text-slate-500"} />
                    <span className="truncate">{proj.name}</span>
                  </button>
                  <button onClick={(e) => onDeleteProject(proj.id, e)} className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 p-1">
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Dynamic Chapters (Sub-level) */}
                {isProjExpanded && (
                  <div className="ml-4 border-l border-slate-700 pl-2 mt-1 space-y-1">
                    {projectChapters.length === 0 && (
                      <div className="text-xs text-slate-500 p-2 italic">尚無章節，請新增</div>
                    )}
                    
                    {projectChapters.map(chap => {
                      const isChapExpanded = expandedChapters[chap.id];
                      const chapterPosts = posts.filter(p => p.subChapter === chap.id); 
                      
                      return (
                        <div key={chap.id}>
                          <div className="flex items-center justify-between group hover:bg-slate-800/50 rounded pr-2">
                            <button 
                              onClick={() => toggleChapter(chap.id)}
                              className="flex-1 flex items-center gap-2 p-1.5 text-xs text-slate-400 hover:text-white"
                            >
                              {isChapExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                              {chap.name}
                              <span className="ml-auto text-[10px] bg-slate-800 px-1.5 rounded-full">{chapterPosts.length}</span>
                            </button>
                            
                            {/* Chapter Actions */}
                            <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={(e) => handleEditChapterClick(e, chap)}
                                className="text-slate-500 hover:text-blue-400 p-1 rounded"
                                title="修改章節名稱"
                              >
                                <PenLine size={12} />
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); onDeleteChapter(chap.id); }}
                                className="text-slate-500 hover:text-red-400 p-1 rounded"
                                title="刪除章節"
                              >
                                <Trash2 size={12} />
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); onCreatePost(proj.id, chap.id); if(window.innerWidth < 768) setIsMobileOpen(false); }}
                                className="text-emerald-500 hover:bg-emerald-500/10 p-1 rounded"
                                title="新增文章"
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                          </div>

                          {/* Posts (Leaf-level) */}
                          {isChapExpanded && (
                            <div className="ml-4 border-l border-slate-700/50 pl-2 mt-1 space-y-0.5">
                              {chapterPosts.length === 0 && (
                                <div className="text-[10px] text-slate-600 p-1 italic">暫無文章</div>
                              )}
                              {chapterPosts.map(post => (
                                <button
                                  key={post.id}
                                  onClick={() => { onSelectPost(post); if(window.innerWidth < 768) setIsMobileOpen(false); }}
                                  className={`w-full text-left p-1.5 text-xs rounded truncate transition-colors flex items-center gap-2 ${selectedPost?.id === post.id ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
                                >
                                  <FileText size={12} />
                                  {post.title}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Add Chapter Button */}
                    <button 
                      onClick={() => handleAddChapterClick(proj.id)}
                      className="flex items-center gap-2 text-xs text-emerald-500 hover:text-emerald-400 px-2 py-2 mt-2 w-full hover:bg-slate-800 rounded transition-colors"
                    >
                      <Plus size={14} /> 新增章節
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Create Project Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-900">
          <form onSubmit={handleCreateProjectSubmit} className="relative">
            <input 
              ref={inputRef}
              type="text" 
              placeholder="新增專案..." 
              className="w-full bg-slate-800 text-slate-200 text-sm rounded-md pl-8 pr-2 py-2 border border-slate-700 focus:border-emerald-500 outline-none"
            />
            <FolderPlus size={14} className="absolute left-2.5 top-3 text-slate-500" />
          </form>
        </div>
      </div>
      
      {/* Overlay for mobile */}
      {isMobileOpen && <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setIsMobileOpen(false)} />}
    </>
  );
};

// 2. 區塊編輯器 (Block Editor) - 全寬度修正版
const BlockEditor = ({ post, chapters, onSave, onDelete }) => {
  const initialBlocks = post.blocks || [
    { type: 'text', content: post.content || '' },
    ...(post.image ? [{ type: 'image', content: post.image }] : [])
  ];

  const [title, setTitle] = useState(post.title);
  const [blocks, setBlocks] = useState(initialBlocks);
  const [isSaving, setIsSaving] = useState(false);

  // 當選擇的文章改變時，重置編輯器狀態
  useEffect(() => {
    setTitle(post.title);
    setBlocks(post.blocks || [
      { type: 'text', content: post.content || '' },
      ...(post.image ? [{ type: 'image', content: post.image }] : [])
    ]);
  }, [post.id]);

  const addBlock = (index, type) => {
    const newBlock = { type, content: '' };
    const newBlocks = [...blocks];
    newBlocks.splice(index + 1, 0, newBlock);
    setBlocks(newBlocks);
  };

  const removeBlock = (index) => {
    if (blocks.length <= 1) return;
    const newBlocks = blocks.filter((_, i) => i !== index);
    setBlocks(newBlocks);
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
    } catch (e) {
      alert("圖片處理失敗");
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    const firstTextBlock = blocks.find(b => b.type === 'text');
    const previewContent = firstTextBlock ? firstTextBlock.content.slice(0, 100) : '';
    const firstImageBlock = blocks.find(b => b.type === 'image');
    const previewImage = firstImageBlock ? firstImageBlock.content : null;

    const postData = {
      ...post,
      title,
      blocks,
      content: previewContent,
      image: previewImage
    };
    await onSave(postData);
    setIsSaving(false);
  };

  // 取得章節名稱 (用於 Header 顯示)
  const currentChapterName = chapters.find(c => c.id === post.subChapter)?.name || "未知章節";

  return (
    // [Mod] 移除所有最大寬度限制 (max-w)，使用 w-full 佔滿剩餘空間
    <div className="w-full h-full p-6 md:p-10 pb-32">
      {/* 頂部工具列 */}
      <div className="flex justify-between items-center mb-6 sticky top-0 bg-white/90 backdrop-blur z-20 py-4 border-b border-slate-100">
        <div className="text-sm text-slate-500 flex items-center gap-2">
          <FolderOpen size={16} className="text-slate-400" />
          <span className="bg-slate-100 px-2 py-1 rounded font-medium text-slate-600">
             {currentChapterName}
          </span>
          <span className="text-slate-300">|</span>
          <span>{post.date}</span>
        </div>
        <div className="flex gap-2">
          <button onClick={() => onDelete(post.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"><Trash2 size={18} /></button>
          <button 
            onClick={handleSave} 
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50"
          >
            <Save size={18} /> {isSaving ? '儲存中...' : '儲存變更'}
          </button>
        </div>
      </div>

      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full text-3xl md:text-4xl font-bold text-slate-900 border-none outline-none placeholder:text-slate-300 bg-transparent mb-8"
        placeholder="請輸入文章標題..."
      />

      <div className="space-y-4">
        {blocks.map((block, index) => (
          <div key={index} className="group relative pl-0 md:pl-8 transition-all">
            <div className="absolute left-0 top-2 opacity-100 md:opacity-0 group-hover:opacity-100 flex flex-col gap-1 transition-opacity">
               <button onClick={() => moveBlock(index, -1)} className="p-1 text-slate-300 hover:text-slate-600"><MoveUp size={14} /></button>
               <button onClick={() => moveBlock(index, 1)} className="p-1 text-slate-300 hover:text-slate-600"><MoveDown size={14} /></button>
               <button onClick={() => removeBlock(index)} className="p-1 text-slate-300 hover:text-red-500"><X size={14} /></button>
            </div>

            <div className="min-h-[60px] relative">
              {block.type === 'text' ? (
                <textarea
                  value={block.content}
                  onChange={(e) => updateBlock(index, e.target.value)}
                  placeholder="輸入文字內容..."
                  className="w-full min-h-[100px] resize-y bg-transparent border-none outline-none text-lg text-slate-700 leading-relaxed focus:bg-slate-50/50 rounded p-2"
                  style={{ height: 'auto' }}
                  onInput={(e) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                />
              ) : (
                <div className="relative group/img bg-slate-50 border border-slate-200 rounded-lg p-2 flex justify-center items-center min-h-[200px]">
                  {block.content ? (
                    <>
                      <img src={block.content} alt="Content" className="max-w-full max-h-[500px] object-contain rounded" />
                      <label className="absolute inset-0 bg-black/50 flex items-center justify-center text-white opacity-0 group-hover/img:opacity-100 cursor-pointer transition-opacity rounded-lg">
                        更換圖片
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(index, e.target.files[0])} />
                      </label>
                    </>
                  ) : (
                     <label className="flex flex-col items-center gap-2 cursor-pointer text-slate-400 hover:text-emerald-500 py-10">
                       <ImageIcon size={32} />
                       <span>點擊上傳圖片</span>
                       <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(index, e.target.files[0])} />
                     </label>
                  )}
                </div>
              )}
            </div>

            <div className="h-4 group-hover:h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-10">
               <div className="flex gap-2 bg-slate-800 text-white rounded-full px-3 py-1 scale-75 group-hover:scale-100 shadow-lg">
                 <button onClick={() => addBlock(index, 'text')} className="flex items-center gap-1 hover:text-emerald-400"><Type size={14} /> 文字</button>
                 <div className="w-px bg-slate-600"></div>
                 <button onClick={() => addBlock(index, 'image')} className="flex items-center gap-1 hover:text-emerald-400"><ImageIcon size={14} /> 圖片</button>
               </div>
            </div>
          </div>
        ))}
        
        {blocks.length === 0 && (
           <div className="flex gap-4 justify-center py-10">
              <button onClick={() => addBlock(-1, 'text')} className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50">
                 <Type size={18} /> 新增文字
              </button>
              <button onClick={() => addBlock(-1, 'image')} className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50">
                 <ImageIcon size={18} /> 新增圖片
              </button>
           </div>
        )}
      </div>
    </div>
  );
};

// 3. 空狀態 (Empty State)
const EmptyState = () => (
  <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 text-slate-400 p-8">
    <div className="w-24 h-24 bg-slate-200 rounded-full flex items-center justify-center mb-6">
      <Layout size={48} className="text-slate-400" />
    </div>
    <h2 className="text-2xl font-bold text-slate-700 mb-2">開始寫作</h2>
    <p className="max-w-md text-center mb-8">選擇左側專案，新增一個章節與文章。</p>
  </div>
);

// --- Main App Component ---
export default function App() {
  const [projects, setProjects] = useState([]);
  const [chapters, setChapters] = useState([]); // 新增：章節狀態
  const [posts, setPosts] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);

  // Data Fetching
  useEffect(() => {
    if (!db) return;

    // 1. Fetch Projects
    const qProjects = query(collection(db, "projects"), orderBy("createdAt", "desc"));
    const unsubProjects = onSnapshot(qProjects, (snapshot) => {
      setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // 2. Fetch Chapters (Dynamic)
    const qChapters = query(collection(db, "chapters"), orderBy("createdAt", "asc"));
    const unsubChapters = onSnapshot(qChapters, (snapshot) => {
      setChapters(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // 3. Fetch Posts
    const qPosts = query(collection(db, "posts"), orderBy("date", "desc"));
    const unsubPosts = onSnapshot(qPosts, (snapshot) => {
      setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubProjects(); unsubChapters(); unsubPosts(); };
  }, []);

  // Handlers - Project
  const handleCreateProject = async (name) => {
    try {
      await addDoc(collection(db, "projects"), {
        name,
        createdAt: new Date().toISOString()
      });
    } catch (e) { alert("建立專案失敗"); }
  };

  const handleDeleteProject = async (id, e) => {
    e.stopPropagation();
    if (window.confirm("確定刪除此專案？(其下章節與文章需手動清理)")) {
      await deleteDoc(doc(db, "projects", id));
      if (selectedPost?.projectId === id) setSelectedPost(null);
    }
  };

  // Handlers - Chapter (New)
  const handleCreateChapter = async (projectId, name) => {
    try {
      await addDoc(collection(db, "chapters"), {
        projectId,
        name,
        createdAt: new Date().toISOString()
      });
    } catch (e) { alert("建立章節失敗"); }
  };

  const handleEditChapter = async (chapterId, newName) => {
    try {
      await updateDoc(doc(db, "chapters", chapterId), { name: newName });
    } catch (e) { alert("修改章節失敗"); }
  };

  const handleDeleteChapter = async (chapterId) => {
    if (window.confirm("確定刪除此章節？(其下文章不會刪除，但會隱藏)")) {
      await deleteDoc(doc(db, "chapters", chapterId));
    }
  };

  // Handlers - Post
  const handleCreatePost = (projectId, chapterId) => {
    const newPost = {
      id: 'temp-' + Date.now(),
      title: '未命名文章',
      projectId,
      subChapter: chapterId, // 這裡現在存的是 chapterId
      date: new Date().toISOString().split('T')[0],
      blocks: [{ type: 'text', content: '' }],
      isNew: true
    };
    setSelectedPost(newPost);
  };

  const handleSavePost = async (postData) => {
    const { isNew, id, ...data } = postData;
    try {
      if (isNew || id.startsWith('temp-')) {
        const docRef = await addDoc(collection(db, "posts"), data);
        setSelectedPost({ ...data, id: docRef.id });
      } else {
        await updateDoc(doc(db, "posts", id), data);
        setSelectedPost(postData);
      }
    } catch (e) {
      console.error(e);
      alert("儲存失敗");
    }
  };

  const handleDeletePost = async (id) => {
    if (id.startsWith('temp-')) {
      setSelectedPost(null);
      return;
    }
    if (window.confirm("確定刪除此文章？")) {
      await deleteDoc(doc(db, "posts", id));
      setSelectedPost(null);
    }
  };

  if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "YOUR_API_KEY") {
    return <div className="h-screen flex items-center justify-center">請設定 Firebase Config</div>;
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      <TreeSidebar 
        projects={projects} 
        chapters={chapters}
        posts={posts}
        selectedPost={selectedPost}
        onSelectPost={setSelectedPost}
        onCreateProject={handleCreateProject}
        onDeleteProject={handleDeleteProject}
        onCreateChapter={handleCreateChapter}
        onEditChapter={handleEditChapter}
        onDeleteChapter={handleDeleteChapter}
        onCreatePost={handleCreatePost}
      />

      <main className="flex-1 h-full overflow-y-auto bg-white relative">
        {selectedPost ? (
          <BlockEditor 
            post={selectedPost} 
            chapters={chapters}
            onSave={handleSavePost}
            onDelete={handleDeletePost}
          />
        ) : (
          <EmptyState />
        )}
      </main>
    </div>
  );
}