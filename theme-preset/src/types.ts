/**
 * Type definitions for Theme Preset Manager
 */

export interface ColorScheme {
    type: 'dark' | 'light';
    bgcolor: string;
    darkbg: string;
    borderc: string;
    selected: string;
    draculared: string;
    darkBorderc: string;
    darkbutton: string;
    textcolor: string;
    textcolor2: string;
}

export interface TextTheme {
    FontColorStandard: string;
    FontColorItalic: string;
    FontColorBold: string;
    FontColorItalicBold: string;
    FontColorQuote1: string | null;
    FontColorQuote2: string | null;
}

export interface ThemePreset {
    name: string;
    customCSS: string;
    guiHTML: string;
    theme: string;
    colorSchemeName: string;
    textTheme: string;
    timestamp: number;
    colorScheme?: ColorScheme;
    customTextTheme?: TextTheme;
}

export interface ShortcutConfig {
    ctrl: boolean;
    alt: boolean;
    shift: boolean;
    meta: boolean;
    key: string;
}

export interface CharacterThemeMap {
    [characterName: string]: string;
}

export interface ModalOptions {
    title: string;
    content: string;
    buttons?: Array<{
        text: string;
        onClick: () => void;
        primary?: boolean;
    }>;
    onClose?: () => void;
}

export interface WindowState {
    window: HTMLElement | null;
    overlay: HTMLElement | null;
    isDragging: boolean;
    dragOffset: { x: number; y: number };
}
