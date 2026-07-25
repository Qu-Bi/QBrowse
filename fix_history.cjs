const fs = require('fs');

const path = 'src/components/modals/HistoryModal.jsx';
let c = fs.readFileSync(path, 'utf8');

// Replace the rendering block for history
const target = `                    ) : (
                        <div className="animate-pop-in space-y-6">
                            <div>
                                <h3 className="text-xs font-bold uppercase text-white/30 tracking-widest mb-3 pl-1">Today</h3>
                                <div className="flex flex-col gap-2">
                                    {history.slice(0, 3).map((item, i) => (
                                        <div key={item.url} className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition group cursor-pointer border border-transparent hover:border-white/5 animate-pop-in" style={{ animationFillMode: 'both', animationDelay: \`\${i * 0.04}s\` }}>
                                            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/40 group-hover-text-accent transition overflow-hidden">
                                                <img src={\`https://www.google.com/s2/favicons?sz=64&domain=\${item.url}\`} alt="icon" className="w-4 h-4 opacity-70 group-hover:opacity-100 transition-opacity" onError={(e) => e.target.style.display = 'none'} />
                                            </div>
                                            <div className="flex flex-col flex-1">
                                                <span className="text-sm font-semibold text-white/90 group-hover:text-white transition">{item.title}</span>
                                                <span className="text-xs text-white/40">{item.url}</span>
                                            </div>
                                            <span className="text-xs text-white/20 font-mono opacity-0 group-hover:opacity-100 transition">Visits: {item.visits}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <h3 className="text-xs font-bold uppercase text-white/30 tracking-widest mb-3 pl-1">Yesterday</h3>
                                <div className="flex flex-col gap-2">
                                    {history.slice(3, 5).map((item, i) => (
                                        <div key={item.url} className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition group cursor-pointer border border-transparent hover:border-white/5 animate-pop-in" style={{ animationFillMode: 'both', animationDelay: \`\${(i + 3) * 0.04}s\` }}>
                                            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/40 group-hover-text-accent transition overflow-hidden">
                                                <img src={\`https://www.google.com/s2/favicons?sz=64&domain=\${item.url}\`} alt="icon" className="w-4 h-4 opacity-70 group-hover:opacity-100 transition-opacity" onError={(e) => e.target.style.display = 'none'} />
                                            </div>
                                            <div className="flex flex-col flex-1">
                                                <span className="text-sm font-semibold text-white/90 group-hover:text-white transition">{item.title}</span>
                                                <span className="text-xs text-white/40">{item.url}</span>
                                            </div>
                                            <span className="text-xs text-white/20 font-mono opacity-0 group-hover:opacity-100 transition">Visits: {item.visits}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}`;

const replacement = `                    ) : (() => {
                        const groups = {};
                        const now = new Date();
                        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
                        const yesterday = today - 86400000;
                        
                        history.forEach(item => {
                            const time = item.lastVisit;
                            let groupName = 'Older';
                            if (time >= today) {
                                groupName = 'Today';
                            } else if (time >= yesterday) {
                                groupName = 'Yesterday';
                            } else if (time >= today - 86400000 * 7) {
                                groupName = 'Last 7 Days';
                            }
                            
                            if (!groups[groupName]) groups[groupName] = [];
                            groups[groupName].push(item);
                        });
                        
                        const groupedHistory = [
                            { name: 'Today', items: groups['Today'] || [] },
                            { name: 'Yesterday', items: groups['Yesterday'] || [] },
                            { name: 'Last 7 Days', items: groups['Last 7 Days'] || [] },
                            { name: 'Older', items: groups['Older'] || [] },
                        ].filter(g => g.items.length > 0);

                        let globalIndex = 0;

                        return (
                            <div className="animate-pop-in space-y-6">
                                {groupedHistory.map(group => (
                                    <div key={group.name}>
                                        <h3 className="text-xs font-bold uppercase text-white/30 tracking-widest mb-3 pl-1">{group.name}</h3>
                                        <div className="flex flex-col gap-2">
                                            {group.items.map((item) => {
                                                const i = globalIndex++;
                                                return (
                                                <div key={item.url + i} className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition group cursor-pointer border border-transparent hover:border-white/5 animate-pop-in" style={{ animationFillMode: 'both', animationDelay: \`\${i * 0.03}s\` }}>
                                                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/40 group-hover-text-accent transition overflow-hidden">
                                                        <img src={\`https://www.google.com/s2/favicons?sz=64&domain=\${item.url}\`} alt="icon" className="w-4 h-4 opacity-70 group-hover:opacity-100 transition-opacity" onError={(e) => e.target.style.display = 'none'} />
                                                    </div>
                                                    <div className="flex flex-col flex-1">
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-sm font-semibold text-white/90 group-hover:text-white transition truncate max-w-[400px]">{item.title}</span>
                                                            <span className="text-[10px] text-white/30 font-mono whitespace-nowrap">{new Date(item.lastVisit).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                                        </div>
                                                        <span className="text-xs text-white/40 truncate">{item.url}</span>
                                                    </div>
                                                    <span className="text-xs text-white/20 font-mono opacity-0 group-hover:opacity-100 transition">Visits: {item.visits}</span>
                                                </div>
                                            )})}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        );
                    })()}`;

c = c.replace(target, replacement);
fs.writeFileSync(path, c);
console.log('Replaced successfully');
