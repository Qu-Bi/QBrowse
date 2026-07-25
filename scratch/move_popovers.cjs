const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/components/layout/MainFrame.jsx');
let content = fs.readFileSync(file, 'utf8');

// Find the start of the popovers
const startStr = '{(activePopover || isPopoverClosing) && (';
const startIdx = content.indexOf(startStr);

// Find the end of the popovers (just before the flex-1 w-full container)
const endStr = '<div className={`flex-1 w-full relative overflow-hidden transition-colors';
const endIdx = content.indexOf(endStr);

if (startIdx !== -1 && endIdx !== -1) {
    const popoversCode = content.substring(startIdx, endIdx);
    
    // Remove it from the original place
    content = content.substring(0, startIdx) + content.substring(endIdx);
    
    // Find the target container:
    // <div className={`relative w-full h-full overflow-hidden shadow-[0_10px_25px_rgba(0,0,0,0.1)] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] flex ${isFullscreen ? 'rounded-none border-none' : 'rounded-[2rem] border border-white/20'} ${isForceDark || isIncognito ? 'bg-black/60 backdrop-blur-3xl' : 'bg-white/60 backdrop-blur-3xl'}`}>
    
    const targetStr = '<Sidebar ';
    const targetIdx = content.indexOf(targetStr);
    
    if (targetIdx !== -1) {
        // Insert right before Sidebar
        content = content.substring(0, targetIdx) + popoversCode + '\n                    ' + content.substring(targetIdx);
        fs.writeFileSync(file, content);
        console.log("Successfully moved popovers.");
    } else {
        console.log("Could not find target container.");
    }
} else {
    console.log("Could not find popovers block.");
}
