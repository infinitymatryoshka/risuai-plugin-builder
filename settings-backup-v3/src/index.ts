/**
 * ResuAI - RisuAI Settings Backup & Restore Plugin
 *
 * Resume your AI journey anytime, anywhere
 *
 * Features:
 * - Export/Import settings as ZIP snapshots
 * - Cross-platform support (Web, Tauri, Capacitor)
 * - Service Worker cache recovery
 * - Module assets with proper folder structure
 * - Persona profile icons
 */

import { exportSettings } from './export';
import { importSettings } from './import';
import { createUI } from './ui';

console.log('ResuAI: Initializing...');

// Create UI with Export/Import buttons
const ui = createUI({
    onExport: (options) => exportSettings(options),
    onImport: importSettings
});

// Cleanup on plugin unload
onUnload(() => {
    console.log('ResuAI: Cleaning up...');

    // Clear interval to prevent memory leak
    clearInterval(ui.intervalId);

    // Remove UI from DOM
    if (document.body.contains(ui.container)) {
        document.body.removeChild(ui.container);
    }
});

console.log('ResuAI: Initialized successfully!');
