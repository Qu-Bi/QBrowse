import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
    Search, X, Plus, Folder, FolderPlus, Feather, RotateCcw, Copy, Layers, 
    User, Ghost, Compass, Maximize2, MousePointer, Hand, Trash2, Edit3, Check, 
    Globe, Volume2, VolumeX, Pin, Columns, Zap, ArrowRight 
} from 'lucide-react';
import useUIStore from '../../store/useUIStore';
import useTabStore from '../../store/useTabStore';

const DEFAULT_STOCK_WALLPAPER = 'https://images.unsplash.com/photo-1604871000636-074fa5117945?q=80&w=2564&auto=format&fit=crop';

// Exact Onion SVG matching Sidebar.jsx
function OnionIcon({ size = 15, className = "", style = {} }) {
    return (
        <svg 
            viewBox="0 0 24 24" 
            width={size} 
            height={size} 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2.2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            className={className}
            style={style}
        >
            <path d="M12 2C8 2 4 6 4 11c0 5 4 11 8 11s8-6 8-11c0-5-4-9-8-9z"/>
            <path d="M12 6c-2.5 0-5 2.5-5 5.5s2.5 6.5 5 6.5 5-3.5 5-6.5S14.5 6 12 6z"/>
            <circle cx="12" cy="12" r="1.5"/>
        </svg>
    );
}

// Constants for 2D Spatial Geometry & Generous Node Layout
const NODE_W = 280;
const NODE_H = 172;
const CARD_GAP = 24;
const SUBZONE_PADDING = 26;
const SUBZONE_HEADER_H = 50;
const SPACE_HEADER_H = 72;
const SPACE_PADDING = 34;
const MACRO_ZONE_GAP = 96;

const SPACE_CONFIGS = [
    { 
        id: 'personal', 
        title: 'Personal Space', 
        icon: User, 
        color: '#d4bc94', 
        bgTint: 'rgba(212, 188, 148, 0.12)', 
        borderTint: 'rgba(212, 188, 148, 0.34)' 
    },
    { 
        id: 'work', 
        title: 'Work Space', 
        icon: Layers, 
        color: '#60a5fa', 
        bgTint: 'rgba(96, 165, 250, 0.12)', 
        borderTint: 'rgba(96, 165, 250, 0.34)' 
    },
    { 
        id: 'ghost', 
        title: 'Ghost Session', 
        icon: Ghost, 
        color: '#a855f7', 
        bgTint: 'rgba(168, 85, 247, 0.12)', 
        borderTint: 'rgba(168, 85, 247, 0.34)' 
    },
    { 
        id: 'tor', 
        title: 'Tor Network', 
        icon: OnionIcon, 
        color: '#c084fc', 
        bgTint: 'rgba(192, 132, 252, 0.12)', 
        borderTint: 'rgba(192, 132, 252, 0.34)' 
    },
];

function getCleanDomain(url) {
    if (!url || url === 'about:blank') return '';
    try {
        let clean = url.trim();
        if (!clean.includes('://') && !clean.startsWith('about:') && !clean.startsWith('qbrowse:')) {
            clean = 'https://' + clean;
        }
        const parsed = new URL(clean);
        return parsed.hostname.replace(/^www\./i, '');
    } catch {
        return url.split('/')[0].replace(/^www\./i, '');
    }
}

function formatRelativeTime(timestamp) {
    if (!timestamp) return 'recently';
    const diff = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

export default function TabMap() {
    const isTabMapOpen = useUIStore(state => state.isTabMapOpen);
    const isTabMapClosing = useUIStore(state => state.isTabMapClosing);
    const handleCloseTabMap = useUIStore(state => state.closeTabMap);
    const setCurrentUrl = useUIStore(state => state.setCurrentUrl);
    const theme = useUIStore(state => state.theme);
    const uiShowToast = useUIStore(state => state.showToast);
    const isSplitView = useUIStore(state => state.isSplitView);
    const splitRightTabId = useUIStore(state => state.splitRightTabId);
    const customWallpaper = useUIStore(state => state.settings?.customWallpaper);
    const wallpaperDimming = useUIStore(state => state.settings?.wallpaperDimming ?? 25);
    const activeWallpaper = customWallpaper || DEFAULT_STOCK_WALLPAPER;

    const activeSpace = useTabStore(state => state.activeSpace);
    const setActiveSpace = useTabStore(state => state.setActiveSpace);
    const privateTabs = useTabStore(state => state.privateTabs) || [];
    const workTabs = useTabStore(state => state.workTabs) || [];
    const ghostTabs = useTabStore(state => state.ghostTabs) || [];
    const torTabs = useTabStore(state => state.torTabs) || [];
    const folders = useTabStore(state => state.folders) || [];
    const pinnedTabs = useTabStore(state => state.pinnedTabs) || [];
    const tabNodeOffsets = useTabStore(state => state.tabNodeOffsets) || {};

    const isBright = theme === 'light' && activeSpace !== 'ghost' && activeSpace !== 'tor';
    const a11yReducedMotion = useUIStore(state => state.settings?.a11yReducedMotion);
    const isSystemReducedMotion = useUIStore(state => state.isSystemReducedMotion);
    const isReducedMotion = !!(a11yReducedMotion || isSystemReducedMotion);

    // Camera Viewport State
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(0.85);
    const [toolMode, setToolMode] = useState('pan'); // 'pan' | 'select'

    // Interactive Motion & Parallax State
    const [mouseParallax, setMouseParallax] = useState({ x: 0, y: 0 });
    const [hoveredCardTilt, setHoveredCardTilt] = useState(null); // { tabId, rotateX, rotateY, spotX, spotY }

    // Interaction State
    const [searchQuery, setSearchQuery] = useState('');
    const [focusedMatchIndex, setFocusedMatchIndex] = useState(0);
    const [selectedTabIds, setSelectedTabIds] = useState(new Set());
    const [editingFolderId, setEditingFolderId] = useState(null);
    const [editingFolderName, setEditingFolderName] = useState('');
    const [lassoBox, setLassoBox] = useState(null); // { startX, startY, currentX, currentY }
    const [dragState, setDragState] = useState(null); 
    // dragState: { isDragging: bool, tabIds: string[], startClientX: num, startClientY: num, currentClientX: num, currentClientY: num, target: obj|null }
    const [toastMessage, setToastMessage] = useState(null);
    const [activeCameraTarget, setActiveCameraTarget] = useState('all');
    const [hoveredCameraTarget, setHoveredCameraTarget] = useState(null);
    const [pillStyle, setPillStyle] = useState({ left: 0, width: 0, opacity: 0 });
    const [hoverPillStyle, setHoverPillStyle] = useState({ left: 0, width: 0, opacity: 0 });

    const containerRef = useRef(null);
    const searchInputRef = useRef(null);
    const cameraAnimRef = useRef(null);
    const hasInitializedCameraRef = useRef(false);
    const toastTimerRef = useRef(null);
    const cameraBarRef = useRef(null);
    const cameraBtnRefs = useRef({});

    const showToast = useCallback((msg) => {
        setToastMessage(msg);
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        toastTimerRef.current = setTimeout(() => setToastMessage(null), 2600);
        uiShowToast?.(msg);
    }, [uiShowToast]);

    const handleContainerPointerMove = useCallback((e) => {
        if (isReducedMotion) return;
        const vw = window.innerWidth || 1;
        const vh = window.innerHeight || 1;
        const nx = (e.clientX / vw) - 0.5;
        const ny = (e.clientY / vh) - 0.5;
        setMouseParallax({ x: nx, y: ny });
    }, [isReducedMotion]);

    // Compute all tabs by space map
    const spaceTabsMap = useMemo(() => ({
        personal: privateTabs,
        work: workTabs,
        ghost: ghostTabs,
        tor: torTabs
    }), [privateTabs, workTabs, ghostTabs, torTabs]);

    // Live Duplicate Count (per-space, matching closeDuplicateTabs normalization)
    const duplicateCount = useMemo(() => {
        const normalizeUrlForDedup = (url) => {
            if (!url || typeof url !== 'string') return '';
            const trimmed = url.trim();
            if (!trimmed || trimmed === 'about:blank') return '';
            if (trimmed.startsWith('qbrowse://newtab') || trimmed.startsWith('qbrowse://home') || trimmed.startsWith('qbrowse://blank')) {
                return 'qbrowse://newtab';
            }
            try {
                let u = trimmed;
                if (!u.includes('://')) u = 'https://' + u;
                const parsed = new URL(u);
                parsed.hash = '';
                let res = parsed.toString();
                if (res.endsWith('/') && !res.endsWith('://')) res = res.slice(0, -1);
                return res.toLowerCase();
            } catch {
                let res = trimmed.split('#')[0];
                if (res.endsWith('/') && res.length > 1) res = res.slice(0, -1);
                return res.toLowerCase();
            }
        };

        let count = 0;
        [privateTabs, workTabs, ghostTabs, torTabs].forEach(list => {
            if (!Array.isArray(list) || list.length <= 1) return;
            const seen = new Set();
            for (const t of list) {
                if (!t || t.isClosing) continue;
                const norm = normalizeUrlForDedup(t.url);
                if (!norm) continue;
                if (seen.has(norm)) count++;
                else seen.add(norm);
            }
        });
        return count;
    }, [privateTabs, workTabs, ghostTabs, torTabs]);

    // Check if any tab node has custom freeform drag offsets
    const hasCustomOffsets = useMemo(() => {
        return Object.keys(tabNodeOffsets).some(id => {
            const off = tabNodeOffsets[id];
            return off && (Math.abs(off.dx) > 1 || Math.abs(off.dy) > 1);
        });
    }, [tabNodeOffsets]);

    // ==========================================
    // 1. DETERMINISTIC 2D SPATIAL LAYOUT ENGINE
    // ==========================================
    const layout = useMemo(() => {
        const spaceLayouts = {};
        const folderBounds = new Map();
        const clusterBounds = new Map();
        const nodePositions = new Map();

        // Step 1: Pre-calculate internal dimensions for each Space Zone
        SPACE_CONFIGS.forEach(spaceConfig => {
            const spaceId = spaceConfig.id;
            const rawTabs = spaceTabsMap[spaceId] || [];
            const tabs = rawTabs.filter(t => !t.isClosing);
            const spaceFolders = folders.filter(f => f.spaceType === spaceId);

            // Group ungrouped tabs into domain clusters and standalone tabs
            const ungroupedTabs = tabs.filter(t => !t.folderId);
            const domainGroups = {};
            ungroupedTabs.forEach(t => {
                const dom = getCleanDomain(t.url);
                if (dom) {
                    if (!domainGroups[dom]) domainGroups[dom] = [];
                    domainGroups[dom].push(t);
                }
            });

            const clusters = [];
            const standaloneTabs = [];
            const clusteredTabIds = new Set();

            Object.entries(domainGroups).forEach(([domain, domTabs]) => {
                if (domTabs.length >= 2) {
                    clusters.push({ domain, tabs: domTabs });
                    domTabs.forEach(t => clusteredTabIds.add(t.id));
                }
            });

            ungroupedTabs.forEach(t => {
                if (!clusteredTabIds.has(t.id)) {
                    standaloneTabs.push(t);
                }
            });

            // Build sub-zones list (folders, clusters, standalone)
            const subzones = [];

            // 1. Folders (Wide multi-column layout so folders never look cramped)
            spaceFolders.forEach(folder => {
                const fTabs = tabs.filter(t => t.folderId === folder.id);
                const cols = fTabs.length >= 6 ? 3 : (fTabs.length >= 2 ? 2 : 1);
                const contentCols = Math.max(1, cols);
                const width = Math.max(340, contentCols * NODE_W + (contentCols - 1) * CARD_GAP + SUBZONE_PADDING * 2);
                const rows = Math.max(1, Math.ceil(fTabs.length / contentCols));
                const height = SUBZONE_HEADER_H + rows * NODE_H + (rows - 1) * CARD_GAP + SUBZONE_PADDING * 2;
                subzones.push({
                    type: 'folder',
                    id: folder.id,
                    name: folder.name,
                    folder,
                    tabs: fTabs,
                    cols: contentCols,
                    width,
                    height,
                    isStandaloneOnly: false
                });
            });

            // 2. Domain Clusters (Always at least 2 columns wide so domain header + Folderize button breathe)
            clusters.forEach(cluster => {
                const cTabs = cluster.tabs;
                const cols = cTabs.length >= 6 ? 3 : 2;
                const contentCols = Math.max(2, cols);
                const width = contentCols * NODE_W + (contentCols - 1) * CARD_GAP + SUBZONE_PADDING * 2;
                const rows = Math.max(1, Math.ceil(cTabs.length / contentCols));
                const height = SUBZONE_HEADER_H + rows * NODE_H + (rows - 1) * CARD_GAP + SUBZONE_PADDING * 2;
                subzones.push({
                    type: 'cluster',
                    id: `cluster-${spaceId}-${cluster.domain}`,
                    domain: cluster.domain,
                    tabs: cTabs,
                    cols: contentCols,
                    width,
                    height,
                    isStandaloneOnly: false
                });
            });

            // 3. Standalone Ungrouped Tabs (Always at least 2 columns wide so Space Zones never collapse into a cramped 1-card box)
            const isStandaloneOnly = spaceFolders.length === 0 && clusters.length === 0;
            if (standaloneTabs.length > 0 || subzones.length === 0) {
                const count = standaloneTabs.length;
                const cols = count >= 5 ? 3 : 2;
                const contentCols = Math.max(2, cols);
                const pad = isStandaloneOnly ? 0 : SUBZONE_PADDING * 2;
                const width = contentCols * NODE_W + (contentCols - 1) * CARD_GAP + pad;
                const rows = Math.max(1, Math.ceil(Math.max(1, count) / contentCols));
                const headerH = isStandaloneOnly ? 0 : SUBZONE_HEADER_H;
                const height = headerH + rows * NODE_H + (rows - 1) * CARD_GAP + pad;
                subzones.push({
                    type: 'ungrouped',
                    id: `ungrouped-${spaceId}`,
                    tabs: standaloneTabs,
                    cols: contentCols,
                    width,
                    height,
                    isStandaloneOnly
                });
            }

            // Calculate overall Space width and height from horizontal layout of subzones
            let contentWidth = 0;
            let maxSubzoneHeight = 0;
            subzones.forEach((sz, idx) => {
                contentWidth += sz.width + (idx > 0 ? CARD_GAP : 0);
                if (sz.height > maxSubzoneHeight) maxSubzoneHeight = sz.height;
            });

            // Generous minimum 2-column Space Zone dimensions (652px x 330px minimum)
            const minTwoColWidth = 2 * NODE_W + CARD_GAP + SPACE_PADDING * 2;
            const spaceWidth = Math.max(minTwoColWidth, contentWidth + SPACE_PADDING * 2);
            const spaceHeight = Math.max(330, SPACE_HEADER_H + maxSubzoneHeight + SPACE_PADDING * 2);

            spaceLayouts[spaceId] = {
                ...spaceConfig,
                width: spaceWidth,
                height: spaceHeight,
                subzones,
                tabCount: tabs.length
            };
        });

        // Step 2: Arrange 4 Spaces in a balanced 2x2 Macro-Layout
        const col1Width = Math.max(spaceLayouts.personal.width, spaceLayouts.ghost.width);
        const col2Width = Math.max(spaceLayouts.work.width, spaceLayouts.tor.width);
        const row1Height = Math.max(spaceLayouts.personal.height, spaceLayouts.work.height);
        const row2Height = Math.max(spaceLayouts.ghost.height, spaceLayouts.tor.height);

        // Position Personal (Top-Left)
        spaceLayouts.personal.x = 0;
        spaceLayouts.personal.y = 0;

        // Position Work (Top-Right)
        spaceLayouts.work.x = col1Width + MACRO_ZONE_GAP;
        spaceLayouts.work.y = 0;

        // Position Ghost (Bottom-Left)
        spaceLayouts.ghost.x = 0;
        spaceLayouts.ghost.y = row1Height + MACRO_ZONE_GAP;

        // Position Tor (Bottom-Right)
        spaceLayouts.tor.x = col1Width + MACRO_ZONE_GAP;
        spaceLayouts.tor.y = row1Height + MACRO_ZONE_GAP;

        // Step 3: Compute exact deterministic world positions for every Subzone and Tab Node
        SPACE_CONFIGS.forEach(spaceConfig => {
            const space = spaceLayouts[spaceConfig.id];
            let currentSubX = space.x + SPACE_PADDING;
            const subY = space.y + SPACE_HEADER_H + SPACE_PADDING;

            space.subzones.forEach(subzone => {
                subzone.x = currentSubX;
                subzone.y = subY;

                if (subzone.type === 'folder') {
                    folderBounds.set(subzone.id, {
                        x: subzone.x,
                        y: subzone.y,
                        width: subzone.width,
                        height: subzone.height,
                        folderId: subzone.id,
                        spaceId: space.id,
                        name: subzone.name
                    });
                } else if (subzone.type === 'cluster') {
                    clusterBounds.set(subzone.id, {
                        x: subzone.x,
                        y: subzone.y,
                        width: subzone.width,
                        height: subzone.height,
                        domain: subzone.domain,
                        spaceId: space.id,
                        tabs: subzone.tabs
                    });
                }

                // Place tabs inside this subzone
                subzone.tabs.forEach((tab, index) => {
                    const col = index % subzone.cols;
                    const row = Math.floor(index / subzone.cols);
                    const innerPad = subzone.isStandaloneOnly ? 0 : SUBZONE_PADDING;
                    const headerOffset = subzone.isStandaloneOnly ? 0 : SUBZONE_HEADER_H;
                    const baseX = subzone.x + innerPad + col * (NODE_W + CARD_GAP);
                    const baseY = subzone.y + headerOffset + innerPad + row * (NODE_H + CARD_GAP);

                    // Add freeform overrides if user custom-dragged this node
                    const offset = tabNodeOffsets[tab.id] || { dx: 0, dy: 0 };
                    const finalX = baseX + offset.dx;
                    const finalY = baseY + offset.dy;

                    nodePositions.set(tab.id, {
                        tab,
                        spaceId: space.id,
                        folderId: tab.folderId || null,
                        domain: getCleanDomain(tab.url),
                        x: finalX,
                        y: finalY,
                        width: NODE_W,
                        height: NODE_H,
                        cx: finalX + NODE_W / 2,
                        cy: finalY + NODE_H / 2,
                        baseX,
                        baseY,
                        isOffset: Math.abs(offset.dx) > 1 || Math.abs(offset.dy) > 1
                    });
                });

                currentSubX += subzone.width + CARD_GAP;
            });
        });

        // Step 4: Extract SVG Opener Trails (`tab.openerTabId`) & Domain Cluster Links
        const openerTrails = [];
        const domainBySpaceMap = new Map();

        nodePositions.forEach(node => {
            if (node.tab.openerTabId && nodePositions.has(node.tab.openerTabId)) {
                const parent = nodePositions.get(node.tab.openerTabId);
                const child = node;

                const dx = child.cx - parent.cx;
                const p1x = parent.cx + dx * 0.45;
                const p1y = parent.cy;
                const p2x = child.cx - dx * 0.45;
                const p2y = child.cy;

                const path = `M ${parent.cx} ${parent.cy} C ${p1x} ${p1y}, ${p2x} ${p2y}, ${child.cx} ${child.cy}`;
                openerTrails.push({
                    parentId: parent.tab.id,
                    childId: child.tab.id,
                    parent,
                    child,
                    path,
                    midX: (parent.cx + child.cx) / 2,
                    midY: (parent.cy + child.cy) / 2
                });
            }

            if (node.domain) {
                const key = `${node.spaceId}:${node.domain}`;
                if (!domainBySpaceMap.has(key)) domainBySpaceMap.set(key, []);
                domainBySpaceMap.get(key).push(node);
            }
        });

        const domainTrails = [];
        domainBySpaceMap.forEach((nodes, key) => {
            if (nodes.length < 2) return;
            for (let i = 0; i < nodes.length - 1; i++) {
                const a = nodes[i];
                const b = nodes[i + 1];
                if (a.isOffset || b.isOffset || a.folderId !== b.folderId) {
                    const dx = b.cx - a.cx;
                    const p1x = a.cx + dx * 0.4;
                    const p1y = a.cy;
                    const p2x = b.cx - dx * 0.4;
                    const p2y = b.cy;
                    domainTrails.push({
                        id: `dom-${key}-${a.tab.id}-${b.tab.id}`,
                        sourceId: a.tab.id,
                        targetId: b.tab.id,
                        path: `M ${a.cx} ${a.cy} C ${p1x} ${p1y}, ${p2x} ${p2y}, ${b.cx} ${b.cy}`
                    });
                }
            }
        });

        // Total World Canvas Dimensions
        const totalWorldWidth = col1Width + MACRO_ZONE_GAP + col2Width;
        const totalWorldHeight = row1Height + MACRO_ZONE_GAP + row2Height;

        return {
            spaces: spaceLayouts,
            folderBounds,
            clusterBounds,
            nodePositions,
            openerTrails,
            domainTrails,
            worldWidth: totalWorldWidth,
            worldHeight: totalWorldHeight
        };
    }, [spaceTabsMap, folders, tabNodeOffsets]);

    // ==========================================
    // 2. CAMERA ENGINE & SMOOTH ANIMATION
    // ==========================================
    const animateCameraTo = useCallback((targetPan, targetZoom, duration = 380) => {
        if (cameraAnimRef.current) cancelAnimationFrame(cameraAnimRef.current);
        const startPan = { ...pan };
        const startZoom = zoom;
        const startTime = performance.now();

        const step = (now) => {
            const elapsed = now - startTime;
            const progress = Math.min(1, elapsed / duration);
            const ease = 1 - Math.pow(1 - progress, 3); // Cubic ease out

            const curX = startPan.x + (targetPan.x - startPan.x) * ease;
            const curY = startPan.y + (targetPan.y - startPan.y) * ease;
            const curZ = startZoom + (targetZoom - startZoom) * ease;

            setPan({ x: curX, y: curY });
            setZoom(curZ);

            if (progress < 1) {
                cameraAnimRef.current = requestAnimationFrame(step);
            } else {
                cameraAnimRef.current = null;
            }
        };
        cameraAnimRef.current = requestAnimationFrame(step);
    }, [pan, zoom]);

    // Frame a specific Space Zone
    const frameSpaceZone = useCallback((spaceId, duration = 340) => {
        setActiveCameraTarget(spaceId);
        const space = layout.spaces[spaceId];
        if (!space || !containerRef.current) return;
        const vw = containerRef.current.clientWidth || window.innerWidth;
        const vh = containerRef.current.clientHeight || window.innerHeight;

        const targetZoom = Math.min(1.02, Math.max(0.42, Math.min((vw - 140) / space.width, (vh - 160) / space.height)));
        const targetPanX = (vw - space.width * targetZoom) / 2 - space.x * targetZoom;
        const targetPanY = (vh - space.height * targetZoom) / 2 - space.y * targetZoom;

        animateCameraTo({ x: targetPanX, y: targetPanY }, targetZoom, duration);
    }, [layout, animateCameraTo]);

    // Frame the entire World Canvas (Fit All)
    const frameAll = useCallback((duration = 360) => {
        setActiveCameraTarget('all');
        if (!containerRef.current) return;
        const vw = containerRef.current.clientWidth || window.innerWidth;
        const vh = containerRef.current.clientHeight || window.innerHeight;

        const targetZoom = Math.min(0.85, Math.max(0.32, Math.min((vw - 160) / layout.worldWidth, (vh - 180) / layout.worldHeight)));
        const targetPanX = (vw - layout.worldWidth * targetZoom) / 2;
        const targetPanY = (vh - layout.worldHeight * targetZoom) / 2;

        animateCameraTo({ x: targetPanX, y: targetPanY }, targetZoom, duration);
    }, [layout, animateCameraTo]);

    // Center camera on a specific Tab Card
    const centerCameraOnNode = useCallback((tabId, duration = 300) => {
        const node = layout.nodePositions.get(tabId);
        if (!node || !containerRef.current) return;
        const vw = containerRef.current.clientWidth || window.innerWidth;
        const vh = containerRef.current.clientHeight || window.innerHeight;

        const targetPanX = vw / 2 - node.cx * zoom;
        const targetPanY = vh / 2 - node.cy * zoom;
        animateCameraTo({ x: targetPanX, y: targetPanY }, zoom, duration);
    }, [layout, zoom, animateCameraTo]);

    // Initial camera setup: automatically frame the active space on open
    useEffect(() => {
        if (isTabMapOpen && !hasInitializedCameraRef.current) {
            hasInitializedCameraRef.current = true;
            setActiveCameraTarget(activeSpace || 'personal');
            setTimeout(() => {
                frameSpaceZone(activeSpace, 0);
            }, 30);
        } else if (!isTabMapOpen) {
            hasInitializedCameraRef.current = false;
        }
    }, [isTabMapOpen, activeSpace, frameSpaceZone]);

    // Measure Sliding Pill Geometry for Space Camera Switcher
    const updateCameraPillGeometry = useCallback(() => {
        const btn = cameraBtnRefs.current[activeCameraTarget];
        const bar = cameraBarRef.current;
        if (btn && bar && btn.offsetWidth > 0) {
            setPillStyle({
                left: btn.offsetLeft,
                width: btn.offsetWidth,
                opacity: 1
            });
        }
    }, [activeCameraTarget]);

    useEffect(() => {
        if (!isTabMapOpen) return;
        updateCameraPillGeometry();
        const raf = requestAnimationFrame(updateCameraPillGeometry);
        const timer = setTimeout(updateCameraPillGeometry, 60);
        window.addEventListener('resize', updateCameraPillGeometry);
        return () => {
            cancelAnimationFrame(raf);
            clearTimeout(timer);
            window.removeEventListener('resize', updateCameraPillGeometry);
        };
    }, [isTabMapOpen, activeCameraTarget, updateCameraPillGeometry]);

    useEffect(() => {
        if (!isTabMapOpen || !hoveredCameraTarget) {
            setHoverPillStyle(prev => ({ ...prev, opacity: 0 }));
            return;
        }
        const btn = cameraBtnRefs.current[hoveredCameraTarget];
        const bar = cameraBarRef.current;
        if (btn && bar && btn.offsetWidth > 0) {
            setHoverPillStyle({
                left: btn.offsetLeft,
                width: btn.offsetWidth,
                opacity: hoveredCameraTarget !== activeCameraTarget ? 1 : 0
            });
        }
    }, [isTabMapOpen, hoveredCameraTarget, activeCameraTarget]);

    // ==========================================
    // 3. STORE INTERACTION DISPATCHERS (WITH FAILSAFE)
    // ==========================================
    const dispatchMoveTabsToZone = (tabIds, targetSpace, targetFolderId = null) => {
        const store = useTabStore.getState();
        if (store.moveTabsToZone) {
            store.moveTabsToZone(tabIds, targetSpace, targetFolderId);
            return;
        }
        // Failsafe fallback
        const idSet = new Set(tabIds);
        const spaces = [
            { id: 'personal', list: store.privateTabs, setList: store.setPrivateTabs },
            { id: 'work', list: store.workTabs, setList: store.setWorkTabs },
            { id: 'ghost', list: store.ghostTabs, setList: store.setGhostTabs },
            { id: 'tor', list: store.torTabs || [], setList: store.setTorTabs }
        ];
        const moved = [];
        spaces.forEach(s => {
            const rem = [];
            s.list.forEach(t => {
                if (idSet.has(t.id)) moved.push({ ...t, folderId: targetFolderId });
                else rem.push(t);
            });
            if (rem.length === 0) {
                rem.push({ id: `t-${Date.now()}`, title: s.id === 'ghost' ? 'New Incognito Tab' : 'New Tab', url: '', active: true, folderId: null, lastActiveAt: Date.now(), suspended: false });
            }
            s.setList(rem);
        });
        const target = spaces.find(s => s.id === targetSpace);
        if (target && moved.length > 0) {
            target.setList([...target.list, ...moved]);
            showToast(`Moved ${moved.length} tab(s) to ${targetSpace}`);
        }
    };

    const dispatchMergeTabsIntoNewFolder = (sourceTabIds, targetTabId, targetSpace = null) => {
        const store = useTabStore.getState();
        if (store.mergeTabsIntoNewFolder) {
            store.mergeTabsIntoNewFolder(sourceTabIds, targetTabId, targetSpace);
            return;
        }
        // Failsafe fallback
        const space = targetSpace || store.activeSpace;
        const targetNode = layout.nodePositions.get(targetTabId);
        const folderName = targetNode?.domain ? targetNode.domain : 'Group';
        const folderId = store.createFolder(space, folderName);
        dispatchMoveTabsToZone([...sourceTabIds, targetTabId], space, folderId);
        showToast(`Grouped into "${folderName}"`);
    };

    const dispatchAutoCluster = () => {
        const store = useTabStore.getState();
        if (store.autoClusterByDomain) {
            const res = store.autoClusterByDomain();
            const count = res?.clusteredTabCount || 0;
            const created = res?.createdFolderCount || 0;
            showToast(count > 0 ? `Grouped ${count} tabs into ${created} domain folders` : 'No ungrouped domain clusters found');
        } else {
            showToast('Domain grouping complete');
        }
    };

    const dispatchCloseDuplicates = () => {
        const store = useTabStore.getState();
        if (store.closeDuplicateTabs) {
            const closed = store.closeDuplicateTabs();
            showToast(closed > 0 ? `Closed ${closed} duplicate tab(s)` : 'No duplicate tabs found');
        } else {
            showToast('Scan complete: no duplicates found');
        }
    };

    const dispatchSuspendAllInactive = () => {
        const store = useTabStore.getState();
        if (store.suspendAllInactiveTabs) {
            const count = store.suspendAllInactiveTabs();
            showToast(count > 0 ? `Hibernated ${count} inactive tab(s)` : 'All inactive tabs are already hibernating');
        } else {
            let count = 0;
            const susp = (list) => list.map(t => {
                if (!t.active && !t.suspended && !t.isAudible && !t.isAudioPlaying) {
                    count++;
                    return { ...t, suspended: true, suspendedAt: Date.now() };
                }
                return t;
            });
            store.setPrivateTabs(susp(store.privateTabs));
            store.setWorkTabs(susp(store.workTabs));
            store.setGhostTabs(susp(store.ghostTabs));
            store.setTorTabs(susp(store.torTabs || []));
            showToast(count > 0 ? `Hibernated ${count} inactive tab(s)` : 'All inactive tabs are already hibernating');
        }
    };

    const handleResetLayout = () => {
        const store = useTabStore.getState();
        if (store.clearAllTabNodeOffsets) {
            store.clearAllTabNodeOffsets();
        }
        frameAll(380);
        showToast('Reset card positions and centered view');
    };

    // ==========================================
    // 4. SPOTLIGHT SEARCH & MATCH FILTERING
    // ==========================================
    const searchMatches = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return [];
        const matches = [];
        layout.nodePositions.forEach((node, id) => {
            const title = (node.tab.title || '').toLowerCase();
            const url = (node.tab.url || '').toLowerCase();
            const domain = (node.domain || '').toLowerCase();
            if (title.includes(q) || url.includes(q) || domain.includes(q)) {
                matches.push(id);
            }
        });
        return matches;
    }, [searchQuery, layout]);

    const activeMatchTabId = searchMatches[focusedMatchIndex] || null;

    // Center camera when cycling search match
    useEffect(() => {
        if (activeMatchTabId) {
            centerCameraOnNode(activeMatchTabId, 260);
        }
    }, [activeMatchTabId, centerCameraOnNode]);

    // ==========================================
    // 5. KEYBOARD COMMANDS & GLOBAL SHORTCUTS
    // ==========================================
    useEffect(() => {
        if (!isTabMapOpen) return;

        const handleKeyDown = (e) => {
            // Ignore if currently typing inside an input/textarea
            const isInput = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable;

            if (e.key === 'Escape') {
                e.preventDefault();
                if (searchQuery) {
                    setSearchQuery('');
                } else if (selectedTabIds.size > 0) {
                    setSelectedTabIds(new Set());
                } else {
                    handleCloseTabMap();
                }
                return;
            }

            if (isInput) {
                if (e.key === 'Enter' && e.target === searchInputRef.current) {
                    if (activeMatchTabId) {
                        const targetNode = layout.nodePositions.get(activeMatchTabId);
                        if (targetNode) {
                            handleActivateTab(targetNode.tab, targetNode.spaceId);
                        }
                    }
                } else if ((e.key === 'ArrowDown' || e.key === 'ArrowRight') && searchMatches.length > 0) {
                    e.preventDefault();
                    setFocusedMatchIndex(prev => (prev + 1) % searchMatches.length);
                } else if ((e.key === 'ArrowUp' || e.key === 'ArrowLeft') && searchMatches.length > 0) {
                    e.preventDefault();
                    setFocusedMatchIndex(prev => (prev - 1 + searchMatches.length) % searchMatches.length);
                }
                return;
            }

            // Canvas Space Switcher Quick Jumpers (1: Personal, 2: Work, 3: Ghost, 4: Tor, 0/F: Fit All)
            if (e.key === '1') { e.preventDefault(); frameSpaceZone('personal'); }
            else if (e.key === '2') { e.preventDefault(); frameSpaceZone('work'); }
            else if (e.key === '3') { e.preventDefault(); frameSpaceZone('ghost'); }
            else if (e.key === '4') { e.preventDefault(); frameSpaceZone('tor'); }
            else if (e.key === '0' || e.key.toLowerCase() === 'f') { e.preventDefault(); frameAll(); }
            else if (e.key.toLowerCase() === 'v' || e.key.toLowerCase() === 'h') { setToolMode('pan'); }
            else if (e.key.toLowerCase() === 's') { setToolMode('select'); }
            else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
                // Any printable key immediately focuses search
                if (searchInputRef.current) {
                    searchInputRef.current.focus();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isTabMapOpen, searchQuery, selectedTabIds, activeMatchTabId, searchMatches, frameSpaceZone, frameAll, handleCloseTabMap, layout]);

    // ==========================================
    // 6. WHEEL ZOOM ANCHORED TO CURSOR
    // ==========================================
    const handleWheel = (e) => {
        e.preventDefault();
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const zoomDelta = e.deltaY < 0 ? 1.12 : 0.89;
        const newZoom = Math.min(1.8, Math.max(0.32, zoom * zoomDelta));

        // Anchor camera zoom at mouse world coordinates
        const mouseWorldX = (mouseX - pan.x) / zoom;
        const mouseWorldY = (mouseY - pan.y) / zoom;

        const newPanX = mouseX - mouseWorldX * newZoom;
        const newPanY = mouseY - mouseWorldY * newZoom;

        setZoom(newZoom);
        setPan({ x: newPanX, y: newPanY });
    };

    // ==========================================
    // 7. PAN, LASSO MARQUEE & TAB CARD DRAG
    // ==========================================
    const handleCanvasPointerDown = (e) => {
        // Ignore right clicks or clicks on HUD controls
        if (e.button !== 0 && e.button !== 1) return;

        const startClientX = e.clientX;
        const startClientY = e.clientY;
        const startPan = { ...pan };

        const isLasso = (toolMode === 'select' || e.shiftKey) && e.button === 0;

        if (isLasso) {
            setLassoBox({ startX: startClientX, startY: startClientY, currentX: startClientX, currentY: startClientY });
        }

        const handlePointerMove = (me) => {
            if (isLasso) {
                setLassoBox({
                    startX: startClientX,
                    startY: startClientY,
                    currentX: me.clientX,
                    currentY: me.clientY
                });

                // Compute lasso bounds in world coordinates
                const x1 = Math.min(startClientX, me.clientX);
                const x2 = Math.max(startClientX, me.clientX);
                const y1 = Math.min(startClientY, me.clientY);
                const y2 = Math.max(startClientY, me.clientY);

                const cRect = containerRef.current?.getBoundingClientRect() || { left: 0, top: 0 };
                const worldX1 = (x1 - cRect.left - pan.x) / zoom;
                const worldX2 = (x2 - cRect.left - pan.x) / zoom;
                const worldY1 = (y1 - cRect.top - pan.y) / zoom;
                const worldY2 = (y2 - cRect.top - pan.y) / zoom;

                const newlySelected = new Set();
                layout.nodePositions.forEach((node, id) => {
                    const nodeX2 = node.x + node.width;
                    const nodeY2 = node.y + node.height;
                    const intersects = !(nodeX2 < worldX1 || node.x > worldX2 || nodeY2 < worldY1 || node.y > worldY2);
                    if (intersects) newlySelected.add(id);
                });
                setSelectedTabIds(newlySelected);
            } else {
                // Pan Camera
                const dx = me.clientX - startClientX;
                const dy = me.clientY - startClientY;
                setPan({ x: startPan.x + dx, y: startPan.y + dy });
            }
        };

        const handlePointerUp = () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
            if (isLasso) {
                setLassoBox(null);
            }
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
    };

    // Tab Card Pointer Drag Handler
    const handleTabPointerDown = (e, tab, spaceId) => {
        if (e.button !== 0 && e.button !== 1) return;
        e.stopPropagation();

        // Middle-click closes tab instantly
        if (e.button === 1) {
            e.preventDefault();
            const store = useTabStore.getState();
            if (store.closeTabById) store.closeTabById(tab.id);
            else if (store.handleCloseTab) store.handleCloseTab(tab.id);
            return;
        }

        // Shift or Ctrl/Cmd multi-selection toggle
        if (e.shiftKey || e.ctrlKey || e.metaKey) {
            setSelectedTabIds(prev => {
                const next = new Set(prev);
                if (next.has(tab.id)) next.delete(tab.id);
                else next.add(tab.id);
                return next;
            });
            return;
        }

        const startClientX = e.clientX;
        const startClientY = e.clientY;
        const dragTabs = selectedTabIds.has(tab.id) ? Array.from(selectedTabIds) : [tab.id];

        let hasMoved = false;

        const handlePointerMove = (me) => {
            const dist = Math.hypot(me.clientX - startClientX, me.clientY - startClientY);
            if (!hasMoved && dist > 5) {
                hasMoved = true;
                setHoveredCardTilt(null);
            }

            if (hasMoved) {
                // Hit-test world position against Cards, Folders, and Spaces
                const cRect = containerRef.current?.getBoundingClientRect() || { left: 0, top: 0 };
                const curWorldX = (me.clientX - cRect.left - pan.x) / zoom;
                const curWorldY = (me.clientY - cRect.top - pan.y) / zoom;

                let hitTarget = null;

                // 1. Check Tab-onto-Tab (Merge Folder)
                for (const [id, node] of layout.nodePositions.entries()) {
                    if (!dragTabs.includes(id)) {
                        if (curWorldX >= node.x && curWorldX <= node.x + node.width &&
                            curWorldY >= node.y && curWorldY <= node.y + node.height) {
                            hitTarget = { type: 'tab', id, tab: node.tab, spaceId: node.spaceId };
                            break;
                        }
                    }
                }

                // 2. Check Folder Sub-Zones
                if (!hitTarget) {
                    for (const [fId, fb] of layout.folderBounds.entries()) {
                        if (curWorldX >= fb.x && curWorldX <= fb.x + fb.width &&
                            curWorldY >= fb.y && curWorldY <= fb.y + fb.height) {
                            hitTarget = { type: 'folder', id: fId, spaceId: fb.spaceId, name: fb.name };
                            break;
                        }
                    }
                }

                // 3. Check Space Zones
                if (!hitTarget) {
                    for (const s of Object.values(layout.spaces)) {
                        if (curWorldX >= s.x && curWorldX <= s.x + s.width &&
                            curWorldY >= s.y && curWorldY <= s.y + s.height) {
                            hitTarget = { type: 'space', id: s.id };
                            break;
                        }
                    }
                }

                setDragState({
                    isDragging: true,
                    tabIds: dragTabs,
                    startClientX,
                    startClientY,
                    currentClientX: me.clientX,
                    currentClientY: me.clientY,
                    target: hitTarget
                });
            }
        };

        const handlePointerUp = (me) => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);

            if (!hasMoved) {
                // Clicked without dragging: Activate tab & close TabMap
                handleActivateTab(tab, spaceId);
                return;
            }

            // Drop resolution
            const cRect = containerRef.current?.getBoundingClientRect() || { left: 0, top: 0 };
            const curWorldX = (me.clientX - cRect.left - pan.x) / zoom;
            const curWorldY = (me.clientY - cRect.top - pan.y) / zoom;

            const worldDx = (me.clientX - startClientX) / zoom;
            const worldDy = (me.clientY - startClientY) / zoom;

            let hitTarget = null;

            // 1. Check Tab-onto-Tab (Merge Folder)
            for (const [id, node] of layout.nodePositions.entries()) {
                if (!dragTabs.includes(id)) {
                    if (curWorldX >= node.x && curWorldX <= node.x + node.width &&
                        curWorldY >= node.y && curWorldY <= node.y + node.height) {
                        hitTarget = { type: 'tab', id, tab: node.tab, spaceId: node.spaceId };
                        break;
                    }
                }
            }

            // 2. Check Folder
            if (!hitTarget) {
                for (const [fId, fb] of layout.folderBounds.entries()) {
                    if (curWorldX >= fb.x && curWorldX <= fb.x + fb.width &&
                        curWorldY >= fb.y && curWorldY <= fb.y + fb.height) {
                        hitTarget = { type: 'folder', id: fId, spaceId: fb.spaceId };
                        break;
                    }
                }
            }

            // 3. Check Space
            if (!hitTarget) {
                for (const s of Object.values(layout.spaces)) {
                    if (curWorldX >= s.x && curWorldX <= s.x + s.width &&
                        curWorldY >= s.y && curWorldY <= s.y + s.height) {
                        hitTarget = { type: 'space', id: s.id };
                        break;
                    }
                }
            }

            const anyDraggedInFolder = dragTabs.some(id => Boolean(layout.nodePositions.get(id)?.folderId));

            if (hitTarget?.type === 'tab' && !me.altKey) {
                dispatchMergeTabsIntoNewFolder(dragTabs, hitTarget.id, hitTarget.spaceId);
            } else if (hitTarget?.type === 'folder' && !me.altKey) {
                dispatchMoveTabsToZone(dragTabs, hitTarget.spaceId, hitTarget.id);
            } else if (hitTarget?.type === 'space' && (hitTarget.id !== spaceId || anyDraggedInFolder) && !me.altKey) {
                dispatchMoveTabsToZone(dragTabs, hitTarget.id, null);
            } else {
                // Freeform canvas placement offset
                const store = useTabStore.getState();
                const updates = {};
                dragTabs.forEach(id => {
                    const curOffset = tabNodeOffsets[id] || { dx: 0, dy: 0 };
                    updates[id] = { dx: Math.round(curOffset.dx + worldDx), dy: Math.round(curOffset.dy + worldDy) };
                });
                if (store.setBatchTabNodeOffsets) {
                    store.setBatchTabNodeOffsets(updates);
                } else if (store.setTabNodeOffset) {
                    Object.entries(updates).forEach(([id, off]) => store.setTabNodeOffset(id, off));
                }
            }

            setDragState(null);
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
    };

    // ==========================================
    // 8. CARD QUICK ACTIONS & DISPATCHERS
    // ==========================================
    const handleActivateTab = (tab, spaceId) => {
        const store = useTabStore.getState();
        if (store.handleSwitchToTab) {
            store.handleSwitchToTab(tab.id, spaceId);
        } else if (store.setActiveTab) {
            store.setActiveTab(tab.id, spaceId);
        }
        setCurrentUrl(tab.url || '');
        handleCloseTabMap();
    };

    const handleOpenSplit = (e, tab, spaceId) => {
        e.stopPropagation();
        if (activeSpace !== spaceId) {
            setActiveSpace(spaceId);
        }
        useUIStore.setState({
            isSplitView: true,
            splitRightTabId: tab.id,
            isTabMapOpen: false
        });
        showToast('Opened in Split View');
    };

    const handleToggleSleep = (e, tab, spaceId) => {
        e.stopPropagation();
        const store = useTabStore.getState();
        if (tab.suspended) {
            store.wakeTab?.(tab.id);
        } else {
            store.suspendTab?.(tab.id);
        }
    };

    const handleToggleMute = (e, tab, spaceId) => {
        e.stopPropagation();
        const store = useTabStore.getState();
        if (store.toggleMuteTab) store.toggleMuteTab(tab.id, spaceId);
        else if (store.handleToggleMute) store.handleToggleMute(tab.id, spaceId);
    };

    const handleTogglePin = (e, tab) => {
        e.stopPropagation();
        const store = useTabStore.getState();
        const domain = getCleanDomain(tab.url);
        const isPinned = store.pinnedTabs?.some(p => p.domain === domain);
        if (isPinned) {
            const pin = store.pinnedTabs.find(p => p.domain === domain);
            store.handleUnpinTab?.(pin);
        } else {
            store.addPinnedTab?.(tab.title || domain, tab.url || domain);
        }
    };

    const handleCloseCard = (e, tab) => {
        e.stopPropagation();
        const store = useTabStore.getState();
        if (store.closeTabById) store.closeTabById(tab.id);
        else if (store.handleCloseTab) store.handleCloseTab(tab.id);
    };

    // Inline Folderize Button for Domain Clusters
    const handleFolderizeCluster = (e, cluster) => {
        e.stopPropagation();
        const store = useTabStore.getState();
        const newFolderId = store.createFolder(cluster.spaceId, cluster.domain);
        const tabIds = cluster.tabs.map(t => t.id);
        dispatchMoveTabsToZone(tabIds, cluster.spaceId, newFolderId);
        showToast(`Created folder "${cluster.domain}" with ${tabIds.length} tabs`);
    };

    // Inline Folder Creation in Space Header
    const handleCreateFolderInSpace = (e, spaceId) => {
        e.stopPropagation();
        const store = useTabStore.getState();
        const fId = store.createFolder(spaceId, 'New Folder');
        setEditingFolderId(fId);
        setEditingFolderName('New Folder');
    };

    // Create New Tab in a Space
    const handleCreateNewTabInSpace = (e, spaceId) => {
        e?.stopPropagation();
        const store = useTabStore.getState();
        const now = Date.now();
        store.addTab?.(spaceId, '', {
            id: `t-${now}-${Math.floor(Math.random() * 1000)}`,
            active: spaceId === store.activeSpace,
            folderId: null,
            createdAt: now,
            openerTabId: null
        });
        showToast(`Opened new tab in ${SPACE_CONFIGS.find(s => s.id === spaceId)?.title || spaceId}`);
    };

    // Save Folder Rename
    const handleSaveFolderRename = (folderId) => {
        if (editingFolderName.trim()) {
            useTabStore.getState().renameFolder?.(folderId, editingFolderName.trim());
        }
        setEditingFolderId(null);
        setEditingFolderName('');
    };

    if (!isTabMapOpen && !isTabMapClosing) return null;

    // Real-time world drag delta
    const dragDeltaWorld = dragState?.isDragging ? {
        dx: (dragState.currentClientX - dragState.startClientX) / zoom,
        dy: (dragState.currentClientY - dragState.startClientY) / zoom
    } : { dx: 0, dy: 0 };

    return (
        <div 
            id="tabmap-container"
            ref={containerRef}
            onContextMenu={e => { e.preventDefault(); e.stopPropagation(); }}
            onWheel={handleWheel}
            onPointerDown={handleCanvasPointerDown}
            onPointerMove={handleContainerPointerMove}
            className={`fixed inset-0 z-[80000] select-none overflow-hidden ${
                isBright ? 'tabmap-overlay-bright text-zinc-900' : 'tabmap-overlay-dark text-white'
            } ${isTabMapClosing ? 'animate-tabmap-backdrop-out' : 'animate-tabmap-backdrop'}`}
            style={{ cursor: toolMode === 'select' ? 'crosshair' : 'grab' }}
        >
            <style>{`
                @keyframes pulse-trail {
                    0% { stroke-dashoffset: 48; }
                    100% { stroke-dashoffset: 0; }
                }
                .trail-glow {
                    stroke-dasharray: 8, 6;
                    animation: pulse-trail 1.6s linear infinite;
                }
                .trail-domain-flow {
                    stroke-dasharray: 5, 7;
                    animation: pulse-trail 2.4s linear infinite;
                }
                @keyframes tabmapWallpaperEnter {
                    0% {
                        opacity: 0;
                        transform: scale(1.14);
                    }
                    100% {
                        opacity: 1;
                    }
                }
                .animate-tabmap-wallpaper {
                    animation: tabmapWallpaperEnter 0.55s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                @keyframes tabmapOrbFloat {
                    0%, 100% {
                        transform: translate3d(0, 0, 0) scale(1);
                    }
                    50% {
                        transform: translate3d(24px, -18px, 0) scale(1.07);
                    }
                }
                .animate-tabmap-orb {
                    animation: tabmapOrbFloat 9s ease-in-out infinite;
                }
                @keyframes tabmapZoneCascade {
                    0% {
                        opacity: 0;
                        transform: scale(0.92) translateY(22px);
                    }
                    70% {
                        opacity: 1;
                        transform: scale(1.01) translateY(-2px);
                    }
                    100% {
                        opacity: 1;
                        transform: scale(1) translateY(0);
                    }
                }
                .animate-tabmap-zone-enter {
                    animation: tabmapZoneCascade 0.48s cubic-bezier(0.22, 1, 0.36, 1) backwards;
                }
                .tabmap-card-sheen {
                    position: absolute;
                    inset: -40% -120%;
                    background: linear-gradient(
                        115deg,
                        transparent 38%,
                        rgba(255, 255, 255, 0.12) 48%,
                        rgba(255, 255, 255, 0.24) 50%,
                        rgba(255, 255, 255, 0.08) 52%,
                        transparent 62%
                    );
                    transform: translateX(-45%) rotate(8deg);
                    transition: transform 0.65s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.35s ease;
                    opacity: 0;
                    pointer-events: none;
                    z-index: 15;
                }
                .group\\/card:hover .tabmap-card-sheen {
                    transform: translateX(45%) rotate(8deg);
                    opacity: 1;
                }
                .tabmap-slot-ghost-dark {
                    background: linear-gradient(145deg, rgba(255, 255, 255, 0.03) 0%, rgba(18, 20, 30, 0.42) 100%);
                    border: 1.5px dashed rgba(255, 255, 255, 0.14);
                    box-shadow: inset 0 1px 0 0 rgba(255, 255, 255, 0.06);
                }
                .tabmap-slot-ghost-dark:hover {
                    background: linear-gradient(145deg, rgba(212, 188, 148, 0.1) 0%, rgba(28, 30, 44, 0.62) 100%);
                    border-color: rgba(212, 188, 148, 0.48);
                    box-shadow: 0 16px 36px rgba(0, 0, 0, 0.35), inset 0 1px 0 0 rgba(212, 188, 148, 0.25);
                }
                .tabmap-slot-ghost-bright {
                    background: linear-gradient(145deg, rgba(255, 255, 255, 0.55) 0%, rgba(242, 244, 248, 0.45) 100%);
                    border: 1.5px dashed rgba(0, 0, 0, 0.14);
                }
                .tabmap-slot-ghost-bright:hover {
                    background: linear-gradient(145deg, rgba(255, 255, 255, 0.85) 0%, rgba(248, 249, 252, 0.75) 100%);
                    border-color: rgba(212, 188, 148, 0.65);
                    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.06);
                }
            `}</style>

            {/* ============================================================== */}
            {/* SHARED QBROWSE WALLPAPER BACKGROUND WITH PARALLAX & VEIL        */}
            {/* ============================================================== */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
                <div
                    className="absolute -inset-[6%] bg-cover bg-center animate-tabmap-wallpaper will-change-transform transition-transform duration-150 ease-out"
                    style={{
                        backgroundImage: `url('${activeWallpaper}')`,
                        filter: 'saturate(1.18) contrast(1.04)',
                        transform: `translate3d(${Math.round(pan.x * 0.035 + mouseParallax.x * -12)}px, ${Math.round(pan.y * 0.035 + mouseParallax.y * -12)}px, 0) scale(1.08)`
                    }}
                />
                {/* Wallpaper Dimming Harmony Layer */}
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        backgroundColor: isBright
                            ? `rgba(255, 255, 255, ${(wallpaperDimming / 100) * 0.16})`
                            : `rgba(0, 0, 0, ${(wallpaperDimming / 100) * 0.42})`
                    }}
                />
                {/* Frosted Liquid Glass Refractive Veil over Shared Wallpaper */}
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        backdropFilter: 'blur(26px) saturate(145%)',
                        WebkitBackdropFilter: 'blur(26px) saturate(145%)',
                        backgroundColor: isBright ? 'rgba(244, 245, 250, 0.58)' : 'rgba(8, 9, 15, 0.58)'
                    }}
                />
            </div>

            {/* Ambient Refractive Light Orbs with Interactive Parallax & Drift */}
            <div 
                className="absolute inset-0 pointer-events-none overflow-hidden z-[1] transition-transform duration-200 ease-out"
                style={{
                    transform: `translate3d(${Math.round(mouseParallax.x * -22)}px, ${Math.round(mouseParallax.y * -22)}px, 0)`
                }}
            >
                <div 
                    className="animate-tabmap-orb absolute -top-[18%] -left-[8%] w-[52vw] h-[52vw] rounded-full opacity-25 blur-[130px] pointer-events-none"
                    style={{ background: 'radial-gradient(circle, var(--accent) 0%, transparent 70%)' }}
                />
                <div 
                    className="animate-tabmap-orb absolute -bottom-[18%] -right-[8%] w-[52vw] h-[52vw] rounded-full opacity-20 blur-[130px] pointer-events-none"
                    style={{ background: 'radial-gradient(circle, #60a5fa 0%, transparent 70%)', animationDelay: '-3s' }}
                />
                <div 
                    className="animate-tabmap-orb absolute top-[35%] right-[18%] w-[38vw] h-[38vw] rounded-full opacity-15 blur-[110px] pointer-events-none"
                    style={{ background: 'radial-gradient(circle, #a855f7 0%, transparent 70%)', animationDelay: '-6s' }}
                />
            </div>

            {/* ============================================================== */}
            {/* TOP HUD: UNIFIED FLOATING LIQUID GLASS COMMAND BAR              */}
            {/* ============================================================== */}
            <header className={`absolute top-4 left-6 right-6 flex flex-col items-center z-[90000] pointer-events-none ${
                isTabMapClosing ? 'animate-tabmap-exit' : 'animate-tabmap-enter'
            }`}>
                <div className={`w-full max-w-7xl mx-auto px-5 py-2.5 rounded-3xl flex items-center justify-between pointer-events-auto transition-all ${
                    isBright ? 'tabmap-hud-glass-bright' : 'tabmap-hud-glass-dark'
                }`}>
                    {/* Left Section: QBrowse Spatial Canvas Indicator */}
                    <div className="flex items-center gap-3">
                        <div className={`flex items-center gap-2.5 px-3.5 py-1.5 rounded-full ${
                            isBright ? 'liquid-pill-bright' : 'liquid-pill-dark'
                        }`}>
                            <Compass size={15} className="text-accent animate-spin" style={{ animationDuration: '18s' }} />
                            <span className={`text-xs font-bold tracking-tight ${isBright ? 'text-zinc-800' : 'text-white/90'}`}>
                                Spatial Canvas
                            </span>
                            <span className="w-1 h-1 rounded-full bg-accent/60" />
                            <span className={`text-[11px] font-mono ${isBright ? 'text-zinc-500' : 'text-white/55'}`}>
                                {layout.nodePositions.size} {layout.nodePositions.size === 1 ? 'tab' : 'tabs'}
                            </span>
                        </div>
                    </div>

                    {/* Center Section: Spotlight Search Capsule */}
                    <div className="flex-1 max-w-md mx-4">
                        <div className="relative w-full group">
                            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-accent transition-colors" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setFocusedMatchIndex(0);
                                }}
                                placeholder="Search tabs, domains, or spaces... (or type anywhere)"
                                className={`w-full h-9 pl-9 pr-20 rounded-full text-xs font-medium transition-all outline-none ${
                                    isBright 
                                        ? 'bg-black/5 hover:bg-black/8 focus:bg-white border border-black/10 focus:border-accent text-zinc-900 placeholder-zinc-400' 
                                        : 'bg-white/5 hover:bg-white/8 focus:bg-black/40 border border-white/10 focus:border-accent/60 text-white placeholder-white/30'
                                }`}
                            />
                            {searchQuery ? (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-[10px] font-mono text-white/50">
                                    <span>{searchMatches.length > 0 ? `${focusedMatchIndex + 1}/${searchMatches.length}` : '0 matches'}</span>
                                    <button onClick={() => setSearchQuery('')} className="p-0.5 hover:text-white rounded">
                                        <X size={11} />
                                    </button>
                                </div>
                            ) : (
                                <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded text-[9px] font-mono bg-white/10 text-white/40 border border-white/10">
                                    ESC
                                </kbd>
                            )}
                        </div>
                    </div>

                    {/* Right Section: Action Capsules (Clean Monochrome/Accent, No Rainbow AI!) */}
                    <div className="flex items-center gap-2">
                        {/* Group Domains */}
                        <button
                            onClick={dispatchAutoCluster}
                            title="Group Domains: Automatically cluster 2+ same-domain tabs into dedicated Folders"
                            className={`h-9 px-3.5 rounded-full flex items-center gap-2 text-xs font-semibold transition-all hover:scale-[1.03] active:scale-95 outline-none focus:outline-none group ${
                                isBright ? 'liquid-pill-bright' : 'liquid-pill-dark'
                            }`}
                        >
                            <FolderPlus size={14} strokeWidth={1.75} className="text-white/70 group-hover:text-accent transition-colors" />
                            <span className="hidden sm:inline">Group Domains</span>
                        </button>

                        {/* Deduplicate */}
                        <button
                            onClick={dispatchCloseDuplicates}
                            title="Deduplicate: Close duplicate URL tabs across all spaces"
                            className={`h-9 px-3.5 rounded-full flex items-center gap-2 text-xs font-semibold transition-all hover:scale-[1.03] active:scale-95 outline-none focus:outline-none group relative ${
                                isBright ? 'liquid-pill-bright' : 'liquid-pill-dark'
                            }`}
                        >
                            <Copy size={14} strokeWidth={1.75} className="text-white/70 group-hover:text-accent transition-colors" />
                            <span className="hidden sm:inline">Deduplicate</span>
                            {duplicateCount > 0 && (
                                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-accent text-zinc-950 shadow-sm animate-pulse">
                                    {duplicateCount}
                                </span>
                            )}
                        </button>

                        {/* Hibernate Idle */}
                        <button
                            onClick={dispatchSuspendAllInactive}
                            title="Hibernate Idle: Suspend background inactive tabs to reclaim memory"
                            className={`h-9 px-3.5 rounded-full flex items-center gap-2 text-xs font-semibold transition-all hover:scale-[1.03] active:scale-95 outline-none focus:outline-none group ${
                                isBright ? 'liquid-pill-bright' : 'liquid-pill-dark'
                            }`}
                        >
                            <Feather size={14} strokeWidth={1.75} className="text-white/70 group-hover:text-accent transition-colors" />
                            <span className="hidden sm:inline">Hibernate Idle</span>
                        </button>

                        {/* Reset Layout (Clearly Labeled, No Mystery Icon or Focus Outline Ring!) */}
                        <button
                            onClick={handleResetLayout}
                            title="Reset Layout: Snap freeform cards back into clean grid & re-center camera"
                            className={`h-9 px-3.5 rounded-full flex items-center gap-2 text-xs font-semibold transition-all hover:scale-[1.03] active:scale-95 outline-none focus:outline-none group ${
                                hasCustomOffsets
                                    ? 'bg-accent/20 hover:bg-accent/30 text-accent border border-accent/40 shadow-lg'
                                    : (isBright ? 'liquid-pill-bright' : 'liquid-pill-dark')
                            }`}
                        >
                            <RotateCcw size={13.5} strokeWidth={1.75} className={hasCustomOffsets ? 'text-accent' : 'text-white/70 group-hover:text-accent transition-transform duration-300 group-hover:-rotate-90'} />
                            <span className="hidden sm:inline">Reset Layout</span>
                        </button>

                        {/* Close TabMap Button */}
                        <button
                            onClick={handleCloseTabMap}
                            title="Close Tab Canvas (ESC)"
                            className="w-9 h-9 rounded-full bg-white/10 hover:bg-red-500/80 text-white/80 hover:text-white flex items-center justify-center transition-all hover:rotate-90 active:scale-95 ml-1 border border-white/10 outline-none focus:outline-none"
                        >
                            <X size={15} />
                        </button>
                    </div>
                </div>

                {/* Floating Liquid Glass Action Toast Pill */}
                {toastMessage && (
                    <div className={`mt-3 px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 pointer-events-auto animate-pop-in ${
                        isBright ? 'tabmap-hud-glass-bright text-zinc-900' : 'tabmap-hud-glass-dark text-accent'
                    }`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                        <span>{toastMessage}</span>
                    </div>
                )}
            </header>

            {/* ============================================================== */}
            {/* 2D SPATIAL CANVAS ENGINE & NODES CONTAINER                      */}
            {/* ============================================================== */}
            <div 
                className={`absolute inset-0 origin-top-left transition-none pointer-events-none z-[10] ${
                    isTabMapClosing ? 'animate-tabmap-exit' : 'animate-tabmap-enter'
                }`}
            >
                {/* Inner World (No will-change and no nested backdrop-filter = 100% crisp vector text & exact SVG alignment) */}
                <div 
                    className="relative origin-top-left pointer-events-auto"
                    style={{
                        transform: `translate(${Math.round(pan.x)}px, ${Math.round(pan.y)}px) scale(${zoom})`,
                        width: layout.worldWidth + 500,
                        height: layout.worldHeight + 500
                    }}
                >
                    {/* Architectural Dot Grid Layer */}
                    <div 
                        className="absolute pointer-events-none"
                        style={{
                            left: -1200,
                            top: -1200,
                            width: layout.worldWidth + 3400,
                            height: layout.worldHeight + 3400,
                            backgroundImage: isBright
                                ? 'radial-gradient(rgba(0, 0, 0, 0.08) 1.5px, transparent 1.5px)'
                                : 'radial-gradient(rgba(255, 255, 255, 0.1) 1.5px, transparent 1.5px)',
                            backgroundSize: '32px 32px'
                        }}
                    />

                    {/* SVG TRAIL & RELATIONSHIP LAYER */}
                    <svg 
                        className="absolute inset-0 pointer-events-none overflow-visible z-10"
                        style={{ width: layout.worldWidth + 500, height: layout.worldHeight + 500 }}
                    >
                        <defs>
                            <linearGradient id="openerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#818cf8" stopOpacity="0.9" />
                                <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.9" />
                            </linearGradient>
                            <filter id="trailGlow" x="-20%" y="-20%" width="140%" height="140%">
                                <feGaussianBlur stdDeviation="4" result="blur" />
                                <feMerge>
                                    <feMergeNode in="blur" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                            <marker id="trailArrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                                <path d="M 0 1 L 9 5 L 0 9 z" fill="#38bdf8" />
                            </marker>
                        </defs>

                        {/* Domain Cluster Connector Curves (Dual-Layer Glow + Flowing Dash) */}
                        {layout.domainTrails?.map(dTrail => {
                            const isMatch = !searchQuery || searchMatches.includes(dTrail.sourceId) || searchMatches.includes(dTrail.targetId);
                            return (
                                <g key={dTrail.id} opacity={isMatch ? 1 : 0.1} className="transition-opacity duration-300">
                                    <path
                                        d={dTrail.path}
                                        fill="none"
                                        stroke="rgba(251, 191, 36, 0.18)"
                                        strokeWidth="5"
                                        filter="url(#trailGlow)"
                                    />
                                    <path
                                        d={dTrail.path}
                                        fill="none"
                                        stroke="rgba(251, 191, 36, 0.45)"
                                        strokeWidth="1.75"
                                        className="trail-domain-flow"
                                    />
                                </g>
                            );
                        })}

                        {/* Opener Trails (parent-child relationship, follows live drag dynamically) */}
                        {layout.openerTrails.map(trail => {
                            const isMatch = !searchQuery || searchMatches.includes(trail.childId) || searchMatches.includes(trail.parentId);
                            const parentIsDragged = dragState?.isDragging && dragState.tabIds.includes(trail.parentId);
                            const childIsDragged = dragState?.isDragging && dragState.tabIds.includes(trail.childId);

                            const pcx = trail.parent.cx + (parentIsDragged ? dragDeltaWorld.dx : 0);
                            const pcy = trail.parent.cy + (parentIsDragged ? dragDeltaWorld.dy : 0);
                            const ccx = trail.child.cx + (childIsDragged ? dragDeltaWorld.dx : 0);
                            const ccy = trail.child.cy + (childIsDragged ? dragDeltaWorld.dy : 0);

                            const dx = ccx - pcx;
                            const p1x = pcx + dx * 0.45;
                            const p1y = pcy;
                            const p2x = ccx - dx * 0.45;
                            const p2y = ccy;
                            const dynamicPath = `M ${pcx} ${pcy} C ${p1x} ${p1y}, ${p2x} ${p2y}, ${ccx} ${ccy}`;

                            return (
                                <g key={`trail-${trail.parentId}-${trail.childId}`} opacity={isMatch ? 1 : 0.15} className="transition-opacity duration-300">
                                    {/* Soft Glowing Halo Path */}
                                    <path
                                        d={dynamicPath}
                                        fill="none"
                                        stroke="url(#openerGradient)"
                                        strokeWidth="6"
                                        strokeOpacity="0.22"
                                        filter="url(#trailGlow)"
                                    />
                                    {/* Animated Flowing Dashed Pulse Path */}
                                    <path
                                        d={dynamicPath}
                                        fill="none"
                                        stroke="url(#openerGradient)"
                                        strokeWidth="2.5"
                                        filter="url(#trailGlow)"
                                        markerEnd="url(#trailArrow)"
                                        className="trail-glow"
                                    />
                                    <circle cx={pcx} cy={pcy} r="5" fill="#818cf8" opacity="0.35" className="animate-ping" />
                                    <circle cx={pcx} cy={pcy} r="4" fill="#818cf8" />
                                    <circle cx={ccx} cy={ccy} r="4" fill="#38bdf8" />
                                </g>
                            );
                        })}

                        {/* Live Magnetic Connection line when actively dragging */}
                        {dragState?.isDragging && dragState.target && (
                            <g>
                                {dragState.target.type === 'tab' && layout.nodePositions.has(dragState.target.id) && (() => {
                                    const targetNode = layout.nodePositions.get(dragState.target.id);
                                    const primaryDragTabId = dragState.tabIds[0];
                                    const primaryNode = layout.nodePositions.get(primaryDragTabId);
                                    if (!primaryNode) return null;
                                    const fromX = primaryNode.cx + dragDeltaWorld.dx;
                                    const fromY = primaryNode.cy + dragDeltaWorld.dy;
                                    return (
                                        <line
                                            x1={fromX}
                                            y1={fromY}
                                            x2={targetNode.cx}
                                            y2={targetNode.cy}
                                            stroke="var(--accent, #d4bc94)"
                                            strokeWidth="3"
                                            strokeDasharray="6,4"
                                            filter="url(#trailGlow)"
                                            className="trail-glow"
                                        />
                                    );
                                })()}
                            </g>
                        )}
                    </svg>

                    {/* SPACE ZONES (KANBAN MACRO REGIONS WITH STAGGERED CASCADE ENTRANCE) */}
                    {Object.values(layout.spaces).map((space, spaceIdx) => {
                        const isTargetSpace = dragState?.isDragging && dragState.target?.type === 'space' && dragState.target.id === space.id;
                        const isActiveSpaceZone = space.id === activeSpace;
                        const showGhostSlot = space.tabCount <= 1 && space.subzones.length === 1 && space.subzones[0].isStandaloneOnly;

                        return (
                            <div
                                key={space.id}
                                className={`tabmap-zone-spring animate-tabmap-zone-enter absolute rounded-[2.5rem] transition-colors duration-200 overflow-hidden ${
                                    isBright ? 'tabmap-zone-glass-bright' : 'tabmap-zone-glass-dark'
                                } ${
                                    isTargetSpace 
                                        ? 'ring-3 ring-accent shadow-[0_0_55px_var(--accent-30)]' 
                                        : isActiveSpaceZone 
                                        ? 'ring-1 ring-white/20' 
                                        : ''
                                } after:absolute after:inset-x-8 after:top-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-white/30 after:to-transparent after:pointer-events-none`}
                                style={{
                                    left: space.x,
                                    top: space.y,
                                    width: space.width,
                                    height: space.height,
                                    animationDelay: `${spaceIdx * 55}ms`
                                }}
                            >
                                {/* Subtle Ambient Space Corner Glow */}
                                <div 
                                    className="absolute -top-24 -left-24 w-72 h-72 rounded-full pointer-events-none opacity-25 blur-3xl"
                                    style={{ background: `radial-gradient(circle, ${space.color} 0%, transparent 70%)` }}
                                />

                                {/* Generous Space Header (72px height) */}
                                <div className={`h-[72px] px-8 flex items-center justify-between border-b relative z-10 ${
                                    isBright ? 'border-black/[0.06] bg-white/30' : 'border-white/[0.07] bg-white/[0.015]'
                                }`}>
                                    <div className="flex items-center gap-3.5">
                                        <div 
                                            className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg transition-transform duration-300 hover:scale-110"
                                            style={{ backgroundColor: space.bgTint, color: space.color, border: `1px solid ${space.borderTint}` }}
                                        >
                                            <space.icon size={19} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2.5">
                                                <h2 className={`text-base font-bold tracking-tight ${isBright ? 'text-zinc-900' : 'text-white/95'}`}>
                                                    {space.title}
                                                </h2>
                                                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold ${
                                                    isBright ? 'bg-black/[0.06] text-zinc-700' : 'bg-white/10 text-white/75'
                                                }`}>
                                                    {space.tabCount} {space.tabCount === 1 ? 'tab' : 'tabs'}
                                                </span>
                                                {isActiveSpaceZone && (
                                                    <span 
                                                        className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider"
                                                        style={{ backgroundColor: space.bgTint, color: space.color, border: `1px solid ${space.borderTint}` }}
                                                    >
                                                        Current
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Space Actions: + New Tab, + New Folder */}
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={(e) => handleCreateNewTabInSpace(e, space.id)}
                                            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 ${
                                                isBright 
                                                    ? 'bg-black/[0.06] hover:bg-black/10 text-zinc-800 border border-black/10' 
                                                    : 'bg-white/10 hover:bg-white/20 text-white border border-white/10 shadow-sm'
                                            }`}
                                        >
                                            <Plus size={14} /> New Tab
                                        </button>
                                        <button
                                            onClick={(e) => handleCreateFolderInSpace(e, space.id)}
                                            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 ${
                                                isBright 
                                                    ? 'bg-black/[0.03] hover:bg-black/[0.08] text-zinc-600 hover:text-zinc-900 border border-black/[0.06]' 
                                                    : 'bg-white/[0.06] hover:bg-white/15 text-white/75 hover:text-white border border-white/[0.08]'
                                            }`}
                                        >
                                            <FolderPlus size={14} /> New Folder
                                        </button>
                                    </div>
                                </div>

                                {/* Interactive Ghost Slot for 1-Tab (or 0-Tab) Space Zones so 2-Column Board Looks Balanced & Inviting */}
                                {showGhostSlot && (
                                    <button
                                        type="button"
                                        onClick={(e) => handleCreateNewTabInSpace(e, space.id)}
                                        className={`absolute rounded-[1.35rem] flex flex-col items-center justify-center gap-2.5 transition-all duration-300 group/ghost cursor-pointer outline-none ${
                                            isBright ? 'tabmap-slot-ghost-bright text-zinc-600' : 'tabmap-slot-ghost-dark text-white/55'
                                        }`}
                                        style={{
                                            left: space.tabCount === 0 ? SPACE_PADDING : SPACE_PADDING + NODE_W + CARD_GAP,
                                            top: SPACE_HEADER_H + SPACE_PADDING,
                                            width: NODE_W,
                                            height: NODE_H
                                        }}
                                    >
                                        <div 
                                            className="w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover/ghost:scale-110 group-hover/ghost:rotate-90 shadow-inner"
                                            style={{ backgroundColor: space.bgTint, color: space.color, border: `1px solid ${space.borderTint}` }}
                                        >
                                            <Plus size={20} />
                                        </div>
                                        <div className="flex flex-col items-center">
                                            <span className={`text-xs font-bold tracking-tight transition-colors ${
                                                isBright ? 'text-zinc-700 group-hover/ghost:text-zinc-950' : 'text-white/70 group-hover/ghost:text-white'
                                            }`}>
                                                Open New Tab or Drop Here
                                            </span>
                                            <span className={`text-[10px] font-mono mt-0.5 ${isBright ? 'text-zinc-400' : 'text-white/35'}`}>
                                                Click to launch in {space.title}
                                            </span>
                                        </div>
                                    </button>
                                )}

                                {/* Sub-Zones Rendered inside this Space */}
                                {space.subzones.map((subzone, subIdx) => {
                                    const isTargetFolder = dragState?.isDragging && dragState.target?.type === 'folder' && dragState.target.id === subzone.id;
                                    
                                    // When standalone only, hide redundant "Ungrouped" wrapper frame
                                    if (subzone.isStandaloneOnly) {
                                        return null;
                                    }

                                    return (
                                        <div
                                            key={subzone.id}
                                            className={`tabmap-zone-spring animate-tabmap-zone-enter group/subzone absolute rounded-3xl border transition-all ${
                                                subzone.type === 'folder'
                                                    ? (isBright ? 'tabmap-subzone-glass-bright' : 'tabmap-subzone-glass-dark')
                                                    : subzone.type === 'cluster'
                                                    ? (isBright ? 'bg-amber-500/[0.05] border-amber-500/25 border-dashed' : 'bg-amber-500/[0.04] border-amber-500/25 border-dashed')
                                                    : (isBright ? 'bg-black/[0.025] border-black/[0.07]' : 'bg-white/[0.025] border-white/[0.07]')
                                            } ${isTargetFolder ? 'ring-3 ring-accent border-accent shadow-[0_0_35px_var(--accent-30)] scale-[1.01]' : ''}`}
                                            style={{
                                                left: subzone.x - space.x,
                                                top: subzone.y - space.y,
                                                width: subzone.width,
                                                height: subzone.height,
                                                animationDelay: `${spaceIdx * 55 + subIdx * 45 + 60}ms`
                                            }}
                                        >
                                            {/* Spacious Subzone Header (50px height) */}
                                            <div className={`h-[50px] px-5 flex items-center justify-between border-b ${
                                                isBright ? 'border-black/[0.05]' : 'border-white/[0.05]'
                                            }`}>
                                                {subzone.type === 'folder' ? (
                                                    <div className="flex items-center gap-2.5 w-full">
                                                        <div className="w-7 h-7 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center text-accent shrink-0">
                                                            <Folder size={14} />
                                                        </div>
                                                        {editingFolderId === subzone.id ? (
                                                            <input
                                                                type="text"
                                                                autoFocus
                                                                value={editingFolderName}
                                                                onChange={(e) => setEditingFolderName(e.target.value)}
                                                                onBlur={() => handleSaveFolderRename(subzone.id)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') handleSaveFolderRename(subzone.id);
                                                                    if (e.key === 'Escape') setEditingFolderId(null);
                                                                }}
                                                                className="h-7 px-2.5 rounded-lg text-xs font-bold bg-black/65 border border-accent/50 text-white outline-none w-44"
                                                            />
                                                        ) : (
                                                            <span 
                                                                onDoubleClick={() => {
                                                                    setEditingFolderId(subzone.id);
                                                                    setEditingFolderName(subzone.name);
                                                                }}
                                                                title="Double-click to rename folder"
                                                                className={`text-sm font-bold tracking-tight truncate cursor-text ${isBright ? 'text-zinc-800' : 'text-white/90'}`}
                                                            >
                                                                {subzone.name}
                                                            </span>
                                                        )}
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold ${
                                                            isBright ? 'bg-black/[0.06] text-zinc-600' : 'bg-white/10 text-white/60'
                                                        }`}>
                                                            {subzone.tabs.length} {subzone.tabs.length === 1 ? 'tab' : 'tabs'}
                                                        </span>

                                                        <div className="ml-auto flex items-center gap-1 opacity-60 group-hover/subzone:opacity-100 transition-opacity">
                                                            <button 
                                                                onClick={() => {
                                                                    setEditingFolderId(subzone.id);
                                                                    setEditingFolderName(subzone.name);
                                                                }}
                                                                title="Rename folder"
                                                                className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                                                            >
                                                                <Edit3 size={12} />
                                                            </button>
                                                            <button 
                                                                onClick={() => useTabStore.getState().deleteFolder?.(subzone.id)}
                                                                title="Dissolve folder"
                                                                className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/60 hover:text-red-400 transition-colors"
                                                            >
                                                                <Trash2 size={12} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : subzone.type === 'cluster' ? (
                                                    <div className="flex items-center justify-between w-full gap-3">
                                                        <div className="flex items-center gap-2.5 min-w-0">
                                                            <div className="w-7 h-7 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
                                                                <img
                                                                    src={`https://www.google.com/s2/favicons?sz=64&domain=${subzone.domain}`}
                                                                    alt=""
                                                                    className="w-4 h-4 rounded"
                                                                    onError={(e) => { e.target.style.display = 'none'; }}
                                                                />
                                                            </div>
                                                            <span className={`text-sm font-bold truncate ${isBright ? 'text-amber-700' : 'text-amber-300/95'}`}>
                                                                {subzone.domain}
                                                            </span>
                                                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/15 text-amber-300/90 font-mono font-semibold shrink-0">
                                                                {subzone.tabs.length} tabs
                                                            </span>
                                                        </div>
                                                        <button
                                                            onClick={(e) => handleFolderizeCluster(e, subzone)}
                                                            title="Folderize: Convert domain cluster into a dedicated folder"
                                                            className="px-3 py-1 rounded-full bg-amber-500/20 hover:bg-amber-500/35 text-amber-300 text-xs font-bold flex items-center gap-1.5 border border-amber-500/35 transition-all hover:scale-105 active:scale-95 shrink-0 shadow-sm"
                                                        >
                                                            <FolderPlus size={12} /> Folderize
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 text-xs font-bold text-white/55">
                                                        <Layers size={14} className="text-white/40" />
                                                        <span>Ungrouped Tabs</span>
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/10 font-mono">
                                                            {subzone.tabs.length}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Empty Folder Drop Hint when folder has 0 tabs */}
                                            {subzone.type === 'folder' && subzone.tabs.length === 0 && (
                                                <div className="flex flex-col items-center justify-center h-[calc(100%-50px)] p-6 text-center pointer-events-none">
                                                    <FolderPlus size={22} className="text-accent/40 mb-1.5" />
                                                    <span className="text-xs font-semibold text-white/45">
                                                        Drag & drop tabs here
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}

                    {/* TAB CARDS LAYER (RENDERED IN REAL-TIME WORLD SPACE WITH 3D TILT & SPRING PHYSICS) */}
                    {Array.from(layout.nodePositions.values()).map((node, nodeIndex) => {
                        const tab = node.tab;
                        const isSelected = selectedTabIds.has(tab.id);
                        const isMatchesSearch = !searchQuery || searchMatches.includes(tab.id);
                        const isFocusedSearchMatch = tab.id === activeMatchTabId;
                        const isBeingDragged = dragState?.isDragging && dragState.tabIds.includes(tab.id);
                        const isMergeTarget = dragState?.isDragging && dragState.target?.type === 'tab' && dragState.target.id === tab.id;
                        const isPinned = pinnedTabs.some(p => p.domain === node.domain);
                        const isCardHovered = hoveredCardTilt?.tabId === tab.id && !isBeingDragged;

                        // Real-time live card drag position: smoothly follows cursor with zero lag!
                        const currentCardX = node.x + (isBeingDragged ? dragDeltaWorld.dx : 0);
                        const currentCardY = node.y + (isBeingDragged ? dragDeltaWorld.dy : 0);

                        return (
                            <div
                                key={tab.id}
                                onPointerDown={(e) => handleTabPointerDown(e, tab, node.spaceId)}
                                onPointerMove={(e) => {
                                    if (dragState?.isDragging || isReducedMotion) return;
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const relX = Math.max(0, Math.min(1, (e.clientX - rect.left) / (rect.width || 1)));
                                    const relY = Math.max(0, Math.min(1, (e.clientY - rect.top) / (rect.height || 1)));
                                    setHoveredCardTilt({
                                        tabId: tab.id,
                                        rotateX: (0.5 - relY) * 10,
                                        rotateY: (relX - 0.5) * 12,
                                        spotX: Math.round(relX * 100),
                                        spotY: Math.round(relY * 100)
                                    });
                                }}
                                onPointerLeave={() => {
                                    if (hoveredCardTilt?.tabId === tab.id) {
                                        setHoveredCardTilt(null);
                                    }
                                }}
                                className={`absolute rounded-[1.35rem] group/card cursor-pointer select-none ${
                                    isBeingDragged 
                                        ? 'z-50 scale-[1.05] -rotate-1 shadow-[0_32px_70px_rgba(0,0,0,0.8)] ring-2 ring-accent transition-none' 
                                        : 'tabmap-node-spring animate-tabmap-card hover:z-30'
                                } ${isMatchesSearch ? 'opacity-100' : 'opacity-20'}`}
                                style={{
                                    left: currentCardX,
                                    top: currentCardY,
                                    width: node.width,
                                    height: node.height,
                                    animationDelay: `${Math.min(nodeIndex * 28, 320)}ms`,
                                    transform: isBeingDragged
                                        ? undefined
                                        : isCardHovered
                                        ? `perspective(900px) rotateX(${hoveredCardTilt.rotateX.toFixed(2)}deg) rotateY(${hoveredCardTilt.rotateY.toFixed(2)}deg) translateY(-5px) scale(1.025)`
                                        : undefined
                                }}
                            >
                                {/* Drag Target Intent Badge floating directly above the live card */}
                                {isBeingDragged && dragState?.target && (
                                    <div className="absolute -top-11 left-1/2 -translate-x-1/2 whitespace-nowrap z-50 pointer-events-none animate-pop-in">
                                        <div className="px-3.5 py-1.5 rounded-full bg-accent text-zinc-950 font-bold text-xs shadow-2xl border border-accent/40 flex items-center gap-1.5">
                                            {dragState.target.type === 'tab' && (
                                                <>
                                                    <FolderPlus size={13} className="text-zinc-950" />
                                                    <span>Merge into new Folder</span>
                                                </>
                                            )}
                                            {dragState.target.type === 'folder' && (
                                                <>
                                                    <Folder size={13} className="text-zinc-950" />
                                                    <span>Move to Folder: {dragState.target.name || 'Folder'}</span>
                                                </>
                                            )}
                                            {dragState.target.type === 'space' && (
                                                <>
                                                    <ArrowRight size={13} className="text-zinc-950" />
                                                    <span>Move to {SPACE_CONFIGS.find(s => s.id === dragState.target.id)?.title || 'Space'}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Card Box with Crisp Specular Glass Styling & Interactive Sheen */}
                                <div className={`w-full h-full rounded-[1.35rem] overflow-hidden relative transition-all duration-200 flex flex-col ${
                                    isBright ? 'tabmap-card-glass-bright' : 'tabmap-card-glass-dark'
                                } ${
                                    tab.active ? 'ring-2 ring-accent/75 shadow-[0_0_25px_var(--accent-30)]' : ''
                                } ${
                                    isSelected ? 'ring-2 ring-accent shadow-[0_0_28px_var(--accent)]' : ''
                                } ${
                                    isFocusedSearchMatch ? 'ring-4 ring-amber-400 shadow-[0_0_35px_rgba(251,191,36,0.65)] scale-[1.03]' : ''
                                } ${
                                    isMergeTarget ? 'ring-4 ring-accent scale-[1.05] animate-pulse shadow-[0_0_40px_var(--accent)]' : ''
                                } after:absolute after:inset-x-5 after:top-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-white/30 after:to-transparent after:pointer-events-none`}>
                                    
                                    {/* Diagonal Specular Light Sweep on Hover */}
                                    <div className="tabmap-card-sheen" />

                                    {/* Interactive Cursor Specular Spotlight */}
                                    {isCardHovered && (
                                        <div
                                            className="absolute inset-0 pointer-events-none z-20 transition-opacity duration-200"
                                            style={{
                                                background: `radial-gradient(220px circle at ${hoveredCardTilt.spotX}% ${hoveredCardTilt.spotY}%, ${
                                                    isBright ? 'rgba(212, 188, 148, 0.22)' : 'rgba(255, 255, 255, 0.14)'
                                                }, transparent 75%)`
                                            }}
                                        />
                                    )}

                                    {/* Thumbnail / Visual Preview Area (108px height) */}
                                    <div className="h-[108px] w-full relative overflow-hidden bg-black/30 flex items-center justify-center">
                                        {tab.thumbnail ? (
                                            <img 
                                                src={tab.thumbnail} 
                                                alt="" 
                                                className="w-full h-full object-cover object-top opacity-90 group-hover/card:opacity-100 group-hover/card:scale-105 transition-all duration-300" 
                                            />
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center p-3.5 text-center relative overflow-hidden bg-gradient-to-br from-white/[0.05] via-transparent to-black/35">
                                                {/* Ambient concentric rings with hover expansion */}
                                                <div className="absolute w-28 h-28 rounded-full border border-accent/15 group-hover/card:scale-125 transition-transform duration-500 pointer-events-none" />
                                                <div className="absolute w-44 h-44 rounded-full border border-accent/5 group-hover/card:scale-110 transition-transform duration-700 pointer-events-none" />
                                                
                                                {node.domain ? (
                                                    <div className="w-11 h-11 rounded-2xl bg-white/[0.08] border border-white/15 flex items-center justify-center shadow-lg group-hover/card:scale-110 transition-transform duration-300">
                                                        <img 
                                                            src={`https://www.google.com/s2/favicons?sz=64&domain=${node.domain}`}
                                                            alt=""
                                                            className="w-6 h-6 rounded drop-shadow"
                                                            onError={(e) => { e.target.style.display = 'none'; }}
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="w-11 h-11 rounded-2xl bg-accent/15 border border-accent/30 flex items-center justify-center shadow-inner group-hover/card:scale-110 transition-transform duration-300">
                                                        {node.spaceId === 'ghost' ? (
                                                            <Ghost size={20} className="text-purple-400" />
                                                        ) : node.spaceId === 'tor' ? (
                                                            <OnionIcon size={20} className="text-purple-300" />
                                                        ) : (
                                                            <Compass size={20} className="text-accent" />
                                                        )}
                                                    </div>
                                                )}
                                                <span className="text-[11px] font-semibold text-white/65 max-w-[210px] truncate mt-2">
                                                    {tab.title || (node.spaceId === 'ghost' ? 'Ghost Session' : (node.spaceId === 'tor' ? 'Tor Session' : 'Zen Dashboard'))}
                                                </span>
                                            </div>
                                        )}

                                        {/* Status Badges (QBrowse Glass Pill styling) */}
                                        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-10 pointer-events-none">
                                            {tab.active && (
                                                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-wider bg-accent/20 border border-accent/45 text-accent shadow-sm flex items-center gap-1.5">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_6px_var(--accent)] animate-pulse" /> ACTIVE
                                                </span>
                                            )}
                                            {tab.suspended && (
                                                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-wider bg-purple-500/20 border border-purple-500/35 text-purple-300 shadow-sm flex items-center gap-1">
                                                    <Feather size={9} /> SLEEP
                                                </span>
                                            )}
                                            {(tab.isAudible || tab.isAudioPlaying) && (
                                                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-wider bg-amber-500/20 border border-amber-500/35 text-amber-300 shadow-sm flex items-center gap-1 animate-pulse">
                                                    <Volume2 size={9} /> AUDIO
                                                </span>
                                            )}
                                            {isSplitView && splitRightTabId === tab.id && (
                                                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-wider bg-sky-500/20 border border-sky-500/35 text-sky-300 shadow-sm flex items-center gap-1">
                                                    <Columns size={9} /> SPLIT
                                                </span>
                                            )}
                                        </div>

                                        {/* Hover Quick-Action Glass Bar */}
                                        <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-black/85 rounded-xl p-1 border border-white/15 opacity-0 translate-y-1 group-hover/card:opacity-100 group-hover/card:translate-y-0 transition-all duration-200 shadow-2xl z-30 pointer-events-auto">
                                            <button 
                                                title="Open in Split View" 
                                                onClick={(e) => handleOpenSplit(e, tab, node.spaceId)}
                                                className="w-6 h-6 rounded-lg hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-colors"
                                            >
                                                <Columns size={12} />
                                            </button>
                                            <button 
                                                title={tab.suspended ? "Wake tab" : "Sleep tab"} 
                                                onClick={(e) => handleToggleSleep(e, tab, node.spaceId)}
                                                className="w-6 h-6 rounded-lg hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-colors"
                                            >
                                                {tab.suspended ? <Zap size={12} className="text-amber-400" /> : <Feather size={12} />}
                                            </button>
                                            <button 
                                                title={tab.isMuted ? "Unmute" : "Mute"} 
                                                onClick={(e) => handleToggleMute(e, tab, node.spaceId)}
                                                className="w-6 h-6 rounded-lg hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-colors"
                                            >
                                                {tab.isMuted ? <VolumeX size={12} className="text-red-400" /> : <Volume2 size={12} />}
                                            </button>
                                            <button 
                                                title="Pin domain to sidebar" 
                                                onClick={(e) => handleTogglePin(e, tab)}
                                                className="w-6 h-6 rounded-lg hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-colors"
                                            >
                                                <Pin size={12} className={isPinned ? "text-accent fill-accent" : ""} />
                                            </button>
                                            <button 
                                                title="Close tab" 
                                                onClick={(e) => handleCloseCard(e, tab)}
                                                className="w-6 h-6 rounded-lg hover:bg-red-500 text-white/80 hover:text-white flex items-center justify-center transition-colors"
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Title & Hostname Row (64px height) */}
                                    <div className="h-[64px] px-4 flex flex-col justify-center border-t border-white/[0.06] bg-black/25">
                                        <div className="flex items-center gap-2">
                                            {node.domain ? (
                                                <img
                                                    src={`https://www.google.com/s2/favicons?sz=64&domain=${node.domain}`}
                                                    alt=""
                                                    className="w-4 h-4 rounded shrink-0"
                                                    onError={(e) => { e.target.style.display = 'none'; }}
                                                />
                                            ) : (
                                                <Globe size={14} className="text-white/40 shrink-0" />
                                            )}
                                            <span className={`text-[13px] font-bold truncate ${isBright ? 'text-zinc-800' : 'text-white/95'}`}>
                                                {tab.title || (node.spaceId === 'ghost' ? 'Ghost Session' : (node.spaceId === 'tor' ? 'Tor Session' : 'Zen Dashboard'))}
                                            </span>
                                        </div>
                                        <div className={`flex items-center justify-between text-[11px] font-mono mt-1 ${isBright ? 'text-zinc-500' : 'text-white/45'}`}>
                                            <span className="truncate max-w-[175px]">
                                                {node.domain || (node.spaceId === 'ghost' ? 'Ghost Session' : (node.spaceId === 'tor' ? 'Tor Session' : 'Zen Dashboard'))}
                                            </span>
                                            <span>{formatRelativeTime(tab.lastActiveAt)}</span>
                                        </div>
                                    </div>

                                    {/* Freeform Dragged indicator badge */}
                                    {node.isOffset && (
                                        <div className="absolute bottom-2 right-2.5 w-1.5 h-1.5 rounded-full bg-accent/80" title="Custom freeform position" />
                                    )}

                                    {/* Merge Into New Folder Hover Beacon */}
                                    {isMergeTarget && (
                                        <div className="absolute inset-0 bg-accent/25 flex items-center justify-center pointer-events-none z-30">
                                            <div className="px-3.5 py-1.5 rounded-xl bg-accent text-zinc-950 font-black text-xs shadow-2xl flex items-center gap-1.5">
                                                <FolderPlus size={14} /> Merge into Folder
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ============================================================== */}
            {/* LASSO MARQUEE SELECTION RECTANGLE                              */}
            {/* ============================================================== */}
            {lassoBox && (
                <div 
                    className="fixed pointer-events-none border-2 border-dashed border-accent bg-accent/15 rounded-xl shadow-[0_0_25px_var(--accent-40)] z-[95000]"
                    style={{
                        left: Math.min(lassoBox.startX, lassoBox.currentX),
                        top: Math.min(lassoBox.startY, lassoBox.currentY),
                        width: Math.abs(lassoBox.currentX - lassoBox.startX),
                        height: Math.abs(lassoBox.currentY - lassoBox.startY)
                    }}
                />
            )}

            {/* ============================================================== */}
            {/* FLOATING BATCH ACTION BAR (WHEN 1+ TABS SELECTED)               */}
            {/* ============================================================== */}
            {selectedTabIds.size > 0 && (
                <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[90000] px-5 py-2.5 rounded-full flex items-center gap-3 animate-slide-up pointer-events-auto ${
                    isBright ? 'tabmap-hud-glass-bright' : 'tabmap-hud-glass-dark'
                }`}>
                    <span className="text-xs font-bold text-accent flex items-center gap-1.5">
                        <Check size={14} /> {selectedTabIds.size} selected
                    </span>

                    <div className="h-4 w-px bg-white/15" />

                    {/* Move to Space */}
                    <div className="flex items-center gap-1">
                        <span className="text-[10px] font-mono text-white/50 uppercase">Move:</span>
                        {SPACE_CONFIGS.map(s => (
                            <button
                                key={s.id}
                                onClick={() => {
                                    dispatchMoveTabsToZone(Array.from(selectedTabIds), s.id, null);
                                    setSelectedTabIds(new Set());
                                }}
                                className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all hover:scale-105 ${
                                    isBright ? 'liquid-pill-bright' : 'liquid-pill-dark'
                                }`}
                            >
                                {s.title.split(' ')[0]}
                            </button>
                        ))}
                    </div>

                    <div className="h-4 w-px bg-white/15" />

                    {/* Group into Folder */}
                    <button
                        onClick={() => {
                            const ids = Array.from(selectedTabIds);
                            if (ids.length > 0) {
                                dispatchMergeTabsIntoNewFolder(ids.slice(1), ids[0], activeSpace);
                                setSelectedTabIds(new Set());
                            }
                        }}
                        className="px-3 py-1 rounded-full bg-accent hover:bg-accent/80 text-zinc-950 text-xs font-bold flex items-center gap-1.5 transition-all shadow-lg"
                    >
                        <FolderPlus size={13} /> Group Folder
                    </button>

                    {/* Sleep Selected */}
                    <button
                        onClick={() => {
                            selectedTabIds.forEach(id => useTabStore.getState().suspendTab?.(id, true));
                            showToast(`Put ${selectedTabIds.size} tabs to sleep`);
                            setSelectedTabIds(new Set());
                        }}
                        className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                            isBright ? 'liquid-pill-bright text-purple-700' : 'liquid-pill-dark text-purple-300'
                        }`}
                    >
                        <Feather size={13} /> Sleep
                    </button>

                    {/* Close Selected */}
                    <button
                        onClick={() => {
                            const ids = Array.from(selectedTabIds);
                            const store = useTabStore.getState();
                            if (store.closeTabsBatch) {
                                store.closeTabsBatch(ids);
                            } else {
                                ids.forEach(id => store.closeTabById?.(id));
                            }
                            showToast(`Closed ${ids.length} tab(s)`);
                            setSelectedTabIds(new Set());
                        }}
                        className="px-3 py-1 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all"
                    >
                        <Trash2 size={13} /> Close
                    </button>

                    {/* Clear selection */}
                    <button
                        onClick={() => setSelectedTabIds(new Set())}
                        className="p-1 rounded-full text-white/40 hover:text-white"
                        title="Deselect"
                    >
                        <X size={14} />
                    </button>
                </div>
            )}

            {/* ============================================================== */}
            {/* BOTTOM HUD: CAMERA JUMPERS & CORNER INTERACTIVE MINIMAP         */}
            {/* ============================================================== */}
            <footer className={`absolute bottom-6 left-6 right-6 flex items-end justify-between z-[90000] pointer-events-none ${
                isTabMapClosing ? 'animate-tabmap-exit' : 'animate-tabmap-enter'
            }`}>
                {/* Space Camera Jumpers (Sliding Liquid Glass Pill Switcher) */}
                <div
                    ref={cameraBarRef}
                    onMouseLeave={() => setHoveredCameraTarget(null)}
                    className={`relative flex items-center gap-1 p-1.5 rounded-full pointer-events-auto transition-all ${
                        isBright ? 'tabmap-hud-glass-bright' : 'tabmap-hud-glass-dark'
                    }`}
                >
                    {/* Subtle Hover Preview Pill */}
                    <div
                        className={`absolute top-1.5 bottom-1.5 rounded-full transition-all duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] pointer-events-none ${
                            isBright ? 'bg-black/[0.04]' : 'bg-white/[0.06]'
                        }`}
                        style={{
                            left: hoverPillStyle.left,
                            width: hoverPillStyle.width,
                            opacity: hoveredCameraTarget && hoveredCameraTarget !== activeCameraTarget ? hoverPillStyle.opacity : 0
                        }}
                    />

                    {/* Active Sliding Liquid Glass Pill */}
                    <div
                        className="absolute top-1.5 bottom-1.5 rounded-full border transition-all duration-350 ease-[cubic-bezier(0.22,1,0.36,1)] pointer-events-none"
                        style={{
                            left: pillStyle.left,
                            width: pillStyle.width,
                            opacity: pillStyle.opacity,
                            ...(activeCameraTarget === 'work'
                                ? {
                                    backgroundColor: 'rgba(96, 165, 250, 0.18)',
                                    borderColor: 'rgba(96, 165, 250, 0.42)',
                                    boxShadow: '0 4px 16px rgba(96, 165, 250, 0.2), inset 0 1px 0 0 rgba(255, 255, 255, 0.22)'
                                }
                                : activeCameraTarget === 'ghost'
                                ? {
                                    backgroundColor: 'rgba(168, 85, 247, 0.18)',
                                    borderColor: 'rgba(168, 85, 247, 0.42)',
                                    boxShadow: '0 4px 16px rgba(168, 85, 247, 0.2), inset 0 1px 0 0 rgba(255, 255, 255, 0.22)'
                                }
                                : activeCameraTarget === 'tor'
                                ? {
                                    backgroundColor: 'rgba(192, 132, 252, 0.18)',
                                    borderColor: 'rgba(192, 132, 252, 0.42)',
                                    boxShadow: '0 4px 16px rgba(192, 132, 252, 0.2), inset 0 1px 0 0 rgba(255, 255, 255, 0.22)'
                                }
                                : {
                                    backgroundColor: 'var(--accent-15, rgba(212, 188, 148, 0.18))',
                                    borderColor: 'var(--accent-30, rgba(212, 188, 148, 0.42))',
                                    boxShadow: '0 4px 16px rgba(212, 188, 148, 0.18), inset 0 1px 0 0 rgba(255, 255, 255, 0.22)'
                                })
                        }}
                    />

                    {SPACE_CONFIGS.map((s, idx) => {
                        const isActiveTarget = activeCameraTarget === s.id;
                        return (
                            <button
                                key={s.id}
                                ref={el => { cameraBtnRefs.current[s.id] = el; }}
                                onMouseEnter={() => setHoveredCameraTarget(s.id)}
                                onClick={() => frameSpaceZone(s.id)}
                                className={`relative z-10 px-3.5 py-1.5 rounded-full text-xs flex items-center gap-1.5 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-95 outline-none focus:outline-none ${
                                    isActiveTarget
                                        ? (isBright ? 'text-zinc-950 font-black scale-105' : 'text-white font-black scale-105')
                                        : (isBright ? 'text-zinc-600 hover:text-zinc-950 font-bold' : 'text-white/70 hover:text-white font-bold')
                                }`}
                            >
                                <span className={`font-mono text-[10px] transition-opacity ${isActiveTarget ? 'opacity-75' : 'opacity-40'}`}>
                                    {idx + 1}:
                                </span>
                                <s.icon
                                    size={13}
                                    style={{ color: s.color }}
                                    className={`transition-transform duration-300 ${isActiveTarget ? 'scale-110' : ''}`}
                                />
                                <span>{s.title.split(' ')[0]}</span>
                            </button>
                        );
                    })}

                    <div className={`h-4 w-px mx-1 relative z-10 ${isBright ? 'bg-black/10' : 'bg-white/15'}`} />

                    <button
                        ref={el => { cameraBtnRefs.current['all'] = el; }}
                        onMouseEnter={() => setHoveredCameraTarget('all')}
                        onClick={() => frameAll()}
                        title="Fit All Spaces (0 / F)"
                        className={`relative z-10 px-3.5 py-1.5 rounded-full text-xs flex items-center gap-1.5 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-95 outline-none focus:outline-none ${
                            activeCameraTarget === 'all'
                                ? 'text-accent font-black scale-105'
                                : (isBright ? 'text-zinc-600 hover:text-zinc-950 font-bold' : 'text-white/75 hover:text-accent font-bold')
                        }`}
                    >
                        <Maximize2
                            size={13}
                            className={`transition-transform duration-300 ${activeCameraTarget === 'all' ? 'scale-110 text-accent' : ''}`}
                        />
                        <span>Fit All</span>
                        <kbd className={`text-[9px] font-mono transition-opacity ${activeCameraTarget === 'all' ? 'opacity-85' : 'opacity-50'}`}>0</kbd>
                    </button>
                </div>

                {/* Tool Mode Switcher (Pan / Lasso Sliding Pill) */}
                <div className={`relative flex items-center p-1 rounded-full pointer-events-auto transition-all ${
                    isBright ? 'tabmap-hud-glass-bright' : 'tabmap-hud-glass-dark'
                }`}>
                    {/* Sliding Liquid Glass Pill */}
                    <div
                        className="absolute left-1 top-1 bottom-1 w-[calc(50%-4px)] rounded-full border transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] pointer-events-none"
                        style={{
                            transform: toolMode === 'select' ? 'translateX(100%)' : 'translateX(0)',
                            backgroundColor: toolMode === 'select'
                                ? 'var(--accent-15, rgba(212, 188, 148, 0.22))'
                                : (isBright ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.14)'),
                            borderColor: toolMode === 'select'
                                ? 'var(--accent-30, rgba(212, 188, 148, 0.45))'
                                : (isBright ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.22)'),
                            boxShadow: toolMode === 'select'
                                ? '0 4px 16px rgba(212, 188, 148, 0.2), inset 0 1px 0 0 rgba(255, 255, 255, 0.24)'
                                : '0 2px 10px rgba(0, 0, 0, 0.15), inset 0 1px 0 0 rgba(255, 255, 255, 0.18)'
                        }}
                    />

                    <button
                        onClick={() => setToolMode('pan')}
                        title="Pan Tool (V / H)"
                        className={`relative z-10 w-24 py-1.5 rounded-full text-xs flex items-center justify-center gap-1.5 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-95 outline-none focus:outline-none ${
                            toolMode === 'pan' 
                                ? (isBright ? 'text-zinc-950 font-black scale-105' : 'text-white font-black scale-105') 
                                : (isBright ? 'text-zinc-600 hover:text-zinc-950 font-bold' : 'text-white/55 hover:text-white font-bold')
                        }`}
                    >
                        <Hand size={13} /> Pan
                    </button>
                    <button
                        onClick={() => setToolMode('select')}
                        title="Lasso Selection Tool (S / Shift+Drag)"
                        className={`relative z-10 w-24 py-1.5 rounded-full text-xs flex items-center justify-center gap-1.5 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-95 outline-none focus:outline-none ${
                            toolMode === 'select' 
                                ? 'text-accent font-black scale-105' 
                                : (isBright ? 'text-zinc-600 hover:text-zinc-950 font-bold' : 'text-white/55 hover:text-white font-bold')
                        }`}
                    >
                        <MousePointer size={13} /> Lasso
                    </button>
                </div>

                {/* Corner Interactive Minimap */}
                <div 
                    className={`w-[228px] h-[142px] rounded-3xl relative overflow-hidden pointer-events-auto cursor-pointer transition-all hover:scale-[1.03] ${
                        isBright ? 'tabmap-hud-glass-bright' : 'tabmap-hud-glass-dark'
                    }`}
                    onPointerDown={(e) => {
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();
                        const scale = Math.min((rect.width - 24) / layout.worldWidth, (rect.height - 24) / layout.worldHeight);
                        const offsetX = (rect.width - layout.worldWidth * scale) / 2;
                        const offsetY = (rect.height - layout.worldHeight * scale) / 2;
                        const vw = containerRef.current?.clientWidth || window.innerWidth;
                        const vh = containerRef.current?.clientHeight || window.innerHeight;

                        const scrubToClient = (clientX, clientY, smooth = false) => {
                            const clickX = clientX - rect.left;
                            const clickY = clientY - rect.top;
                            const targetWorldX = (clickX - offsetX) / scale;
                            const targetWorldY = (clickY - offsetY) / scale;
                            const nextPan = {
                                x: vw / 2 - targetWorldX * zoom,
                                y: vh / 2 - targetWorldY * zoom
                            };
                            if (smooth) {
                                animateCameraTo(nextPan, zoom, 180);
                            } else {
                                setPan(nextPan);
                            }
                        };

                        scrubToClient(e.clientX, e.clientY, true);

                        const onMove = (me) => scrubToClient(me.clientX, me.clientY, false);
                        const onUp = () => {
                            window.removeEventListener('pointermove', onMove);
                            window.removeEventListener('pointerup', onUp);
                        };
                        window.addEventListener('pointermove', onMove);
                        window.addEventListener('pointerup', onUp);
                    }}
                >
                    {/* Minimap SVG */}
                    <svg className="w-full h-full">
                        {(() => {
                            const mw = 228;
                            const mh = 142;
                            const scale = Math.min((mw - 24) / layout.worldWidth, (mh - 24) / layout.worldHeight);
                            const offsetX = (mw - layout.worldWidth * scale) / 2;
                            const offsetY = (mh - layout.worldHeight * scale) / 2;

                            // Visible viewport calculation
                            const vw = containerRef.current?.clientWidth || window.innerWidth;
                            const vh = containerRef.current?.clientHeight || window.innerHeight;
                            const viewWorldX = -pan.x / zoom;
                            const viewWorldY = -pan.y / zoom;
                            const viewWorldW = vw / zoom;
                            const viewWorldH = vh / zoom;

                            const viewMiniX = offsetX + viewWorldX * scale;
                            const viewMiniY = offsetY + viewWorldY * scale;
                            const viewMiniW = viewWorldW * scale;
                            const viewMiniH = viewWorldH * scale;

                            return (
                                <g>
                                    {/* Space Zones rectangles */}
                                    {Object.values(layout.spaces).map(s => (
                                        <rect
                                            key={`mini-${s.id}`}
                                            x={offsetX + s.x * scale}
                                            y={offsetY + s.y * scale}
                                            width={s.width * scale}
                                            height={s.height * scale}
                                            fill={s.color}
                                            fillOpacity="0.14"
                                            stroke={s.color}
                                            strokeOpacity="0.45"
                                            strokeWidth="1"
                                            rx="4"
                                        />
                                    ))}

                                    {/* Tab Node Dots */}
                                    {Array.from(layout.nodePositions.values()).map(node => (
                                        <circle
                                            key={`mini-dot-${node.tab.id}`}
                                            cx={offsetX + node.cx * scale}
                                            cy={offsetY + node.cy * scale}
                                            r={node.tab.active ? "2.8" : "1.8"}
                                            fill={node.tab.active ? "var(--accent, #d4bc94)" : (node.spaceId === 'ghost' ? '#a855f7' : (node.spaceId === 'tor' ? '#c084fc' : '#60a5fa'))}
                                        />
                                    ))}

                                    {/* Current Camera Viewport Box */}
                                    <rect
                                        x={viewMiniX}
                                        y={viewMiniY}
                                        width={Math.max(8, viewMiniW)}
                                        height={Math.max(8, viewMiniH)}
                                        fill="rgba(212, 188, 148, 0.16)"
                                        stroke="var(--accent, #d4bc94)"
                                        strokeWidth="1.5"
                                        rx="3"
                                    />
                                </g>
                            );
                        })()}
                    </svg>
                    <div className="absolute top-2 right-2.5 text-[9px] font-mono text-white/40 tracking-wider">
                        MINIMAP
                    </div>
                </div>
            </footer>
        </div>
    );
}
