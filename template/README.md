# RisuAI Plugin Template (API v3.0)

This is a template for creating RisuAI plugins using TypeScript and the new API v3.0.

## Project Structure

```
your-plugin/
├── plugin.config.ts    # Plugin configuration (metadata, arguments, links)
├── src/
│   ├── index.ts        # Main entry point
│   ├── provider.ts     # AI provider implementation (optional)
│   └── handlers.ts     # Text processing handlers (optional)
├── dist/               # Built plugin output
├── package.json
└── tsconfig.json
```

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Edit `plugin.config.ts` to configure your plugin:
   - `name`: Unique plugin identifier
   - `displayName`: Display name in UI
   - `apiVersion`: Use '3.0'
   - `version`: Your plugin version
   - `arguments`: User-configurable settings
   - `links`: Documentation links

3. Implement your plugin in `src/index.ts`

4. Build the plugin:
   ```bash
   npm run build
   ```

5. The built plugin will be in `dist/<plugin-name>.js`

## API v3.0 Key Changes

### All APIs are Async
All `Risuai` API methods return Promises. Always use `await`:

```typescript
// Correct
const char = await Risuai.getCharacter();
const apiKey = await Risuai.getArgument('api_key');

// Wrong - will not work
const char = Risuai.getCharacter(); // Returns Promise, not data!
```

### Access via Risuai Object
All APIs are accessed through the global `Risuai` object:

```typescript
await Risuai.getCharacter();
await Risuai.getArgument('key');
await Risuai.addProvider('name', func);
await Risuai.registerSetting('name', callback, icon, iconType);
```

### Iframe-Based UI
Your plugin runs in a sandboxed iframe. Use `showContainer()` to display UI:

```typescript
// Build your UI in the iframe's document
document.body.innerHTML = '<h1>My Plugin</h1>';

// Show the iframe
await Risuai.showContainer('fullscreen');

// Hide when done
await Risuai.hideContainer();
```

### UI Registration
Register settings and buttons in RisuAI's interface:

```typescript
// Settings menu item
await Risuai.registerSetting('My Settings', async () => {
    await Risuai.showContainer('fullscreen');
}, 'icon', 'html');

// Floating action button
await Risuai.registerButton({
    name: 'My Action',
    icon: 'icon',
    iconType: 'html',
    location: 'action'
}, async () => {
    // Action code
});
```

## Available APIs

### Character & Database
- `Risuai.getCharacter()` / `setCharacter()`
- `Risuai.getDatabase()` / `setDatabase()` / `setDatabaseLite()`

### Arguments & Storage
- `Risuai.getArgument(key)` / `setArgument(key, value)`
- `Risuai.pluginStorage` - Save-file specific, syncs across devices
- `Risuai.safeLocalStorage` - Device-specific storage

### AI Provider
- `Risuai.addProvider(name, func, options)`

### Text Processing
- `Risuai.addRisuScriptHandler(mode, func)` - Modes: 'display', 'output', 'input', 'process'
- `Risuai.addRisuReplacer(type, func)` - Types: 'beforeRequest', 'afterRequest'

### Network
- `Risuai.nativeFetch(url, options)` - Fetch with CORS handling

### UI
- `Risuai.showContainer(mode)` / `hideContainer()`
- `Risuai.registerSetting(name, callback, icon, iconType)`
- `Risuai.registerButton(options, callback)`

### Lifecycle
- `Risuai.onUnload(func)` - Cleanup on plugin unload

## Example: Complete Plugin

```typescript
(async () => {
    try {
        console.log('My Plugin: Starting...');

        // Get settings
        const apiKey = await Risuai.getArgument('api_key') as string;

        // Add AI provider
        await Risuai.addProvider('MyAI', async (args, signal) => {
            const response = await Risuai.nativeFetch('https://api.example.com/chat', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${apiKey}` },
                body: JSON.stringify({ messages: args.prompt_chat }),
                signal
            });
            const data = await response.json();
            return { success: true, content: data.message };
        });

        // Register settings UI
        await Risuai.registerSetting('My Plugin', async () => {
            document.body.innerHTML = '<h1>Settings</h1>';
            await Risuai.showContainer('fullscreen');
        }, 'icon', 'html');

        console.log('My Plugin: Ready!');
    } catch (error) {
        console.log(`Error: ${error}`);
    }
})();
```

## Resources

- [Official Plugin Documentation](https://github.com/kwaroran/RisuAI/blob/main/plugins.md)
- [API v3.0 Migration Guide](https://github.com/kwaroran/RisuAI/blob/main/src/ts/plugins/migrationGuide.md)
- [Type Definitions](https://github.com/kwaroran/RisuAI/blob/main/src/ts/plugins/apiV3/Risuai.d.ts)
