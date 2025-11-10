/**
 * RisuAI Plugin API Type Definitions
 * Version: 2.0
 *
 * This file provides TypeScript type definitions for the RisuAI Plugin API.
 * For more information, see: https://github.com/kwaroran/RisuAI/blob/main/plugins.md
 */

declare global {
    // ============================================================================
    // Core Data Types
    // ============================================================================

    /**
     * OpenAI-style chat message format
     */
    interface OpenAIChat {
        role: 'system' | 'user' | 'assistant';
        content: string;
    }

    /**
     * Character data structure
     * Note: This is a simplified version. Full type has 100+ properties.
     * Use `any` for properties not defined here, or extend this interface as needed.
     */
    interface Character {
        name: string;
        image?: string;
        firstMessage: string;
        desc: string;
        notes: string;
        chats: any[];
        chaId: string;
        emotionImages?: [string, string][];
        globalLore?: any[];
        customscript?: any[];
        triggerscript?: any[];
        systemPrompt?: string;
        personality?: string;
        scenario?: string;
        tags?: string[];
        creator?: string;
        // Add more properties as needed
        [key: string]: any;
    }

    /**
     * Group chat data structure
     */
    interface GroupChat {
        type: 'group';
        name: string;
        characters: string[];
        chats: any[];
        chaId: string;
        [key: string]: any;
    }

    // ============================================================================
    // Basic API Functions
    // ============================================================================

    /**
     * Gets the argument value by name
     * @param name - Argument name in format: "<plugin_name>::<arg_name>"
     * @returns The argument value (string or number)
     * @example
     * const apiKey = getArg('myplugin::api_key')
     */
    function getArg(name: string): string | number;

    /**
     * Sets the argument value by name
     * @param name - Argument name in format: "<plugin_name>::<arg_name>"
     * @param value - The value to set
     * @example
     * setArg('myplugin::api_key', 'new-key')
     */
    function setArg(name: string, value: string | number): void;

    /**
     * Gets the entire database
     * @returns The complete RisuAI database object
     * @example
     * const db = getDatabase();
     * console.log(db.temperature, db.mainPrompt);
     */
    function getDatabase(): any;

    /**
     * Sets the entire database
     * @param db - The database object to set
     * @example
     * const db = getDatabase();
     * db.temperature = 80;
     * setDatabase(db);
     */
    function setDatabase(db: any): void;

    /**
     * Gets the current character
     * @returns Current character or group chat
     */
    function getChar(): Character | GroupChat;

    /**
     * Sets the current character
     * @param char - Character or group chat to set
     */
    function setChar(char: Character | GroupChat): void;

    /**
     * Registers an unload handler for cleanup when plugin is unloaded
     * @param func - Cleanup function to run on unload
     * @example
     * onUnload(() => {
     *   console.log('Plugin unloaded')
     * })
     */
    function onUnload(func: () => void | Promise<void>): void;

    // ============================================================================
    // Fetch API
    // ============================================================================

    /**
     * Arguments for risuFetch
     */
    interface GlobalFetchArgs {
        /** Request body (string or object that will be converted to JSON) */
        body?: string | object;
        /** HTTP headers */
        headers?: Record<string, string>;
        /** HTTP method (default: 'POST') */
        method?: 'GET' | 'POST';
        /** Abort signal for cancelling request */
        abortSignal?: AbortSignal;
        /** If true, returns Uint8Array instead of parsed JSON (default: false) */
        rawResponse?: boolean;
    }

    /**
     * Result from risuFetch
     */
    interface GlobalFetchResult {
        /** Whether request was successful */
        ok: boolean;
        /** Response data (parsed JSON or Uint8Array if rawResponse is true) */
        data: any | Uint8Array;
        /** Response headers */
        headers: Record<string, string>;
    }

    /**
     * Fetches a URL with native API (no CORS restrictions)
     * @deprecated Use nativeFetch instead for better compatibility
     * @param url - URL to fetch
     * @param arg - Fetch arguments
     * @returns Fetch result
     */
    function risuFetch(
        url: string,
        arg?: GlobalFetchArgs
    ): Promise<GlobalFetchResult>;

    /**
     * Arguments for nativeFetch
     */
    interface NativeFetchArg {
        /** Request body */
        body?: string | Uint8Array | ArrayBuffer;
        /** HTTP headers */
        headers?: Record<string, string>;
        /** HTTP method (default: 'POST') */
        method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
        /** Abort signal for cancelling request */
        signal?: AbortSignal;
    }

    /**
     * Fetches a URL with native API (no CORS restrictions)
     * This is the recommended fetch method - similar to standard fetch() API
     * @param url - URL to fetch
     * @param arg - Fetch arguments
     * @returns Standard Response object
     * @example
     * const response = await nativeFetch('https://api.example.com/data', {
     *   method: 'POST',
     *   headers: { 'Content-Type': 'application/json' },
     *   body: JSON.stringify({ key: 'value' })
     * })
     * const data = await response.json()
     */
    function nativeFetch(
        url: string,
        arg?: NativeFetchArg
    ): Promise<Response>;

    // ============================================================================
    // AI Provider API
    // ============================================================================

    /**
     * Arguments passed to provider function
     */
    interface PluginV2ProviderArgument {
        /** Chat messages in OpenAI format */
        prompt_chat: OpenAIChat[];
        /** Frequency penalty (0.0 - 2.0) */
        frequency_penalty?: number;
        /** Minimum probability threshold */
        min_p?: number;
        /** Presence penalty (0.0 - 2.0) */
        presence_penalty?: number;
        /** Repetition penalty */
        repetition_penalty?: number;
        /** Top-K sampling parameter */
        top_k?: number;
        /** Top-P sampling parameter */
        top_p?: number;
        /** Temperature (0.0 - 2.0) */
        temperature?: number;
        /** Maximum tokens to generate */
        max_tokens?: number;
        /** Request mode */
        mode: 'model' | 'submodel' | 'memory' | 'emotion' | 'otherAx' | 'translate';
    }

    /**
     * Provider function return type
     */
    interface PluginV2ProviderResult {
        /** Whether generation was successful */
        success: boolean;
        /** Generated content (string or stream) */
        content: string | ReadableStream<string>;
    }

    /**
     * Options for AI provider
     */
    interface PluginV2ProviderOptions {
        /** Tokenizer to use for counting tokens */
        tokenizer?: 'mistral' | 'llama' | 'novelai' | 'claude' | 'novellist' | 'llama3' | 'gemma' | 'cohere' | 'tiktoken' | 'custom';
        /** Custom tokenizer function (required if tokenizer is 'custom') */
        tokenizerFunc?: (content: string) => number[] | Promise<number[]>;
    }

    /**
     * Adds a custom AI provider
     * @param type - Provider name (will appear in UI)
     * @param func - Provider function that handles generation
     * @param options - Optional provider options
     * @example
     * addProvider('MyCustomAI', async (arg, abortSignal) => {
     *   const response = await nativeFetch('https://api.example.com/chat', {
     *     method: 'POST',
     *     headers: { 'Authorization': 'Bearer ' + getArg('myplugin::api_key') },
     *     body: JSON.stringify({
     *       messages: arg.prompt_chat,
     *       temperature: arg.temperature,
     *       max_tokens: arg.max_tokens
     *     }),
     *     signal: abortSignal
     *   })
     *   const data = await response.json()
     *   return { success: response.ok, content: data.message }
     * })
     */
    function addProvider(
        type: string,
        func: (
            arg: PluginV2ProviderArgument,
            abortSignal?: AbortSignal
        ) => Promise<PluginV2ProviderResult>,
        options?: PluginV2ProviderOptions
    ): void;

    // ============================================================================
    // RisuScript Handler API
    // ============================================================================

    /**
     * Script processing modes
     * - display: Called when data is displayed
     * - output: Called when data is outputted by AI model
     * - input: Called when data is inputted by user
     * - process: Called when creating actual request data
     */
    type ScriptMode = 'display' | 'output' | 'input' | 'process';

    /**
     * Edit function for RisuScript handlers
     * @param content - Content to process
     * @returns Modified content, null, or undefined. If string is returned, content will be replaced.
     */
    type EditFunction = (
        content: string
    ) => string | null | undefined | Promise<string | null | undefined>;

    /**
     * Adds a RisuScript handler
     * @param type - Handler type
     * @param func - Handler function
     * @example
     * const outputHandler = (content) => {
     *   return '[Modified] ' + content
     * }
     * addRisuScriptHandler('output', outputHandler)
     */
    function addRisuScriptHandler(
        type: ScriptMode,
        func: EditFunction
    ): void;

    /**
     * Removes a RisuScript handler
     * @param type - Handler type
     * @param func - Handler function to remove (must be same reference)
     */
    function removeRisuScriptHandler(
        type: ScriptMode,
        func: EditFunction
    ): void;

    // ============================================================================
    // RisuReplacer API
    // ============================================================================

    /**
     * Replacer function for beforeRequest (modifies chat array)
     */
    type ReplacerBeforeRequest = (
        content: OpenAIChat[],
        mode: string
    ) => OpenAIChat[] | Promise<OpenAIChat[]>;

    /**
     * Replacer function for afterRequest (modifies response text)
     */
    type ReplacerAfterRequest = (
        content: string,
        mode: string
    ) => string | Promise<string>;

    /**
     * Adds a RisuReplacer for beforeRequest
     * @param type - Must be 'beforeRequest'
     * @param func - Replacer function
     * @example
     * addRisuReplacer('beforeRequest', (chats, mode) => {
     *   // Add system message at start
     *   return [{ role: 'system', content: 'Be helpful' }, ...chats]
     * })
     */
    function addRisuReplacer(
        type: 'beforeRequest',
        func: ReplacerBeforeRequest
    ): void;

    /**
     * Adds a RisuReplacer for afterRequest
     * @param type - Must be 'afterRequest'
     * @param func - Replacer function
     * @example
     * addRisuReplacer('afterRequest', (content, mode) => {
     *   // Replace words in AI response
     *   return content.replace(/badword/gi, '***')
     * })
     */
    function addRisuReplacer(
        type: 'afterRequest',
        func: ReplacerAfterRequest
    ): void;

    /**
     * Removes a RisuReplacer
     * @param type - Replacer type
     * @param func - Replacer function to remove (must be same reference)
     */
    function removeRisuReplacer(
        type: 'beforeRequest' | 'afterRequest',
        func: ReplacerBeforeRequest | ReplacerAfterRequest
    ): void;

    // ============================================================================
    // UNDOCUMENTED API - Available but not officially supported
    // ============================================================================
    // These functions are accessible in the plugin eval scope but are not part
    // of the official plugin API. They may change without notice in future versions.
    // Use at your own risk!

    // ----------------------------------------------------------------------------
    // Database Functions (Advanced)
    // ----------------------------------------------------------------------------

    /**
     * Sets the database with lightweight saving (faster than setDatabase)
     * @param db - Database object to set
     * @undocumented
     */
    function setDatabaseLite(db: any): void;

    /**
     * Gets the current character with options
     * @param options - Get options
     * @returns Current character or group chat
     * @undocumented
     */
    function getCurrentCharacter(options?: any): Character | GroupChat;

    /**
     * Sets the current character
     * @param char - Character to set
     * @undocumented
     */
    function setCurrentCharacter(char: Character | GroupChat): void;

    /**
     * Gets a character by index
     * @param index - Character index in database
     * @param options - Get options
     * @undocumented
     */
    function getCharacterByIndex(index: number, options?: any): Character | GroupChat;

    /**
     * Sets a character by index
     * @param index - Character index in database
     * @param char - Character to set
     * @undocumented
     */
    function setCharacterByIndex(index: number, char: Character | GroupChat): void;

    /**
     * Gets the current chat
     * @undocumented
     */
    function getCurrentChat(): any;

    /**
     * Sets the current chat
     * @param chat - Chat data to set
     * @undocumented
     */
    function setCurrentChat(chat: any): void;

    /**
     * Saves an image to storage
     * @param data - Image data
     * @undocumented
     */
    function saveImage(data: any): Promise<string>;

    // ----------------------------------------------------------------------------
    // File & Asset Functions
    // ----------------------------------------------------------------------------

    /**
     * Downloads a file to user's device
     * @param name - File name
     * @param data - File data (Uint8Array, ArrayBuffer, or string)
     * @undocumented
     */
    function downloadFile(name: string, data: Uint8Array | ArrayBuffer | string): Promise<void>;

    /**
     * Gets the source URL for a file location
     * @param loc - File location identifier
     * @returns URL string for the file
     * @undocumented
     */
    function getFileSrc(loc: string): Promise<string>;

    /**
     * Reads an image from data
     * @param data - Image data string
     * @returns Processed image data
     * @undocumented
     */
    function readImage(data: string): Promise<any>;

    /**
     * Saves an asset to storage
     * @param data - Asset data as Uint8Array
     * @param customId - Optional custom ID
     * @param fileName - Optional file name
     * @returns Asset ID
     * @undocumented
     */
    function saveAsset(data: Uint8Array, customId?: string, fileName?: string): Promise<string>;

    /**
     * Loads an asset from storage
     * @param id - Asset ID
     * @returns Asset data as Uint8Array
     * @undocumented
     */
    function loadAsset(id: string): Promise<Uint8Array>;

    /**
     * Saves the current database to storage
     * @undocumented
     */
    function saveDb(): Promise<void>;

    /**
     * Loads data from storage (initialization function)
     * @undocumented
     */
    function loadData(): Promise<void>;

    // ----------------------------------------------------------------------------
    // Alert & UI Functions
    // ----------------------------------------------------------------------------

    /**
     * Shows an error alert
     * @param msg - Error message or Error object
     * @undocumented
     */
    function alertError(msg: string | Error): void;

    /**
     * Shows a normal alert
     * @param msg - Alert message
     * @undocumented
     */
    function alertNormal(msg: string): void;

    /**
     * Shows a normal alert and waits for user to close it
     * @param msg - Alert message
     * @undocumented
     */
    function alertNormalWait(msg: string): Promise<void>;

    /**
     * Shows a markdown-formatted alert
     * @param msg - Markdown message
     * @undocumented
     */
    function alertMd(msg: string): void;

    /**
     * Shows a toast notification
     * @param msg - Toast message
     * @undocumented
     */
    function alertToast(msg: string): void;

    /**
     * Shows a loading/wait alert
     * @param msg - Loading message
     * @undocumented
     */
    function alertWait(msg: string): void;

    /**
     * Clears/closes current alert
     * @undocumented
     */
    function alertClear(): void;

    /**
     * Shows a selection dialog
     * @param msgs - Array of options to choose from
     * @param display - Optional display text
     * @returns Selected option index as string
     * @undocumented
     */
    function alertSelect(msgs: string[], display?: string): Promise<string>;

    /**
     * Shows a confirmation dialog
     * @param msg - Confirmation message
     * @returns true if confirmed, false if cancelled
     * @undocumented
     */
    function alertConfirm(msg: string): Promise<boolean>;

    /**
     * Shows an error alert and waits
     * @param msg - Error message
     * @undocumented
     */
    function alertErrorWait(msg: string): Promise<void>;

    /**
     * Waits for current alert to close
     * @undocumented
     */
    function waitAlert(): Promise<void>;

    /**
     * Shows a "doing" status alert
     * @undocumented
     */
    function doingAlert(): void;

    // ----------------------------------------------------------------------------
    // Utility Functions
    // ----------------------------------------------------------------------------

    /**
     * Sleeps for specified milliseconds
     * @param ms - Milliseconds to sleep
     * @undocumented
     */
    function sleep(ms: number): Promise<void>;

    /**
     * Checks if data is null or undefined
     * @param data - Data to check
     * @returns true if nullish, false otherwise
     * @undocumented
     */
    function checkNullish(data: any): boolean;

    /**
     * Opens file picker to select a single file
     * @param ext - Array of allowed file extensions (e.g., ['png', 'jpg'])
     * @returns Selected file data
     * @undocumented
     */
    function selectSingleFile(ext: string[]): Promise<any>;

    /**
     * Opens file picker to select multiple files
     * @param ext - Array of allowed file extensions
     * @returns Array of selected file data
     * @undocumented
     */
    function selectMultipleFile(ext: string[]): Promise<any[]>;

    /**
     * Gets the current user name
     * @undocumented
     */
    function getUserName(): string;

    /**
     * Gets the current user icon
     * @undocumented
     */
    function getUserIcon(): string;

    /**
     * Gets the persona prompt
     * @undocumented
     */
    function getPersonaPrompt(): string;

    /**
     * Converts Buffer to text string
     * @param data - Buffer data
     * @undocumented
     */
    function BufferToText(data: Uint8Array): string;

    /**
     * Finds a character by ID
     * @param id - Character ID
     * @undocumented
     */
    function findCharacterbyId(id: string): Character | GroupChat | null;

    /**
     * Finds a character index by ID
     * @param id - Character ID
     * @returns Character index or -1 if not found
     * @undocumented
     */
    function findCharacterIndexbyId(id: string): number;

    /**
     * Opens a URL in browser/external app
     * @param url - URL to open
     * @undocumented
     */
    function openURL(url: string): void;

    /**
     * Encrypts buffer data with a key
     * @param data - Data to encrypt
     * @param keys - Encryption key
     * @undocumented
     */
    function encryptBuffer(data: Uint8Array, keys: string): Promise<Uint8Array>;

    /**
     * Decrypts buffer data with a key
     * @param data - Data to decrypt
     * @param keys - Decryption key
     * @undocumented
     */
    function decryptBuffer(data: Uint8Array, keys: string): Promise<Uint8Array>;

    /**
     * Capitalizes first letter of string
     * @param s - String to capitalize
     * @undocumented
     */
    function capitalize(s: string): string;

    // ----------------------------------------------------------------------------
    // Svelte Store Functions
    // ----------------------------------------------------------------------------

    /**
     * Gets value from a Svelte store
     * @param store - Svelte store
     * @returns Current store value
     * @undocumented
     */
    function get(store: any): any;

    /**
     * Creates a writable Svelte store
     * @param value - Initial value
     * @undocumented
     */
    function writable(value: any): any;

    // ----------------------------------------------------------------------------
    // Global Constants
    // ----------------------------------------------------------------------------

    /**
     * True if running in Tauri (desktop app)
     * @undocumented
     */
    const isTauri: boolean;

    /**
     * True if running in Node.js server
     * @undocumented
     */
    const isNodeServer: boolean;

    /**
     * True if running on mobile device
     * @undocumented
     */
    const isMobile: boolean | RegExpMatchArray;

    /**
     * True if running on Firefox browser
     * @undocumented
     */
    const isFirefox: boolean;

    /**
     * Language data object
     * @undocumented
     */
    const language: any;

    /**
     * Selected character ID store
     * @undocumented
     */
    const selectedCharID: any;

    /**
     * Storage instance for RisuAI
     * @undocumented
     */
    const forageStorage: any;

    // ============================================================================
    // GLOBAL POLYFILLS - Available on globalThis
    // ============================================================================
    // These are polyfills and utilities that RisuAI adds to the global scope.

    /**
     * Safe structured clone that works with Svelte 5 states
     * Falls back to deep clone if structuredClone is not available
     * @param data - Data to clone
     * @returns Cloned data
     */
    function safeStructuredClone<T>(data: T): T;

    /**
     * Node.js Buffer polyfill for browser environment
     * Available globally as `Buffer` or `globalThis.Buffer`
     */
    const Buffer: typeof import('buffer').Buffer;

    /**
     * Flag indicating if drag and drop was polyfilled
     */
    const polyfilledDragDrop: boolean | undefined;
}

// Allow empty export to make TypeScript treat this as a module
export {};
