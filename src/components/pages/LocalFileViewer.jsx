import React, { useState, useEffect } from 'react';
import { AlertCircle, ExternalLink, FolderOpen } from 'lucide-react';
import LocalDirectoryPage from './LocalDirectoryPage';
import GlassPdfViewer from './GlassPdfViewer';
import GlassDocumentViewer from './GlassDocumentViewer';
import useTabStore from '../../store/useTabStore';
import useUIStore from '../../store/useUIStore';
import { extractLocalFileName } from '../../utils/fileUrlHelpers';
import { t } from '../../i18n/index';

export default function LocalFileViewer({ tab }) {
    const url = tab?.url || '';
    const theme = useUIStore(state => state.theme);
    const isBright = theme === 'light';
    const [probeResult, setProbeResult] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        setLoading(true);
        setProbeResult(null);

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

    const fileName = probeResult?.name || extractLocalFileName(url, t('stores.common.localResource', 'Local Resource'));
    const dotIdx = fileName.lastIndexOf('.');
    const ext = dotIdx !== -1 ? fileName.slice(dotIdx + 1).toLowerCase() : '';

    if (loading) {
        return (
            <div className={`w-full h-full flex flex-col items-center justify-center gap-3 select-none ${
                isBright ? 'bg-zinc-50 text-zinc-700' : 'bg-[#0c0d11] text-zinc-300'
            }`}>
                <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-medium opacity-75">{t('tools.docViewer.loading', null, 'Loading document...')}</p>
            </div>
        );
    }

    if (probeResult?.error) {
        return (
            <div className={`w-full h-full flex items-center justify-center p-6 select-none ${
                isBright ? 'bg-zinc-50 text-zinc-900' : 'bg-[#0c0d11] text-zinc-100'
            }`}>
                <div className="max-w-md w-full p-6 rounded-3xl border border-red-500/20 bg-red-500/10 text-center space-y-4">
                    <AlertCircle size={28} className="text-red-400 mx-auto" />
                    <div className="space-y-1">
                        <h3 className="text-sm font-bold">{t('tools.docViewer.errorTitle', null, 'Unable to Display File')}</h3>
                        <p className="text-xs text-zinc-400 break-words">{probeResult.error}</p>
                    </div>
                    <div className="flex items-center justify-center gap-2 pt-1">
                        <button
                            onClick={() => window.electronAPI?.openPath?.(url)}
                            className={`px-3.5 py-2 rounded-full border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                                isBright ? 'bg-black/5 hover:bg-black/10 border-black/10 text-zinc-800' : 'bg-white/10 hover:bg-white/15 border-white/15 text-white'
                            }`}
                        >
                            <ExternalLink size={13} /> Open with Default App
                        </button>
                        <button
                            onClick={() => window.electronAPI?.showInFolder?.(url)}
                            className={`px-3.5 py-2 rounded-full border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                                isBright ? 'bg-black/5 hover:bg-black/10 border-black/10 text-zinc-800' : 'bg-white/10 hover:bg-white/15 border-white/15 text-white'
                            }`}
                        >
                            <FolderOpen size={13} /> Reveal in Folder
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // If probing says directory or URL ends with slash
    const isDir = probeResult?.isDirectory || (!probeResult?.isText && !probeResult?.base64 && !probeResult?.success && (url.endsWith('/') || url.endsWith('\\')));

    if (isDir) {
        return <LocalDirectoryPage url={url} onNavigate={handleNavigate} />;
    }

    if (ext === 'pdf' || probeResult?.extension === 'pdf') {
        return <GlassPdfViewer url={url} filePath={probeResult?.path} fileName={fileName} initialFileData={probeResult} />;
    }

    // Other local files (Markdown, code, text, images, audio, video, or fallback)
    return (
        <GlassDocumentViewer
            url={url}
            filePath={probeResult?.path}
            fileName={fileName}
            extension={ext || probeResult?.extension}
            type={ext === 'md' ? 'markdown' : (probeResult?.isText ? 'text' : 'media')}
            initialFileData={probeResult}
        />
    );
}
