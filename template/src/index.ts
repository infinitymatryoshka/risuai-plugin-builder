/// <reference types="../../types/risu-plugin" />

/**
 * Example RisuAI Plugin (API v3.0)
 *
 * This is a simple example showing how to create a plugin with the new API.
 * All API methods are async and accessed through the global `Risuai` object.
 */

// Import helper functions from other files
import { createProvider } from './provider';
import { setupHandlers } from './handlers';

// Main plugin initialization (wrapped in async IIFE)
(async () => {
    try {
        console.log('Example Plugin: Initializing...');

        // Get configuration from plugin settings
        const apiKey = await Risuai.getArgument('api_key') as string;
        const temperature = await Risuai.getArgument('temperature') as number;

        console.log('Example Plugin: Configuration loaded');
        console.log(`  Temperature: ${temperature}`);

        // Setup AI provider
        await createProvider(apiKey, temperature);

        // Setup text handlers (optional)
        await setupHandlers();

        // Register a settings button in the UI
        await Risuai.registerSetting(
            'Example Plugin Settings',
            async () => {
                // Show plugin UI when clicked
                document.body.innerHTML = `
                    <div style="padding: 20px; background: #1e1e1e; color: white; font-family: sans-serif; min-height: 100vh;">
                        <h1>Example Plugin Settings</h1>
                        <p>API Key: ${apiKey ? '***' + apiKey.slice(-4) : 'Not set'}</p>
                        <p>Temperature: ${temperature}</p>
                        <button id="close-btn" style="padding: 10px 20px; margin-top: 20px; cursor: pointer;">Close</button>
                    </div>
                `;

                document.getElementById('close-btn')?.addEventListener('click', async () => {
                    await Risuai.hideContainer();
                });

                await Risuai.showContainer('fullscreen');
            },
            '⚙️',
            'html'
        );

        // Cleanup on plugin unload
        await Risuai.onUnload(async () => {
            console.log('Example Plugin: Cleaning up...');
        });

        console.log('Example Plugin: Initialized successfully!');

    } catch (error) {
        console.log(`Example Plugin Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
})();
