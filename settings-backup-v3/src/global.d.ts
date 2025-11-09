/**
 * RisuAI Plugin Global API Type Definitions
 * These functions are injected into the plugin eval scope
 */

declare function getDatabase(): any;
declare function setDatabase(db: any): void;
declare function setDatabaseLite(db: any): void;
declare function getChar(): any;
declare function setChar(char: any): void;
declare function getFileSrc(loc: string): Promise<string>;
declare function readImage(data: string): Promise<Uint8Array>;
declare function saveAsset(data: Uint8Array, customId?: string, fileName?: string): Promise<string>;
declare function onUnload(callback: () => void | Promise<void>): void;
declare function addRisuScriptHandler(name: string, func: (data: any) => void): void;
declare function removeRisuScriptHandler(name: string, func: (data: any) => void): void;
declare function printLog(message: string): void;
