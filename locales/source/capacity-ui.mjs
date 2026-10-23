const rows = {
  en: ['Connecting to the server; it may be starting. You can leave from Pause.', 'Waiting for server capacity · queue {position}'],
  'zh-Hans': ['正在连接服务器，服务器可能正在启动。可在暂停菜单中离开。', '等待服务器空位 · 队列 {position}'],
  'zh-Hant': ['正在連線至伺服器，伺服器可能正在啟動。可在暫停選單中離開。', '等待伺服器空位 · 佇列 {position}'],
  ja: ['サーバーに接続中です。起動に時間がかかる場合があります。ポーズから退出できます。', 'サーバーの空きを待っています · 順番 {position}'],
  es: ['Conectando al servidor; puede estar iniciándose. Puedes salir desde Pausa.', 'Esperando espacio en el servidor · cola {position}'],
  fr: ['Connexion au serveur ; il démarre peut-être. Vous pouvez quitter depuis Pause.', 'En attente de place sur le serveur · file {position}'],
  de: ['Verbindung zum Server; er startet möglicherweise. Verlassen ist über Pause möglich.', 'Warten auf Serverkapazität · Warteschlange {position}'],
  'pt-BR': ['Conectando ao servidor; ele pode estar iniciando. Saia pelo menu de pausa.', 'Aguardando vaga no servidor · fila {position}'],
  ru: ['Подключение к серверу; возможно, он запускается. Выйти можно через меню паузы.', 'Ожидание места на сервере · очередь {position}'],
  hi: ['सर्वर से जुड़ रहे हैं; वह शुरू हो रहा हो सकता है। विराम मेन्यू से बाहर जा सकते हैं।', 'सर्वर में जगह की प्रतीक्षा · कतार {position}'],
  ar: ['جارٍ الاتصال بالخادم؛ ربما يبدأ تشغيله. يمكنك المغادرة من قائمة الإيقاف.', 'انتظار سعة الخادم · الطابور {position}'],
  bn: ['সার্ভারে সংযোগ হচ্ছে; এটি চালু হতে পারে। বিরতি মেনু থেকে বের হতে পারবেন।', 'সার্ভারে জায়গার অপেক্ষা · সারি {position}'],
  id: ['Menghubungkan ke server; server mungkin sedang dimulai. Keluar lewat Jeda.', 'Menunggu kapasitas server · antrean {position}'],
  ur: ['سرور سے رابطہ ہو رہا ہے؛ شاید شروع ہو رہا ہو۔ وقفے کے مینو سے نکل سکتے ہیں۔', 'سرور میں جگہ کا انتظار · قطار {position}'],
  ko: ['서버에 연결 중입니다. 시작 중일 수 있습니다. 일시 정지 메뉴에서 나갈 수 있습니다.', '서버 자리 대기 중 · 대기열 {position}'],
};
export const capacityMessages = id => ({ 'ui.serverWaking': rows[id][0], 'ui.waitingCapacity': rows[id][1] });
