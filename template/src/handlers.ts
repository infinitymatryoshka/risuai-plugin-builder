/// <reference types="../../types/risu-plugin" />

/**
 * Text processing handlers
 * This file shows how to modify text at different stages
 */

// Handler for modifying AI output
const outputHandler = (content: string): string => {
    // Example: Add a prefix to all AI responses
    return content;
};

// Handler for modifying user input (optional)
const inputHandler = (content: string): string => {
    // Example: You can modify user input before it's sent to AI
    return content;
};

export function setupHandlers() {
    // Register output handler
    addRisuScriptHandler('output', outputHandler);

    // Register input handler (optional)
    // addRisuScriptHandler('input', inputHandler);

    console.log('Example Plugin: Handlers registered');

    // Cleanup handlers on unload
    onUnload(() => {
        removeRisuScriptHandler('output', outputHandler);
        // removeRisuScriptHandler('input', inputHandler);
    });
}
