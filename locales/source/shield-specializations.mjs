const rows = {
  en: [
    "Shield capacity",
    "Reserve Plating",
    "Citadel Lining",
    "Capacity bonuses multiply your difficulty-based shield limit without refilling it. Heavy can add up to 50%, Tank up to 75%. Hellish still allows no personal shield.",
  ],
  "zh-Hans": [
    "护盾容量",
    "储备装甲",
    "堡垒内衬",
    "容量加成乘以当前难度的护盾上限，不会补充护盾。重装最多增加50%，坦克最多增加75%。地狱难度仍禁止个人护盾。",
  ],
  "zh-Hant": [
    "護盾容量",
    "儲備裝甲",
    "堡壘內襯",
    "容量加成乘以目前難度的護盾上限，不會補充護盾。重裝最多增加50%，坦克最多增加75%。地獄難度仍禁止個人護盾。",
  ],
  ja: [
    "シールド容量",
    "予備装甲",
    "城塞の裏張り",
    "容量ボーナスは難易度によるシールド上限に掛かり、シールド自体は補充しません。ヘビーは最大50%、タンクは最大75%増加します。地獄では個人シールドを得られません。",
  ],
  es: [
    "Capacidad de escudo",
    "Blindaje de reserva",
    "Revestimiento de ciudadela",
    "Las bonificaciones multiplican el límite de escudo de la dificultad sin rellenarlo. Pesado puede añadir hasta un 50% y Tanque hasta un 75%. Infernal sigue sin permitir escudo personal.",
  ],
  fr: [
    "Capacité du bouclier",
    "Blindage de réserve",
    "Doublure de citadelle",
    "Les bonus multiplient la limite de bouclier de la difficulté sans le recharger. Le Lourd peut ajouter jusqu’à 50 %, le Tank jusqu’à 75 %. Infernal interdit toujours le bouclier personnel.",
  ],
  de: [
    "Schildkapazität",
    "Reservepanzerung",
    "Zitadellenfutter",
    "Kapazitätsboni multiplizieren die Schildgrenze der Schwierigkeit, ohne den Schild aufzufüllen. Heavy erhält bis zu 50 %, Tank bis zu 75 % mehr. Höllisch erlaubt weiterhin keinen persönlichen Schild.",
  ],
  "pt-BR": [
    "Capacidade de escudo",
    "Blindagem de reserva",
    "Revestimento da cidadela",
    "Os bônus multiplicam o limite de escudo da dificuldade sem recarregá-lo. Pesado pode adicionar até 50% e Tanque até 75%. Infernal continua sem permitir escudo pessoal.",
  ],
  ru: [
    "Ёмкость щита",
    "Резервная броня",
    "Подкладка цитадели",
    "Бонусы умножают предел щита текущей сложности, не пополняя его. Тяжёлый боец может добавить до 50%, Танк — до 75%. Адская сложность по-прежнему запрещает личные щиты.",
  ],
  hi: [
    "ढाल क्षमता",
    "आरक्षित कवच",
    "गढ़ की परत",
    "क्षमता बोनस कठिनाई के अनुसार ढाल सीमा को गुणा करते हैं, ढाल भरते नहीं। हैवी अधिकतम 50% और टैंक अधिकतम 75% जोड़ सकते हैं। नारकीय कठिनाई पर निजी ढाल अब भी बंद है।",
  ],
  ar: [
    "سعة الدرع",
    "تدريع احتياطي",
    "بطانة القلعة",
    "تضاعف مكافآت السعة حد الدرع المحدد بالصعوبة دون إعادة ملئه. يستطيع الثقيل إضافة حتى 50% والدبابة حتى 75%. تبقى الدروع الشخصية ممنوعة في الجحيم.",
  ],
  bn: [
    "ঢালের ধারণক্ষমতা",
    "মজুত বর্ম",
    "দুর্গের আস্তরণ",
    "ধারণক্ষমতার বোনাস কঠিনতা অনুযায়ী ঢালের সীমা গুণ করে, ঢাল ভরে না। হেভি সর্বোচ্চ 50% এবং ট্যাঙ্ক সর্বোচ্চ 75% যোগ করতে পারে। নারকীয় কঠিনতায় ব্যক্তিগত ঢাল এখনও নিষিদ্ধ।",
  ],
  id: [
    "Kapasitas perisai",
    "Pelat cadangan",
    "Lapisan benteng",
    "Bonus kapasitas mengalikan batas perisai sesuai kesulitan tanpa mengisinya. Heavy dapat menambah hingga 50%, Tank hingga 75%. Kesulitan neraka tetap melarang perisai pribadi.",
  ],
  ur: [
    "ڈھال کی گنجائش",
    "اضافی زرہ",
    "قلعے کی تہہ",
    "گنجائش کا بونس مشکل کے مطابق ڈھال کی حد کو ضرب دیتا ہے، ڈھال بھرتا نہیں۔ ہیوی زیادہ سے زیادہ 50% اور ٹینک 75% اضافہ کر سکتے ہیں۔ جہنمی مشکل پر ذاتی ڈھال اب بھی ممنوع ہے۔",
  ],
  ko: [
    "보호막 용량",
    "예비 장갑",
    "성채 안감",
    "용량 보너스는 난이도별 보호막 한도에 곱해지며 보호막을 채우지는 않습니다. 헤비는 최대 50%, 탱크는 최대 75% 증가합니다. 지옥에서는 여전히 개인 보호막을 얻을 수 없습니다.",
  ],
};
export function shieldSpecializationMessages(locale) {
  const r = rows[locale];
  if (!r) throw Error("Missing shield specialization locale " + locale);
  return Object.fromEntries(
    [
      "stat.shieldCapacity",
      "shieldPath.heavy.name",
      "shieldPath.tank.name",
      "shieldPath.help",
    ].map((k, i) => [k, r[i]]),
  );
}
