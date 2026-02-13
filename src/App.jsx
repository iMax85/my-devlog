import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, Plus, Trash2, Edit3, Save, X, 
  Search, Menu, ChevronRight, Layout, Upload, 
  FolderPlus, Folder, Layers, FileText, HelpCircle, AlertCircle, Image as ImageIcon
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

// --- Constants ---
const SUB_CHAPTERS = [
  { id: 'concept', name: '觀念說明', icon: BookOpen },
  { id: 'implementation', name: '實作範例', icon: Code },
  { id: 'qa', name: 'QA & Debug', icon: HelpCircle },
];

// Fallback icon
function Code({size, className}) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="16 18 22 12 16 6"></polyline>
      <polyline points="8 6 2 12 8 18"></polyline>
    </svg>
  );
}

export default function App() {
  // --- Global State ---
  const [projects, setProjects] = useState([]);
  const [posts, setPosts] = useState([]);
  
  // --- UI State ---
  const [view, setView] = useState('dashboard');
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedSubChapter, setSelectedSubChapter] = useState('concept');
  const [selectedPost, setSelectedPost] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  
  // [FIX] 改用 useRef 來抓取輸入框的值，解決中文輸入法打字會因為 Re-render 而中斷的問題
  const newProjectInputRef = useRef(null);

  // --- Form State ---
  const [formData, setFormData] = useState({
    title: '',
    subChapter: 'concept',
    content: '',
    image: null
  });

  // --- Data Fetching ---
  useEffect(() => {
    if (!db) return;

    const qProjects = query(collection(db, "projects"), orderBy("createdAt", "desc"));
    const unsubProjects = onSnapshot(qProjects, (snapshot) => {
      setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const qPosts = query(collection(db, "posts"), orderBy("date", "desc"));
    const unsubPosts = onSnapshot(qPosts, (snapshot) => {
      setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubProjects(); unsubPosts(); };
  }, []);

  const currentProjectPosts = posts.filter(p => 
    selectedProject && p.projectId === selectedProject.id && p.subChapter === selectedSubChapter
  );

  // --- Image Compression Logic ---
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

  // --- Actions ---
  const handleCreateProject = async (e) => {
    e.preventDefault();
    // [FIX] 從 ref 讀取當前的值
    const projectName = newProjectInputRef.current?.value;

    if (!projectName || !projectName.trim()) return;
    
    try {
      await addDoc(collection(db, "projects"), {
        name: projectName,
        createdAt: new Date().toISOString()
      });
      // [FIX] 清空 input 並關閉視窗
      if(newProjectInputRef.current) newProjectInputRef.current.value = '';
      setShowNewProjectModal(false);
    } catch (error) {
      alert("新增失敗: " + error.message);
    }
  };

  const handleDeleteProject = async (projectId, e) => {
    e.stopPropagation();
    if (window.confirm('確定刪除專案？(注意：相關文章不會自動刪除)')) {
      await deleteDoc(doc(db, "projects", projectId));
      if (selectedProject?.id === projectId) {
        setSelectedProject(null);
        setView('dashboard');
      }
    }
  };

  const handleSavePost = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const postPayload = {
        title: formData.title,
        subChapter: formData.subChapter,
        content: formData.content,
        image: formData.image,
        projectId: selectedProject.id,
        date: new Date().toISOString().split('T')[0]
      };

      if (view === 'create_post') {
        await addDoc(collection(db, "posts"), postPayload);
      } else if (view === 'edit_post') {
        await updateDoc(doc(db, "posts", formData.id), postPayload);
      }

      setView('project');
      setFormData({ title: '', subChapter: 'concept', content: '', image: null });
    } catch (error) {
      console.error(error);
      if (error.code === 'invalid-argument') {
        alert("儲存失敗：圖片可能太大了，請嘗試更小的圖片");
      } else {
        alert("儲存失敗，請檢查 Console");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePost = async (postId) => {
    if (window.confirm('確定刪除此文章？')) {
      await deleteDoc(doc(db, "posts", postId));
      setView('project');
    }
  };

  const prepareEdit = (post) => {
    setFormData({
      id: post.id,
      title: post.title,
      subChapter: post.subChapter,
      content: post.content,
      image: post.image
    });
    setView('edit_post');
  };

  const handleImageChange = async (e) => {
    if (e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const compressedBase64 = await compressImage(file);
        setFormData({ ...formData, image: compressedBase64 });
      } catch (err) {
        console.error("圖片處理失敗", err);
        alert("圖片處理失敗");
      }
    }
  };

  // --- UI Components ---

  const Sidebar = () => (
    <div className={`fixed inset-y-0 left-0 z-30 w-64 bg-slate-900 text-slate-100 transform transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 flex flex-col shadow-xl`}>
      <div className="p-6 border-b border-slate-800 flex justify-between items-center">
        <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-300 bg-clip-text text-transparent">
          DevLog 輕量版
        </h1>
        <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-400 hover:text-white"><X size={20} /></button>
      </div>
      <div className="p-4 flex-1 overflow-y-auto">
        <div className="flex items-center justify-between mb-4 px-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">專案列表</span>
          <button onClick={() => setShowNewProjectModal(true)} className="text-emerald-400 hover:text-emerald-300 p-1 hover:bg-slate-800 rounded transition-colors"><FolderPlus size={18} /></button>
        </div>
        <div className="space-y-1">
          <button onClick={() => { setSelectedProject(null); setView('dashboard'); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${!selectedProject ? 'bg-slate-800 text-emerald-400 font-medium' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}`}><Layout size={18} /> 總覽儀表板</button>
          {projects.map(proj => (
            <div key={proj.id} className="group relative flex items-center">
              <button onClick={() => { setSelectedProject(proj); setView('project'); setSelectedSubChapter('concept'); }} className={`flex-1 flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left truncate ${selectedProject?.id === proj.id ? 'bg-slate-800 text-emerald-400 font-medium' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}`}><Folder size={18} /> <span className="truncate">{proj.name}</span></button>
              <button onClick={(e) => handleDeleteProject(proj.id, e)} className="absolute right-2 p-1.5 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      </div>
      {showNewProjectModal && (
        <div className="absolute inset-0 z-50 bg-slate-900/95 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-2xl">
            <h3 className="text-white font-bold mb-3">建立新專案</h3>
            <form onSubmit={handleCreateProject}>
              {/* [FIX] 這裡改用 ref，移除 value 和 onChange，解決輸入法衝突 */}
              <input 
                ref={newProjectInputRef}
                autoFocus 
                type="text" 
                placeholder="專案名稱" 
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white mb-3 focus:ring-2 focus:ring-emerald-500 outline-none" 
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowNewProjectModal(false)} className="px-3 py-1.5 text-slate-400 text-sm hover:text-white">取消</button>
                <button type="submit" className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium">建立</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <div className="p-4 border-t border-slate-800 text-xs text-slate-500 text-center">No Storage Required</div>
    </div>
  );

  const SubChapterTabs = () => (
    <div className="flex border-b border-slate-200 bg-white px-6 sticky top-0 z-10">
      {SUB_CHAPTERS.map(sub => {
        const Icon = sub.icon;
        return (
          <button key={sub.id} onClick={() => setSelectedSubChapter(sub.id)} className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${selectedSubChapter === sub.id ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
            <Icon size={18} /> {sub.name}
          </button>
        );
      })}
    </div>
  );

  const Dashboard = () => (
    <div className="p-8 max-w-5xl mx-auto">
      <h2 className="text-3xl font-bold text-slate-800 mb-6">歡迎回到開發者知識庫</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="opacity-80 mb-2">總專案數</div>
          <div className="text-4xl font-bold">{projects.length}</div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="text-slate-500 mb-2">累積文章</div>
          <div className="text-4xl font-bold text-slate-800">{posts.length}</div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col justify-center items-center text-center">
          <p className="text-slate-500 mb-3">使用內建圖片壓縮技術</p>
          <button onClick={() => setShowNewProjectModal(true)} className="text-emerald-600 font-medium hover:underline">+ 建立一個新專案</button>
        </div>
      </div>
      <h3 className="text-xl font-bold text-slate-800 mb-4">最近更新</h3>
      <div className="space-y-3">
        {posts.slice(0, 5).map(post => {
          const proj = projects.find(p => p.id === post.projectId);
          return (
            <div key={post.id} onClick={() => { setSelectedProject(proj); setSelectedSubChapter(post.subChapter); setView('project'); }} className="flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-100 hover:shadow-md transition-all cursor-pointer">
              <div className={`w-2 h-12 rounded-full ${post.subChapter === 'concept' ? 'bg-blue-400' : post.subChapter === 'implementation' ? 'bg-amber-400' : 'bg-purple-400'}`}></div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{proj?.name || '未知'}</span>
                  <span className="text-xs text-slate-400">{post.date}</span>
                </div>
                <h4 className="font-bold text-slate-800">{post.title}</h4>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const ProjectView = () => (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-slate-200 px-8 py-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">{selectedProject.name}</h1>
            <p className="text-slate-500 text-sm">在這個專案中紀錄所有的開發細節</p>
          </div>
          <button onClick={() => { setFormData({ title: '', subChapter: selectedSubChapter, content: '', image: null }); setView('create_post'); }} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg shadow-lg shadow-emerald-200 transition-all font-medium"><Plus size={18} /> 新增{SUB_CHAPTERS.find(s => s.id === selectedSubChapter)?.name}</button>
        </div>
      </div>
      <SubChapterTabs />
      <div className="flex-1 overflow-auto p-8 bg-slate-50">
        {currentProjectPosts.length === 0 ? (
          <div className="text-center py-20 opacity-60">
            <Layers size={48} className="mx-auto mb-4 text-slate-300" />
            <p className="text-slate-500">這個章節還沒有任何內容</p>
          </div>
        ) : (
          <div className="grid gap-4 max-w-4xl mx-auto">
            {currentProjectPosts.map(post => (
              <div key={post.id} onClick={() => { setSelectedPost(post); setView('post_detail'); }} className="group bg-white p-5 rounded-xl border border-slate-200 hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer flex gap-4">
                {post.image && (
                   <div className="w-24 h-24 flex-shrink-0 bg-slate-100 rounded-lg overflow-hidden border border-slate-100">
                     <img src={post.image} alt="" className="w-full h-full object-cover" />
                   </div>
                )}
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-slate-800 mb-2 group-hover:text-emerald-600 transition-colors">{post.title}</h3>
                  <p className="text-slate-500 text-sm line-clamp-2">{post.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const Editor = () => (
    <div className="max-w-3xl mx-auto m-8 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
      <div className="border-b border-slate-100 p-4 flex justify-between items-center bg-slate-50">
        <h2 className="text-lg font-bold text-slate-800">
          {view === 'create_post' ? `新增：${SUB_CHAPTERS.find(s => s.id === formData.subChapter)?.name}` : '編輯文章'}
        </h2>
        <button onClick={() => setView('project')} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
      </div>
      
      <form onSubmit={handleSavePost} className="p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">標題</label>
          <input required className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="請輸入文章標題..." />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">所屬章節</label>
            <select className="w-full px-4 py-2 rounded-lg border border-slate-300 bg-white" value={formData.subChapter} onChange={e => setFormData({...formData, subChapter: e.target.value})}>
              {SUB_CHAPTERS.map(sub => <option key={sub.id} value={sub.id}>{sub.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">圖片 (自動壓縮)</label>
            <label className="flex items-center gap-2 w-full px-4 py-2 rounded-lg border border-slate-300 hover:border-emerald-500 cursor-pointer bg-white text-sm text-slate-500 hover:text-emerald-600 transition-colors">
              <Upload size={16} />
              {formData.image ? '更換圖片' : '選擇圖片'}
              <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
            </label>
          </div>
        </div>

        {formData.image && (
          <div className="relative h-48 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 group">
            <img src={formData.image} alt="Pre" className="w-full h-full object-contain" />
            <button type="button" onClick={() => setFormData({...formData, image: null})} className="absolute top-2 right-2 bg-red-500/80 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14}/></button>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">內容</label>
          <textarea required rows="12" className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-mono text-sm" value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} placeholder="支援純文字..." />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <button type="button" onClick={() => setView('project')} className="px-5 py-2.5 rounded-lg text-slate-600 hover:bg-slate-100">取消</button>
          <button type="submit" disabled={isLoading} className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/30 flex items-center gap-2 disabled:opacity-50">
            {isLoading ? '處理中...' : <><Save size={18} /> 儲存</>}
          </button>
        </div>
      </form>
    </div>
  );

  if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "YOUR_API_KEY") {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-900 text-white p-6 text-center">
        <AlertCircle size={64} className="text-emerald-400 mb-6" />
        <h1 className="text-3xl font-bold mb-4">請設定 Firebase</h1>
        <p className="max-w-md text-slate-400 mb-8">
          無需升級方案！請將您之前複製的 <code>firebaseConfig</code> 填入程式碼中即可使用。
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900">
      {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-20 md:hidden backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />}
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="md:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between sticky top-0 z-10">
          <button onClick={() => setIsSidebarOpen(true)} className="text-slate-600"><Menu size={24} /></button>
          <span className="font-bold text-lg text-slate-800">DevLog 輕量版</span>
          <div className="w-6" />
        </header>
        <main className="flex-1 overflow-auto scroll-smooth">
          {view === 'dashboard' && <Dashboard />}
          {view === 'project' && selectedProject && <ProjectView />}
          {(view === 'create_post' || view === 'edit_post') && <Editor />}
          {view === 'post_detail' && selectedPost && <PostDetail />}
        </main>
      </div>
    </div>
  );
}