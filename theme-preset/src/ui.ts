/**
 * UI module for floating window and modal dialogs
 *
 * This is a simplified version. The original plugin has extensive UI features.
 * You can expand this by referencing the original theme-preset-plugin-fix3.js
 */

// Declare global RisuAI API functions
declare function getChar(): { name: string } | null;

import { FEEDBACK_TIMEOUT, FOCUS_DELAY } from './constants';
import {
    getPresets,
    savePresets,
    reorderPresets,
    saveCurrentTheme,
    loadThemePreset,
    deleteThemePreset,
    renameThemePreset,
    exportThemePreset,
    importThemePreset,
    getCharacterThemeMap,
    saveCharacterThemeMap,
    addCharacterThemeMapping,
    removeCharacterThemeMapping,
    getDefaultTheme,
    setDefaultTheme,
    listThemePresets
} from './storage';
import { getAutoSwitchEnabled, setAutoSwitchEnabled, startAutoSwitch, stopAutoSwitch } from './auto-switch';
import { getShortcut, setShortcut, formatShortcutDisplay } from './shortcuts';
import type { WindowState, ModalOptions } from './types';

// Window state
const windowState: WindowState = {
    window: null,
    overlay: null,
    isDragging: false,
    dragOffset: { x: 0, y: 0 }
};

/**
 * Show a modal dialog
 */
export function showModal(options: any): void {
    const { title, content, buttons = [], input = null } = options;

    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        z-index: 10001;
        display: flex;
        align-items: center;
        justify-content: center;
    `;

    const modal = document.createElement('div');
    modal.style.cssText = `
        background: var(--risu-theme-darkbg, #1a1a1a);
        border: 2px solid var(--risu-theme-darkborderc, #333);
        border-radius: 12px;
        padding: 24px;
        min-width: 300px;
        max-width: 500px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
    `;

    modal.innerHTML = `
        <h3 style="margin: 0 0 16px 0; color: var(--risu-theme-textcolor, #fff); font-size: 1.2em; font-weight: 600;">${title}</h3>
        <div style="color: var(--risu-theme-textcolor2, #ccc); margin-bottom: 20px; line-height: 1.5;">${content}</div>
        ${input ? `<input type="text" id="modal-input" value="${input.value || ''}" placeholder="${input.placeholder || ''}" style="
            width: 100%;
            padding: 10px 12px;
            border-radius: 6px;
            border: 1px solid var(--risu-theme-darkborderc, #333);
            background: var(--risu-theme-bgcolor, #2a2a2a);
            color: var(--risu-theme-textcolor, #fff);
            font-size: 0.95em;
            margin-bottom: 16px;
        ">` : ''}
        <div style="display: flex; gap: 10px; justify-content: flex-end;">
        </div>
    `;

    const buttonContainer = modal.querySelector('div:last-child') as HTMLElement;

    buttons.forEach((btn: any) => {
        const button = document.createElement('button');
        button.textContent = btn.text;
        button.style.cssText = `
            padding: 10px 20px;
            border-radius: 6px;
            border: none;
            background: ${btn.primary ? 'var(--risu-theme-selected, #4a9eff)' : 'var(--risu-theme-darkbutton, #444)'};
            color: var(--risu-theme-textcolor, #fff);
            cursor: pointer;
            font-weight: ${btn.primary ? '600' : '500'};
            transition: all 0.2s;
        `;
        button.onmouseover = () => {
            button.style.transform = 'translateY(-1px)';
            button.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
        };
        button.onmouseout = () => {
            button.style.transform = '';
            button.style.boxShadow = '';
        };
        button.onclick = () => {
            const inputEl = modal.querySelector('#modal-input') as HTMLInputElement;
            const inputValue = input ? inputEl?.value : null;
            overlay.remove();
            if (btn.onClick) btn.onClick(inputValue);
        };
        buttonContainer.appendChild(button);
    });

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Focus on input if present
    if (input) {
        const inputEl = modal.querySelector('#modal-input') as HTMLInputElement;
        setTimeout(() => inputEl?.focus(), FOCUS_DELAY);

        // Allow Enter to submit
        inputEl?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const primaryBtn = buttons.find((b: any) => b.primary);
                if (primaryBtn) {
                    overlay.remove();
                    primaryBtn.onClick(inputEl.value);
                }
            }
        });
    }

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.remove();
        }
    });
}

/**
 * Show button success feedback
 */
export function showButtonFeedback(
    button: HTMLButtonElement,
    successText: string,
    originalText?: string,
    successColor = 'var(--draculared, #50fa7b)'
): void {
    const origText = originalText || button.textContent || '';
    const origBg = button.style.background;

    button.textContent = successText;
    button.style.background = successColor;

    setTimeout(() => {
        button.textContent = origText;
        button.style.background = origBg;
    }, FEEDBACK_TIMEOUT);
}

/**
 * Create the floating window UI
 *
 * NOTE: This is a minimal implementation. The original plugin has extensive
 * UI features including character mappings, auto-switch, etc.
 * Refer to theme-preset-plugin-fix3.js for the complete implementation.
 */
export function createFloatingWindow(): HTMLElement {
    if (windowState.window) {
        return windowState.window;
    }

    // Add responsive styles for mobile
    if (!document.getElementById('theme-preset-mobile-styles')) {
        const style = document.createElement('style');
        style.id = 'theme-preset-mobile-styles';
        style.textContent = `
            /* Mobile responsive layout for preset items */
            @media screen and (max-width: 600px) {
                .preset-item {
                    flex-direction: column !important;
                    align-items: stretch !important;
                }

                .preset-info {
                    flex: 1 1 100% !important;
                    width: 100% !important;
                    margin-bottom: 8px !important;
                }

                .preset-buttons {
                    width: 100% !important;
                    justify-content: center !important;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // Create overlay background
    const overlay = document.createElement('div');
    overlay.id = 'theme-preset-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        z-index: 9999;
        display: none;
    `;
    document.body.appendChild(overlay);
    windowState.overlay = overlay;

    // Create floating window container
    const container = document.createElement('div');
    container.id = 'theme-preset-floating-window';
    container.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 500px;
        max-width: 90vw;
        max-height: 80vh;
        background: var(--risu-theme-darkbg, #1a1a1a);
        border: 2px solid var(--risu-theme-darkborderc, #333);
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
        z-index: 10000;
        display: none;
        flex-direction: column;
        font-family: system-ui, -apple-system, sans-serif;
    `;

    // Simplified UI structure
    container.innerHTML = `
        <div id="preset-window-header" style="
            padding: 15px 20px;
            background: var(--risu-theme-bgcolor, #2a2a2a);
            border-bottom: 1px solid var(--risu-theme-darkborderc, #333);
            border-radius: 10px 10px 0 0;
            cursor: move;
            display: flex;
            justify-content: space-between;
            align-items: center;
            user-select: none;
        ">
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 1.2em;">🎨</span>
                <h3 style="margin: 0; color: var(--risu-theme-textcolor, #fff); font-size: 1.1em; font-weight: 600;">Theme Preset Manager</h3>
            </div>
            <button id="close-preset-window" style="
                background: transparent;
                border: none;
                color: var(--risu-theme-textcolor2, #888);
                font-size: 1.5em;
                cursor: pointer;
                padding: 0;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 4px;
                transition: all 0.2s;
            ">
                ×
            </button>
        </div>

        <div style="padding: 20px; overflow-y: auto; flex: 1;">
            <!-- Save Preset Section -->
            <div style="display: flex; gap: 10px; margin-bottom: 15px; flex-wrap: wrap;">
                <input type="text" id="preset-name-input" placeholder="Enter preset name..."
                       style="flex: 1; min-width: 150px; padding: 10px 12px; border-radius: 6px; border: 1px solid var(--risu-theme-darkborderc, #333); background: var(--risu-theme-bgcolor, #2a2a2a); color: var(--risu-theme-textcolor, #fff); font-size: 0.95em;">
                <button id="save-preset-btn" style="
                    padding: 10px 16px;
                    border-radius: 6px;
                    border: none;
                    background: var(--risu-theme-selected, #4a9eff);
                    color: var(--risu-theme-textcolor, #fff);
                    cursor: pointer;
                    font-weight: 600;
                    font-size: 0.95em;
                    transition: all 0.2s;
                ">
                    💾 Save Current
                </button>
            </div>

            <!-- Import/Export Section -->
            <div style="
                border-top: 1px solid var(--risu-theme-darkborderc, #333);
                border-bottom: 1px solid var(--risu-theme-darkborderc, #333);
                padding: 12px 0;
                margin-bottom: 20px;
            ">
                <div style="color: var(--risu-theme-textcolor2, #888); font-size: 0.8em; margin-bottom: 8px; text-align: center;">Import/Export</div>
                <div style="display: grid; grid-template-columns: 1fr; gap: 10px;">
                    <button id="import-preset-file-btn" style="
                        padding: 10px 16px;
                        border-radius: 6px;
                        border: 1px solid var(--risu-theme-darkborderc, #333);
                        background: var(--risu-theme-darkbutton, #333);
                        color: var(--risu-theme-textcolor, #fff);
                        cursor: pointer;
                        font-weight: 500;
                        font-size: 0.9em;
                        transition: all 0.2s;
                    " title="Import a single theme preset file">
                        📂 Import Theme File
                    </button>
                </div>
                <div style="color: var(--risu-theme-textcolor2, #888); font-size: 0.8em; margin: 12px 0 8px 0; text-align: center;">Complete Backup</div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <button id="export-all-btn" style="
                        padding: 10px 16px;
                        border-radius: 6px;
                        border: 1px solid var(--risu-theme-darkborderc, #333);
                        background: var(--risu-theme-darkbutton, #333);
                        color: var(--risu-theme-textcolor, #fff);
                        cursor: pointer;
                        font-weight: 500;
                        font-size: 0.9em;
                        transition: all 0.2s;
                    " title="Export all themes + character mappings">
                        📦 Export Backup
                    </button>
                    <button id="import-all-btn" style="
                        padding: 10px 16px;
                        border-radius: 6px;
                        border: 1px solid var(--risu-theme-darkborderc, #333);
                        background: var(--risu-theme-darkbutton, #333);
                        color: var(--risu-theme-textcolor, #fff);
                        cursor: pointer;
                        font-weight: 500;
                        font-size: 0.9em;
                        transition: all 0.2s;
                    " title="Import all themes + character mappings">
                        📥 Import Backup
                    </button>
                </div>
            </div>

            <h4 style="color: var(--risu-theme-textcolor, #fff); margin: 20px 0 10px 0;">Saved Presets</h4>
            <div id="preset-list" style="display: flex; flex-direction: column; gap: 8px;">
                <!-- Preset items will be added here dynamically -->
            </div>

            <!-- Character Auto-Switch Section -->
            <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid var(--risu-theme-darkborderc, #333);">
                <h4 style="color: var(--risu-theme-textcolor, #fff); margin: 0 0 15px 0;">⚡ Character Auto-Switch</h4>

                <div style="margin-bottom: 15px;">
                    <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; color: var(--risu-theme-textcolor, #fff);">
                        <input type="checkbox" id="auto-switch-toggle" style="cursor: pointer;">
                        <span>Enable automatic theme switching based on character</span>
                    </label>
                </div>

                <div id="auto-switch-content" style="display: none;">
                    <!-- Default Theme Display -->
                    <div id="default-theme-container" style="display: none; margin-bottom: 15px;">
                        <div style="color: var(--risu-theme-textcolor2, #aaa); font-size: 0.9em; margin-bottom: 5px;">
                            Default Theme:
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: var(--risu-theme-darkbg, #1a1a1a); border-radius: 6px; border: 1px solid var(--risu-theme-darkborderc, #333);">
                            <span id="default-theme-name" style="color: var(--risu-theme-textcolor, #fff); flex: 1;"></span>
                            <button id="remove-default-theme-btn"
                                style="padding: 4px 8px; background: var(--risu-theme-red, #d32f2f); color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.85em;"
                                title="Remove default theme">
                                Remove
                            </button>
                        </div>
                    </div>

                    <!-- Current Character Display -->
                    <div style="margin-bottom: 10px;">
                        <div style="color: var(--risu-theme-textcolor2, #aaa); font-size: 0.9em; margin-bottom: 5px;">
                            Current Character: <strong id="current-character-name" style="color: var(--risu-theme-textcolor, #fff);">-</strong>
                        </div>
                    </div>

                    <!-- Character Theme Mappings List -->
                    <div style="margin-bottom: 15px;">
                        <div style="color: var(--risu-theme-textcolor2, #aaa); font-size: 0.9em; margin-bottom: 5px;">
                            Character Mappings:
                        </div>
                        <div id="character-mapping-list"
                            style="max-height: 200px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; padding: 8px; background: var(--risu-theme-darkbg, #1a1a1a); border-radius: 6px; border: 1px solid var(--risu-theme-darkborderc, #333);">
                            <div style="color: var(--risu-theme-textcolor2, #666); font-size: 0.9em; text-align: center; padding: 10px;">
                                No character mappings yet
                            </div>
                        </div>
                    </div>

                    <!-- Add Mapping Form -->
                    <div style="padding: 12px; background: var(--risu-theme-darkbg, #1a1a1a); border-radius: 6px; border: 1px solid var(--risu-theme-darkborderc, #333);">
                        <div style="color: var(--risu-theme-textcolor, #fff); font-size: 0.9em; margin-bottom: 10px; font-weight: 500;">
                            Add New Mapping:
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 10px;">
                            <div>
                                <label style="color: var(--risu-theme-textcolor2, #aaa); font-size: 0.85em; display: block; margin-bottom: 4px;">
                                    Character:
                                </label>
                                <input type="text" id="add-mapping-character" readonly
                                    style="width: 100%; padding: 8px; background: var(--risu-theme-bg, #2a2a2a); color: var(--risu-theme-textcolor, #fff); border: 1px solid var(--risu-theme-darkborderc, #333); border-radius: 4px; box-sizing: border-box;"
                                    placeholder="Current character will appear here">
                            </div>
                            <div>
                                <label style="color: var(--risu-theme-textcolor2, #aaa); font-size: 0.85em; display: block; margin-bottom: 4px;">
                                    Theme:
                                </label>
                                <select id="add-mapping-theme"
                                    style="width: 100%; padding: 8px; background: var(--risu-theme-bg, #2a2a2a); color: var(--risu-theme-textcolor, #fff); border: 1px solid var(--risu-theme-darkborderc, #333); border-radius: 4px; cursor: pointer; box-sizing: border-box;">
                                    <option value="">Select a theme...</option>
                                </select>
                            </div>
                            <div style="display: flex; gap: 8px;">
                                <button id="add-mapping-btn"
                                    style="flex: 1; padding: 10px; background: var(--risu-theme-primary, #4a90e2); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; transition: opacity 0.2s;"
                                    onmouseover="this.style.opacity='0.8'"
                                    onmouseout="this.style.opacity='1'">
                                    ➕ Add Mapping
                                </button>
                                <button id="set-as-default-btn"
                                    style="padding: 10px 16px; background: var(--risu-theme-green, #4caf50); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; transition: opacity 0.2s; white-space: nowrap;"
                                    onmouseover="this.style.opacity='0.8'"
                                    onmouseout="this.style.opacity='1'"
                                    title="Set selected theme as default for unmapped characters">
                                    Set as Default
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Hidden file input for imports -->
            <input type="file" id="import-file-input" accept=".json" style="display: none;">

            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--risu-theme-darkborderc, #333);">
                <div style="display: flex; align-items: center; justify-content: center; gap: 12px; flex-wrap: wrap;">
                    <div style="color: var(--risu-theme-textcolor2, #888); font-size: 0.85em;">
                        Press <strong id="shortcut-display" style="color: var(--risu-theme-textcolor, #fff);">${formatShortcutDisplay(getShortcut())}</strong> to toggle this window
                    </div>
                    <button id="change-shortcut-btn"
                        style="padding: 4px 10px; background: var(--risu-theme-darkbutton, #444); color: var(--risu-theme-textcolor, #fff); border: none; border-radius: 4px; cursor: pointer; font-size: 0.8em; transition: opacity 0.2s;"
                        onmouseover="this.style.opacity='0.8'"
                        onmouseout="this.style.opacity='1'"
                        title="Change keyboard shortcut">
                        ⌨️ Change
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(container);
    windowState.window = container;

    // Setup event listeners
    setupEventListeners();

    // Initial update
    updatePresetList();

    return container;
}

/**
 * Setup event listeners for the floating window
 */
function setupEventListeners(): void {
    const container = windowState.window;
    if (!container) return;

    // Close button
    const closeBtn = container.querySelector('#close-preset-window');
    closeBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        toggleFloatingWindow();
    });

    // Close on overlay click
    windowState.overlay?.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFloatingWindow();
    });

    // Save preset
    const saveBtn = container.querySelector('#save-preset-btn');
    const nameInput = container.querySelector('#preset-name-input') as HTMLInputElement;

    saveBtn?.addEventListener('click', () => {
        const name = nameInput?.value.trim();
        if (!name) {
            showModal({
                title: '⚠️ Error',
                content: 'Please enter a preset name',
                buttons: [{ text: 'OK', primary: true }]
            });
            return;
        }

        saveCurrentTheme(name);
        nameInput.value = '';
        updatePresetList();
        showButtonFeedback(saveBtn as HTMLButtonElement, '✓ Saved!');
    });

    // Enter to save
    nameInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            saveBtn?.dispatchEvent(new Event('click'));
        }
    });

    // Import preset file button
    const importFileBtn = container.querySelector('#import-preset-file-btn');
    const fileInput = container.querySelector('#import-file-input') as HTMLInputElement;

    importFileBtn?.addEventListener('click', () => {
        fileInput?.click();
    });

    // File input handler
    fileInput?.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        const file = target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = event.target?.result as string;
                if (importThemePreset(json)) {
                    showModal({
                        title: '✓ Success',
                        content: 'Theme preset imported successfully!',
                        buttons: [
                            { text: 'OK', primary: true, onClick: () => {} }
                        ]
                    });
                    updatePresetList();
                } else {
                    showModal({
                        title: '❌ Error',
                        content: 'Failed to import theme preset. Check console for errors.',
                        buttons: [
                            { text: 'OK', primary: true, onClick: () => {} }
                        ]
                    });
                }
            } catch (error: any) {
                showModal({
                    title: '❌ Error',
                    content: `Failed to read file: ${error.message}`,
                    buttons: [
                        { text: 'OK', primary: true, onClick: () => {} }
                    ]
                });
            }
            target.value = '';
        };
        reader.readAsText(file);
    });

    // Export all button
    const exportAllBtn = container.querySelector('#export-all-btn');
    exportAllBtn?.addEventListener('click', () => {
        const presets = getPresets();
        const characterThemeMap = getCharacterThemeMap();
        const defaultTheme = getDefaultTheme();
        const autoSwitch = getAutoSwitchEnabled();

        if (presets.length === 0 && Object.keys(characterThemeMap).length === 0) {
            showModal({
                title: '⚠️ Warning',
                content: 'No data to export',
                buttons: [
                    { text: 'OK', primary: true, onClick: () => {} }
                ]
            });
            return;
        }

        // Create comprehensive backup object
        const backupData = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            themePresets: presets,
            characterThemeMap: characterThemeMap,
            defaultTheme: defaultTheme,
            autoSwitchEnabled: autoSwitch
        };

        const json = JSON.stringify(backupData, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `risu_theme_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        const charMappingCount = Object.keys(characterThemeMap).length;
        showModal({
            title: '✓ Success',
            content: `Exported complete theme backup:<br>• ${presets.length} theme preset(s)<br>• ${charMappingCount} character mapping(s)<br>• Default theme: ${defaultTheme || 'none'}`,
            buttons: [
                { text: 'OK', primary: true, onClick: () => {} }
            ]
        });
    });

    // Import all button
    const importAllBtn = container.querySelector('#import-all-btn');
    importAllBtn?.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const target = e.target as HTMLInputElement;
            const file = target.files?.[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target?.result as string);

                    // Check if this is the new format (with version) or old format (just array of presets)
                    let backupData: any;
                    let isOldFormat = false;

                    if (Array.isArray(data)) {
                        // Old format: just presets array
                        isOldFormat = true;
                        backupData = {
                            themePresets: data,
                            characterThemeMap: {},
                            defaultTheme: '',
                            autoSwitchEnabled: false
                        };
                    } else if (data.version && data.themePresets) {
                        // New format: comprehensive backup
                        backupData = data;
                    } else {
                        showModal({
                            title: '❌ Error',
                            content: 'Invalid file format. Expected theme backup file.',
                            buttons: [
                                { text: 'OK', primary: true, onClick: () => {} }
                            ]
                        });
                        return;
                    }

                    const presets = backupData.themePresets || [];
                    const characterThemeMap = backupData.characterThemeMap || {};
                    const defaultTheme = backupData.defaultTheme || '';
                    const autoSwitchEnabled = backupData.autoSwitchEnabled || false;
                    const charMappingCount = Object.keys(characterThemeMap).length;

                    const contentMsg = isOldFormat
                        ? `Found ${presets.length} preset(s) (old format).<br>How would you like to import them?`
                        : `Found complete theme backup:<br>• ${presets.length} theme preset(s)<br>• ${charMappingCount} character mapping(s)<br>• Default theme: ${defaultTheme || 'none'}<br><br>How would you like to import them?`;

                    showModal({
                        title: '📥 Import Theme Backup',
                        content: contentMsg,
                        buttons: [
                            {
                                text: 'Replace All',
                                primary: false,
                                onClick: () => {
                                    savePresets(presets);
                                    saveCharacterThemeMap(characterThemeMap);
                                    setDefaultTheme(defaultTheme);
                                    setAutoSwitchEnabled(autoSwitchEnabled);

                                    updatePresetList();

                                    showModal({
                                        title: '✓ Success',
                                        content: `Replaced all theme data:<br>• ${presets.length} preset(s)<br>• ${charMappingCount} character mapping(s)`,
                                        buttons: [
                                            { text: 'OK', primary: true, onClick: () => {} }
                                        ]
                                    });
                                }
                            },
                            {
                                text: 'Merge',
                                primary: true,
                                onClick: () => {
                                    // Merge presets
                                    const existing = getPresets();
                                    const merged = [...existing];
                                    let addedPresets = 0;

                                    for (const preset of presets) {
                                        const existingIndex = merged.findIndex(p => p.name === preset.name);
                                        if (existingIndex >= 0) {
                                            merged[existingIndex] = preset;
                                        } else {
                                            merged.push(preset);
                                            addedPresets++;
                                        }
                                    }

                                    savePresets(merged);

                                    // Merge character theme mappings
                                    const existingMap = getCharacterThemeMap();
                                    const mergedMap = { ...existingMap, ...characterThemeMap };
                                    saveCharacterThemeMap(mergedMap);

                                    // Set default theme if not already set
                                    if (defaultTheme && !getDefaultTheme()) {
                                        setDefaultTheme(defaultTheme);
                                    }

                                    updatePresetList();

                                    showModal({
                                        title: '✓ Success',
                                        content: `Merged theme data:<br>• ${addedPresets} new preset(s) added<br>• ${presets.length - addedPresets} preset(s) updated<br>• ${Object.keys(characterThemeMap).length} character mapping(s) added`,
                                        buttons: [
                                            { text: 'OK', primary: true, onClick: () => {} }
                                        ]
                                    });
                                }
                            },
                            {
                                text: 'Cancel',
                                onClick: () => {}
                            }
                        ]
                    });
                } catch (error: any) {
                    showModal({
                        title: '❌ Error',
                        content: `Failed to parse file: ${error.message}`,
                        buttons: [
                            { text: 'OK', primary: true, onClick: () => {} }
                        ]
                    });
                }
            };
            reader.readAsText(file);
        };
        input.click();
    });

    // Auto-switch toggle
    const autoSwitchToggle = container.querySelector('#auto-switch-toggle') as HTMLInputElement;
    const autoSwitchContent = container.querySelector('#auto-switch-content') as HTMLElement;

    if (autoSwitchToggle) {
        // Set initial state
        autoSwitchToggle.checked = getAutoSwitchEnabled();
        if (autoSwitchToggle.checked) {
            autoSwitchContent.style.display = 'block';
            updateAutoSwitchUI();
        }

        autoSwitchToggle.addEventListener('change', () => {
            const enabled = autoSwitchToggle.checked;
            setAutoSwitchEnabled(enabled);

            if (enabled) {
                autoSwitchContent.style.display = 'block';
                updateAutoSwitchUI();
                startAutoSwitch();
            } else {
                autoSwitchContent.style.display = 'none';
                stopAutoSwitch();
            }
        });
    }

    // Remove default theme button
    const removeDefaultBtn = container.querySelector('#remove-default-theme-btn');
    removeDefaultBtn?.addEventListener('click', () => {
        setDefaultTheme('');
        updateDefaultThemeDisplay();
        showButtonFeedback(removeDefaultBtn as HTMLButtonElement, '✓ Removed!');
    });

    // Add mapping button
    const addMappingBtn = container.querySelector('#add-mapping-btn');
    const mappingCharInput = container.querySelector('#add-mapping-character') as HTMLInputElement;
    const mappingThemeSelect = container.querySelector('#add-mapping-theme') as HTMLSelectElement;

    addMappingBtn?.addEventListener('click', () => {
        const character = mappingCharInput?.value.trim();
        const themeName = mappingThemeSelect?.value;

        if (!character) {
            showModal({
                title: '⚠️ Error',
                content: 'No character selected. Please select a character first.',
                buttons: [{ text: 'OK', primary: true }]
            });
            return;
        }

        if (!themeName) {
            showModal({
                title: '⚠️ Error',
                content: 'Please select a theme to map to this character.',
                buttons: [{ text: 'OK', primary: true }]
            });
            return;
        }

        addCharacterThemeMapping(character, themeName);
        updateCharacterMappingList();
        updateThemeSelectDropdown();
        showButtonFeedback(addMappingBtn as HTMLButtonElement, '✓ Added!');
    });

    // Set as default button
    const setDefaultBtn = container.querySelector('#set-as-default-btn');
    setDefaultBtn?.addEventListener('click', () => {
        const themeName = mappingThemeSelect?.value;

        if (!themeName) {
            showModal({
                title: '⚠️ Error',
                content: 'Please select a theme to set as default.',
                buttons: [{ text: 'OK', primary: true }]
            });
            return;
        }

        setDefaultTheme(themeName);
        updateDefaultThemeDisplay();
        showButtonFeedback(setDefaultBtn as HTMLButtonElement, '✓ Set as Default!');
    });

    // Change shortcut button
    const changeShortcutBtn = container.querySelector('#change-shortcut-btn');
    changeShortcutBtn?.addEventListener('click', () => {
        const currentShortcut = getShortcut();

        showModal({
            title: '⌨️ Change Keyboard Shortcut',
            content: `
                <div style="margin-bottom: 15px;">
                    <div style="margin-bottom: 10px; color: var(--risu-theme-textcolor2, #aaa);">
                        Current shortcut: <strong style="color: var(--risu-theme-textcolor, #fff);">${formatShortcutDisplay(currentShortcut)}</strong>
                    </div>
                    <div style="margin-bottom: 10px; color: var(--risu-theme-textcolor2, #aaa); font-size: 0.9em;">
                        Enter a new keyboard shortcut:
                    </div>
                    <div style="padding: 10px; background: var(--risu-theme-darkbg, #1a1a1a); border-radius: 6px; border: 1px solid var(--risu-theme-darkborderc, #333); margin-bottom: 10px;">
                        <div style="font-size: 0.85em; color: var(--risu-theme-textcolor2, #888); margin-bottom: 8px;">
                            Examples:
                        </div>
                        <div style="font-size: 0.85em; color: var(--risu-theme-textcolor2, #aaa); line-height: 1.6;">
                            • <code style="background: var(--risu-theme-bg, #2a2a2a); padding: 2px 6px; border-radius: 3px;">ctrl+shift+p</code><br>
                            • <code style="background: var(--risu-theme-bg, #2a2a2a); padding: 2px 6px; border-radius: 3px;">alt+t</code><br>
                            • <code style="background: var(--risu-theme-bg, #2a2a2a); padding: 2px 6px; border-radius: 3px;">ctrl+alt+shift+z</code>
                        </div>
                    </div>
                </div>
            `,
            input: {
                value: currentShortcut,
                placeholder: 'e.g., ctrl+shift+p'
            },
            buttons: [
                {
                    text: 'Cancel',
                    onClick: () => {}
                },
                {
                    text: 'Save',
                    primary: true,
                    onClick: (inputValue?: string) => {
                        const newShortcut = inputValue?.trim().toLowerCase();

                        if (!newShortcut) {
                            showModal({
                                title: '⚠️ Error',
                                content: 'Please enter a keyboard shortcut.',
                                buttons: [{ text: 'OK', primary: true }]
                            });
                            return;
                        }

                        // Validate shortcut format
                        const validKeys = ['ctrl', 'alt', 'shift', 'meta'];
                        const parts = newShortcut.split('+').map(p => p.trim());

                        if (parts.length < 2) {
                            showModal({
                                title: '⚠️ Invalid Shortcut',
                                content: 'Shortcut must include at least one modifier key (ctrl, alt, shift) and one regular key.<br><br>Example: <code>ctrl+shift+p</code>',
                                buttons: [{ text: 'OK', primary: true }]
                            });
                            return;
                        }

                        const lastKey = parts[parts.length - 1];
                        const modifiers = parts.slice(0, -1);

                        // Check if at least one modifier is present
                        const hasModifier = modifiers.some(mod => validKeys.includes(mod));
                        if (!hasModifier) {
                            showModal({
                                title: '⚠️ Invalid Shortcut',
                                content: 'Shortcut must include at least one modifier key (ctrl, alt, shift).<br><br>Example: <code>ctrl+p</code>',
                                buttons: [{ text: 'OK', primary: true }]
                            });
                            return;
                        }

                        // Check for invalid modifiers
                        const invalidModifiers = modifiers.filter(mod => !validKeys.includes(mod));
                        if (invalidModifiers.length > 0) {
                            showModal({
                                title: '⚠️ Invalid Shortcut',
                                content: `Invalid modifier key(s): <strong>${invalidModifiers.join(', ')}</strong><br><br>Valid modifiers: ctrl, alt, shift, meta`,
                                buttons: [{ text: 'OK', primary: true }]
                            });
                            return;
                        }

                        // Save the new shortcut
                        setShortcut(newShortcut);
                        updateShortcutDisplay();

                        showModal({
                            title: '✓ Success',
                            content: `Keyboard shortcut changed to: <strong>${formatShortcutDisplay(newShortcut)}</strong>`,
                            buttons: [{ text: 'OK', primary: true }]
                        });
                    }
                }
            ]
        });
    });

    // Dragging functionality
    const header = container.querySelector('#preset-window-header') as HTMLElement;
    let isDragging = false;
    let hasMoved = false;
    let dragOffset = { x: 0, y: 0 };

    header?.addEventListener('mousedown', (e) => {
        // Don't start dragging if clicking on the close button
        if ((e.target as HTMLElement).id === 'close-preset-window') {
            return;
        }

        isDragging = true;
        hasMoved = false;
        const rect = container.getBoundingClientRect();
        dragOffset.x = e.clientX - rect.left;
        dragOffset.y = e.clientY - rect.top;
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;

        // Only update position if mouse actually moved
        hasMoved = true;

        // Convert from centered position to absolute position on first move
        if (container.style.transform !== 'none') {
            const rect = container.getBoundingClientRect();
            container.style.left = `${rect.left}px`;
            container.style.top = `${rect.top}px`;
            container.style.transform = 'none';
        }

        const x = e.clientX - dragOffset.x;
        const y = e.clientY - dragOffset.y;
        container.style.left = `${x}px`;
        container.style.top = `${y}px`;
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
    });
}

/**
 * Update the preset list display
 */
function updatePresetList(): void {
    const listContainer = windowState.window?.querySelector('#preset-list');
    if (!listContainer) return;

    const presets = listThemePresets();
    listContainer.innerHTML = '';

    if (presets.length === 0) {
        listContainer.innerHTML = `
            <div style="text-align: center; padding: 40px 20px;">
                <div style="font-size: 3em; margin-bottom: 10px; opacity: 0.3;">📦</div>
                <p style="color: var(--risu-theme-textcolor2, #888); margin: 0;">No presets saved yet</p>
                <p style="color: var(--risu-theme-textcolor2, #888); font-size: 0.85em; margin-top: 5px;">Create your first theme preset!</p>
            </div>
        `;
        return;
    }

    presets.forEach((preset, index) => {
        const item = document.createElement('div');
        item.className = 'preset-item';
        item.setAttribute('draggable', 'true');
        item.setAttribute('data-index', index.toString());
        item.setAttribute('data-name', preset.name);
        item.style.cssText = `
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 10px;
            padding: 12px 14px;
            background: var(--risu-theme-bgcolor, #2a2a2a);
            border-radius: 8px;
            border: 2px solid var(--risu-theme-darkborderc, #333);
            transition: border-color 0.2s, box-shadow 0.2s;
            margin-bottom: 8px;
        `;

        const date = new Date(preset.timestamp).toLocaleDateString();
        const detailsText = [
            date,
            preset.theme || 'custom',
            preset.hasCustomColors ? '🎨 Custom Colors' : null,
            preset.hasCustomTextTheme ? '📝 Text Theme' : null
        ].filter(Boolean).join(' • ');

        item.innerHTML = `
            <div class="drag-handle" style="
                color: var(--risu-theme-textcolor2, #888);
                font-size: 1.2em;
                cursor: grab;
                user-select: none;
                padding: 0 4px;
                touch-action: none;
            " title="Drag to reorder">⋮⋮</div>
            <div class="preset-info" style="flex: 1; min-width: 0;">
                <div style="color: var(--risu-theme-textcolor, #fff); font-weight: 500; font-size: 0.95em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${escapeHtml(preset.name)}
                </div>
                <div style="color: var(--risu-theme-textcolor2, #888); font-size: 0.8em; margin-top: 2px;">
                    ${detailsText}
                </div>
            </div>
            <div class="preset-buttons" style="display: flex; gap: 8px; flex-wrap: wrap;">
                <button class="load-btn" data-name="${escapeHtml(preset.name)}"
                        style="padding: 6px 12px; border-radius: 5px; border: none; background: var(--risu-theme-selected, #4a9eff); color: var(--risu-theme-textcolor, #fff); cursor: pointer; font-size: 0.85em; font-weight: 500; white-space: nowrap; transition: all 0.2s;"
                        title="Load theme">
                    📥 Load
                </button>
                <button class="rename-btn" data-name="${escapeHtml(preset.name)}"
                        style="padding: 6px 10px; border-radius: 5px; border: none; background: var(--risu-theme-darkbutton, #444); color: var(--risu-theme-textcolor, #fff); cursor: pointer; font-size: 0.85em; transition: all 0.2s;"
                        title="Rename theme">
                    ✏️
                </button>
                <button class="export-btn" data-name="${escapeHtml(preset.name)}"
                        style="padding: 6px 10px; border-radius: 5px; border: none; background: var(--risu-theme-darkbutton, #444); color: var(--risu-theme-textcolor, #fff); cursor: pointer; font-size: 0.85em; transition: all 0.2s;"
                        title="Export theme to file">
                    💾
                </button>
                <button class="delete-btn" data-name="${escapeHtml(preset.name)}"
                        style="padding: 6px 10px; border-radius: 5px; border: none; background: var(--risu-theme-draculared, #ff5555); color: var(--risu-theme-textcolor, #fff); cursor: pointer; font-size: 0.85em; transition: all 0.2s;"
                        title="Delete theme">
                    🗑️
                </button>
            </div>
        `;

        // Hover effects
        item.addEventListener('mouseover', () => {
            item.style.borderColor = 'var(--risu-theme-selected, #4a9eff)';
            item.style.boxShadow = '0 2px 8px rgba(74, 158, 255, 0.2)';
        });
        item.addEventListener('mouseout', () => {
            item.style.borderColor = 'var(--risu-theme-darkborderc, #333)';
            item.style.boxShadow = 'none';
        });

        // Button hover effects
        const buttons = item.querySelectorAll('button');
        buttons.forEach(btn => {
            btn.addEventListener('mouseover', () => {
                if (btn.classList.contains('load-btn')) {
                    (btn as HTMLElement).style.transform = 'scale(1.05)';
                } else if (btn.classList.contains('rename-btn') || btn.classList.contains('export-btn')) {
                    (btn as HTMLElement).style.background = 'var(--risu-theme-selected, #555)';
                    (btn as HTMLElement).style.transform = 'scale(1.05)';
                } else if (btn.classList.contains('delete-btn')) {
                    (btn as HTMLElement).style.background = '#ff3333';
                    (btn as HTMLElement).style.transform = 'scale(1.05)';
                }
            });
            btn.addEventListener('mouseout', () => {
                (btn as HTMLElement).style.transform = '';
                if (btn.classList.contains('rename-btn') || btn.classList.contains('export-btn')) {
                    (btn as HTMLElement).style.background = 'var(--risu-theme-darkbutton, #444)';
                } else if (btn.classList.contains('delete-btn')) {
                    (btn as HTMLElement).style.background = 'var(--risu-theme-draculared, #ff5555)';
                }
            });
        });

        // Load button
        const loadBtn = item.querySelector('.load-btn');
        loadBtn?.addEventListener('click', () => {
            loadThemePreset(preset.name);
            showButtonFeedback(loadBtn as HTMLButtonElement, '✓ Loaded!');
        });

        // Rename button
        const renameBtn = item.querySelector('.rename-btn');
        renameBtn?.addEventListener('click', () => {
            showModal({
                title: '✏️ Rename Theme Preset',
                content: `Enter a new name for "<strong>${escapeHtml(preset.name)}</strong>":`,
                input: {
                    value: preset.name,
                    placeholder: 'New theme name'
                },
                buttons: [
                    {
                        text: 'Cancel',
                        primary: false,
                        onClick: () => {}
                    },
                    {
                        text: 'Rename',
                        primary: true,
                        onClick: (newName: string) => {
                            if (!newName || newName.trim() === '') {
                                showModal({
                                    title: '⚠️ Warning',
                                    content: 'Please enter a valid name',
                                    buttons: [{ text: 'OK', primary: true, onClick: () => {} }]
                                });
                                return;
                            }

                            newName = newName.trim();

                            if (newName === preset.name) {
                                return; // No change
                            }

                            // Check if new name already exists
                            const allPresets = getPresets();
                            const conflict = allPresets.find(p => p.name === newName);
                            if (conflict) {
                                showModal({
                                    title: '❌ Name Conflict',
                                    content: `A theme preset named "<strong>${escapeHtml(newName)}</strong>" already exists.<br><br>Please choose a different name.`,
                                    buttons: [{ text: 'OK', primary: true, onClick: () => {} }]
                                });
                                return;
                            }

                            if (renameThemePreset(preset.name, newName)) {
                                updatePresetList();
                                showModal({
                                    title: '✓ Success',
                                    content: `Theme renamed: "<strong>${escapeHtml(preset.name)}</strong>" → "<strong>${escapeHtml(newName)}</strong>"`,
                                    buttons: [{ text: 'OK', primary: true, onClick: () => {} }]
                                });
                            } else {
                                showModal({
                                    title: '❌ Error',
                                    content: 'Failed to rename theme preset',
                                    buttons: [{ text: 'OK', primary: true, onClick: () => {} }]
                                });
                            }
                        }
                    }
                ]
            });
        });

        // Export button
        const exportBtn = item.querySelector('.export-btn');
        exportBtn?.addEventListener('click', () => {
            const json = exportThemePreset(preset.name);
            if (json) {
                // Create a Blob from the JSON string
                const blob = new Blob([json], { type: 'application/json' });
                const url = URL.createObjectURL(blob);

                // Create a temporary download link
                const a = document.createElement('a');
                a.href = url;
                a.download = `${preset.name.replace(/[^a-zA-Z0-9-_]/g, '_')}_theme_preset.json`;
                document.body.appendChild(a);
                a.click();

                // Cleanup
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                // Show success feedback
                showButtonFeedback(exportBtn as HTMLButtonElement, '✓', '💾');
            }
        });

        // Delete button
        const deleteBtn = item.querySelector('.delete-btn');
        deleteBtn?.addEventListener('click', () => {
            showModal({
                title: '🗑️ Delete Theme Preset',
                content: `Delete theme preset "<strong>${escapeHtml(preset.name)}</strong>"?<br><br>This action cannot be undone.`,
                buttons: [
                    {
                        text: 'Cancel',
                        primary: false,
                        onClick: () => {}
                    },
                    {
                        text: 'Delete',
                        primary: true,
                        onClick: () => {
                            deleteThemePreset(preset.name);
                            updatePresetList();
                        }
                    }
                ]
            });
        });

        listContainer.appendChild(item);
    });

    // Setup drag and drop for reordering presets
    setupDragAndDrop(listContainer);
}

/**
 * Setup drag and drop functionality for preset list
 */
function setupDragAndDrop(listContainer: Element): void {
    let draggedElement: HTMLElement | null = null;
    let draggedIndex: number | null = null;

    // Touch drag variables
    let touchStartY = 0;
    let touchCurrentY = 0;
    let longPressTimer: number | null = null;
    let isDragging = false;
    let autoScrollInterval: number | null = null;

    const LONG_PRESS_DURATION = 500; // milliseconds
    const SCROLL_ZONE_SIZE = 50; // pixels from top/bottom
    const SCROLL_SPEED = 5; // pixels per frame

    // Get scroll container (preset-list has overflow)
    const scrollContainer = listContainer.parentElement;

    // === Desktop: Mouse Drag & Drop ===
    listContainer.querySelectorAll('.preset-item').forEach(item => {
        // Desktop dragstart
        item.addEventListener('dragstart', (e) => {
            const dragEvent = e as DragEvent;
            draggedElement = item as HTMLElement;
            draggedIndex = parseInt(draggedElement.dataset.index || '0');
            draggedElement.style.opacity = '0.5';
            dragEvent.dataTransfer!.effectAllowed = 'move';

            const handle = draggedElement.querySelector('.drag-handle') as HTMLElement;
            if (handle) handle.style.cursor = 'grabbing';
        });

        // Desktop dragend
        item.addEventListener('dragend', (e) => {
            if (draggedElement) {
                draggedElement.style.opacity = '1';
                const handle = draggedElement.querySelector('.drag-handle') as HTMLElement;
                if (handle) handle.style.cursor = 'grab';

                listContainer.querySelectorAll('.preset-item').forEach(el => {
                    (el as HTMLElement).style.borderTopColor = '';
                    (el as HTMLElement).style.borderBottomColor = '';
                    (el as HTMLElement).style.borderTopWidth = '';
                    (el as HTMLElement).style.borderBottomWidth = '';
                });
            }
        });

        // Desktop dragover
        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            const dragEvent = e as DragEvent;
            dragEvent.dataTransfer!.dropEffect = 'move';
            if (!draggedElement || draggedElement === item) return;

            const rect = (item as HTMLElement).getBoundingClientRect();
            const midpoint = rect.top + rect.height / 2;

            listContainer.querySelectorAll('.preset-item').forEach(el => {
                (el as HTMLElement).style.borderTopColor = '';
                (el as HTMLElement).style.borderBottomColor = '';
                (el as HTMLElement).style.borderTopWidth = '';
                (el as HTMLElement).style.borderBottomWidth = '';
            });

            if (dragEvent.clientY < midpoint) {
                (item as HTMLElement).style.borderTopColor = 'var(--risu-theme-selected, #4a9eff)';
                (item as HTMLElement).style.borderTopWidth = '3px';
            } else {
                (item as HTMLElement).style.borderBottomColor = 'var(--risu-theme-selected, #4a9eff)';
                (item as HTMLElement).style.borderBottomWidth = '3px';
            }
        });

        // Desktop dragleave
        item.addEventListener('dragleave', (e) => {
            (item as HTMLElement).style.borderTopColor = '';
            (item as HTMLElement).style.borderBottomColor = '';
            (item as HTMLElement).style.borderTopWidth = '';
            (item as HTMLElement).style.borderBottomWidth = '';
        });

        // Desktop drop
        item.addEventListener('drop', (e) => {
            e.preventDefault();
            if (!draggedElement || draggedElement === item) return;

            const rect = (item as HTMLElement).getBoundingClientRect();
            const midpoint = rect.top + rect.height / 2;
            const targetIndex = parseInt((item as HTMLElement).dataset.index || '0');
            const dragEvent = e as DragEvent;

            let newIndex = dragEvent.clientY < midpoint ? targetIndex : targetIndex + 1;
            if (draggedIndex! < newIndex) newIndex--;

            reorderPresets(draggedIndex!, newIndex);
            updatePresetList();

            console.log(`🎨 Moved preset from position ${draggedIndex} to ${newIndex}`);
        });

        // === Mobile: Touch Drag ===
        const handle = item.querySelector('.drag-handle') as HTMLElement;

        // Touch start - detect long press
        const onTouchStart = (e: TouchEvent) => {
            const touch = e.touches[0];
            touchStartY = touch.clientY;
            touchCurrentY = touch.clientY;

            // Start long press timer
            longPressTimer = window.setTimeout(() => {
                isDragging = true;
                draggedElement = item as HTMLElement;
                draggedIndex = parseInt(draggedElement.dataset.index || '0');

                // Visual feedback
                draggedElement.style.opacity = '0.8';
                draggedElement.style.transform = 'scale(1.05)';
                draggedElement.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
                draggedElement.style.zIndex = '1000';

                if (handle) handle.style.cursor = 'grabbing';

                // Haptic feedback if available
                if ('vibrate' in navigator) {
                    navigator.vibrate(50);
                }
            }, LONG_PRESS_DURATION);
        };

        // Touch move - drag and auto-scroll
        const onTouchMove = (e: TouchEvent) => {
            if (!isDragging) {
                // Cancel long press if moved before timer completes
                if (longPressTimer) {
                    clearTimeout(longPressTimer);
                    longPressTimer = null;
                }
                return;
            }

            e.preventDefault();
            const touch = e.touches[0];
            touchCurrentY = touch.clientY;

            // Move the dragged element visually
            if (draggedElement) {
                const deltaY = touchCurrentY - touchStartY;
                draggedElement.style.transform = `translateY(${deltaY}px) scale(1.05)`;

                // Find target position
                const items = Array.from(listContainer.querySelectorAll('.preset-item')) as HTMLElement[];
                let targetIndex = draggedIndex!;

                for (let i = 0; i < items.length; i++) {
                    if (items[i] === draggedElement) continue;

                    const rect = items[i].getBoundingClientRect();
                    const midpoint = rect.top + rect.height / 2;

                    if (touchCurrentY < midpoint && i < draggedIndex!) {
                        targetIndex = i;
                        break;
                    } else if (touchCurrentY > midpoint && i > draggedIndex!) {
                        targetIndex = i;
                    }
                }

                // Show visual indicator
                items.forEach((el, i) => {
                    el.style.borderTopColor = '';
                    el.style.borderBottomColor = '';
                    el.style.borderTopWidth = '';
                    el.style.borderBottomWidth = '';

                    if (i === targetIndex && i !== draggedIndex) {
                        if (targetIndex < draggedIndex!) {
                            el.style.borderTopColor = 'var(--risu-theme-selected, #4a9eff)';
                            el.style.borderTopWidth = '3px';
                        } else {
                            el.style.borderBottomColor = 'var(--risu-theme-selected, #4a9eff)';
                            el.style.borderBottomWidth = '3px';
                        }
                    }
                });

                // Auto-scroll if near edges
                if (scrollContainer) {
                    const containerRect = scrollContainer.getBoundingClientRect();
                    const distanceFromTop = touchCurrentY - containerRect.top;
                    const distanceFromBottom = containerRect.bottom - touchCurrentY;

                    // Clear existing scroll interval
                    if (autoScrollInterval) {
                        clearInterval(autoScrollInterval);
                        autoScrollInterval = null;
                    }

                    // Scroll up if near top
                    if (distanceFromTop < SCROLL_ZONE_SIZE && scrollContainer.scrollTop > 0) {
                        autoScrollInterval = window.setInterval(() => {
                            scrollContainer.scrollTop -= SCROLL_SPEED;
                            if (scrollContainer.scrollTop <= 0) {
                                if (autoScrollInterval) clearInterval(autoScrollInterval);
                            }
                        }, 16); // ~60fps
                    }
                    // Scroll down if near bottom
                    else if (distanceFromBottom < SCROLL_ZONE_SIZE) {
                        autoScrollInterval = window.setInterval(() => {
                            scrollContainer.scrollTop += SCROLL_SPEED;
                            const maxScroll = scrollContainer.scrollHeight - scrollContainer.clientHeight;
                            if (scrollContainer.scrollTop >= maxScroll) {
                                if (autoScrollInterval) clearInterval(autoScrollInterval);
                            }
                        }, 16);
                    }
                }
            }
        };

        // Touch end - drop
        const onTouchEnd = (e: TouchEvent) => {
            // Cancel long press timer if still running
            if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }

            // Stop auto-scroll
            if (autoScrollInterval) {
                clearInterval(autoScrollInterval);
                autoScrollInterval = null;
            }

            if (!isDragging) return;

            e.preventDefault();

            if (draggedElement) {
                // Find target position
                const items = Array.from(listContainer.querySelectorAll('.preset-item')) as HTMLElement[];
                let targetIndex = draggedIndex!;

                for (let i = 0; i < items.length; i++) {
                    if (items[i] === draggedElement) continue;

                    const rect = items[i].getBoundingClientRect();
                    const midpoint = rect.top + rect.height / 2;

                    if (touchCurrentY < midpoint && i < draggedIndex!) {
                        targetIndex = i;
                        break;
                    } else if (touchCurrentY > midpoint && i > draggedIndex!) {
                        targetIndex = i;
                    }
                }

                // Perform reorder if position changed
                if (targetIndex !== draggedIndex) {
                    reorderPresets(draggedIndex!, targetIndex);
                    console.log(`🎨 Moved preset from position ${draggedIndex} to ${targetIndex}`);

                    // Haptic feedback
                    if ('vibrate' in navigator) {
                        navigator.vibrate(30);
                    }
                }

                // Reset styles
                draggedElement.style.opacity = '1';
                draggedElement.style.transform = '';
                draggedElement.style.boxShadow = '';
                draggedElement.style.zIndex = '';

                if (handle) handle.style.cursor = 'grab';

                // Clear visual indicators
                items.forEach(el => {
                    el.style.borderTopColor = '';
                    el.style.borderBottomColor = '';
                    el.style.borderTopWidth = '';
                    el.style.borderBottomWidth = '';
                });

                // Update list
                updatePresetList();
            }

            isDragging = false;
            draggedElement = null;
            draggedIndex = null;
        };

        // Touch cancel
        const onTouchCancel = (e: TouchEvent) => {
            if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }

            if (autoScrollInterval) {
                clearInterval(autoScrollInterval);
                autoScrollInterval = null;
            }

            if (draggedElement) {
                draggedElement.style.opacity = '1';
                draggedElement.style.transform = '';
                draggedElement.style.boxShadow = '';
                draggedElement.style.zIndex = '';

                if (handle) handle.style.cursor = 'grab';
            }

            isDragging = false;
            draggedElement = null;
            draggedIndex = null;
        };

        // Attach touch listeners to drag handle only
        if (handle) {
            handle.addEventListener('touchstart', onTouchStart, { passive: false });
            handle.addEventListener('touchmove', onTouchMove, { passive: false });
            handle.addEventListener('touchend', onTouchEnd, { passive: false });
            handle.addEventListener('touchcancel', onTouchCancel, { passive: false });
        }
    });
}

/**
 * Toggle floating window visibility
 */
export function toggleFloatingWindow(): void {
    if (!windowState.window) {
        createFloatingWindow();
    }

    const isVisible = windowState.window!.style.display === 'flex';
    windowState.window!.style.display = isVisible ? 'none' : 'flex';
    windowState.overlay!.style.display = isVisible ? 'none' : 'block';

    if (!isVisible) {
        updatePresetList();
    }
}

/**
 * Update the character mapping list display
 */
function updateCharacterMappingList(): void {
    const listContainer = windowState.window?.querySelector('#character-mapping-list');
    if (!listContainer) return;

    const characterThemeMap = getCharacterThemeMap();
    const entries = Object.entries(characterThemeMap);

    if (entries.length === 0) {
        listContainer.innerHTML = `
            <div style="color: var(--risu-theme-textcolor2, #666); font-size: 0.9em; text-align: center; padding: 10px;">
                No character mappings yet
            </div>
        `;
        return;
    }

    listContainer.innerHTML = '';
    entries.forEach(([character, themeName]) => {
        const item = document.createElement('div');
        item.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 10px;
            background: var(--risu-theme-bg, #2a2a2a);
            border-radius: 4px;
            border: 1px solid var(--risu-theme-darkborderc, #333);
        `;

        item.innerHTML = `
            <div style="flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0;">
                <div style="color: var(--risu-theme-textcolor, #fff); font-size: 0.85em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${escapeHtml(character)}
                </div>
                <div style="color: var(--risu-theme-textcolor2, #888); font-size: 0.75em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    → ${escapeHtml(themeName)}
                </div>
            </div>
            <button class="remove-mapping-btn" data-character="${escapeHtml(character)}"
                style="padding: 4px 8px; background: var(--risu-theme-red, #d32f2f); color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.75em; white-space: nowrap;"
                title="Remove mapping">
                Remove
            </button>
        `;

        // Add remove handler
        const removeBtn = item.querySelector('.remove-mapping-btn');
        removeBtn?.addEventListener('click', () => {
            removeCharacterThemeMapping(character);
            updateCharacterMappingList();
            updateThemeSelectDropdown();
            showButtonFeedback(removeBtn as HTMLButtonElement, '✓');
        });

        listContainer.appendChild(item);
    });
}

/**
 * Update current character name display
 */
function updateCurrentCharacterName(): void {
    const charNameElement = windowState.window?.querySelector('#current-character-name');
    const charInput = windowState.window?.querySelector('#add-mapping-character') as HTMLInputElement;

    if (!charNameElement || !charInput) return;

    try {
        const char = getChar();
        const charName = char?.name || '-';

        charNameElement.textContent = charName;
        charInput.value = charName === '-' ? '' : charName;
    } catch (error) {
        charNameElement.textContent = '-';
        charInput.value = '';
    }
}

/**
 * Update default theme display
 */
function updateDefaultThemeDisplay(): void {
    const defaultContainer = windowState.window?.querySelector('#default-theme-container') as HTMLElement;
    const defaultNameElement = windowState.window?.querySelector('#default-theme-name');

    if (!defaultContainer || !defaultNameElement) return;

    const defaultTheme = getDefaultTheme();

    if (defaultTheme) {
        defaultContainer.style.display = 'block';
        defaultNameElement.textContent = defaultTheme;
    } else {
        defaultContainer.style.display = 'none';
    }
}

/**
 * Update theme select dropdown options
 */
function updateThemeSelectDropdown(): void {
    const themeSelect = windowState.window?.querySelector('#add-mapping-theme') as HTMLSelectElement;
    if (!themeSelect) return;

    const presets = getPresets();
    const currentValue = themeSelect.value;

    themeSelect.innerHTML = '<option value="">Select a theme...</option>';

    presets.forEach(preset => {
        const option = document.createElement('option');
        option.value = preset.name;
        option.textContent = preset.name;
        themeSelect.appendChild(option);
    });

    // Restore selection if still valid
    if (currentValue && presets.some(p => p.name === currentValue)) {
        themeSelect.value = currentValue;
    }
}

/**
 * Update all auto-switch UI elements
 */
function updateAutoSwitchUI(): void {
    updateCurrentCharacterName();
    updateDefaultThemeDisplay();
    updateCharacterMappingList();
    updateThemeSelectDropdown();
}

/**
 * Update shortcut display in the UI
 */
function updateShortcutDisplay(): void {
    const shortcutDisplayElement = windowState.window?.querySelector('#shortcut-display');
    if (!shortcutDisplayElement) return;

    shortcutDisplayElement.textContent = formatShortcutDisplay(getShortcut());
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Cleanup UI elements
 */
export function cleanupUI(): void {
    if (windowState.window) {
        windowState.window.remove();
        windowState.window = null;
    }
    if (windowState.overlay) {
        windowState.overlay.remove();
        windowState.overlay = null;
    }

    // Remove settings button
    const existingButtons = document.querySelectorAll('.theme-preset-settings-btn');
    existingButtons.forEach(btn => btn.remove());
}

/**
 * Debounce helper function
 */
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
    let timeout: number | null = null;
    return function(this: any, ...args: Parameters<T>) {
        if (timeout !== null) {
            clearTimeout(timeout);
        }
        timeout = window.setTimeout(() => {
            func.apply(this, args);
        }, wait);
    };
}

/**
 * Inject "Theme Presets" button into Display Settings
 */
export function ensureSettingsButton(): void {
    // Find all existing buttons we added
    const existingButtons = document.querySelectorAll('.theme-preset-settings-btn');

    // Find the color scheme section (text-textcolor class with "colorScheme" or similar text)
    const colorSchemeLabels = Array.from(document.querySelectorAll('span.text-textcolor')).filter(el => {
        const text = el.textContent || '';
        return text.includes('Color Scheme') || text.includes('색상') || text.includes('colorScheme');
    });

    if (colorSchemeLabels.length === 0) {
        // Not in display settings, remove any existing buttons
        existingButtons.forEach(btn => btn.remove());
        return;
    }

    // Find the parent container
    const label = colorSchemeLabels[0];
    let container = label.parentElement;

    if (!container) return;

    // Check if button already exists in this container
    const existingBtn = container.querySelector('.theme-preset-settings-btn');
    if (existingBtn) return; // Already added

    // Remove buttons from other locations
    existingButtons.forEach(btn => {
        if (!container!.contains(btn)) btn.remove();
    });

    // Find where to insert (after the custom color scheme section if it exists)
    let insertPoint: Element | null = null;

    // Look for the "textColor" label which comes after color scheme settings
    const textColorLabels = Array.from(document.querySelectorAll('span.text-textcolor')).filter(el => {
        const text = el.textContent || '';
        return text.includes('Text Color') || text.includes('텍스트') || text.includes('textColor');
    });

    if (textColorLabels.length > 0) {
        insertPoint = textColorLabels[0];
    }

    // Create button
    const btn = document.createElement('button');
    btn.className = 'theme-preset-settings-btn';
    btn.style.cssText = `
        margin-top: 16px;
        margin-bottom: 8px;
        padding: 10px 16px;
        border-radius: 8px;
        border: 1px solid var(--risu-theme-darkborderc, #333);
        background: var(--risu-theme-darkbutton, #333);
        color: var(--risu-theme-textcolor, #fff);
        cursor: pointer;
        font-weight: 500;
        font-size: 14px;
        width: 100%;
        transition: all 0.2s;
    `;
    btn.textContent = '🎨 Theme Presets';
    btn.onmouseover = () => {
        btn.style.background = 'var(--risu-theme-selected, #444)';
        btn.style.transform = 'translateY(-1px)';
    };
    btn.onmouseout = () => {
        btn.style.background = 'var(--risu-theme-darkbutton, #333)';
        btn.style.transform = '';
    };
    btn.onclick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        toggleFloatingWindow();
    };

    // Insert button
    if (insertPoint && insertPoint.parentElement) {
        insertPoint.parentElement.insertBefore(btn, insertPoint);
    } else {
        container.appendChild(btn);
    }
}

/**
 * Setup MutationObserver to watch for settings page changes
 */
export function setupSettingsObserver(): MutationObserver {
    const debouncedEnsureSettingsButton = debounce(ensureSettingsButton, 300);
    const observer = new MutationObserver(() => {
        debouncedEnsureSettingsButton();
    });

    // Find the settings container to observe (more efficient than observing entire body)
    const findSettingsContainer = (): Element | null => {
        // Try to find the main settings container
        // Look for the Display Settings h2 header and observe its parent
        const headers = Array.from(document.querySelectorAll('h2')).filter(el => {
            const text = el.textContent || '';
            return text.includes('Display') || text.includes('디스플레이') || text.includes('display');
        });

        if (headers.length > 0) {
            // Get the parent container that holds all settings
            let container: Element | null = headers[0].parentElement;
            // Go up a few levels to get a larger container that encompasses submenu changes
            for (let i = 0; i < 2 && container && container.parentElement; i++) {
                container = container.parentElement;
            }
            return container;
        }
        return null;
    };

    const settingsContainer = findSettingsContainer();

    if (settingsContainer) {
        observer.observe(settingsContainer, { childList: true, subtree: true });
        console.log('🎨 Theme Preset: Observing settings container only');
    } else {
        // Fallback to body if we can't find the settings container
        observer.observe(document.body, { childList: true, subtree: true });
        console.log('🎨 Theme Preset: Fallback to observing entire body');
    }

    return observer;
}
