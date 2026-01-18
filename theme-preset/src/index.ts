/**
 * Theme Preset Manager Plugin for RisuAI
 * API v3.0
 *
 * A modular, TypeScript-based plugin for managing theme presets
 * with automatic character-based theme switching.
 */

import { getShortcut, isShortcutMatch } from './shortcuts';
import { initAutoSwitch, stopAutoSwitch } from './auto-switch';
import { migrateFromArgumentStorage } from './storage';
import { createFloatingWindow, toggleFloatingWindow, cleanupUI } from './ui';

// Main plugin initialization (wrapped in async IIFE)
(async () => {
    try {
        console.log('Theme Preset Manager: Initializing...');

        // Migrate data from old argument-based storage if needed
        await migrateFromArgumentStorage();

        // Setup keyboard shortcut handler (works in iframe context)
        document.addEventListener('keydown', async (e: KeyboardEvent) => {
            const shortcut = await getShortcut();
            if (isShortcutMatch(e, shortcut)) {
                e.preventDefault();
                await toggleFloatingWindow();
            }
        });

        // Create the floating window (hidden initially)
        createFloatingWindow();

        // Initialize auto-switch if enabled
        await initAutoSwitch();

        // Register a settings button in RisuAI UI
        await Risuai.registerButton(
            {
                name: 'Theme Presets',
                icon: '🎨',
                iconType: 'html',
                location: 'hamburger'
            },
            async () => {
                await toggleFloatingWindow();
            }
        );

        // Cleanup on plugin unload
        await Risuai.onUnload(async () => {
            console.log('Theme Preset Manager: Cleaning up...');
            stopAutoSwitch();
            cleanupUI();
        });

        const shortcut = await getShortcut();
        console.log('Theme Preset Manager: Ready!');
        console.log(`   Press ${shortcut} to open the theme manager`);

    } catch (error) {
        console.log(`Theme Preset Manager Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
})();
