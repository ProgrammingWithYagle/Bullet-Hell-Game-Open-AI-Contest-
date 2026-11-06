const text = {
  en: "Read at your own pace. Preparation begins after every connected survivor presses Ready.",
  "zh-Hans": "按自己的节奏阅读。所有在线幸存者点击准备后才进入战备。",
  "zh-Hant": "依自己的步調閱讀。所有在線倖存者點選準備後才進入戰備。",
  ja: "自分の速さで読めます。接続中の全員が準備完了を押すと装備準備に進みます。",
  es: "Lee a tu ritmo. La preparación comienza cuando todos los supervivientes conectados pulsan Listo.",
  fr: "Lisez à votre rythme. La préparation commence quand tous les survivants connectés appuient sur Prêt.",
  de: "Lies in deinem Tempo. Die Vorbereitung beginnt, wenn alle verbundenen Überlebenden Bereit drücken.",
  "pt-BR":
    "Leia no seu ritmo. A preparação começa quando todos os sobreviventes conectados apertam Pronto.",
  ru: "Читайте в своём темпе. Подготовка начнётся, когда все подключённые выжившие нажмут «Готов».",
  hi: "अपनी गति से पढ़ें। जुड़े सभी जीवित खिलाड़ी तैयार दबाएँ तब तैयारी शुरू होगी।",
  ar: "اقرأ بالسرعة التي تناسبك. يبدأ التجهيز بعد أن يضغط كل ناج متصل على جاهز.",
  bn: "নিজের গতিতে পড়ুন। যুক্ত সব জীবিত খেলোয়াড় প্রস্তুত চাপলে প্রস্তুতি শুরু হবে।",
  id: "Baca sesuai kecepatanmu. Persiapan dimulai setelah semua penyintas terhubung menekan Siap.",
  ur: "اپنی رفتار سے پڑھیں۔ سب منسلک زندہ کھلاڑی تیار دبائیں تو تیاری شروع ہوگی۔",
  ko: "자신의 속도로 읽으세요. 접속 중인 생존자 모두가 준비를 누르면 준비 단계로 넘어갑니다.",
};
export const storyReadyMessages = (locale) => ({
  "ui.storyReadyHelp": text[locale],
});
