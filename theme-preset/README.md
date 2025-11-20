# Theme Preset Manager (TypeScript Refactored)

모듈화된 TypeScript로 개발된 RisuAI 테마 프리셋 관리 플러그인입니다.

## 🎯 개요

이 프로젝트는 원본 `theme-preset-plugin-fix3.js` (2321줄)을 TypeScript로 리팩토링하고 모듈로 분리하여 유지보수가 쉽도록 재구성한 버전입니다.

## 📁 프로젝트 구조

```
theme-preset/
├── plugin.config.ts          # 플러그인 메타데이터 설정
├── src/
│   ├── index.ts              # 메인 진입점
│   ├── constants.ts          # 상수 정의
│   ├── types.ts              # TypeScript 타입 정의
│   ├── storage.ts            # 프리셋 저장/로드 로직
│   ├── shortcuts.ts          # 키보드 단축키 처리
│   ├── color-schemes.ts      # 컬러 스킴 적용
│   ├── auto-switch.ts        # 캐릭터별 자동 테마 전환
│   └── ui.ts                 # 플로팅 윈도우 UI
├── package.json              # 프로젝트 설정
├── tsconfig.json             # TypeScript 설정
└── dist/
    └── themepreset.js        # 빌드된 플러그인 (29KB)
```

## 🚀 빌드 방법

```bash
# plugin-dev-tool 디렉토리에서
cd /path/to/RisuAI/plugin-dev-tool

# 의존성 설치 (최초 1회)
npm install

# 빌드 도구 컴파일 (최초 1회)
npm run build

# theme-preset 플러그인 빌드
cd theme-preset
node ../dist/builder.js
```

빌드 결과는 `dist/themepreset.js`에 생성됩니다.

## 📦 설치

1. `dist/themepreset.js` 파일을 RisuAI에 가져오기
2. 설정 → 플러그인 → 파일 선택

## ✨ 주요 기능

- ✅ **테마 프리셋 관리**: 현재 테마를 프리셋으로 저장하고 로드
- ✅ **키보드 단축키**: Ctrl+Alt+X로 빠른 접근 (커스터마이징 가능)
- ✅ **자동 테마 전환**: 캐릭터별로 다른 테마 자동 적용
- ✅ **임포트/익스포트**: 테마 프리셋 공유
- ✅ **컬러 스킴 지원**: 다양한 내장 컬러 스킴
- ✅ **TypeScript**: 타입 안전성 및 자동완성

## 🔧 원본과의 차이점

### 원본 (theme-preset-plugin-fix3.js)
- 2321줄의 단일 JavaScript 파일
- 모든 로직이 하나의 파일에 집중
- 유지보수 및 확장이 어려움

### 리팩토링 버전 (현재)
- 모듈화된 TypeScript 구조
- 각 기능별로 파일 분리
- 타입 안전성 및 IDE 지원
- 재사용 가능한 컴포넌트
- 빌드 도구로 자동 번들링

## 📝 개발 가이드

### 새로운 기능 추가

1. 적절한 모듈 파일 수정 (예: `src/ui.ts`)
2. 타입이 필요하면 `src/types.ts`에 추가
3. 상수는 `src/constants.ts`에 추가
4. 빌드: `node ../dist/builder.js`

### 모듈 설명

- **constants.ts**: 플러그인에서 사용하는 모든 상수 (타임아웃, 인터벌 등)
- **types.ts**: TypeScript 타입 정의 (ThemePreset, ColorScheme 등)
- **storage.ts**: 프리셋 CRUD 작업, 캐릭터 매핑 관리
- **shortcuts.ts**: 키보드 단축키 파싱 및 매칭
- **color-schemes.ts**: 컬러 스킴 적용 로직
- **auto-switch.ts**: 캐릭터 감지 및 자동 테마 전환
- **ui.ts**: 플로팅 윈도우 생성 및 이벤트 처리

## 🎨 UI 확장

현재 UI는 간소화된 버전입니다. 원본의 전체 기능을 원하면:

1. `example/theme-preset-plugin-fix3.js`에서 다음 섹션 참고:
   - 캐릭터 매핑 UI (1632-1700줄)
   - 자동 전환 설정 (다양한 위치)
   - 드래그 앤 드롭 지원
   - 애니메이션 효과

2. `src/ui.ts`에 해당 로직 추가

## 🛠️ 트러블슈팅

### 빌드 에러
```bash
# plugin-dev-tool 디렉토리에서 재빌드
npm run build
```

### 타입 에러
- `../types/risu-plugin.d.ts` 확인
- `tsconfig.json`의 types 경로 확인

## 📚 참고 자료

- [RisuAI 플러그인 문서](https://github.com/kwaroran/RisuAI/blob/main/plugins.md)
- [Plugin Dev Tool README](../README.md)
- 원본 플러그인: `../example/theme-preset-plugin-fix3.js`

## 📄 라이선스

MIT

---

**Note**: 이 버전은 원본의 핵심 기능을 포함하지만, UI는 간소화되어 있습니다.
필요에 따라 원본 `theme-preset-plugin-fix3.js`를 참고하여 기능을 추가할 수 있습니다.
