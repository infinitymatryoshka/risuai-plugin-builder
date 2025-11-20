/**
 * Keyboard shortcuts module
 */

import { PLUGIN_NAME, DEFAULT_SHORTCUT } from './constants';
import type { ShortcutConfig } from './types';

/**
 * Get the configured keyboard shortcut
 */
export function getShortcut(): string {
    const saved = getArg(`${PLUGIN_NAME}::shortcut`) as string;

    // If saved, return it
    if (saved) {
        return saved;
    }

    // Return platform-specific default
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    return isMac ? 'Meta+Alt+X' : DEFAULT_SHORTCUT;
}

/**
 * Normalize shortcut format (e.g., "Ctrl+Alt+X")
 */
export function normalizeShortcut(shortcut: string): string {
    const parts = shortcut.split('+').map(p => p.trim());
    const modifiers: string[] = [];
    let key = parts[parts.length - 1];

    // Normalize modifiers (capitalize first letter)
    const modifierParts = parts.slice(0, -1);
    for (const mod of modifierParts) {
        const normalized = mod.charAt(0).toUpperCase() + mod.slice(1).toLowerCase();
        modifiers.push(normalized);
    }

    // Normalize key (uppercase)
    key = key.toUpperCase();

    return [...modifiers, key].join('+');
}

/**
 * Set keyboard shortcut
 */
export function setShortcut(shortcut: string): void {
    const normalized = normalizeShortcut(shortcut);
    setArg(`${PLUGIN_NAME}::shortcut`, normalized);
}

/**
 * Parse shortcut string into config object
 */
export function parseShortcut(shortcut: string): ShortcutConfig {
    const parts = shortcut.split('+').map(p => p.trim());

    // The key is the last non-modifier part
    let key = parts[parts.length - 1];

    // Filter out the key from parts to get only modifiers
    const modifierParts = parts.slice(0, -1);

    return {
        ctrl: modifierParts.includes('Ctrl'),
        alt: modifierParts.includes('Alt'),
        shift: modifierParts.includes('Shift'),
        meta: modifierParts.includes('Cmd') || modifierParts.includes('Meta'),
        key: key.toUpperCase()
    };
}

/**
 * Check if keyboard event matches shortcut
 */
export function isShortcutMatch(event: KeyboardEvent, shortcut: string): boolean {
    const parsed = parseShortcut(shortcut);

    // Check if the pressed key combination EXACTLY matches the shortcut
    // Note: On Mac in RisuAI, Cmd key sometimes reports as Ctrl, so we check both
    const ctrlOrMetaPressed = event.ctrlKey || event.metaKey;
    const modifiersMatch =
        ctrlOrMetaPressed === (parsed.ctrl || parsed.meta) &&
        event.altKey === parsed.alt &&
        event.shiftKey === parsed.shift;

    // Use e.code instead of e.key to avoid special character issues
    // e.g., on Mac, Option+X produces "≈" but e.code is still "KeyX"
    const normalizedCode = event.code.replace('Key', '').toUpperCase();
    const keyMatch = normalizedCode === parsed.key.toUpperCase();

    return modifiersMatch && keyMatch;
}

/**
 * Format shortcut for display (with platform-specific symbols on Mac)
 */
export function formatShortcutDisplay(shortcut: string): string {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    if (isMac) {
        return shortcut
            .replace(/Ctrl|Meta|Cmd/g, '⌘')
            .replace('Alt', '⌥')
            .replace('Shift', '⇧');
    }
    return shortcut;
}
