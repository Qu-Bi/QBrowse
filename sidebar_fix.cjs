const fs = require('fs');
let text = fs.readFileSync('src/components/layout/Sidebar.jsx', 'utf-8');

// 1. Add imports
text = text.replace("Volume2, Pin, Globe } from 'lucide-react';", "Volume2, Pin, Globe, FolderPlus, Check, Edit2, FolderOpen, ChevronRight } from 'lucide-react';");

// 2. Add useTabStore hooks
const hooksStr = `    const handleDropRoot = useTabStore(state => state.handleDropRoot);
    
    const folders = useTabStore(state => state.folders);
    const createFolder = useTabStore(state => state.createFolder);
    const renameFolder = useTabStore(state => state.renameFolder);
    const toggleFolder = useTabStore(state => state.toggleFolder);
    const renamingFolderId = useTabStore(state => state.renamingFolderId);
    const setRenamingFolderId = useTabStore(state => state.setRenamingFolderId);`;

text = text.replace('    const handleDropRoot = useTabStore(state => state.handleDropRoot);', hooksStr);

// 3. Render folder logic inside the tree
// Find Open Tabs block
const search1 = `<div
                            onDragOver={(e) => { e.preventDefault(); handleDragOver('root-personal'); }}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDropRoot(e, 'personal')}
                            className={\`flex items-center justify-between mb-2 pl-2 pr-1 mt-1 transition-all rounded-lg border \${dragOverItem === 'root-personal' ? 'border-accent border-dashed bg-accent-10 py-1' : 'border-transparent'}\`}
                        >
                            <h3 className="hidden md:block text-[10px] uppercase font-bold text-[color:var(--sidebar-text-muted)] tracking-widest">Open Tabs</h3>
                            <button onClick={handleNewTab} className="hidden md:flex text-[color:var(--sidebar-text-muted)] hover:text-accent transition p-1 hover:bg-[color:var(--sidebar-bg-hover)] rounded-md" title="New Tab (CMD+T)">
                                <Plus size={12} strokeWidth={2.5} />
                            </button>
                        </div>
                        {privateTabs.map(tab => renderTab(tab, 'personal'))}`;

const replace1 = `<div
                            onDragOver={(e) => { e.preventDefault(); handleDragOver('root-personal'); }}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDropRoot(e, 'personal')}
                            className={\`flex items-center justify-between mb-2 pl-2 pr-1 mt-1 transition-all rounded-lg border \${dragOverItem === 'root-personal' ? 'border-accent border-dashed bg-accent-10 py-1' : 'border-transparent'}\`}
                        >
                            <h3 className="hidden md:block text-[10px] uppercase font-bold text-[color:var(--sidebar-text-muted)] tracking-widest">Open Tabs</h3>
                            <div className="hidden md:flex gap-1">
                                <button onClick={() => {
                                    const id = createFolder('personal', 'New Folder');
                                    setRenamingFolderId(id);
                                }} className="text-[color:var(--sidebar-text-muted)] hover:text-accent transition p-1 hover:bg-[color:var(--sidebar-bg-hover)] rounded-md" title="New Folder">
                                    <FolderPlus size={12} strokeWidth={2.5} />
                                </button>
                                <button onClick={handleNewTab} className="text-[color:var(--sidebar-text-muted)] hover:text-accent transition p-1 hover:bg-[color:var(--sidebar-bg-hover)] rounded-md" title="New Tab (CMD+T)">
                                    <Plus size={12} strokeWidth={2.5} />
                                </button>
                            </div>
                        </div>
                        
                        {/* Render Folders */}
                        {folders.filter(f => f.spaceType === 'personal').map(folder => (
                            <div key={folder.id} className="mb-2">
                                <div 
                                    onDrop={(e) => handleDropFolder(e, 'personal', folder.id)}
                                    onDragOver={(e) => { e.preventDefault(); handleDragOver(folder.id); }}
                                    onDragLeave={handleDragLeave}
                                    className={\`group flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-semibold text-[color:var(--sidebar-text-normal)] hover:bg-[color:var(--sidebar-bg-hover)] cursor-pointer transition-colors \${dragOverItem === folder.id ? 'bg-[color:var(--sidebar-bg-active)] ring-1 ring-accent' : ''}\`}
                                    onClick={() => toggleFolder(folder.id)}
                                >
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <ChevronRight size={14} className={\`transition-transform \${folder.isOpen ? 'rotate-90' : ''}\`} />
                                        <FolderOpen size={14} className="text-accent flex-shrink-0" />
                                        {renamingFolderId === folder.id ? (
                                            <input 
                                                autoFocus
                                                defaultValue={folder.name}
                                                onBlur={(e) => { renameFolder(folder.id, e.target.value); setRenamingFolderId(null); }}
                                                onKeyDown={(e) => { if(e.key === 'Enter') { renameFolder(folder.id, e.target.value); setRenamingFolderId(null); } }}
                                                onClick={e => e.stopPropagation()}
                                                className="bg-black/20 text-white px-1.5 py-0.5 rounded outline-none w-full border border-white/20"
                                            />
                                        ) : (
                                            <span className="truncate">{folder.name}</span>
                                        )}
                                    </div>
                                    {!renamingFolderId && (
                                        <button onClick={(e) => { e.stopPropagation(); setRenamingFolderId(folder.id); }} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-black/20 rounded text-white/50 hover:text-white transition-all"><Edit2 size={12} /></button>
                                    )}
                                </div>
                                {folder.isOpen && (
                                    <div className="pl-6 border-l border-[color:var(--sidebar-border)] ml-3 mt-1 flex flex-col gap-0.5">
                                        {privateTabs.filter(t => t.folderId === folder.id).map(tab => renderTab(tab, 'personal'))}
                                    </div>
                                )}
                            </div>
                        ))}
                        
                        {/* Unfoldered tabs */}
                        {privateTabs.filter(t => !t.folderId).map(tab => renderTab(tab, 'personal'))}`;

text = text.replace(search1, replace1);

const search2 = `<div
                            onDragOver={(e) => { e.preventDefault(); handleDragOver('root-work'); }}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDropRoot(e, 'work')}
                            className={\`flex items-center justify-between mb-2 pl-2 pr-1 mt-1 transition-all rounded-lg border \${dragOverItem === 'root-work' ? 'border-blue-400 border-dashed bg-blue-500/10 py-1' : 'border-transparent'}\`}
                        >
                            <h3 className="hidden md:block text-[10px] uppercase font-bold text-[color:var(--sidebar-text-muted)] tracking-widest">Open Tabs</h3>
                            <button onClick={handleNewTab} className="hidden md:flex text-[color:var(--sidebar-text-muted)] hover:text-blue-400 transition p-1 hover:bg-[color:var(--sidebar-bg-hover)] rounded-md" title="New Tab (CMD+T)">
                                <Plus size={12} strokeWidth={2.5} />
                            </button>
                        </div>
                        {workTabs.map(tab => renderTab(tab, 'work'))}`;

const replace2 = `<div
                            onDragOver={(e) => { e.preventDefault(); handleDragOver('root-work'); }}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDropRoot(e, 'work')}
                            className={\`flex items-center justify-between mb-2 pl-2 pr-1 mt-1 transition-all rounded-lg border \${dragOverItem === 'root-work' ? 'border-blue-400 border-dashed bg-blue-500/10 py-1' : 'border-transparent'}\`}
                        >
                            <h3 className="hidden md:block text-[10px] uppercase font-bold text-[color:var(--sidebar-text-muted)] tracking-widest">Open Tabs</h3>
                            <div className="hidden md:flex gap-1">
                                <button onClick={() => {
                                    const id = createFolder('work', 'New Folder');
                                    setRenamingFolderId(id);
                                }} className="text-[color:var(--sidebar-text-muted)] hover:text-blue-400 transition p-1 hover:bg-[color:var(--sidebar-bg-hover)] rounded-md" title="New Folder">
                                    <FolderPlus size={12} strokeWidth={2.5} />
                                </button>
                                <button onClick={handleNewTab} className="text-[color:var(--sidebar-text-muted)] hover:text-blue-400 transition p-1 hover:bg-[color:var(--sidebar-bg-hover)] rounded-md" title="New Tab (CMD+T)">
                                    <Plus size={12} strokeWidth={2.5} />
                                </button>
                            </div>
                        </div>
                        
                        {/* Render Folders */}
                        {folders.filter(f => f.spaceType === 'work').map(folder => (
                            <div key={folder.id} className="mb-2">
                                <div 
                                    onDrop={(e) => handleDropFolder(e, 'work', folder.id)}
                                    onDragOver={(e) => { e.preventDefault(); handleDragOver(folder.id); }}
                                    onDragLeave={handleDragLeave}
                                    className={\`group flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-semibold text-[color:var(--sidebar-text-normal)] hover:bg-[color:var(--sidebar-bg-hover)] cursor-pointer transition-colors \${dragOverItem === folder.id ? 'bg-[color:var(--sidebar-bg-active)] ring-1 ring-blue-400' : ''}\`}
                                    onClick={() => toggleFolder(folder.id)}
                                >
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <ChevronRight size={14} className={\`transition-transform \${folder.isOpen ? 'rotate-90' : ''}\`} />
                                        <FolderOpen size={14} className="text-blue-400 flex-shrink-0" />
                                        {renamingFolderId === folder.id ? (
                                            <input 
                                                autoFocus
                                                defaultValue={folder.name}
                                                onBlur={(e) => { renameFolder(folder.id, e.target.value); setRenamingFolderId(null); }}
                                                onKeyDown={(e) => { if(e.key === 'Enter') { renameFolder(folder.id, e.target.value); setRenamingFolderId(null); } }}
                                                onClick={e => e.stopPropagation()}
                                                className="bg-black/20 text-white px-1.5 py-0.5 rounded outline-none w-full border border-white/20"
                                            />
                                        ) : (
                                            <span className="truncate">{folder.name}</span>
                                        )}
                                    </div>
                                    {!renamingFolderId && (
                                        <button onClick={(e) => { e.stopPropagation(); setRenamingFolderId(folder.id); }} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-black/20 rounded text-white/50 hover:text-white transition-all"><Edit2 size={12} /></button>
                                    )}
                                </div>
                                {folder.isOpen && (
                                    <div className="pl-6 border-l border-[color:var(--sidebar-border)] ml-3 mt-1 flex flex-col gap-0.5">
                                        {workTabs.filter(t => t.folderId === folder.id).map(tab => renderTab(tab, 'work'))}
                                    </div>
                                )}
                            </div>
                        ))}
                        
                        {/* Unfoldered tabs */}
                        {workTabs.filter(t => !t.folderId).map(tab => renderTab(tab, 'work'))}`;

text = text.replace(search2, replace2);

fs.writeFileSync('src/components/layout/Sidebar.jsx', text);
