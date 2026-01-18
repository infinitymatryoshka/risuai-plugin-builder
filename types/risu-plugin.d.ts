/**
 * RisuAI Plugin API Type Definitions
 * Version: 3.0
 *
 * This file provides TypeScript type definitions for the RisuAI Plugin API v3.0.
 * All API methods are accessed through the global `risuai` or `Risuai` object.
 *
 * @important **ALL METHODS RETURN PROMISES**
 *
 * Due to the iframe-based sandboxing architecture, ALL method calls go through
 * postMessage communication, which makes them asynchronous. Even methods that
 * appear synchronous in the implementation return Promises when called from the plugin iframe.
 *
 * For DOM, we recommend using iframe-based UI which uses standard document API
 * instead of accessing the main document directly via getRootDocument(),
 * unless absolutely necessary.
 *
 * **ALWAYS use `await` or `.then()` when calling any risuai method or SafeElement method.**
 */

// ============================================================================
// Core Types
// ============================================================================

/**
 * OpenAI-format chat message
 */
interface OpenAIChat {
    role: 'system' | 'user' | 'assistant' | 'function';
    content: string;
    name?: string;
    function_call?: {
        name: string;
        arguments: string;
    };
}

/**
 * Returned response for UI part registration
 */
interface UIPartResponse {
    id: string;
}

/**
 * Container display mode
 */
type ContainerMode = 'fullscreen';

/**
 * Icon type for UI elements
 */
type IconType = 'html' | 'img' | 'none';

/**
 * Script handler mode
 */
type ScriptMode = 'display' | 'output' | 'input' | 'process';

/**
 * Replacer type
 */
type ReplacerType = 'beforeRequest' | 'afterRequest';

/**
 * Risuai Plugin definition
 */
interface RisuPlugin {
    name: string;
    displayName?: string;
    script: string;
    arguments: { [key: string]: 'int' | 'string' | string[] };
    realArg: { [key: string]: number | string };
    version?: 1 | 2 | '2.1' | '3.0';
    customLink: {
        link: string;
        hoverText?: string;
    }[];
    argMeta: { [key: string]: { [key: string]: string } };
    versionOfPlugin?: string;
    updateURL?: string;
}

/**
 * Risuai Module definition
 */
interface RisuModule {
    name: string;
    description: string;
    lorebook?: any[];
    regex?: any[];
    cjs?: string;
    trigger?: any[];
    id: string;
    lowLevelAccess?: boolean;
    hideIcon?: boolean;
    backgroundEmbedding?: string;
    assets?: [string, string, string][];
    namespace?: string;
    customModuleToggle?: string;
    mcp?: any;
}

/**
 * User persona definition
 */
interface Persona {
    personaPrompt: string;
    name: string;
    icon: string;
    largePortrait?: boolean;
    id?: string;
    note?: string;
}

/**
 * Database subset with limited access to allowed keys only.
 * Plugins can only access these specific database properties for security.
 */
interface DatabaseSubset {
    characters?: any[];
    modules?: RisuModule[];
    enabledModules?: string[];
    moduleIntergration?: string;
    pluginV2?: RisuPlugin[];
    personas?: Persona[];
    plugins?: RisuPlugin[];
    pluginCustomStorage?: { [key: string]: any };
    temperature?: number;
    askRemoval?: boolean;
    maxContext?: number;
    maxResponse?: number;
    frequencyPenalty?: number;
    PresensePenalty?: number;
    theme?: string;
    textTheme?: string;
    lineHeight?: number;
    seperateModelsForAxModels?: boolean;
    seperateModels?: {
        memory: string;
        emotion: string;
        translate: string;
        otherAx: string;
    };
    customCSS?: string;
    guiHTML?: string;
    colorSchemeName?: string;
}

// ============================================================================
// SafeElement API
// ============================================================================

/**
 * SafeElement provides secure DOM manipulation with restricted access.
 * All methods are asynchronous.
 */
interface SafeElement {
    // Element Manipulation
    appendChild(child: SafeElement): Promise<void>;
    removeChild(child: SafeElement): Promise<void>;
    replaceChild(newChild: SafeElement, oldChild: SafeElement): Promise<void>;
    replaceWith(newElement: SafeElement): Promise<void>;
    cloneNode(deep?: boolean): Promise<SafeElement>;
    prepend(child: SafeElement): Promise<void>;
    remove(): Promise<void>;

    // Text Content
    innerText(): Promise<string>;
    textContent(): Promise<string | null>;
    setTextContent(value: string): Promise<void>;
    setInnerText(value: string): Promise<void>;

    // HTML Content (Auto-Sanitized with DOMPurify)
    getInnerHTML(): Promise<string>;
    getOuterHTML(): Promise<string>;
    setInnerHTML(value: string): Promise<void>;
    setOuterHTML(value: string): Promise<void>;

    // Attributes (only 'x-' prefixed allowed)
    setAttribute(name: string, value: string): Promise<void>;
    getAttribute(name: string): Promise<string | null>;

    // Styling
    setStyle(property: string, value: string): Promise<void>;
    getStyle(property: string): Promise<string>;
    getStyleAttribute(): Promise<string>;
    setStyleAttribute(value: string): Promise<void>;
    addClass(className: string): Promise<void>;
    removeClass(className: string): Promise<void>;
    setClassName(className: string): Promise<void>;
    getClassName(): Promise<string>;
    hasClass(className: string): Promise<boolean>;

    // Focus
    focus(): Promise<void>;

    // Traversal and Querying
    getChildren(): Promise<SafeElement[]>;
    getParent(): Promise<SafeElement | null>;
    querySelectorAll(selector: string): Promise<SafeElement[]>;
    querySelector(selector: string): Promise<SafeElement | null>;
    getElementById(id: string): Promise<SafeElement | null>;
    getElementsByClassName(className: string): Promise<SafeElement[]>;
    matches(selector: string): Promise<boolean>;

    // Dimensions and Position
    clientHeight(): Promise<number>;
    clientWidth(): Promise<number>;
    clientTop(): Promise<number>;
    clientLeft(): Promise<number>;
    getBoundingClientRect(): Promise<DOMRect>;
    getClientRects(): Promise<DOMRectList>;

    // Node Information
    nodeName(): Promise<string>;
    nodeType(): Promise<number>;

    // Event Listeners (returns ID for removal)
    addEventListener(
        type: string,
        listener: (event: any) => void,
        options?: boolean | AddEventListenerOptions
    ): Promise<string>;
    removeEventListener(
        type: string,
        id: string,
        options?: boolean | EventListenerOptions
    ): Promise<void>;

    // Scroll
    scrollIntoView(options?: boolean | ScrollIntoViewOptions): Promise<void>;
}

// ============================================================================
// SafeDocument API
// ============================================================================

/**
 * SafeDocument extends SafeElement with document-specific methods.
 * Note: Use iframe UI whenever possible. Additional restrictions might be added in the future.
 */
interface SafeDocument extends SafeElement {
    createElement(tagName: string): SafeElement;
    createAnchorElement(href: string): SafeElement;
}

// ============================================================================
// SafeClassArray
// ============================================================================

/**
 * SafeClassArray provides array-like access with async methods.
 */
interface SafeClassArray<T> {
    at(index: number): Promise<T | undefined>;
    length(): Promise<number>;
    push(item: T): Promise<void>;
}

// ============================================================================
// SafeMutationObserver
// ============================================================================

interface SafeMutationRecord {
    getType(): Promise<string>;
    getTarget(): Promise<SafeElement>;
    getAddedNodes(): Promise<SafeClassArray<SafeElement>>;
}

type SafeMutationCallback = (mutations: SafeClassArray<SafeMutationRecord>) => void;

interface SafeMutationObserver {
    observe(element: SafeElement, options: MutationObserverInit): Promise<void>;
}

// ============================================================================
// Storage APIs
// ============================================================================

/**
 * Plugin-specific storage that syncs with save files.
 * All methods return Promises.
 */
interface PluginStorage {
    getItem(key: string): Promise<any | null>;
    setItem(key: string, value: any): Promise<void>;
    removeItem(key: string): Promise<void>;
    clear(): Promise<void>;
    key(index: number): Promise<any | null>;
    keys(): Promise<string[]>;
    length(): Promise<number>;
}

/**
 * Device-specific storage shared between plugins.
 * All methods return Promises.
 */
interface SafeLocalStorage {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
    clear(): Promise<void>;
    key(index: number): Promise<string | null>;
    length(): Promise<number>;
}

// ============================================================================
// Provider API
// ============================================================================

interface ProviderArguments {
    prompt_chat: OpenAIChat[];
    temperature: number;
    max_tokens: number;
    frequency_penalty: number;
    min_p: number;
    presence_penalty: number;
    repetition_penalty: number;
    top_k: number;
    top_p: number;
    mode: string;
}

interface ProviderResponse {
    success: boolean;
    content: string | ReadableStream<string>;
}

type ProviderFunction = (
    args: ProviderArguments,
    abortSignal?: AbortSignal
) => Promise<ProviderResponse>;

interface ProviderOptions {
    tokenizer?: string;
    tokenizerFunc?: (content: string) => number[] | Promise<number[]>;
}

// ============================================================================
// Risuai Global API
// ============================================================================

/**
 * Risuai Plugin API v3.0
 * All methods are accessed through the global `risuai` or `Risuai` object.
 * All methods are asynchronous unless otherwise noted.
 */
interface RisuaiPluginAPI {
    // Version Information
    apiVersion: string;
    apiVersionCompatibleWith: string[];

    // Logging (deprecated - use console.log instead)
    log(message: string): Promise<void>;

    // Container Management
    showContainer(mode: ContainerMode): Promise<void>;
    hideContainer(): Promise<void>;

    // DOM Access
    getRootDocument(): Promise<SafeDocument>;
    createMutationObserver(callback: SafeMutationCallback): Promise<SafeMutationObserver>;

    // Character APIs
    getCharacter(): Promise<any>;
    setCharacter(character: any): Promise<void>;
    /** @deprecated Use getCharacter() instead */
    getChar(): Promise<any>;
    /** @deprecated Use setCharacter() instead */
    setChar(character: any): Promise<void>;

    // Storage APIs
    pluginStorage: PluginStorage;
    safeLocalStorage: SafeLocalStorage;

    // Argument APIs
    getArgument(key: string): Promise<string | number | undefined>;
    setArgument(key: string, value: string | number): Promise<void>;
    /** @deprecated Use getArgument() instead */
    getArg(arg: string): any;
    /** @deprecated Use setArgument() instead */
    setArg(arg: string, value: string | number): void;

    // Database APIs
    getDatabase(): Promise<DatabaseSubset | null>;
    setDatabaseLite(db: DatabaseSubset): Promise<void>;
    setDatabase(db: DatabaseSubset): Promise<void>;

    // Network APIs
    nativeFetch(url: string, options?: RequestInit): Promise<Response>;

    // UI Registration
    registerSetting(
        name: string,
        callback: () => void | Promise<void>,
        icon?: string,
        iconType?: IconType
    ): Promise<UIPartResponse>;

    registerButton(
        arg: {
            name: string;
            icon: string;
            iconType: 'html' | 'img' | 'none';
            location?: 'action' | 'chat' | 'hamburger';
        },
        callback: () => void
    ): Promise<UIPartResponse>;

    unregisterUIPart(id: string): Promise<void>;

    // Provider APIs
    addProvider(
        name: string,
        func: ProviderFunction,
        options?: ProviderOptions
    ): Promise<void>;

    // Script Handlers
    addRisuScriptHandler(
        mode: ScriptMode,
        func: (content: string) => string | null | undefined | Promise<string | null | undefined>
    ): Promise<void>;
    removeRisuScriptHandler(
        mode: ScriptMode,
        func: (content: string) => string | null | undefined | Promise<string | null | undefined>
    ): Promise<void>;

    // Replacers
    addRisuReplacer(
        type: 'beforeRequest',
        func: (messages: OpenAIChat[], type: string) => OpenAIChat[] | Promise<OpenAIChat[]>
    ): Promise<void>;
    addRisuReplacer(
        type: 'afterRequest',
        func: (content: string, type: string) => string | Promise<string>
    ): Promise<void>;
    removeRisuReplacer(type: ReplacerType, func: Function): Promise<void>;

    // Asset Management
    readImage(path?: string): Promise<any>;
    saveAsset(data: any, path?: string): Promise<void>;

    // Plugin Management
    loadPlugins(): Promise<void>;
    onUnload(func: () => void | Promise<void>): Promise<void>;

    // Fetch Logs
    getFetchLogs(): Promise<{
        url: string;
        body: string;
        status?: number;
        response?: string;
        error?: string;
        timestamp: number;
    }[] | null>;

    // Utility
    checkCharOrder(): Promise<void>;
    getRuntimeInfo(): Promise<{
        apiVersion: string;
        platform: string;
        saveMethod: string;
    }>;
    unwarpSafeArray<T>(safeArray: SafeClassArray<T>): Promise<T[]>;
}

// ============================================================================
// Global Declaration
// ============================================================================

declare global {
    const risuai: RisuaiPluginAPI;
    const Risuai: RisuaiPluginAPI;
}

export {};
