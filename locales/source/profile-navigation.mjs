// AI-authored; native-language review remains separate.
const keys=['errorLanguage','loadingLanguage','applyingProfile'];
const rows={
 en:['The language could not load. Try again.','Loading language…','Applying your profile…'],
 'zh-Hans':['无法加载语言，请重试。','正在加载语言…','正在应用你的档案…'],
 'zh-Hant':['無法載入語言，請重試。','正在載入語言…','正在套用你的檔案…'],
 ja:['言語を読み込めませんでした。もう一度お試しください。','言語を読み込んでいます…','プロフィールを適用しています…'],
 es:['No se pudo cargar el idioma. Inténtalo de nuevo.','Cargando idioma…','Aplicando tu perfil…'],
 fr:['La langue n’a pas pu être chargée. Réessayez.','Chargement de la langue…','Application de votre profil…'],
 de:['Die Sprache konnte nicht geladen werden. Versuche es erneut.','Sprache wird geladen…','Dein Profil wird angewendet…'],
 'pt-BR':['Não foi possível carregar o idioma. Tente novamente.','Carregando idioma…','Aplicando seu perfil…'],
 ru:['Не удалось загрузить язык. Попробуйте ещё раз.','Загрузка языка…','Применение профиля…'],
 ar:['تعذّر تحميل اللغة. حاول مجددًا.','جارٍ تحميل اللغة…','جارٍ تطبيق ملفك…'],
 hi:['भाषा लोड नहीं हो सकी। फिर से कोशिश करें।','भाषा लोड हो रही है…','आपकी प्रोफ़ाइल लागू हो रही है…'],
 bn:['ভাষা লোড করা যায়নি। আবার চেষ্টা করুন।','ভাষা লোড হচ্ছে…','আপনার প্রোফাইল প্রয়োগ হচ্ছে…'],
 id:['Bahasa tidak dapat dimuat. Coba lagi.','Memuat bahasa…','Menerapkan profilmu…'],
 ur:['زبان لوڈ نہیں ہو سکی۔ دوبارہ کوشش کریں۔','زبان لوڈ ہو رہی ہے…','آپ کی پروفائل لاگو ہو رہی ہے…'],
 ko:['언어를 불러오지 못했습니다. 다시 시도해 주세요.','언어를 불러오는 중…','프로필을 적용하는 중…'],
};
export function profileNavigationMessages(locale){const row=rows[locale];if(!row||row.length!==keys.length)throw Error('Missing profile-navigation locale: '+locale);return Object.fromEntries(keys.map((key,i)=>['ui.'+key,row[i].normalize('NFC')]));}
