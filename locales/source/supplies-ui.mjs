const rows = {
  en: ['Supplies', "Carry three item types, two each. Use {bindings} or tap a slot."],
  'zh-Hans': ['补给', "可携带三种物品，每种两个。按{bindings}或点按物品栏使用。"],
  'zh-Hant': ['補給', "可攜帶三種物品，每種兩個。按{bindings}或點按物品欄使用。"],
  ja: ['補給品', "3種類を各2個まで携帯できます。{bindings}キーかスロットのタップで使用。"],
  es: ['Suministros', "Lleva tres tipos, dos de cada uno. Usa {bindings} o toca una casilla."],
  fr: ['Provisions', "Trois types, deux objets chacun. Utilisez {bindings} ou touchez une case."],
  de: ['Vorräte', "Drei Arten, je zwei Stück. Mit {bindings} oder durch Antippen verwenden."],
  'pt-BR': ['Suprimentos', "Leve três tipos, dois de cada. Use {bindings} ou toque em um espaço."],
  ru: ['Припасы', "Три типа, по два предмета. Нажмите {bindings} или коснитесь ячейки."],
  hi: ['आपूर्ति', "तीन प्रकार की दो-दो वस्तुएँ रखें। {bindings} दबाएँ या खाने पर टैप करें।"],
  ar: ['المؤن', "احمل ثلاثة أنواع، قطعتين من كل نوع. استخدم {bindings} أو المس الخانة."],
  bn: ['রসদ', "তিন ধরনের জিনিস, প্রতিটির দুটি রাখুন। {bindings} চাপুন বা ঘরে ট্যাপ করুন।"],
  id: ['Perbekalan', "Bawa tiga jenis, masing-masing dua. Gunakan {bindings} atau ketuk slot."],
  ur: ['رسد', "تین قسم کی دو دو اشیا رکھیں۔ {bindings} دبائیں یا خانے کو چھوئیں۔"],
  ko: ['보급품', "세 종류를 두 개씩 소지합니다. {bindings} 키를 누르거나 칸을 탭하세요."],
};
export const suppliesMessages = id => ({ 'ui.supplies': rows[id][0], 'ui.supplyHelp': rows[id][1] });
