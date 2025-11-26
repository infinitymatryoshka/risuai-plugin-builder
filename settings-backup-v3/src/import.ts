/**
 * Import settings from ZIP file
 */

import JSZip from 'jszip';
import { createStorage, isTauriEnvironment } from './storage';
import { createLoadingOverlay, updateLoadingProgress, removeLoadingOverlay } from './ui';

interface ImportDialogResult {
    confirmed: boolean;
    preserveAccount: boolean;
}

/**
 * Custom import confirmation dialog with account preservation option
 */
function showImportDialog(
    exportDate: string,
    exportVersion: string,
    accountExcluded: boolean,
    hasCurrentAccount: boolean
): Promise<ImportDialogResult> {
    return new Promise((resolve) => {
        // Create overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10001;
        `;

        // Create dialog
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background: #2a2a3e;
            padding: 24px;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
            max-width: 400px;
            width: 90%;
            color: #e0e0e0;
        `;

        // Title
        const title = document.createElement('h3');
        title.textContent = '📥 Import Settings?';
        title.style.cssText = `
            margin: 0 0 16px 0;
            font-size: 20px;
            color: #fff;
        `;

        // Info section
        const info = document.createElement('div');
        info.style.cssText = `
            background: rgba(255, 255, 255, 0.05);
            padding: 12px;
            border-radius: 8px;
            margin-bottom: 16px;
            font-size: 14px;
        `;
        info.innerHTML = `
            <div style="margin-bottom: 8px;"><strong>Export Date:</strong> ${exportDate || 'Unknown'}</div>
            <div><strong>Version:</strong> ${exportVersion || 'Unknown'}</div>
            ${accountExcluded ? '<div style="margin-top: 8px; color: #a0a0a0;">ℹ️ 백업에 계정 정보 없음</div>' : ''}
        `;

        // Checkbox for preserving account
        let preserveAccountCheckbox: HTMLInputElement | null = null;
        const checkboxContainer = document.createElement('label');
        checkboxContainer.style.cssText = `
            display: flex;
            align-items: center;
            gap: 10px;
            cursor: pointer;
            padding: 12px;
            background: rgba(139, 92, 246, 0.1);
            border: 1px solid rgba(139, 92, 246, 0.3);
            border-radius: 8px;
            margin-bottom: 16px;
            font-size: 14px;
        `;

        preserveAccountCheckbox = document.createElement('input');
        preserveAccountCheckbox.type = 'checkbox';
        preserveAccountCheckbox.checked = true; // 기본값: 기존 계정 유지
        preserveAccountCheckbox.style.cssText = `
            width: 18px;
            height: 18px;
            cursor: pointer;
            accent-color: #8B5CF6;
        `;

        const checkboxLabel = document.createElement('span');

        // Handle different scenarios
        if (!hasCurrentAccount) {
            // No current account - checkbox is irrelevant
            preserveAccountCheckbox.checked = false;
            preserveAccountCheckbox.disabled = true;
            preserveAccountCheckbox.style.cursor = 'not-allowed';
            preserveAccountCheckbox.style.opacity = '0.4';
            checkboxContainer.style.cursor = 'default';
            checkboxContainer.style.opacity = '0.6';
            checkboxLabel.innerHTML = `🔓 기존 계정 정보 유지<br><small style="color: #a0a0a0;">현재 로그인된 계정 없음</small>`;
        } else if (accountExcluded) {
            // Has current account but backup has no account
            // Prevent unchecking (would cause forced logout)
            checkboxLabel.innerHTML = `🔒 기존 계정 정보 유지 <span style="color: #8B5CF6;">(필수)</span><br><small style="color: #ffa726;">백업에 계정 정보 없음 - 해제하면 로그아웃됩니다</small>`;

            // Block unchecking with warning
            preserveAccountCheckbox.onchange = () => {
                if (!preserveAccountCheckbox!.checked) {
                    alert('⚠️ 백업에 계정 정보가 없습니다.\n\n체크를 해제하면 강제 로그아웃됩니다.\n로그아웃이 필요하면 직접 로그아웃 후 복원하세요.');
                    preserveAccountCheckbox!.checked = true;
                }
            };
        } else {
            // Has current account and backup has account - allow choice
            checkboxLabel.innerHTML = `🔒 기존 계정 정보 유지<br><small style="color: #a0a0a0;">Keep current account info</small>`;
        }

        checkboxContainer.appendChild(preserveAccountCheckbox);
        checkboxContainer.appendChild(checkboxLabel);

        // Warning
        const warning = document.createElement('div');
        warning.style.cssText = `
            color: #ffa726;
            font-size: 13px;
            margin-bottom: 20px;
        `;
        warning.textContent = '⚠️ 설정이 덮어씌워집니다 (캐릭터 제외)';

        // Buttons
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            display: flex;
            gap: 12px;
            justify-content: flex-end;
        `;

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.style.cssText = `
            padding: 10px 20px;
            background: #555;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
        `;
        cancelBtn.onclick = () => {
            document.body.removeChild(overlay);
            resolve({ confirmed: false, preserveAccount: false });
        };

        const importBtn = document.createElement('button');
        importBtn.textContent = 'Import';
        importBtn.style.cssText = `
            padding: 10px 20px;
            background: linear-gradient(135deg, #8B5CF6 0%, #3B82F6 100%);
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
        `;
        importBtn.onclick = () => {
            document.body.removeChild(overlay);
            resolve({
                confirmed: true,
                preserveAccount: preserveAccountCheckbox?.checked ?? true
            });
        };

        buttonContainer.appendChild(cancelBtn);
        buttonContainer.appendChild(importBtn);

        // Assemble dialog
        dialog.appendChild(title);
        dialog.appendChild(info);
        dialog.appendChild(checkboxContainer);
        dialog.appendChild(warning);
        dialog.appendChild(buttonContainer);
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
    });
}

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

            // Remove loading overlay temporarily for dialog
            removeLoadingOverlay();

            // @ts-ignore - getDatabase is a global function provided by RisuAI
            const currentDb = getDatabase();
            const hasCurrentAccount = !!currentDb.account;

            // Show custom confirmation dialog with account preservation option
            const dialogResult = await showImportDialog(
                importedSettings.exportDate || 'Unknown',
                importedSettings.exportVersion || 'Unknown',
                importedSettings.accountExcluded || false,
                hasCurrentAccount
            );

            if (!dialogResult.confirmed) {
                console.log('Import cancelled by user');
                return;
            }

            // Re-show loading overlay
            const overlay2 = createLoadingOverlay('📥 Importing Settings');
            updateLoadingProgress(3, 5, 'Reading current database');

            // @ts-ignore - getDatabase is a global function provided by RisuAI
            const db = getDatabase();

            // Preserve characters
            const currentCharacters = db.characters;
            const currentCharacterOrder = db.characterOrder;

            // Preserve account if user chose to
            const currentAccount = db.account;
            const preserveAccount = dialogResult.preserveAccount;

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

            // Restore custom background
            const customBgFolder = zip.folder('custom-background');
            if (customBgFolder) {
                const bgFiles = Object.keys(zip.files).filter(
                    (name) => name.startsWith('custom-background/') && !zip.files[name].dir
                );

                if (bgFiles.length > 0) {
                    console.log(`Found custom background in ZIP`);
                    updateLoadingProgress(1, 1, 'Restoring custom background');

                    try {
                        const bgPath = bgFiles[0]; // Should only be one background file
                        const file = zip.file(bgPath);

                        if (file) {
                            const filename = bgPath.split('/')[1];
                            const ext = filename.split('.').pop() || 'png';

                            const bgUint8Array = await file.async('uint8array');

                            // Store using saveAsset (supports all platforms)
                            let storageKey: string;
                            try {
                                // @ts-ignore - saveAsset is a global function provided by RisuAI
                                storageKey = await saveAsset(bgUint8Array, `custom-background`, `custom-background.${ext}`);
                                console.log(`✓ Restored custom background (saveAsset): ${storageKey}`);
                            } catch (error) {
                                console.error(`saveAsset failed for custom background:`, error);

                                if (isTauriEnvironment()) {
                                    throw new Error(`Tauri import failed: saveAsset() not available or failed. Cannot use IndexedDB fallback in Tauri.`);
                                }

                                // Fallback to manual storage (Web only)
                                console.warn(`Trying manual storage fallback...`);
                                storageKey = `assets/custom-background.${ext}`;
                                await storage.setItem(storageKey, bgUint8Array);
                                console.log(`✓ Restored custom background (manual): ${storageKey}`);
                            }

                            // Update customBackground reference in settings
                            importedSettings.customBackground = storageKey;
                            console.log(`Updated customBackground reference: ${storageKey}`);
                        }
                    } catch (error) {
                        console.warn(`Error restoring custom background:`, error);
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

            // Restore account if user chose to preserve it
            if (preserveAccount && currentAccount) {
                importedSettings.account = currentAccount;
                console.log('ResuAI: Preserved current account info');
            } else if (!preserveAccount) {
                console.log('ResuAI: Account info will be overwritten from backup');
            }

            // Clean up accountExcluded metadata
            delete importedSettings.accountExcluded;

            // Save to database
            updateLoadingProgress(1, 1, 'Saving to database');

            // @ts-ignore - setDatabase is a global function provided by RisuAI
            // Using setDatabase() instead of setDatabaseLite() for proper initialization:
            // - Sets default values for 83+ fields (handles new features in updates)
            // - Applies language settings
            // - Validates data integrity
            setDatabase(importedSettings);

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
