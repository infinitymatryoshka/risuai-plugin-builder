#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import * as esbuild from 'esbuild';

interface PluginLink {
    url: string;
    hoverText?: string;
}

interface PluginArgument {
    type: 'string' | 'int';
    defaultValue?: string | number;
    description?: string;
}

interface PluginConfig {
    name: string;
    displayName?: string;
    apiVersion?: '3.0' | '2.1' | '2.0';
    version?: string;
    updateUrl?: string;
    arguments?: Record<string, PluginArgument>;
    links?: PluginLink[];
}

interface BuildOptions {
    projectDir: string;
    outputFile?: string;
    typescript?: boolean;
}

interface FileInfo {
    filePath: string;
    content: string;
    imports: string[]; // local file imports
}

/**
 * Generates plugin header from config
 */
function generateHeader(config: PluginConfig): string {
    const lines: string[] = [];

    // Required: @name
    lines.push(`//@name ${config.name}`);

    // API version (required for v3.0, default to 3.0)
    const apiVersion = config.apiVersion || '3.0';
    lines.push(`//@api ${apiVersion}`);

    // Optional: @version (should be near the top for update checker)
    if (config.version) {
        lines.push(`//@version ${config.version}`);
    }

    // Optional: @display-name
    if (config.displayName) {
        lines.push(`//@display-name ${config.displayName}`);
    }

    // Optional: @update-url
    if (config.updateUrl) {
        lines.push(`//@update-url ${config.updateUrl}`);
    }

    // Optional: @arg
    if (config.arguments) {
        for (const [argName, argDef] of Object.entries(config.arguments)) {
            let argLine = `//@arg ${argName} ${argDef.type}`;
            if (argDef.description) {
                argLine += ` ${argDef.description}`;
            }
            lines.push(argLine);
        }
    }

    // Optional: @link
    if (config.links) {
        for (const link of config.links) {
            if (link.hoverText) {
                lines.push(`//@link ${link.url} ${link.hoverText}`);
            } else {
                lines.push(`//@link ${link.url}`);
            }
        }
    }

    return lines.join('\n') + '\n\n';
}

/**
 * Parse import statements from TypeScript code
 * Returns array of local file paths (relative imports starting with ./ or ../)
 */
function parseImports(content: string, currentDir: string): string[] {
    const imports: string[] = [];

    // Match import statements: import ... from './path' or import './path'
    // Also match: import type ... from './path'
    const importRegex = /import\s+(?:type\s+)?(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/g;

    let match;
    while ((match = importRegex.exec(content)) !== null) {
        const importPath = match[1];

        // Only process local imports (starting with ./ or ../)
        if (importPath.startsWith('./') || importPath.startsWith('../')) {
            // Resolve the full path
            let resolvedPath = path.resolve(currentDir, importPath);

            // Add .ts extension if not present
            if (!resolvedPath.endsWith('.ts') && !resolvedPath.endsWith('.tsx')) {
                if (fs.existsSync(resolvedPath + '.ts')) {
                    resolvedPath += '.ts';
                } else if (fs.existsSync(resolvedPath + '.tsx')) {
                    resolvedPath += '.tsx';
                } else if (fs.existsSync(path.join(resolvedPath, 'index.ts'))) {
                    resolvedPath = path.join(resolvedPath, 'index.ts');
                }
            }

            imports.push(resolvedPath);
        }
    }

    return imports;
}

/**
 * Remove import statements for local files from content
 */
function removeLocalImports(content: string): string {
    // Remove import statements for local files (starting with ./ or ../)
    // This regex handles:
    // - import { x } from './file'
    // - import type { x } from './file'
    // - import x from './file'
    // - import './file'
    // - import * as x from './file'
    const importRegex = /import\s+(?:type\s+)?(?:[\s\S]*?\s+from\s+)?['"](?:\.\/|\.\.\/)[^'"]+['"];?\s*\n?/g;

    return content.replace(importRegex, '');
}

/**
 * Remove export keywords from content, preserving the declarations
 */
function removeExports(content: string): string {
    let result = content;

    // Remove "export default" - convert to regular declaration or remove
    // export default function xxx -> function xxx
    result = result.replace(/export\s+default\s+(?=function|class|async\s+function)/g, '');

    // export default expression; -> remove entirely (we'll handle entry point separately)
    // But keep the expression if it's meaningful
    result = result.replace(/export\s+default\s+([^;\n]+);?\s*\n?/g, (match, expr) => {
        // If it's just an identifier, remove it
        if (/^\w+$/.test(expr.trim())) {
            return '';
        }
        // Otherwise keep the expression
        return expr + ';\n';
    });

    // Remove "export" keyword from declarations
    // export function xxx -> function xxx
    // export const xxx -> const xxx
    // export class xxx -> class xxx
    // export interface xxx -> interface xxx
    // export type xxx -> type xxx
    // export async function xxx -> async function xxx
    result = result.replace(/export\s+(?=(?:async\s+)?(?:function|const|let|var|class|interface|type|enum)\s)/g, '');

    // Remove "export { ... }" statements
    result = result.replace(/export\s*\{[^}]*\};?\s*\n?/g, '');

    // Remove "export * from './file'" statements (re-exports)
    result = result.replace(/export\s*\*\s*from\s*['"][^'"]+['"];?\s*\n?/g, '');

    return result;
}

/**
 * Build dependency graph and return files in topological order
 */
function buildDependencyOrder(entryPoint: string): FileInfo[] {
    const visited = new Set<string>();
    const fileInfos: FileInfo[] = [];

    function visit(filePath: string): void {
        if (visited.has(filePath)) {
            return;
        }
        visited.add(filePath);

        if (!fs.existsSync(filePath)) {
            console.warn(`Warning: File not found: ${filePath}`);
            return;
        }

        const content = fs.readFileSync(filePath, 'utf-8');
        const currentDir = path.dirname(filePath);
        const imports = parseImports(content, currentDir);

        // Visit dependencies first (ensures they come before this file)
        for (const importPath of imports) {
            visit(importPath);
        }

        fileInfos.push({
            filePath,
            content,
            imports
        });
    }

    visit(entryPoint);
    return fileInfos;
}

/**
 * Bundle TypeScript files into a single TypeScript file
 * Preserves type information
 */
function bundleTypeScript(entryPoint: string): string {
    const files = buildDependencyOrder(entryPoint);
    const parts: string[] = [];

    for (const file of files) {
        let content = file.content;

        // Remove triple-slash references
        content = content.replace(/\/\/\/\s*<reference[^>]*>\s*\n?/g, '');

        // Remove local imports
        content = removeLocalImports(content);

        // Remove exports
        content = removeExports(content);

        // Trim and add section comment
        content = content.trim();

        if (content) {
            const relativePath = path.relative(path.dirname(entryPoint), file.filePath);
            parts.push(`// === ${relativePath} ===\n\n${content}`);
        }
    }

    return parts.join('\n\n');
}

/**
 * Builds a plugin from TypeScript source
 */
async function buildPlugin(options: BuildOptions) {
    const { outputFile, typescript } = options;
    // Resolve to absolute path
    const projectDir = path.resolve(options.projectDir);
    const configPath = path.join(projectDir, 'plugin.config.ts');
    const entryPoint = path.join(projectDir, 'src', 'index.ts');

    // Check if config exists
    if (!fs.existsSync(configPath)) {
        console.error('Error: plugin.config.ts not found in project directory');
        process.exit(1);
    }

    // Check if entry point exists
    if (!fs.existsSync(entryPoint)) {
        console.error('Error: src/index.ts not found in project directory');
        process.exit(1);
    }

    console.log('Building plugin...');
    console.log(`   Project: ${projectDir}`);
    console.log(`   Entry: ${entryPoint}`);
    console.log(`   Output format: ${typescript ? 'TypeScript (.ts) - preserving types' : 'JavaScript (.js)'}`);

    // Load config (we'll use dynamic import)
    let config: PluginConfig;
    try {
        // Build config file first to get JS
        const configOutPath = path.join(projectDir, '.temp-config.js');
        await esbuild.build({
            entryPoints: [configPath],
            bundle: false,
            platform: 'node',
            format: 'esm',
            outfile: configOutPath,
        });

        // Import the built config
        const configModule = await import('file://' + configOutPath);
        config = configModule.default;

        // Clean up temp file
        fs.unlinkSync(configOutPath);
    } catch (error) {
        console.error('Error loading plugin.config.ts:', error);
        process.exit(1);
    }

    console.log(`   Plugin name: ${config.name}`);
    if (config.displayName) {
        console.log(`   Display name: ${config.displayName}`);
    }
    console.log(`   API version: ${config.apiVersion || '3.0'}`);
    if (config.version) {
        console.log(`   Plugin version: ${config.version}`);
    }

    let bundledCode: string;

    if (typescript) {
        // TypeScript output: bundle while preserving types
        console.log('Bundling TypeScript (preserving types)...');

        try {
            bundledCode = bundleTypeScript(entryPoint);
        } catch (error) {
            console.error('Error bundling TypeScript:', error);
            process.exit(1);
        }
    } else {
        // JavaScript output: full bundle and transform with esbuild
        console.log('Bundling TypeScript...');
        const tempOutPath = path.join(projectDir, '.temp-bundle.js');

        try {
            await esbuild.build({
                entryPoints: [entryPoint],
                bundle: true,
                platform: 'browser',
                outfile: tempOutPath,
                target: 'es2020',
                minify: false,
                globalName: undefined,
            });
        } catch (error) {
            console.error('Error bundling TypeScript:', error);
            process.exit(1);
        }

        // Read bundled code
        bundledCode = fs.readFileSync(tempOutPath, 'utf-8');

        // Remove IIFE wrapper if present
        const iifePattern = /^\s*"use strict";\s*\(\(\)\s*=>\s*\{([\s\S]*)\}\)\(\);\s*$/;
        const match = bundledCode.match(iifePattern);
        if (match) {
            bundledCode = match[1].trim();
            console.log('   Unwrapped IIFE for RisuAI compatibility');
        }

        // Clean up temp file
        fs.unlinkSync(tempOutPath);
    }

    // Generate header
    const header = generateHeader(config);

    // Combine header and code
    const finalCode = header + bundledCode;

    // Determine output path
    const ext = typescript ? '.ts' : '.js';
    const defaultOutputPath = path.join(projectDir, 'dist', `${config.name}${ext}`);
    const finalOutputPath = outputFile || defaultOutputPath;

    // Create output directory if it doesn't exist
    const outputDir = path.dirname(finalOutputPath);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write final plugin file
    fs.writeFileSync(finalOutputPath, finalCode, 'utf-8');

    console.log('Plugin built successfully!');
    console.log(`   Output: ${finalOutputPath}`);
    console.log(`   Size: ${(finalCode.length / 1024).toFixed(2)} KB`);

    if (typescript) {
        console.log('\nTypeScript output preserves all type information.');
        console.log('RisuAI supports .ts files and will transpile them at runtime.');
    }
}

/**
 * Main CLI function
 */
async function main() {
    const args = process.argv.slice(2);

    if (args.includes('--help') || args.includes('-h')) {
        console.log(`
RisuAI Plugin Builder (API v3.0)

Usage:
  risu-plugin-build [options]

Options:
  --project <dir>     Project directory (default: current directory)
  --output <file>     Output file path (default: dist/<plugin-name>.js)
  --typescript, --ts  Output as TypeScript (.ts) with preserved types
  --help, -h          Show this help message

Example:
  cd my-plugin-project
  risu-plugin-build

  # TypeScript output (preserves types, readable):
  risu-plugin-build --typescript

  # Or from anywhere:
  risu-plugin-build --project ./my-plugin-project --output ./my-plugin.js

Plugin Config (plugin.config.ts):
  - name: Plugin identifier (required)
  - displayName: Display name in UI (optional)
  - apiVersion: API version, use '3.0' (default: '3.0')
  - version: Plugin version for updates (optional but recommended)
  - updateUrl: URL for update checks (optional)
  - arguments: User-configurable settings (optional)
  - links: Documentation/repository links (optional)

Output Formats:
  JavaScript (.js)  - Default, optimized and bundled via esbuild
  TypeScript (.ts)  - Preserves types, multiple files merged into one
`);
        process.exit(0);
    }

    const projectDir = args.includes('--project')
        ? args[args.indexOf('--project') + 1]
        : process.cwd();

    const outputFile = args.includes('--output')
        ? args[args.indexOf('--output') + 1]
        : undefined;

    const typescript = args.includes('--typescript') || args.includes('--ts');

    await buildPlugin({ projectDir, outputFile, typescript });
}

main().catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
});
