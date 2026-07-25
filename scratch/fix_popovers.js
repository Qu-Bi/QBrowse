import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const file = path.join(__dirname, '../src/components/layout/MainFrame.jsx');
let content = fs.readFileSync(file, 'utf8');

const startStr = '{(activePopover || isPopoverClosing) && (';
const startIdx = content.indexOf(startStr);

const endStr = '<div className={`flex-1 w-full relative overflow-hidden transition-colors';
const endIdx = content.indexOf(endStr);

if (startIdx !== -1 && endIdx !== -1) {
    const popoversCode = content.substring(startIdx, endIdx);
    content = content.substring(0, startIdx) + content.substring(endIdx);
    
    // Look for the inner div inside flex-1
    const targetStr = "transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] flex ${isFullscreen ? 'rounded-none border-none' : 'rounded-[2rem] border border-white/20'}";
    const targetIdx = content.indexOf(targetStr);
    
    if (targetIdx !== -1) {
        // Find the closing bracket and angle bracket of the inner div
        const insertIdx = content.indexOf('>', targetIdx) + 1;
        content = content.substring(0, insertIdx) + '\n' + popoversCode + content.substring(insertIdx);
        fs.writeFileSync(file, content);
        console.log("Successfully moved popovers.");
    } else {
        console.log("Could not find target container.");
    }
} else {
    console.log("Could not find popovers block.");
}
