# 설치

[English](../installation.md) | [中文](../zh/installation.md) | [Русский](../ru/installation.md) | [Tiếng Việt](../vi/installation.md) | [日本語](../ja/installation.md) | 한국어

`dsh-pixel-companions`는 dsh **번들 패키지**입니다. 아무 일도 하지 않는 Host 절반과, 프레임
전체를 덮는 `shell.overlay` 슬롯에 컴패니언을 그리는 브라우저 절반(`client.js`)으로
구성되므로, dsh 프로필에 설치하고 실행 중인 `dsh web` 프로세스가 제공해야 합니다.

빌드된 `client.js`와 `assets/` 아래 에셋은 저장소에 커밋되어 있습니다. Harness 에셋
라우트가 설치된 패키지에서 이 파일을 제공하므로 설치에는 **빌드 단계**가 필요 없고 Node
툴체인도 필요하지 않습니다.

## 요구 사항

- 초기화된 웹 프로필이 있는 `dsh` CLI(`dsh web`). 프로필 디렉터리는
  `$DSH_HOME/profiles/web`이며 `$DSH_HOME`의 기본값은 `~/.dsh`입니다.
- `PATH`에 `pnpm`이 있어야 합니다. `dsh plugin`은 프로필 디렉터리에서 인자를 pnpm으로
  넘깁니다.
- 소스에서 번들을 다시 빌드할 때만 Node.js 22.6+가 필요합니다.
- 선택적 데스크톱 창은 같은 머신에 Python 3.10+, GTK 3, Pillow가 필요합니다.
  [desktop.md](desktop.md)를 참고하세요.

## 로컬 체크아웃에서 설치

```sh
git clone https://github.com/kappyra/dsh-pixel-companions.git
cd dsh-pixel-companions
dsh plugin --profile web add link:"$PWD"
```

- `link:`는 체크아웃을 복사하지 않고 pnpm 링크로 설치하므로, 체크아웃의 수정 사항이
  재설치 없이 제공됩니다.
- 절대 경로도 사용할 수 있습니다:
  `dsh plugin --profile web add /path/to/dsh-pixel-companions`.
- 번들을 추가하면 프로필 `package.json`의 `dsh.profile.bundles`에 패키지 이름이
  추가되며, 이것이 활성화의 기준입니다.

## Git 주소 또는 tarball에서 설치

```sh
dsh plugin --profile web add github:kappyra/dsh-pixel-companions
# or
npm pack
dsh plugin --profile web add /path/to/dsh-pixel-companions-0.1.0.tgz
```

Git 설치은 커밋된 `client.js`를 가져오며, 설치하는 머신에서는 빌드가 실행되지 않습니다.
패키지는 설치 스크립트를 선언하지 않으므로 pnpm이 빌드 스크립트 승인을 요구하지 않아야
합니다.

## 활성화

`dsh plugin`은 프로필을 기록할 뿐 실행 중인 Host를 재시작하지 않습니다. 함께 제공되는 웹
프로필에서는 `dsh-hmr` 전송이 프로필 변경을 따라가며, 페이지가 보통 1~2초 안에 새 번들을
불러옵니다. 그렇지 않으면:

1. 웹 페이지를 새로고침합니다(확실하지 않으면 강제 새로고침).
2. 그래도 컴패니언이 나타나지 않으면 웹 프로세스를 재시작하고(`Ctrl+C`, 그다음
   `dsh web`) 다시 새로고침합니다.

새로고침 후 컴패니언은 창 오른쪽 아래 근처, 입력창 영역 위에 나타납니다. 프레임 전체를
덮는 오버레이에 있으므로 웹 GUI의 **모든 페이지** — 대화, 설정, 플러그인 — 에서 보이며,
페이지 탐색 후에도 유지됩니다. 페이지 사이를 이동해도 언마운트되지 않고, 전체 새로고침만
번들을 다시 실행합니다. 대화가 열려 있을 필요는 없으며, 세션이 마운트되어 있지 않으면
컴패니언은 유휴/수면 동작으로 돌아갑니다. 마우스 왼쪽 버튼, 터치, 펜으로 창 안 어디로든
끌 수 있고, 옆의 톱니바퀴 버튼이 설정 패널을 엽니다.

## 확인

- **설정 → 플러그인 → 플러그인 목록**에 이 설명과 함께 `Pixel companions`라는 항목이
  표시됩니다(`locale/*.json`에서 가져옴).
- 컴패니언이 입력창 위뿐 아니라 모든 페이지(대화, 설정, 플러그인)에서 보입니다.
- 끌면 움직이고, 창 가장자리 근처에서 놓아도 화면 안에 유지되며, 페이지를 새로고침하면
  끌어 둔 위치가 복원됩니다.
- 톱니바퀴를 누르면 캐릭터, 크기, 언어, 애니메이션, 표시, 위치 초기화, 15개 장면 미리보기
  그리드, 자동, 닫기가 있는 설정 패널이 열립니다.
- Host가 번들을 구성했습니다: `dsh --profile web --dump-config`에
  `dsh-pixel-companions` 행이 표시됩니다.
- 숨겨진 사실 브리지는 입력창에 보이는 DOM을 추가하지 않으며, 오버레이만 그립니다.
- *(선택 사항)* 데스크톱 창이 실행 중이고 **데스크톱 창**이 활성화되어 있으면 톱니바퀴 패널
  행에 **연결됨**이 표시되고 창이 현재 장면을 미러링합니다.

## 선택 사항: 데스크톱 창

컴패니언은 같은 머신의 독립 데스크톱 창으로 미러링할 수도 있습니다. 별도 Python
프로세스이며 또 다른 번들이 아니므로 프로필에는 추가로 설치되는 것이 없습니다:

```sh
sudo apt install python3-gi gir1.2-gtk-3.0 python3-cairo
python3 -m pip install --user Pillow
python3 desktop/companion.py        # or ./desktop/run.sh
```

그다음 컴패니언의 톱니바퀴 패널에서 **데스크톱 창**을 체크합니다. 기본값은 꺼짐이므로
활성화하기 전에는 페이지가 데스크톱 포트를 전혀 확인하지 않습니다. 실시간 상태를 위해서는
페이지가 열려 있어야 하며, 두 절반이 같은 호스트에서 실행되어야 합니다(브리지는 루프백
전용). 전체 안내: [desktop.md](desktop.md).

## 비활성화, 제거, 업그레이드

- **비활성화**(제거하지 않음): 설정 → 플러그인에서 번들을 토글하거나,
  `$DSH_HOME/profiles/web/package.json`의 `dsh.profile.bundles`에서 제거합니다. 컴패니언이
  모든 페이지에서 사라집니다.
- **제거**: `dsh plugin --profile web remove dsh-pixel-companions` 또는 플러그인 페이지를
  사용합니다.
- **링크된 체크아웃 업그레이드**: `git pull` 후 `npm install && npm run build`를 실행하고
  새로고침합니다. HMR 전송이 다시 빌드된 `client.js`를 교체합니다. `package.json` 변경은
  Host 재시작이 필요합니다.
- **Git 설치 제거**: `dsh plugin --profile web remove dsh-pixel-companions`가 의존성과
  번들 항목을 제거합니다.

## CLI 대신 플러그인 페이지 사용

웹 플러그인 페이지도 같은 pnpm 경로로 설치합니다:

1. 사이드바 → **플러그인**.
2. **플러그인 추가**(또는 화살표 → **서드파티 플러그인 설치**).
3. `dsh plugin add`에 넘길 것과 같은 spec을 입력합니다.
4. **설치**, 그다음 **지금 활성화**.

## 활성화 실패 문제 해결

- pnpm 출력과 설치 로그는
  `$DSH_HOME/profiles/web/.plugin-manager/logs/`에 보관됩니다.
- 실패한 실행은 프로필의 `package.json`과 lockfile을 복원합니다.
- 페이지가 Client 모듈을 "loaded without registering"한 번들을 보고하면 `client.js`가
  `window.__ModuleLoader__.load({ id: "dsh-pixel-companions"`로 시작하는지, 그리고
  `package.json`의 패키지 이름이 여전히 모듈 id와 같은지 확인하세요.
