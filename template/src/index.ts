/// <reference types="../../types/risu-plugin" />

/**
 * Example RisuAI Plugin
 *
 * This is a simple example showing how to create a custom AI provider.
 * You can split your code into multiple files and import them here.
 */

// Import helper functions from other files
import { createProvider } from './provider';
import { setupHandlers } from './handlers';

// Main plugin initialization
console.log('Example Plugin: Initializing...');

// Get configuration from plugin settings
const apiKey = getArg('exampleplugin::api_key') as string;
const temperature = getArg('exampleplugin::temperature') as number;

console.log('Example Plugin: Configuration loaded');
console.log(`  Temperature: ${temperature}`);

// Setup AI provider
createProvider(apiKey, temperature);

// Setup text handlers (optional)
setupHandlers();

// Cleanup on plugin unload
onUnload(() => {
    console.log('Example Plugin: Cleaning up...');
});

console.log('Example Plugin: Initialized successfully!');
