import type { PluginConfig } from '../types/plugin-config';

const config: PluginConfig = {
    name: 'themepreset',
    displayName: 'Theme Preset Manager',
    arguments: {
        presets: {
            type: 'string',
            defaultValue: '',
            description: 'Saved theme presets (JSON)'
        },
        shortcut: {
            type: 'string',
            defaultValue: 'Ctrl+Alt+X',
            description: 'Keyboard shortcut to toggle UI'
        },
        characterThemeMap: {
            type: 'string',
            defaultValue: '',
            description: 'Character to theme mapping (JSON)'
        },
        autoSwitch: {
            type: 'string',
            defaultValue: 'false',
            description: 'Enable automatic theme switching per character'
        },
        defaultTheme: {
            type: 'string',
            defaultValue: '',
            description: 'Default theme when no character mapping exists'
        }
    },
    links: [
        {
            url: 'https://github.com/kwaroran/RisuAI',
            hoverText: 'Documentation'
        }
    ]
};

export default config;
