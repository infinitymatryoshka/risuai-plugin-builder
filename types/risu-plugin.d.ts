/**
 * RisuAI Plugin API Type Definitions
 * Version: 2.0
 *
 * This file provides TypeScript type definitions for the RisuAI Plugin API.
 * For more information, see: https://github.com/kwaroran/RisuAI/blob/main/plugins.md
 */

// ============================================================================
// Core Data Types
// ============================================================================

/**
 * OpenAI-style chat message format
 */
export interface OpenAIChat {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

/**
 * Character data structure
 * Note: This is a simplified version. Full type has 100+ properties.
 * Use `any` for properties not defined here, or extend this interface as needed.
 */
export interface Character {
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
export interface GroupChat {
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
declare function getArg(name: string): string | number;

/**
 * Sets the argument value by name
 * @param name - Argument name in format: "<plugin_name>::<arg_name>"
 * @param value - The value to set
 * @example
 * setArg('myplugin::api_key', 'new-key')
 */
declare function setArg(name: string, value: string | number): void;

/**
 * Gets the entire database
 * @returns The complete RisuAI database object
 * @example
 * const db = getDatabase();
 * console.log(db.temperature, db.mainPrompt);
 */
declare function getDatabase(): any;

/**
 * Sets the entire database
 * @param db - The database object to set
 * @example
 * const db = getDatabase();
 * db.temperature = 80;
 * setDatabase(db);
 */
declare function setDatabase(db: any): void;

/**
 * Gets the current character
 * @returns Current character or group chat
 */
declare function getChar(): Character | GroupChat;

/**
 * Sets the current character
 * @param char - Character or group chat to set
 */
declare function setChar(char: Character | GroupChat): void;

/**
 * Registers an unload handler for cleanup when plugin is unloaded
 * @param func - Cleanup function to run on unload
 * @example
 * onUnload(() => {
 *   console.log('Plugin unloaded')
 * })
 */
declare function onUnload(func: () => void | Promise<void>): void;

// ============================================================================
// Fetch API
// ============================================================================

/**
 * Arguments for risuFetch
 */
export interface GlobalFetchArgs {
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
export interface GlobalFetchResult {
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
declare function risuFetch(
    url: string,
    arg?: GlobalFetchArgs
): Promise<GlobalFetchResult>;

/**
 * Arguments for nativeFetch
 */
export interface NativeFetchArg {
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
declare function nativeFetch(
    url: string,
    arg?: NativeFetchArg
): Promise<Response>;

// ============================================================================
// AI Provider API
// ============================================================================

/**
 * Arguments passed to provider function
 */
export interface PluginV2ProviderArgument {
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
export interface PluginV2ProviderResult {
    /** Whether generation was successful */
    success: boolean;
    /** Generated content (string or stream) */
    content: string | ReadableStream<string>;
}

/**
 * Options for AI provider
 */
export interface PluginV2ProviderOptions {
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
declare function addProvider(
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
export type ScriptMode = 'display' | 'output' | 'input' | 'process';

/**
 * Edit function for RisuScript handlers
 * @param content - Content to process
 * @returns Modified content, null, or undefined. If string is returned, content will be replaced.
 */
export type EditFunction = (
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
declare function addRisuScriptHandler(
    type: ScriptMode,
    func: EditFunction
): void;

/**
 * Removes a RisuScript handler
 * @param type - Handler type
 * @param func - Handler function to remove (must be same reference)
 */
declare function removeRisuScriptHandler(
    type: ScriptMode,
    func: EditFunction
): void;

// ============================================================================
// RisuReplacer API
// ============================================================================

/**
 * Replacer function for beforeRequest (modifies chat array)
 */
export type ReplacerBeforeRequest = (
    content: OpenAIChat[],
    mode: string
) => OpenAIChat[] | Promise<OpenAIChat[]>;

/**
 * Replacer function for afterRequest (modifies response text)
 */
export type ReplacerAfterRequest = (
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
declare function addRisuReplacer(
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
declare function addRisuReplacer(
    type: 'afterRequest',
    func: ReplacerAfterRequest
): void;

/**
 * Removes a RisuReplacer
 * @param type - Replacer type
 * @param func - Replacer function to remove (must be same reference)
 */
declare function removeRisuReplacer(
    type: 'beforeRequest' | 'afterRequest',
    func: ReplacerBeforeRequest | ReplacerAfterRequest
): void;
