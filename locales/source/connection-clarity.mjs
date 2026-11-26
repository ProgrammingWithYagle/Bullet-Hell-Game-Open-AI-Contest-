// AI-authored connection progress; native-language acceptance remains open.
const keys = ['serverWaking', 'searchingRooms', 'findingRoom', 'errorServerAddress'];
const rows = {
 en: ['Connecting to the server. It may take a moment to start.', 'Looking for rooms…', 'Looking up that room code…', 'This address is not a compatible game server. Check the address with the host.'],
 'zh-Hans': ['正在连接服务器，启动可能需要一点时间。', '正在查找房间…', '正在查找该房间代码…', '此地址不是兼容的游戏服务器，请向房主确认地址。'],
 'zh-Hant': ['正在連線伺服器，啟動可能需要一點時間。', '正在尋找房間…', '正在查詢該房間代碼…', '此位址不是相容的遊戲伺服器，請向房主確認位址。'],
 ja: ['サーバーに接続しています。起動に少し時間がかかる場合があります。', 'ルームを探しています…', 'ルームコードを確認しています…', 'このアドレスは対応するゲームサーバーではありません。ホストにアドレスを確認してください。'],
 es: ['Conectando al servidor. Puede tardar un momento en iniciarse.', 'Buscando salas…', 'Buscando ese código de sala…', 'Esta dirección no corresponde a un servidor compatible. Confirma la dirección con el anfitrión.'],
 fr: ['Connexion au serveur. Son démarrage peut prendre un instant.', 'Recherche de salons…', 'Recherche de ce code de salon…', 'Cette adresse ne correspond pas à un serveur compatible. Vérifiez l’adresse auprès de l’hôte.'],
 de: ['Verbindung zum Server wird hergestellt. Der Start kann einen Moment dauern.', 'Räume werden gesucht…', 'Raumcode wird gesucht…', 'Diese Adresse gehört nicht zu einem kompatiblen Spielserver. Prüfe die Adresse mit dem Host.'],
 'pt-BR': ['Conectando ao servidor. Ele pode levar um momento para iniciar.', 'Procurando salas…', 'Procurando esse código de sala…', 'Este endereço não corresponde a um servidor compatível. Confirme o endereço com quem hospeda.'],
 ru: ['Подключение к серверу. Его запуск может занять немного времени.', 'Поиск комнат…', 'Поиск по коду комнаты…', 'По этому адресу нет совместимого игрового сервера. Уточните адрес у создателя комнаты.'],
 hi: ['सर्वर से जुड़ रहे हैं। उसे शुरू होने में थोड़ा समय लग सकता है।', 'कमरे खोज रहे हैं…', 'इस कमरे का कोड खोज रहे हैं…', 'यह पता किसी संगत गेम सर्वर का नहीं है। होस्ट से पता जाँचें।'],
 ar: ['جارٍ الاتصال بالخادم. قد يستغرق بدء تشغيله لحظة.', 'جارٍ البحث عن غرف…', 'جارٍ البحث عن رمز الغرفة…', 'هذا العنوان ليس لخادم لعبة متوافق. تحقق من العنوان مع المضيف.'],
 bn: ['সার্ভারে সংযোগ করা হচ্ছে। চালু হতে একটু সময় লাগতে পারে।', 'ঘর খোঁজা হচ্ছে…', 'এই ঘরের কোড খোঁজা হচ্ছে…', 'এই ঠিকানায় উপযুক্ত গেম সার্ভার নেই। হোস্টের সঙ্গে ঠিকানা মিলিয়ে নিন।'],
 id: ['Menghubungkan ke server. Server mungkin perlu waktu sebentar untuk menyala.', 'Mencari ruangan…', 'Mencari kode ruangan itu…', 'Alamat ini bukan server game yang cocok. Periksa alamatnya dengan host.'],
 ur: ['سرور سے جڑ رہے ہیں۔ اسے شروع ہونے میں کچھ وقت لگ سکتا ہے۔', 'کمرے تلاش کیے جا رہے ہیں…', 'اس کمرے کا کوڈ تلاش کیا جا رہا ہے…', 'یہ پتہ کسی ہم آہنگ گیم سرور کا نہیں ہے۔ میزبان سے پتہ چیک کریں۔'],
 ko: ['서버에 연결하고 있습니다. 시작하는 데 잠시 걸릴 수 있습니다.', '방을 찾고 있습니다…', '방 코드를 확인하고 있습니다…', '이 주소는 호환되는 게임 서버가 아닙니다. 호스트에게 주소를 확인해 주세요.'],
};
const unavailable = {
  "en": "This room is full or closed. Search again, or ask the host for a new code.",
  "zh-Hans": "房间已满或已关闭，请重新查找或向房主索取新代码。",
  "zh-Hant": "房間已滿或已關閉，請重新搜尋或向房主索取新代碼。",
  "ja": "ルームが満員か、閉じられています。もう一度探すか、ホストに新しいコードを確認してください。",
  "es": "La sala está llena o cerrada. Busca de nuevo o pide un código nuevo al anfitrión.",
  "fr": "Ce salon est plein ou fermé. Relancez la recherche ou demandez un nouveau code à l’hôte.",
  "de": "Dieser Raum ist voll oder geschlossen. Suche erneut oder frage den Host nach einem neuen Code.",
  "pt-BR": "Esta sala está cheia ou fechada. Busque novamente ou peça um novo código a quem hospeda.",
  "ru": "Комната заполнена или закрыта. Повторите поиск или попросите у создателя новый код.",
  "hi": "यह कमरा भर चुका है या बंद है। फिर खोजें या होस्ट से नया कोड माँगें।",
  "ar": "الغرفة ممتلئة أو مغلقة. ابحث مجددًا أو اطلب رمزًا جديدًا من المضيف.",
  "bn": "ঘরটি পূর্ণ বা বন্ধ। আবার খুঁজুন বা হোস্টের কাছে নতুন কোড চান।",
  "id": "Ruangan ini penuh atau sudah ditutup. Cari lagi, atau minta kode baru kepada host.",
  "ur": "یہ کمرہ بھرا ہوا یا بند ہے۔ دوبارہ تلاش کریں یا میزبان سے نیا کوڈ مانگیں۔",
  "ko": "방이 가득 찼거나 닫혔습니다. 다시 검색하거나 호스트에게 새 코드를 요청하세요."
};
export function connectionClarityMessages(locale) {
 const row = rows[locale];
 if (!row || row.length !== keys.length) throw Error('Missing connection locale ' + locale);
 return {...Object.fromEntries(keys.map((key, i) => ['ui.' + key, row[i].normalize('NFC')])), 'ui.errorRoomUnavailable': unavailable[locale].normalize('NFC')};
}
