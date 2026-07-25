const fs = require('fs');

let text = fs.readFileSync('src/components/modals/HistoryModal.jsx', 'utf-8');

text = text.replace(/import useUIStore from '\.\.\/\.\.\/store\/useUIStore';/, `import useUIStore from '../../store/useUIStore';\nimport useHistoryStore from '../../store/useHistoryStore';`);

text = text.replace(/\/\/ Move mockHistoryDB here[\s\S]*?];/, '');

text = text.replace(/const HistoryModal = \(\) => \{[\s\S]*?useUIStore\(\);/, `const HistoryModal = () => {
    const {
        activeModal,
        isModalClosing,
        closeModal,
        historySearchQuery,
        setHistorySearchQuery
    } = useUIStore();
    const history = useHistoryStore(state => state.history);
    const clearHistory = useHistoryStore(state => state.clearHistory);`);

// Replace occurrences of mockHistoryDB with history
text = text.replace(/mockHistoryDB/g, 'history');

// Add clear history button
text = text.replace(/<div className="flex items-center gap-3">/, `<div className="flex items-center gap-3">\n                        <button onClick={clearHistory} className="px-3 py-1.5 text-xs font-bold bg-white/5 hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-colors">Clear</button>`);


fs.writeFileSync('src/components/modals/HistoryModal.jsx', text);
console.log('Fixed HistoryModal');
