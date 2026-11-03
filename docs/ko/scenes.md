# 장면

[English](../scenes.md) | [中文](../zh/scenes.md) | [Русский](../ru/scenes.md) | [Tiếng Việt](../vi/scenes.md) | [日本語](../ja/scenes.md) | 한국어

컴패니언은 한 번에 정확히 하나의 장면을 표시합니다. 장면은 웹 클라이언트가 이미 게시하는
실시간 사실에서 선택되며, 프롬프트 텍스트에서 무엇도 추론하지 않고 모델 호출도 하지
않습니다. 또한 사용자의 입력은 장면을 바꾸지 않습니다. 규칙은 `src/client/state.ts`의
`deriveScene`에 있고 `tests/state.test.ts`가 다룹니다. 장면 캡션은 6개 언어로
현지화되어 있으며(`src/client/text.ts`, `SCENE_LABELS`), 규칙 자체는 언어와 무관합니다.

## 입력

| 사실 | 출처 | 의미 |
| --- | --- | --- |
| `running` | 사실 브리지를 통한 `SessionSnapshot.running` | Host에서 턴이 실행 중 |
| `pendingInteraction` | `useSessionStatus(…)` → `status.pendingInteraction` | 승인이나 질문이 사용자를 기다림 |
| `inputPhase` | 사실 브리지를 통한 `InputState.phase` | `plain`, `adjudicating`, `claimed`, `submitting`, `sending` |
| `toolRunning` | 브리지를 통한 `ChatSnapshot.legacy.runningCalls` 비어 있지 않음 | 지금 도구 호출이 실행 중 |
| `assistantStream` | 브리지를 통한 `ChatSnapshot.legacy.partial.blocks[].kind`와 비어 있지 않은 `text`(`reasoning` 또는 `text`) | 어시스턴트가 지금 스트리밍 중인 내용 |
| `error` | `SessionSnapshot.promptError` 또는 `lastAgentError` | 전송 또는 에이전트 오류가 보고됨 |
| `openError` | `SessionSnapshot.openState === 'error'` | 세션 기록을 열지 못함 |
| `runningMs` | `running`이 true가 된 뒤의 시간 | 현재 실행 지속 시간 |
| `idleMs` | 마지막 세션/턴 변경 뒤의 시간 | 수면 타이머에 사용 |
| `flash` | 실패한 정지 후의 로컬 4.8초 타이머 | 오류 플래시. 성공한 정지는 대신 고정 표시 |

실시간 비트는 `CompanionFacts.live`(1 = 도구 호출 실행 중, 2 = 추론 스트리밍 중, 4 = 답변
텍스트 스트리밍 중)로 오버레이에 도달하며, Chat snapshot과 같은 프레임 안에서 게시되므로
실시간 장면 변경은 사실상 즉시 반영됩니다. 1초 시계는 경과 시간 단계와 수면 타이머에만
사용됩니다.

사실은 `conversation.input.dock`의 숨겨진 브리지 항목이 게시하고 오버레이가 읽습니다. 대화가
마운트되어 있지 않으면 마지막 사실이 `connected: false`와 `running: false`로 유지되어
오버레이는 유휴/수면 동작으로 돌아갑니다. 오버레이 자체도 `useSessionStatus`를 구독하므로
대기 중 상호작용은 비대화 페이지에서도 계속 보입니다.

## 규칙 순서

처음 일치하는 규칙이 적용됩니다:

```text
openError                          -> error
pendingInteraction                 -> waiting
inputPhase sending/submitting/adjudicating -> typing
toolRunning                        -> working
assistantStream === 'reasoning'    -> thinking
assistantStream === 'answer'       -> typing
running:
    runningMs > 180 000            -> coffee
    runningMs >  75 000            -> tired
    otherwise                      -> thinking   (request in flight, no live stream)
flash === 'error' or error         -> error
flash === 'success'                -> success
idleMs > 110 000                   -> sleeping
otherwise                          -> idle
```

`success`에 대한 `flash` 규칙은 `deriveScene`에 아직 남아 있지만, 오버레이는 더 이상
시간 제한이 있는 성공 플래시를 만들지 않습니다. 성공한 정지는 고정된 `success` 완료
상태(아래)로 적용됩니다. 4.8초 창을 유지하는 것은 오류 플래시뿐입니다. 실시간 비트는
시계에 묶이지 않으므로 경과 시간 단계(`tired` / `coffee`)와 수면 타이머만 대략 1초
단위입니다.

## 고정 완료 상태와 세부 정보 패널

성공한 정지는 고정됩니다. 오버레이는 사용자가 컴패니언에 호버하거나(320 ms 대기로 보고서로
이동하는 포인터가 지나가며 닫히지 않게 함) 새 턴이 시작될 때까지 `success`와 한 줄 보고서를
유지합니다. 호버하면 카드가 닫히고 장면은 `idle`/`sleeping`으로 돌아가며, 새로 완료된 턴이
다시 엽니다. 완료 결과가 보이기를 기다리는 동안 컴패니언은 잠들지 않습니다.

보고서 행은 미리보기와 현지화된 **자세히** 버튼을 보여 줍니다. 이 버튼은 전체 최종 답변을
일반 텍스트로 담은 스크롤 가능한 패널을 엽니다. React 이스케이프되며 HTML이나 markdown을
렌더링하지 않고, 줄바꿈을 유지하며, 8000자로 제한되고 말줄임 처리되며, 컴패니언 위나
아래에 위치해 뷰포트 안으로 제한됩니다. ✕, Escape 또는 바깥 클릭으로 닫히고 완료 상태가
닫히면 숨겨집니다. 보고서 텍스트는 `role="status"` / `aria-live="polite"`를 유지하고,
버튼은 `aria-expanded`를 노출하며, 패널은 **보고서**라는 제목의 `role="dialog"`입니다
(6개 언어 모두 현지화). 패널이 열려 있는 동안에는 보고서/입력 카드를 대체하고, 닫으면 카드가
복원됩니다.

보고서와 호버 메시지 입력창은 컴패니언 아래(또는 위)에 고정된 하나의 뷰포트 제한 열을
공유합니다. 보고서가 보이는 동안 입력창은 그 바로 아래에 있고 자세히 버튼은 보고서 행에
남습니다. 보고서에 호버하면 보고서가 열린 채로 유지되고 입력창이 드러납니다. 컴패니언에
호버하면 320 ms 대기 후 보고서가 닫히고, 그 뒤에는 입력창이 컴패니언 바로 아래에 있습니다.
보고서에서 벗어나면 입력창은 다시 숨겨지고 보고서는 스프라이트에 호버하거나 새 턴이
시작될 때까지 유지됩니다. 이 열과 세부 정보 패널은 컴패니언이 선택한 크기를 따릅니다
(**크기** 슬라이더는 50%에서 200%까지이며 50/100/150/200% 프리셋 칩이 있고, 같은 컨트롤이
**설정 → 일반 → 컴패니언 크기**에도 있습니다).

## 이동 비주얼(`roaming`)

`roaming`은 이동 비주얼이지 장면이 아닙니다. `SCENES`에 없고 `deriveScene`이 반환하지
않으며 캡션이나 규칙도 없습니다. 사용자가 Deepy를 드래그하는 동안 오버레이는 현재 장면
대신 그의 선택적 책상 없는 `roaming` 애니메이션을 그리므로 책상, 노트북, 램프, 바닥이 그와
함께 이동하지 않습니다. 놓으면 현재 장면이 돌아옵니다. Whale Girl은 roaming 에셋이 없어
이동하는 동안 장면 스프라이트를 유지합니다. 데스크톱 창은 창을 옮기는 동안 같은 방식으로
동작합니다. 위의 15개 상태 규칙은 바뀌지 않았습니다.

## 각 장면이 말하는 것

| 장면 | 안전한 해석 |
| --- | --- |
| `idle` | 아무것도 관찰되지 않음 |
| `typing` | 제출이 진행 중이거나 어시스턴트가 답변 텍스트를 스트리밍 중 |
| `working` | 도구 호출이 실행 중 |
| `thinking` | 어시스턴트가 추론을 스트리밍 중이거나 모델 요청이 왕복 중 — 사용자의 입력이 아님 |
| `tired` | 실시간 신호가 없는 긴 실행 — 모델 피로가 아닌 비유 |
| `coffee` | 실시간 신호가 없는 매우 긴 실행 — 표시용 |
| `waiting` | 사용자를 기다리는 무언가가 있음 |
| `success` | 관찰된 오류 없이 실행이 중지됨 — 취소 포함; 컴패니언에 호버하거나 새 턴이 시작될 때까지 고정 |
| `error` | 실제 오류 신호 |
| `sleeping` | 110초 동안 세션 변화 없음 — 표시 전용 |
| `planning`, `reading`, `searching`, `debugging`, `offline` | 수동 미리보기 전용. 클라이언트에 아직 타입이 있는 신호가 없음 |

`thinking`은 어시스턴트 자체의 작업에 관한 것이지 사용자가 메시지를 작성하는 것과 무관합니다.
초안을 입력해도 아무것도 바뀌지 않으며, 어시스턴트가 실제로 작업을 시작할 때까지 컴패니언은
`idle`을 유지합니다. `tired`, `coffee`, `sleeping`, `success`를 모델에 관한 사실로
제시해서는 안 됩니다. 이들은 거친 클라이언트 상태를 표현하는 비유입니다.

## 수동 미리보기

톱니바퀴 패널은 15개 장면을 모두 썸네일로 나열하며, 캡션은 선택한 UI 언어를 사용합니다.
하나를 선택하면 **자동**을 누르거나 세션이 바뀔 때까지 해당 장면이 강제되며, 강제된 장면은
저장되지 않습니다. 패널에는 **닫기**도 있습니다(Escape로도 닫힘).

## 장면 추가 또는 이름 변경

1. `src/client/state.ts`의 `SCENES`에 장면을 추가하고 `deriveScene`에 규칙을 추가합니다.
2. `src/client/text.ts`의 `SCENE_LABELS`에 6개 언어 모두의 캡션을 추가합니다.
3. `assets/girl/<scene>.{webp,png}`와 `assets/whale/<scene>.{webp,png}`를 추가합니다
   (192×128, 투명 배경; WebP는 120 ms에 16프레임).
4. `npm run build` — 에셋 매니페스트와 클라이언트 번들러가 새 파일을 자동으로 포함합니다.
5. 새 규칙에 맞게 `tests/state.test.ts`를 확장합니다.

## 동작 줄이기

`prefers-reduced-motion: reduce`가 일치하거나 사용자가 **애니메이션**을 끄면 장면의
애니메이션 WebP 대신 정적 PNG가 그려집니다. 검사는 모든 장면 변경 시 실행되므로 OS 수준
변경도 새로고침 없이 반영됩니다.
