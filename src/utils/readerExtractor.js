import { Readability, isProbablyReaderable } from '@mozilla/readability';

/**
 * Fast in-webview DOM script that evaluates readerability directly in the guest DOM
 * in <1ms without serializing megabytes of HTML over IPC.
 */
export const CHECK_ARTICLE_DOM_SCRIPT = `
(() => {
    try {
        if (!document || !document.body) return false;
        const articleSelectors = 'article, [role="article"], .article-body, .post-content, .entry-content, .story-body, .article__content, #mw-content-text, main article, [itemprop="articleBody"], .post-body, .content-article';
        const articleTag = document.querySelector(articleSelectors);
        if (articleTag && (articleTag.innerText || articleTag.textContent || '').trim().length > 200) {
            return true;
        }

        const paragraphs = Array.from(document.querySelectorAll('p')).filter(p => !p.closest('footer, nav, .comments, #comments, .sidebar, aside'));
        let validPCount = 0;
        let totalPText = 0;
        for (const p of paragraphs) {
            const t = (p.innerText || p.textContent || '').trim();
            if (t.length > 40) {
                validPCount++;
                totalPText += t.length;
            }
        }

        if (validPCount >= 2 && totalPText > 200) {
            return true;
        }

        const h1 = document.querySelector('h1, h2');
        if (h1 && validPCount >= 1 && totalPText > 120) {
            return true;
        }

        return false;
    } catch (e) {
        return false;
    }
})()
`;

/**
 * Checks whether a given HTML string and URL is likely an article suitable for Reader Mode.
 * @param {string} html 
 * @param {string} url 
 * @returns {boolean}
 */
export function checkIsArticle(html, url = '') {
    if (!html || typeof html !== 'string' || html.length < 250) return false;

    try {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        if (url) {
            const base = doc.createElement('base');
            base.href = url;
            doc.head?.appendChild(base);
        }

        // 1. Standard Mozilla Readerable check with relaxed thresholds
        if (isProbablyReaderable(doc, { minContentLength: 80, minScore: 5 })) {
            return true;
        }

        // 2. Comprehensive article / main content selectors (including Wikipedia, news, blogs)
        const articleSelectors = 'article, [role="article"], .article-body, .post-content, .entry-content, .story-body, .article__content, #mw-content-text, main article, [itemprop="articleBody"], .post-body, .content-article';
        const articleTag = doc.querySelector(articleSelectors);
        if (articleTag && (articleTag.textContent || '').trim().length > 200) {
            return true;
        }

        // 3. Fallback heuristic: check paragraph volume (ignoring headers/footers/nav)
        const paragraphs = Array.from(doc.querySelectorAll('p')).filter(p => !p.closest('footer, nav, .comments, #comments, .sidebar, aside'));
        let validPCount = 0;
        let totalPText = 0;
        for (const p of paragraphs) {
            const t = (p.textContent || '').trim();
            if (t.length > 40) {
                validPCount++;
                totalPText += t.length;
            }
        }

        if (validPCount >= 2 && totalPText > 200) {
            return true;
        }

        const h1 = doc.querySelector('h1, h2');
        if (h1 && validPCount >= 1 && totalPText > 120) {
            return true;
        }

        return false;
    } catch (e) {
        console.warn('[ReaderExtractor] checkIsArticle error:', e);
        return false;
    }
}

/**
 * Extracts and sanitizes article content from raw webpage HTML using Mozilla Readability.
 * @param {string} html 
 * @param {string} url 
 * @returns {object|null}
 */
export function parseArticle(html, url = '') {
    if (!html) return null;

    try {
        const doc = new DOMParser().parseFromString(html, 'text/html');

        // Extract metadata before Readability strips head elements
        const ogImage = doc.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
                        doc.querySelector('meta[name="twitter:image"]')?.getAttribute('content');
        const pubTime = doc.querySelector('meta[property="article:published_time"]')?.getAttribute('content') ||
                        doc.querySelector('time')?.getAttribute('datetime') ||
                        doc.querySelector('time')?.textContent?.trim();

        if (url) {
            const base = doc.createElement('base');
            base.href = url;
            doc.head?.appendChild(base);
        }

        const reader = new Readability(doc, {
            charThreshold: 80,
            keepClasses: false
        });

        const article = reader.parse();
        if (!article) return null;

        // Clean domain
        let domain = '';
        try {
            if (url) domain = new URL(url).hostname.replace(/^www\./, '');
        } catch (_) {}

        // Word count & reading time (average 220 words per minute)
        const words = (article.textContent || '').trim().split(/\s+/).filter(Boolean);
        const wordCount = words.length;
        const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 220));

        // Parse article.content HTML into DOM to annotate paragraphs with data-tts-id for the TTS reader
        const contentDoc = new DOMParser().parseFromString(article.content, 'text/html');
        
        // Find lead image if ogImage wasn't present
        let leadImageUrl = ogImage || '';
        if (!leadImageUrl) {
            const firstImg = contentDoc.querySelector('img');
            if (firstImg && firstImg.src) {
                leadImageUrl = firstImg.src;
            }
        }

        // Annotate readable blocks (p, h1..h6, blockquote, li) with data-tts-id
        const ttsBlocks = [];
        const blockElements = contentDoc.querySelectorAll('p, h1, h2, h3, h4, h5, h6, blockquote, li');
        
        let blockIndex = 0;
        blockElements.forEach(el => {
            const text = (el.textContent || '').trim();
            // Ignore very short or navigation-like text
            if (text.length > 5) {
                el.setAttribute('data-tts-id', `tts-block-${blockIndex}`);
                el.classList.add('reader-block');
                ttsBlocks.push({
                    id: `tts-block-${blockIndex}`,
                    text: text,
                    tagName: el.tagName.toLowerCase()
                });
                blockIndex++;
            }
        });

        // Clean any residual inline style tags or dangerous event attributes
        contentDoc.querySelectorAll('*').forEach(node => {
            node.removeAttribute('style');
            node.removeAttribute('onclick');
            node.removeAttribute('onload');
            node.removeAttribute('onerror');
            // Ensure external links open securely in new tab
            if (node.tagName === 'A') {
                node.setAttribute('target', '_blank');
                node.setAttribute('rel', 'noopener noreferrer');
            }
            // Ensure images have lazy loading and rounded styling
            if (node.tagName === 'IMG') {
                node.setAttribute('loading', 'lazy');
                node.classList.add('reader-image');
            }
        });

        const annotatedHtml = contentDoc.body.innerHTML;

        return {
            title: article.title || doc.title || 'Untitled Article',
            byline: article.byline || '',
            siteName: article.siteName || domain,
            domain: domain,
            url: url,
            excerpt: article.excerpt || '',
            leadImageUrl: leadImageUrl,
            publishedTime: pubTime || '',
            wordCount: wordCount,
            readingTimeMinutes: readingTimeMinutes,
            contentHtml: annotatedHtml,
            rawTextContent: article.textContent || '',
            ttsBlocks: ttsBlocks
        };
    } catch (e) {
        console.error('[ReaderExtractor] parseArticle failed:', e);
        return null;
    }
}
