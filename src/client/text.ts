/** UI languages, localized scene captions, and settings copy. */

/** Every language the companion UI ships with. */
export const LANGUAGES = [
  { id: 'en', label: 'English' },
  { id: 'ru', label: 'Русский' },
  { id: 'zh', label: '中文' },
  { id: 'vi', label: 'Tiếng Việt' },
  { id: 'ja', label: '日本語' },
  { id: 'ko', label: '한국어' },
] as const
export type Language = (typeof LANGUAGES)[number]['id']

/** Resolve one language id from a BCP 47 tag, defaulting to English. */
export function languageFromTag(tag: string | undefined): Language {
  const primary = (tag ?? '').toLowerCase().split('-')[0]
  const match = LANGUAGES.find((language) => language.id === primary)
  return match === undefined ? 'en' : match.id
}

import type { Scene } from './state.ts'

/** One caption per scene, in every supported language. */
export const SCENE_LABELS: Record<Scene, Record<Language, string>> = {
  idle: { en: 'Idle', ru: 'Отдыхает', zh: '空闲', vi: 'Đang nghỉ', ja: '待機中', ko: '대기 중' },
  typing: { en: 'Typing', ru: 'Печатает', zh: '正在输入', vi: 'Đang gõ', ja: '入力中', ko: '입력 중' },
  thinking: { en: 'Thinking', ru: 'Думает', zh: '思考中', vi: 'Đang suy nghĩ', ja: '考え中', ko: '생각 중' },
  planning: { en: 'Planning', ru: 'Планирует', zh: '规划中', vi: 'Đang lập kế hoạch', ja: '計画中', ko: '계획 중' },
  reading: { en: 'Reading', ru: 'Читает', zh: '阅读中', vi: 'Đang đọc', ja: '読書中', ko: '읽는 중' },
  searching: { en: 'Searching', ru: 'Ищет', zh: '搜索中', vi: 'Đang tìm', ja: '検索中', ko: '검색 중' },
  working: { en: 'Working', ru: 'Работает', zh: '工作中', vi: 'Đang làm việc', ja: '作業中', ko: '작업 중' },
  success: { en: 'Done!', ru: 'Готово!', zh: '完成！', vi: 'Xong rồi!', ja: '完了！', ko: '완료!' },
  waiting: { en: 'Waiting for approval', ru: 'Ждёт подтверждения', zh: '等待确认', vi: 'Đang chờ bạn xác nhận', ja: '確認待ち', ko: '확인 대기' },
  error: { en: 'Error', ru: 'Ошибка', zh: '出错了', vi: 'Có lỗi', ja: 'エラー', ko: '오류' },
  tired: { en: 'Long-running', ru: 'Долго работает', zh: '长时间运行', vi: 'Đang chạy lâu', ja: '長時間実行中', ko: '오래 실행 중' },
  coffee: { en: 'Still working ☕', ru: 'Всё ещё работает ☕', zh: '还在工作 ☕', vi: 'Vẫn đang làm việc ☕', ja: 'まだ作業中 ☕', ko: '아직 작업 중 ☕' },
  sleeping: { en: 'Sleeping', ru: 'Спит', zh: '睡觉中', vi: 'Đang ngủ', ja: 'おやすみ', ko: '잠자는 중' },
  debugging: { en: 'Debugging', ru: 'Отлаживает', zh: '调试中', vi: 'Đang gỡ lỗi', ja: 'デバッグ中', ko: '디버깅 중' },
  offline: { en: 'Offline', ru: 'Нет связи', zh: '离线', vi: 'Mất kết nối', ja: 'オフライン', ko: '오프라인' },
}

/** Every string the settings panel and the pet's message box render, per language. */
export interface UiCopy {
  settingsTitle: string
  settingsAria: string
  showCompanion: string
  character: string
  scale: string
  language: string
  motion: string
  visible: string
  testScene: string
  auto: string
  resetPosition: string
  close: string
  previewAria: string
  desktopWindow: string
  desktopHint: string
  desktopConnected: string
  desktopAbsent: string
  desktopOff: string
  desktopPreview: string
  desktopWarning: string
  messagePlaceholder: string
  send: string
  reportTitle: string
  reportDetails: string
  smaller: string
  bigger: string
  sizeTitle: string
  sizeDescription: string
}

export const UI_TEXT: Record<Language, UiCopy> = {
  en: {
    settingsTitle: 'Pixel Companions',
    settingsAria: 'Companion settings',
    showCompanion: 'Show companion',
    character: 'Character',
    scale: 'Size',
    language: 'Language',
    motion: 'Animation',
    visible: 'Visible',
    testScene: 'Preview scene',
    auto: 'Auto',
    resetPosition: 'Reset position',
    close: 'Close',
    previewAria: 'Choose a scene to preview',
    desktopWindow: 'Desktop window',
    desktopHint: 'Run desktop/companion.py to show the companion outside the browser',
    desktopConnected: 'Connected',
    desktopAbsent: 'Not running',
    desktopOff: 'Off',
    desktopPreview: 'Desktop window preview',
    desktopWarning: 'Not running — start desktop/companion.py',
    messagePlaceholder: 'Send a message…',
    send: 'Send',
    reportTitle: 'Report',
    reportDetails: 'Details',
    smaller: 'Smaller',
    bigger: 'Larger',
    sizeTitle: 'Companion size',
    sizeDescription: 'How large the pixel companion is drawn on the page.',
  },
  ru: {
    settingsTitle: 'Pixel Companions',
    settingsAria: 'Настройки компаньона',
    showCompanion: 'Показать компаньона',
    character: 'Персонаж',
    scale: 'Размер',
    language: 'Язык',
    motion: 'Анимация',
    visible: 'Показывать',
    testScene: 'Предпросмотр сцены',
    auto: 'Авто',
    resetPosition: 'Сбросить позицию',
    close: 'Закрыть',
    previewAria: 'Выберите сцену для предпросмотра',
    desktopWindow: 'Окно на рабочем столе',
    desktopHint: 'Запустите desktop/companion.py, чтобы показывать компаньона вне браузера',
    desktopConnected: 'Подключено',
    desktopAbsent: 'Не запущено',
    desktopOff: 'Выкл.',
    desktopPreview: 'Предпросмотр окна на рабочем столе',
    desktopWarning: 'Не запущено — запустите desktop/companion.py',
    messagePlaceholder: 'Написать сообщение…',
    send: 'Отправить',
    reportTitle: 'Отчёт',
    reportDetails: 'Подробнее',
    smaller: 'Уменьшить',
    bigger: 'Увеличить',
    sizeTitle: 'Размер компаньона',
    sizeDescription: 'Насколько крупным рисовать пиксельного компаньона на странице.',
  },
  zh: {
    settingsTitle: 'Pixel Companions',
    settingsAria: '伴侣设置',
    showCompanion: '显示伴侣',
    character: '角色',
    scale: '大小',
    language: '语言',
    motion: '动画',
    visible: '显示',
    testScene: '预览场景',
    auto: '自动',
    resetPosition: '重置位置',
    close: '关闭',
    previewAria: '选择要预览的场景',
    desktopWindow: '桌面窗口',
    desktopHint: '运行 desktop/companion.py 即可在浏览器外显示伴侣',
    desktopConnected: '已连接',
    desktopAbsent: '未运行',
    desktopOff: '已关闭',
    desktopPreview: '桌面窗口预览',
    desktopWarning: '未运行 — 请运行 desktop/companion.py',
    messagePlaceholder: '发送消息…',
    send: '发送',
    reportTitle: '报告',
    reportDetails: '详情',
    smaller: '缩小',
    bigger: '放大',
    sizeTitle: '伴侣大小',
    sizeDescription: '像素伴侣在页面上的显示大小。',
  },
  vi: {
    settingsTitle: 'Pixel Companions',
    settingsAria: 'Cài đặt bạn đồng hành',
    showCompanion: 'Hiện bạn đồng hành',
    character: 'Nhân vật',
    scale: 'Kích thước',
    language: 'Ngôn ngữ',
    motion: 'Chuyển động',
    visible: 'Hiển thị',
    testScene: 'Xem trước cảnh',
    auto: 'Tự động',
    resetPosition: 'Đặt lại vị trí',
    close: 'Đóng',
    previewAria: 'Chọn cảnh để xem trước',
    desktopWindow: 'Cửa sổ trên màn hình',
    desktopHint: 'Chạy desktop/companion.py để hiện bạn đồng hành bên ngoài trình duyệt',
    desktopConnected: 'Đã kết nối',
    desktopAbsent: 'Chưa chạy',
    desktopOff: 'Tắt',
    desktopPreview: 'Xem trước cửa sổ trên màn hình',
    desktopWarning: 'Chưa chạy — hãy chạy desktop/companion.py',
    messagePlaceholder: 'Nhập tin nhắn…',
    send: 'Gửi',
    reportTitle: 'Báo cáo',
    reportDetails: 'Chi tiết',
    smaller: 'Nhỏ hơn',
    bigger: 'Lớn hơn',
    sizeTitle: 'Kích thước bạn đồng hành',
    sizeDescription: 'Bạn đồng hành pixel hiển thị lớn đến đâu trên trang.',
  },
  ja: {
    settingsTitle: 'Pixel Companions',
    settingsAria: 'コンパニオンの設定',
    showCompanion: 'コンパニオンを表示',
    character: 'キャラクター',
    scale: 'サイズ',
    language: '言語',
    motion: 'アニメーション',
    visible: '表示',
    testScene: 'シーンのプレビュー',
    auto: '自動',
    resetPosition: '位置をリセット',
    close: '閉じる',
    previewAria: 'プレビューするシーンを選択',
    desktopWindow: 'デスクトップウィンドウ',
    desktopHint: 'ブラウザの外に表示するには desktop/companion.py を実行してください',
    desktopConnected: '接続済み',
    desktopAbsent: '未起動',
    desktopOff: 'オフ',
    desktopPreview: 'デスクトップウィンドウのプレビュー',
    desktopWarning: '未起動 — desktop/companion.py を実行してください',
    messagePlaceholder: 'メッセージを送信…',
    send: '送信',
    reportTitle: 'レポート',
    reportDetails: '詳細',
    smaller: '小さく',
    bigger: '大きく',
    sizeTitle: 'コンパニオンの大きさ',
    sizeDescription: 'ページ上に表示するピクセルコンパニオンの大きさ。',
  },
  ko: {
    settingsTitle: 'Pixel Companions',
    settingsAria: '컴패니언 설정',
    showCompanion: '컴패니언 표시',
    character: '캐릭터',
    scale: '크기',
    language: '언어',
    motion: '애니메이션',
    visible: '표시',
    testScene: '장면 미리보기',
    auto: '자동',
    resetPosition: '위치 초기화',
    close: '닫기',
    previewAria: '미리 볼 장면 선택',
    desktopWindow: '데스크톱 창',
    desktopHint: '브라우저 밖에 표시하려면 desktop/companion.py를 실행하세요',
    desktopConnected: '연결됨',
    desktopAbsent: '실행 중이 아님',
    desktopOff: '꺼짐',
    desktopPreview: '데스크톱 창 미리보기',
    desktopWarning: '실행 중 아님 — desktop/companion.py를 실행하세요',
    messagePlaceholder: '메시지 보내기…',
    send: '보내기',
    reportTitle: '보고서',
    reportDetails: '자세히',
    smaller: '작게',
    bigger: '크게',
    sizeTitle: '컴패니언 크기',
    sizeDescription: '페이지에 표시되는 픽셀 컴패니언의 크기입니다.',
  },
}
