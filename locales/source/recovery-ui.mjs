// AI-authored messages; native-speaker and rendered layout review remain pending.
const rows = {
  en: [
    'Saving the encounter checkpoint…',
    'Checkpoint service unavailable. Practice can continue; recovery after a server restart is unavailable.',
  ],
  'zh-Hans': ['正在保存遭遇战检查点…', '检查点服务不可用。可继续练习，但服务器重启后无法恢复。'],
  'zh-Hant': [
    '正在儲存遭遇戰檢查點…',
    '檢查點服務無法使用。可繼續練習，但伺服器重新啟動後無法恢復。',
  ],
  ja: [
    '戦闘のチェックポイントを保存中…',
    'チェックポイントサービスを利用できません。練習は続けられますが、サーバー再起動後の復元はできません。',
  ],
  es: [
    'Guardando el punto de control del encuentro…',
    'El servicio de puntos de control no está disponible. Puedes seguir practicando, pero no recuperar la partida tras reiniciar el servidor.',
  ],
  fr: [
    'Enregistrement du point de reprise du combat…',
    'Le service de points de reprise est indisponible. Vous pouvez continuer l’entraînement, mais la partie ne pourra pas reprendre après un redémarrage du serveur.',
  ],
  de: [
    'Kontrollpunkt der Begegnung wird gespeichert…',
    'Der Kontrollpunktdienst ist nicht verfügbar. Die Übungsrunde kann weitergehen, lässt sich nach einem Serverneustart aber nicht wiederherstellen.',
  ],
  'pt-BR': [
    'Salvando o ponto de controle do encontro…',
    'O serviço de pontos de controle está indisponível. O treino pode continuar, mas a partida não poderá ser recuperada após reiniciar o servidor.',
  ],
  ru: [
    'Сохранение контрольной точки боя…',
    'Служба контрольных точек недоступна. Тренировку можно продолжить, но после перезапуска сервера восстановление невозможно.',
  ],
  hi: [
    'मुठभेड़ का चेकपॉइंट सहेजा जा रहा है…',
    'चेकपॉइंट सेवा उपलब्ध नहीं है। अभ्यास जारी रख सकते हैं, लेकिन सर्वर दोबारा शुरू होने पर खेल बहाल नहीं होगा।',
  ],
  ar: [
    'جارٍ حفظ نقطة استعادة المواجهة…',
    'خدمة نقاط الاستعادة غير متاحة. يمكن متابعة التدريب، لكن لا يمكن استعادة الجولة بعد إعادة تشغيل الخادم.',
  ],
  bn: [
    'লড়াইয়ের চেকপয়েন্ট সংরক্ষণ করা হচ্ছে…',
    'চেকপয়েন্ট পরিষেবা উপলব্ধ নয়। অনুশীলন চালিয়ে যাওয়া যাবে, তবে সার্ভার পুনরায় চালু হলে খেলা পুনরুদ্ধার করা যাবে না।',
  ],
  id: [
    'Menyimpan titik pemulihan pertempuran…',
    'Layanan titik pemulihan tidak tersedia. Latihan dapat dilanjutkan, tetapi permainan tidak dapat dipulihkan setelah server dimulai ulang.',
  ],
  ur: [
    'مقابلے کا چیک پوائنٹ محفوظ کیا جا رہا ہے…',
    'چیک پوائنٹ سروس دستیاب نہیں ہے۔ مشق جاری رہ سکتی ہے، لیکن سرور دوبارہ شروع ہونے کے بعد کھیل بحال نہیں ہو سکے گا۔',
  ],
  ko: [
    '전투 체크포인트 저장 중…',
    '체크포인트 서비스를 사용할 수 없습니다. 연습은 계속할 수 있지만 서버 재시작 후 경기를 복구할 수 없습니다.',
  ],
};
export const recoveryMessages = (id) => ({
  'ui.checkpointSaving': rows[id][0],
  'ui.checkpointUnavailable': rows[id][1],
});
