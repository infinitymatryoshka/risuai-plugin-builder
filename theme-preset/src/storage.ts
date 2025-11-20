/**
 * Storage module for managing theme presets
 */

import { PLUGIN_NAME } from './constants';
import type { ThemePreset, CharacterThemeMap } from './types';
import { applyColorScheme, applyTextTheme, getColorSchemeType, getColorSchemeByName } from './color-schemes';

/**
 * Get all saved presets
 */
export function getPresets(): ThemePreset[] {
    const presetsJson = getArg(`${PLUGIN_NAME}::presets`) as string;
    if (!presetsJson || presetsJson === '') {
        return [];
    }
    try {
        return JSON.parse(presetsJson);
    } catch (e) {
        console.error('Failed to parse theme presets:', e);
        return [];
    }
}

/**
 * Save presets array
 */
export function savePresets(presets: ThemePreset[]): void {
    setArg(`${PLUGIN_NAME}::presets`, JSON.stringify(presets));
}

/**
 * Reorder presets by moving a preset from one index to another
 */
export function reorderPresets(fromIndex: number, toIndex: number): boolean {
    const presets = getPresets();

    // Validate indices
    if (fromIndex < 0 || fromIndex >= presets.length || toIndex < 0 || toIndex >= presets.length) {
        return false;
    }

    // Remove from old position and insert at new position
    const [removed] = presets.splice(fromIndex, 1);
    presets.splice(toIndex, 0, removed);

    savePresets(presets);
    return true;
}

/**
 * Save current theme as a preset
 */
export function saveCurrentTheme(presetName: string): ThemePreset {
    const db = getDatabase();
    const presets = getPresets();

    const newPreset: ThemePreset = {
        name: presetName,
        customCSS: db.customCSS || '',
        guiHTML: db.guiHTML || '',
        theme: db.theme || '',
        colorSchemeName: db.colorSchemeName || '',
        textTheme: db.textTheme || 'standard',
        timestamp: Date.now()
    };

    // Save custom color scheme if it's being used
    if (db.colorSchemeName === 'custom' && db.colorScheme) {
        newPreset.colorScheme = {
            type: db.colorScheme.type || 'dark',
            bgcolor: db.colorScheme.bgcolor || '',
            darkbg: db.colorScheme.darkbg || '',
            borderc: db.colorScheme.borderc || '',
            selected: db.colorScheme.selected || '',
            draculared: db.colorScheme.draculared || '',
            darkBorderc: db.colorScheme.darkBorderc || '',
            darkbutton: db.colorScheme.darkbutton || '',
            textcolor: db.colorScheme.textcolor || '',
            textcolor2: db.colorScheme.textcolor2 || ''
        };
    }

    // Save custom text theme if it's being used
    if (db.textTheme === 'custom' && db.customTextTheme) {
        newPreset.customTextTheme = {
            FontColorStandard: db.customTextTheme.FontColorStandard || '',
            FontColorItalic: db.customTextTheme.FontColorItalic || '',
            FontColorBold: db.customTextTheme.FontColorBold || '',
            FontColorItalicBold: db.customTextTheme.FontColorItalicBold || '',
            FontColorQuote1: db.customTextTheme.FontColorQuote1 || null,
            FontColorQuote2: db.customTextTheme.FontColorQuote2 || null
        };
    }

    // Remove existing preset with same name
    const filtered = presets.filter(p => p.name !== presetName);
    filtered.push(newPreset);

    savePresets(filtered);
    console.log(`Theme preset "${presetName}" saved successfully`);

    return newPreset;
}

/**
 * Load and apply a theme preset
 */
export function loadThemePreset(presetName: string): boolean {
    const presets = getPresets();
    const preset = presets.find(p => p.name === presetName);

    if (!preset) {
        console.error(`Theme preset "${presetName}" not found`);
        return false;
    }

    const db = getDatabase();

    db.customCSS = preset.customCSS || '';
    db.guiHTML = preset.guiHTML || '';
    db.theme = preset.theme || '';
    db.colorSchemeName = preset.colorSchemeName || '';
    db.textTheme = preset.textTheme || 'standard';

    // CRITICAL FIX: Update db.colorScheme object to match colorSchemeName
    // This is what RisuAI's changeColorScheme() does
    if (preset.colorSchemeName !== 'custom') {
        // For preset color schemes (realblack, cherry, etc.),
        // we must update db.colorScheme object from the scheme definition
        const schemeObj = getColorSchemeByName(preset.colorSchemeName);
        if (schemeObj) {
            db.colorScheme = schemeObj;
        }
    }

    // Restore custom color scheme if it was saved (for custom schemes only)
    if (preset.colorScheme) {
        db.colorScheme = {
            type: preset.colorScheme.type || 'dark',
            bgcolor: preset.colorScheme.bgcolor || '',
            darkbg: preset.colorScheme.darkbg || '',
            borderc: preset.colorScheme.borderc || '',
            selected: preset.colorScheme.selected || '',
            draculared: preset.colorScheme.draculared || '',
            darkBorderc: preset.colorScheme.darkBorderc || '',
            darkbutton: preset.colorScheme.darkbutton || '',
            textcolor: preset.colorScheme.textcolor || '',
            textcolor2: preset.colorScheme.textcolor2 || ''
        };
    }

    // Restore custom text theme if it was saved
    if (preset.customTextTheme) {
        db.customTextTheme = {
            FontColorStandard: preset.customTextTheme.FontColorStandard || '',
            FontColorItalic: preset.customTextTheme.FontColorItalic || '',
            FontColorBold: preset.customTextTheme.FontColorBold || '',
            FontColorItalicBold: preset.customTextTheme.FontColorItalicBold || '',
            FontColorQuote1: preset.customTextTheme.FontColorQuote1 || null,
            FontColorQuote2: preset.customTextTheme.FontColorQuote2 || null
        };
    }

    setDatabase(db);

    // Apply color scheme immediately
    applyColorScheme(preset.colorSchemeName, preset.colorScheme);

    // Apply text theme immediately
    const colorSchemeType = getColorSchemeType(preset.colorSchemeName, preset.colorScheme);
    applyTextTheme(preset.textTheme || 'standard', preset.customTextTheme, colorSchemeType);

    // Apply customCSS immediately to DOM (same way RisuAI does it)
    const customCSS = preset.customCSS || '';
    const existingStyle = document.querySelector('#customcss');
    if (existingStyle) {
        existingStyle.innerHTML = customCSS;
    } else {
        const styleElement = document.createElement('style');
        styleElement.id = 'customcss';
        styleElement.innerHTML = customCSS;
        document.body.appendChild(styleElement);
    }

    console.log(`Theme preset "${presetName}" loaded and applied successfully!`);
    return true;
}

/**
 * Rename a theme preset
 */
export function renameThemePreset(oldName: string, newName: string): boolean {
    const presets = getPresets();
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

    savePresets(presets);

    // Update character theme mappings
    const map = getCharacterThemeMap();
    let updated = false;
    for (const [charName, themeName] of Object.entries(map)) {
        if (themeName === oldName) {
            map[charName] = newName;
            updated = true;
        }
    }
    if (updated) {
        saveCharacterThemeMap(map);
    }

    // Update default theme if it was renamed
    if (getDefaultTheme() === oldName) {
        setDefaultTheme(newName);
    }

    console.log(`Theme preset renamed: "${oldName}" → "${newName}"`);
    return true;
}

/**
 * Delete a theme preset
 */
export function deleteThemePreset(presetName: string): boolean {
    const presets = getPresets();
    const filtered = presets.filter(p => p.name !== presetName);

    if (filtered.length === presets.length) {
        console.error(`Theme preset "${presetName}" not found`);
        return false;
    }

    savePresets(filtered);
    console.log(`Theme preset "${presetName}" deleted successfully`);
    return true;
}

/**
 * List all theme presets with metadata
 */
export function listThemePresets() {
    const presets = getPresets();
    return presets.map(p => ({
        name: p.name,
        timestamp: p.timestamp,
        hasCSS: !!p.customCSS,
        hasHTML: !!p.guiHTML,
        theme: p.theme,
        colorSchemeName: p.colorSchemeName,
        textTheme: p.textTheme,
        hasCustomColors: !!p.colorScheme,
        hasCustomTextTheme: !!p.customTextTheme
    }));
}

/**
 * Export a theme preset as JSON
 */
export function exportThemePreset(presetName: string): string | null {
    const presets = getPresets();
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
export function importThemePreset(presetJson: string): boolean {
    try {
        const preset = JSON.parse(presetJson);

        if (!preset.name || typeof preset.name !== 'string') {
            console.error('Invalid preset format: missing name');
            return false;
        }

        const presets = getPresets();
        const filtered = presets.filter(p => p.name !== preset.name);

        preset.timestamp = Date.now();
        filtered.push(preset);

        savePresets(filtered);
        console.log(`Theme preset "${preset.name}" imported successfully`);
        return true;
    } catch (e) {
        console.error('Failed to import theme preset:', e);
        return false;
    }
}

/**
 * Get character to theme mapping
 */
export function getCharacterThemeMap(): CharacterThemeMap {
    const mapJson = getArg(`${PLUGIN_NAME}::characterThemeMap`) as string;
    if (!mapJson || mapJson === '') {
        return {};
    }
    try {
        return JSON.parse(mapJson);
    } catch (e) {
        console.error('Failed to parse character theme map:', e);
        return {};
    }
}

/**
 * Save character to theme mapping
 */
export function saveCharacterThemeMap(map: CharacterThemeMap): void {
    setArg(`${PLUGIN_NAME}::characterThemeMap`, JSON.stringify(map));
}

/**
 * Add a character theme mapping
 */
export function addCharacterThemeMapping(charName: string, themeName: string): void {
    const map = getCharacterThemeMap();
    map[charName] = themeName;
    saveCharacterThemeMap(map);
    console.log(`Character "${charName}" mapped to theme "${themeName}"`);
}

/**
 * Remove a character theme mapping
 */
export function removeCharacterThemeMapping(charName: string): void {
    const map = getCharacterThemeMap();
    delete map[charName];
    saveCharacterThemeMap(map);
    console.log(`Character "${charName}" mapping removed`);
}

/**
 * Get default theme
 */
export function getDefaultTheme(): string {
    return (getArg(`${PLUGIN_NAME}::defaultTheme`) as string) || '';
}

/**
 * Set default theme
 */
export function setDefaultTheme(themeName: string): void {
    setArg(`${PLUGIN_NAME}::defaultTheme`, themeName);
}
