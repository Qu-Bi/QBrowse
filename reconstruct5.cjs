const fs = require('fs');

let text = fs.readFileSync('src/components/features/Omnibox.jsx', 'utf-8');

// 1. Add import
text = text.replace(/import useTabStore from '\.\.\/\.\.\/store\/useTabStore';/, `import useTabStore from '../../store/useTabStore';\nimport useHistoryStore from '../../store/useHistoryStore';`);

// 2. Remove mockHistoryDB
text = text.replace(/const mockHistoryDB = \[[\s\S]*?\];/, '');

// 3. Add useHistoryStore to Omnibox component
text = text.replace(/const ghostTabs = useTabStore\(state => state\.ghostTabs\);/, `const ghostTabs = useTabStore(state => state.ghostTabs);\n    const historyStoreData = useHistoryStore(state => state.history);`);

// 4. Update getSmartPredictions to use historyStoreData
text = text.replace(/return mockHistoryDB/, `return historyStoreData`);

fs.writeFileSync('src/components/features/Omnibox.jsx', text);
console.log('Fixed Omnibox.jsx history');
