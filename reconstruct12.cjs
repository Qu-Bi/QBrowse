const fs = require('fs');

let text = fs.readFileSync('src/components/layout/WebViewContainer.jsx', 'utf-8');

// I will overwrite the first few lines completely to fix the mangled code.
text = `import React, { useEffect, useRef, useState } from 'react';
import useTabStore from '../../store/useTabStore';
import useUIStore from '../../store/useUIStore';
import useHistoryStore from '../../store/useHistoryStore';

// We extract WebViewItem so we can freeze its initial URL 
// and use imperative loadURL() to avoid React src update bugs
const WebViewItem = ({ tab, isVisible, isActive, isSpaceActive, setSpaceTabs, zoomLevel, isForceDark, darkExclusions }) => {
    const wvRef = useRef(null);` + text.substring(text.indexOf('const [initialUrl] = useState(() => {'));

fs.writeFileSync('src/components/layout/WebViewContainer.jsx', text);
console.log('Fixed mangled WebViewContainer.jsx');
