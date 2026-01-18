/// <reference types="../../types/risu-plugin" />

/**
 * Text processing handlers (API v3.0)
 * This file shows how to modify text at different stages
 */

// Handler for modifying AI output
const outputHandler = async (content: string): Promise<string> => {
    // Example: You can modify AI responses here
    return content;
};

// Handler for modifying user input (optional)
const inputHandler = async (content: string): Promise<string> => {
    // Example: You can modify user input before it's sent to AI
    return content;
};

export async function setupHandlers() {
    // Register output handler
    await Risuai.addRisuScriptHandler('output', outputHandler);

    // Register input handler (optional)
    // await Risuai.addRisuScriptHandler('input', inputHandler);

    console.log('Example Plugin: Handlers registered');

    // Cleanup handlers on unload
    await Risuai.onUnload(async () => {
        await Risuai.removeRisuScriptHandler('output', outputHandler);
        // await Risuai.removeRisuScriptHandler('input', inputHandler);
    });
}
