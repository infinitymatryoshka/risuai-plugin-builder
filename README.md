# RisuAI Plugin Development Tool

TypeScript로 RisuAI 플러그인을 개발할 수 있는 빌드 도구입니다.

## 특징

- ✅ **TypeScript 지원** - 타입 안전성과 자동완성 제공
- ✅ **모듈 분할** - 여러 파일로 코드를 나누어 관리 가능
- ✅ **자동 번들링** - 여러 파일을 하나의 플러그인 파일로 자동 병합
- ✅ **헤더 자동 생성** - plugin.config.ts에서 메타데이터 자동 추출
- ✅ **타입 정의 제공** - RisuAI API 전체 타입 지원

## 설치

```bash
cd plugin-dev-tool
npm install
npm run build
```

## 빠른 시작

### 1. 예시 프로젝트 복사

```bash
cp -r plugin-dev-tool/template my-plugin
cd my-plugin
npm install
```

### 2. 플러그인 설정 (plugin.config.ts)

```typescript
import type { PluginConfig } from '../types/plugin-config';

const config: PluginConfig = {
    name: 'myplugin',
    displayName: 'My Awesome Plugin',
    arguments: {
        api_key: {
            type: 'string',
            defaultValue: '',
            description: 'API 키'
        }
    },
    links: [
        {
            url: 'https://github.com/username/plugin',
            hoverText: 'GitHub'
        }
    ]
};

export default config;
```

### 3. 플러그인 코드 작성 (src/)

**src/index.ts**
```typescript
import { createProvider } from './provider';

console.log('Plugin loaded!');

const apiKey = getArg('myplugin::api_key') as string;
createProvider(apiKey);

onUnload(() => {
    console.log('Plugin unloaded!');
});
```

**src/provider.ts**
```typescript
export function createProvider(apiKey: string) {
    addProvider('MyAI', async (arg, abortSignal) => {
        // AI API 호출 로직
        const response = await nativeFetch('https://api.example.com', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({ messages: arg.prompt_chat }),
            signal: abortSignal
        });

        const data = await response.json();
        return { success: true, content: data.message };
    });
}
```

### 4. 빌드

```bash
npm run build
```

빌드 결과는 `dist/myplugin.js`에 생성됩니다.

### 5. RisuAI에 설치

1. RisuAI 실행
2. 설정 → 플러그인
3. `dist/myplugin.js` 파일 선택하여 가져오기

## 프로젝트 구조

```
my-plugin/
├── plugin.config.ts      # 플러그인 메타데이터
├── src/
│   ├── index.ts          # 메인 진입점
│   ├── provider.ts       # AI 제공자 로직
│   └── handlers.ts       # 텍스트 처리 핸들러
├── tsconfig.json         # TypeScript 설정
├── package.json          # 프로젝트 설정
└── dist/
    └── myplugin.js       # 빌드 결과
```

## API 문서

### 기본 API

```typescript
// 설정 값 가져오기/설정하기
const value = getArg('pluginname::argname');
setArg('pluginname::argname', 'new value');

// 현재 캐릭터 가져오기/설정하기
const char = getChar();
setChar(char);

// 플러그인 언로드 시 정리
onUnload(() => {
    console.log('Cleanup');
});
```

### AI 제공자 추가

```typescript
addProvider('ProviderName', async (arg, abortSignal) => {
    // arg.prompt_chat: 채팅 메시지
    // arg.temperature: 온도 값
    // arg.max_tokens: 최대 토큰

    return {
        success: true,
        content: 'AI response text'
    };
}, {
    tokenizer: 'tiktoken'  // 선택사항
});
```

### 텍스트 처리 핸들러

```typescript
// AI 출력 수정
addRisuScriptHandler('output', (content) => {
    return '[수정됨] ' + content;
});

// 사용자 입력 수정
addRisuScriptHandler('input', (content) => {
    return content.toUpperCase();
});
```

### 채팅 수정 (Replacer)

```typescript
// 요청 전 메시지 배열 수정
addRisuReplacer('beforeRequest', (chats, mode) => {
    return [
        { role: 'system', content: 'Custom prompt' },
        ...chats
    ];
});

// 응답 후 텍스트 수정
addRisuReplacer('afterRequest', (content, mode) => {
    return content.replace(/bad/g, '***');
});
```

### Fetch API

```typescript
// 추천: nativeFetch (CORS 제한 없음)
const response = await nativeFetch('https://api.example.com', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: 'value' }),
    signal: abortSignal
});

const data = await response.json();
```

## 타입 지원

`plugin-dev-tool/types/risu-plugin.d.ts`에 모든 RisuAI API 타입이 정의되어 있습니다.

VS Code나 다른 IDE에서 자동완성과 타입 체크를 받을 수 있습니다.

## 빌드 옵션

```bash
# 현재 디렉토리에서 빌드
npm run build

# 다른 디렉토리 지정
node ../plugin-dev-tool/dist/builder.js --project ./my-plugin

# 출력 파일 지정
node ../plugin-dev-tool/dist/builder.js --output ./output.js

# 도움말
node ../plugin-dev-tool/dist/builder.js --help
```

## 참고

- [RisuAI 플러그인 문서](https://github.com/kwaroran/RisuAI/blob/main/plugins.md)
- [RisuAI GitHub](https://github.com/kwaroran/RisuAI)

## 라이선스

MIT
