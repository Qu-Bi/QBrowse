const fs = require('fs');

let text = fs.readFileSync('src/hooks/useGlobalShortcuts.js', 'utf-8');

const tCaseReplacement = `                    case 't':
                        if (e && typeof e.preventDefault === 'function') e.preventDefault();
                        if (e && e.shiftKey) {
                            tabStore.reopenLastClosedTab();
                        } else {
                            tabStore.handleNewTab();
                        }
                        break;`;

text = text.replace(/case 't':\s+e\.preventDefault\(\);\s+tabStore\.handleNewTab\(\);\s+break;/g, tCaseReplacement);

text = text.replace(/case 't':\s+tabStore\.handleNewTab\(\);\s+break;/g, `case 't':
                            if (syntheticEvent && syntheticEvent.shiftKey) {
                                tabStore.reopenLastClosedTab();
                            } else {
                                tabStore.handleNewTab();
                            }
                            break;`);

fs.writeFileSync('src/hooks/useGlobalShortcuts.js', text);
console.log('Fixed useGlobalShortcuts');
