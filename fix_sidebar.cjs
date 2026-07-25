const fs = require('fs');

let c = fs.readFileSync('src/components/layout/Sidebar.jsx', 'utf8');

c = c.replace('<div className="flex gap-2 p-5 border-b border-[color:var(--sidebar-border)] items-center justify-between">', '<div style={{ WebkitAppRegion: \'drag\' }} className="flex gap-2 p-5 border-b border-[color:var(--sidebar-border)] items-center justify-between">');
c = c.replace('<div className="flex gap-2">', '<div style={{ WebkitAppRegion: \'no-drag\' }} className="flex gap-2">');
c = c.replace('<div className="hidden md:flex gap-3 text-[color:var(--sidebar-text-muted)]">', '<div style={{ WebkitAppRegion: \'no-drag\' }} className="hidden md:flex gap-3 text-[color:var(--sidebar-text-muted)]">');

fs.writeFileSync('src/components/layout/Sidebar.jsx', c);
console.log('Fixed sidebar dragging');
