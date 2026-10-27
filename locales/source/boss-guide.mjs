// AI-authored; native-language acceptance remains open.
const rows = {
  en: [
    "Boss guide",
    "Close guide",
    "Combat is paused while this guide is open.",
    "Close and resume",
    "Online combat continues while reading.",
  ],
  "zh-Hans": [
    "首领指南",
    "关闭指南",
    "指南打开期间，单人战斗已暂停。",
    "关闭并继续",
    "在线战斗在阅读时仍会继续。",
  ],
  "zh-Hant": [
    "首領指南",
    "關閉指南",
    "指南開啟期間，單人戰鬥已暫停。",
    "關閉並繼續",
    "線上戰鬥在閱讀時仍會繼續。",
  ],
  ja: [
    "ボスの手引き",
    "手引きを閉じる",
    "手引きを開いている間、ソロ戦闘は一時停止します。",
    "閉じて再開",
    "オンライン戦闘は読んでいる間も進みます。",
  ],
  es: [
    "Guía del jefe",
    "Cerrar guía",
    "El combate individual está pausado mientras esta guía está abierta.",
    "Cerrar y continuar",
    "El combate en línea continúa mientras lees.",
  ],
  fr: [
    "Guide du boss",
    "Fermer le guide",
    "Le combat solo est en pause tant que ce guide est ouvert.",
    "Fermer et reprendre",
    "Le combat en ligne continue pendant la lecture.",
  ],
  de: [
    "Bossanleitung",
    "Anleitung schließen",
    "Solokampf pausiert, solange diese Anleitung offen ist.",
    "Schließen und fortsetzen",
    "Onlinekämpfe laufen während des Lesens weiter.",
  ],
  "pt-BR": [
    "Guia do chefe",
    "Fechar guia",
    "O combate solo fica pausado enquanto este guia está aberto.",
    "Fechar e continuar",
    "O combate online continua durante a leitura.",
  ],
  ru: [
    "Руководство по боссу",
    "Закрыть руководство",
    "Одиночный бой приостановлен, пока руководство открыто.",
    "Закрыть и продолжить",
    "Сетевой бой продолжается во время чтения.",
  ],
  ar: [
    "دليل الزعيم",
    "إغلاق الدليل",
    "القتال الفردي متوقف مؤقتاً ما دام هذا الدليل مفتوحاً.",
    "إغلاق ومتابعة",
    "يستمر القتال عبر الإنترنت أثناء القراءة.",
  ],
  hi: [
    "बॉस मार्गदर्शिका",
    "मार्गदर्शिका बंद करें",
    "यह मार्गदर्शिका खुली रहने तक एकल लड़ाई रुकी रहती है।",
    "बंद करें और जारी रखें",
    "पढ़ते समय ऑनलाइन लड़ाई चलती रहती है।",
  ],
  id: [
    "Panduan bos",
    "Tutup panduan",
    "Pertarungan Solo dijeda selama panduan ini terbuka.",
    "Tutup dan lanjutkan",
    "Pertarungan online tetap berjalan saat membaca.",
  ],
  bn: [
    "বস নির্দেশিকা",
    "নির্দেশিকা বন্ধ করুন",
    "নির্দেশিকা খোলা থাকলে একক লড়াই থেমে থাকে।",
    "বন্ধ করে চালিয়ে যান",
    "পড়ার সময় অনলাইন লড়াই চলতে থাকে।",
  ],
  ur: [
    "باس کی رہنمائی",
    "رہنمائی بند کریں",
    "یہ رہنمائی کھلی ہو تو اکیلی لڑائی رکی رہتی ہے۔",
    "بند کر کے جاری رکھیں",
    "پڑھتے وقت آن لائن لڑائی جاری رہتی ہے۔",
  ],
  ko: [
    "보스 안내",
    "안내 닫기",
    "안내가 열린 동안 솔로 전투는 일시 정지됩니다.",
    "닫고 계속",
    "온라인 전투는 읽는 동안에도 계속됩니다.",
  ],
};
export function bossGuideMessages(locale) {
  const row = rows[locale];
  if (!row) throw Error("Missing boss guide controls " + locale);
  return Object.fromEntries(
    [
      "ui.bossGuide",
      "ui.closeBossGuide",
      "ui.bossGuidePaused",
      "ui.bossGuideResume",
      "ui.bossGuideOnline",
    ].map((key, i) => [key, row[i].normalize("NFC")]),
  );
}
