/**
 * Type definitions for Theme Preset Manager
 */

export interface ThemePreset {
    name: string;
    customCSS: string;
    guiHTML: string;
    theme: string;
    colorSchemeName: string;
    textTheme: string;
    timestamp: number;
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
    isVisible?: boolean;
}
