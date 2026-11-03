# 개발

[English](../development.md) | [中文](../zh/development.md) | [Русский](../ru/development.md) | [Tiếng Việt](../vi/development.md) | [日本語](../ja/development.md) | 한국어

## 구조

```text
package.json              bundle manifest: dsh.bundle.patch + dsh.client
cordis.patch.yml          inserts the ui-pixel-companions row
index.js                  Host half (empty apply; the Client module does the work)
client.js                 generated browser bundle (committed, ~72 KiB)
icon.svg                  plugin inventory icon
locale/*.json             meta.title / meta.description, six languages
src/client/index.ts       registers the slot entries (overlay, bridge, Settings row)
src/client/Pet.tsx        exports Companion (draggable overlay, settings panel)
                          and CompanionBridge (hidden composer-slot entry)
src/client/bridge.ts      companion facts store and publisher/subscriber hooks
src/client/prefs.ts       shared client-local preferences store (usePrefs/updatePrefs/updatePrefsSoon)
src/client/SizeSettingsRow.tsx  Settings → General companion-size row
src/client/signals.ts     pure projections: live bits, streams, report/detail text, scale clamp
src/client/asset-url.ts   resolves asset-route references through require.asset
src/client/state.ts       SCENES + deriveScene + observed-fact types
src/client/text.ts        LANGUAGES, SCENE_LABELS, UI_TEXT, languageFromTag
src/client/desktop.ts     optional localhost bridge to the desktop window
src/client/assets.generated.ts  generated asset-route refs (committed, ~5 KiB)
assets/girl/*.webp|png    canonical art (pack v2 style, 15 scenes)
assets/whale/*.webp|png   canonical v3 matte art (15 scenes)
assets/whale/roaming.*    optional desk-free movement asset for Deepy
source-art/*.gif          pre-v3 sources for tools/build_assets.py (do not rerun)
tools/build-assets.mjs    assets/ -> content-hashed refs in assets.generated.ts
tools/build-client.mjs    src/client/index.ts -> client.js
tools/build_assets.py     legacy pre-v3 generator (see the caution below)
tests/state.test.ts       scene rules (8 tests)
tests/signals.test.ts     live bits, streams, report/detail helpers, scale clamp (8 tests)
tests/text.test.ts        translation completeness (4 tests)
demo/                     offline preview page and stills (regenerated from v3 art)
desktop/companion.py      standalone GTK 3 desktop window + localhost bridge
desktop/requirements.txt  PyGObject>=3.42, Pillow>=10
desktop/run.sh            launcher (python3 desktop/companion.py)
desktop/README.md         short desktop quickstart
```

## 명령

```sh
npm install              # esbuild (dev only)
npm run build            # build the asset manifest, then bundle client.js
npm run assets           # regenerate only src/client/assets.generated.ts
npm test                 # node --experimental-strip-types --test tests/*.test.ts
npm run check:docs       # links + structure across all six languages
python3 -m py_compile desktop/companion.py   # syntax-check the desktop half
python3 desktop/companion.py --self-test     # headless desktop acceptance test
```

`npm run build`는 두 단계이며 각각 따로 실행할 수 있습니다:

- `node tools/build-assets.mjs`가 `assets/`를 스캔해
  `src/client/assets.generated.ts`(약 5 KiB)를 다시 쓰고,
  `plugins/dsh-pixel-companions/assets/<character>/<scene>.<webp|png>?v=<sha1-8>` 형식의
  플러그인 에셋 라우트 참조를 넣습니다. 쿼리는 파일 SHA-1의 앞 8개 16진수 문자이므로
  스프라이트가 바뀌면 새 URL을 얻습니다. 캐릭터/장면에 `.webp` 또는 `.png`가 없으면
  실패합니다.
- `node tools/build-client.mjs`가 esbuild로 TypeScript를 번들링하고 `react`는
  external로 유지하며, 출력을
  `window.__ModuleLoader__.load({ id: "dsh-pixel-companions", factory })`로 감싸
  `client.js`(약 72 KiB)를 작성합니다. esbuild의 `--check`(`node --check`) 파싱도 빌드의
  일부입니다.

`npm run assets`는 첫 단계만 실행합니다. 참조만 새로 고치면 될 때 사용하세요.

## 브라우저 번들의 구성

Harness는 모든 브라우저 플러그인을 페이지의 모듈 로더를 통해 로드합니다:

```js
window.__ModuleLoader__.load({
  id: 'dsh-pixel-companions',      // must equal the package name
  factory(require) {
    // compiled CommonJS module; require('react') resolves from the page's module table
    return module.exports           // { inject, apply }
  },
});
```

그래서 `react`는 절대 번들되지 않습니다. 컴파일된 코드가 `require('react')`를 호출하면
로더가 셸의 벤더 번들에서 응답합니다(검증된 릴리스에서 React 18.3.1). 두 번째 React를
번들하면 hooks가 깨집니다.

## 스프라이트 전달 방식

스프라이트는 번들에 **내장되지 않습니다**. `package.json`이 `"./assets/*": "./assets/*"`를
내보내므로 Harness 에셋 라우트가 패키지 자체의 에셋을
`plugins/dsh-pixel-companions/assets/<character>/<scene>.<webp|png>?v=<sha1-8>`에서
제공합니다.

- `src/client/assets.generated.ts`는 이미지 바이트가 아니라 이 참조들을 담습니다.
- `src/client/asset-url.ts`는 로더에 `require.asset(...)` 헬퍼가 있으면 그것으로 참조를
  해석하고, 없으면 원시 문서 상대 참조로 폴백합니다.
- 브라우저는 부팅 시 62개 내장 이미지를 파싱하는 대신 현재 캐릭터/장면(그리고 장면이 바뀌면
  다른 장면)의 스프라이트를 필요할 때 가져옵니다.
- 각 URL은 콘텐츠 해시에 대해 불변이므로 브라우저가 장기간 캐시할 수 있습니다.
  `?v=<sha1-8>` 쿼리는 파일이 바뀔 때마다 그 캐시를 무효화합니다.

커밋된 JS 번들은 약 72 KiB로 유지되며, 에셋은 `assets/` 아래 일반 파일로 배포됩니다. 에셋을
바꾼 뒤 `npm run build`를 실행해야 매니페스트와 번들이 갱신됩니다.

## 슬롯 항목의 동작 방식

`src/client/index.ts`는 세 항목을 주입합니다:

| 슬롯 | 항목 | 등록 |
| --- | --- | --- |
| `conversation.input.dock` | `CompanionBridge`(`null` 렌더링) | `{ name: 'conversation.input.dock', id: 'kappy-pixel-companions.bridge', order: 80 }` |
| `shell.overlay` | `Companion`(드래그 가능한 오버레이) | `{ name: 'shell.overlay', id: 'kappy-pixel-companions', order: 50 }` |
| `settings.general.item` | `SizeSettingsRow`(설정 → 일반) | `{ name: 'settings.general.item', id: 'pixel-companions-size', order: 40 }` |

`conversation.input.dock`은 세션별 `SessionSnapshot`, `InputState`, Chat snapshot, 입력창
액션을 받는 유일한 슬롯이므로, `CompanionBridge`가 이 사실들(`useSessionStatus` 대기
상호작용 플래그 포함)을 `src/client/bridge.ts`의 모듈 저장소에 게시합니다. 브리지는 사실을
얕은 비교하고 필드가 바뀔 때만 게시합니다. 입력 같은 사용자 활동은 장면을 바꾸지 않고 유휴
타이머만 갱신합니다(초안 입력은 최대 5초에 한 번). 또한 확정된 어시스턴트 노드마다 전체
확정 답변을 한 번 추출해 `CompanionFacts.detail`(8000자 제한)에 넣고, 턴이 실행되는 동안
`report`와 `detail`을 동결한 뒤 정지 시 게시합니다. `detail`은 페이지에 남고 데스크톱
브리지로 전송되지 않습니다. 언마운트되면 `useDisconnectOnUnmount`가 `connected: false`를
게시하고 마지막 사실을 유지하며, 오버레이는 유휴/수면 동작으로 돌아갑니다.

`shell.overlay`는 프레임 전체이므로 `Companion`이 모든 페이지의 모든 열 위에 뜰 수
있습니다. `useCompanionFacts()`로 저장소를 읽고 `useSessionStatus`도 구독하며(대화 밖에서도
대기 중 승인이 보이도록), `deriveScene`으로 장면을 추론하고 드래그한 위치에 스프라이트를
그립니다. 오버레이 레이어는 클릭 통과이며, 스프라이트와 톱니바퀴 버튼, 설정 패널만 포인터
이벤트를 받습니다. 탭이 숨겨져 있는 동안 1초 시계와 데스크톱 상태 프로브/하트비트가
멈추고, 완료 보고서는 `role="status"` / `aria-live="polite"`로 알립니다.

`settings.general.item`은 호스트의 표준 일반 설정 목록입니다. `SizeSettingsRow`는
컴패니언 크기 컨트롤(제목, 설명, 슬라이더, −/+ 버튼, 실시간 값, 50/100/150/200% 프리셋)만
렌더링합니다. 펫 팝오버와 `src/client/prefs.ts`(`usePrefs` / `updatePrefs` /
`updatePrefsSoon`)를 공유하므로 어느 표면을 바꾸든 다른 표면이 즉시 갱신되고, 둘 다
`kappy.pixel-companions.ui.v1` 아래 `localStorage`에 180 ms 디바운스와 `pagehide` 플러시로
저장합니다.

빈번한 슬라이더 드래그는 `updatePrefsSoon`을 호출해 업데이트를 애니메이션 프레임당 최대 한
번으로 합칩니다(`requestAnimationFrame`, 16 ms 타임아웃 폴백). 프리셋과 −/+ 클릭은 변화가
없는 패치를 건너뛰는 `updatePrefs`를 사용합니다. 오버레이는 확대된 스프라이트가 실제로
뷰포트를 벗어날 때만 저장된 위치를 다시 제한하고, 장면 미리보기 그리드와 데스크톱 미리보기
카드는 `React.memo`로 감싸져 있으며, 데스크톱 미러링은 약 140 ms 디바운스됩니다.

## 동작 수정

- 장면 규칙: `src/client/state.ts`, 테스트는 `tests/state.test.ts`.
- 순수 Chat snapshot/보고서 프로젝션: `src/client/signals.ts`, 테스트는
  `tests/signals.test.ts`.
- 캡션, 설정 문구, 6개 언어 목록: `src/client/text.ts`, 테스트는
  `tests/text.test.ts`.
- 오버레이 마크업, 포인터 드래그, 설정 패널, 스타일: `src/client/Pet.tsx`.
- 사실 저장소, 초안 비교, 브리지 생명주기: `src/client/bridge.ts`.
- 공유 클라이언트 로컬 환경설정(`usePrefs` / `updatePrefs` / `updatePrefsSoon`):
  `src/client/prefs.ts`.
- 설정 → 일반 크기 행: `src/client/SizeSettingsRow.tsx`.
- 에셋 라우트 해석: `src/client/asset-url.ts`.
- 선택적 데스크톱 브리지(`useDesktopBridge`, 포트, 프로브/하트비트 간격):
  `src/client/desktop.ts`.
- 데스크톱 창, 오른쪽 클릭 메뉴, 환경설정, HTTP 브리지: `desktop/companion.py`.
- 슬롯 등록과 모듈 id: `src/client/index.ts`.

변경 후: `npm run build`를 실행하고 페이지를 새로고침합니다. 프로필이 `link:` 설치를
사용하면 다시 빌드된 `client.js`가 바로 제공되고 HMR 전송이 교체합니다. 환경설정과 드래그한
`position`은 `localStorage`의 `kappy.pixel-companions.ui.v1`에 있습니다. 해당 키를 지우면
첫 실행 상태를 재현할 수 있습니다. `position`이 `null`이면 자동 위치는 오른쪽 아래로, 창
오른쪽 가장자리에서 96 px, 아래 가장자리에서 150 px이며 크기 변경 시 다시 제한됩니다.
**위치 초기화**는 `position`을 다시 `null`로 설정합니다.

## 에셋 편집

`assets/`가 표준이며 현재 v3 에셋 업데이트를 담고 있습니다. 캐릭터당 15개 장면
스프라이트(애니메이션 WebP + 정적 PNG, 192×128 RGBA 투명)와 Deepy의 선택적
`assets/whale/roaming.{webp,png}` 이동 비주얼이 있습니다. 매니페스트와 번들은 정상 빌드를
통해서만 다시 생성하세요:

1. `assets/<character>/<scene>.webp`(애니메이션)와
   `assets/<character>/<scene>.png`(정적)를 교체하거나 추가합니다. 둘 다 192×128,
   투명 배경입니다.
2. `npm run build`를 실행합니다. `tools/build-assets.mjs`가 콘텐츠 해시 참조를 다시 쓰고
   `tools/build-client.mjs`가 `client.js`를 다시 빌드합니다.
3. `assets/`, 다시 생성된 `src/client/assets.generated.ts`, `client.js`를 커밋합니다.

`src/client/assets.generated.ts`나 `client.js`를 직접 편집하지 마세요. 빌드가 소유합니다.

스프라이트가 내장되지 않고 에셋 라우트로 제공되므로 커밋된 `client.js`는 약 72 KiB로
유지됩니다. 이미지는 장면별로 패키지에서 가져와 불변 캐시됩니다. `?v=<sha1-8>` 해시는 파일
내용에 따라 바뀌므로 브라우저는 이름을 바꾸지 않고도 새 에셋을 받습니다.

**주의:** `tools/build_assets.py`와 `source-art/`의 8개 GIF는 **이전, pre-v3** 에셋 생성
방식을 재현합니다. v3 업데이트 후 `assets/`가 표준이므로 그 생성기를 실행하면 에셋이
되돌아갑니다. 되돌릴 의도가 아니라면 실행하지 마세요. 일반적인 변경은 `npm run build`만
사용합니다.

## 테스트

`npm test`는 Node 테스트 러너로 모든 `tests/*.test.ts`를 실행합니다:

- `tests/state.test.ts` — `deriveScene`과 장면 규칙에 대한 8개 테스트.
- `tests/signals.test.ts` — `liveBits`, `streamOf`, `cleanReport`, `lastResponse`,
  `lastAssistantNode`, `assistantText`, `MAX_DETAIL` 제한, `clampScale` 범위 처리에
  대한 8개 테스트.
- `tests/text.test.ts` — 4개 테스트: 모든 장면이 6개 언어로 캡션됨, 모든 UI 문자열이 6개
  언어에 존재함, 장면별 캡션이 서로 다름, `languageFromTag` 매핑/폴백.

총 20개 테스트입니다. 데스크톱 절반은 자체 헤드리스 `--self-test`를 유지합니다(0.5, 1.0,
2.0 배율에서 92개 애니메이션 디코드, 31개 정적 디코드, 260개 검사).

## 패키징

```sh
npm pack --dry-run     # inspect the published file list
npm pack               # dsh-pixel-companions-0.1.0.tgz
```

`files`에는 빌드된 `client.js`, `assets/`, 소스, 도구, demo, desktop, 문서(영어와
`docs/zh/`), `README.md`, `README.zh.md`, 6개 `locale/*.json` 파일이 포함됩니다.
`source-art/`, `node_modules/`, 테스트 전용 산출물은 포함되지 않습니다. `assets/` 트리는
반드시 포함되어야 합니다. 에셋 라우트가 설치된 패키지에서 그것을 제공하기 때문입니다.
tarball은 `dsh plugin --profile web add <tgz>`로 설치합니다.

## 릴리스 체크리스트

1. `npm run build`와 `npm test`(20개 테스트).
2. `python3 -m py_compile desktop/companion.py`와
   `python3 desktop/companion.py --self-test`.
3. `npm pack --dry-run`: `client.js`, `assets/**`, `locale/*.json`(6개 언어),
   `icon.svg`, `README.md`, `README.zh.md`, `docs/**`, `desktop/**`, `LICENSE`,
   `ASSETS_NOTICE.md`가 있는지 확인.
4. tarball 또는 `link:` 체크아웃을 `web` 프로필에 설치하고 새로고침합니다. 컴패니언이 대화
   페이지, 설정, 플러그인 페이지에 나타나고 스프라이트가 에셋 라우트에서 로드되는지(네트워크
   패널에 404 없음) 확인합니다.
5. 컴패니언을 드래그하고 페이지를 새로고침해 위치가 복원되는지 확인합니다. 창 크기를 바꿔
   계속 제한되는지 확인하고 **위치 초기화**를 사용합니다.
6. 설정 패널을 열어 6개 언어, 애니메이션 켜기/끄기, 표시 켜기/끄기, 크기 슬라이더와
   50/100/150/200% 프리셋 칩, 15개 장면 미리보기, Escape 닫기, 두 테마 모드를 확인합니다.
   **설정 → 일반**을 열어 **컴패니언 크기** 행이 같은 컨트롤을 보여 주고 팝오버와 동기화되는지
   확인합니다.
7. 선택적 데스크톱 창: `python3 desktop/companion.py`를 실행하고 **데스크톱 창**을
   체크한 뒤, 행에 **연결됨**이 표시되고 창이 장면을 미러링하며 오른쪽 클릭 메뉴(캐릭터,
   애니메이션, 크기, 항상 위, 초기화, 숨기기, 종료)가 동작하는지 확인합니다.
8. `package.json`의 `version`을 올리고, `package.json`, 다시 생성된 `client.js`,
   `src/client/assets.generated.ts`, 변경된 문서를 함께 커밋합니다.
