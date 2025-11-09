# RisuAI Example Plugin

TypeScript로 작성된 RisuAI 플러그인 예시입니다.

## 개발 시작

### 1. 의존성 설치

```bash
npm install
```

### 2. 플러그인 설정 수정

`plugin.config.ts` 파일을 열어 플러그인 정보를 수정하세요:

```typescript
const config: PluginConfig = {
    name: 'your-plugin-name',           // 플러그인 ID
    displayName: 'Your Plugin Name',    // UI에 표시될 이름
    arguments: {
        // 사용자가 설정할 수 있는 옵션들
        api_key: {
            type: 'string',
            defaultValue: '',
            description: 'API 키'
        }
    }
};
```

### 3. 코드 작성

- `src/index.ts` - 메인 진입점
- `src/provider.ts` - AI 제공자 구현
- `src/handlers.ts` - 텍스트 처리 핸들러

필요에 따라 파일을 추가/삭제할 수 있습니다.

### 4. 빌드

```bash
npm run build
```

빌드된 플러그인은 `dist/` 폴더에 생성됩니다.

### 5. RisuAI에서 테스트

1. RisuAI 실행
2. 설정 → 플러그인
3. `dist/your-plugin-name.js` 파일 가져오기

## 프로젝트 구조

```
.
├── plugin.config.ts      # 플러그인 메타데이터 설정
├── src/
│   ├── index.ts          # 메인 진입점
│   ├── provider.ts       # AI 제공자 로직
│   └── handlers.ts       # 텍스트 처리 핸들러
├── tsconfig.json         # TypeScript 설정
├── package.json          # 프로젝트 정보
└── dist/                 # 빌드 결과 (자동 생성)
```

## 개발 팁

### 타입 자동완성

TypeScript를 사용하면 RisuAI API의 타입 자동완성을 받을 수 있습니다:

```typescript
// getArg 사용 시 타입 캐스팅
const apiKey = getArg('myplugin::api_key') as string;

// addProvider 사용 시 arg 타입 자동 완성
addProvider('MyAI', async (arg, abortSignal) => {
    arg.temperature  // 자동완성됨!
    arg.max_tokens   // 자동완성됨!
    // ...
});
```

### 디버깅

`console.log()`를 사용하여 디버그 메시지를 출력할 수 있습니다:

```typescript
console.log('Plugin loaded!', getArg('myplugin::api_key'));
```

RisuAI의 개발자 도구(F12)에서 로그를 확인할 수 있습니다.

### 여러 파일로 분리

코드가 길어지면 여러 파일로 분리하세요:

```typescript
// src/utils.ts
export function formatMessage(text: string): string {
    return `[Plugin] ${text}`;
}

// src/index.ts
import { formatMessage } from './utils';

console.log(formatMessage('Hello!'));
```

빌드 시 자동으로 하나의 파일로 합쳐집니다.

## 참고 자료

- [RisuAI 플러그인 문서](https://github.com/kwaroran/RisuAI/blob/main/plugins.md)
- [빌드 도구 README](../README.md)
