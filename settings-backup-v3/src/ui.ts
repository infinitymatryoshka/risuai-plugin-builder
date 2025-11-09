/**
 * UI helpers for loading overlays and buttons
 */

// Localization data
const i18n = {
    en: { account: "Account", files: "Files" },
    ko: { account: "계정", files: "파일" },
    cn: { account: "账号", files: "文件" },
    'zh-Hant': { account: "帳號", files: "檔案" },
    de: { account: "Konto", files: "Daten" },
    es: { account: "Cuenta", files: "Archivos" },
    vi: { account: "Tài khoản", files: "Các tập tin" }
};

function getLocalizedText(key: 'account' | 'files'): string {
    try {
        // Try to get language from RisuAI database
        const db = (window as any).getDatabase?.();
        const lang = db?.language || 'en';
        return i18n[lang as keyof typeof i18n]?.[key] || i18n.en[key];
    } catch {
        return i18n.en[key];
    }
}

export function createLoadingOverlay(message: string): HTMLDivElement {
    const overlay = document.createElement('div');
    overlay.id = 'settings-backup-loading-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        flex-direction: column;
        justify-center;
        align-items: center;
        z-index: 10000;
        color: white;
        font-size: 18px;
    `;

    const messageEl = document.createElement('div');
    messageEl.textContent = message;
    messageEl.style.cssText = 'margin-bottom: 20px; font-size: 24px;';

    const progressEl = document.createElement('div');
    progressEl.id = 'export-loading-progress';
    progressEl.style.cssText = 'font-size: 16px; color: #aaa;';

    overlay.appendChild(messageEl);
    overlay.appendChild(progressEl);
    document.body.appendChild(overlay);

    return overlay;
}

export function updateLoadingProgress(current: number, total: number, message: string) {
    const progressEl = document.getElementById("export-loading-progress");
    if (progressEl) {
        progressEl.textContent = `${message} (${current}/${total})`;
    }
}

export function removeLoadingOverlay() {
    const overlay = document.getElementById('settings-backup-loading-overlay');
    if (overlay) {
        document.body.removeChild(overlay);
    }
}

export interface UIOptions {
    onExport: () => void;
    onImport: () => void;
}

export interface UICleanup {
    container: HTMLElement;
    intervalId: number;
}

export function createUI(options: UIOptions): UICleanup {
    const container = document.createElement('div');
    container.id = 'settings-backup-v3-ui';
    container.style.cssText = `
        display: flex;
        gap: 12px;
        margin-top: 12px;
        padding: 18px;
        background: linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(59, 130, 246, 0.08) 100%);
        border: 2px solid rgba(139, 92, 246, 0.2);
        border-radius: 12px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        transition: all 0.3s ease;
    `;

    const pluginLabel = document.createElement('div');
    pluginLabel.style.cssText = `
        flex: 1;
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 16px;
    `;

    // Emoji span (normal color)
    const emoji = document.createElement('span');
    emoji.textContent = '🔄';
    emoji.style.cssText = 'font-size: 18px;';

    // Text span (gradient)
    const text = document.createElement('span');
    text.textContent = 'ResuAI';
    text.style.cssText = `
        font-weight: 700;
        background: linear-gradient(135deg, #8B5CF6 0%, #3B82F6 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        letter-spacing: 0.5px;
    `;

    pluginLabel.appendChild(emoji);
    pluginLabel.appendChild(text);

    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
        display: flex;
        gap: 10px;
    `;

    const baseButtonStyle = `
        padding: 12px 20px;
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
        transition: all 0.3s ease;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
        display: flex;
        align-items: center;
        gap: 6px;
    `;

    const exportBtn = document.createElement('button');
    exportBtn.textContent = '🎁 Save Snapshot';
    exportBtn.style.cssText = baseButtonStyle + `
        background: linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%);
    `;
    exportBtn.onmouseenter = () => {
        exportBtn.style.transform = 'translateY(-2px)';
        exportBtn.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.4)';
    };
    exportBtn.onmouseleave = () => {
        exportBtn.style.transform = 'translateY(0)';
        exportBtn.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.15)';
    };
    exportBtn.onclick = options.onExport;

    const importBtn = document.createElement('button');
    importBtn.textContent = '⏮️ Restore Snapshot';
    importBtn.style.cssText = baseButtonStyle + `
        background: linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%);
    `;
    importBtn.onmouseenter = () => {
        importBtn.style.transform = 'translateY(-2px)';
        importBtn.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.4)';
    };
    importBtn.onmouseleave = () => {
        importBtn.style.transform = 'translateY(0)';
        importBtn.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.15)';
    };
    importBtn.onclick = options.onImport;

    buttonContainer.appendChild(exportBtn);
    buttonContainer.appendChild(importBtn);

    container.appendChild(pluginLabel);
    container.appendChild(buttonContainer);

    // Try to inject into settings page
    const intervalId = injectIntoSettingsPage(container);

    return { container, intervalId };
}

function injectIntoSettingsPage(container: HTMLElement): number {
    // Check periodically for settings page
    const intervalId = setInterval(() => {
        // Skip if already injected and still in DOM
        const existing = document.getElementById('settings-backup-v3-ui');
        if (existing && existing.parentElement) {
            return;
        }

        // Get localized section name
        const sectionName = `${getLocalizedText('account')} & ${getLocalizedText('files')}`;

        // Look for UserSettings page container (rs-setting-cont-4)
        const settingsContainer = document.querySelector('.rs-setting-cont-4');

        if (settingsContainer) {
            // Find the h2 heading with account & files text
            const heading = Array.from(settingsContainer.querySelectorAll('h2')).find(h2 => {
                const text = h2.textContent?.trim() || '';
                return text === sectionName ||
                       text.includes('Account') ||
                       text.includes('계정');
            });

            if (heading) {
                // Remove existing if it's detached
                if (existing && !existing.parentElement) {
                    existing.remove();
                }

                // Insert after the h2 heading
                heading.insertAdjacentElement('afterend', container);
                console.log('ResuAI: UI injected into Settings page');
                return;
            }
        }
    }, 500);

    return intervalId;
}
