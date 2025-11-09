import type { PluginConfig } from '../types/plugin-config';

const config: PluginConfig = {
    // Plugin identifier (required)
    name: 'exampleplugin',

    // Display name shown in UI (optional)
    displayName: 'Example Plugin',

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
