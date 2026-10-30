// Authored gallery labels; native-language review remains separate.
const keys=['galleryTitle','galleryPrevious','galleryNext','galleryCover','gallerySurvivors','galleryMaps','galleryPosition','galleryShow'];
const rows={
 en:['Game images','Previous image','Next image',"Welcome to Grave Accord",'Meet the survivors','Six places to fight','Image {current} of {total}','Show image {number}'],
 'zh-Hans':['游戏图片','上一张图片','下一张图片',"欢迎来到 Grave Accord",'认识幸存者','六处战场','第 {current} 张，共 {total} 张','显示第 {number} 张图片'],
 'zh-Hant':['遊戲圖片','上一張圖片','下一張圖片',"歡迎來到 Grave Accord",'認識倖存者','六處戰場','第 {current} 張，共 {total} 張','顯示第 {number} 張圖片'],
 ja:['ゲームの画像','前の画像','次の画像',"Grave Accord へようこそ",'生存者たち','6つの戦場','{current} / {total} 枚目','画像 {number} を表示'],
 es:['Imágenes del juego','Imagen anterior','Imagen siguiente',"Bienvenido a Grave Accord",'Conoce a los supervivientes','Seis lugares para luchar','Imagen {current} de {total}','Mostrar imagen {number}'],
 fr:['Images du jeu','Image précédente','Image suivante',"Bienvenue dans Grave Accord",'Rencontrez les survivants','Six lieux de combat','Image {current} sur {total}','Afficher l’image {number}'],
 de:['Spielbilder','Vorheriges Bild','Nächstes Bild',"Willkommen bei Grave Accord",'Lerne die Überlebenden kennen','Sechs Schauplätze','Bild {current} von {total}','Bild {number} anzeigen'],
 'pt-BR':['Imagens do jogo','Imagem anterior','Próxima imagem',"Boas-vindas a Grave Accord",'Conheça os sobreviventes','Seis lugares para lutar','Imagem {current} de {total}','Mostrar imagem {number}'],
 ru:['Изображения игры','Предыдущее изображение','Следующее изображение',"Добро пожаловать в Grave Accord",'Знакомство с выжившими','Шесть мест для сражений','Изображение {current} из {total}','Показать изображение {number}'],
 ar:['صور اللعبة','الصورة السابقة','الصورة التالية',"مرحبًا بك في Grave Accord",'تعرّف على الناجين','ستة مواقع للقتال','الصورة {current} من {total}','عرض الصورة {number}'],
 hi:['खेल की तस्वीरें','पिछली तस्वीर','अगली तस्वीर',"Grave Accord में आपका स्वागत है",'जीवित बचे लोगों से मिलें','लड़ने के छह स्थान','तस्वीर {current} / {total}','तस्वीर {number} दिखाएँ'],
 bn:['গেমের ছবি','আগের ছবি','পরের ছবি',"Grave Accord-এ স্বাগতম",'বেঁচে থাকা চরিত্রদের সঙ্গে পরিচয়','লড়াইয়ের ছয়টি জায়গা','ছবি {current} / {total}','ছবি {number} দেখান'],
 id:['Gambar permainan','Gambar sebelumnya','Gambar berikutnya',"Selamat datang di Grave Accord",'Kenali para penyintas','Enam tempat bertarung','Gambar {current} dari {total}','Tampilkan gambar {number}'],
 ur:['کھیل کی تصاویر','پچھلی تصویر','اگلی تصویر',"Grave Accord میں خوش آمدید",'زندہ بچنے والوں سے ملیں','لڑائی کے چھ مقامات','تصویر {current} از {total}','تصویر {number} دکھائیں'],
 ko:['게임 이미지','이전 이미지','다음 이미지',"Grave Accord에 오신 것을 환영합니다",'생존자들을 만나 보세요','여섯 전투 장소','이미지 {current} / {total}','이미지 {number} 보기'],
};
export function homeGalleryMessages(locale){const row=rows[locale];if(!row||row.length!==keys.length)throw Error('Missing home-gallery locale: '+locale);return Object.fromEntries(keys.map((key,i)=>['ui.'+key,row[i].normalize('NFC')]));}
