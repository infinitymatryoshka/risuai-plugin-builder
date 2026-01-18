/// <reference types="../../types/risu-plugin" />

import localforage from 'localforage';

const LLMCacheStorage = localforage.createInstance({
    name: "LLMTranslateCache"
});

// 평문 청크 추출 함수
function extractLongestPlainChunk(text: string): string {
    // 특수 마크업 기준으로 분리
    const chunks = text
        .split(/\[.*?\]|<[^>]*>|\{\{.*?\}\}/gs)
        .map(s => s.trim())
        .filter(s => s.length > 30);  // 너무 짧은 건 제외

    // 가장 긴 청크 반환
    return chunks.sort((a, b) => b.length - a.length)[0] || '';
}

// 모든 평문 청크 추출
function extractAllPlainChunks(text: string, minLength = 30): string[] {
    return text
        .split(/\[.*?\]|<[^>]*>|\{\{.*?\}\}/gs)
        .map(s => s.trim())
        .filter(s => s.length >= minLength)
        .sort((a, b) => b.length - a.length);
}

// 전역에 노출해서 콘솔에서 접근 가능하게
(window as any).debugPlugin = {
    // 캐시 통계
    async cacheStats() {
        const keys = await LLMCacheStorage.keys();
        console.log(`=== LLM Translation Cache Stats ===`);
        console.log(`Total entries: ${keys.length}`);

        if (keys.length > 0) {
            const sampleKey = keys[0];
            const sampleValue = await LLMCacheStorage.getItem(sampleKey);
            console.log(`\nSample key length: ${sampleKey.length} chars`);
            console.log(`Sample key preview: ${sampleKey.substring(0, 100)}...`);
            console.log(`Sample value preview: ${String(sampleValue).substring(0, 100)}...`);
        }

        return keys.length;
    },

    // 모든 캐시 키 가져오기
    async getAllKeys() {
        return await LLMCacheStorage.keys();
    },

    // 특정 키로 캐시 조회
    async getCache(key: string) {
        return await LLMCacheStorage.getItem(key);
    },

    // 텍스트가 포함된 캐시 키 찾기
    async findKeysContaining(text: string, limit = 10) {
        const keys = await LLMCacheStorage.keys();
        const matches: string[] = [];

        for (const key of keys) {
            if (key.includes(text)) {
                matches.push(key);
                if (matches.length >= limit) break;
            }
        }

        console.log(`Found ${matches.length} keys containing "${text.substring(0, 30)}..."`);
        return matches;
    },

    // 캐시 키 검색 성능 테스트
    async benchmarkSearch(searchText: string) {
        const startTime = performance.now();
        const keys = await LLMCacheStorage.keys();
        const keysLoadTime = performance.now();

        let matchCount = 0;
        for (const key of keys) {
            if (key.includes(searchText)) {
                matchCount++;
            }
        }
        const searchTime = performance.now();

        console.log(`=== Benchmark Results ===`);
        console.log(`Keys load time: ${(keysLoadTime - startTime).toFixed(2)}ms`);
        console.log(`Search time: ${(searchTime - keysLoadTime).toFixed(2)}ms`);
        console.log(`Total time: ${(searchTime - startTime).toFixed(2)}ms`);
        console.log(`Total keys: ${keys.length}`);
        console.log(`Matches found: ${matchCount}`);

        return {
            keysLoadTime: keysLoadTime - startTime,
            searchTime: searchTime - keysLoadTime,
            totalTime: searchTime - startTime,
            totalKeys: keys.length,
            matches: matchCount
        };
    },

    // eval 실행 (async 지원)
    async eval(code: string) {
        try {
            const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
            const fn = new AsyncFunction('LLMCacheStorage', 'localforage', 'getDatabase', 'getChar', code);
            return await fn(LLMCacheStorage, localforage, getDatabase, getChar);
        } catch (e) {
            console.error('Eval error:', e);
            throw e;
        }
    },

    // 현재 캐릭터의 채팅 데이터 가져오기
    getChatData() {
        const char = getChar();
        const db = getDatabase();
        console.log(`Character: ${char.name}`);
        console.log(`Total chats: ${char.chats?.length || 0}`);
        return char;
    },

    // localforage 인스턴스 직접 접근
    LLMCacheStorage,
    localforage,

    // 평문 청크 추출 테스트
    extractChunks(text: string) {
        const longest = extractLongestPlainChunk(text);
        const all = extractAllPlainChunks(text);

        console.log(`=== Plain Text Chunks ===`);
        console.log(`Total chunks: ${all.length}`);
        console.log(`\nLongest chunk (${longest.length} chars):`);
        console.log(longest.substring(0, 200) + (longest.length > 200 ? '...' : ''));
        console.log(`\nAll chunks:`);
        all.forEach((chunk, i) => {
            console.log(`[${i}] (${chunk.length} chars): ${chunk.substring(0, 50)}...`);
        });

        return { longest, all };
    },

    // 평문 청크로 캐시 검색
    async findCacheByChunk(text: string) {
        const startTime = performance.now();

        // 1. 먼저 정확 매칭 시도 (HTML 전 번역 ON인 경우)
        const exactMatch = await LLMCacheStorage.getItem(text);
        if (exactMatch) {
            console.log(`=== Exact match found! ===`);
            console.log(`Time: ${(performance.now() - startTime).toFixed(2)}ms`);
            return { type: 'exact', key: text, value: exactMatch };
        }

        // 2. 평문 청크 추출
        const chunk = extractLongestPlainChunk(text);
        if (!chunk) {
            console.log(`No plain text chunk found in the message`);
            return null;
        }
        console.log(`Searching with chunk (${chunk.length} chars): "${chunk.substring(0, 50)}..."`);

        // 3. 캐시 키에서 청크 포함 여부 검색
        const keys = await LLMCacheStorage.keys();
        const matches: string[] = [];

        for (const key of keys) {
            if (key.includes(chunk)) {
                matches.push(key);
            }
        }

        const searchTime = performance.now() - startTime;
        console.log(`=== Chunk Search Results ===`);
        console.log(`Time: ${searchTime.toFixed(2)}ms`);
        console.log(`Matches: ${matches.length}`);

        if (matches.length === 0) {
            return null;
        }

        if (matches.length === 1) {
            const value = await LLMCacheStorage.getItem(matches[0]);
            console.log(`Single match found!`);
            return { type: 'chunk', key: matches[0], value };
        }

        // 여러 개 매칭된 경우 - 길이가 가장 비슷한 것 선택
        console.log(`Multiple matches - selecting by length similarity`);
        const originalLength = text.length;
        matches.sort((a, b) =>
            Math.abs(a.length - originalLength) - Math.abs(b.length - originalLength)
        );

        const bestKey = matches[0];
        const value = await LLMCacheStorage.getItem(bestKey);
        console.log(`Best match key length: ${bestKey.length} (original: ${originalLength})`);

        return { type: 'chunk-multi', key: bestKey, value, allMatches: matches };
    },

    // 현재 채팅의 첫 메시지로 테스트
    async testCurrentChat() {
        const char = getChar();
        if (!char.chats || char.chats.length === 0) {
            console.log('No chats found');
            return;
        }

        const currentChat = char.chats[char.chatPage || 0];
        if (!currentChat?.message || currentChat.message.length === 0) {
            console.log('No messages in current chat');
            return;
        }

        const firstMsg = currentChat.message[0];
        console.log(`Testing with first message (${firstMsg.data.length} chars)`);
        console.log(`Preview: ${firstMsg.data.substring(0, 100)}...`);

        return await this.findCacheByChunk(firstMsg.data);
    }
};

alertNormal('Debug plugin loaded! Use window.debugPlugin in console.');
console.log('Debug plugin loaded! Available commands:');
console.log('- debugPlugin.cacheStats()');
console.log('- debugPlugin.getAllKeys()');
console.log('- debugPlugin.getCache(key)');
console.log('- debugPlugin.findKeysContaining(text)');
console.log('- debugPlugin.benchmarkSearch(text)');
console.log('- debugPlugin.eval(code)');
console.log('- debugPlugin.getChatData()');
console.log('- debugPlugin.extractChunks(text)');
console.log('- debugPlugin.findCacheByChunk(text)');
console.log('- debugPlugin.testCurrentChat()');
