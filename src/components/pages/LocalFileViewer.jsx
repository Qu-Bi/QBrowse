import React, { useState, useEffect } from 'react';
import LocalDirectoryPage from './LocalDirectoryPage';
import GlassPdfViewer from './GlassPdfViewer';
import GlassDocumentViewer from './GlassDocumentViewer';
import useTabStore from '../../store/useTabStore';

export default function LocalFileViewer({ tab }) {
    const url = tab?.url || '';
    const [probeResult, setProbeResult] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        setLoading(true);

        const probePath = async () => {
            if (window.electronAPI?.readLocalFileData) {
                try {
                    const res = await window.electronAPI.readLocalFileData(url);
                    if (!isMounted) return;
                    setProbeResult(res);
                } catch (e) {
                    if (!isMounted) return;
                    setProbeResult({ error: e.message });
                } finally {
                    if (isMounted) setLoading(false);
                }
            } else {
                setLoading(false);
            }
        };

        probePath();

        return () => {
            isMounted = false;
        };
    }, [url]);

    const handleNavigate = (newUrl, title) => {
        if (tab?.id && newUrl) {
            useTabStore.getState().handleNavigateTab(tab.id, newUrl, title || '');
        }
    };

    // If probing says directory or URL ends with slash
    const isDir = probeResult?.isDirectory || (!probeResult?.isText && !probeResult?.base64 && (url.endsWith('/') || url.endsWith('\\')));

    // Extract filename and extension
    let fileName = '';
    let ext = '';
    try {
        const decoded = decodeURIComponent(url);
        const parts = decoded.split(/[/\\]/).filter(Boolean);
        fileName = parts[parts.length - 1] || 'Local Resource';
        const dotIdx = fileName.lastIndexOf('.');
        if (dotIdx !== -1) {
            ext = fileName.slice(dotIdx + 1).toLowerCase();
        }
    } catch (_) {
        fileName = 'Local Resource';
    }

    if (isDir) {
        return <LocalDirectoryPage url={url} onNavigate={handleNavigate} />;
    }

    if (ext === 'pdf' || probeResult?.extension === 'pdf') {
        return <GlassPdfViewer url={url} filePath={probeResult?.path} fileName={fileName} />;
    }

    // HTML files: if probeResult says it's HTML, we can allow webview or DocumentViewer
    return (
        <GlassDocumentViewer 
            url={url} 
            filePath={probeResult?.path} 
            fileName={fileName} 
            extension={ext || probeResult?.extension}
            type={ext === 'md' ? 'markdown' : (probeResult?.isText ? 'text' : 'media')}
        />
    );
}
