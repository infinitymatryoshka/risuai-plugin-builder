/**
 * Theme Preset Manager Plugin for RisuAI
 * API v3.0
 *
 * A modular, TypeScript-based plugin for managing theme presets
 * with automatic character-based theme switching.
 */

import { getShortcut, isShortcutMatch } from './shortcuts';
import { initAutoSwitch, stopAutoSwitch } from './auto-switch';
import { migrateFromArgumentStorage, initCurrentPreset } from './storage';
import { createFloatingWindow, toggleFloatingWindow, cleanupUI } from './ui';

function showPermissionError(icon: string, message: string, bgColor: string): void {
    document.body.innerHTML = '';
    document.body.style.cssText = 'margin:0;display:flex;align-items:center;justify-content:center;height:100vh;background:rgba(0,0,0,0.5);font-family:sans-serif;';
    const box = document.createElement('div');
    box.style.cssText = `background:#2a2a2a;border-radius:12px;padding:24px 32px;max-width:400px;text-align:center;color:#fff;box-shadow:0 4px 24px rgba(0,0,0,0.4);`;
    const iconEl = document.createElement('div');
    iconEl.style.cssText = 'font-size:36px;margin-bottom:12px;';
    iconEl.textContent = icon;
    const msg = document.createElement('p');
    msg.style.cssText = 'font-size:14px;line-height:1.6;margin:0 0 20px 0;';
    msg.textContent = message;
    const btn = document.createElement('button');
    btn.textContent = '확인';
    btn.style.cssText = `background:${bgColor};color:#fff;border:none;border-radius:8px;padding:8px 24px;font-size:14px;cursor:pointer;`;
    btn.addEventListener('click', () => { Risuai.hideContainer(); });
    box.append(iconEl, msg, btn);
    document.body.appendChild(box);
}

// Main plugin initialization (wrapped in async IIFE)
(async () => {
    try {
        console.log('Theme Preset Manager: Initializing...');

        // Migrate data from old argument-based storage if needed
        await migrateFromArgumentStorage();

        // Restore last loaded preset name from storage
        await initCurrentPreset();

        // Request permissions upfront (before iframe is shown, so dialogs are visible)
        const dbPermission = await Risuai.requestPluginPermission('db');
        const domPermission = await Risuai.requestPluginPermission('mainDom');

        if (!dbPermission) {
            console.log('Theme Preset Manager: Database permission denied. Plugin cannot function.');
            showPermissionError('❌', '데이터베이스 권한이 거부되어 테마 프리셋 플러그인을 사용할 수 없습니다.\n앱을 새로고침하여 권한을 허용해주세요.', '#ef4444');
            await Risuai.registerButton(
                { name: 'Theme Presets', icon: '🎨', iconType: 'html', location: 'hamburger' },
                async () => { await Risuai.showContainer('fullscreen'); }
            );
            return;
        }

        if (!domPermission) {
            console.log('Theme Preset Manager: Main DOM permission denied. Some features will be limited.');
            // Non-fatal: plugin still works, just some features limited
        }

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
