const fs = require('fs');

let text = fs.readFileSync('src/components/features/Omnibox.jsx', 'utf-8');

text = text.replace(/const \[liveSuggestions, setLiveSuggestions\] = useState\(\[\]\);([\s\S]*?)const timer = setTimeout/, `const [liveSuggestions, setLiveSuggestions] = useState([]);

    useEffect(() => {
        if (!searchQuery || searchQuery.startsWith('>')) {
            setLiveSuggestions([]);
            return;
        }
        
        const fetchSuggestions = async () => {
            try {
                const suggestions = await window.electronAPI.fetchSuggestions(searchQuery);
                if (suggestions && suggestions.length > 0) {
                    setLiveSuggestions(suggestions);
                }
            } catch (e) {
                console.log(e);
            }
        };

        const timer = setTimeout`);

fs.writeFileSync('src/components/features/Omnibox.jsx', text);
console.log('Fixed Omnibox.jsx');
