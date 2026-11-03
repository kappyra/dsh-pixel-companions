# 호환성 참고 사항

[English](../compatibility.md) | [中文](../zh/compatibility.md) | [Русский](../ru/compatibility.md) | [Tiếng Việt](../vi/compatibility.md) | [日本語](../ja/compatibility.md) | 한국어

이 프로젝트는 원래 소스 체크아웃 프로토타입이었습니다. `deepseek-harness` 클론에 복사해
tsdown/tsc로 빌드하는 두 개의 워크스페이스 패키지였습니다. 이 저장소는 **설치 가능한
형태**이며 실제 Harness 설치에서 검증했습니다. 컴패니언은 이후 입력창 dock에서 프레임 전체를
덮는 오버레이로 옮겨졌고, 드래그 가능한 배치, 6개 UI 언어, 선택적 데스크톱 창을 얻었습니다.
이러한 변경은 아래에 설명하며, 사용자의 창 환경에 의존하는 부분은 따로 표시했습니다.

## 검증된 환경

| 항목 | 값 |
| --- | --- |
| Harness 릴리스 | `0.2.2-alpha.2`(커밋 `d21f653`), 설치된 CLI, `web` 프로필 |
| 페이지 React | `18.3.1`(shell 벤더 번들, 공유 모듈 테이블) |
| 검증 방법 | 플러그인 관리자로 설치, Client 모듈 로드, 슬롯 항목 활성 |

설치 가능한 번들에 대해 실제로 확인한 내용:

- 패키지가 프로필에 설치되고 `application: applied`를 보고하며, 번들이
  `dsh.profile.bundles`에 추가됩니다.
- 번들이
  `{"id":"dsh-pixel-companions","immediately":true,...}`로 구성된 웹 부트 그래프에
  포함되고, `/plugins/??dsh-pixel-companions/client.js&rev=…`로 제공되는 번들 바이트가
  저장소의 `client.js`와 일치합니다.
- Client 모듈이 모듈 로더를 통해 로드되고, 실제 GUI에서 두 항목이 활성으로 표시됩니다:
  `shell.overlay` → `kappy-pixel-companions`(순서 50), `conversation.input.dock` →
  `kappy-pixel-companions.bridge`(순서 80).
- `node tools/build-client.mjs`가 커밋된 `client.js`(약 72 KiB)를 재현하고,
  `npm test`가 20개 테스트 — 장면 규칙 8개, 순수 헬퍼 8개(`clampScale` 범위 처리 포함),
  번역 완성도 4개 — 를 모두 통과합니다.
- Harness 에셋 라우트가 생성된 스프라이트 참조
  (`plugins/dsh-pixel-companions/assets/<character>/<scene>.<webp|png>?v=<sha1-8>`)를
  `200 image/webp` / `image/png`로 제공하며, `src/client/assets.generated.ts`는 약
  5 KiB입니다.
- 성능/로직 확인: `publishFacts`는 얕은 비교로 바뀌지 않은 스냅샷을 건너뜁니다. 입력은
  최대 5초에 한 번만 유휴 타이머를 갱신하고 장면은 바꾸지 않습니다. 1초 시계와 데스크톱
  프로브/하트비트는 탭이 숨겨졌을 때 멈추고 다시 보이면 재개합니다. 답변 미리보기는 실행
  중에는 고정되고 정지 시 한 번만 게시됩니다. 보고서 pill은 `role="status"`와
  `aria-live="polite"`를 갖습니다. 사용자 활동(초안 작성, 클릭/드래그)은 장면을 바꾸지 않고
  유휴 타이머만 갱신합니다.
- 크기 변경 성능: 두 슬라이더 모두 `updatePrefsSoon`을 거쳐 환경설정 업데이트를
  애니메이션 프레임당 최대 한 번으로 합칩니다(`requestAnimationFrame`, 16 ms 타임아웃
  폴백). 프리셋과 −/+ 클릭은 즉시 적용됩니다. `updatePrefs`는 변화가 없는 패치를
  무시합니다. 오버레이는 확대된 스프라이트가 실제로 뷰포트를 벗어날 때만 저장된 위치를 다시
  제한합니다. 장면 미리보기 그리드와 데스크톱 미리보기 카드는 메모이즈되어 있으며, 데스크톱
  미러링은 약 140 ms 디바운스되어 드래그가 끝난 뒤 한 번만 전송합니다(장면/외형 변경은
  여전히 즉시 미러링).
- 장면 매핑은 페이지와 동일한 React 버전(`18.3.1`)과 실제 슬롯 prop 형태로도
  평가했습니다(유휴, 실행, 전송, 승인 대기, 오류, 열기 오류, 도구 호출, 추론 스트림, 답변
  스트림). 모든 규칙이 예상한 캡션과 에셋을 만들었습니다.
- 헤드리스 UI 테스트가 완료/호버 동작을 다룹니다. 입력한 초안은 `Idle`로 유지되고, 추론
  스트림은 `Thinking`, 답변 스트림은 `Typing`, 실행 중인 도구는 `Working`을 표시합니다.
  완료된 턴은 고정된 한 줄 보고서를 표시하고 그 자세히 버튼이 길이 제한된 일반 텍스트
  패널을 엽니다. 컴패니언에 호버하면 320 ms 대기 후 보고서가 닫히고, 새 턴이 다시 엽니다.
  호버 메시지 입력창은 메시지를 보내고 이전 초안을 복원합니다.
- v3 에셋을 헤드리스로 확인했습니다. 62개 스프라이트 파일이 모두 192×128 RGBA 투명
  형식으로 디코드되고, 모든 애니메이션 WebP에는 최소 2개 프레임이 있습니다. 헤드리스
  드래그 테스트에서 Deepy가 드래그 중 `roaming`으로 전환되고 놓으면 장면으로 돌아옵니다
  (Whale Girl은 그대로).
- 선택적 데스크톱 절반도 헤드리스로 확인했습니다.
  `python3 -m py_compile desktop/companion.py` 성공,
  `python3 desktop/companion.py --self-test`가
  `ok: … 92 animated decodes, 31 still decodes, 30 evidence PNGs, 260 checks`를
  보고합니다(장면은 0.5, 1.0, 2.0 배율로 디코드). 실제 `curl` 확인은 `/health`, CORS
  프리플라이트, `POST /state`, `400`, `404`를 다루며, 같은 포트의 두 번째 인스턴스는
  `1`로 종료합니다. roaming 전환 테스트도 통과합니다
  (`whale: moving→roaming, released→idle; girl: no roaming`). 브라우저 페이로드는
  헤드리스 React 렌더에서 검증했으며(`scene=typing` → `success`), 본문에 초안이나 세션
  데이터가 없습니다.

사용자 확인으로 표시한 항목(호스트 창 환경에 의존해 이 저장소에서 재검증하지 않음):
드래그/포인터 상호작용, 모든 열 위의 오버레이 배치, 설정 패널의 위/아래 전환과 제한,
밝은/어두운 테마, 6개 UI 언어 전환. 자신의 `dsh web` 창에서 확인하세요.
[installation.md](installation.md#확인)를 참고하세요.

## 의존하는 API 계약

설치된 패키지의 타입 선언에서 확인했습니다:

| 출처 | 사용 목적 |
| --- | --- |
| `shell.overlay`(프레임 전체 오버레이 슬롯) | 컴패니언 자체: `{ name: 'shell.overlay', id: 'kappy-pixel-companions', order: 50 }` 등록. 오버레이 레이어는 클릭 통과이며 컴패니언, 톱니바퀴 버튼, 설정 패널만 포인터 이벤트를 받습니다. |
| `conversation.input.dock`(숨겨진 사실 브리지) | 세션별 props를 받는 유일한 슬롯: `{ name: 'conversation.input.dock', id: 'kappy-pixel-companions.bridge', order: 80 }` 등록. `null`을 렌더링하며(DOM 없음, 레이아웃 간격 없음) 사실만 게시합니다. |
| `settings.general.item`(설정 → 일반 목록 슬롯) | 컴패니언 크기 행 등록: `{ name: 'settings.general.item', id: 'pixel-companions-size', order: 40 }`. 펫 팝오버와 같은 슬라이더/프리셋을 렌더링하고 공유 환경설정 저장소를 편집합니다. 호스트의 표준 일반 목록 슬롯이며 새 API가 아닙니다. |
| 슬롯 소유자 props `{ session: SessionSnapshot, input: InputState }` | 세션 사실과 입력창 상태. 숨겨진 브리지가 받습니다. |
| 컴패니언 사실 저장소(`src/client/bridge.ts`) | 모듈 수준 `CompanionFacts`와 `publishFacts`, `useCompanionFacts`, `useFactsPublisher`, `useDisconnectOnUnmount`. 스냅샷을 얕은 비교하며 `connected`를 운반합니다. |
| `useSessionStatus(selector)`, `ReadonlyMap<SessionId, SessionStatus>` 순회 | `pendingInteraction`(승인/질문). 오버레이도 구독하므로 사용자가 비대화 페이지에 있어도 대기 중인 승인이 표시됩니다. |
| `SessionSnapshot.running`, `.promptError`, `.lastAgentError`, `.openState`, `.sessionId` | 실행 상태, 오류 상태 |
| `InputState.phase`(`plain` / `adjudicating` / `claimed` / `submitting` / `sending`), `.draft` | 짧은 `typing` 장면을 위한 제출 단계. 호버 메시지 입력창은 전송 후 복원하기 위해 `.draft`를 스냅샷합니다. |
| `useChat(selector)` → `ChatSnapshot` | 어시스턴트의 실시간 작업: `legacy.runningCalls`(도구 실행 중)와 `legacy.partial.blocks[].kind`의 `reasoning` / `text` 중 비어 있지 않은 `text`(스트리밍). 같은 프레임 안에서 1/2/4 `live` 비트필드로 게시됩니다. |
| `ChatSnapshot.navigation.items()[].response` | 한 줄 완료 미리보기: 첫 번째 비어 있지 않은 줄, markdown 기호 제거, ≤ 120자. 닫히거나 새 턴이 시작될 때까지 보고서 행에 고정되며, 비어 있으면 정리된 detail로 대체됩니다. |
| `ChatSnapshot.legacy.nodes[]`(최신 `kind === 'assistant'`)와 `blocks[].kind === 'text'` | 세부 정보 패널용 전체 확정 답변 텍스트. 확정된 어시스턴트 노드마다 한 번 추출되고 8000자(`MAX_DETAIL`)로 제한되며 `CompanionFacts.detail`로 게시됩니다. 페이지에만 남고 데스크톱 브리지로 전송되지 않습니다. |
| `inputActions.setDraft(text)` / `inputActions.submit()` | 호버 메시지 입력창이 입력창을 통해 전송한 뒤 사용자의 이전 초안을 최대한 복원합니다. |
| `localStorage` 키 `kappy.pixel-companions.ui.v1` | 캐릭터, `scale`(1% 정밀도로 50–200%; 레거시 0.8 / 1 / 1.2 값은 허용 후 제한), 언어, 모션, 표시, 데스크톱 토글, 드래그한 `position: {x, y}`(첫 드래그 전에는 `null`). 브라우저와 프로필 단위이며 Host 설정에는 기록되지 않습니다. |
| 로컬 데스크톱 브리지로 보내는 페이지 `fetch`(`src/client/desktop.ts` → `http://127.0.0.1:37421`) | 선택적 데스크톱 미러: `GET /health`, `POST /state`, CORS 프리플라이트. 새 Harness API를 사용하지 않으며 데스크톱 절반은 플러그인이 아닌 독립 Python 프로세스입니다. |
| `window.__ModuleLoader__.load({ id, factory })`, `{ inject, apply }`를 반환하는 `factory(require)` | 브라우저 번들 형식 |
| 공유 모듈 테이블의 `require('react')` | React, 번들에 포함하지 않음 |
| 모듈 로더의 `require.asset(reference)`와 `package.json` `"./assets/*": "./assets/*"` | 생성된 콘텐츠 해시 스프라이트 참조를 페이지 URL로 매핑합니다. 리졸버가 없으면 `src/client/asset-url.ts`가 원시 문서 상대 참조로 폴백합니다. |
| `$PWD/profiles/web/node_modules` 번들 해석과 `/plugins/<package>/…` 제공 | 패키지 전달(플러그인 에셋 라우트 포함) |

Chat snapshot 필드, navigation response, 입력창 액션은 이미 공개 슬롯 props/hooks입니다.
크기 행은 호스트의 기존 `settings.general.item` 목록 슬롯을 사용하고, 에셋 라우트는 모듈
로더의 기존 `require.asset`과 패키지 `exports` 맵을 사용합니다. 새 Harness API를 사용하지
않으며 15개 장면 집합도 바뀌지 않았습니다.

## 브리지 → 오버레이 데이터 흐름

1. 숨겨진 `conversation.input.dock` 항목(`src/client/Pet.tsx`의 `CompanionBridge`,
   `src/client/bridge.ts` 사용)이 현재 `SessionSnapshot`, `InputState`, Chat
   snapshot(실시간 비트, 답변 미리보기, 최신 확정 어시스턴트 노드),
   `useSessionStatus` 대기 상호작용 플래그, 입력창 액션을 받습니다.
2. 이를 모듈 수준 컴패니언 사실 저장소에 병합하고 구독자에게 알립니다. 사실에는 실행
   시작/정지 타임스탬프, `live` 비트필드(1 도구, 2 추론, 4 답변), 한 줄 `report`, 전체
   `detail`이 포함됩니다. 실시간 비트는 Chat snapshot과 같은 프레임 안에서 갱신되며,
   `report`/`detail`은 턴 실행 중 동결되고 정지 시 한 번 게시됩니다.
3. `shell.overlay` 컴포넌트(`Companion`)가 `useCompanionFacts()`로 저장소를 읽고
   `useSessionStatus`도 구독한 뒤, `src/client/state.ts`의 `deriveScene`으로 장면을
   추론합니다.
4. 대화가 언마운트되면 브리지가 `connected: false`와 `running: false`를 게시하고 마지막
   사실을 유지합니다. 오버레이는 아무 세션도 게시하지 않는 실행 상태를 주장하지 않고
   유휴/수면 동작으로 돌아갑니다.
5. 장면 선택에는 프롬프트 텍스트를 읽지 않고 모델 호출도 하지 않습니다. 초안은 호버 메시지
   입력창이 입력창을 통해 전송한 뒤 복원할 수 있도록 스냅샷될 뿐입니다.
6. 완료 상태는 고정됩니다. `success`와 보고서 행은 사용자가 컴패니언에 호버하거나(320 ms
   대기) 새 턴이 시작될 때까지 유지되며, navigation 미리보기가 비어 있으면 보고서가 정리된
   `detail`로 대체됩니다. 자세히 버튼은 전체 답변을 React 이스케이프된 일반 텍스트(줄바꿈
   유지, 8000자 제한)로 보여 주는 뷰포트 제한 `role="dialog"`를 열며, ✕, Escape, 바깥
   클릭으로 닫힙니다. 보고서 텍스트는 `role="status"` / `aria-live="polite"`를 유지하고
   버튼은 `aria-expanded`를 노출합니다.

## 6개 언어 사전

모든 UI 문구는 Host locale 파일이 아니라 `src/client/text.ts`에 있습니다:

- `LANGUAGES` — 6개 언어와 표시 라벨: English, Русский, 中文, Tiếng Việt, 日本語,
  한국어.
- `languageFromTag(tag)` — BCP 47 태그(예: `navigator.language`)를 언어 id로 해석하며
  기본값은 영어입니다.
- `SCENE_LABELS` — 6개 언어 모두에서 장면별 캡션 하나.
- `UI_TEXT` — 위치 초기화, 닫기, 호버 입력창의 placeholder와 보내기 컨트롤을 포함한 모든
  설정/메시지 입력창 라벨.

`locale/*.json`은 설정 → 플러그인에 표시되는 플러그인 인벤토리 메타데이터
(`meta.title` / `meta.description`)로 남아 있으며 이제 같은 6개 언어를 포함합니다. 장면
캡션과 UI 문구는 6개 언어 모두에서 자연스럽고 정확한 표현으로 다듬었고, 인벤토리
제목/설명도 같은 방식으로 다시 작성했습니다. 번역 완성도는 `tests/text.test.ts`가
검증합니다.

## 프로토타입에서 변경된 사항

1. **두 워크스페이스 패키지 대신 하나의 설치 가능한 패키지.** `-ui`와 `-bundle` 분리는
   DSH 소스 체크아웃 안에서만 의미가 있습니다. `cordis.patch.yml`, `index.js`,
   `package.json`(`dsh.bundle` + `dsh.client`), locale 메타데이터가 이제 저장소
   루트에 있습니다.
2. **커밋된 클라이언트 번들을 위한 의존성 없는 빌드.** `tools/build-assets.mjs`가 콘텐츠
   해시 에셋 라우트 참조를 작성하고, `tools/build-client.mjs`가 esbuild로 TypeScript를
   번들링하며 `react`는 external로 유지하고 결과를 모듈 로더 등록으로 감쌉니다. 생성된
   `client.js`가 커밋되므로 설치에 툴체인이 필요 없습니다.
3. **실제 테마 토큰.** `--dsw-alias-border-l3`와 `--dsw-specific-input-major`는 제공되는
   토큰이 아닙니다. 플러그인은 `--dsw-alias-border-l2`, `--dsw-alias-bg-layer-1`,
   `--dsw-alias-bg-overlay`, `--dsw-alias-brand-primary`를 각각 리터럴 폴백과 함께
   사용하므로 오버레이와 패널이 하드코딩된 어두운 팔레트 대신 호스트 테마를 따릅니다.
4. **입력창 dock 시각 요소 대신 프레임 전체 오버레이.** 컴패니언이 `shell.overlay`로
   이동했습니다(모든 열 위, 모든 페이지). 숨겨진 사실 브리지만
   `conversation.input.dock`에 남아 입력창에 레이아웃 간격을 추가하지 않습니다.
5. **클릭 통과 오버레이 레이어.** 오버레이 레이어는 `pointer-events: none`이며,
   컴패니언과 톱니바퀴, 패널만 포인터 입력을 받아 페이지 나머지는 이전처럼 스크롤과 선택이
   가능합니다.
6. **어디로든 드래그 배치.** 작은 드래그 임계값이 드래그와 클릭을 구분하고, 위치는
   뷰포트에 맞게 제한되며 크기 변경 시 다시 제한되고, `kappy.pixel-companions.ui.v1`의
   `position: {x, y}`로 저장됩니다(첫 드래그 전에는 `null`이라 그 전까지 자동 오른쪽 아래
   기본 위치가 크기 변경을 계속 따라갑니다).
7. **6개 UI 언어.** `src/client/text.ts`에 사전과 `languageFromTag`가 있습니다. 첫 실행은
   `navigator.language`를 따르고 아니면 영어입니다. 설정 패널에서 언어를 실시간으로
   전환합니다.
8. **플러그인 인벤토리 메타데이터.** `locale/en.json`, `locale/ru.json`,
   `locale/zh.json`, `locale/ja.json`, 그리고 새 `locale/vi.json` / `locale/ko.json`이
   `meta.title` / `meta.description`을 담고 `icon.svg`가 내보내지므로, 설정 → 플러그인
   목록에 패키지 id 대신 이름으로 표시됩니다.
9. **소스 체크아웃 설치 프로그램 제거.** `install-to-dsh.sh`와
   `packages/experimental/**` 트리를 삭제했습니다. 문서화된 경로는 프로필 번들입니다.
10. **선택적 데스크톱 창.** `desktop/companion.py`가 같은 스프라이트를 프레임 없이 항상
    위에 표시되는 픽셀 단위 투명 GTK 3 창에 그리고, 루프백 전용 HTTP 브리지
    (`src/client/desktop.ts`)를 통해 페이지에서 표시 상태를 받습니다. 기본적으로 꺼져
    있고 프롬프트/초안/메시지/세션 데이터를 담지 않으며 새 Harness API가 필요하지
    않습니다.
11. **v3 에셋과 roaming 이동 비주얼.** `assets/`에 이제 30개 girl + 30개 whale
    스프라이트(각 15개 장면)와 선택적 `assets/whale/roaming.{webp,png}` 쌍이 있습니다.
    Deepy를 드래그하는 동안 오버레이나 데스크톱 창에서 책상이 없는 `roaming` 애니메이션이
    장면을 대체해 고정 가구가 따라오지 않으며, 놓으면 장면이 돌아옵니다. `roaming`은
    장면이 아닙니다. 15개 상태 머신, `deriveScene`, 브리지 페이로드, 데스크톱 프로토콜은
    바뀌지 않았고 Harness API도 추가되지 않았습니다.
12. **실시간 상태, 호버 메시지 입력창, 고정 완료와 세부 정보.** 장면은 이제 어시스턴트
    자체의 작업 — 실행 중인 도구 호출, 스트리밍 중인 추론, 스트리밍 중인 답변 텍스트, 또는
    실시간 스트림이 없는 실행 중 턴 — 을 따르므로 사용자가 초안을 작성해도 `thinking`이
    트리거되지 않습니다. 완료된 턴은 고정됩니다. `success`, 한 줄 보고서, 현지화된
    **자세히** 버튼이 사용자가 컴패니언에 호버하거나 새 턴이 시작될 때까지 유지되며,
    호버하면 닫히고 자세히는 전체 답변을 길이 제한된 일반 텍스트로 엽니다. 컴패니언은
    입력창을 통해 메시지를 보내고 이전 초안을 복원하는 한 줄 입력창도 제공합니다. 보고서와
    호버 메시지 입력창은 하나의 뷰포트 제한 열을 공유하며, 완료 상태가 닫힐 때까지 입력창이
    보고서 바로 아래에 있습니다. 이들은 기존 Chat snapshot, 입력창 액션,
    `useSessionStatus` props를 사용하며 Harness API와 15개 장면 집합은 바뀌지 않았습니다.
    장면 캡션과 UI 문구는 6개 언어 모두에서 개정했습니다.
13. **에셋 라우트 전달과 성능 패스.** 스프라이트는 더 이상 내장되지 않습니다. 매니페스트가
    Harness 에셋 라우트가 제공하는
    `plugins/dsh-pixel-companions/assets/...?v=<sha1-8>` 참조를 담고, `require.asset`과
    원시 폴백으로 해석됩니다. 커밋된 `client.js`는 약 3.3 MB에서 약 72 KiB로 줄었습니다.
    스프라이트는 장면별로 가져와 불변 캐시되고, 콘텐츠 해시가 캐시를 무효화합니다. 브리지는
    사실을 얕은 비교하고, 1초 시계와 데스크톱 프로브/하트비트는 숨겨진 탭에서 멈추며, 답변
    미리보기는 정지 시 한 번만 게시되고, 사용자 활동은 장면을 바꾸지 않고 유휴 타이머를
    갱신하며(입력은 최대 5초에 한 번으로 제한), 보고서 pill은
    `role="status"` / `aria-live="polite"`로 알립니다. Harness API는 추가되지 않았고,
    15개 장면 집합, 장면 규칙, 호버 입력창, 보고서, 데스크톱 브리지, 데스크톱 앱은 그대로
    입니다.
14. **연속 컴패니언 크기 조절.** 브라우저의 크기 행은 5% 단위의 50–200% 범위 슬라이더로,
    −/+ 버튼, 실시간 퍼센트, 50/100/150/200% 프리셋 칩이 있습니다(활성 프리셋은
    `aria-pressed`로 표시되고 슬라이더는 미세 조정용으로 남습니다). 스프라이트는 실제 확대
    픽셀 크기(100%에서 152×98, 50%에서 76×49, 200%에서 304×196)로 렌더링되므로 클릭 영역,
    캡션과 톱니바퀴, 뷰포트 제한, 보고서/입력 열 앵커, 세부 정보 패널이 모두 이를
    따릅니다. 저장 값은 1% 정밀도를 허용하고 로드 시 50–200으로 제한됩니다. 레거시
    0.8 / 1 / 1.2 값도 계속 동작하며, 슬라이더 변경은 180 ms 디바운스로 저장되고 언마운트
    시 플러시됩니다. 데스크톱 앱은 `--scale`을 0.5~2.0(1%로 반올림)으로 받고, 크기 메뉴는
    50 / 75 / 100 / 125 / 150 / 200%를 제공합니다. 같은 크기 컨트롤이 호스트의
    설정 → 일반 목록에도 등록되어 있으며(`settings.general.item`, id
    `pixel-companions-size`, 순서 40), 현지화된 **컴패니언 크기** 제목과 설명을
    표시합니다. 두 표면은 공유 클라이언트 로컬 환경설정 저장소(`src/client/prefs.ts`,
    `usePrefs` / `updatePrefs`)를 사용하므로 어느 한쪽을 바꾸면 다른 쪽도 즉시 갱신되고,
    같은 `localStorage` 키에 180 ms 디바운스와 `pagehide` 플러시로 저장됩니다. 새 Harness
    API, 프로토콜, 장면 변경은 없습니다.

## 알려진 한계

- 커밋된 JS 번들은 약 72 KiB입니다. 62개 스프라이트 파일(30 girl + 32 whale, 선택적
  roaming 쌍 포함)은 플러그인 에셋 라우트에서 별도로 제공되고 불변 캐시됩니다. 파일이
  바뀌면 `?v=<sha1-8>`이 캐시를 무효화합니다. 부팅 비용은 낮지만 `assets/` 트리가 패키지에
  포함되어야 합니다.
- 장면 매핑은 "완료"와 "중지/취소"를 구분할 수 없습니다. 클라이언트가 현재 `running`을
  불리언으로만 노출하기 때문입니다. 따라서 `success` 장면은 "오류 없이 중지됨"을
  뜻합니다.
- 대기 중 상호작용이 다른 페이지에서 보이는 것은 오버레이가 `useSessionStatus`를 직접
  구독하기 때문입니다. 사실 브리지는 대화 밖에서 언마운트되며, 유지된 사실은
  `connected: false`로 표시됩니다.
- 완료 상태는 고정이며 시간 제한이 없습니다. 보고서 행과 `success` 장면은 사용자가
  컴패니언에 호버하거나(320 ms 대기) 새 턴이 시작될 때까지 유지되고, 보고서 행 자체에
  호버해도 닫히지 않습니다. 답변이 비어 있으면 아무것도 표시되지 않고, 자세히 버튼은 확정된
  어시스턴트 노드가 텍스트를 제공했을 때만 나타납니다. 패널은 일반 텍스트만 렌더링하며
  8000자로 제한되고, `detail`은 페이지에 남아 데스크톱 브리지를 건너지 않습니다. 호버
  메시지 입력창은 대화가 마운트되어 있어야 하며 이전 초안을 최대한 복원합니다. 제출 승인
  단계에서 입력창이 잠겨 있으면 그 초안을 잃을 수 있습니다.
- 그래픽 세션 없이는 데스크톱 창을 확인할 수 없습니다. 실제 창, Cairo 브리지가 없는
  머신의 픽셀 단위 투명(불투명 폴백 예상), 항상 위/드래그/메뉴 렌더링, Wayland 위치 지정은
  여기서 검증하지 않았습니다. 브리지는 페이지가 열려 있고 두 절반이 같은 호스트에서
  실행되어야 합니다. 인증 없는 루프백 트래픽이므로 포트를 노출하면 안 됩니다.
- HTTPS로 제공되는 페이지는 보통 루프백 브리지를 혼합 콘텐츠로 차단합니다. 일반적인
  `http://127.0.0.1:3080` 페이지를 사용하세요.
- 두 슬롯 표면은 React 오류 경계로 감싸져 있습니다. 렌더링 실패는
  `[dsh-pixel-companions] surface failed`를 기록하고 슬롯 항목을 크래시하는 대신 아무것도
  렌더링하지 않으므로 Harness UI 나머지는 계속 동작합니다.
- 선택적 데스크톱 브리지는 프로브 전에 `fetch` 존재를 확인합니다. fetch가 없는
  브라우저는 예외를 던지는 대신 **실행 중이 아님**을 보고합니다.
- 컴패니언은 웹 클라이언트가 게시하는 내용에 반응합니다. `SessionSnapshot`,
  `InputState`, `shell.overlay` 또는 슬롯 등록 형태를 바꾸는 Host는 여기도 함께 업데이트해야
  합니다. 슬롯, props, 모듈 형식은 공개 플러그인 API이므로, 깨짐은 Harness UI가 아니라
  플러그인 자체 코드에서 드러납니다.
