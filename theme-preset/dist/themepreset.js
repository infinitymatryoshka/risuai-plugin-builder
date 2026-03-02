//@name themepreset
//@api 3.0
//@version 2.2.1
//@display-name Theme Preset Manager
//@update-url https://raw.githubusercontent.com/infinitymatryoshka/risuai-plugin-builder/main/theme-preset/dist/themepreset.js
//@arg presets string Legacy: migrated to pluginStorage
//@arg characterThemeMap string Legacy: migrated to pluginStorage
//@link https://github.com/infinitymatryoshka/risuai-plugin-builder GitHub

// src/constants.ts
  var DEFAULT_SHORTCUT = "Ctrl+Alt+X";
  var CHAR_POLL_INTERVAL = 2e3;
  var FEEDBACK_TIMEOUT = 1500;
  var FOCUS_DELAY = 100;
  var PLUGIN_NAME = "themepreset";
  var SHARED_CSS_SEPARATOR = "/* ===== SHARED CSS END / THEME CSS START ===== */";

  // src/shortcuts.ts
  var STORAGE_KEY_SHORTCUT = "shortcut";
  async function getShortcut() {
    try {
      const saved = await Risuai.pluginStorage.getItem(STORAGE_KEY_SHORTCUT);
      if (saved && typeof saved === "string") {
        return saved;
      }
      const oldSaved = await Risuai.getArgument(`${PLUGIN_NAME}::shortcut`);
      if (oldSaved && oldSaved !== "") {
        await Risuai.pluginStorage.setItem(STORAGE_KEY_SHORTCUT, oldSaved);
        return oldSaved;
      }
    } catch (e) {
    }
    const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
    return isMac ? "Meta+Alt+X" : DEFAULT_SHORTCUT;
  }
  function normalizeShortcut(shortcut) {
    const parts = shortcut.split("+").map((p) => p.trim());
    const modifiers = [];
    let key = parts[parts.length - 1];
    const modifierParts = parts.slice(0, -1);
    for (const mod of modifierParts) {
      const normalized = mod.charAt(0).toUpperCase() + mod.slice(1).toLowerCase();
      modifiers.push(normalized);
    }
    key = key.toUpperCase();
    return [...modifiers, key].join("+");
  }
  async function setShortcut(shortcut) {
    const normalized = normalizeShortcut(shortcut);
    await Risuai.pluginStorage.setItem(STORAGE_KEY_SHORTCUT, normalized);
  }
  function parseShortcut(shortcut) {
    const parts = shortcut.split("+").map((p) => p.trim());
    let key = parts[parts.length - 1];
    const modifierParts = parts.slice(0, -1);
    return {
      ctrl: modifierParts.includes("Ctrl"),
      alt: modifierParts.includes("Alt"),
      shift: modifierParts.includes("Shift"),
      meta: modifierParts.includes("Cmd") || modifierParts.includes("Meta"),
      key: key.toUpperCase()
    };
  }
  function isShortcutMatch(event, shortcut) {
    const parsed = parseShortcut(shortcut);
    const ctrlOrMetaPressed = event.ctrlKey || event.metaKey;
    const modifiersMatch = ctrlOrMetaPressed === (parsed.ctrl || parsed.meta) && event.altKey === parsed.alt && event.shiftKey === parsed.shift;
    const normalizedCode = event.code.replace("Key", "").toUpperCase();
    const keyMatch = normalizedCode === parsed.key.toUpperCase();
    return modifiersMatch && keyMatch;
  }
  function formatShortcutDisplay(shortcut) {
    const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
    if (isMac) {
      return shortcut.replace(/Ctrl|Meta|Cmd/g, "\u2318").replace("Alt", "\u2325").replace("Shift", "\u21E7");
    }
    return shortcut;
  }

  // src/storage.ts
  var STORAGE_KEYS = {
    PRESETS: "presets",
    CHARACTER_THEME_MAP: "characterThemeMap",
    DEFAULT_THEME: "defaultTheme",
    SHARED_CSS: "sharedCSS"
  };
  var currentLoadedPreset = null;
  function getCurrentPresetName() {
    return currentLoadedPreset;
  }
  function deepClone(obj) {
    if (obj === null || obj === void 0) {
      return obj;
    }
    return JSON.parse(JSON.stringify(obj));
  }
  async function getSharedCSS() {
    try {
      const data = await Risuai.pluginStorage.getItem(STORAGE_KEYS.SHARED_CSS);
      return typeof data === "string" ? data : "";
    } catch (e) {
      console.error("Failed to get shared CSS:", e);
      return "";
    }
  }
  async function saveSharedCSS(css) {
    try {
      await Risuai.pluginStorage.setItem(STORAGE_KEYS.SHARED_CSS, css);
      console.log("Shared CSS saved successfully");
    } catch (e) {
      console.error("Failed to save shared CSS:", e);
    }
  }
  function combineCSS(sharedCSS, themeCSS) {
    if (!sharedCSS && !themeCSS)
      return "";
    if (!sharedCSS)
      return themeCSS;
    if (!themeCSS)
      return sharedCSS + "\n\n" + SHARED_CSS_SEPARATOR + "\n";
    return sharedCSS + "\n\n" + SHARED_CSS_SEPARATOR + "\n\n" + themeCSS;
  }
  async function getPresets() {
    try {
      const data = await Risuai.pluginStorage.getItem(STORAGE_KEYS.PRESETS);
      if (typeof data === "string") {
        const presets = JSON.parse(data);
        return Array.isArray(presets) ? presets : [];
      }
      if (Array.isArray(data)) {
        return JSON.parse(JSON.stringify(data));
      }
      return [];
    } catch (e) {
      console.error("Failed to get presets:", e);
      return [];
    }
  }
  async function savePresets(presets) {
    try {
      await Risuai.pluginStorage.setItem(STORAGE_KEYS.PRESETS, JSON.stringify(presets));
    } catch (e) {
      console.error("Failed to save presets:", e);
    }
  }
  async function reorderPresets(fromIndex, toIndex) {
    const presets = await getPresets();
    if (fromIndex < 0 || fromIndex >= presets.length || toIndex < 0 || toIndex >= presets.length) {
      return false;
    }
    const [removed] = presets.splice(fromIndex, 1);
    presets.splice(toIndex, 0, removed);
    await savePresets(presets);
    return true;
  }
  async function saveCurrentTheme(presetName) {
    const db = deepClone(await Risuai.getDatabase(["customCSS", "guiHTML", "theme", "colorSchemeName", "textTheme"]));
    const presets = await getPresets();
    let cssToSave = db?.customCSS || "";
    const sharedCSS = await getSharedCSS();
    const fullCSS = cssToSave;
    if (sharedCSS && fullCSS.startsWith(sharedCSS)) {
      cssToSave = fullCSS.substring(sharedCSS.length).trim();
      if (cssToSave.startsWith(SHARED_CSS_SEPARATOR)) {
        cssToSave = cssToSave.substring(SHARED_CSS_SEPARATOR.length).trim();
      }
    }
    const newPreset = {
      name: presetName,
      customCSS: cssToSave,
      guiHTML: db?.guiHTML || "",
      theme: db?.theme || "",
      colorSchemeName: db?.colorSchemeName || "",
      textTheme: db?.textTheme || "standard",
      timestamp: Date.now()
    };
    const filtered = presets.filter((p) => p.name !== presetName);
    filtered.push(newPreset);
    await savePresets(filtered);
    currentLoadedPreset = presetName;
    console.log(`Theme preset "${presetName}" saved successfully`);
    return newPreset;
  }
  async function loadThemePreset(presetName) {
    const presets = await getPresets();
    const preset = presets.find((p) => p.name === presetName);
    if (!preset) {
      console.error(`Theme preset "${presetName}" not found`);
      return false;
    }
    const sharedCSS = await getSharedCSS();
    const themeCSS = preset.customCSS || "";
    const finalCSS = combineCSS(sharedCSS, themeCSS);
    const dbUpdate = {
      customCSS: finalCSS,
      guiHTML: preset.guiHTML || "",
      theme: preset.theme || "",
      colorSchemeName: preset.colorSchemeName || "",
      textTheme: preset.textTheme || "standard"
    };
    await Risuai.setDatabase(dbUpdate);
    const customCSS = finalCSS;
    try {
      const rootDoc = await Risuai.getRootDocument();
      let existingStyle = await rootDoc.querySelector("#customcss");
      if (!existingStyle) {
        existingStyle = await rootDoc.querySelector('style[x-id="customcss"]');
      }
      if (existingStyle) {
        await existingStyle.setInnerHTML(customCSS);
      } else {
        const styleElement = rootDoc.createElement("style");
        await styleElement.setAttribute("x-id", "customcss");
        await styleElement.setInnerHTML(customCSS);
        const head = await rootDoc.querySelector("head");
        if (head) {
          await head.appendChild(styleElement);
        }
      }
    } catch (e) {
      console.log("Could not apply custom CSS directly:", e);
    }
    currentLoadedPreset = presetName;
    console.log(`Theme preset "${presetName}" loaded successfully!`);
    return true;
  }
  async function renameThemePreset(oldName, newName) {
    const presets = await getPresets();
    const preset = presets.find((p) => p.name === oldName);
    if (!preset) {
      console.error(`Theme preset "${oldName}" not found`);
      return false;
    }
    const conflict = presets.find((p) => p.name === newName && p.name !== oldName);
    if (conflict) {
      console.error(`Theme preset "${newName}" already exists`);
      return false;
    }
    preset.name = newName;
    preset.timestamp = Date.now();
    await savePresets(presets);
    const map = await getCharacterThemeMap();
    let updated = false;
    for (const [charName, themeName] of Object.entries(map)) {
      if (themeName === oldName) {
        map[charName] = newName;
        updated = true;
      }
    }
    if (updated) {
      await saveCharacterThemeMap(map);
    }
    if (await getDefaultTheme() === oldName) {
      await setDefaultTheme(newName);
    }
    if (currentLoadedPreset === oldName) {
      currentLoadedPreset = newName;
    }
    console.log(`Theme preset renamed: "${oldName}" -> "${newName}"`);
    return true;
  }
  async function deleteThemePreset(presetName) {
    const presets = await getPresets();
    const filtered = presets.filter((p) => p.name !== presetName);
    if (filtered.length === presets.length) {
      console.error(`Theme preset "${presetName}" not found`);
      return false;
    }
    await savePresets(filtered);
    if (currentLoadedPreset === presetName) {
      currentLoadedPreset = null;
    }
    console.log(`Theme preset "${presetName}" deleted successfully`);
    return true;
  }
  async function listThemePresets() {
    const presets = await getPresets();
    return presets.map((p) => ({
      name: p.name,
      timestamp: p.timestamp,
      hasCSS: !!p.customCSS,
      hasHTML: !!p.guiHTML,
      theme: p.theme,
      colorSchemeName: p.colorSchemeName,
      textTheme: p.textTheme
    }));
  }
  async function exportThemePreset(presetName) {
    const presets = await getPresets();
    const preset = presets.find((p) => p.name === presetName);
    if (!preset) {
      console.error(`Theme preset "${presetName}" not found`);
      return null;
    }
    return JSON.stringify(preset, null, 2);
  }
  async function importThemePreset(presetJson) {
    try {
      const preset = JSON.parse(presetJson);
      if (!preset.name || typeof preset.name !== "string") {
        console.error("Invalid preset format: missing name");
        return false;
      }
      const presets = await getPresets();
      const filtered = presets.filter((p) => p.name !== preset.name);
      preset.timestamp = Date.now();
      filtered.push(preset);
      await savePresets(filtered);
      console.log(`Theme preset "${preset.name}" imported successfully`);
      return true;
    } catch (e) {
      console.error("Failed to import theme preset:", e);
      return false;
    }
  }
  async function getCharacterThemeMap() {
    try {
      const data = await Risuai.pluginStorage.getItem(STORAGE_KEYS.CHARACTER_THEME_MAP);
      if (typeof data === "string") {
        const map = JSON.parse(data);
        return typeof map === "object" && map !== null ? map : {};
      }
      if (typeof data === "object" && data !== null) {
        return deepClone(data);
      }
      return {};
    } catch (e) {
      console.error("Failed to get character theme map:", e);
      return {};
    }
  }
  async function saveCharacterThemeMap(map) {
    try {
      await Risuai.pluginStorage.setItem(STORAGE_KEYS.CHARACTER_THEME_MAP, JSON.stringify(map));
    } catch (e) {
      console.error("Failed to save character theme map:", e);
    }
  }
  async function addCharacterThemeMapping(charName, themeName) {
    const map = await getCharacterThemeMap();
    map[charName] = themeName;
    await saveCharacterThemeMap(map);
    console.log(`Character "${charName}" mapped to theme "${themeName}"`);
  }
  async function removeCharacterThemeMapping(charName) {
    const map = await getCharacterThemeMap();
    delete map[charName];
    await saveCharacterThemeMap(map);
    console.log(`Character "${charName}" mapping removed`);
  }
  async function getDefaultTheme() {
    try {
      const value = await Risuai.pluginStorage.getItem(STORAGE_KEYS.DEFAULT_THEME);
      return typeof value === "string" ? value : "";
    } catch (e) {
      return "";
    }
  }
  async function setDefaultTheme(themeName) {
    await Risuai.pluginStorage.setItem(STORAGE_KEYS.DEFAULT_THEME, themeName);
  }
  async function migrateFromArgumentStorage() {
    try {
      const existingPresets = await Risuai.pluginStorage.getItem(STORAGE_KEYS.PRESETS);
      if (existingPresets) {
        const hasData = typeof existingPresets === "string" ? existingPresets.length > 2 : Array.isArray(existingPresets) && existingPresets.length > 0;
        if (hasData) {
          return;
        }
      }
      console.log("Theme Preset Manager: Checking for data to migrate...");
      const oldPresetsJson = await Risuai.getArgument(`${PLUGIN_NAME}::presets`);
      if (oldPresetsJson && oldPresetsJson !== "") {
        try {
          const oldPresets = JSON.parse(oldPresetsJson);
          if (Array.isArray(oldPresets) && oldPresets.length > 0) {
            await Risuai.pluginStorage.setItem(STORAGE_KEYS.PRESETS, JSON.stringify(oldPresets));
            console.log(`Migrated ${oldPresets.length} presets to pluginStorage`);
          }
        } catch (e) {
          console.error("Failed to parse old presets for migration:", e);
        }
      }
      const oldMapJson = await Risuai.getArgument(`${PLUGIN_NAME}::characterThemeMap`);
      if (oldMapJson && oldMapJson !== "") {
        try {
          const oldMap = JSON.parse(oldMapJson);
          if (typeof oldMap === "object" && Object.keys(oldMap).length > 0) {
            await Risuai.pluginStorage.setItem(STORAGE_KEYS.CHARACTER_THEME_MAP, JSON.stringify(oldMap));
            console.log(`Migrated ${Object.keys(oldMap).length} character mappings to pluginStorage`);
          }
        } catch (e) {
          console.error("Failed to parse old character theme map for migration:", e);
        }
      }
      const oldDefaultTheme = await Risuai.getArgument(`${PLUGIN_NAME}::defaultTheme`);
      if (oldDefaultTheme && oldDefaultTheme !== "") {
        await Risuai.pluginStorage.setItem(STORAGE_KEYS.DEFAULT_THEME, oldDefaultTheme);
        console.log(`Migrated default theme: ${oldDefaultTheme}`);
      }
      const oldAutoSwitch = await Risuai.getArgument(`${PLUGIN_NAME}::autoSwitch`);
      if (oldAutoSwitch && oldAutoSwitch !== "") {
        await Risuai.pluginStorage.setItem("autoSwitch", oldAutoSwitch);
        console.log(`Migrated auto-switch setting: ${oldAutoSwitch}`);
      }
    } catch (e) {
      console.error("Migration failed:", e);
    }
  }

  // src/auto-switch.ts
  var autoSwitchInterval = null;
  var lastCharacterName = null;
  var lastCharacterIndex = -1;
  var STORAGE_KEY_AUTO_SWITCH = "autoSwitch";
  async function getAutoSwitchEnabled() {
    try {
      const value = await Risuai.pluginStorage.getItem(STORAGE_KEY_AUTO_SWITCH);
      if (typeof value === "string") {
        return value === "true";
      }
      return value === true;
    } catch (e) {
      return false;
    }
  }
  async function setAutoSwitchEnabled(enabled) {
    await Risuai.pluginStorage.setItem(STORAGE_KEY_AUTO_SWITCH, enabled ? "true" : "false");
    if (enabled) {
      await startAutoSwitch();
    } else {
      stopAutoSwitch();
    }
  }
  async function checkAndSwitchTheme() {
    if (!await getAutoSwitchEnabled()) {
      return;
    }
    let currentIndex;
    try {
      currentIndex = await Risuai.getCurrentCharacterIndex();
    } catch (e) {
      return;
    }
    if (currentIndex === lastCharacterIndex) {
      return;
    }
    lastCharacterIndex = currentIndex;
    let char = null;
    try {
      char = await Risuai.getCharacter();
    } catch (e) {
      return;
    }
    if (!char || !char.name) {
      return;
    }
    if (char.name === lastCharacterName) {
      return;
    }
    lastCharacterName = char.name;
    try {
      const map = await getCharacterThemeMap();
      const themeName = map[char.name];
      const targetTheme = themeName || await getDefaultTheme();
      if (!targetTheme)
        return;
      if (getCurrentPresetName() === targetTheme)
        return;
      console.log(`Auto-switching to theme: ${targetTheme} for character: ${char.name}`);
      await loadThemePreset(targetTheme);
      setTimeout(async () => {
        try {
          await loadThemePreset(targetTheme);
        } catch (e) {
        }
      }, 500);
    } catch (e) {
      console.error("Failed to apply theme:", e);
    }
  }
  async function startAutoSwitch() {
    if (autoSwitchInterval !== null) {
      return;
    }
    console.log("Theme auto-switch enabled");
    await checkAndSwitchTheme();
    setTimeout(async () => await checkAndSwitchTheme(), 1e3);
    setTimeout(async () => await checkAndSwitchTheme(), 2e3);
    autoSwitchInterval = window.setInterval(async () => {
      await checkAndSwitchTheme();
    }, CHAR_POLL_INTERVAL);
  }
  function stopAutoSwitch() {
    if (autoSwitchInterval !== null) {
      clearInterval(autoSwitchInterval);
      autoSwitchInterval = null;
      lastCharacterName = null;
      lastCharacterIndex = -1;
      console.log("Theme auto-switch disabled");
    }
  }
  async function initAutoSwitch() {
    if (await getAutoSwitchEnabled()) {
      await startAutoSwitch();
    }
  }

  // src/ui.ts
  var windowState = {
    window: null,
    overlay: null,
    isDragging: false,
    dragOffset: { x: 0, y: 0 }
  };
  var grantedPermissions = /* @__PURE__ */ new Set();
  var deniedPermissions = /* @__PURE__ */ new Set();
  var PERMISSION_LABELS = {
    db: "Database access",
    mainDom: "Main document access"
  };
  async function requestPermission(permission) {
    if (grantedPermissions.has(permission))
      return true;
    if (deniedPermissions.has(permission)) {
      showModal({
        title: "\u26A0\uFE0F Permission Required",
        content: `"${PERMISSION_LABELS[permission] || permission}" permission was denied.<br>Please refresh the app to request it again.`,
        buttons: [{ text: "OK", primary: true }]
      });
      return false;
    }
    await Risuai.hideContainer();
    const granted = await Risuai.requestPluginPermission(permission);
    await Risuai.showContainer("fullscreen");
    if (granted) {
      grantedPermissions.add(permission);
    } else {
      deniedPermissions.add(permission);
    }
    return granted;
  }
  function showModal(options) {
    const { title, content, buttons = [], input = null } = options;
    const overlay = document.createElement("div");
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        z-index: 10001;
        display: flex;
        align-items: center;
        justify-content: center;
    `;
    const modal = document.createElement("div");
    modal.style.cssText = `
        background: var(--risu-theme-darkbg, #1a1a1a);
        border: 2px solid var(--risu-theme-darkborderc, #333);
        border-radius: 12px;
        padding: 24px;
        min-width: 300px;
        max-width: 500px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
    `;
    modal.innerHTML = `
        <h3 style="margin: 0 0 16px 0; color: var(--risu-theme-textcolor, #fff); font-size: 1.2em; font-weight: 600;">${title}</h3>
        <div style="color: var(--risu-theme-textcolor2, #ccc); margin-bottom: 20px; line-height: 1.5;">${content}</div>
        ${input ? `<input type="text" id="modal-input" value="${input.value || ""}" placeholder="${input.placeholder || ""}" style="
            width: 100%;
            padding: 10px 12px;
            border-radius: 6px;
            border: 1px solid var(--risu-theme-darkborderc, #333);
            background: var(--risu-theme-bgcolor, #2a2a2a);
            color: var(--risu-theme-textcolor, #fff);
            font-size: 0.95em;
            margin-bottom: 16px;
        ">` : ""}
        <div style="display: flex; gap: 10px; justify-content: flex-end;">
        </div>
    `;
    const buttonContainer = modal.querySelector("div:last-child");
    buttons.forEach((btn) => {
      const button = document.createElement("button");
      button.textContent = btn.text;
      button.style.cssText = `
            padding: 10px 20px;
            border-radius: 6px;
            border: none;
            background: ${btn.primary ? "var(--risu-theme-selected, #4a9eff)" : "var(--risu-theme-darkbutton, #444)"};
            color: var(--risu-theme-textcolor, #fff);
            cursor: pointer;
            font-weight: ${btn.primary ? "600" : "500"};
            transition: all 0.2s;
        `;
      button.onmouseover = () => {
        button.style.transform = "translateY(-1px)";
        button.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.3)";
      };
      button.onmouseout = () => {
        button.style.transform = "";
        button.style.boxShadow = "";
      };
      button.onclick = () => {
        const inputEl = modal.querySelector("#modal-input");
        const inputValue = input ? inputEl?.value : null;
        overlay.remove();
        if (btn.onClick)
          btn.onClick(inputValue);
      };
      buttonContainer.appendChild(button);
    });
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    if (input) {
      const inputEl = modal.querySelector("#modal-input");
      setTimeout(() => inputEl?.focus(), FOCUS_DELAY);
      inputEl?.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          const primaryBtn = buttons.find((b) => b.primary);
          if (primaryBtn) {
            overlay.remove();
            primaryBtn.onClick(inputEl.value);
          }
        }
      });
    }
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }
    });
  }
  function showButtonFeedback(button, successText, originalText, successColor = "var(--draculared, #50fa7b)") {
    const origText = originalText || button.textContent || "";
    const origBg = button.style.background;
    button.textContent = successText;
    button.style.background = successColor;
    setTimeout(() => {
      button.textContent = origText;
      button.style.background = origBg;
    }, FEEDBACK_TIMEOUT);
  }
  function createFloatingWindow() {
    if (windowState.window) {
      return windowState.window;
    }
    if (!document.getElementById("theme-preset-mobile-styles")) {
      const style = document.createElement("style");
      style.id = "theme-preset-mobile-styles";
      style.textContent = `
            /* Mobile responsive layout for preset items */
            @media screen and (max-width: 600px) {
                .preset-item {
                    flex-direction: column !important;
                    align-items: stretch !important;
                }

                .preset-info {
                    flex: 1 1 100% !important;
                    width: 100% !important;
                    margin-bottom: 8px !important;
                }

                .preset-buttons {
                    width: 100% !important;
                    justify-content: center !important;
                }

                #theme-preset-floating-window {
                    width: 95vw !important;
                    max-height: 90vh !important;
                }
            }

            /* Tab button styles */
            .tab-btn {
                padding: 10px 16px;
                border: none;
                background: transparent;
                color: var(--risu-theme-textcolor2, #888);
                cursor: pointer;
                font-size: 0.9em;
                font-weight: 500;
                border-bottom: 2px solid transparent;
                transition: all 0.2s;
            }
            .tab-btn:hover {
                color: var(--risu-theme-textcolor, #fff);
            }
            .tab-btn.active {
                color: var(--risu-theme-textcolor, #fff);
                border-bottom-color: var(--risu-theme-selected, #4a9eff);
            }

            /* Editor textarea styles */
            .css-editor-textarea {
                width: 100%;
                min-height: 300px;
                padding: 12px;
                border-radius: 6px;
                border: 1px solid var(--risu-theme-darkborderc, #333);
                background: var(--risu-theme-bgcolor, #2a2a2a);
                color: var(--risu-theme-textcolor, #fff);
                font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
                font-size: 12px;
                line-height: 1.5;
                resize: vertical;
                box-sizing: border-box;
            }
            .css-editor-textarea:focus {
                outline: none;
                border-color: var(--risu-theme-selected, #4a9eff);
            }
        `;
      document.head.appendChild(style);
    }
    const overlay = document.createElement("div");
    overlay.id = "theme-preset-overlay";
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        z-index: 9999;
        display: none;
    `;
    document.body.appendChild(overlay);
    windowState.overlay = overlay;
    const container = document.createElement("div");
    container.id = "theme-preset-floating-window";
    container.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 600px;
        max-width: 90vw;
        max-height: 85vh;
        background: var(--risu-theme-darkbg, #1a1a1a);
        border: 2px solid var(--risu-theme-darkborderc, #333);
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
        z-index: 10000;
        display: none;
        flex-direction: column;
        font-family: system-ui, -apple-system, sans-serif;
    `;
    container.innerHTML = `
        <div id="preset-window-header" style="
            padding: 15px 20px;
            background: var(--risu-theme-bgcolor, #2a2a2a);
            border-bottom: 1px solid var(--risu-theme-darkborderc, #333);
            border-radius: 10px 10px 0 0;
            cursor: move;
            display: flex;
            justify-content: space-between;
            align-items: center;
            user-select: none;
        ">
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 1.2em;">\u{1F3A8}</span>
                <h3 style="margin: 0; color: var(--risu-theme-textcolor, #fff); font-size: 1.1em; font-weight: 600;">Theme Preset Manager</h3>
            </div>
            <button id="close-preset-window" style="
                background: transparent;
                border: none;
                color: var(--risu-theme-textcolor2, #888);
                font-size: 1.5em;
                cursor: pointer;
                padding: 0;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 4px;
                transition: all 0.2s;
            ">
                \xD7
            </button>
        </div>

        <!-- Tab Navigation -->
        <div style="display: flex; border-bottom: 1px solid var(--risu-theme-darkborderc, #333); background: var(--risu-theme-bgcolor, #2a2a2a);">
            <button class="tab-btn active" data-tab="presets">\u{1F4E6} \uD504\uB9AC\uC14B</button>
            <button class="tab-btn" data-tab="editor">\u270F\uFE0F CSS/HTML \uC5D0\uB514\uD130</button>
            <button class="tab-btn" data-tab="autoswitch">\u26A1 \uC790\uB3D9 \uC804\uD658</button>
        </div>

        <div style="padding: 20px; overflow-y: auto; flex: 1;">
            <!-- Presets Tab -->
            <div id="tab-presets" class="tab-content">
                <!-- Save Preset Section -->
                <div style="display: flex; gap: 10px; margin-bottom: 15px; flex-wrap: wrap;">
                    <input type="text" id="preset-name-input" placeholder="Enter preset name..."
                           style="flex: 1; min-width: 150px; padding: 10px 12px; border-radius: 6px; border: 1px solid var(--risu-theme-darkborderc, #333); background: var(--risu-theme-bgcolor, #2a2a2a); color: var(--risu-theme-textcolor, #fff); font-size: 0.95em;">
                    <button id="save-preset-btn" style="
                        padding: 10px 16px;
                        border-radius: 6px;
                        border: none;
                        background: var(--risu-theme-selected, #4a9eff);
                        color: var(--risu-theme-textcolor, #fff);
                        cursor: pointer;
                        font-weight: 600;
                        font-size: 0.95em;
                        transition: all 0.2s;
                    ">
                        \u{1F4BE} Save Current
                    </button>
                </div>

                <!-- Import/Export Section -->
                <div style="
                    border-top: 1px solid var(--risu-theme-darkborderc, #333);
                    border-bottom: 1px solid var(--risu-theme-darkborderc, #333);
                    padding: 12px 0;
                    margin-bottom: 20px;
                ">
                    <div style="color: var(--risu-theme-textcolor2, #888); font-size: 0.8em; margin-bottom: 8px; text-align: center;">Import/Export</div>
                    <div style="display: grid; grid-template-columns: 1fr; gap: 10px;">
                        <button id="import-preset-file-btn" style="
                            padding: 10px 16px;
                            border-radius: 6px;
                            border: 1px solid var(--risu-theme-darkborderc, #333);
                            background: var(--risu-theme-darkbutton, #333);
                            color: var(--risu-theme-textcolor, #fff);
                            cursor: pointer;
                            font-weight: 500;
                            font-size: 0.9em;
                            transition: all 0.2s;
                        " title="Import a single theme preset file">
                            \u{1F4C2} Import Theme File
                        </button>
                    </div>
                    <div style="color: var(--risu-theme-textcolor2, #888); font-size: 0.8em; margin: 12px 0 8px 0; text-align: center;">Complete Backup</div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <button id="export-all-btn" style="
                            padding: 10px 16px;
                            border-radius: 6px;
                            border: 1px solid var(--risu-theme-darkborderc, #333);
                            background: var(--risu-theme-darkbutton, #333);
                            color: var(--risu-theme-textcolor, #fff);
                            cursor: pointer;
                            font-weight: 500;
                            font-size: 0.9em;
                            transition: all 0.2s;
                        " title="Export all themes + character mappings">
                            \u{1F4E6} Export Backup
                        </button>
                        <button id="import-all-btn" style="
                            padding: 10px 16px;
                            border-radius: 6px;
                            border: 1px solid var(--risu-theme-darkborderc, #333);
                            background: var(--risu-theme-darkbutton, #333);
                            color: var(--risu-theme-textcolor, #fff);
                            cursor: pointer;
                            font-weight: 500;
                            font-size: 0.9em;
                            transition: all 0.2s;
                        " title="Import all themes + character mappings">
                            \u{1F4E5} Import Backup
                        </button>
                    </div>
                </div>

                <h4 style="color: var(--risu-theme-textcolor, #fff); margin: 20px 0 10px 0;">Saved Presets</h4>
                <div id="preset-list" style="display: flex; flex-direction: column; gap: 8px;">
                    <!-- Preset items will be added here dynamically -->
                </div>
            </div>

            <!-- Editor Tab -->
            <div id="tab-editor" class="tab-content" style="display: none;">
                <!-- Custom HTML Section -->
                <div style="margin-bottom: 20px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <h4 style="color: var(--risu-theme-textcolor, #fff); margin: 0;">\u{1F5BC}\uFE0F \uCEE4\uC2A4\uD140 HTML</h4>
                        <div style="display: flex; gap: 8px;">
                            <button id="refresh-current-html-btn" style="
                                padding: 6px 12px;
                                border-radius: 4px;
                                border: 1px solid var(--risu-theme-darkborderc, #333);
                                background: var(--risu-theme-darkbutton, #333);
                                color: var(--risu-theme-textcolor, #fff);
                                cursor: pointer;
                                font-size: 0.8em;
                            ">\uC0C8\uB85C\uACE0\uCE68</button>
                            <button id="apply-current-html-btn" style="
                                padding: 6px 12px;
                                border-radius: 4px;
                                border: none;
                                background: var(--risu-theme-selected, #4a9eff);
                                color: var(--risu-theme-textcolor, #fff);
                                cursor: pointer;
                                font-size: 0.8em;
                                font-weight: 600;
                            ">\uC801\uC6A9</button>
                        </div>
                    </div>
                    <div style="color: var(--risu-theme-textcolor2, #888); font-size: 0.8em; margin-bottom: 8px;">
                        \uD604\uC7AC \uC801\uC6A9\uB41C \uCEE4\uC2A4\uD140 HTML (GUI HTML)\uC785\uB2C8\uB2E4.
                    </div>
                    <textarea id="current-html-editor" class="css-editor-textarea" style="min-height: 180px;" placeholder="\uCEE4\uC2A4\uD140 HTML..."></textarea>
                </div>

                <!-- Shared CSS Section -->
                <div style="margin-bottom: 20px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <h4 style="color: var(--risu-theme-textcolor, #fff); margin: 0;">\u{1F527} \uACF5\uC6A9 CSS</h4>
                        <div style="display: flex; gap: 8px;">
                            <button id="load-shared-css-btn" style="
                                padding: 6px 12px;
                                border-radius: 4px;
                                border: 1px solid var(--risu-theme-darkborderc, #333);
                                background: var(--risu-theme-darkbutton, #333);
                                color: var(--risu-theme-textcolor, #fff);
                                cursor: pointer;
                                font-size: 0.8em;
                            ">\uBD88\uB7EC\uC624\uAE30</button>
                            <button id="save-shared-css-btn" style="
                                padding: 6px 12px;
                                border-radius: 4px;
                                border: none;
                                background: var(--risu-theme-selected, #4a9eff);
                                color: var(--risu-theme-textcolor, #fff);
                                cursor: pointer;
                                font-size: 0.8em;
                                font-weight: 600;
                            ">\uC800\uC7A5</button>
                        </div>
                    </div>
                    <div style="color: var(--risu-theme-textcolor2, #888); font-size: 0.8em; margin-bottom: 8px;">
                        \uBAA8\uB4E0 \uD14C\uB9C8\uC5D0\uC11C \uACF5\uD1B5\uC73C\uB85C \uC0AC\uC6A9\uB420 CSS\uC785\uB2C8\uB2E4. \uD14C\uB9C8 \uB85C\uB4DC \uC2DC \uC720\uC9C0\uB429\uB2C8\uB2E4.
                    </div>
                    <textarea id="shared-css-editor" class="css-editor-textarea" style="min-height: 200px;" placeholder="\uACF5\uC6A9 CSS\uB97C \uC785\uB825\uD558\uC138\uC694..."></textarea>
                </div>

                <!-- Current Theme CSS Section -->
                <div style="margin-bottom: 20px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <h4 style="color: var(--risu-theme-textcolor, #fff); margin: 0;">\u{1F3A8} \uD604\uC7AC \uD14C\uB9C8 CSS</h4>
                        <div style="display: flex; gap: 8px;">
                            <button id="refresh-current-css-btn" style="
                                padding: 6px 12px;
                                border-radius: 4px;
                                border: 1px solid var(--risu-theme-darkborderc, #333);
                                background: var(--risu-theme-darkbutton, #333);
                                color: var(--risu-theme-textcolor, #fff);
                                cursor: pointer;
                                font-size: 0.8em;
                            ">\uC0C8\uB85C\uACE0\uCE68</button>
                            <button id="apply-current-css-btn" style="
                                padding: 6px 12px;
                                border-radius: 4px;
                                border: none;
                                background: var(--risu-theme-selected, #4a9eff);
                                color: var(--risu-theme-textcolor, #fff);
                                cursor: pointer;
                                font-size: 0.8em;
                                font-weight: 600;
                            ">\uC801\uC6A9</button>
                        </div>
                    </div>
                    <div style="color: var(--risu-theme-textcolor2, #888); font-size: 0.8em; margin-bottom: 8px;">
                        \uD604\uC7AC \uD14C\uB9C8\uC758 CSS\uC785\uB2C8\uB2E4. '\uC801\uC6A9' \uBC84\uD2BC\uC744 \uB204\uB974\uBA74 \uACF5\uC6A9 CSS\uC640 \uD568\uAED8 \uC800\uC7A5\uB429\uB2C8\uB2E4.
                    </div>
                    <textarea id="current-css-editor" class="css-editor-textarea" style="min-height: 250px;" placeholder="\uD14C\uB9C8 CSS..."></textarea>
                </div>
            </div>

            <!-- Auto-Switch Tab -->
            <div id="tab-autoswitch" class="tab-content" style="display: none;">
                <div style="margin-bottom: 15px;">
                    <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; color: var(--risu-theme-textcolor, #fff);">
                        <input type="checkbox" id="auto-switch-toggle" style="cursor: pointer;">
                        <span>Enable automatic theme switching based on character</span>
                    </label>
                </div>

                <div id="auto-switch-content" style="display: none;">
                    <!-- Default Theme Display -->
                    <div id="default-theme-container" style="display: none; margin-bottom: 15px;">
                        <div style="color: var(--risu-theme-textcolor2, #aaa); font-size: 0.9em; margin-bottom: 5px;">
                            Default Theme:
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: var(--risu-theme-darkbg, #1a1a1a); border-radius: 6px; border: 1px solid var(--risu-theme-darkborderc, #333);">
                            <span id="default-theme-name" style="color: var(--risu-theme-textcolor, #fff); flex: 1;"></span>
                            <button id="remove-default-theme-btn"
                                style="padding: 4px 8px; background: var(--risu-theme-red, #d32f2f); color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.85em;"
                                title="Remove default theme">
                                Remove
                            </button>
                        </div>
                    </div>

                    <!-- Current Character Display -->
                    <div style="margin-bottom: 10px;">
                        <div style="color: var(--risu-theme-textcolor2, #aaa); font-size: 0.9em; margin-bottom: 5px;">
                            Current Character: <strong id="current-character-name" style="color: var(--risu-theme-textcolor, #fff);">-</strong>
                        </div>
                    </div>

                    <!-- Character Theme Mappings List -->
                    <div style="margin-bottom: 15px;">
                        <div style="color: var(--risu-theme-textcolor2, #aaa); font-size: 0.9em; margin-bottom: 5px;">
                            Character Mappings:
                        </div>
                        <div id="character-mapping-list"
                            style="max-height: 200px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; padding: 8px; background: var(--risu-theme-darkbg, #1a1a1a); border-radius: 6px; border: 1px solid var(--risu-theme-darkborderc, #333);">
                            <div style="color: var(--risu-theme-textcolor2, #666); font-size: 0.9em; text-align: center; padding: 10px;">
                                No character mappings yet
                            </div>
                        </div>
                    </div>

                    <!-- Add Mapping Form -->
                    <div style="padding: 12px; background: var(--risu-theme-darkbg, #1a1a1a); border-radius: 6px; border: 1px solid var(--risu-theme-darkborderc, #333);">
                        <div style="color: var(--risu-theme-textcolor, #fff); font-size: 0.9em; margin-bottom: 10px; font-weight: 500;">
                            Add New Mapping:
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 10px;">
                            <div>
                                <label style="color: var(--risu-theme-textcolor2, #aaa); font-size: 0.85em; display: block; margin-bottom: 4px;">
                                    Character:
                                </label>
                                <input type="text" id="add-mapping-character" readonly
                                    style="width: 100%; padding: 8px; background: var(--risu-theme-bg, #2a2a2a); color: var(--risu-theme-textcolor, #fff); border: 1px solid var(--risu-theme-darkborderc, #333); border-radius: 4px; box-sizing: border-box;"
                                    placeholder="Current character will appear here">
                            </div>
                            <div>
                                <label style="color: var(--risu-theme-textcolor2, #aaa); font-size: 0.85em; display: block; margin-bottom: 4px;">
                                    Theme:
                                </label>
                                <select id="add-mapping-theme"
                                    style="width: 100%; padding: 8px; background: var(--risu-theme-bg, #2a2a2a); color: var(--risu-theme-textcolor, #fff); border: 1px solid var(--risu-theme-darkborderc, #333); border-radius: 4px; cursor: pointer; box-sizing: border-box;">
                                    <option value="">Select a theme...</option>
                                </select>
                            </div>
                            <div style="display: flex; gap: 8px;">
                                <button id="add-mapping-btn"
                                    style="flex: 1; padding: 10px; background: var(--risu-theme-primary, #4a90e2); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; transition: opacity 0.2s;"
                                    onmouseover="this.style.opacity='0.8'"
                                    onmouseout="this.style.opacity='1'">
                                    \u2795 Add Mapping
                                </button>
                                <button id="set-as-default-btn"
                                    style="padding: 10px 16px; background: var(--risu-theme-green, #4caf50); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; transition: opacity 0.2s; white-space: nowrap;"
                                    onmouseover="this.style.opacity='0.8'"
                                    onmouseout="this.style.opacity='1'"
                                    title="Set selected theme as default for unmapped characters">
                                    Set as Default
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Hidden file input for imports -->
            <input type="file" id="import-file-input" accept=".json" style="display: none;">

            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--risu-theme-darkborderc, #333);">
                <div style="display: flex; align-items: center; justify-content: center; gap: 12px; flex-wrap: wrap;">
                    <div style="color: var(--risu-theme-textcolor2, #888); font-size: 0.85em;">
                        Press <strong id="shortcut-display" style="color: var(--risu-theme-textcolor, #fff);">...</strong> to toggle this window
                    </div>
                    <button id="change-shortcut-btn"
                        style="padding: 4px 10px; background: var(--risu-theme-darkbutton, #444); color: var(--risu-theme-textcolor, #fff); border: none; border-radius: 4px; cursor: pointer; font-size: 0.8em; transition: opacity 0.2s;"
                        onmouseover="this.style.opacity='0.8'"
                        onmouseout="this.style.opacity='1'"
                        title="Change keyboard shortcut">
                        \u2328\uFE0F Change
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(container);
    windowState.window = container;
    setupEventListeners();
    (async () => {
      await updatePresetList();
      await updateShortcutDisplay();
    })();
    return container;
  }
  function setupEventListeners() {
    const container = windowState.window;
    if (!container)
      return;
    const closeBtn = container.querySelector("#close-preset-window");
    closeBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      toggleFloatingWindow();
    });
    windowState.overlay?.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleFloatingWindow();
    });
    const tabBtns = container.querySelectorAll(".tab-btn");
    tabBtns.forEach((btn) => {
      btn.addEventListener("click", async () => {
        const tabName = btn.dataset.tab;
        if (!tabName)
          return;
        tabBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        container.querySelectorAll(".tab-content").forEach((content) => {
          content.style.display = "none";
        });
        const targetTab = container.querySelector(`#tab-${tabName}`);
        if (targetTab) {
          targetTab.style.display = "block";
        }
        windowState.currentTab = tabName;
        if (tabName === "editor") {
          await loadEditorData();
        }
        if (tabName === "autoswitch") {
          await updateAutoSwitchUI();
        }
      });
    });
    setupEditorEventListeners();
    const saveBtn = container.querySelector("#save-preset-btn");
    const nameInput = container.querySelector("#preset-name-input");
    saveBtn?.addEventListener("click", async () => {
      const name = nameInput?.value.trim();
      if (!name) {
        showModal({
          title: "\u26A0\uFE0F Error",
          content: "Please enter a preset name",
          buttons: [{ text: "OK", primary: true }]
        });
        return;
      }
      if (!await requestPermission("db"))
        return;
      await saveCurrentTheme(name);
      nameInput.value = "";
      await updatePresetList();
      showButtonFeedback(saveBtn, "\u2713 Saved!");
    });
    nameInput?.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        saveBtn?.dispatchEvent(new Event("click"));
      }
    });
    const importFileBtn = container.querySelector("#import-preset-file-btn");
    const fileInput = container.querySelector("#import-file-input");
    importFileBtn?.addEventListener("click", () => {
      fileInput?.click();
    });
    fileInput?.addEventListener("change", (e) => {
      const target = e.target;
      const file = target.files?.[0];
      if (!file)
        return;
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const json = event.target?.result;
          if (await importThemePreset(json)) {
            showModal({
              title: "\u2713 Success",
              content: "Theme preset imported successfully!",
              buttons: [
                { text: "OK", primary: true, onClick: () => {
                } }
              ]
            });
            await updatePresetList();
          } else {
            showModal({
              title: "\u274C Error",
              content: "Failed to import theme preset. Check console for errors.",
              buttons: [
                { text: "OK", primary: true, onClick: () => {
                } }
              ]
            });
          }
        } catch (error) {
          showModal({
            title: "\u274C Error",
            content: `Failed to read file: ${error.message}`,
            buttons: [
              { text: "OK", primary: true, onClick: () => {
              } }
            ]
          });
        }
        target.value = "";
      };
      reader.readAsText(file);
    });
    const exportAllBtn = container.querySelector("#export-all-btn");
    exportAllBtn?.addEventListener("click", async () => {
      const presets = await getPresets();
      const characterThemeMap = await getCharacterThemeMap();
      const defaultTheme = await getDefaultTheme();
      const autoSwitch = await getAutoSwitchEnabled();
      const sharedCSS = await getSharedCSS();
      if (presets.length === 0 && Object.keys(characterThemeMap).length === 0) {
        showModal({
          title: "\u26A0\uFE0F Warning",
          content: "No data to export",
          buttons: [
            { text: "OK", primary: true, onClick: () => {
            } }
          ]
        });
        return;
      }
      const backupData = {
        version: "1.0",
        exportDate: (/* @__PURE__ */ new Date()).toISOString(),
        themePresets: presets,
        characterThemeMap,
        defaultTheme,
        autoSwitchEnabled: autoSwitch,
        sharedCSS
      };
      const json = JSON.stringify(backupData, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `risu_theme_backup_${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      const charMappingCount = Object.keys(characterThemeMap).length;
      showModal({
        title: "\u2713 Success",
        content: `Exported complete theme backup:<br>\u2022 ${presets.length} theme preset(s)<br>\u2022 ${charMappingCount} character mapping(s)<br>\u2022 Default theme: ${defaultTheme || "none"}<br>\u2022 Shared CSS: ${sharedCSS ? "included" : "none"}`,
        buttons: [
          { text: "OK", primary: true, onClick: () => {
          } }
        ]
      });
    });
    const importAllBtn = container.querySelector("#import-all-btn");
    importAllBtn?.addEventListener("click", () => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json";
      input.onchange = (e) => {
        const target = e.target;
        const file = target.files?.[0];
        if (!file)
          return;
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const data = JSON.parse(event.target?.result);
            let backupData;
            let isOldFormat = false;
            if (Array.isArray(data)) {
              isOldFormat = true;
              backupData = {
                themePresets: data,
                characterThemeMap: {},
                defaultTheme: "",
                autoSwitchEnabled: false,
                sharedCSS: ""
              };
            } else if (data.version && data.themePresets) {
              backupData = data;
            } else {
              showModal({
                title: "\u274C Error",
                content: "Invalid file format. Expected theme backup file.",
                buttons: [
                  { text: "OK", primary: true, onClick: () => {
                  } }
                ]
              });
              return;
            }
            const rawPresets = backupData.themePresets || [];
            const presets = rawPresets.map((p) => ({
              name: p.name,
              customCSS: p.customCSS || "",
              guiHTML: p.guiHTML || "",
              theme: p.theme || "",
              colorSchemeName: p.colorSchemeName || "",
              textTheme: p.textTheme || "standard",
              timestamp: p.timestamp || Date.now()
              // Note: colorScheme and customTextTheme are intentionally omitted
            }));
            const characterThemeMap = backupData.characterThemeMap || {};
            const defaultTheme = backupData.defaultTheme || "";
            const autoSwitchEnabled = backupData.autoSwitchEnabled || false;
            const importSharedCSS = backupData.sharedCSS || "";
            const charMappingCount = Object.keys(characterThemeMap).length;
            const contentMsg = isOldFormat ? `Found ${presets.length} preset(s) (old format).<br>How would you like to import them?` : `Found complete theme backup:<br>\u2022 ${presets.length} theme preset(s)<br>\u2022 ${charMappingCount} character mapping(s)<br>\u2022 Default theme: ${defaultTheme || "none"}<br>\u2022 Shared CSS: ${importSharedCSS ? "included" : "none"}<br><br>How would you like to import them?`;
            showModal({
              title: "\u{1F4E5} Import Theme Backup",
              content: contentMsg,
              buttons: [
                {
                  text: "Replace All",
                  primary: false,
                  onClick: async () => {
                    await savePresets(presets);
                    await saveCharacterThemeMap(characterThemeMap);
                    await setDefaultTheme(defaultTheme);
                    await setAutoSwitchEnabled(autoSwitchEnabled);
                    if (importSharedCSS) {
                      await saveSharedCSS(importSharedCSS);
                    }
                    await updatePresetList();
                    showModal({
                      title: "\u2713 Success",
                      content: `Replaced all theme data:<br>\u2022 ${presets.length} preset(s)<br>\u2022 ${charMappingCount} character mapping(s)<br>\u2022 Default theme: ${defaultTheme || "none"}<br>\u2022 Shared CSS: ${importSharedCSS ? "restored" : "none"}`,
                      buttons: [
                        { text: "OK", primary: true, onClick: () => {
                        } }
                      ]
                    });
                  }
                },
                {
                  text: "Merge",
                  primary: true,
                  onClick: async () => {
                    const existing = await getPresets();
                    const merged = [...existing];
                    let addedPresets = 0;
                    for (const preset of presets) {
                      const existingIndex = merged.findIndex((p) => p.name === preset.name);
                      if (existingIndex >= 0) {
                        merged[existingIndex] = preset;
                      } else {
                        merged.push(preset);
                        addedPresets++;
                      }
                    }
                    await savePresets(merged);
                    const existingMap = await getCharacterThemeMap();
                    const mergedMap = { ...existingMap, ...characterThemeMap };
                    await saveCharacterThemeMap(mergedMap);
                    if (defaultTheme && !await getDefaultTheme()) {
                      await setDefaultTheme(defaultTheme);
                    }
                    if (importSharedCSS && !await getSharedCSS()) {
                      await saveSharedCSS(importSharedCSS);
                    }
                    await updatePresetList();
                    showModal({
                      title: "\u2713 Success",
                      content: `Merged theme data:<br>\u2022 ${addedPresets} new preset(s) added<br>\u2022 ${presets.length - addedPresets} preset(s) updated<br>\u2022 ${Object.keys(characterThemeMap).length} character mapping(s) added`,
                      buttons: [
                        { text: "OK", primary: true, onClick: () => {
                        } }
                      ]
                    });
                  }
                },
                {
                  text: "Cancel",
                  onClick: () => {
                  }
                }
              ]
            });
          } catch (error) {
            showModal({
              title: "\u274C Error",
              content: `Failed to parse file: ${error.message}`,
              buttons: [
                { text: "OK", primary: true, onClick: () => {
                } }
              ]
            });
          }
        };
        reader.readAsText(file);
      };
      input.click();
    });
    const autoSwitchToggle = container.querySelector("#auto-switch-toggle");
    const autoSwitchContent = container.querySelector("#auto-switch-content");
    if (autoSwitchToggle) {
      (async () => {
        autoSwitchToggle.checked = await getAutoSwitchEnabled();
        if (autoSwitchToggle.checked) {
          autoSwitchContent.style.display = "block";
          await updateAutoSwitchUI();
        }
      })();
      autoSwitchToggle.addEventListener("change", async () => {
        const enabled = autoSwitchToggle.checked;
        await setAutoSwitchEnabled(enabled);
        if (enabled) {
          autoSwitchContent.style.display = "block";
          await updateAutoSwitchUI();
          await startAutoSwitch();
        } else {
          autoSwitchContent.style.display = "none";
          stopAutoSwitch();
        }
      });
    }
    const removeDefaultBtn = container.querySelector("#remove-default-theme-btn");
    removeDefaultBtn?.addEventListener("click", async () => {
      await setDefaultTheme("");
      await updateDefaultThemeDisplay();
      showButtonFeedback(removeDefaultBtn, "\u2713 Removed!");
    });
    const addMappingBtn = container.querySelector("#add-mapping-btn");
    const mappingCharInput = container.querySelector("#add-mapping-character");
    const mappingThemeSelect = container.querySelector("#add-mapping-theme");
    addMappingBtn?.addEventListener("click", async () => {
      const character = mappingCharInput?.value.trim();
      const themeName = mappingThemeSelect?.value;
      if (!character) {
        showModal({
          title: "\u26A0\uFE0F Error",
          content: "No character selected. Please select a character first.",
          buttons: [{ text: "OK", primary: true }]
        });
        return;
      }
      if (!themeName) {
        showModal({
          title: "\u26A0\uFE0F Error",
          content: "Please select a theme to map to this character.",
          buttons: [{ text: "OK", primary: true }]
        });
        return;
      }
      await addCharacterThemeMapping(character, themeName);
      await updateCharacterMappingList();
      await updateThemeSelectDropdown();
      showButtonFeedback(addMappingBtn, "\u2713 Added!");
    });
    const setDefaultBtn = container.querySelector("#set-as-default-btn");
    setDefaultBtn?.addEventListener("click", async () => {
      const themeName = mappingThemeSelect?.value;
      if (!themeName) {
        showModal({
          title: "\u26A0\uFE0F Error",
          content: "Please select a theme to set as default.",
          buttons: [{ text: "OK", primary: true }]
        });
        return;
      }
      await setDefaultTheme(themeName);
      await updateDefaultThemeDisplay();
      showButtonFeedback(setDefaultBtn, "\u2713 Set as Default!");
    });
    const changeShortcutBtn = container.querySelector("#change-shortcut-btn");
    changeShortcutBtn?.addEventListener("click", async () => {
      const currentShortcut = await getShortcut();
      showModal({
        title: "\u2328\uFE0F Change Keyboard Shortcut",
        content: `
                <div style="margin-bottom: 15px;">
                    <div style="margin-bottom: 10px; color: var(--risu-theme-textcolor2, #aaa);">
                        Current shortcut: <strong style="color: var(--risu-theme-textcolor, #fff);">${formatShortcutDisplay(currentShortcut)}</strong>
                    </div>
                    <div style="margin-bottom: 10px; color: var(--risu-theme-textcolor2, #aaa); font-size: 0.9em;">
                        Enter a new keyboard shortcut:
                    </div>
                    <div style="padding: 10px; background: var(--risu-theme-darkbg, #1a1a1a); border-radius: 6px; border: 1px solid var(--risu-theme-darkborderc, #333); margin-bottom: 10px;">
                        <div style="font-size: 0.85em; color: var(--risu-theme-textcolor2, #888); margin-bottom: 8px;">
                            Examples:
                        </div>
                        <div style="font-size: 0.85em; color: var(--risu-theme-textcolor2, #aaa); line-height: 1.6;">
                            \u2022 <code style="background: var(--risu-theme-bg, #2a2a2a); padding: 2px 6px; border-radius: 3px;">ctrl+shift+p</code><br>
                            \u2022 <code style="background: var(--risu-theme-bg, #2a2a2a); padding: 2px 6px; border-radius: 3px;">alt+t</code><br>
                            \u2022 <code style="background: var(--risu-theme-bg, #2a2a2a); padding: 2px 6px; border-radius: 3px;">ctrl+alt+shift+z</code>
                        </div>
                    </div>
                </div>
            `,
        input: {
          value: currentShortcut,
          placeholder: "e.g., ctrl+shift+p"
        },
        buttons: [
          {
            text: "Cancel",
            onClick: () => {
            }
          },
          {
            text: "Save",
            primary: true,
            onClick: async (inputValue) => {
              const newShortcut = inputValue?.trim().toLowerCase();
              if (!newShortcut) {
                showModal({
                  title: "\u26A0\uFE0F Error",
                  content: "Please enter a keyboard shortcut.",
                  buttons: [{ text: "OK", primary: true }]
                });
                return;
              }
              const validKeys = ["ctrl", "alt", "shift", "meta"];
              const parts = newShortcut.split("+").map((p) => p.trim());
              if (parts.length < 2) {
                showModal({
                  title: "\u26A0\uFE0F Invalid Shortcut",
                  content: "Shortcut must include at least one modifier key (ctrl, alt, shift) and one regular key.<br><br>Example: <code>ctrl+shift+p</code>",
                  buttons: [{ text: "OK", primary: true }]
                });
                return;
              }
              const lastKey = parts[parts.length - 1];
              const modifiers = parts.slice(0, -1);
              const hasModifier = modifiers.some((mod) => validKeys.includes(mod));
              if (!hasModifier) {
                showModal({
                  title: "\u26A0\uFE0F Invalid Shortcut",
                  content: "Shortcut must include at least one modifier key (ctrl, alt, shift).<br><br>Example: <code>ctrl+p</code>",
                  buttons: [{ text: "OK", primary: true }]
                });
                return;
              }
              const invalidModifiers = modifiers.filter((mod) => !validKeys.includes(mod));
              if (invalidModifiers.length > 0) {
                showModal({
                  title: "\u26A0\uFE0F Invalid Shortcut",
                  content: `Invalid modifier key(s): <strong>${invalidModifiers.join(", ")}</strong><br><br>Valid modifiers: ctrl, alt, shift, meta`,
                  buttons: [{ text: "OK", primary: true }]
                });
                return;
              }
              await setShortcut(newShortcut);
              await updateShortcutDisplay();
              showModal({
                title: "\u2713 Success",
                content: `Keyboard shortcut changed to: <strong>${formatShortcutDisplay(newShortcut)}</strong>`,
                buttons: [{ text: "OK", primary: true }]
              });
            }
          }
        ]
      });
    });
    const header = container.querySelector("#preset-window-header");
    let isDragging = false;
    let hasMoved = false;
    let dragOffset = { x: 0, y: 0 };
    header?.addEventListener("mousedown", (e) => {
      if (e.target.id === "close-preset-window") {
        return;
      }
      isDragging = true;
      hasMoved = false;
      const rect = container.getBoundingClientRect();
      dragOffset.x = e.clientX - rect.left;
      dragOffset.y = e.clientY - rect.top;
    });
    document.addEventListener("mousemove", (e) => {
      if (!isDragging)
        return;
      hasMoved = true;
      if (container.style.transform !== "none") {
        const rect = container.getBoundingClientRect();
        container.style.left = `${rect.left}px`;
        container.style.top = `${rect.top}px`;
        container.style.transform = "none";
      }
      const x = e.clientX - dragOffset.x;
      const y = e.clientY - dragOffset.y;
      container.style.left = `${x}px`;
      container.style.top = `${y}px`;
    });
    document.addEventListener("mouseup", () => {
      isDragging = false;
    });
  }
  async function loadEditorData() {
    const container = windowState.window;
    if (!container)
      return;
    if (!await requestPermission("db"))
      return;
    const htmlEditor = container.querySelector("#current-html-editor");
    const sharedCSSEditor = container.querySelector("#shared-css-editor");
    const themeCSSEditor = container.querySelector("#current-css-editor");
    try {
      const db = await Risuai.getDatabase(["customCSS", "guiHTML"]);
      const fullCSS = db?.customCSS || "";
      const guiHTML = db?.guiHTML || "";
      if (htmlEditor) {
        htmlEditor.value = guiHTML;
      }
      const sharedCSS = await getSharedCSS();
      if (sharedCSSEditor) {
        sharedCSSEditor.value = sharedCSS;
      }
      let themeCSS = fullCSS;
      if (sharedCSS && fullCSS.startsWith(sharedCSS)) {
        themeCSS = fullCSS.substring(sharedCSS.length).trim();
        if (themeCSS.startsWith(SHARED_CSS_SEPARATOR)) {
          themeCSS = themeCSS.substring(SHARED_CSS_SEPARATOR.length).trim();
        }
      }
      if (themeCSSEditor) {
        themeCSSEditor.value = themeCSS;
      }
    } catch (e) {
      console.error("Failed to load editor data:", e);
    }
  }
  function setupEditorEventListeners() {
    const container = windowState.window;
    if (!container)
      return;
    const loadSharedCSSBtn = container.querySelector("#load-shared-css-btn");
    const saveSharedCSSBtn = container.querySelector("#save-shared-css-btn");
    const sharedCSSEditor = container.querySelector("#shared-css-editor");
    loadSharedCSSBtn?.addEventListener("click", async () => {
      const sharedCSS = await getSharedCSS();
      if (sharedCSSEditor) {
        sharedCSSEditor.value = sharedCSS;
      }
      showButtonFeedback(loadSharedCSSBtn, "\u2713 \uBD88\uB7EC\uC634!");
    });
    saveSharedCSSBtn?.addEventListener("click", async () => {
      const css = sharedCSSEditor?.value || "";
      await saveSharedCSS(css);
      showButtonFeedback(saveSharedCSSBtn, "\u2713 \uC800\uC7A5\uB428!");
    });
    const refreshCSSBtn = container.querySelector("#refresh-current-css-btn");
    const applyCSSBtn = container.querySelector("#apply-current-css-btn");
    const themeCSSEditor = container.querySelector("#current-css-editor");
    refreshCSSBtn?.addEventListener("click", async () => {
      if (!await requestPermission("db"))
        return;
      const db = await Risuai.getDatabase(["customCSS"]);
      const fullCSS = db?.customCSS || "";
      const sharedCSS = await getSharedCSS();
      let themeCSS = fullCSS;
      if (sharedCSS && fullCSS.startsWith(sharedCSS)) {
        themeCSS = fullCSS.substring(sharedCSS.length).trim();
        if (themeCSS.startsWith(SHARED_CSS_SEPARATOR)) {
          themeCSS = themeCSS.substring(SHARED_CSS_SEPARATOR.length).trim();
        }
      }
      if (themeCSSEditor) {
        themeCSSEditor.value = themeCSS;
      }
      showButtonFeedback(refreshCSSBtn, "\u2713 \uC0C8\uB85C\uACE0\uCE68!");
    });
    applyCSSBtn?.addEventListener("click", async () => {
      if (!await requestPermission("db"))
        return;
      const themeCSS = themeCSSEditor?.value || "";
      const sharedCSS = await getSharedCSS();
      const finalCSS = combineCSS(sharedCSS, themeCSS);
      await Risuai.setDatabase({ customCSS: finalCSS });
      if (await requestPermission("mainDom")) {
        try {
          const rootDoc = await Risuai.getRootDocument();
          let existingStyle = await rootDoc.querySelector("#customcss");
          if (!existingStyle) {
            existingStyle = await rootDoc.querySelector('style[x-id="customcss"]');
          }
          if (existingStyle) {
            await existingStyle.setInnerHTML(finalCSS);
          }
        } catch (e) {
          console.log("Could not apply CSS directly:", e);
        }
      }
      showButtonFeedback(applyCSSBtn, "\u2713 \uC801\uC6A9\uB428!");
      promptSaveToPreset();
    });
    const refreshHTMLBtn = container.querySelector("#refresh-current-html-btn");
    const applyHTMLBtn = container.querySelector("#apply-current-html-btn");
    const htmlEditor = container.querySelector("#current-html-editor");
    refreshHTMLBtn?.addEventListener("click", async () => {
      if (!await requestPermission("db"))
        return;
      const db = await Risuai.getDatabase(["guiHTML"]);
      if (htmlEditor) {
        htmlEditor.value = db?.guiHTML || "";
      }
      showButtonFeedback(refreshHTMLBtn, "\u2713 \uC0C8\uB85C\uACE0\uCE68!");
    });
    applyHTMLBtn?.addEventListener("click", async () => {
      if (!await requestPermission("db"))
        return;
      const html = htmlEditor?.value || "";
      await Risuai.setDatabase({ guiHTML: html });
      showButtonFeedback(applyHTMLBtn, "\u2713 \uC801\uC6A9\uB428!");
      promptSaveToPreset();
    });
  }
  function promptSaveToPreset() {
    const presetName = getCurrentPresetName();
    if (!presetName)
      return;
    showModal({
      title: "\u{1F4BE} \uD504\uB9AC\uC14B\uC5D0\uB3C4 \uC800\uC7A5\uD560\uAE4C\uC694?",
      content: `\uD604\uC7AC \uB85C\uB4DC\uB41C \uD504\uB9AC\uC14B: <strong>${escapeHtml(presetName)}</strong><br><br>\uBCC0\uACBD \uC0AC\uD56D\uC744 \uC774 \uD504\uB9AC\uC14B\uC5D0\uB3C4 \uC800\uC7A5\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?`,
      buttons: [
        {
          text: "\uC544\uB2C8\uC624",
          primary: false,
          onClick: () => {
          }
        },
        {
          text: "\uC608, \uC800\uC7A5",
          primary: true,
          onClick: async () => {
            await saveCurrentTheme(presetName);
            await updatePresetList();
            showModal({
              title: "\u2713 \uC800\uC7A5 \uC644\uB8CC",
              content: `\uD504\uB9AC\uC14B "<strong>${escapeHtml(presetName)}</strong>"\uC774(\uAC00) \uC5C5\uB370\uC774\uD2B8\uB418\uC5C8\uC2B5\uB2C8\uB2E4.`,
              buttons: [{ text: "OK", primary: true, onClick: () => {
              } }]
            });
          }
        }
      ]
    });
  }
  async function updatePresetList() {
    const listContainer = windowState.window?.querySelector("#preset-list");
    if (!listContainer)
      return;
    const presets = await listThemePresets();
    listContainer.innerHTML = "";
    if (presets.length === 0) {
      listContainer.innerHTML = `
            <div style="text-align: center; padding: 40px 20px;">
                <div style="font-size: 3em; margin-bottom: 10px; opacity: 0.3;">\u{1F4E6}</div>
                <p style="color: var(--risu-theme-textcolor2, #888); margin: 0;">No presets saved yet</p>
                <p style="color: var(--risu-theme-textcolor2, #888); font-size: 0.85em; margin-top: 5px;">Create your first theme preset!</p>
            </div>
        `;
      return;
    }
    presets.forEach((preset, index) => {
      const item = document.createElement("div");
      item.className = "preset-item";
      item.setAttribute("draggable", "true");
      item.setAttribute("data-index", index.toString());
      item.setAttribute("data-name", preset.name);
      item.style.cssText = `
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 10px;
            padding: 12px 14px;
            background: var(--risu-theme-bgcolor, #2a2a2a);
            border-radius: 8px;
            border: 2px solid var(--risu-theme-darkborderc, #333);
            transition: border-color 0.2s, box-shadow 0.2s;
            margin-bottom: 8px;
        `;
      const date = new Date(preset.timestamp).toLocaleDateString();
      const detailsText = [
        date,
        preset.theme || "custom"
      ].filter(Boolean).join(" \u2022 ");
      item.innerHTML = `
            <div class="drag-handle" style="
                color: var(--risu-theme-textcolor2, #888);
                font-size: 1.2em;
                cursor: grab;
                user-select: none;
                padding: 0 4px;
                touch-action: none;
            " title="Drag to reorder">\u22EE\u22EE</div>
            <div class="preset-info" style="flex: 1; min-width: 0;">
                <div style="color: var(--risu-theme-textcolor, #fff); font-weight: 500; font-size: 0.95em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${escapeHtml(preset.name)}
                </div>
                <div style="color: var(--risu-theme-textcolor2, #888); font-size: 0.8em; margin-top: 2px;">
                    ${detailsText}
                </div>
            </div>
            <div class="preset-buttons" style="display: flex; gap: 8px; flex-wrap: wrap;">
                <button class="load-btn" data-name="${escapeHtml(preset.name)}"
                        style="padding: 6px 12px; border-radius: 5px; border: none; background: var(--risu-theme-selected, #4a9eff); color: var(--risu-theme-textcolor, #fff); cursor: pointer; font-size: 0.85em; font-weight: 500; white-space: nowrap; transition: all 0.2s;"
                        title="Load theme">
                    \u{1F4E5} Load
                </button>
                <button class="rename-btn" data-name="${escapeHtml(preset.name)}"
                        style="padding: 6px 10px; border-radius: 5px; border: none; background: var(--risu-theme-darkbutton, #444); color: var(--risu-theme-textcolor, #fff); cursor: pointer; font-size: 0.85em; transition: all 0.2s;"
                        title="Rename theme">
                    \u270F\uFE0F
                </button>
                <button class="export-btn" data-name="${escapeHtml(preset.name)}"
                        style="padding: 6px 10px; border-radius: 5px; border: none; background: var(--risu-theme-darkbutton, #444); color: var(--risu-theme-textcolor, #fff); cursor: pointer; font-size: 0.85em; transition: all 0.2s;"
                        title="Export theme to file">
                    \u{1F4BE}
                </button>
                <button class="delete-btn" data-name="${escapeHtml(preset.name)}"
                        style="padding: 6px 10px; border-radius: 5px; border: none; background: var(--risu-theme-draculared, #ff5555); color: var(--risu-theme-textcolor, #fff); cursor: pointer; font-size: 0.85em; transition: all 0.2s;"
                        title="Delete theme">
                    \u{1F5D1}\uFE0F
                </button>
            </div>
        `;
      item.addEventListener("mouseover", () => {
        item.style.borderColor = "var(--risu-theme-selected, #4a9eff)";
        item.style.boxShadow = "0 2px 8px rgba(74, 158, 255, 0.2)";
      });
      item.addEventListener("mouseout", () => {
        item.style.borderColor = "var(--risu-theme-darkborderc, #333)";
        item.style.boxShadow = "none";
      });
      const buttons = item.querySelectorAll("button");
      buttons.forEach((btn) => {
        btn.addEventListener("mouseover", () => {
          if (btn.classList.contains("load-btn")) {
            btn.style.transform = "scale(1.05)";
          } else if (btn.classList.contains("rename-btn") || btn.classList.contains("export-btn")) {
            btn.style.background = "var(--risu-theme-selected, #555)";
            btn.style.transform = "scale(1.05)";
          } else if (btn.classList.contains("delete-btn")) {
            btn.style.background = "#ff3333";
            btn.style.transform = "scale(1.05)";
          }
        });
        btn.addEventListener("mouseout", () => {
          btn.style.transform = "";
          if (btn.classList.contains("rename-btn") || btn.classList.contains("export-btn")) {
            btn.style.background = "var(--risu-theme-darkbutton, #444)";
          } else if (btn.classList.contains("delete-btn")) {
            btn.style.background = "var(--risu-theme-draculared, #ff5555)";
          }
        });
      });
      const loadBtn = item.querySelector(".load-btn");
      loadBtn?.addEventListener("click", async () => {
        if (!await requestPermission("mainDom"))
          return;
        await loadThemePreset(preset.name);
        showButtonFeedback(loadBtn, "\u2713 Loaded!");
      });
      const renameBtn = item.querySelector(".rename-btn");
      renameBtn?.addEventListener("click", () => {
        showModal({
          title: "\u270F\uFE0F Rename Theme Preset",
          content: `Enter a new name for "<strong>${escapeHtml(preset.name)}</strong>":`,
          input: {
            value: preset.name,
            placeholder: "New theme name"
          },
          buttons: [
            {
              text: "Cancel",
              primary: false,
              onClick: () => {
              }
            },
            {
              text: "Rename",
              primary: true,
              onClick: async (newName) => {
                if (!newName || newName.trim() === "") {
                  showModal({
                    title: "\u26A0\uFE0F Warning",
                    content: "Please enter a valid name",
                    buttons: [{ text: "OK", primary: true, onClick: () => {
                    } }]
                  });
                  return;
                }
                newName = newName.trim();
                if (newName === preset.name) {
                  return;
                }
                const allPresets = await getPresets();
                const conflict = allPresets.find((p) => p.name === newName);
                if (conflict) {
                  showModal({
                    title: "\u274C Name Conflict",
                    content: `A theme preset named "<strong>${escapeHtml(newName)}</strong>" already exists.<br><br>Please choose a different name.`,
                    buttons: [{ text: "OK", primary: true, onClick: () => {
                    } }]
                  });
                  return;
                }
                if (await renameThemePreset(preset.name, newName)) {
                  await updatePresetList();
                  showModal({
                    title: "\u2713 Success",
                    content: `Theme renamed: "<strong>${escapeHtml(preset.name)}</strong>" -> "<strong>${escapeHtml(newName)}</strong>"`,
                    buttons: [{ text: "OK", primary: true, onClick: () => {
                    } }]
                  });
                } else {
                  showModal({
                    title: "\u274C Error",
                    content: "Failed to rename theme preset",
                    buttons: [{ text: "OK", primary: true, onClick: () => {
                    } }]
                  });
                }
              }
            }
          ]
        });
      });
      const exportBtn = item.querySelector(".export-btn");
      exportBtn?.addEventListener("click", async () => {
        const json = await exportThemePreset(preset.name);
        if (json) {
          const blob = new Blob([json], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${preset.name.replace(/[^a-zA-Z0-9-_]/g, "_")}_theme_preset.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          showButtonFeedback(exportBtn, "\u2713", "\u{1F4BE}");
        }
      });
      const deleteBtn = item.querySelector(".delete-btn");
      deleteBtn?.addEventListener("click", () => {
        showModal({
          title: "\u{1F5D1}\uFE0F Delete Theme Preset",
          content: `Delete theme preset "<strong>${escapeHtml(preset.name)}</strong>"?<br><br>This action cannot be undone.`,
          buttons: [
            {
              text: "Cancel",
              primary: false,
              onClick: () => {
              }
            },
            {
              text: "Delete",
              primary: true,
              onClick: async () => {
                await deleteThemePreset(preset.name);
                await updatePresetList();
              }
            }
          ]
        });
      });
      listContainer.appendChild(item);
    });
    setupDragAndDrop(listContainer);
  }
  function setupDragAndDrop(listContainer) {
    let draggedElement = null;
    let draggedIndex = null;
    let touchStartY = 0;
    let touchCurrentY = 0;
    let longPressTimer = null;
    let isDragging = false;
    let autoScrollInterval = null;
    const LONG_PRESS_DURATION = 500;
    const SCROLL_ZONE_SIZE = 50;
    const SCROLL_SPEED = 5;
    const scrollContainer = listContainer.parentElement;
    listContainer.querySelectorAll(".preset-item").forEach((item) => {
      item.addEventListener("dragstart", (e) => {
        const dragEvent = e;
        draggedElement = item;
        draggedIndex = parseInt(draggedElement.dataset.index || "0");
        draggedElement.style.opacity = "0.5";
        dragEvent.dataTransfer.effectAllowed = "move";
        const handle2 = draggedElement.querySelector(".drag-handle");
        if (handle2)
          handle2.style.cursor = "grabbing";
      });
      item.addEventListener("dragend", (e) => {
        if (draggedElement) {
          draggedElement.style.opacity = "1";
          const handle2 = draggedElement.querySelector(".drag-handle");
          if (handle2)
            handle2.style.cursor = "grab";
          listContainer.querySelectorAll(".preset-item").forEach((el) => {
            el.style.borderTopColor = "";
            el.style.borderBottomColor = "";
            el.style.borderTopWidth = "";
            el.style.borderBottomWidth = "";
          });
        }
      });
      item.addEventListener("dragover", (e) => {
        e.preventDefault();
        const dragEvent = e;
        dragEvent.dataTransfer.dropEffect = "move";
        if (!draggedElement || draggedElement === item)
          return;
        const rect = item.getBoundingClientRect();
        const midpoint = rect.top + rect.height / 2;
        listContainer.querySelectorAll(".preset-item").forEach((el) => {
          el.style.borderTopColor = "";
          el.style.borderBottomColor = "";
          el.style.borderTopWidth = "";
          el.style.borderBottomWidth = "";
        });
        if (dragEvent.clientY < midpoint) {
          item.style.borderTopColor = "var(--risu-theme-selected, #4a9eff)";
          item.style.borderTopWidth = "3px";
        } else {
          item.style.borderBottomColor = "var(--risu-theme-selected, #4a9eff)";
          item.style.borderBottomWidth = "3px";
        }
      });
      item.addEventListener("dragleave", (e) => {
        item.style.borderTopColor = "";
        item.style.borderBottomColor = "";
        item.style.borderTopWidth = "";
        item.style.borderBottomWidth = "";
      });
      item.addEventListener("drop", async (e) => {
        e.preventDefault();
        if (!draggedElement || draggedElement === item)
          return;
        const rect = item.getBoundingClientRect();
        const midpoint = rect.top + rect.height / 2;
        const targetIndex = parseInt(item.dataset.index || "0");
        const dragEvent = e;
        let newIndex = dragEvent.clientY < midpoint ? targetIndex : targetIndex + 1;
        if (draggedIndex < newIndex)
          newIndex--;
        await reorderPresets(draggedIndex, newIndex);
        await updatePresetList();
        console.log(`Moved preset from position ${draggedIndex} to ${newIndex}`);
      });
      const handle = item.querySelector(".drag-handle");
      const onTouchStart = (e) => {
        const touch = e.touches[0];
        touchStartY = touch.clientY;
        touchCurrentY = touch.clientY;
        longPressTimer = window.setTimeout(() => {
          isDragging = true;
          draggedElement = item;
          draggedIndex = parseInt(draggedElement.dataset.index || "0");
          draggedElement.style.opacity = "0.8";
          draggedElement.style.transform = "scale(1.05)";
          draggedElement.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.3)";
          draggedElement.style.zIndex = "1000";
          if (handle)
            handle.style.cursor = "grabbing";
          if ("vibrate" in navigator) {
            navigator.vibrate(50);
          }
        }, LONG_PRESS_DURATION);
      };
      const onTouchMove = (e) => {
        if (!isDragging) {
          if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
          }
          return;
        }
        e.preventDefault();
        const touch = e.touches[0];
        touchCurrentY = touch.clientY;
        if (draggedElement) {
          const deltaY = touchCurrentY - touchStartY;
          draggedElement.style.transform = `translateY(${deltaY}px) scale(1.05)`;
          const items = Array.from(listContainer.querySelectorAll(".preset-item"));
          let targetIndex = draggedIndex;
          for (let i = 0; i < items.length; i++) {
            if (items[i] === draggedElement)
              continue;
            const rect = items[i].getBoundingClientRect();
            const midpoint = rect.top + rect.height / 2;
            if (touchCurrentY < midpoint && i < draggedIndex) {
              targetIndex = i;
              break;
            } else if (touchCurrentY > midpoint && i > draggedIndex) {
              targetIndex = i;
            }
          }
          items.forEach((el, i) => {
            el.style.borderTopColor = "";
            el.style.borderBottomColor = "";
            el.style.borderTopWidth = "";
            el.style.borderBottomWidth = "";
            if (i === targetIndex && i !== draggedIndex) {
              if (targetIndex < draggedIndex) {
                el.style.borderTopColor = "var(--risu-theme-selected, #4a9eff)";
                el.style.borderTopWidth = "3px";
              } else {
                el.style.borderBottomColor = "var(--risu-theme-selected, #4a9eff)";
                el.style.borderBottomWidth = "3px";
              }
            }
          });
          if (scrollContainer) {
            const containerRect = scrollContainer.getBoundingClientRect();
            const distanceFromTop = touchCurrentY - containerRect.top;
            const distanceFromBottom = containerRect.bottom - touchCurrentY;
            if (autoScrollInterval) {
              clearInterval(autoScrollInterval);
              autoScrollInterval = null;
            }
            if (distanceFromTop < SCROLL_ZONE_SIZE && scrollContainer.scrollTop > 0) {
              autoScrollInterval = window.setInterval(() => {
                scrollContainer.scrollTop -= SCROLL_SPEED;
                if (scrollContainer.scrollTop <= 0) {
                  if (autoScrollInterval)
                    clearInterval(autoScrollInterval);
                }
              }, 16);
            } else if (distanceFromBottom < SCROLL_ZONE_SIZE) {
              autoScrollInterval = window.setInterval(() => {
                scrollContainer.scrollTop += SCROLL_SPEED;
                const maxScroll = scrollContainer.scrollHeight - scrollContainer.clientHeight;
                if (scrollContainer.scrollTop >= maxScroll) {
                  if (autoScrollInterval)
                    clearInterval(autoScrollInterval);
                }
              }, 16);
            }
          }
        }
      };
      const onTouchEnd = (e) => {
        if (longPressTimer) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
        if (autoScrollInterval) {
          clearInterval(autoScrollInterval);
          autoScrollInterval = null;
        }
        if (!isDragging)
          return;
        e.preventDefault();
        if (draggedElement) {
          const items = Array.from(listContainer.querySelectorAll(".preset-item"));
          let targetIndex = draggedIndex;
          for (let i = 0; i < items.length; i++) {
            if (items[i] === draggedElement)
              continue;
            const rect = items[i].getBoundingClientRect();
            const midpoint = rect.top + rect.height / 2;
            if (touchCurrentY < midpoint && i < draggedIndex) {
              targetIndex = i;
              break;
            } else if (touchCurrentY > midpoint && i > draggedIndex) {
              targetIndex = i;
            }
          }
          if (targetIndex !== draggedIndex) {
            (async () => {
              await reorderPresets(draggedIndex, targetIndex);
            })();
            console.log(`Moved preset from position ${draggedIndex} to ${targetIndex}`);
            if ("vibrate" in navigator) {
              navigator.vibrate(30);
            }
          }
          draggedElement.style.opacity = "1";
          draggedElement.style.transform = "";
          draggedElement.style.boxShadow = "";
          draggedElement.style.zIndex = "";
          if (handle)
            handle.style.cursor = "grab";
          items.forEach((el) => {
            el.style.borderTopColor = "";
            el.style.borderBottomColor = "";
            el.style.borderTopWidth = "";
            el.style.borderBottomWidth = "";
          });
          updatePresetList();
        }
        isDragging = false;
        draggedElement = null;
        draggedIndex = null;
      };
      const onTouchCancel = (e) => {
        if (longPressTimer) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
        if (autoScrollInterval) {
          clearInterval(autoScrollInterval);
          autoScrollInterval = null;
        }
        if (draggedElement) {
          draggedElement.style.opacity = "1";
          draggedElement.style.transform = "";
          draggedElement.style.boxShadow = "";
          draggedElement.style.zIndex = "";
          if (handle)
            handle.style.cursor = "grab";
        }
        isDragging = false;
        draggedElement = null;
        draggedIndex = null;
      };
      if (handle) {
        handle.addEventListener("touchstart", onTouchStart, { passive: false });
        handle.addEventListener("touchmove", onTouchMove, { passive: false });
        handle.addEventListener("touchend", onTouchEnd, { passive: false });
        handle.addEventListener("touchcancel", onTouchCancel, { passive: false });
      }
    });
  }
  async function toggleFloatingWindow() {
    if (!windowState.window) {
      createFloatingWindow();
    }
    const isVisible = windowState.isVisible || false;
    if (isVisible) {
      windowState.window.style.display = "none";
      windowState.overlay.style.display = "none";
      await Risuai.hideContainer();
      windowState.isVisible = false;
    } else {
      windowState.window.style.display = "flex";
      windowState.overlay.style.display = "block";
      await updatePresetList();
      await updateCurrentCharacterName();
      await Risuai.showContainer("fullscreen");
      windowState.isVisible = true;
    }
  }
  async function updateCharacterMappingList() {
    const listContainer = windowState.window?.querySelector("#character-mapping-list");
    if (!listContainer)
      return;
    const characterThemeMap = await getCharacterThemeMap();
    const entries = Object.entries(characterThemeMap);
    if (entries.length === 0) {
      listContainer.innerHTML = `
            <div style="color: var(--risu-theme-textcolor2, #666); font-size: 0.9em; text-align: center; padding: 10px;">
                No character mappings yet
            </div>
        `;
      return;
    }
    listContainer.innerHTML = "";
    entries.forEach(([character, themeName]) => {
      const item = document.createElement("div");
      item.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 10px;
            background: var(--risu-theme-bg, #2a2a2a);
            border-radius: 4px;
            border: 1px solid var(--risu-theme-darkborderc, #333);
        `;
      item.innerHTML = `
            <div style="flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0;">
                <div style="color: var(--risu-theme-textcolor, #fff); font-size: 0.85em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${escapeHtml(character)}
                </div>
                <div style="color: var(--risu-theme-textcolor2, #888); font-size: 0.75em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    \u2192 ${escapeHtml(themeName)}
                </div>
            </div>
            <button class="remove-mapping-btn" data-character="${escapeHtml(character)}"
                style="padding: 4px 8px; background: var(--risu-theme-red, #d32f2f); color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.75em; white-space: nowrap;"
                title="Remove mapping">
                Remove
            </button>
        `;
      const removeBtn = item.querySelector(".remove-mapping-btn");
      removeBtn?.addEventListener("click", async () => {
        await removeCharacterThemeMapping(character);
        await updateCharacterMappingList();
        await updateThemeSelectDropdown();
        showButtonFeedback(removeBtn, "\u2713");
      });
      listContainer.appendChild(item);
    });
  }
  async function updateCurrentCharacterName() {
    const charNameElement = windowState.window?.querySelector("#current-character-name");
    const charInput = windowState.window?.querySelector("#add-mapping-character");
    if (!charNameElement || !charInput)
      return;
    try {
      const char = await Risuai.getCharacter();
      const charName = char?.name || "-";
      charNameElement.textContent = charName;
      charInput.value = charName === "-" ? "" : charName;
    } catch (error) {
      charNameElement.textContent = "-";
      charInput.value = "";
    }
  }
  async function updateDefaultThemeDisplay() {
    const defaultContainer = windowState.window?.querySelector("#default-theme-container");
    const defaultNameElement = windowState.window?.querySelector("#default-theme-name");
    if (!defaultContainer || !defaultNameElement)
      return;
    const defaultTheme = await getDefaultTheme();
    if (defaultTheme) {
      defaultContainer.style.display = "block";
      defaultNameElement.textContent = defaultTheme;
    } else {
      defaultContainer.style.display = "none";
    }
  }
  async function updateThemeSelectDropdown() {
    const themeSelect = windowState.window?.querySelector("#add-mapping-theme");
    if (!themeSelect)
      return;
    const presets = await getPresets();
    const currentValue = themeSelect.value;
    themeSelect.innerHTML = '<option value="">Select a theme...</option>';
    presets.forEach((preset) => {
      const option = document.createElement("option");
      option.value = preset.name;
      option.textContent = preset.name;
      themeSelect.appendChild(option);
    });
    if (currentValue && presets.some((p) => p.name === currentValue)) {
      themeSelect.value = currentValue;
    }
  }
  async function updateAutoSwitchUI() {
    await updateCurrentCharacterName();
    await updateDefaultThemeDisplay();
    await updateCharacterMappingList();
    await updateThemeSelectDropdown();
  }
  async function updateShortcutDisplay() {
    const shortcutDisplayElement = windowState.window?.querySelector("#shortcut-display");
    if (!shortcutDisplayElement)
      return;
    const shortcut = await getShortcut();
    shortcutDisplayElement.textContent = formatShortcutDisplay(shortcut);
  }
  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
  function cleanupUI() {
    if (windowState.window) {
      windowState.window.remove();
      windowState.window = null;
    }
    if (windowState.overlay) {
      windowState.overlay.remove();
      windowState.overlay = null;
    }
    const existingButtons = document.querySelectorAll(".theme-preset-settings-btn");
    existingButtons.forEach((btn) => btn.remove());
  }

  // src/index.ts
  (async () => {
    try {
      console.log("Theme Preset Manager: Initializing...");
      await migrateFromArgumentStorage();
      document.addEventListener("keydown", async (e) => {
        const shortcut2 = await getShortcut();
        if (isShortcutMatch(e, shortcut2)) {
          e.preventDefault();
          await toggleFloatingWindow();
        }
      });
      createFloatingWindow();
      await initAutoSwitch();
      await Risuai.registerButton(
        {
          name: "Theme Presets",
          icon: "\u{1F3A8}",
          iconType: "html",
          location: "hamburger"
        },
        async () => {
          await toggleFloatingWindow();
        }
      );
      await Risuai.onUnload(async () => {
        console.log("Theme Preset Manager: Cleaning up...");
        stopAutoSwitch();
        cleanupUI();
      });
      const shortcut = await getShortcut();
      console.log("Theme Preset Manager: Ready!");
      console.log(`   Press ${shortcut} to open the theme manager`);
    } catch (error) {
      console.log(`Theme Preset Manager Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  })();