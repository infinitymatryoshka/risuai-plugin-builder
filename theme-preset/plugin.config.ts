import type { PluginConfig } from '../types/plugin-config';

const config: PluginConfig = {
    name: 'themepreset',
    displayName: 'Theme Preset Manager',
    apiVersion: '3.0',
    version: '2.1.0',
    arguments: {
        // Legacy arguments - only read for migration, all data now stored in pluginStorage
        presets: {
            type: 'string',
            defaultValue: '',
            description: 'Legacy: migrated to pluginStorage'
        },
        characterThemeMap: {
            type: 'string',
            defaultValue: '',
            description: 'Legacy: migrated to pluginStorage'
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
