import type { PluginConfig } from '../types/plugin-config';

const config: PluginConfig = {
    // Plugin identifier (required)
    name: 'exampleplugin',

    // Display name shown in UI (optional)
    displayName: 'Example Plugin',

    // API version (required, use '3.0' for new plugins)
    apiVersion: '3.0',

    // Plugin version for update checks (optional but recommended)
    version: '1.0.0',

    // URL to check for updates (optional)
    // updateUrl: 'https://raw.githubusercontent.com/yourusername/your-plugin/main/dist/exampleplugin.js',

    // Plugin arguments (optional)
    arguments: {
        api_key: {
            type: 'string',
            defaultValue: '',
            description: 'API key for the service'
        },
        temperature: {
            type: 'int',
            defaultValue: 70,
            description: 'Temperature for generation (0-100)'
        }
    },

    // Plugin links (optional)
    links: [
        {
            url: 'https://github.com/yourusername/your-plugin',
            hoverText: 'GitHub Repository'
        }
    ]
};

export default config;
