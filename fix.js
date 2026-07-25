const fs = require('fs');
let c = fs.readFileSync('src/components/layout/WebViewContainer.jsx', 'utf8');

const targetStyle = `style={{ 
            top: '0px',
            height: '100%',
            left: isVisible ? '0px' : '-9999px',
            zIndex: isVisible ? 10 : 0,
            opacity: isVisible ? 1 : 0
        }}`;

const newStyle = `style={{ 
            top: '0px',
            left: '0px',
            width: isVisible ? '100%' : '0px',
            height: isVisible ? '100%' : '0px',
            zIndex: isVisible ? 10 : -1,
            opacity: isVisible ? 1 : 0,
            pointerEvents: isVisible ? 'auto' : 'none'
        }}`;

c = c.replace(targetStyle, newStyle);
fs.writeFileSync('src/components/layout/WebViewContainer.jsx', c);
console.log('Replaced successfully');
