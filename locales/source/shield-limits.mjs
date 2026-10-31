// AI-authored translations; native-language acceptance remains open.
const rows={
  en:['Combined personal shield cap: {percent}% of maximum health.','Personal shields are disabled on Hellish.'],
  'zh-Hans':['个人护盾总上限：最大生命的{percent}%。','Hellish难度禁用个人护盾。'],
  'zh-Hant':['個人護盾總上限：最大生命的{percent}%。','Hellish難度停用個人護盾。'],
  ja:['個人シールドの合計上限：最大体力の{percent}%。','Hellishでは個人シールドは無効です。'],
  es:['Límite total de escudo personal: {percent}% de la salud máxima.','Los escudos personales están desactivados en Hellish.'],
  fr:['Plafond cumulé des boucliers personnels : {percent}% de la vie maximale.','Les boucliers personnels sont désactivés en Hellish.'],
  de:['Gemeinsame Obergrenze persönlicher Schilde: {percent}% der maximalen Gesundheit.','Persönliche Schilde sind auf Hellish deaktiviert.'],
  'pt-BR':['Limite total de escudo pessoal: {percent}% da vida máxima.','Escudos pessoais estão desativados no Hellish.'],
  ru:['Общий предел личных щитов: {percent}% максимального здоровья.','На Hellish личные щиты отключены.'],
  hi:['व्यक्तिगत ढाल की कुल सीमा: अधिकतम स्वास्थ्य का {percent}%।','Hellish में व्यक्तिगत ढाल बंद हैं।'],
  ar:['الحد الإجمالي للدروع الشخصية: {percent}% من أقصى صحة.','الدروع الشخصية معطلة في Hellish.'],
  bn:['ব্যক্তিগত ঢালের মোট সীমা: সর্বোচ্চ স্বাস্থ্যের {percent}%।','Hellish-এ ব্যক্তিগত ঢাল বন্ধ।'],
  id:['Batas gabungan perisai pribadi: {percent}% kesehatan maksimum.','Perisai pribadi dinonaktifkan di Hellish.'],
  ur:['ذاتی ڈھال کی مجموعی حد: زیادہ سے زیادہ صحت کا {percent}%۔','Hellish میں ذاتی ڈھال بند ہیں۔'],
  ko:['개인 보호막 총한도: 최대 체력의 {percent}%.','Hellish에서는 개인 보호막을 사용할 수 없습니다.']
};
const starting={
  en:'Starting shield each fight: {percent}% of your maximum shield.',
  'zh-Hans':'每场战斗的初始护盾：护盾上限的{percent}%。',
  'zh-Hant':'每場戰鬥的初始護盾：護盾上限的{percent}%。',
  ja:'各戦闘の開始シールド：シールド上限の{percent}%。',
  es:'Escudo al iniciar cada combate: {percent}% de tu escudo máximo.',
  fr:'Bouclier au début de chaque combat : {percent}% de votre bouclier maximal.',
  de:'Startschild pro Kampf: {percent}% deiner maximalen Schildkapazität.',
  'pt-BR':'Escudo no início de cada luta: {percent}% do seu escudo máximo.',
  ru:'Щит в начале каждого боя: {percent}% максимальной ёмкости щита.',
  hi:'हर लड़ाई की शुरुआती ढाल: अधिकतम ढाल का {percent}%।',
  ar:'الدرع في بداية كل معركة: {percent}% من أقصى درع لك.',
  bn:'প্রতি লড়াইয়ের শুরুর ঢাল: সর্বোচ্চ ঢালের {percent}%।',
  id:'Perisai awal setiap pertarungan: {percent}% dari kapasitas perisai maksimum.',
  ur:'ہر لڑائی کی ابتدائی ڈھال: زیادہ سے زیادہ ڈھال کا {percent}%۔',
  ko:'매 전투 시작 보호막: 최대 보호막의 {percent}%.'
};
export function shieldLimitMessages(locale){
  const row=rows[locale];if(!row)throw Error('Missing shield-limit locale '+locale);
  return {'ui.shieldLimit':row[0].normalize('NFC'),'ui.shieldsDisabled':row[1].normalize('NFC'),'ui.classStartingShield':starting[locale].normalize('NFC')};
}
