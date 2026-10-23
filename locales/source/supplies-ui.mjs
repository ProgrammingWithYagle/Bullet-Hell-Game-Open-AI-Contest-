const rows = {
  en: ['Supplies', 'Carry three item types, two each. Use 1/2/3 or tap a slot.'],
  'zh-Hans': ['补给', '可携带三种物品，每种两个。按1/2/3或点按物品栏使用。'],
  'zh-Hant': ['補給', '可攜帶三種物品，每種兩個。按1/2/3或點按物品欄使用。'],
  ja: ['補給品', '3種類を各2個まで携帯できます。1/2/3キーかスロットのタップで使用。'],
  es: ['Suministros', 'Lleva tres tipos, dos de cada uno. Usa 1/2/3 o toca una casilla.'],
  fr: ['Provisions', 'Trois types, deux objets chacun. Utilisez 1/2/3 ou touchez une case.'],
  de: ['Vorräte', 'Drei Arten, je zwei Stück. Mit 1/2/3 oder durch Antippen verwenden.'],
  'pt-BR': ['Suprimentos', 'Leve três tipos, dois de cada. Use 1/2/3 ou toque em um espaço.'],
  ru: ['Припасы', 'Три типа, по два предмета. Нажмите 1/2/3 или коснитесь ячейки.'],
  hi: ['आपूर्ति', 'तीन प्रकार की दो-दो वस्तुएँ रखें। 1/2/3 दबाएँ या खाने पर टैप करें।'],
  ar: ['المؤن', 'احمل ثلاثة أنواع، قطعتين من كل نوع. استخدم 1/2/3 أو المس الخانة.'],
  bn: ['রসদ', 'তিন ধরনের জিনিস, প্রতিটির দুটি রাখুন। 1/2/3 চাপুন বা ঘরে ট্যাপ করুন।'],
  id: ['Perbekalan', 'Bawa tiga jenis, masing-masing dua. Gunakan 1/2/3 atau ketuk slot.'],
  ur: ['رسد', 'تین قسم کی دو دو اشیا رکھیں۔ 1/2/3 دبائیں یا خانے کو چھوئیں۔'],
  ko: ['보급품', '세 종류를 두 개씩 소지합니다. 1/2/3 키를 누르거나 칸을 탭하세요.'],
};
export const suppliesMessages = id => ({ 'ui.supplies': rows[id][0], 'ui.supplyHelp': rows[id][1] });
