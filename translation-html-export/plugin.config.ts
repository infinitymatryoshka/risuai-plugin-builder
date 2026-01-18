import type { PluginConfig } from '../types/plugin-config';

const config: PluginConfig = {
    name: 'translation-html-export',
    displayName: '📄 HTML Export (From Cache) v0.1.1',
    arguments: {
        'enable_plugin': {
            type: 'int',
            defaultValue: '1',
            description: '플러그인 활성화 (1=ON, 0=OFF)'
        }
    }
};

export default config;
