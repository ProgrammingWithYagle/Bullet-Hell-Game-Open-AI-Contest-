// Original mechanical copy and translation drafts; key parity is not native-language acceptance.
import { alchemistCopy } from "./alchemist-copy.mjs";
const rows={
 en:'Alchemist|Reagents|Mixtures|Dyehouse|Small Batch|Cast Flask|Standard Batch|Split Pour|Settled Batch|Second Extraction|Samples|Refill bellows|Recipes|Cinder|Chalk|Sap|Empty|Cycle recipe|Class command',
 es:'Alquimista|Reactivos|Mezclas|Tintorería|Lote pequeño|Lanzar frasco|Lote estándar|Vertido dividido|Lote reposado|Segunda extracción|Muestras|Rellenar fuelle|Recetas|Ceniza|Tiza|Savia|Vacío|Cambiar receta|Orden de clase',
 fr:'Alchimiste|Réactifs|Mélanges|Teinturerie|Petit lot|Lancer une fiole|Lot standard|Versement partagé|Lot reposé|Seconde extraction|Échantillons|Remplir le soufflet|Recettes|Cendre|Craie|Sève|Vide|Changer de recette|Commande de classe',
 de:'Alchemist|Reagenzien|Mischungen|Färberei|Kleine Charge|Flasche werfen|Standardcharge|Geteilter Guss|Ruhende Charge|Zweite Extraktion|Proben|Blasebalg nachfüllen|Rezepte|Asche|Kreide|Harz|Leer|Rezept wechseln|Klassenbefehl',
 pt:'Alquimista|Reagentes|Misturas|Tinturaria|Pequeno lote|Lançar frasco|Lote padrão|Vertimento dividido|Lote assentado|Segunda extração|Amostras|Reabastecer fole|Receitas|Cinza|Giz|Seiva|Vazio|Alternar receita|Comando de classe',
 ru:'Алхимик|Реагенты|Смеси|Красильня|Малая партия|Бросок колбы|Стандартная партия|Раздельный разлив|Выдержанная партия|Вторая вытяжка|Образцы|Заполнить мехи|Рецепты|Зола|Мел|Смола|Пусто|Сменить рецепт|Команда класса',
 tr:'Simyacı|Reaktifler|Karışımlar|Boyahane|Küçük Parti|Şişe Fırlat|Standart Parti|Bölünmüş Döküm|Dinlenmiş Parti|İkinci Özüt|Örnekler|Körüğü Doldur|Tarifler|Kül|Tebeşir|Özsu|Boş|Tarifi değiştir|Sınıf komutu',
 id:'Alkemis|Reagen|Campuran|Rumah Pewarna|Batch Kecil|Lempar Botol|Batch Standar|Tuangan Terbagi|Batch Diendapkan|Ekstraksi Kedua|Sampel|Isi Pengembus|Resep|Abu|Kapur|Getah|Kosong|Ganti resep|Perintah kelas',
 ja:'錬金術師|試薬|調合|染色工房|小さな仕込み|瓶投げ|標準仕込み|分注|熟成仕込み|二次抽出|試料|ふいごを補充|処方|灰|白墨|樹液|空|処方を切替|クラス指示',
 ko:'연금술사|시약|혼합물|염색 공방|소량 제조|병 던지기|표준 제조|나누어 붓기|숙성 제조|두 번째 추출|견본|풀무 보충|제조법|재|백묵|수액|비어 있음|제조법 전환|직업 명령',
 zh:'炼金术师|试剂|调配|染坊|小批调配|投掷药瓶|标准批次|分装倾注|静置批次|二次萃取|样品|补充风箱|配方|余烬|白垩|树液|空|切换配方|职业指令',
 hi:'कीमियागर|अभिकर्मक|मिश्रण|रंगशाला|छोटा बैच|शीशी फेंकें|मानक बैच|विभाजित मिश्रण|ठहरा बैच|दूसरा निष्कर्षण|नमूने|धौंकनी भरें|नुस्खे|राख|चाक|रस|खाली|नुस्खा बदलें|वर्ग आदेश',
 bn:'অপরসায়নবিদ|বিকারক|মিশ্রণ|রংঘর|ছোট ব্যাচ|শিশি ছুড়ুন|মানক ব্যাচ|ভাগ করে ঢালা|স্থির ব্যাচ|দ্বিতীয় নিষ্কাশন|নমুনা|হাপর ভরুন|প্রণালি|ছাই|খড়ি|কষ|খালি|প্রণালি বদলান|শ্রেণির নির্দেশ',
 ar:'الخيميائي|الكواشف|الخلطات|دار الصباغة|دفعة صغيرة|رمي القارورة|دفعة معيارية|صب مقسوم|دفعة مستقرة|استخلاص ثان|عينات|ملء المنفاخ|الوصفات|رماد|طباشير|نسغ|فارغ|تبديل الوصفة|أمر الفئة',
 ur:'کیمیاگر|تعامل گر|آمیزے|رنگ خانہ|چھوٹی کھیپ|شیشی پھینکیں|معیاری کھیپ|تقسیم شدہ انڈیل|ٹھہری کھیپ|دوسرا اخراج|نمونے|دھونکنی بھریں|ترکیبیں|راکھ|چاک|رس|خالی|ترکیب بدلیں|کلاس کا حکم',
};
const recipeNames={en:['Flare','Binding','Mending'],es:['Llamarada','Sujeción','Remiendo'],fr:['Flamboiement','Entrave','Soin'],de:['Flamme','Bindung','Heilung'],pt:['Labareda','Contenção','Reparo'],ru:['Вспышка','Связывание','Исцеление'],tr:['Alev','Bağlama','Onarım'],id:['Nyala','Pengikat','Pemulih'],ja:['炎','拘束','手当て'],ko:['화염','속박','치유'],zh:['焰剂','缚剂','愈剂'],hi:['ज्वाला','बंधन','उपचार'],bn:['শিখা','বন্ধন','নিরাময়'],ar:['وهج','ربط','ترميم'],ur:['شعلہ','بندش','مرمت']};
const radiusLabels={en:'Mixture radius',es:'Radio de mezcla',fr:'Rayon du mélange',de:'Mischungsradius',pt:'Raio da mistura',ru:'Радиус смеси',tr:'Karışım yarıçapı',id:'Radius campuran',ja:'調合の範囲',ko:'혼합물 반경',zh:'药剂半径','zh-Hant':'藥劑半徑',hi:'मिश्रण की त्रिज्या',bn:'মিশ্রণের ব্যাসার্ধ',ar:'نصف قطر الخليط',ur:'آمیزے کا رداس'};
export function alchemistMessages(language,c,existing){
 language=language==='pt-BR'?'pt':language==='zh-Hans'?'zh':language;
 rows['zh-Hant']='鍊金術師|試劑|調配|染坊|小批調配|投擲藥瓶|標準批次|分裝傾注|靜置批次|二次萃取|樣品|補充風箱|配方|餘燼|白堊|樹液|空|切換配方|職業指令';
 recipeNames['zh-Hant']=['焰劑','縛劑','癒劑'];
 const row=rows[language]?.split('|'),names=recipeNames[language];
 if(row?.length!==19||!names)throw Error('Missing Alchemist edition '+language);
 const cl=c.classes.find(cl=>cl.id==='alchemist');
 const edition=language==='en'?null:alchemistCopy[language];
 if(language!=='en'&&(!edition||edition.length!==11||edition[10].length!==4))throw Error('Missing Alchemist rules translation '+language);
 const out={
  'class.alchemist.name':row[0],'class.alchemist.role':edition?.[0]??cl.role,'class.alchemist.lore':edition?.[1]??cl.lore,
  'branch.reagents':row[1],'branch.mixtures':row[2],'branch.dyehouse':row[3],
  'ui.alchemySamples':row[10],'ui.alchemyRefill':row[11],'ui.alchemyRecipes':row[12],
  'ui.alchemyStock':row[13]+' {cinder} · '+row[14]+' {chalk} · '+row[15]+' {sap}',
  'ui.alchemyEmpty':row[16],'ui.alchemyQueue':'{queue} / {capacity}',
  'ui.alchemyCycleHint':row[17]+' · {binding}','ui.classCommand':row[18],
  'ui.alchemy.flare':names[0],'ui.alchemy.binding':names[1],'ui.alchemy.mending':names[2],
  'ui.alchemy.flareHint':row[13]+' 1 + '+row[14]+' 1 · 55 HP',
  'ui.alchemy.bindingHint':row[14]+' 1 + '+row[15]+' 1 · 25 HP · −40% / 3s',
  'ui.alchemy.mendingHint':row[13]+' 1 + '+row[15]+' 1 · +18 HP',
  'ui.alchemyBatch':row[6]+' · {count}',
  'stat.alchemyRadius':radiusLabels[language],
  'upgrade.alchemist-damage.name':row[1]+' · '+existing['stat.weaponDamage'],
  'upgrade.alchemist-fire-rate.name':row[1]+' · '+existing['stat.fireRate'],
  'upgrade.alchemist-magazine.name':row[1]+' · '+existing['stat.magazine'],
  'upgrade.alchemist-reload.name':row[1]+' · '+existing['stat.reloadReduction'],
  'supply.alchemist-sample-case.name':row[10],
  'supply.alchemist-sample-case.description':edition?.[8]??'Instantly refill only the primary bellows samples. Does not restore ingredients, prepared vials, ability clocks or batch charges. Carry limit: {maximum}.',
 };
 Object.assign(out,alchemistTalentMessages(language));
 [...cl.abilities,cl.ultimate].forEach((a,i)=>{out['ability.'+a.id+'.name']=row[4+i];out['ability.'+a.id+'.description']=edition?.[2+i]??a.description;});
 for(const w of c.weapons.filter(w=>w.classId==='alchemist')){out['weapon.'+w.id+'.name']=edition?.[10][w.tier]??w.name;out['weapon.'+w.id+'.description']=edition?.[9]??'A real finite-range dosing projectile spends a primary sample. Actual positive primary hits can restore one least-stocked combat ingredient, at most once each second. Empty shots restore none. A separate active-combat clock restores one ingredient every five seconds. Combat stock starts at three of each, with a six-dose cap for each ingredient. Refilling the bellows restores primary samples from unlimited reserve; it does not refill recipes.';}
 for(const s of c.skills.filter(s=>s.classId==='alchemist')){
  const branch=cl.branches.findIndex(b=>b.id===s.branchId),focus=s.lane?(out[s.subbranchNameKey]??existing[s.subbranchNameKey]):'';
  out['skill.'+s.id+'.name']=s.transform?out['talent.'+s.transform+'.name']:language==='en'?s.name:row[1+branch]+' '+s.depth+(focus?' · '+focus:'');
  out['skill.'+s.id+'.description']=existing['skill.soldier-command-1.description'];
 }
 return Object.fromEntries(Object.entries(out).map(([key,value])=>{if(typeof value!=='string'||value.includes('undefined'))throw Error('Missing Alchemist string '+key);return[key,value.normalize('NFC')];}));
}

export function alchemistTalentMessages(language){
 language=language==='pt-BR'?'pt':language==='zh-Hans'?'zh':language;
 const names=language==='zh-Hant'?['分裝傾注','靜置批次','二次萃取']:rows[language]?.split('|').slice(7,10);
 const edition=language==='en'?null:alchemistCopy[language];
 if(!names||names.length!==3||(language!=='en'&&!edition))throw Error('Missing Alchemist talent edition '+language);
 const descriptions=[
  'Each throw creates two real landings 24 units to either side, each with 55% potency and 72% radius. One prepared vial and at most one ultimate charge are spent for the pair. Cover can reject one landing.',
  'Brew for 0.8 seconds instead of 0.4. Each prepared vial gains 25% potency and prepared capacity increases from two to three. Dodge still cancels without refund.',
  'Add two seconds to Cast Flask’s base cooldown. A useful initial splash refunds one of the recipe’s first spent ingredients, at most once per throw group. Empty splashes and later pool pulses give no refund.',
 ];
 const out={};
 ['split-pour','settled-batch','second-extraction'].forEach((id,i)=>{out['talent.'+id+'.name']=names[i];out['talent.'+id+'.description']=edition?.[5+i]??descriptions[i];});
 return out;
}
