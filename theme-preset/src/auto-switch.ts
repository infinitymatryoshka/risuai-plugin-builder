/**
 * Automatic theme switching based on current character
 * API v3.0 - All methods are async
 */

import { CHAR_POLL_INTERVAL } from './constants';
import { getCharacterThemeMap, getDefaultTheme, loadThemePreset, getCurrentPresetName } from './storage';

let autoSwitchInterval: number | null = null;
let lastCharacterName: string | null = null;
let lastCharacterIndex: number = -1;

const STORAGE_KEY_AUTO_SWITCH = 'autoSwitch';

/**
 * Check if auto-switch is enabled (uses pluginStorage)
 */
export async function getAutoSwitchEnabled(): Promise<boolean> {
    try {
        const value = await Risuai.pluginStorage.getItem(STORAGE_KEY_AUTO_SWITCH);
        if (typeof value === 'string') {
            return value === 'true';
        }
        return value === true;
    } catch (e) {
        return false;
    }
}

/**
 * Enable or disable auto-switch (uses pluginStorage)
 */
export async function setAutoSwitchEnabled(enabled: boolean): Promise<void> {
    await Risuai.pluginStorage.setItem(STORAGE_KEY_AUTO_SWITCH, enabled ? 'true' : 'false');

    if (enabled) {
        await startAutoSwitch();
    } else {
        stopAutoSwitch();
    }
}

/**
 * Check current character and switch theme if needed
 */
export async function checkAndSwitchTheme(): Promise<void> {
    if (!await getAutoSwitchEnabled()) {
        return;
    }

    // Quick index check first (lightweight call) to skip unnecessary full character fetch
    let currentIndex: number;
    try {
        currentIndex = await Risuai.getCurrentCharacterIndex();
    } catch (e) {
        return;
    }

    if (currentIndex === lastCharacterIndex) {
        return;
    }
    lastCharacterIndex = currentIndex;

    // Index changed - fetch full character for name-based mapping
    let char: any = null;
    try {
        char = await Risuai.getCharacter();
    } catch (e) {
        return;
    }

    if (!char || !char.name) {
        return;
    }

    // Only switch if character name actually changed (handles same-name edge case)
    if (char.name === lastCharacterName) {
        return;
    }

    lastCharacterName = char.name;

    try {
        const map = await getCharacterThemeMap();
        const themeName = map[char.name];

        const targetTheme = themeName || await getDefaultTheme();
        if (!targetTheme) return;

        // Skip if already on the target preset
        if (getCurrentPresetName() === targetTheme) return;

        console.log(`Auto-switching to theme: ${targetTheme} for character: ${char.name}`);
        await loadThemePreset(targetTheme);
        // Apply again after a short delay to ensure RisuAI doesn't override it
        setTimeout(async () => {
            try { await loadThemePreset(targetTheme); } catch (e) { /* ignore */ }
        }, 500);
    } catch (e) {
        console.error('Failed to apply theme:', e);
    }
}

/**
 * Start auto-switch monitoring
 */
export async function startAutoSwitch(): Promise<void> {
    if (autoSwitchInterval !== null) {
        return; // Already running
    }

    console.log('Theme auto-switch enabled');

    // Check immediately
    await checkAndSwitchTheme();

    // Apply theme again after delays to ensure it sticks after RisuAI initialization
    // RisuAI might apply its own color scheme during page load
    setTimeout(async () => await checkAndSwitchTheme(), 1000);
    setTimeout(async () => await checkAndSwitchTheme(), 2000);

    // Then check periodically
    autoSwitchInterval = window.setInterval(async () => {
        await checkAndSwitchTheme();
    }, CHAR_POLL_INTERVAL);
}

/**
 * Stop auto-switch monitoring
 */
export function stopAutoSwitch(): void {
    if (autoSwitchInterval !== null) {
        clearInterval(autoSwitchInterval);
        autoSwitchInterval = null;
        lastCharacterName = null;
        lastCharacterIndex = -1;
        console.log('Theme auto-switch disabled');
    }
}

/**
 * Initialize auto-switch if enabled
 */
export async function initAutoSwitch(): Promise<void> {
    if (await getAutoSwitchEnabled()) {
        await startAutoSwitch();
    }
}
