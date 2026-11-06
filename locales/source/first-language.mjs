// AI-authored; native-language and rendered review remain separate.
const keys=['welcomeLanguageTitle','welcomeLanguageHelp','languageContinue','defaultDisplayName'];
const rows={
 en:['Choose your language','You can change this later from the menu.','Continue','Survivor'],
 'zh-Hans':['选择语言','你以后可以在菜单中更改语言。','继续','幸存者'],
 'zh-Hant':['選擇語言','你之後可以在選單中變更語言。','繼續','倖存者'],
 ja:['言語を選んでください','あとでメニューから変更できます。','続ける','生存者'],
 es:['Elige tu idioma','Puedes cambiarlo más adelante desde el menú.','Continuar','Superviviente'],
 fr:['Choisissez votre langue','Vous pourrez la changer plus tard dans le menu.','Continuer','Survivant'],
 de:['Wähle deine Sprache','Du kannst sie später im Menü ändern.','Weiter','Überlebender'],
 'pt-BR':['Escolha seu idioma','Você pode mudar depois pelo menu.','Continuar','Sobrevivente'],
 ru:['Выберите язык','Позже его можно изменить в меню.','Продолжить','Выживший'],
 ar:['اختر لغتك','يمكنك تغييرها لاحقًا من القائمة.','متابعة','ناجٍ'],
 hi:['अपनी भाषा चुनें','आप बाद में मेन्यू से इसे बदल सकते हैं।','आगे बढ़ें','जीवित व्यक्ति'],
 bn:['আপনার ভাষা বেছে নিন','পরে মেনু থেকে ভাষা বদলাতে পারবেন।','এগিয়ে যান','জীবিত ব্যক্তি'],
 id:['Pilih bahasamu','Kamu dapat mengubahnya nanti dari menu.','Lanjutkan','Penyintas'],
 ur:['اپنی زبان منتخب کریں','آپ بعد میں مینو سے اسے بدل سکتے ہیں۔','جاری رکھیں','زندہ بچنے والا'],
 ko:['언어를 선택하세요','나중에 메뉴에서 바꿀 수 있습니다.','계속','생존자'],
};
export function firstLanguageMessages(locale){const row=rows[locale];if(!row||row.length!==keys.length)throw Error('Missing first-language locale: '+locale);return Object.fromEntries(keys.map((key,i)=>['ui.'+key,row[i].normalize('NFC')]));}
