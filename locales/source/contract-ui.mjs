const keys=['teamAverage','gradeRequirement','variantNormal','variantBrutal','brutalInfo','withinStrength','aboveStrength','sealedContract','mutationChoice'];
const rows={
en:['Team average: {grade}','{players} with {grade} builds','Standard form','Brutal','Twice health and damage · four phases','Within team strength','Above current team strength','Sealed contract','Accord amendment'],
'zh-Hans':['队伍平均：{grade}','{players}，配装评级 {grade}','常规形态','残暴','生命与伤害翻倍 · 四个阶段','队伍实力足够','高于队伍当前实力','密封契约','协定修订'],
'zh-Hant':['隊伍平均：{grade}','{players}，配裝評級 {grade}','常規形態','殘暴','生命與傷害加倍 · 四個階段','隊伍實力足夠','高於隊伍目前實力','密封契約','協定修訂'],
ja:['チーム平均：{grade}','{players}・ビルド等級 {grade}','通常形態','凶暴','体力とダメージが2倍・4段階','チーム戦力の範囲内','現在のチーム戦力を超過','封印された契約','盟約の改訂'],
es:['Media del equipo: {grade}','{players} con equipo de grado {grade}','Forma estándar','Brutal','Doble vida y daño · cuatro fases','Al alcance del equipo','Supera la fuerza actual del equipo','Contrato sellado','Enmienda del pacto'],
fr:['Moyenne du groupe : {grade}','{players} avec des configurations de rang {grade}','Forme ordinaire','Féroce','Vie et dégâts doublés · quatre phases','À la portée du groupe','Dépasse la force actuelle du groupe','Contrat scellé','Amendement du pacte'],
de:['Teamdurchschnitt: {grade}','{players} mit Builds der Stufe {grade}','Standardform','Brutale Form','Doppelte Gesundheit und Schaden · vier Phasen','Im Bereich der Teamstärke','Über der aktuellen Teamstärke','Versiegelter Auftrag','Änderung des Pakts'],
'pt-BR':['Média da equipe: {grade}','{players} com configurações de grau {grade}','Forma padrão','Forma brutal','Vida e dano em dobro · quatro fases','Ao alcance da equipe','Acima da força atual da equipe','Contrato selado','Emenda do acordo'],
ru:['Средний ранг команды: {grade}','{players} со сборками ранга {grade}','Обычная форма','Свирепая форма','Здоровье и урон удвоены · четыре фазы','По силам команде','Выше текущей силы команды','Запечатанный контракт','Поправка к договору'],
hi:['टीम का औसत: {grade}','{grade} श्रेणी के बिल्ड वाले {players}','सामान्य रूप','क्रूर रूप','दोगुना स्वास्थ्य और क्षति · चार चरण','टीम की शक्ति के भीतर','टीम की मौजूदा शक्ति से ऊपर','मुहरबंद अनुबंध','समझौता संशोधन'],
ar:['متوسط الفريق: {grade}','{players} بتجهيزات من رتبة {grade}','الشكل المعتاد','الشكل الوحشي','ضعف الصحة والضرر · أربع مراحل','ضمن قوة الفريق','أعلى من قوة الفريق الحالية','عقد مختوم','تعديل الميثاق'],
bn:['দলের গড়: {grade}','{grade} গ্রেডের বিল্ডসহ {players}','সাধারণ রূপ','নৃশংস রূপ','দ্বিগুণ স্বাস্থ্য ও ক্ষতি · চারটি পর্যায়','দলের শক্তির মধ্যে','দলের বর্তমান শক্তির উপরে','সিল করা চুক্তি','সমঝোতার সংশোধন'],
id:['Rata-rata tim: {grade}','{players} dengan build tingkat {grade}','Wujud standar','Wujud brutal','Kesehatan dan kerusakan dua kali lipat · empat fase','Sesuai kekuatan tim','Melebihi kekuatan tim saat ini','Kontrak tersegel','Perubahan perjanjian'],
ur:['ٹیم کا اوسط: {grade}','{grade} درجے کی ساخت کے ساتھ {players}','معمول کی شکل','وحشی شکل','دوگنی صحت اور نقصان · چار مرحلے','ٹیم کی طاقت کے اندر','ٹیم کی موجودہ طاقت سے زیادہ','مہر بند معاہدہ','عہد میں ترمیم'],
ko:['팀 평균: {grade}','{grade} 등급 빌드의 {players}','기본 형태','흉포한 형태','체력과 피해 2배 · 4단계','팀 전력 범위 내','현재 팀 전력을 초과','봉인된 계약','협약 개정'],
};
export const contractMessages=id=>Object.fromEntries(keys.map((key,i)=>['ui.'+key,rows[id][i]]));
