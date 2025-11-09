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
    arguments?: Record<string, PluginArgument>;
    links?: PluginLink[];
}

/**
 * Generates plugin header from config
 */
function generateHeader(config: PluginConfig): string {
    const lines: string[] = [];

    // Required: @name
    lines.push(`//@name ${config.name}`);

    // Optional: @display-name
    if (config.displayName) {
        lines.push(`//@display-name ${config.displayName}`);
    }

    // Optional: @arg
    if (config.arguments) {
        for (const [argName, argDef] of Object.entries(config.arguments)) {
            lines.push(`//@arg ${argName} ${argDef.type}`);
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
 * Builds a plugin from TypeScript source
 */
async function buildPlugin(projectDir: string, outputFile?: string) {
    const configPath = path.join(projectDir, 'plugin.config.ts');
    const entryPoint = path.join(projectDir, 'src', 'index.ts');

    // Check if config exists
    if (!fs.existsSync(configPath)) {
        console.error('❌ Error: plugin.config.ts not found in project directory');
        process.exit(1);
    }

    // Check if entry point exists
    if (!fs.existsSync(entryPoint)) {
        console.error('❌ Error: src/index.ts not found in project directory');
        process.exit(1);
    }

    console.log('🔨 Building plugin...');
    console.log(`   Project: ${projectDir}`);
    console.log(`   Entry: ${entryPoint}`);

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
        console.error('❌ Error loading plugin.config.ts:', error);
        process.exit(1);
    }

    console.log(`   Plugin name: ${config.name}`);
    if (config.displayName) {
        console.log(`   Display name: ${config.displayName}`);
    }

    // Build plugin code
    console.log('📦 Bundling TypeScript...');
    const tempOutPath = path.join(projectDir, '.temp-bundle.js');

    try {
        await esbuild.build({
            entryPoints: [entryPoint],
            bundle: true,
            platform: 'browser',
            // Don't wrap in IIFE - RisuAI wraps plugin code itself
            // format: 'iife',
            outfile: tempOutPath,
            target: 'es2020',
            minify: false,
            // Make sure external globals are accessible
            globalName: undefined,
        });
    } catch (error) {
        console.error('❌ Error bundling TypeScript:', error);
        process.exit(1);
    }

    // Read bundled code
    let bundledCode = fs.readFileSync(tempOutPath, 'utf-8');

    // Remove IIFE wrapper if present
    // esbuild wraps code in (() => { ... })() even without format specified
    // RisuAI wraps plugin code itself, so we need to unwrap it
    const iifePattern = /^\s*"use strict";\s*\(\(\)\s*=>\s*\{([\s\S]*)\}\)\(\);\s*$/;
    const match = bundledCode.match(iifePattern);
    if (match) {
        bundledCode = match[1].trim();
        console.log('   Unwrapped IIFE for RisuAI compatibility');
    }

    // Clean up temp file
    fs.unlinkSync(tempOutPath);

    // Generate header
    const header = generateHeader(config);

    // Combine header and code
    const finalCode = header + bundledCode;

    // Determine output path
    const defaultOutputPath = path.join(projectDir, 'dist', `${config.name}.js`);
    const finalOutputPath = outputFile || defaultOutputPath;

    // Create output directory if it doesn't exist
    const outputDir = path.dirname(finalOutputPath);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write final plugin file
    fs.writeFileSync(finalOutputPath, finalCode, 'utf-8');

    console.log('✅ Plugin built successfully!');
    console.log(`   Output: ${finalOutputPath}`);
    console.log(`   Size: ${(finalCode.length / 1024).toFixed(2)} KB`);
}

/**
 * Main CLI function
 */
async function main() {
    const args = process.argv.slice(2);

    if (args.includes('--help') || args.includes('-h')) {
        console.log(`
RisuAI Plugin Builder

Usage:
  risu-plugin-build [options]

Options:
  --project <dir>   Project directory (default: current directory)
  --output <file>   Output file path (default: dist/<plugin-name>.js)
  --help, -h        Show this help message

Example:
  cd my-plugin-project
  risu-plugin-build

  # Or from anywhere:
  risu-plugin-build --project ./my-plugin-project --output ./my-plugin.js
`);
        process.exit(0);
    }

    const projectDir = args.includes('--project')
        ? args[args.indexOf('--project') + 1]
        : process.cwd();

    const outputFile = args.includes('--output')
        ? args[args.indexOf('--output') + 1]
        : undefined;

    await buildPlugin(projectDir, outputFile);
}

main().catch(error => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
});
