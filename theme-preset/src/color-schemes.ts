/**
 * Color scheme and text theme application
 */

import type { ColorScheme, TextTheme } from './types';

// Color scheme definitions (basic set - full set would be too large)
const colorSchemes: Record<string, any> = {
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

/**
 * Get a color scheme object by name
 */
export function getColorSchemeByName(colorSchemeName: string): ColorScheme | null {
    if (colorSchemes[colorSchemeName]) {
        // Return a deep clone to avoid mutations
        return JSON.parse(JSON.stringify(colorSchemes[colorSchemeName]));
    }
    return null;
}

/**
 * Apply a color scheme to the document
 */
export function applyColorScheme(colorSchemeName: string, customColorScheme?: ColorScheme): void {
    let colorScheme: any;

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

/**
 * Apply a text theme to the document
 */
export function applyTextTheme(
    textTheme: string,
    customTextTheme: TextTheme | undefined,
    colorSchemeType: 'dark' | 'light'
): void {
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

/**
 * Get color scheme type (dark or light)
 */
export function getColorSchemeType(colorSchemeName: string, colorScheme?: ColorScheme): 'dark' | 'light' {
    if (colorScheme && colorScheme.type) {
        return colorScheme.type;
    }
    if (colorSchemes[colorSchemeName]) {
        return colorSchemes[colorSchemeName].type;
    }
    return 'dark';
}
