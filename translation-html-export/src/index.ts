/// <reference types="../../types/risu-plugin" />

// ===== Plugin Config =====
//@name TranslationHTMLExport
//@display-name 📄 HTML Export (From Cache) v0.1.1
//@version 0.1.1
//@description Export chat as HTML with cached translations

//@arg enable_plugin int 1 "플러그인 활성화 (1=ON)"

import localforage from 'localforage';

const LLMCacheStorage = localforage.createInstance({
    name: "LLMTranslateCache"
});

// ===== Plugin Enable Check =====
const PLUGIN_NAME = "translation-html-export";
const DISPLAY_NAME = "📄 HTML Export (From Cache) v0.1.1";

function getArg(key: string, defaultVal: string = ""): string {
    try {
        const g = globalThis as any;
        const apis = g.__pluginApis__ || {};

        // 1. getArg API로 여러 형태 시도
        if (typeof apis.getArg === "function") {
            let v = apis.getArg(key);
            if (v !== undefined && v !== null) return String(v);

            v = apis.getArg(`${PLUGIN_NAME}::${key}`);
            if (v !== undefined && v !== null) return String(v);

            v = apis.getArg(`${DISPLAY_NAME}::${key}`);
            if (v !== undefined && v !== null) return String(v);
        }

        // 2. __pluginParams__에서 찾기
        const params = g.__pluginParams__?.args || g.__pluginParams__ || {};
        if (params[key] !== undefined) return String(params[key]);

        // 3. localStorage 폴백
        const lsKey = `the_${key}`;
        const lsVal = localStorage.getItem(lsKey);
        if (lsVal !== null) return lsVal;
    } catch {}

    return defaultVal;
}

function getPluginEnabled(): boolean {
    const val = getArg("enable_plugin", "1");
    const enabled = Number(val) === 1;
    console.log(`[THE] enable_plugin = "${val}", enabled = ${enabled}`);
    return enabled;
}

// 캐시 키 목록 (한 번만 로드)
let cachedKeys: string[] | null = null;

async function loadCacheKeys(): Promise<string[]> {
    if (cachedKeys === null) {
        cachedKeys = await LLMCacheStorage.keys();
    }
    return cachedKeys;
}

// 평문 청크 추출 (가장 긴 것)
function extractLongestPlainChunk(text: string): string {
    const chunks = text
        .split(/\[.*?\]|<[^>]*>|\{\{.*?\}\}/gs)
        .map(s => s.trim())
        .filter(s => s.length > 30);

    return chunks.sort((a, b) => b.length - a.length)[0] || '';
}

// 캐시에서 번역 찾기
async function findTranslation(originalText: string): Promise<{ found: boolean; translation?: string; matchType?: string }> {
    // 1. 정확 매칭 시도
    const exactMatch = await LLMCacheStorage.getItem(originalText);
    if (exactMatch) {
        return { found: true, translation: exactMatch as string, matchType: 'exact' };
    }

    // 2. 청크 매칭 시도
    const chunk = extractLongestPlainChunk(originalText);
    if (!chunk) {
        return { found: false };
    }

    const keys = await loadCacheKeys();
    const matches: string[] = [];

    // 길이 범위 제한 (원본의 ±50%)
    const minLength = originalText.length * 0.5;
    const maxLength = originalText.length * 1.5;

    for (const key of keys) {
        if (key.includes(chunk) && key.length >= minLength && key.length <= maxLength) {
            matches.push(key);
        }
    }

    if (matches.length === 0) {
        return { found: false };
    }

    // 여러 개면 길이가 가장 비슷한 것 선택
    if (matches.length > 1) {
        const originalLength = originalText.length;
        matches.sort((a, b) =>
            Math.abs(a.length - originalLength) - Math.abs(b.length - originalLength)
        );
    }

    const translation = await LLMCacheStorage.getItem(matches[0]);
    return { found: true, translation: translation as string, matchType: 'chunk' };
}

// HTML 이스케이프
function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// 마크다운 간단 변환 (기본적인 것만)
function simpleMarkdown(text: string): string {
    return text
        // 볼드
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        // 이탤릭
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        // 큰따옴표 대사 (escapeHtml 후라 &quot; 사용)
        .replace(/&quot;(.+?)&quot;/g, '<mark class="quote2">&quot;$1&quot;</mark>')
        // 스마트 큰따옴표 "" (curly quotes)
        .replace(/\u201C(.+?)\u201D/g, '<mark class="quote2">\u201C$1\u201D</mark>')
        // 스마트 작은따옴표 '' (curly quotes) - 일반 '는 apostrophe와 구분 불가
        .replace(/\u2018(.+?)\u2019/g, '<mark class="quote1">\u2018$1\u2019</mark>')
        // 줄바꿈
        .replace(/\n/g, '<br>');
}

// 메인 내보내기 함수
async function exportChatWithTranslation() {
    const char = getChar();

    if (!char || !char.chats || char.chats.length === 0) {
        alertError('No chat found');
        return;
    }

    const currentChat = char.chats[char.chatPage || 0];
    if (!currentChat?.message) {
        alertError('No messages in current chat');
        return;
    }

    // 캐시 키 미리 로드
    alertWait('Loading translation cache...');
    cachedKeys = null; // 리셋
    await loadCacheKeys();

    const messages = currentChat.message;
    const totalMessages = messages.length + 1; // +1 for firstMessage

    // 번역 결과 수집
    const results: { name: string; original: string; translated?: string; found: boolean }[] = [];
    let foundCount = 0;
    let notFoundCount = 0;

    // 1. First Message 처리
    alertWait(`Processing first message... (1/${totalMessages})`);
    const fmIndex = currentChat.fmIndex ?? -1;
    const firstMessage = fmIndex === -1
        ? char.firstMessage
        : (char.alternateGreetings?.[fmIndex] || char.firstMessage);

    const fmResult = await findTranslation(firstMessage);
    results.push({
        name: char.name,
        original: firstMessage,
        translated: fmResult.translation,
        found: fmResult.found
    });
    if (fmResult.found) foundCount++; else notFoundCount++;

    // 2. 채팅 메시지 처리
    for (let i = 0; i < messages.length; i++) {
        alertWait(`Processing messages... (${i + 2}/${totalMessages})`);

        const msg = messages[i];
        const isUser = msg.role === 'user';
        const name = msg.saying
            ? (findCharacterbyId(msg.saying)?.name || char.name)
            : (isUser ? getUserName() : char.name);

        const translationResult = await findTranslation(msg.data);
        results.push({
            name,
            original: msg.data,
            translated: translationResult.translation,
            found: translationResult.found
        });

        if (translationResult.found) foundCount++; else notFoundCount++;
    }

    alertClear();

    // 3. 캐시 없는 메시지가 있으면 안내
    if (notFoundCount > 0) {
        const proceedOption = await alertSelect([
            `Export anyway (${notFoundCount} messages without translation)`,
            `Cancel (translate in RisuAI first)`
        ]);

        if (proceedOption === '1') {
            alertNormal(`Please translate the chat in RisuAI first, then try exporting again.`);
            return;
        }
    }

    const useTranslation = true; // 항상 번역 사용 (캐시 있는 것만)

    // 4. HTML 생성
    let chatContentHTML = '';

    for (const result of results) {
        const content = useTranslation && result.translated
            ? result.translated
            : result.original;

        const displayContent = simpleMarkdown(escapeHtml(content));
        const notFoundBadge = useTranslation && !result.found
            ? '<span style="color: #f59e0b; font-size: 0.75rem; margin-left: 8px;">[No cache]</span>'
            : '';

        chatContentHTML += `
            <div class="chat">
                <h2>${escapeHtml(result.name)}${notFoundBadge}</h2>
                <div>${displayContent}</div>
            </div>`;
    }

    const date = new Date().toISOString().split('T')[0];
    const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${escapeHtml(char.name)} Chat - ${date}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #1a1a1a;
            color: #e0e0e0;
            margin: 0;
            padding: 20px;
            display: flex;
            justify-content: center;
        }
        .container {
            max-width: 800px;
            width: 100%;
            display: flex;
            flex-direction: column;
            gap: 16px;
        }
        .header {
            text-align: center;
            padding: 20px;
            border-bottom: 1px solid #333;
            margin-bottom: 10px;
        }
        .header h1 {
            margin: 0;
            color: #fff;
        }
        .header p {
            margin: 8px 0 0 0;
            color: #888;
            font-size: 0.9rem;
        }
        .chat {
            background: #2a2a2a;
            padding: 16px;
            border-radius: 12px;
            border: 1px solid #333;
        }
        h2 {
            margin: 0 0 12px 0;
            font-size: 1rem;
            color: #60a5fa;
        }
        .chat div {
            line-height: 1.7;
            word-break: break-word;
        }
        strong {
            color: #fff;
        }
        em {
            color: #a5b4fc;
        }
        mark.quote1 {
            background: transparent;
            color: #8BE9FD;
        }
        mark.quote2 {
            background: transparent;
            color: #FFB86C;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${escapeHtml(char.name)}</h1>
            <p>Exported on ${date} | ${results.length} messages${useTranslation ? ` | Translated: ${foundCount}` : ''}</p>
        </div>
        ${chatContentHTML}
    </div>
</body>
</html>`;

    // 5. 다운로드
    const filename = `${char.name}_${date}_chat`.replace(/[<>:"/\\|?*.,]/g, '') + '.html';
    await downloadFile(filename, Buffer.from(html, 'utf-8'));

    alertNormal(`Exported: ${filename}`);
}

// ===== Styles =====
const style = document.createElement("style");
style.id = 'the-float-style';
style.textContent = `
    .the-float-container{position:fixed;bottom:10%;right:3%;z-index:9998;cursor:move;touch-action:none;user-select:none}
    .the-export-btn{
        padding:8px 12px;
        border:1px solid #475569;
        border-radius:8px;
        background:rgba(15,23,42,0.9);
        color:#cbd5e1;
        font-size:12px;
        box-shadow:0 2px 8px rgba(0,0,0,0.3);
        cursor:pointer;
        white-space:nowrap;
    }
    .the-export-btn:hover{background:rgba(30,41,59,0.95);color:#e5e7eb}
    .the-export-btn.busy{opacity:.65;cursor:wait;pointer-events:none}
`;

// ===== Drag State =====
let globalDragState = { isDragging: false, hasMoved: false, startX: 0, startY: 0, startBottom: 0, startRight: 0 };

function setupDragHandlers(container: HTMLElement) {
    const DRAG_THRESHOLD = 5;

    // Touch handlers
    container.addEventListener('touchstart', (e) => {
        const touch = e.touches[0];
        globalDragState.isDragging = true;
        globalDragState.hasMoved = false;
        globalDragState.startX = touch.clientX;
        globalDragState.startY = touch.clientY;
        const rect = container.getBoundingClientRect();
        globalDragState.startBottom = ((window.innerHeight - rect.bottom) / window.innerHeight) * 100;
        globalDragState.startRight = ((window.innerWidth - rect.right) / window.innerWidth) * 100;
        container.style.transition = 'none';
    }, { passive: true });

    container.addEventListener('touchmove', (e) => {
        if (!globalDragState.isDragging) return;
        e.preventDefault();
        const touch = e.touches[0];
        const deltaX = touch.clientX - globalDragState.startX;
        const deltaY = touch.clientY - globalDragState.startY;

        if (Math.abs(deltaX) > DRAG_THRESHOLD || Math.abs(deltaY) > DRAG_THRESHOLD) {
            globalDragState.hasMoved = true;
        }

        const deltaBottomPercent = (deltaY / window.innerHeight) * 100;
        const deltaRightPercent = (deltaX / window.innerWidth) * 100;

        container.style.bottom = (globalDragState.startBottom - deltaBottomPercent) + '%';
        container.style.right = (globalDragState.startRight - deltaRightPercent) + '%';
    }, { passive: false });

    container.addEventListener('touchend', () => {
        setTimeout(() => { globalDragState.isDragging = false; globalDragState.hasMoved = false; }, 100);
    }, { passive: true });

    // Mouse handlers
    container.addEventListener('mousedown', (e) => {
        e.preventDefault();
        globalDragState.isDragging = true;
        globalDragState.hasMoved = false;
        globalDragState.startX = e.clientX;
        globalDragState.startY = e.clientY;
        const rect = container.getBoundingClientRect();
        globalDragState.startBottom = ((window.innerHeight - rect.bottom) / window.innerHeight) * 100;
        globalDragState.startRight = ((window.innerWidth - rect.right) / window.innerWidth) * 100;
        container.style.transition = 'none';
    });

    const onMouseMove = (e: MouseEvent) => {
        if (!globalDragState.isDragging) return;
        e.preventDefault();
        const deltaX = e.clientX - globalDragState.startX;
        const deltaY = e.clientY - globalDragState.startY;

        if (Math.abs(deltaX) > DRAG_THRESHOLD || Math.abs(deltaY) > DRAG_THRESHOLD) {
            globalDragState.hasMoved = true;
        }

        const deltaBottomPercent = (deltaY / window.innerHeight) * 100;
        const deltaRightPercent = (deltaX / window.innerWidth) * 100;

        container.style.bottom = (globalDragState.startBottom - deltaBottomPercent) + '%';
        container.style.right = (globalDragState.startRight - deltaRightPercent) + '%';
    };

    const onMouseUp = () => {
        setTimeout(() => { globalDragState.isDragging = false; globalDragState.hasMoved = false; }, 100);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    // Return cleanup function
    return () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    };
}

// ===== UI 버튼 추가 =====
let cleanupDrag: (() => void) | null = null;

function addExportButton() {
    // 기존 버튼이 있으면 유지
    if (document.getElementById('the-export-btn')) return;

    // 스타일 추가
    if (!document.getElementById('the-float-style')) {
        document.head.appendChild(style);
    }

    // 컨테이너 생성
    const container = document.createElement('div');
    container.className = 'the-float-container';
    container.id = 'the-export-container';

    // 버튼 생성
    const btn = document.createElement('button');
    btn.id = 'the-export-btn';
    btn.className = 'the-export-btn';
    btn.innerText = '📄 Export HTML(From Cache)';

    btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (globalDragState.hasMoved) return;

        btn.classList.add('busy');
        btn.innerText = '📄 Exporting...';
        try {
            await exportChatWithTranslation();
        } finally {
            btn.classList.remove('busy');
            btn.innerText = '📄 Export HTML(From Cache)';
        }
    }, { capture: true, passive: false });

    container.appendChild(btn);
    document.body.appendChild(container);

    // 드래그 설정
    cleanupDrag = setupDragHandlers(container);
}

function removeExportButton() {
    const container = document.getElementById('the-export-container');
    if (container) container.remove();

    const styleEl = document.getElementById('the-float-style');
    if (styleEl) styleEl.remove();

    if (cleanupDrag) {
        cleanupDrag();
        cleanupDrag = null;
    }
}

// ===== 플러그인 초기화 =====
const ENABLED = getPluginEnabled();

if (!ENABLED) {
    console.log('[THE] Plugin disabled by setting');
} else {
    addExportButton();

    // MutationObserver로 버튼 유지 (SPA 환경 대응)
    const obs = new MutationObserver(() => {
        if (!document.getElementById('the-export-btn')) {
            addExportButton();
        }
    });
    obs.observe(document.body, { childList: true, subtree: true });

    // 정리
    onUnload(() => {
        obs.disconnect();
        removeExportButton();
    });
}

// 전역 접근용
(window as any).translationExport = {
    export: exportChatWithTranslation,
    findTranslation,
    extractLongestPlainChunk,
    enable: () => { addExportButton(); },
    disable: () => { removeExportButton(); }
};

console.log('Translation HTML Export plugin loaded!');
console.log('Drag the button to reposition. Use translationExport.export() or click the button.');
