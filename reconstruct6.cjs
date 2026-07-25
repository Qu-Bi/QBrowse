const fs = require('fs');

let text = fs.readFileSync('src/components/layout/WebViewContainer.jsx', 'utf-8');

if (!text.includes('useHistoryStore')) {
    text = text.replace(/import useUIStore from '\.\.\/\.\.\/store\/useUIStore';/, `import useUIStore from '../../store/useUIStore';\nimport useHistoryStore from '../../store/useHistoryStore';\nimport useTabStore from '../../store/useTabStore';`);
}

text = text.replace(/const handleTitleUpdate = \(e\) => \{[\s\S]*?setSpaceTabs[\s\S]*?\};/, `const handleTitleUpdate = (e) => {
            setSpaceTabs(prev => prev.map(t => t.id === tab.id ? { ...t, title: e.title } : t));
            const currentSpace = useTabStore.getState().activeSpace;
            if (currentSpace !== 'ghost' && wv && typeof wv.getURL === 'function') {
                useHistoryStore.getState().addEntry(wv.getURL(), e.title);
            }
        };`);

fs.writeFileSync('src/components/layout/WebViewContainer.jsx', text);
console.log('Fixed WebViewContainer history');
