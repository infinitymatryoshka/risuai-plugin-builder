/**
 * Plugin configuration file type definitions
 * This file defines the structure of plugin.config.ts
 */

/**
 * Plugin link metadata
 */
export interface PluginLink {
    /** URL to plugin documentation, repository, etc. */
    url: string;
    /** Optional hover text for the link */
    hoverText?: string;
}

/**
 * Plugin argument definition
 */
export interface PluginArgument {
    /** Argument type */
    type: 'string' | 'int';
    /** Default value for the argument */
    defaultValue?: string | number;
    /** Description of the argument (for documentation) */
    description?: string;
}

/**
 * Plugin configuration
 */
export interface PluginConfig {
    /**
     * Plugin identifier (required)
     * This is used internally to identify the plugin
     * Must be lowercase, no spaces
     * @example 'myplugin'
     */
    name: string;

    /**
     * Display name shown in UI (optional)
     * If not provided, `name` will be used
     * @example 'My Awesome Plugin'
     */
    displayName?: string;

    /**
     * API version (required for v3.0)
     * Use '3.0' for new plugins
     * @example '3.0'
     */
    apiVersion?: '3.0' | '2.1' | '2.0';

    /**
     * Plugin version using semantic versioning (optional but recommended)
     * Required for update checks
     * @example '1.0.0'
     */
    version?: string;

    /**
     * URL to check for plugin updates (optional)
     * Must support CORS and Range requests
     * Recommended: Use GitHub raw file URL
     * @example 'https://raw.githubusercontent.com/username/repo/main/plugin.js'
     */
    updateUrl?: string;

    /**
     * Plugin arguments (optional)
     * Define configuration options that users can set
     * @example
     * {
     *   api_key: { type: 'string', defaultValue: '', description: 'API key for service' },
     *   temperature: { type: 'int', defaultValue: 70, description: 'Temperature (0-100)' }
     * }
     */
    arguments?: Record<string, PluginArgument>;

    /**
     * Plugin links (optional)
     * Links to documentation, repository, etc.
     * @example
     * [
     *   { url: 'https://github.com/user/plugin', hoverText: 'GitHub Repository' },
     *   { url: 'https://docs.example.com', hoverText: 'Documentation' }
     * ]
     */
    links?: PluginLink[];
}
