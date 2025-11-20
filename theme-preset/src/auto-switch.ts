/**
 * Automatic theme switching based on current character
 */

// Declare global RisuAI API functions
declare function getChar(): { name: string } | null;

import { PLUGIN_NAME, CHAR_POLL_INTERVAL } from './constants';
import { getCharacterThemeMap, getDefaultTheme } from './storage';
import { loadThemePreset } from './storage';

let autoSwitchInterval: number | null = null;
let lastCharacterName: string | null = null;

/**
 * Check if auto-switch is enabled
 */
export function getAutoSwitchEnabled(): boolean {
    const value = getArg(`${PLUGIN_NAME}::autoSwitch`) as string;
    return value === 'true' || value === true;
}

/**
 * Enable or disable auto-switch
 */
export function setAutoSwitchEnabled(enabled: boolean): void {
    setArg(`${PLUGIN_NAME}::autoSwitch`, enabled ? 'true' : 'false');

    if (enabled) {
        startAutoSwitch();
    } else {
        stopAutoSwitch();
    }
}

/**
 * Check current character and switch theme if needed
 */
export function checkAndSwitchTheme(): void {
    if (!getAutoSwitchEnabled()) {
        return;
    }

    try {
        const char = getChar();
        if (!char || !char.name) {
            return;
        }

        // Only switch if character changed
        if (char.name === lastCharacterName) {
            return;
        }

        lastCharacterName = char.name;

        const map = getCharacterThemeMap();
        const themeName = map[char.name];

        if (themeName) {
            // Character has a specific theme mapping
            console.log(`🎨 Auto-switching to theme: ${themeName} for character: ${char.name}`);
            loadThemePreset(themeName);
            // Apply again after a short delay to ensure RisuAI doesn't override it
            setTimeout(() => loadThemePreset(themeName), 500);
        } else {
            // No mapping, use default theme if set
            const defaultTheme = getDefaultTheme();
            if (defaultTheme) {
                console.log(`🎨 Auto-switching to default theme: ${defaultTheme} (no mapping for ${char.name})`);
                loadThemePreset(defaultTheme);
                // Apply again after a short delay to ensure RisuAI doesn't override it
                setTimeout(() => loadThemePreset(defaultTheme), 500);
            }
        }
    } catch (e) {
        console.error('Failed to check and switch theme:', e);
    }
}

/**
 * Start auto-switch monitoring
 */
export function startAutoSwitch(): void {
    if (autoSwitchInterval !== null) {
        return; // Already running
    }

    console.log('🎨 Theme auto-switch enabled');

    // Check immediately
    checkAndSwitchTheme();

    // Apply theme again after delays to ensure it sticks after RisuAI initialization
    // RisuAI might apply its own color scheme during page load
    setTimeout(() => checkAndSwitchTheme(), 1000);
    setTimeout(() => checkAndSwitchTheme(), 2000);

    // Then check periodically
    autoSwitchInterval = window.setInterval(() => {
        checkAndSwitchTheme();
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
        console.log('🎨 Theme auto-switch disabled');
    }
}

/**
 * Initialize auto-switch if enabled
 */
export function initAutoSwitch(): void {
    if (getAutoSwitchEnabled()) {
        startAutoSwitch();
    }
}
