//@name themepreset
//@display-name Theme Preset Manager-fix2
//@arg presets string
//@arg shortcut string
//@arg characterThemeMap string
//@arg autoSwitch string
//@arg defaultTheme string
//@link https://github.com/kwaroran/RisuAI Documentation

// Theme Preset Manager Plugin for RisuAI
// Allows saving and loading custom HTML/CSS theme presets
// Floating window interface with keyboard shortcut (Ctrl+Shift+T)

// Preset storage format: JSON array of preset objects
// Each preset: { name: string, customCSS: string, guiHTML: string, timestamp: number }

let floatingWindow = null;
let floatingWindowOverlay = null;
let isDragging = false;
let dragOffset = { x: 0, y: 0 };

// Constants
const DEFAULT_SHORTCUT = 'Ctrl+Alt+X';
const CHAR_POLL_INTERVAL = 2000; // Character auto-switch polling interval (ms)
const DEBOUNCE_WAIT = 300; // DOM observer debounce wait (ms)
const FEEDBACK_TIMEOUT = 1500; // Success feedback display duration (ms)
const FOCUS_DELAY = 100; // Input focus delay (ms)
const INIT_DELAY = 1000; // Plugin initialization delay (ms)

function getShortcut() {
    const saved = getArg('themepreset::shortcut');
    return saved || DEFAULT_SHORTCUT;
}

function normalizeShortcut(shortcut) {
    // Normalize shortcut format: "Ctrl+Alt+X" regardless of input case/spacing
    const parts = shortcut.split('+').map(p => p.trim());
    const modifiers = [];
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

function setShortcut(shortcut) {
    const normalized = normalizeShortcut(shortcut);
    setArg('themepreset::shortcut', normalized);
}

function parseShortcut(shortcut) {
    const parts = shortcut.split('+').map(p => p.trim());
    const modifiers = ['Ctrl', 'Alt', 'Shift', 'Cmd', 'Meta'];

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

function isShortcutMatch(event, shortcut) {
    const parsed = parseShortcut(shortcut);

    // Check if the pressed key combination EXACTLY matches the shortcut
    // All modifiers must match exactly (not just "at least these modifiers")
    const modifiersMatch =
        event.ctrlKey === parsed.ctrl &&
        event.altKey === parsed.alt &&
        event.shiftKey === parsed.shift &&
        event.metaKey === parsed.meta;

    const keyMatch = event.key.toUpperCase() === parsed.key.toUpperCase();

    return modifiersMatch && keyMatch;
}

function formatShortcutDisplay(shortcut) {
    // Replace Ctrl with appropriate symbol for Mac
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    if (isMac) {
        return shortcut.replace('Ctrl', '⌘').replace('Alt', '⌥').replace('Shift', '⇧');
    }
    return shortcut;
}

function getPresets() {
    const presetsJson = getArg('themepreset::presets');
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

function savePresets(presets) {
    setArg('themepreset::presets', JSON.stringify(presets));
}

function saveCurrentTheme(presetName) {
    const db = getDatabase();
    const presets = getPresets();

    const newPreset = {
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

function loadThemePreset(presetName) {
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

    // Restore custom color scheme if it was saved
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
    // Get color scheme type for text theme
    let colorSchemeType = 'dark';
    if (preset.colorScheme && preset.colorScheme.type) {
        colorSchemeType = preset.colorScheme.type;
    } else if (preset.colorSchemeName && colorSchemes[preset.colorSchemeName]) {
        colorSchemeType = colorSchemes[preset.colorSchemeName].type;
    }

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

function renameThemePreset(oldName, newName) {
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
    preset.timestamp = Date.now(); // Update timestamp

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

function deleteThemePreset(presetName) {
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

function listThemePresets() {
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

function exportThemePreset(presetName) {
    const presets = getPresets();
    const preset = presets.find(p => p.name === presetName);

    if (!preset) {
        console.error(`Theme preset "${presetName}" not found`);
        return null;
    }

    return JSON.stringify(preset, null, 2);
}

function importThemePreset(presetJson) {
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

// ============================================
// Color Scheme Definitions (from colorscheme.ts)
// ============================================

const colorSchemes = {
    "default": {
        bgcolor: "#282a36",
        darkbg: "#21222c",
        borderc: "#6272a4",
        selected: "#44475a",
        draculared: "#ff5555",
        textcolor: "#f8f8f2",
        textcolor2: "#64748b",
        darkBorderc: "#4b5563",
        darkbutton: "#374151",
        type: 'dark'
    },
    "light": {
        bgcolor: "#ffffff",
        darkbg: "#f0f0f0",
        borderc: "#0f172a",
        selected: "#e0e0e0",
        draculared: "#ff5555",
        textcolor: "#0f172a",
        textcolor2: "#64748b",
        darkBorderc: "#d1d5db",
        darkbutton: "#e5e7eb",
        type: 'light'
    },
    "cherry": {
        bgcolor: "#450a0a",
        darkbg: "#7f1d1d",
        borderc: "#ea580c",
        selected: "#d97706",
        draculared: "#ff5555",
        textcolor: "#f8f8f2",
        textcolor2: "#fca5a5",
        darkBorderc: "#92400e",
        darkbutton: "#b45309",
        type: 'dark'
    },
    "galaxy": {
        bgcolor: "#0f172a",
        darkbg: "#1f2a48",
        borderc: "#8be9fd",
        selected: "#457b9d",
        draculared: "#ff5555",
        textcolor: "#f8f8f2",
        textcolor2: "#8be9fd",
        darkBorderc: "#457b9d",
        darkbutton: "#1f2a48",
        type: 'dark'
    },
    "nature": {
        bgcolor: "#1b4332",
        darkbg: "#2d6a4f",
        borderc: "#a8dadc",
        selected: "#4d908e",
        draculared: "#ff5555",
        textcolor: "#f8f8f2",
        textcolor2: "#4d908e",
        darkBorderc: "#457b9d",
        darkbutton: "#2d6a4f",
        type: 'dark'
    },
    "realblack": {
        bgcolor: "#000000",
        darkbg: "#000000",
        borderc: "#6272a4",
        selected: "#44475a",
        draculared: "#ff5555",
        textcolor: "#f8f8f2",
        textcolor2: "#64748b",
        darkBorderc: "#4b5563",
        darkbutton: "#374151",
        type: 'dark'
    },
    "lite": {
        bgcolor: "#1f2937",
        darkbg: "#1C2533",
        borderc: "#475569",
        selected: "#475569",
        draculared: "#ff5555",
        textcolor: "#f8f8f2",
        textcolor2: "#64748b",
        darkBorderc: "#030712",
        darkbutton: "#374151",
        type: 'dark'
    }
};

function applyColorScheme(colorSchemeName, customColorScheme) {
    let colorScheme;

    if (colorSchemeName === 'custom' && customColorScheme) {
        // Use custom color scheme
        colorScheme = customColorScheme;
    } else if (colorSchemes[colorSchemeName]) {
        // Use preset color scheme
        colorScheme = colorSchemes[colorSchemeName];
    } else {
        // Fallback to default
        colorScheme = colorSchemes.default;
    }

    // Apply CSS variables
    document.documentElement.style.setProperty("--risu-theme-bgcolor", colorScheme.bgcolor);
    document.documentElement.style.setProperty("--risu-theme-darkbg", colorScheme.darkbg);
    document.documentElement.style.setProperty("--risu-theme-borderc", colorScheme.borderc);
    document.documentElement.style.setProperty("--risu-theme-selected", colorScheme.selected);
    document.documentElement.style.setProperty("--risu-theme-draculared", colorScheme.draculared);
    document.documentElement.style.setProperty("--risu-theme-textcolor", colorScheme.textcolor);
    document.documentElement.style.setProperty("--risu-theme-textcolor2", colorScheme.textcolor2);
    document.documentElement.style.setProperty("--risu-theme-darkborderc", colorScheme.darkBorderc);
    document.documentElement.style.setProperty("--risu-theme-darkbutton", colorScheme.darkbutton);
}

function applyTextTheme(textTheme, customTextTheme, colorSchemeType) {
    const root = document.documentElement;

    if (textTheme === 'custom' && customTextTheme) {
        root.style.setProperty('--FontColorStandard', customTextTheme.FontColorStandard);
        root.style.setProperty('--FontColorItalic', customTextTheme.FontColorItalic);
        root.style.setProperty('--FontColorBold', customTextTheme.FontColorBold);
        root.style.setProperty('--FontColorItalicBold', customTextTheme.FontColorItalicBold);
        root.style.setProperty('--FontColorQuote1', customTextTheme.FontColorQuote1 ?? '#8BE9FD');
        root.style.setProperty('--FontColorQuote2', customTextTheme.FontColorQuote2 ?? '#FFB86C');
    } else if (textTheme === 'highcontrast') {
        if (colorSchemeType === 'dark') {
            root.style.setProperty('--FontColorStandard', '#f8f8f2');
            root.style.setProperty('--FontColorItalic', '#F1FA8C');
            root.style.setProperty('--FontColorBold', '#8BE9FD');
            root.style.setProperty('--FontColorItalicBold', '#FFB86C');
            root.style.setProperty('--FontColorQuote1', '#8BE9FD');
            root.style.setProperty('--FontColorQuote2', '#FFB86C');
        } else {
            root.style.setProperty('--FontColorStandard', '#0f172a');
            root.style.setProperty('--FontColorItalic', '#F1FA8C');
            root.style.setProperty('--FontColorBold', '#8BE9FD');
            root.style.setProperty('--FontColorItalicBold', '#FFB86C');
            root.style.setProperty('--FontColorQuote1', '#8BE9FD');
            root.style.setProperty('--FontColorQuote2', '#FFB86C');
        }
    } else {
        // standard theme
        if (colorSchemeType === 'dark') {
            root.style.setProperty('--FontColorStandard', '#fafafa');
            root.style.setProperty('--FontColorItalic', '#8C8D93');
            root.style.setProperty('--FontColorBold', '#fafafa');
            root.style.setProperty('--FontColorItalicBold', '#8C8D93');
            root.style.setProperty('--FontColorQuote1', '#8BE9FD');
            root.style.setProperty('--FontColorQuote2', '#FFB86C');
        } else {
            root.style.setProperty('--FontColorStandard', '#0f172a');
            root.style.setProperty('--FontColorItalic', '#8C8D93');
            root.style.setProperty('--FontColorBold', '#0f172a');
            root.style.setProperty('--FontColorItalicBold', '#8C8D93');
            root.style.setProperty('--FontColorQuote1', '#8BE9FD');
            root.style.setProperty('--FontColorQuote2', '#FFB86C');
        }
    }
}

// ============================================
// Character Auto-Switch Functions
// ============================================

function getCharacterThemeMap() {
    const json = getArg('themepreset::characterThemeMap');
    if (!json || json === '') {
        return {};
    }
    try {
        return JSON.parse(json);
    } catch (e) {
        console.error('Failed to parse character theme map:', e);
        return {};
    }
}

function saveCharacterThemeMap(map) {
    setArg('themepreset::characterThemeMap', JSON.stringify(map));
}

function addCharacterThemeMapping(charName, themeName) {
    const map = getCharacterThemeMap();
    map[charName] = themeName;
    saveCharacterThemeMap(map);
    console.log(`Added mapping: ${charName} → ${themeName}`);
}

function removeCharacterThemeMapping(charName) {
    const map = getCharacterThemeMap();
    delete map[charName];
    saveCharacterThemeMap(map);
    console.log(`Removed mapping for: ${charName}`);
}

function getAutoSwitchEnabled() {
    const value = getArg('themepreset::autoSwitch');
    return value === 'true' || value === true;
}

function setAutoSwitchEnabled(enabled) {
    setArg('themepreset::autoSwitch', enabled ? 'true' : 'false');
}

function getDefaultTheme() {
    return getArg('themepreset::defaultTheme') || '';
}

function setDefaultTheme(themeName) {
    setArg('themepreset::defaultTheme', themeName);
    console.log(`Set default theme: ${themeName}`);
}

function checkAndSwitchTheme() {
    if (!getAutoSwitchEnabled()) {
        return;
    }

    try {
        const char = getChar();
        if (!char || !char.name) {
            return;
        }

        const map = getCharacterThemeMap();
        const themeName = map[char.name];

        if (themeName) {
            // Character has a specific theme mapping
            console.log(`🎨 Auto-switching to theme: ${themeName} for character: ${char.name}`);
            loadThemePreset(themeName);
        } else {
            // No mapping, use default theme if set
            const defaultTheme = getDefaultTheme();
            if (defaultTheme) {
                console.log(`🎨 Auto-switching to default theme: ${defaultTheme} (no mapping for ${char.name})`);
                loadThemePreset(defaultTheme);
            }
        }
    } catch (e) {
        console.error('Failed to check and switch theme:', e);
    }
}

// Generic button success feedback helper
function showButtonFeedback(button, successText, originalText, successColor = 'var(--draculared, #50fa7b)') {
    const origText = originalText || button.textContent;
    const origBg = button.style.background;

    button.textContent = successText;
    button.style.background = successColor;

    setTimeout(() => {
        button.textContent = origText;
        button.style.background = origBg;
    }, FEEDBACK_TIMEOUT);
}

// Custom modal dialog
function showModal(options) {
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

    const buttonContainer = modal.querySelector('div:last-child');

    buttons.forEach(btn => {
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
            const inputValue = input ? modal.querySelector('#modal-input').value : null;
            overlay.remove();
            if (btn.onClick) btn.onClick(inputValue);
        };
        buttonContainer.appendChild(button);
    });

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Focus on input if present
    if (input) {
        const inputEl = modal.querySelector('#modal-input');
        setTimeout(() => inputEl.focus(), FOCUS_DELAY);

        // Allow Enter to submit
        inputEl.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const primaryBtn = buttons.find(b => b.primary);
                if (primaryBtn) {
                    overlay.remove();
                    primaryBtn.onClick(inputEl.value);
                }
            }
        });
    }

    // Add CSS animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes slideIn {
            from { transform: translateY(-20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.remove();
        }
    });
}

function createFloatingWindow() {
    if (floatingWindow) {
        return floatingWindow;
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
    floatingWindowOverlay = overlay;

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
            " onmouseover="this.style.background='var(--risu-theme-darkbutton, #444)'; this.style.color='var(--risu-theme-textcolor, #fff)'" onmouseout="this.style.background='transparent'; this.style.color='var(--risu-theme-textcolor2, #888)'">
                ×
            </button>
        </div>

        <div style="padding: 20px; overflow-y: auto; flex: 1;">
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
                " onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 12px rgba(74, 158, 255, 0.3)'" onmouseout="this.style.transform=''; this.style.boxShadow=''">
                    💾 Save Current
                </button>
            </div>

            <div style="display: grid; grid-template-columns: 1fr; gap: 10px; margin-bottom: 12px;">
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
                " onmouseover="this.style.background='var(--risu-theme-selected, #444)'" onmouseout="this.style.background='var(--risu-theme-darkbutton, #333)'" title="Import a single theme preset file">
                    📂 Import Theme File
                </button>
            </div>

            <div style="
                border-top: 1px solid var(--risu-theme-darkborderc, #333);
                border-bottom: 1px solid var(--risu-theme-darkborderc, #333);
                padding: 12px 0;
                margin-bottom: 20px;
            ">
                <div style="color: var(--risu-theme-textcolor2, #888); font-size: 0.8em; margin-bottom: 8px; text-align: center;">Complete Backup (Themes + Character Mappings)</div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <button id="export-all-btn" style="
                        padding: 12px 20px;
                        border-radius: 8px;
                        border: 2px solid var(--risu-theme-selected, #4a9eff);
                        background: var(--risu-theme-darkbutton, #333);
                        color: var(--risu-theme-textcolor, #fff);
                        cursor: pointer;
                        font-weight: 600;
                        font-size: 1em;
                        transition: all 0.2s;
                    " onmouseover="this.style.background='var(--risu-theme-selected, #4a9eff)'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(74, 158, 255, 0.3)'" onmouseout="this.style.background='var(--risu-theme-darkbutton, #333)'; this.style.transform=''; this.style.boxShadow=''" title="Export all themes + character mappings">
                        📦 Export Backup
                    </button>
                    <button id="import-all-btn" style="
                        padding: 12px 20px;
                        border-radius: 8px;
                        border: 2px solid var(--risu-theme-selected, #4a9eff);
                        background: var(--risu-theme-darkbutton, #333);
                        color: var(--risu-theme-textcolor, #fff);
                        cursor: pointer;
                        font-weight: 600;
                        font-size: 1em;
                        transition: all 0.2s;
                    " onmouseover="this.style.background='var(--risu-theme-selected, #4a9eff)'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(74, 158, 255, 0.3)'" onmouseout="this.style.background='var(--risu-theme-darkbutton, #333)'; this.style.transform=''; this.style.boxShadow=''" title="Import all themes + character mappings">
                        📥 Import Backup
                    </button>
                </div>
            </div>

            <input type="file" id="import-file-input" accept=".json" style="display: none;" />

            <div id="preset-list" style="display: flex; flex-direction: column; gap: 10px; max-height: 400px; overflow-y: auto; overflow-x: hidden;">
            </div>

            <!-- Character Auto-Switch Section -->
            <div style="border-top: 2px solid var(--risu-theme-darkborderc, #333); margin: 20px 0 15px 0; padding-top: 15px;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px;">
                    <h4 style="margin: 0; color: var(--risu-theme-textcolor, #fff); font-size: 1em; font-weight: 600;">🔄 Character Auto-Switch</h4>
                    <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; user-select: none;">
                        <input type="checkbox" id="auto-switch-toggle" style="cursor: pointer; width: 16px; height: 16px;">
                        <span style="color: var(--risu-theme-textcolor2, #ccc); font-size: 0.9em;">Enable</span>
                    </label>
                </div>

                <!-- Default Theme Display -->
                <div id="default-theme-container" style="
                    padding: 10px 12px;
                    background: var(--risu-theme-bgcolor, #2a2a2a);
                    border-radius: 6px;
                    border: 2px solid var(--risu-theme-selected, #4a9eff);
                    margin-bottom: 15px;
                    display: none;
                    align-items: center;
                    justify-content: space-between;
                    gap: 8px;
                ">
                    <div style="flex: 1; min-width: 0;">
                        <div style="color: var(--risu-theme-textcolor2, #888); font-size: 0.75em; margin-bottom: 2px;">Default Theme</div>
                        <div id="default-theme-display" style="color: var(--risu-theme-textcolor, #fff); font-size: 0.9em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        </div>
                    </div>
                    <button id="remove-default-btn" style="
                        padding: 4px 8px;
                        border-radius: 4px;
                        border: none;
                        background: var(--risu-theme-draculared, #ff5555);
                        color: var(--risu-theme-textcolor, #fff);
                        cursor: pointer;
                        font-size: 0.75em;
                        transition: all 0.2s;
                    " onmouseover="this.style.background='#ff3333'; this.style.transform='scale(1.05)'" onmouseout="this.style.background='var(--risu-theme-draculared, #ff5555)'; this.style.transform=''">
                        🗑️
                    </button>
                </div>

                <div id="character-mapping-list" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 15px; max-height: 200px; overflow-y: auto;">
                </div>

                <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                    <input type="text" id="char-name-input" placeholder="Current character" readonly
                           style="flex: 1; min-width: 120px; padding: 8px 10px; border-radius: 6px; border: 1px solid var(--risu-theme-darkborderc, #333); background: var(--risu-theme-bgcolor, #2a2a2a); color: var(--risu-theme-textcolor, #fff); font-size: 0.9em;">
                    <select id="theme-select" style="flex: 1; min-width: 120px; padding: 8px 10px; border-radius: 6px; border: 1px solid var(--risu-theme-darkborderc, #333); background: var(--risu-theme-bgcolor, #2a2a2a); color: var(--risu-theme-textcolor, #fff); font-size: 0.9em; cursor: pointer;">
                        <option value="">Select theme...</option>
                    </select>
                    <button id="add-mapping-btn" style="
                        padding: 8px 14px;
                        border-radius: 6px;
                        border: none;
                        background: var(--risu-theme-selected, #4a9eff);
                        color: var(--risu-theme-textcolor, #fff);
                        cursor: pointer;
                        font-weight: 500;
                        font-size: 0.9em;
                        transition: all 0.2s;
                    " onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform=''">
                        ➕ Add
                    </button>
                </div>
            </div>
        </div>

        <div style="
            padding: 12px 20px;
            background: var(--risu-theme-bgcolor, #2a2a2a);
            border-top: 1px solid var(--risu-theme-darkborderc, #333);
            border-radius: 0 0 10px 10px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 10px;
        ">
            <span id="shortcut-display" style="color: var(--risu-theme-textcolor2, #888); font-size: 0.85em;">
                Press <kbd style="padding: 2px 6px; background: var(--risu-theme-darkbutton, #444); border-radius: 3px; font-family: monospace;">${formatShortcutDisplay(getShortcut())}</kbd> to toggle
            </span>
            <button id="change-shortcut-btn" style="
                padding: 4px 10px;
                border-radius: 4px;
                border: 1px solid var(--risu-theme-darkborderc, #333);
                background: var(--risu-theme-darkbutton, #333);
                color: var(--risu-theme-textcolor2, #aaa);
                cursor: pointer;
                font-size: 0.8em;
                transition: all 0.2s;
            " onmouseover="this.style.background='var(--risu-theme-selected, #444)'; this.style.color='var(--risu-theme-textcolor, #fff)'" onmouseout="this.style.background='var(--risu-theme-darkbutton, #333)'; this.style.color='var(--risu-theme-textcolor2, #aaa)'">
                Change Shortcut
            </button>
        </div>
    `;

    document.body.appendChild(container);
    floatingWindow = container;

    // Setup event listeners
    setupFloatingWindowEvents();

    return container;
}

function setupFloatingWindowEvents() {
    const header = document.getElementById('preset-window-header');
    const closeBtn = document.getElementById('close-preset-window');
    const saveBtn = document.getElementById('save-preset-btn');
    const nameInput = document.getElementById('preset-name-input');
    const importFileBtn = document.getElementById('import-preset-file-btn');
    const importAllBtn = document.getElementById('import-all-btn');
    const exportAllBtn = document.getElementById('export-all-btn');
    const changeShortcutBtn = document.getElementById('change-shortcut-btn');
    const fileInput = document.getElementById('import-file-input');

    // Dragging functionality
    header.addEventListener('mousedown', (e) => {
        if (e.target.id === 'close-preset-window') return;
        isDragging = true;
        const rect = floatingWindow.getBoundingClientRect();
        dragOffset.x = e.clientX - rect.left;
        dragOffset.y = e.clientY - rect.top;
        floatingWindow.style.transform = 'none';
        floatingWindow.style.transition = 'none';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        floatingWindow.style.left = (e.clientX - dragOffset.x) + 'px';
        floatingWindow.style.top = (e.clientY - dragOffset.y) + 'px';
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            floatingWindow.style.transition = '';
        }
    });

    // Close button
    closeBtn.addEventListener('click', () => {
        toggleFloatingWindow();
    });

    // Helper function for save success feedback
    function showSaveSuccess() {
        saveBtn.textContent = '✓ Saved!';
        saveBtn.style.background = 'var(--risu-theme-draculared, #50fa7b)';
        setTimeout(() => {
            saveBtn.textContent = '💾 Save Current';
            saveBtn.style.background = 'var(--risu-theme-selected, #4a9eff)';
        }, FEEDBACK_TIMEOUT);
    }

    function performSave(name) {
        saveCurrentTheme(name);
        nameInput.value = '';
        updatePresetList();
        updateThemeSelectDropdown();
        showSaveSuccess();
    }

    // Save button
    saveBtn.addEventListener('click', () => {
        const name = nameInput.value.trim();
        if (!name) {
            showModal({
                title: '⚠️ Warning',
                content: 'Please enter a preset name',
                buttons: [
                    { text: 'OK', primary: true, onClick: () => {} }
                ]
            });
            return;
        }

        // Check if preset with same name already exists
        const presets = getPresets();
        const existing = presets.find(p => p.name === name);

        if (existing) {
            // Show overwrite confirmation
            showModal({
                title: '⚠️ Overwrite Confirmation',
                content: `A theme preset named "<strong>${escapeHtml(name)}</strong>" already exists.<br><br>Do you want to overwrite it?`,
                buttons: [
                    {
                        text: 'Cancel',
                        primary: false,
                        onClick: () => {}
                    },
                    {
                        text: 'Overwrite',
                        primary: true,
                        onClick: () => performSave(name)
                    }
                ]
            });
        } else {
            // No conflict, save directly
            performSave(name);
        }
    });

    // Enter key to save
    nameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            saveBtn.click();
        }
    });

    // Import file button
    if (importFileBtn) {
        importFileBtn.addEventListener('click', () => {
            fileInput.click();
        });
    }

    // File input handler
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const json = event.target.result;
                    if (importThemePreset(json)) {
                        showModal({
                            title: '✓ Success',
                            content: 'Theme preset imported successfully!',
                            buttons: [
                                { text: 'OK', primary: true, onClick: () => {} }
                            ]
                        });
                        updatePresetList();
                        updateThemeSelectDropdown(); // Update dropdown after import
                    } else {
                        showModal({
                            title: '❌ Error',
                            content: 'Failed to import theme preset. Check console for errors.',
                            buttons: [
                                { text: 'OK', primary: true, onClick: () => {} }
                            ]
                        });
                    }
                } catch (error) {
                    showModal({
                        title: '❌ Error',
                        content: `Failed to read file: ${error.message}`,
                        buttons: [
                            { text: 'OK', primary: true, onClick: () => {} }
                        ]
                    });
                }
                fileInput.value = '';
            };
            reader.readAsText(file);
        });
    }

    // Export all button
    if (exportAllBtn) {
        exportAllBtn.addEventListener('click', () => {
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
    }

    // Import all button
    if (importAllBtn) {
        importAllBtn.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const data = JSON.parse(event.target.result);

                        // Check if this is the new format (with version) or old format (just array of presets)
                        let backupData;
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
                                        updateThemeSelectDropdown();
                                        updateCharacterMappingList();
                                        updateDefaultThemeDisplay();

                                        const autoSwitchToggle = document.getElementById('auto-switch-toggle');
                                        if (autoSwitchToggle) {
                                            autoSwitchToggle.checked = autoSwitchEnabled;
                                            updateAutoSwitchUI(autoSwitchEnabled);
                                        }

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

                                        // Set default theme and auto-switch if not already set
                                        const currentDefault = getDefaultTheme();
                                        if (!currentDefault && defaultTheme) {
                                            setDefaultTheme(defaultTheme);
                                        }

                                        updatePresetList();
                                        updateThemeSelectDropdown();
                                        updateCharacterMappingList();
                                        updateDefaultThemeDisplay();

                                        // Update auto-switch UI to reflect current state
                                        const autoSwitchToggle = document.getElementById('auto-switch-toggle');
                                        if (autoSwitchToggle) {
                                            const currentAutoSwitch = getAutoSwitchEnabled();
                                            autoSwitchToggle.checked = currentAutoSwitch;
                                            updateAutoSwitchUI(currentAutoSwitch);
                                        }

                                        showModal({
                                            title: '✓ Success',
                                            content: `Merged theme data:<br>• ${presets.length} preset(s) imported (${addedPresets} new)<br>• ${charMappingCount} character mapping(s) merged`,
                                            buttons: [
                                                { text: 'OK', primary: true, onClick: () => {} }
                                            ]
                                        });
                                    }
                                },
                                {
                                    text: 'Cancel',
                                    primary: false,
                                    onClick: () => {}
                                }
                            ]
                        });
                    } catch (error) {
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
    }

    // Block all shortcuts except Escape and toggle shortcut when floating window is open
    document.addEventListener('keydown', (e) => {
        if (floatingWindow.style.display === 'flex') {
            // Allow Escape key to close the window
            if (e.key === 'Escape') {
                toggleFloatingWindow();
                e.preventDefault();
                e.stopPropagation();
                return;
            }

            // Allow the toggle shortcut (will be handled by setupKeyboardShortcut)
            const shortcut = getShortcut();
            if (isShortcutMatch(e, shortcut)) {
                return;
            }

            // Block all other keyboard shortcuts from reaching RisuAI
            if (e.ctrlKey || e.altKey || e.metaKey || (e.shiftKey && e.key !== 'Shift')) {
                e.preventDefault();
                e.stopPropagation();
            }
        }
    }, true); // Use capture phase to intercept before RisuAI handlers

    // Change shortcut button
    if (changeShortcutBtn) {
        changeShortcutBtn.addEventListener('click', () => {
            const currentShortcut = getShortcut();

            showModal({
                title: '⌨️ Change Keyboard Shortcut',
                content: `Enter new shortcut combination (e.g., Ctrl+Alt+X, Ctrl+Shift+P)<br><br>Current: <strong>${currentShortcut}</strong>`,
                input: {
                    value: currentShortcut,
                    placeholder: 'e.g., Ctrl+Alt+X'
                },
                buttons: [
                    {
                        text: 'Cancel',
                        primary: false,
                        onClick: () => {}
                    },
                    {
                        text: 'Save',
                        primary: true,
                        onClick: (newShortcut) => {
                            if (!newShortcut || newShortcut === currentShortcut) return;

                            // Validate shortcut format
                            const parts = newShortcut.split('+').map(p => p.trim());
                            if (parts.length < 2) {
                                showModal({
                                    title: '❌ Invalid Format',
                                    content: 'Shortcut must have at least one modifier key (Ctrl, Alt, Shift, or Cmd) plus a key.<br>Example: "Ctrl+Alt+X"',
                                    buttons: [
                                        { text: 'OK', primary: true, onClick: () => {} }
                                    ]
                                });
                                return;
                            }

                            // Validate that we have at least one valid modifier
                            const validModifiers = ['Ctrl', 'Alt', 'Shift', 'Cmd', 'Meta'];
                            const modifiers = parts.slice(0, -1);
                            const hasValidModifier = modifiers.some(mod => validModifiers.includes(mod));

                            if (!hasValidModifier) {
                                showModal({
                                    title: '❌ Invalid Modifier',
                                    content: 'Shortcut must include at least one modifier key: Ctrl, Alt, Shift, or Cmd<br>Example: "Ctrl+Alt+X"',
                                    buttons: [
                                        { text: 'OK', primary: true, onClick: () => {} }
                                    ]
                                });
                                return;
                            }

                            const lastPart = parts[parts.length - 1];
                            if (lastPart.length !== 1 && !validModifiers.includes(lastPart)) {
                                showModal({
                                    title: '❌ Invalid Key',
                                    content: 'The final key must be a single character (e.g., X, P, T)',
                                    buttons: [
                                        { text: 'OK', primary: true, onClick: () => {} }
                                    ]
                                });
                                return;
                            }

                            setShortcut(newShortcut);
                            const normalized = normalizeShortcut(newShortcut);
                            updateShortcutDisplay();
                            showModal({
                                title: '✓ Success',
                                content: `Shortcut changed to: <strong>${normalized}</strong><br><br>The new shortcut will work immediately!`,
                                buttons: [
                                    { text: 'OK', primary: true, onClick: () => {} }
                                ]
                            });
                        }
                    }
                ]
            });
        });
    }

    // Character Auto-Switch Event Handlers
    const autoSwitchToggle = document.getElementById('auto-switch-toggle');
    const charNameInput = document.getElementById('char-name-input');
    const themeSelect = document.getElementById('theme-select');
    const addMappingBtn = document.getElementById('add-mapping-btn');

    function updateAutoSwitchUI(enabled) {
        // Enable/disable character mapping UI (not default theme)
        if (charNameInput) charNameInput.disabled = !enabled;
        if (themeSelect) themeSelect.disabled = !enabled;
        if (addMappingBtn) addMappingBtn.disabled = !enabled;

        // Update opacity for character mapping input container
        const inputContainer = document.querySelector('#char-name-input')?.parentElement;
        if (inputContainer) {
            inputContainer.style.opacity = enabled ? '1' : '0.5';
            inputContainer.style.pointerEvents = enabled ? 'auto' : 'none';
        }

        // Update character mapping list opacity (keep visible but indicate it's not in use)
        const mappingList = document.getElementById('character-mapping-list');
        if (mappingList && mappingList.parentElement) {
            mappingList.parentElement.style.opacity = enabled ? '1' : '0.5';
        }

        // Update character name input
        if (enabled) {
            updateCurrentCharacterName();
        } else {
            if (charNameInput) {
                charNameInput.value = '';
                charNameInput.placeholder = 'Character mapping disabled';
            }
        }
    }

    if (autoSwitchToggle) {
        // Set initial state
        autoSwitchToggle.checked = getAutoSwitchEnabled();
        updateAutoSwitchUI(autoSwitchToggle.checked);

        autoSwitchToggle.addEventListener('change', (e) => {
            setAutoSwitchEnabled(e.target.checked);
            updateAutoSwitchUI(e.target.checked);
            console.log(`🎨 Theme Preset: Auto-switch ${e.target.checked ? 'enabled' : 'disabled'}`);

            // When disabling auto-switch, apply default theme immediately
            if (!e.target.checked) {
                const defaultTheme = getDefaultTheme();
                if (defaultTheme) {
                    console.log(`🎨 Auto-switch disabled, applying default theme: ${defaultTheme}`);
                    loadThemePreset(defaultTheme);
                } else {
                    console.log(`🎨 Auto-switch disabled, but no default theme set`);
                }
            } else {
                // When enabling auto-switch, apply appropriate theme for current character
                try {
                    const char = getChar();
                    if (char && char.name) {
                        const map = getCharacterThemeMap();
                        const themeName = map[char.name];

                        if (themeName) {
                            console.log(`🎨 Auto-switch enabled, applying mapped theme: ${themeName} for ${char.name}`);
                            loadThemePreset(themeName);
                        } else {
                            const defaultTheme = getDefaultTheme();
                            if (defaultTheme) {
                                console.log(`🎨 Auto-switch enabled, applying default theme: ${defaultTheme}`);
                                loadThemePreset(defaultTheme);
                            }
                        }
                    }
                } catch (err) {
                    console.log('🎨 Not in character context');
                }
            }
        });
    }

    if (addMappingBtn) {
        addMappingBtn.addEventListener('click', () => {
            const charName = charNameInput.value.trim();
            const themeName = themeSelect.value;

            if (!charName) {
                showModal({
                    title: '⚠️ Warning',
                    content: 'No character selected. Please open a character first.',
                    buttons: [
                        { text: 'OK', primary: true, onClick: () => {} }
                    ]
                });
                return;
            }

            if (!themeName) {
                showModal({
                    title: '⚠️ Warning',
                    content: 'Please select a theme',
                    buttons: [
                        { text: 'OK', primary: true, onClick: () => {} }
                    ]
                });
                return;
            }

            addCharacterThemeMapping(charName, themeName);
            updateCharacterMappingList();
            themeSelect.value = '';

            // Apply immediately to current character (only if auto-switch is enabled)
            if (getAutoSwitchEnabled()) {
                try {
                    const char = getChar();
                    if (char && char.name === charName) {
                        console.log(`🎨 Applying mapped theme immediately: ${themeName} for ${charName}`);
                        loadThemePreset(themeName);
                    }
                } catch (err) {
                    console.error('Failed to apply theme immediately:', err);
                }
            }

            // Show success feedback
            showButtonFeedback(addMappingBtn, '✓ Added!', '➕ Add');
        });
    }

    // Remove default theme button
    const removeDefaultBtn = document.getElementById('remove-default-btn');
    if (removeDefaultBtn) {
        removeDefaultBtn.addEventListener('click', () => {
            showModal({
                title: '🗑️ Remove Default Theme',
                content: 'Remove the default theme? Characters without specific mappings will not auto-switch.',
                buttons: [
                    {
                        text: 'Cancel',
                        primary: false,
                        onClick: () => {}
                    },
                    {
                        text: 'Remove',
                        primary: true,
                        onClick: () => {
                            setDefaultTheme('');
                            updateDefaultThemeDisplay();
                        }
                    }
                ]
            });
        });
    }
}

function updateCharacterMappingList() {
    const listContainer = document.getElementById('character-mapping-list');
    if (!listContainer) return;

    const map = getCharacterThemeMap();
    const entries = Object.entries(map);

    if (entries.length === 0) {
        listContainer.innerHTML = `
            <div style="text-align: center; padding: 20px; color: var(--risu-theme-textcolor2, #888); font-size: 0.85em;">
                No character mappings yet
            </div>
        `;
        return;
    }

    listContainer.innerHTML = entries.map(([charName, themeName]) => `
        <div style="
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 12px;
            background: var(--risu-theme-bgcolor, #2a2a2a);
            border-radius: 6px;
            border: 1px solid var(--risu-theme-darkborderc, #333);
        ">
            <div style="flex: 1; min-width: 0;">
                <div style="color: var(--risu-theme-textcolor, #fff); font-size: 0.9em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${escapeHtml(charName)}
                </div>
                <div style="color: var(--risu-theme-textcolor2, #888); font-size: 0.75em; margin-top: 2px;">
                    → ${escapeHtml(themeName)}
                </div>
            </div>
            <button class="remove-mapping-btn" data-char="${escapeHtml(charName)}"
                    style="padding: 4px 8px; border-radius: 4px; border: none; background: var(--risu-theme-draculared, #ff5555); color: var(--risu-theme-textcolor, #fff); cursor: pointer; font-size: 0.75em; transition: all 0.2s;"
                    onmouseover="this.style.background='#ff3333'; this.style.transform='scale(1.05)'" onmouseout="this.style.background='var(--risu-theme-draculared, #ff5555)'; this.style.transform=''">
                🗑️
            </button>
        </div>
    `).join('');

    // Attach event listeners to remove buttons
    listContainer.querySelectorAll('.remove-mapping-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const charName = e.target.dataset.char;
            showModal({
                title: '🗑️ Remove Mapping',
                content: `Remove theme mapping for "<strong>${escapeHtml(charName)}</strong>"?`,
                buttons: [
                    {
                        text: 'Cancel',
                        primary: false,
                        onClick: () => {}
                    },
                    {
                        text: 'Remove',
                        primary: true,
                        onClick: () => {
                            removeCharacterThemeMapping(charName);
                            updateCharacterMappingList();
                        }
                    }
                ]
            });
        });
    });
}

function updateThemeSelectDropdown() {
    const themeSelect = document.getElementById('theme-select');
    if (!themeSelect) return;

    const presets = getPresets();

    // Clear existing options except the first one
    themeSelect.innerHTML = '<option value="">Select theme...</option>';

    // Add all available presets
    presets.forEach(preset => {
        const option = document.createElement('option');
        option.value = preset.name;
        option.textContent = preset.name;
        themeSelect.appendChild(option);
    });
}

function updateCurrentCharacterName() {
    const charNameInput = document.getElementById('char-name-input');
    if (!charNameInput) return;

    try {
        const char = getChar();
        if (char && char.name) {
            charNameInput.value = char.name;
        } else {
            charNameInput.value = '';
            charNameInput.placeholder = 'No character selected';
        }
    } catch (e) {
        charNameInput.value = '';
        charNameInput.placeholder = 'No character selected';
    }
}

function updateDefaultThemeDisplay() {
    const container = document.getElementById('default-theme-container');
    const display = document.getElementById('default-theme-display');
    if (!container || !display) return;

    const defaultTheme = getDefaultTheme();
    if (defaultTheme) {
        container.style.display = 'flex';
        display.textContent = defaultTheme;
    } else {
        container.style.display = 'none';
    }
}

function updateShortcutDisplay() {
    const display = document.getElementById('shortcut-display');
    if (display) {
        const shortcut = getShortcut();
        display.innerHTML = `Press <kbd style="padding: 2px 6px; background: var(--risu-theme-darkbutton, #444); border-radius: 3px; font-family: monospace;">${formatShortcutDisplay(shortcut)}</kbd> to toggle`;
    }
}

function updatePresetList() {
    const listContainer = document.getElementById('preset-list');
    if (!listContainer) return;

    const presets = listThemePresets();

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

    listContainer.innerHTML = presets.map(preset => {
        const date = new Date(preset.timestamp).toLocaleDateString();
        return `
        <div style="
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 12px 14px;
            background: var(--risu-theme-bgcolor, #2a2a2a);
            border-radius: 8px;
            border: 2px solid var(--risu-theme-darkborderc, #333);
            transition: border-color 0.2s, box-shadow 0.2s;
        " onmouseover="this.style.borderColor='var(--risu-theme-selected, #4a9eff)'; this.style.boxShadow='0 2px 8px rgba(74, 158, 255, 0.2)'" onmouseout="this.style.borderColor='var(--risu-theme-darkborderc, #333)'; this.style.boxShadow='none'">
            <div style="flex: 1; min-width: 0;">
                <div style="color: var(--risu-theme-textcolor, #fff); font-weight: 500; font-size: 0.95em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${escapeHtml(preset.name)}
                </div>
                <div style="color: var(--risu-theme-textcolor2, #888); font-size: 0.8em; margin-top: 2px;">
                    ${date} • ${preset.theme || 'custom'}${preset.hasCustomColors ? ' • 🎨 Custom Colors' : ''}${preset.hasCustomTextTheme ? ' • 📝 Text Theme' : ''}
                </div>
            </div>
            <button class="load-preset-btn" data-name="${escapeHtml(preset.name)}"
                    style="padding: 6px 12px; border-radius: 5px; border: none; background: var(--risu-theme-selected, #50fa7b); color: var(--risu-theme-textcolor, #fff); cursor: pointer; font-size: 0.85em; font-weight: 500; white-space: nowrap; transition: all 0.2s;"
                    onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform=''" title="Set as default theme">
                📥 Load
            </button>
            <button class="rename-preset-btn" data-name="${escapeHtml(preset.name)}"
                    style="padding: 6px 10px; border-radius: 5px; border: none; background: var(--risu-theme-darkbutton, #444); color: var(--risu-theme-textcolor, #fff); cursor: pointer; font-size: 0.85em; transition: all 0.2s;"
                    onmouseover="this.style.background='var(--risu-theme-selected, #555)'; this.style.transform='scale(1.05)'" onmouseout="this.style.background='var(--risu-theme-darkbutton, #444)'; this.style.transform=''" title="Rename theme">
                ✏️
            </button>
            <button class="export-preset-btn" data-name="${escapeHtml(preset.name)}"
                    style="padding: 6px 10px; border-radius: 5px; border: none; background: var(--risu-theme-darkbutton, #444); color: var(--risu-theme-textcolor, #fff); cursor: pointer; font-size: 0.85em; transition: all 0.2s;"
                    onmouseover="this.style.background='var(--risu-theme-selected, #555)'; this.style.transform='scale(1.05)'" onmouseout="this.style.background='var(--risu-theme-darkbutton, #444)'; this.style.transform=''" title="Export theme to file">
                💾
            </button>
            <button class="delete-preset-btn" data-name="${escapeHtml(preset.name)}"
                    style="padding: 6px 10px; border-radius: 5px; border: none; background: var(--risu-theme-draculared, #ff5555); color: var(--risu-theme-textcolor, #fff); cursor: pointer; font-size: 0.85em; transition: all 0.2s;"
                    onmouseover="this.style.background='#ff3333'; this.style.transform='scale(1.05)'" onmouseout="this.style.background='var(--risu-theme-draculared, #ff5555)'; this.style.transform=''" title="Delete theme">
                🗑️
            </button>
        </div>
    `;
    }).join('');

    // Attach event listeners to buttons
    listContainer.querySelectorAll('.load-preset-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const name = e.target.dataset.name;
            showModal({
                title: '📥 Set as Default Theme',
                content: `Set "<strong>${escapeHtml(name)}</strong>" as the default theme?<br><br>This theme will be automatically applied to characters without specific theme mappings.`,
                buttons: [
                    {
                        text: 'Cancel',
                        primary: false,
                        onClick: () => {}
                    },
                    {
                        text: 'Set as Default',
                        primary: true,
                        onClick: () => {
                            setDefaultTheme(name);
                            updateDefaultThemeDisplay();

                            // Apply immediately based on auto-switch state
                            if (getAutoSwitchEnabled()) {
                                // Auto-switch enabled: only apply if current character has no mapping
                                try {
                                    const char = getChar();
                                    if (char && char.name) {
                                        const map = getCharacterThemeMap();
                                        const hasMapping = map[char.name];

                                        if (!hasMapping) {
                                            console.log(`🎨 Applying default theme immediately: ${name}`);
                                            loadThemePreset(name);
                                        } else {
                                            console.log(`🎨 Current character "${char.name}" has specific mapping, not applying default theme`);
                                        }
                                    }
                                } catch (err) {
                                    console.log(`🎨 Applying default theme: ${name}`);
                                    loadThemePreset(name);
                                }
                            } else {
                                // Auto-switch disabled: always apply default theme (no per-character themes)
                                console.log(`🎨 Applying default theme (auto-switch off): ${name}`);
                                loadThemePreset(name);
                            }

                            // Show success feedback
                            showButtonFeedback(e.target, '✓ Set!', '📥 Load');
                        }
                    }
                ]
            });
        });
    });

    listContainer.querySelectorAll('.rename-preset-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const oldName = e.target.dataset.name;
            showModal({
                title: '✏️ Rename Theme Preset',
                content: `Enter a new name for "<strong>${escapeHtml(oldName)}</strong>":`,
                input: {
                    value: oldName,
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
                        onClick: (newName) => {
                            if (!newName || newName.trim() === '') {
                                showModal({
                                    title: '⚠️ Warning',
                                    content: 'Please enter a valid name',
                                    buttons: [
                                        { text: 'OK', primary: true, onClick: () => {} }
                                    ]
                                });
                                return;
                            }

                            newName = newName.trim();

                            if (newName === oldName) {
                                return; // No change
                            }

                            // Check if new name already exists
                            const presets = getPresets();
                            const conflict = presets.find(p => p.name === newName);
                            if (conflict) {
                                showModal({
                                    title: '❌ Name Conflict',
                                    content: `A theme preset named "<strong>${escapeHtml(newName)}</strong>" already exists.<br><br>Please choose a different name.`,
                                    buttons: [
                                        { text: 'OK', primary: true, onClick: () => {} }
                                    ]
                                });
                                return;
                            }

                            if (renameThemePreset(oldName, newName)) {
                                updatePresetList();
                                updateThemeSelectDropdown();
                                updateCharacterMappingList();
                                updateDefaultThemeDisplay();

                                showModal({
                                    title: '✓ Success',
                                    content: `Theme renamed: "<strong>${escapeHtml(oldName)}</strong>" → "<strong>${escapeHtml(newName)}</strong>"`,
                                    buttons: [
                                        { text: 'OK', primary: true, onClick: () => {} }
                                    ]
                                });
                            } else {
                                showModal({
                                    title: '❌ Error',
                                    content: 'Failed to rename theme preset',
                                    buttons: [
                                        { text: 'OK', primary: true, onClick: () => {} }
                                    ]
                                });
                            }
                        }
                    }
                ]
            });
        });
    });

    listContainer.querySelectorAll('.export-preset-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const name = e.target.dataset.name;
            const json = exportThemePreset(name);
            if (json) {
                // Create a Blob from the JSON string
                const blob = new Blob([json], { type: 'application/json' });
                const url = URL.createObjectURL(blob);

                // Create a temporary download link
                const a = document.createElement('a');
                a.href = url;
                a.download = `${name.replace(/[^a-zA-Z0-9-_]/g, '_')}_theme_preset.json`;
                document.body.appendChild(a);
                a.click();

                // Cleanup
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                // Show success feedback
                showButtonFeedback(e.target, '✓', e.target.textContent);
            }
        });
    });

    listContainer.querySelectorAll('.delete-preset-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const name = e.target.dataset.name;
            showModal({
                title: '🗑️ Delete Theme Preset',
                content: `Delete theme preset "<strong>${escapeHtml(name)}</strong>"?<br><br>This action cannot be undone.`,
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
                            // Check if this is the default theme
                            const defaultTheme = getDefaultTheme();
                            if (defaultTheme === name) {
                                setDefaultTheme(''); // Clear default theme
                            }

                            // Check if any character mappings use this theme
                            const map = getCharacterThemeMap();
                            const updatedMap = {};
                            for (const [charName, themeName] of Object.entries(map)) {
                                if (themeName !== name) {
                                    updatedMap[charName] = themeName;
                                }
                            }
                            saveCharacterThemeMap(updatedMap);

                            deleteThemePreset(name);
                            updatePresetList();
                            updateThemeSelectDropdown();
                            updateDefaultThemeDisplay();
                            updateCharacterMappingList();
                        }
                    }
                ]
            });
        });
    });
}

function toggleFloatingWindow() {
    if (!floatingWindow) {
        createFloatingWindow();
    }

    if (floatingWindow.style.display === 'flex') {
        floatingWindow.style.display = 'none';
        if (floatingWindowOverlay) {
            floatingWindowOverlay.style.display = 'none';
        }
        document.body.style.overflow = '';
    } else {
        if (floatingWindowOverlay) {
            floatingWindowOverlay.style.display = 'block';
        }
        floatingWindow.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        updatePresetList();
        updateCharacterMappingList();
        updateThemeSelectDropdown();
        updateCurrentCharacterName();
        updateDefaultThemeDisplay();

        // Focus on name input
        const nameInput = document.getElementById('preset-name-input');
        if (nameInput) {
            setTimeout(() => nameInput.focus(), FOCUS_DELAY);
        }
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Keyboard shortcut handler
function setupKeyboardShortcut() {
    document.addEventListener('keydown', (e) => {
        const shortcut = getShortcut();

        if (isShortcutMatch(e, shortcut)) {
            e.preventDefault();
            toggleFloatingWindow();
        }
    });
}

// Expose functions to console for manual use
window.themePresetManager = {
    save: saveCurrentTheme,
    load: loadThemePreset,
    rename: renameThemePreset,
    delete: deleteThemePreset,
    list: listThemePresets,
    export: exportThemePreset,
    import: importThemePreset,
    toggle: toggleFloatingWindow,
    show: () => {
        if (!floatingWindow) createFloatingWindow();
        if (floatingWindowOverlay) {
            floatingWindowOverlay.style.display = 'block';
        }
        floatingWindow.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        updatePresetList();
    },
    hide: () => {
        if (floatingWindow) floatingWindow.style.display = 'none';
        if (floatingWindowOverlay) {
            floatingWindowOverlay.style.display = 'none';
        }
        document.body.style.overflow = '';
    },
    getShortcut: getShortcut,
    setShortcut: (shortcut) => {
        setShortcut(shortcut);
        updateShortcutDisplay();
        console.log(`Shortcut changed to: ${shortcut}`);
    }
};

console.log('🎨 Theme Preset Manager loaded!');
console.log(`Press ${getShortcut()} to toggle the preset manager window`);
console.log('');
console.log('Console API:');
console.log('  window.themePresetManager.toggle() - Toggle window');
console.log('  window.themePresetManager.show() - Show window');
console.log('  window.themePresetManager.hide() - Hide window');
console.log('  window.themePresetManager.save(name) - Save current theme');
console.log('  window.themePresetManager.load(name) - Load a theme preset');
console.log('  window.themePresetManager.rename(oldName, newName) - Rename a theme preset');
console.log('  window.themePresetManager.list() - List all presets');
console.log('  window.themePresetManager.setShortcut(shortcut) - Change keyboard shortcut');

// ============================================
// Character Auto-Switch Setup
// ============================================

let characterCheckInterval = null;
let lastCharacterName = '';

function setupCharacterAutoSwitch() {
    console.log('🎨 Theme Preset: Setting up character auto-switch with polling...');

    characterCheckInterval = setInterval(() => {
        // Skip all character tracking if auto-switch is disabled
        if (!getAutoSwitchEnabled()) {
            return;
        }

        try {
            const char = getChar();
            if (char && char.name) {
                // Update character name input if window is open
                updateCurrentCharacterName();

                // Check for character change and auto-switch
                if (char.name !== lastCharacterName) {
                    console.log(`🎨 Theme Preset: Character changed: ${lastCharacterName} → ${char.name}`);
                    lastCharacterName = char.name;
                    checkAndSwitchTheme();
                }
            }
        } catch (e) {
            // getChar() might fail if not in character context, silently ignore
        }
    }, CHAR_POLL_INTERVAL); // Check every 2 seconds

    console.log('🎨 Theme Preset: Character auto-switch polling started');
}

// Debounce helper function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Auto-inject button into Display Settings
function ensureSettingsButton() {
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

    // Check if button already exists in this container
    const existingBtn = container.querySelector('.theme-preset-settings-btn');
    if (existingBtn) return; // Already added

    // Remove buttons from other locations
    existingButtons.forEach(btn => {
        if (!container.contains(btn)) btn.remove();
    });

    // Find where to insert (after the custom color scheme section if it exists)
    let insertPoint = null;

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
    btn.onclick = () => {
        toggleFloatingWindow();
    };

    // Insert button
    if (insertPoint) {
        insertPoint.parentElement.insertBefore(btn, insertPoint);
    } else {
        container.appendChild(btn);
    }
}

// Initialize
setTimeout(() => {
    createFloatingWindow();
    setupKeyboardShortcut();
    ensureSettingsButton();
    setupCharacterAutoSwitch();

    // Watch for DOM changes to re-inject button if needed
    // Debounced to reduce performance impact and observe only settings area
    const debouncedEnsureSettingsButton = debounce(ensureSettingsButton, DEBOUNCE_WAIT);
    const observer = new MutationObserver(() => {
        debouncedEnsureSettingsButton();
    });

    // Find the settings container to observe (more efficient than observing entire body)
    const findSettingsContainer = () => {
        // Try to find the main settings container
        // Look for the Display Settings h2 header and observe its parent
        const headers = Array.from(document.querySelectorAll('h2')).filter(el => {
            const text = el.textContent || '';
            return text.includes('Display') || text.includes('디스플레이') || text.includes('display');
        });

        if (headers.length > 0) {
            // Get the parent container that holds all settings
            let container = headers[0].parentElement;
            // Go up a few levels to get a larger container that encompasses submenu changes
            for (let i = 0; i < 2 && container.parentElement; i++) {
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

    // Cleanup on unload
    if (onUnload) {
        onUnload(() => {
            observer.disconnect();
        });
    }
}, INIT_DELAY);

// Cleanup on unload
onUnload(() => {
    if (floatingWindow) {
        floatingWindow.remove();
    }
    if (floatingWindowOverlay) {
        floatingWindowOverlay.remove();
    }
    if (characterCheckInterval) {
        clearInterval(characterCheckInterval);
    }
    document.body.style.overflow = '';
    delete window.themePresetManager;
});
