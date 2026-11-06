const values = {
  en: [
    "Reading position is saved on this device.",
    "Reading position is kept for this session only.",
  ],
  "zh-Hans": ["阅读位置保存在此设备上。", "阅读位置仅在本次会话中保留。"],
  "zh-Hant": ["閱讀位置儲存在此裝置上。", "閱讀位置僅在本次工作階段保留。"],
  ja: [
    "読書位置はこの端末に保存されます。",
    "読書位置はこのセッション中のみ保持されます。",
  ],
  es: [
    "La posición de lectura se guarda en este dispositivo.",
    "La posición de lectura se conserva solo durante esta sesión.",
  ],
  fr: [
    "La position de lecture est enregistrée sur cet appareil.",
    "La position de lecture est conservée pour cette session uniquement.",
  ],
  de: [
    "Die Leseposition wird auf diesem Gerät gespeichert.",
    "Die Leseposition bleibt nur für diese Sitzung erhalten.",
  ],
  "pt-BR": [
    "A posição de leitura é salva neste dispositivo.",
    "A posição de leitura é mantida apenas nesta sessão.",
  ],
  ru: [
    "Место чтения сохраняется на этом устройстве.",
    "Место чтения хранится только в этом сеансе.",
  ],
  hi: [
    "पढ़ने की जगह इस डिवाइस पर सहेजी जाती है।",
    "पढ़ने की जगह सिर्फ इस सत्र तक रखी जाती है।",
  ],
  ar: [
    "يُحفظ موضع القراءة على هذا الجهاز.",
    "يُحتفظ بموضع القراءة لهذه الجلسة فقط.",
  ],
  bn: [
    "পড়ার অবস্থান এই ডিভাইসে সংরক্ষিত হয়।",
    "পড়ার অবস্থান শুধু এই সেশন পর্যন্ত রাখা হয়।",
  ],
  id: [
    "Posisi membaca disimpan di perangkat ini.",
    "Posisi membaca hanya disimpan selama sesi ini.",
  ],
  ur: [
    "پڑھنے کی جگہ اس آلے پر محفوظ ہوتی ہے۔",
    "پڑھنے کی جگہ صرف اس نشست تک رکھی جاتی ہے۔",
  ],
  ko: [
    "읽던 위치가 이 기기에 저장됩니다.",
    "읽던 위치는 이번 세션에서만 유지됩니다.",
  ],
};
export function storyReadingMessages(locale) {
  const row = values[locale];
  if (!row) throw Error("Story reading locale " + locale);
  return {
    "ui.readingSaved": row[0].normalize("NFC"),
    "ui.readingSessionOnly": row[1].normalize("NFC"),
  };
}
