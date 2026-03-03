/**
 * Storage module for managing theme presets
 * API v3.0 - Uses pluginStorage for all data persistence
 * Arguments are only read for migration from old versions
 */

import { PLUGIN_NAME, SHARED_CSS_SEPARATOR } from './constants';
import type { ThemePreset, CharacterThemeMap } from './types';

// Storage keys - data stored as JSON strings to avoid Svelte Proxy issues
const STORAGE_KEYS = {
    PRESETS: 'presets',
    CHARACTER_THEME_MAP: 'characterThemeMap',
    DEFAULT_THEME: 'defaultTheme',
    SHARED_CSS: 'sharedCSS',
    CURRENT_PRESET: 'currentPreset'
} as const;

/**
 * Simple async mutex - serializes storage write operations to prevent race conditions.
 * Each withLock call queues behind the previous one via Promise chaining.
 */
let storageLock: Promise<void> = Promise.resolve();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
    const prev = storageLock;
    let resolve: () => void;
    storageLock = new Promise<void>(r => { resolve = r; });
    return prev.then(fn).finally(() => resolve!());
}

/** Name of the currently loaded preset (null if none) */
let currentLoadedPreset: string | null = null;

export function getCurrentPresetName(): string | null {
    return currentLoadedPreset;
}

export function setCurrentPresetName(name: string | null): void {
    currentLoadedPreset = name;
    // Persist to storage (fire-and-forget; in-memory cache is authoritative)
    Risuai.pluginStorage.setItem(STORAGE_KEYS.CURRENT_PRESET, name || '');
}

/**
 * Load currentLoadedPreset from pluginStorage on startup
 */
export async function initCurrentPreset(): Promise<void> {
    try {
        const value = await Risuai.pluginStorage.getItem(STORAGE_KEYS.CURRENT_PRESET);
        currentLoadedPreset = (typeof value === 'string' && value) ? value : null;
    } catch (e) {
        currentLoadedPreset = null;
    }
}

/**
 * Deep clone for getDatabase results (still returns Svelte Proxy)
 */
function deepClone<T>(obj: T): T {
    if (obj === null || obj === undefined) {
        return obj;
    }
    return JSON.parse(JSON.stringify(obj));
}

/**
 * Get shared CSS from pluginStorage
 */
export async function getSharedCSS(): Promise<string> {
    try {
        const data = await Risuai.pluginStorage.getItem(STORAGE_KEYS.SHARED_CSS);
        return (typeof data === 'string') ? data : '';
    } catch (e) {
        console.error('Failed to get shared CSS:', e);
        return '';
    }
}

/**
 * Save shared CSS to pluginStorage
 */
export async function saveSharedCSS(css: string): Promise<void> {
    try {
        await Risuai.pluginStorage.setItem(STORAGE_KEYS.SHARED_CSS, css);
        console.log('Shared CSS saved successfully');
    } catch (e) {
        console.error('Failed to save shared CSS:', e);
    }
}

/**
 * Split full CSS into shared and theme parts using separator
 */
export function splitCSS(fullCSS: string): { sharedCSS: string; themeCSS: string } {
    const separatorIndex = fullCSS.indexOf(SHARED_CSS_SEPARATOR);
    if (separatorIndex === -1) {
        return {
            sharedCSS: '',
            themeCSS: fullCSS
        };
    }
    return {
        sharedCSS: fullCSS.substring(0, separatorIndex).trim(),
        themeCSS: fullCSS.substring(separatorIndex + SHARED_CSS_SEPARATOR.length).trim()
    };
}

/**
 * Combine shared CSS and theme CSS with separator
 */
export function combineCSS(sharedCSS: string, themeCSS: string): string {
    if (!sharedCSS && !themeCSS) return '';
    if (!sharedCSS) return themeCSS;
    if (!themeCSS) return sharedCSS + '\n\n' + SHARED_CSS_SEPARATOR + '\n';
    return sharedCSS + '\n\n' + SHARED_CSS_SEPARATOR + '\n\n' + themeCSS;
}

/**
 * Apply CSS to the DOM via RisuAI's SafeDocument API.
 * Updates existing #customcss style element, or creates one if missing.
 */
export async function applyCSSToDom(css: string): Promise<void> {
    try {
        const rootDoc = await Risuai.getRootDocument();
        let existingStyle = await rootDoc.querySelector('#customcss');
        if (!existingStyle) {
            existingStyle = await rootDoc.querySelector('style[x-id="customcss"]');
        }

        if (existingStyle) {
            await existingStyle.setInnerHTML(css);
        } else {
            const styleElement = rootDoc.createElement('style');
            await styleElement.setAttribute('x-id', 'customcss');
            await styleElement.setInnerHTML(css);
            const head = await rootDoc.querySelector('head');
            if (head) {
                await head.appendChild(styleElement);
            }
        }
    } catch (e) {
        console.log('Could not apply CSS to DOM:', e);
    }
}

/**
 * Get all saved presets from pluginStorage
 * Stored as JSON string to avoid Svelte reactive Proxy issues
 */
export async function getPresets(): Promise<ThemePreset[]> {
    try {
        const data = await Risuai.pluginStorage.getItem(STORAGE_KEYS.PRESETS);
        // If already string (new format), parse it
        if (typeof data === 'string') {
            const presets = JSON.parse(data);
            return Array.isArray(presets) ? presets : [];
        }
        // If array (old format), return as-is but stringify for safety
        if (Array.isArray(data)) {
            return JSON.parse(JSON.stringify(data));
        }
        return [];
    } catch (e) {
        console.error('Failed to get presets:', e);
        return [];
    }
}

/**
 * Save presets array to pluginStorage
 * Stored as JSON string to avoid Svelte reactive Proxy issues
 */
export async function savePresets(presets: ThemePreset[]): Promise<void> {
    try {
        // Store as JSON string to avoid Proxy serialization issues
        await Risuai.pluginStorage.setItem(STORAGE_KEYS.PRESETS, JSON.stringify(presets));
    } catch (e) {
        console.error('Failed to save presets:', e);
    }
}

/**
 * Reorder presets by moving a preset from one index to another
 */
export function reorderPresets(fromIndex: number, toIndex: number): Promise<boolean> {
    return withLock(async () => {
        const presets = await getPresets();

        // Validate indices
        if (fromIndex < 0 || fromIndex >= presets.length || toIndex < 0 || toIndex >= presets.length) {
            return false;
        }

        // Remove from old position and insert at new position
        const [removed] = presets.splice(fromIndex, 1);
        presets.splice(toIndex, 0, removed);

        await savePresets(presets);
        return true;
    });
}

/**
 * Save current theme as a preset
 * Note: Custom colorScheme/textTheme objects are NOT saved - only names
 * API v3.0 doesn't allow colorScheme in allowedDbKeys, so we can't restore them anyway
 */
export function saveCurrentTheme(presetName: string): Promise<ThemePreset> {
    return withLock(async () => {
        // Only fetch needed theme fields (avoid fetching entire DB)
        const db = deepClone(await Risuai.getDatabase(['customCSS', 'guiHTML', 'theme', 'colorSchemeName', 'textTheme']));
        const presets = await getPresets();

        // Strip shared CSS from customCSS - only save theme-specific CSS
        const { themeCSS: cssToSave } = splitCSS(db?.customCSS || '');

        const newPreset: ThemePreset = {
            name: presetName,
            customCSS: cssToSave,
            guiHTML: db?.guiHTML || '',
            theme: db?.theme || '',
            colorSchemeName: db?.colorSchemeName || '',
            textTheme: db?.textTheme || 'standard',
            timestamp: Date.now()
        };

        // Remove existing preset with same name
        const filtered = presets.filter(p => p.name !== presetName);
        filtered.push(newPreset);

        await savePresets(filtered);
        setCurrentPresetName(presetName);
        console.log(`Theme preset "${presetName}" saved successfully`);

        return newPreset;
    });
}

/**
 * Load and apply a theme preset
 * Note: Uses setDatabase() without getDatabase() to avoid permission prompt
 * setDatabase() merges only the provided keys, so we don't need full DB access
 * Note: colorScheme/customTextTheme objects are NOT supported in API v3.0 (not in allowedDbKeys)
 */
export function loadThemePreset(presetName: string): Promise<boolean> {
    return withLock(async () => {
        const presets = await getPresets();
        const preset = presets.find(p => p.name === presetName);

        if (!preset) {
            console.error(`Theme preset "${presetName}" not found`);
            return false;
        }

        // Combine shared CSS with theme CSS
        const sharedCSS = await getSharedCSS();
        const themeCSS = preset.customCSS || '';
        const finalCSS = combineCSS(sharedCSS, themeCSS);

        // Build update object with only the keys we can set
        const dbUpdate: Record<string, any> = {
            customCSS: finalCSS,
            guiHTML: preset.guiHTML || '',
            theme: preset.theme || '',
            colorSchemeName: preset.colorSchemeName || '',
            textTheme: preset.textTheme || 'standard'
        };

        await Risuai.setDatabase(dbUpdate);

        // Apply customCSS immediately to DOM
        await applyCSSToDom(finalCSS);

        setCurrentPresetName(presetName);
        console.log(`Theme preset "${presetName}" loaded successfully!`);
        return true;
    });
}

/**
 * Rename a theme preset
 */
export function renameThemePreset(oldName: string, newName: string): Promise<boolean> {
    return withLock(async () => {
        const presets = await getPresets();
        const preset = presets.find(p => p.name === oldName);

        if (!preset) {
            console.error(`Theme preset "${oldName}" not found`);
            return false;
        }

        // Check if new name already exists (and it's not the same preset)
        const conflict = presets.find(p => p.name === newName && p.name !== oldName);
        if (conflict) {
            console.error(`Theme preset "${newName}" already exists`);
            return false;
        }

        // Update the preset name
        preset.name = newName;
        preset.timestamp = Date.now();

        await savePresets(presets);

        // Update character theme mappings
        const map = await getCharacterThemeMap();
        let updated = false;
        for (const [charName, themeName] of Object.entries(map)) {
            if (themeName === oldName) {
                map[charName] = newName;
                updated = true;
            }
        }
        if (updated) {
            await saveCharacterThemeMap(map);
        }

        // Update default theme if it was renamed
        if (await getDefaultTheme() === oldName) {
            await setDefaultTheme(newName);
        }

        // Update current preset tracking
        if (currentLoadedPreset === oldName) {
            setCurrentPresetName(newName);
        }

        console.log(`Theme preset renamed: "${oldName}" -> "${newName}"`);
        return true;
    });
}

/**
 * Delete a theme preset
 */
export function deleteThemePreset(presetName: string): Promise<boolean> {
    return withLock(async () => {
        const presets = await getPresets();
        const filtered = presets.filter(p => p.name !== presetName);

        if (filtered.length === presets.length) {
            console.error(`Theme preset "${presetName}" not found`);
            return false;
        }

        await savePresets(filtered);

        if (currentLoadedPreset === presetName) {
            setCurrentPresetName(null);
        }

        console.log(`Theme preset "${presetName}" deleted successfully`);
        return true;
    });
}

/**
 * List all theme presets with metadata
 */
export async function listThemePresets() {
    const presets = await getPresets();
    return presets.map(p => ({
        name: p.name,
        timestamp: p.timestamp,
        hasCSS: !!p.customCSS,
        hasHTML: !!p.guiHTML,
        theme: p.theme,
        colorSchemeName: p.colorSchemeName,
        textTheme: p.textTheme
    }));
}

/**
 * Export a theme preset as JSON
 */
export async function exportThemePreset(presetName: string): Promise<string | null> {
    const presets = await getPresets();
    const preset = presets.find(p => p.name === presetName);

    if (!preset) {
        console.error(`Theme preset "${presetName}" not found`);
        return null;
    }

    return JSON.stringify(preset, null, 2);
}

/**
 * Import a theme preset from JSON
 */
export async function importThemePreset(presetJson: string): Promise<boolean> {
    try {
        const preset = JSON.parse(presetJson);

        if (!preset.name || typeof preset.name !== 'string') {
            console.error('Invalid preset format: missing name');
            return false;
        }

        const presets = await getPresets();
        const filtered = presets.filter(p => p.name !== preset.name);

        preset.timestamp = Date.now();
        filtered.push(preset);

        await savePresets(filtered);
        console.log(`Theme preset "${preset.name}" imported successfully`);
        return true;
    } catch (e) {
        console.error('Failed to import theme preset:', e);
        return false;
    }
}

/**
 * Get character to theme mapping from pluginStorage
 * Stored as JSON string to avoid Svelte reactive Proxy issues
 */
export async function getCharacterThemeMap(): Promise<CharacterThemeMap> {
    try {
        const data = await Risuai.pluginStorage.getItem(STORAGE_KEYS.CHARACTER_THEME_MAP);
        // If already string (new format), parse it
        if (typeof data === 'string') {
            const map = JSON.parse(data);
            return (typeof map === 'object' && map !== null) ? map : {};
        }
        // If object (old format), deep clone for safety
        if (typeof data === 'object' && data !== null) {
            return deepClone(data as CharacterThemeMap);
        }
        return {};
    } catch (e) {
        console.error('Failed to get character theme map:', e);
        return {};
    }
}

/**
 * Save character to theme mapping to pluginStorage
 * Stored as JSON string to avoid Svelte reactive Proxy issues
 */
export async function saveCharacterThemeMap(map: CharacterThemeMap): Promise<void> {
    try {
        // Store as JSON string to avoid Proxy serialization issues
        await Risuai.pluginStorage.setItem(STORAGE_KEYS.CHARACTER_THEME_MAP, JSON.stringify(map));
    } catch (e) {
        console.error('Failed to save character theme map:', e);
    }
}

/**
 * Add a character theme mapping
 */
export function addCharacterThemeMapping(charName: string, themeName: string): Promise<void> {
    return withLock(async () => {
        const map = await getCharacterThemeMap();
        map[charName] = themeName;
        await saveCharacterThemeMap(map);
        console.log(`Character "${charName}" mapped to theme "${themeName}"`);
    });
}

/**
 * Remove a character theme mapping
 */
export function removeCharacterThemeMapping(charName: string): Promise<void> {
    return withLock(async () => {
        const map = await getCharacterThemeMap();
        delete map[charName];
        await saveCharacterThemeMap(map);
        console.log(`Character "${charName}" mapping removed`);
    });
}

/**
 * Get default theme (from pluginStorage)
 */
export async function getDefaultTheme(): Promise<string> {
    try {
        const value = await Risuai.pluginStorage.getItem(STORAGE_KEYS.DEFAULT_THEME);
        return (typeof value === 'string') ? value : '';
    } catch (e) {
        return '';
    }
}

/**
 * Set default theme (to pluginStorage)
 */
export async function setDefaultTheme(themeName: string): Promise<void> {
    await Risuai.pluginStorage.setItem(STORAGE_KEYS.DEFAULT_THEME, themeName);
}

/**
 * Migrate data from old argument-based storage to new pluginStorage
 * Call this once during plugin initialization
 */
export async function migrateFromArgumentStorage(): Promise<void> {
    try {
        // Check if migration is needed (check if presets already exist in pluginStorage)
        const existingPresets = await Risuai.pluginStorage.getItem(STORAGE_KEYS.PRESETS);
        if (existingPresets) {
            // Check if it's a string with content or an array with items
            const hasData = typeof existingPresets === 'string'
                ? existingPresets.length > 2  // More than "[]"
                : Array.isArray(existingPresets) && existingPresets.length > 0;
            if (hasData) {
                // Already migrated
                return;
            }
        }

        console.log('Theme Preset Manager: Checking for data to migrate...');

        // Try to load presets from old argument storage
        const oldPresetsJson = await Risuai.getArgument(`${PLUGIN_NAME}::presets`) as string;
        if (oldPresetsJson && oldPresetsJson !== '') {
            try {
                const oldPresets = JSON.parse(oldPresetsJson);
                if (Array.isArray(oldPresets) && oldPresets.length > 0) {
                    await Risuai.pluginStorage.setItem(STORAGE_KEYS.PRESETS, JSON.stringify(oldPresets));
                    console.log(`Migrated ${oldPresets.length} presets to pluginStorage`);
                }
            } catch (e) {
                console.error('Failed to parse old presets for migration:', e);
            }
        }

        // Migrate character theme map
        const oldMapJson = await Risuai.getArgument(`${PLUGIN_NAME}::characterThemeMap`) as string;
        if (oldMapJson && oldMapJson !== '') {
            try {
                const oldMap = JSON.parse(oldMapJson);
                if (typeof oldMap === 'object' && Object.keys(oldMap).length > 0) {
                    await Risuai.pluginStorage.setItem(STORAGE_KEYS.CHARACTER_THEME_MAP, JSON.stringify(oldMap));
                    console.log(`Migrated ${Object.keys(oldMap).length} character mappings to pluginStorage`);
                }
            } catch (e) {
                console.error('Failed to parse old character theme map for migration:', e);
            }
        }

        // Migrate default theme
        const oldDefaultTheme = await Risuai.getArgument(`${PLUGIN_NAME}::defaultTheme`) as string;
        if (oldDefaultTheme && oldDefaultTheme !== '') {
            await Risuai.pluginStorage.setItem(STORAGE_KEYS.DEFAULT_THEME, oldDefaultTheme);
            console.log(`Migrated default theme: ${oldDefaultTheme}`);
        }

        // Migrate auto-switch setting
        const oldAutoSwitch = await Risuai.getArgument(`${PLUGIN_NAME}::autoSwitch`) as string;
        if (oldAutoSwitch && oldAutoSwitch !== '') {
            await Risuai.pluginStorage.setItem('autoSwitch', oldAutoSwitch);
            console.log(`Migrated auto-switch setting: ${oldAutoSwitch}`);
        }

    } catch (e) {
        console.error('Migration failed:', e);
    }
}
