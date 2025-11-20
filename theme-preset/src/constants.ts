/**
 * Constants for Theme Preset Manager
 */

export const DEFAULT_SHORTCUT = 'Ctrl+Alt+X';
export const CHAR_POLL_INTERVAL = 2000; // Character auto-switch polling interval (ms)
export const DEBOUNCE_WAIT = 300; // DOM observer debounce wait (ms)
export const FEEDBACK_TIMEOUT = 1500; // Success feedback display duration (ms)
export const FOCUS_DELAY = 100; // Input focus delay (ms)
export const INIT_DELAY = 1000; // Plugin initialization delay (ms)

export const PLUGIN_NAME = 'themepreset';

// Color schemes available in RisuAI
export const COLOR_SCHEMES: Record<string, any> = {
    'auto': { type: 'dark' },
    'dracula': { type: 'dark' },
    'solarizedDark': { type: 'dark' },
    'solarizedLight': { type: 'light' },
    'monokai': { type: 'dark' },
    'nord': { type: 'dark' },
    'gruvboxDark': { type: 'dark' },
    'gruvboxLight': { type: 'light' },
    'tokyonight': { type: 'dark' },
    'tokyonight-storm': { type: 'dark' },
    'tokyonight-light': { type: 'light' },
    'catppuccin-mocha': { type: 'dark' },
    'catppuccin-macchiato': { type: 'dark' },
    'catppuccin-frappe': { type: 'dark' },
    'catppuccin-latte': { type: 'light' },
    'everforest-dark': { type: 'dark' },
    'everforest-light': { type: 'light' },
    'rosepine': { type: 'dark' },
    'rosepine-moon': { type: 'dark' },
    'rosepine-dawn': { type: 'light' },
    'custom': { type: 'dark' }
};

// Available text themes
export const TEXT_THEMES = [
    'standard',
    'plaintext',
    'colorful',
    'custom'
];
