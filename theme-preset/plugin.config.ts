import type { PluginConfig } from '../types/plugin-config';

const config: PluginConfig = {
    name: 'themepreset',
    displayName: 'Theme Preset Manager',
    apiVersion: '3.0',
    version: '2.3.0',
    updateUrl: 'https://raw.githubusercontent.com/infinitymatryoshka/risuai-plugin-builder/main/theme-preset/dist/themepreset.js',
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
            url: 'https://github.com/infinitymatryoshka/risuai-plugin-builder',
            hoverText: 'GitHub'
        }
    ]
};

export default config;
