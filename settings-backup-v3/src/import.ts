/**
 * Import settings from ZIP file
 */

import JSZip from 'jszip';
import { createStorage, isTauriEnvironment } from './storage';
import { createLoadingOverlay, updateLoadingProgress, removeLoadingOverlay } from './ui';

export async function importSettings() {
    console.log('ResuAI: Starting import...');

    // File picker
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.zip';

    input.onchange = async (e: Event) => {
        const target = e.target as HTMLInputElement;
        const file = target.files?.[0];

        if (!file) {
            console.log('No file selected');
            return;
        }

        const overlay = createLoadingOverlay('📥 Importing Settings');

        try {
            updateLoadingProgress(1, 5, 'Reading ZIP file');

            // Read ZIP
            const arrayBuffer = await file.arrayBuffer();
            const zip = await JSZip.loadAsync(arrayBuffer);

            updateLoadingProgress(2, 5, 'Reading settings.json');

            // Read settings.json
            const settingsFile = zip.file('settings.json');
            if (!settingsFile) {
                throw new Error('settings.json not found in ZIP file');
            }

            const settingsText = await settingsFile.async('text');
            const importedSettings = JSON.parse(settingsText);

            // Confirm with user
            const confirmed = confirm(
                `Import settings from backup?\n\n` +
                `Export Date: ${importedSettings.exportDate || 'Unknown'}\n` +
                `Version: ${importedSettings.exportVersion || 'Unknown'}\n\n` +
                `⚠️ This will overwrite your current settings (except characters).`
            );

            if (!confirmed) {
                removeLoadingOverlay();
                console.log('Import cancelled by user');
                return;
            }

            updateLoadingProgress(3, 5, 'Reading current database');

            // @ts-ignore - getDatabase is a global function provided by RisuAI
            const db = getDatabase();

            // Preserve characters
            const currentCharacters = db.characters;
            const currentCharacterOrder = db.characterOrder;

            updateLoadingProgress(4, 5, 'Restoring module assets');

            // Restore module assets
            const moduleAssets: { [moduleId: string]: any[] } = {};
            const storage = createStorage();

            const assetsFolder = zip.folder('module-assets');
            if (assetsFolder) {
                const assetFiles = Object.keys(zip.files).filter(
                    (name) => name.startsWith('module-assets/') && !zip.files[name].dir
                );

                console.log(`Found ${assetFiles.length} asset files in ZIP`);

                let processedAssets = 0;
                for (const assetPath of assetFiles) {
                    processedAssets++;
                    updateLoadingProgress(
                        processedAssets,
                        assetFiles.length,
                        'Restoring assets'
                    );

                    const file = zip.file(assetPath);
                    if (file && !file.dir) {
                        try {
                            // Parse path: module-assets/{moduleId}/{filename}
                            const pathParts = assetPath.split('/');
                            if (pathParts.length !== 3) {
                                console.warn(`Invalid asset path: ${assetPath}`);
                                continue;
                            }

                            const moduleId = pathParts[1];
                            const filename = pathParts[2];

                            // Extract assetId and extension
                            const lastDotIndex = filename.lastIndexOf('.');
                            if (lastDotIndex === -1) {
                                console.warn(`Invalid filename (no extension): ${filename}`);
                                continue;
                            }

                            const assetId = filename.substring(0, lastDotIndex);
                            const ext = filename.substring(lastDotIndex + 1);

                            // Read asset data
                            const assetUint8Array = await file.async('uint8array');

                            // Store using saveAsset (supports all platforms: Web, Tauri, Capacitor)
                            let storageKey: string;
                            try {
                                // @ts-ignore - saveAsset is a global function provided by RisuAI
                                storageKey = await saveAsset(assetUint8Array, assetId, `${assetId}.${ext}`);
                                console.log(`✓ Restored (saveAsset): ${moduleId}/${assetId} → ${storageKey}`);
                            } catch (error) {
                                // Check if Tauri before fallback
                                console.error(`saveAsset failed for ${assetId}:`, error);

                                if (isTauriEnvironment()) {
                                    throw new Error(`Tauri import failed: saveAsset() not available or failed. Cannot use IndexedDB fallback in Tauri.`);
                                }

                                // Fallback to manual storage (Web only)
                                console.warn(`Trying manual storage fallback...`);
                                storageKey = `assets/${assetId}.${ext}`;
                                await storage.setItem(storageKey, assetUint8Array);
                                console.log(`✓ Restored (manual): ${moduleId}/${assetId} → ${storageKey}`);
                            }

                            // Collect for module
                            if (!moduleAssets[moduleId]) {
                                moduleAssets[moduleId] = [];
                            }
                            moduleAssets[moduleId].push([assetId, storageKey, ext]);

                        } catch (error) {
                            console.warn(`Error restoring asset ${assetPath}:`, error);
                        }
                    }
                }

                console.log(`Restored ${processedAssets} module assets`);
            }

            updateLoadingProgress(5, 5, 'Restoring persona icons');

            // Restore persona icons
            const personaIconFolder = zip.folder('persona-icons');
            if (personaIconFolder) {
                const iconFiles = Object.keys(zip.files).filter(
                    (name) => name.startsWith('persona-icons/') && !zip.files[name].dir
                );

                console.log(`Found ${iconFiles.length} persona icon files in ZIP`);

                for (const iconPath of iconFiles) {
                    try {
                        const filename = iconPath.split('/')[1];
                        const match = filename.match(/^persona-(\d+)\.(.+)$/);

                        if (!match) {
                            console.warn(`Invalid persona icon filename: ${filename}`);
                            continue;
                        }

                        const personaIndex = parseInt(match[1], 10);
                        const ext = match[2];

                        const file = zip.file(iconPath);
                        if (!file) {
                            console.warn(`Failed to read persona icon: ${iconPath}`);
                            continue;
                        }

                        const iconUint8Array = await file.async('uint8array');

                        // Store using saveAsset (supports all platforms)
                        let storageKey: string;
                        try {
                            // @ts-ignore - saveAsset is a global function provided by RisuAI
                            storageKey = await saveAsset(iconUint8Array, `persona-icon-${personaIndex}`, `persona-icon-${personaIndex}.${ext}`);
                            console.log(`✓ Restored persona icon ${personaIndex} (saveAsset): ${storageKey}`);
                        } catch (error) {
                            // Check if Tauri before fallback
                            console.error(`saveAsset failed for persona icon ${personaIndex}:`, error);

                            if (isTauriEnvironment()) {
                                throw new Error(`Tauri import failed: saveAsset() not available or failed. Cannot use IndexedDB fallback in Tauri.`);
                            }

                            // Fallback to manual storage (Web only)
                            console.warn(`Trying manual storage fallback...`);
                            storageKey = `persona-icon-${personaIndex}.${ext}`;
                            await storage.setItem(storageKey, iconUint8Array);
                            console.log(`✓ Restored persona icon ${personaIndex} (manual): ${storageKey}`);
                        }

                        // Update persona icon reference
                        if (importedSettings.personas?.[personaIndex]) {
                            importedSettings.personas[personaIndex].icon = storageKey;
                            console.log(`Updated persona ${personaIndex} icon reference`);
                        } else {
                            console.warn(`Persona ${personaIndex} not found in imported settings`);
                        }

                    } catch (error) {
                        console.warn(`Error restoring persona icon ${iconPath}:`, error);
                    }
                }
            }

            // Clean up export metadata
            delete importedSettings.exportDate;
            delete importedSettings.exportVersion;
            delete importedSettings.pluginName;

            // Restore module assets to modules
            console.log(`Modules with assets: ${Object.keys(moduleAssets).length}`);
            if (importedSettings.modules && Array.isArray(importedSettings.modules)) {
                importedSettings.modules = importedSettings.modules.map((module: any) => {
                    const assets = moduleAssets[module.id];
                    if (assets && assets.length > 0) {
                        console.log(`Restoring ${assets.length} assets for module ${module.id}`);
                        return { ...module, assets };
                    } else {
                        console.log(`No assets found for module ${module.id}`);
                        return module;
                    }
                });
            }

            // Restore characters and characterOrder
            importedSettings.characters = currentCharacters;
            importedSettings.characterOrder = currentCharacterOrder;

            // Save to database
            updateLoadingProgress(1, 1, 'Saving to database');

            // @ts-ignore - setDatabaseLite is a global function provided by RisuAI
            setDatabaseLite(importedSettings);

            removeLoadingOverlay();
            console.log('ResuAI: Import successful!');
            alert(
                '✅ Settings imported successfully!\n\n' +
                '⚠️ Please wait for a while for auto save and refresh manually.'
            );

        } catch (error) {
            removeLoadingOverlay();
            console.error('ResuAI: Import failed', error);
            alert('❌ Import failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
        }
    };

    input.click();
}
