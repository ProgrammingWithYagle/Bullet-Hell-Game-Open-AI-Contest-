const rows = {
  en: [
    "A place in the ledger",
    "Complete five, ten and fifteen Story fights in one run, starting at the gate. Later arrivals do not inherit earlier acts.",
    "Three ways to remember",
    "Recover the Shelter, Witness and Refusal endings. The most chosen stance determines an ending; the latest tied choice decides. Each run records one ending.",
  ],
  "zh-Hans": [
    "账簿中的位置",
    "从城门开始，在同一局剧情战役中完成5、10和15场战斗。中途加入不会继承先前章节。",
    "三种铭记方式",
    "找回庇护、见证和拒绝三个结局。选择最多的立场决定结局；次数相同则以最近的选择为准。每局记录一个结局。",
  ],
  "zh-Hant": [
    "帳簿中的位置",
    "從城門開始，在同一局劇情戰役中完成5、10和15場戰鬥。中途加入不會繼承先前章節。",
    "三種銘記方式",
    "找回庇護、見證和拒絕三個結局。選擇最多的立場決定結局；次數相同則以最近的選擇為準。每局記錄一個結局。",
  ],
  ja: [
    "帳簿に残る場所",
    "門から始めた一回のストーリーで5戦、10戦、15戦を完了しましょう。途中参加では前の幕を引き継ぎません。",
    "三つの記憶の形",
    "庇護・証言・拒絶の結末を記録しましょう。最も多く選んだ立場で決まり、同数なら最後の選択が優先されます。一回のランで記録する結末は一つです。",
  ],
  es: [
    "Un lugar en el libro",
    "Completa cinco, diez y quince combates de Historia en una partida desde la puerta. Llegar tarde no concede actos anteriores.",
    "Tres formas de recordar",
    "Recupera los finales de Refugio, Testimonio y Rechazo. La postura más elegida decide el final; la más reciente desempata. Cada partida registra un final.",
  ],
  fr: [
    "Une place au registre",
    "Terminez cinq, dix puis quinze combats narratifs dans une même partie commencée à la porte. Une arrivée tardive ne valide pas les actes précédents.",
    "Trois façons de se souvenir",
    "Retrouvez les fins Refuge, Témoignage et Refus. La position la plus choisie détermine la fin ; le dernier choix départage une égalité. Une partie enregistre une seule fin.",
  ],
  de: [
    "Ein Platz im Register",
    "Schließe in einem an der Pforte begonnenen Story-Lauf fünf, zehn und fünfzehn Kämpfe ab. Später Beitretende erben keine früheren Akte.",
    "Drei Arten der Erinnerung",
    "Entdecke die Enden Zuflucht, Zeugnis und Verweigerung. Die häufigste Haltung entscheidet, bei Gleichstand die letzte Wahl. Jeder Lauf speichert ein Ende.",
  ],
  "pt-BR": [
    "Um lugar no livro",
    "Conclua cinco, dez e quinze lutas de História em uma partida iniciada no portão. Entrar depois não concede atos anteriores.",
    "Três formas de lembrar",
    "Recupere os finais Abrigo, Testemunho e Recusa. A postura mais escolhida determina o final; a escolha mais recente desempata. Cada partida registra um final.",
  ],
  ru: [
    "Место в книге",
    "Завершите пять, десять и пятнадцать сюжетных боёв в одном заходе от ворот. Позднее присоединение не засчитывает прошлые акты.",
    "Три способа помнить",
    "Откройте концовки Укрытие, Свидетельство и Отказ. Решает самый частый выбор позиции, а при равенстве — последний. За заход записывается одна концовка.",
  ],
  hi: [
    "बही में एक जगह",
    "द्वार से शुरू की गई एक कहानी दौड़ में पाँच, दस और पंद्रह लड़ाइयाँ पूरी करें। देर से जुड़ने पर पिछले अंक नहीं मिलते।",
    "याद रखने के तीन रास्ते",
    "आश्रय, गवाही और इनकार के अंत प्राप्त करें। सबसे अधिक चुना रुख अंत तय करता है; बराबरी पर अंतिम चुनाव। हर दौड़ में एक अंत दर्ज होता है।",
  ],
  ar: [
    "مكان في السجل",
    "أكمل خمس معارك قصصية ثم عشرا ثم خمس عشرة في جولة واحدة تبدأ عند البوابة. الانضمام المتأخر لا يمنح الفصول السابقة.",
    "ثلاث طرق للتذكر",
    "استعد نهايات الملاذ والشهادة والرفض. يحدد الموقف الأكثر اختيارا النهاية، ويحسم آخر اختيار التعادل. تسجل كل جولة نهاية واحدة.",
  ],
  bn: [
    "খাতায় একটি জায়গা",
    "দরজা থেকে শুরু করা একটি গল্পের দৌড়ে পাঁচ, দশ ও পনেরোটি লড়াই শেষ করুন। পরে যোগ দিলে আগের অঙ্কের কৃতিত্ব পাওয়া যায় না।",
    "মনে রাখার তিন পথ",
    "আশ্রয়, সাক্ষ্য ও প্রত্যাখ্যানের সমাপ্তি সংগ্রহ করুন। সবচেয়ে বেশি বেছে নেওয়া অবস্থান সমাপ্তি ঠিক করে; সমান হলে শেষ পছন্দটি জেতে। প্রতি দৌড়ে একটি সমাপ্তি লেখা হয়।",
  ],
  id: [
    "Tempat dalam buku",
    "Selesaikan lima, sepuluh, dan lima belas pertarungan Cerita dalam satu perjalanan dari gerbang. Pemain yang terlambat tidak mewarisi babak sebelumnya.",
    "Tiga cara mengenang",
    "Temukan akhir Perlindungan, Kesaksian, dan Penolakan. Sikap terbanyak menentukan akhir; pilihan terbaru memecahkan seri. Setiap perjalanan mencatat satu akhir.",
  ],
  ur: [
    "بہی میں ایک جگہ",
    "دروازے سے شروع ہونے والی ایک کہانی دوڑ میں پانچ، دس اور پندرہ لڑائیاں مکمل کریں۔ دیر سے شامل ہونے پر پچھلے حصے نہیں ملتے۔",
    "یاد رکھنے کے تین راستے",
    "پناہ، گواہی اور انکار کے انجام حاصل کریں۔ سب سے زیادہ چنا گیا مؤقف انجام طے کرتا ہے، برابری پر آخری انتخاب۔ ہر دوڑ میں ایک انجام درج ہوتا ہے۔",
  ],
  ko: [
    "장부 속의 자리",
    "문에서 시작한 한 번의 스토리 진행에서 전투 다섯 번, 열 번, 열다섯 번을 완료하세요. 늦게 참가하면 이전 막의 공적을 받지 않습니다.",
    "기억하는 세 가지 길",
    "피난처, 증언, 거부의 결말을 찾으세요. 가장 많이 고른 입장이 결말을 정하며 동률이면 마지막 선택을 따릅니다. 한 번의 진행에는 결말 하나만 기록됩니다.",
  ],
};
export function storyJournalMessages(locale) {
  const row = rows[locale];
  if (!row || row.length !== 4) throw Error("Story journal locale " + locale);
  return Object.fromEntries(
    [
      "storyActsTitle",
      "storyActsHelp",
      "storyEndingsTitle",
      "storyEndingsHelp",
    ].map((key, i) => ["journal." + key, row[i].normalize("NFC")]),
  );
}
