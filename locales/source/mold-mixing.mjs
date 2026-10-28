const keys=['phase.0','phase.1','phase.2','phase.3','phaseHint.0','phaseHint.1','phaseHint.2','phaseHint.3','description','brutalHelp','crazedHelp'];
const L={
en:[
'Titration','Distillation','Thermal Runaway','Fractionation',
'Amber triangles are acid; blue squares are alkali. Bait the opposite throw near a pool, then leave. Mixing them makes pale coolant.',
'Vapor crosses the field. Dash through the bank or use coolant; the vapor opens around coolant.',
'Pressure vessels swell before rupture. Make coolant beside a vessel to cool it before its marked burst.',
'Two vapor banks cross in sequence, each with a fresh warning. Cool the vessels and keep a route through each bank.',
'Flasks aim at survivors and mark their landing for 1.4 seconds. Acid and alkali both hurt and slow. Their mixture clears the reagents into coolant that absorbs vapor and cools vessels. Coolant is a reaction product, not a pickup.',
'Brutal links matching reagents into two timed eruptions. Neutralize either pool before the first eruption to cancel the pair.',
'Crazed adds a violet catalyst. Coolant quenches it and is spent; unmixed reagents cause a fresh warned eruption. A catalyst on bare ground leaves a hazardous pool.'
],
de:[
'Säure-Basen-Titration','Heißdestillation','Thermisches Durchgehen','Fraktionierung',
'Bernsteinfarbene Dreiecke sind Säure, blaue Quadrate Lauge. Locke den entgegengesetzten Wurf an eine Pfütze und weiche aus. Die Mischung wird zu hellem Kühlmittel.',
'Dampf zieht über das Feld. Durchquere die Front mit einem Sprint oder nutze Kühlmittel; dort öffnet sich der Dampf.',
'Druckbehälter schwellen vor dem Bersten an. Erzeuge daneben Kühlmittel, um sie vor dem markierten Ausbruch abzukühlen.',
'Zwei Dampffronten folgen aufeinander, jeweils mit neuer Warnung. Kühle die Behälter und halte für jede Front einen Weg frei.',
'Kolben zielen auf Überlebende und markieren die Landung 1,4 Sekunden lang. Säure und Lauge verletzen und verlangsamen. Ihre Mischung beseitigt beide Stoffe und erzeugt Kühlmittel, das Dampf abfängt und Behälter kühlt. Es ist ein Reaktionsprodukt, kein Sammelobjekt.',
'Brutal verbindet gleiche Reagenzien zu zwei zeitversetzten Ausbrüchen. Neutralisiere eine Pfütze vor dem ersten Ausbruch, um beide abzusagen.',
'Crazed ergänzt einen violetten Katalysator. Kühlmittel löscht ihn und wird verbraucht; ungemischte Reagenzien lösen einen neu gewarnten Ausbruch aus. Auf freiem Boden bleibt eine gefährliche Pfütze.'
],
es:[
'Valoración ácido-base','Destilación','Descontrol térmico','Fraccionamiento',
'Los triángulos ámbar son ácido; los cuadrados azules, álcali. Atrae el lanzamiento opuesto cerca de un charco y sal. La mezcla crea refrigerante pálido.',
'El vapor atraviesa el campo. Cruza la nube con una esquiva o usa refrigerante: el vapor se abre a su alrededor.',
'Los recipientes a presión se hinchan antes de romperse. Crea refrigerante junto a uno para enfriarlo antes del estallido marcado.',
'Dos nubes de vapor cruzan sucesivamente, cada una con un aviso nuevo. Enfría los recipientes y conserva una ruta para cada nube.',
'Los frascos apuntan a los supervivientes y marcan su caída durante 1,4 segundos. Ácido y álcali dañan y ralentizan. Mezclarlos elimina ambos y crea refrigerante que absorbe vapor y enfría recipientes. Es un producto de reacción, no un objeto recogible.',
'Brutal enlaza reactivos iguales en dos erupciones programadas. Neutraliza cualquiera de los charcos antes de la primera para cancelar ambas.',
'Crazed añade un catalizador violeta. El refrigerante lo apaga y se consume; los reactivos sin mezclar provocan una nueva erupción avisada. En suelo vacío deja un charco peligroso.'
],
fr:[
'Titrage acide-base','Distillation chaude','Emballement thermique','Fractionnement',
'Les triangles ambrés sont acides ; les carrés bleus sont alcalins. Attirez le jet opposé près d’une flaque, puis partez. Le mélange devient un liquide de refroidissement pâle.',
'La vapeur traverse le terrain. Franchissez le front avec une esquive ou utilisez le liquide de refroidissement : la vapeur s’y ouvre.',
'Les récipients sous pression gonflent avant de céder. Créez du liquide de refroidissement à côté pour les refroidir avant l’explosion annoncée.',
'Deux fronts de vapeur se succèdent, chacun avec un nouvel avertissement. Refroidissez les récipients et gardez un passage pour chaque front.',
'Les fioles visent les survivants et annoncent leur point de chute pendant 1,4 seconde. Acide et alcali blessent et ralentissent. Leur mélange élimine les réactifs et produit un liquide qui absorbe la vapeur et refroidit les récipients. Ce n’est pas un objet à ramasser.',
'Brutal relie des réactifs identiques pour deux éruptions programmées. Neutralisez une flaque avant la première pour annuler les deux.',
'Crazed ajoute un catalyseur violet. Le liquide de refroidissement l’éteint et se consume ; les réactifs non mélangés déclenchent une nouvelle éruption annoncée. Sur sol vide, il laisse une flaque dangereuse.'
],
'pt-BR':[
'Titulação ácido-base','Destilação','Descontrole térmico','Fracionamento',
'Triângulos âmbar são ácido; quadrados azuis são álcali. Atraia o arremesso oposto para perto de uma poça e saia. A mistura vira um líquido de resfriamento claro.',
'O vapor cruza o campo. Atravesse a frente com uma esquiva ou use o líquido de resfriamento; o vapor abre espaço ao redor dele.',
'Os vasos de pressão incham antes de romper. Crie líquido de resfriamento ao lado para esfriá-los antes da explosão marcada.',
'Duas frentes de vapor passam em sequência, cada uma com um novo aviso. Resfrie os vasos e mantenha uma rota para cada frente.',
'Os frascos miram nos sobreviventes e marcam o impacto por 1,4 segundo. Ácido e álcali causam dano e lentidão. Misturá-los elimina os reagentes e cria um líquido que absorve vapor e resfria vasos. Ele é produto da reação, não um item coletável.',
'Brutal liga reagentes iguais em duas erupções programadas. Neutralize uma das poças antes da primeira para cancelar as duas.',
'Crazed adiciona um catalisador violeta. O líquido de resfriamento o apaga e é consumido; reagentes não misturados causam uma nova erupção avisada. Em solo vazio, deixa uma poça perigosa.'
],
ru:[
'Кислотно-щелочное титрование','Перегонка','Тепловой разгон','Фракционирование',
'Янтарные треугольники — кислота, синие квадраты — щёлочь. Подманите противоположный бросок к луже и отойдите. Смесь станет светлым охладителем.',
'Пар проходит через всё поле. Пройдите фронт рывком или используйте охладитель: вокруг него пар расступается.',
'Сосуды под давлением раздуваются перед разрывом. Создайте рядом охладитель, чтобы остудить сосуд до отмеченного взрыва.',
'Два паровых фронта идут по очереди, каждый с новым предупреждением. Охлаждайте сосуды и сохраняйте путь через каждый фронт.',
'Колбы целятся в выживших и отмечают место падения за 1,4 секунды. Кислота и щёлочь ранят и замедляют. Их смесь убирает реагенты и создаёт охладитель, поглощающий пар и охлаждающий сосуды. Это продукт реакции, а не предмет для сбора.',
'Brutal связывает одинаковые реагенты в два отложенных извержения. Нейтрализуйте любую лужу до первого извержения, чтобы отменить оба.',
'Crazed добавляет фиолетовый катализатор. Охладитель гасит его и расходуется; несмешанные реагенты вызывают новое извержение с предупреждением. На пустом месте остаётся опасная лужа.'
],
ja:[
'酸塩基滴定','蒸留','熱暴走','分留',
'琥珀色の三角は酸、青い四角はアルカリ。反対の薬液を水たまりの近くへ誘導して離れよう。混ざると淡い冷却液になる。',
'蒸気が戦場を横切る。ダッシュで前線を抜けるか冷却液を使おう。冷却液の周りでは蒸気が途切れる。',
'圧力容器は破裂前に膨らむ。容器のそばで冷却液を作り、予告された爆発の前に冷やそう。',
'二つの蒸気前線が順番に通り、それぞれ新たな予告が出る。容器を冷やし、各前線を抜ける道を確保しよう。',
'フラスコは生存者を狙い、着地点を1.4秒間予告する。酸もアルカリもダメージと減速を与える。混ぜると薬液が消え、蒸気を吸収して容器を冷やす冷却液になる。反応生成物であり、拾うアイテムではない。',
'Brutalでは同じ薬液が結ばれ、時間差で二度噴出する。最初の噴出前にどちらかを中和すれば両方を止められる。',
'Crazedでは紫の触媒が加わる。冷却液は触媒を消して消費される。未混合の薬液に当たると、新たな予告後に噴出する。何もない床では危険な水たまりを残す。'
],
ko:[
'산염기 적정','증류','열 폭주','분별 증류',
'호박색 삼각형은 산, 파란 사각형은 알칼리다. 반대 약액 투척을 웅덩이 근처로 유도한 뒤 벗어나자. 섞이면 옅은 냉각액이 된다.',
'증기가 전장을 가로지른다. 대시로 전선을 통과하거나 냉각액을 이용하자. 냉각액 주변에서는 증기가 갈라진다.',
'압력 용기는 파열 전에 부푼다. 옆에서 냉각액을 만들어 예고된 폭발 전에 식히자.',
'두 증기 전선이 차례로 지나가며 각각 새 경고가 나온다. 용기를 식히고 각 전선을 통과할 길을 확보하자.',
'플라스크는 생존자를 겨냥하며 착지 지점을 1.4초 동안 예고한다. 산과 알칼리는 모두 피해와 감속을 준다. 섞으면 약액이 사라지고 증기를 흡수하며 용기를 식히는 냉각액이 된다. 주울 물건이 아니라 반응 생성물이다.',
'Brutal은 같은 약액을 연결해 두 번의 시간차 분출을 일으킨다. 첫 분출 전에 어느 한 웅덩이든 중화하면 둘 다 취소된다.',
'Crazed는 보라색 촉매를 추가한다. 냉각액이 촉매를 끄면 냉각액도 소모된다. 섞이지 않은 약액에서는 새 경고 후 분출이 발생한다. 빈 바닥에는 위험한 웅덩이를 남긴다.'
],
'zh-Hans':[
'酸碱滴定','蒸馏','热失控','分馏',
'琥珀色三角是酸，蓝色方块是碱。把相反药液的投掷引到积液旁再离开，混合后会生成浅色冷却液。',
'蒸气会横穿战场。冲刺穿过蒸气带，或利用冷却液；蒸气会在冷却液周围让开。',
'压力容器会在破裂前膨胀。在旁边制造冷却液，赶在标记的爆炸前将其冷却。',
'两道蒸气带依次通过，每道都有新的预警。冷却容器，并为每道蒸气保留通路。',
'烧瓶瞄准幸存者，并预警落点1.4秒。酸与碱都会伤害并减速。混合可清除药液，生成能吸收蒸气、冷却容器的冷却液。它是反应产物，不是拾取物。',
'Brutal会连接同种药液，造成两次定时喷发。第一次喷发前中和任意一处积液，即可取消两次喷发。',
'Crazed会加入紫色催化剂。冷却液可淬灭催化剂，但也会被消耗；未混合的药液会引发另一次有预警的喷发。落在空地上则留下危险积液。'
],
'zh-Hant':[
'酸鹼滴定','蒸餾','熱失控','分餾',
'琥珀色三角是酸，藍色方塊是鹼。把相反藥液的投擲引到積液旁再離開，混合後會生成淺色冷卻液。',
'蒸氣會橫穿戰場。衝刺穿過蒸氣帶，或利用冷卻液；蒸氣會在冷卻液周圍讓開。',
'壓力容器會在破裂前膨脹。在旁邊製造冷卻液，趕在標記的爆炸前將它冷卻。',
'兩道蒸氣帶依序通過，每道都有新的預警。冷卻容器，並為每道蒸氣保留通路。',
'燒瓶瞄準倖存者，並預警落點1.4秒。酸與鹼都會傷害並減速。混合可清除藥液，生成能吸收蒸氣、冷卻容器的冷卻液。它是反應產物，不是拾取物。',
'Brutal會連接同種藥液，造成兩次定時噴發。第一次噴發前中和任意一處積液，即可取消兩次噴發。',
'Crazed會加入紫色催化劑。冷卻液可淬滅催化劑，但也會被消耗；未混合的藥液會引發另一次有預警的噴發。落在空地上則留下危險積液。'
],
id:[
'Titrasi asam-basa','Penyulingan','Pelarian termal','Fraksinasi',
'Segitiga jingga adalah asam; kotak biru adalah basa. Pancing lemparan lawan ke dekat genangan lalu menjauh. Campurannya menjadi cairan pendingin pucat.',
'Uap melintasi arena. Terobos dengan dasbor atau gunakan pendingin; uap membuka celah di sekitar pendingin.',
'Bejana bertekanan mengembang sebelum pecah. Buat pendingin di dekatnya sebelum ledakan yang ditandai.',
'Dua barisan uap melintas berurutan, masing-masing dengan peringatan baru. Dinginkan bejana dan sisakan jalur melewati tiap barisan.',
'Labu membidik penyintas dan menandai titik jatuh selama 1,4 detik. Asam dan basa sama-sama melukai dan memperlambat. Campurannya menghapus pereaksi dan menghasilkan pendingin yang menyerap uap serta mendinginkan bejana. Ini hasil reaksi, bukan barang pungutan.',
'Brutal menghubungkan pereaksi sejenis menjadi dua semburan terjadwal. Netralkan salah satu genangan sebelum semburan pertama untuk membatalkan keduanya.',
'Crazed menambah katalis ungu. Pendingin memadamkannya lalu habis; pereaksi yang belum tercampur memicu semburan baru dengan peringatan. Tanah kosong menjadi genangan berbahaya.'
],
ar:[
'معايرة حمض وقاعدة','التقطير','انفلات حراري','تقطير تجزيئي',
'المثلثات الكهرمانية حمض، والمربعات الزرقاء قاعدة. استدرج الرمية المعاكسة قرب البركة ثم ابتعد. ينتج عن المزج سائل تبريد باهت.',
'يعبر البخار الساحة. اندفع عبر جبهته أو استخدم سائل التبريد؛ ينفتح البخار حوله.',
'تنتفخ أوعية الضغط قبل التمزق. كوّن سائل تبريد بجوار الوعاء لتبريده قبل الانفجار المحدد.',
'تعبر جبهتا بخار بالتتابع، ولكل منهما تحذير جديد. برّد الأوعية واحتفظ بمسار لعبور كل جبهة.',
'تستهدف القوارير الناجين وتحدد موضع السقوط لمدة 1.4 ثانية. يؤذي الحمض والقاعدة ويبطئان الحركة. يزيل مزجهما الكواشف ويكوّن سائل تبريد يمتص البخار ويبرد الأوعية. إنه ناتج تفاعل، وليس غرضًا يُلتقط.',
'يربط Brutal الكواشف المتماثلة في ثورانين موقوتين. حيّد أي بركة قبل الثوران الأول لإلغاء الاثنين.',
'يضيف Crazed محفزًا بنفسجيًا. يطفئه سائل التبريد ويُستهلك؛ وتسبب الكواشف غير الممزوجة ثورانًا جديدًا بتحذير. يترك على الأرض الخالية بركة خطرة.'
],
hi:[
'अम्ल-क्षार अनुमापन','आसवन','तापीय अनियंत्रण','प्रभाजी आसवन',
'अंबर त्रिकोण अम्ल हैं और नीले वर्ग क्षार। विपरीत बोतल को पोखर के पास गिरने का लालच दें, फिर हटें। मिश्रण हल्का शीतलक बनाता है।',
'भाप मैदान पार करती है। डैश से उसकी पट्टी पार करें या शीतलक का उपयोग करें; उसके आसपास भाप हट जाती है।',
'दबाव-पात्र फटने से पहले फूलते हैं। चिह्नित विस्फोट से पहले उनके पास शीतलक बनाकर ठंडा करें।',
'भाप की दो पट्टियाँ क्रम से आती हैं और हर बार नई चेतावनी मिलती है। पात्रों को ठंडा करें और हर पट्टी के लिए रास्ता रखें।',
'शीशियाँ जीवित बचे खिलाड़ियों को निशाना बनाती हैं और गिरने का स्थान 1.4 सेकंड पहले दिखाती हैं। अम्ल और क्षार दोनों क्षति पहुँचाकर धीमा करते हैं। उनका मिश्रण अभिकर्मक हटाकर भाप सोखने और पात्र ठंडे करने वाला शीतलक बनाता है। यह प्रतिक्रिया का उत्पाद है, उठाने की वस्तु नहीं।',
'Brutal समान अभिकर्मकों को जोड़कर दो समयबद्ध विस्फोट करता है। पहले विस्फोट से पहले किसी भी पोखर को उदासीन करके दोनों रोकें।',
'Crazed बैंगनी उत्प्रेरक जोड़ता है। शीतलक उसे बुझाकर खर्च हो जाता है; बिना मिले अभिकर्मक नई चेतावनी वाला विस्फोट करते हैं। खाली ज़मीन पर खतरनाक पोखर बनता है।'
],
bn:[
'অম্ল-ক্ষার টাইট্রেশন','পাতন','তাপীয় নিয়ন্ত্রণহানি','আংশিক পাতন',
'অ্যাম্বার ত্রিভুজ অম্ল, নীল বর্গ ক্ষার। বিপরীত তরলের নিক্ষেপ জমা তরলের কাছে টেনে এনে সরে যান। মিশ্রণে ফ্যাকাশে শীতলকারক তৈরি হয়।',
'বাষ্প মাঠ পেরিয়ে যায়। ড্যাশ দিয়ে তার রেখা পার হন বা শীতলকারক ব্যবহার করুন; তার চারপাশে বাষ্প সরে যায়।',
'চাপের পাত্র ফাটার আগে ফুলে ওঠে। চিহ্নিত বিস্ফোরণের আগে পাশে শীতলকারক তৈরি করে ঠান্ডা করুন।',
'বাষ্পের দুটি রেখা পরপর আসে, প্রতিটির আগে নতুন সতর্কতা থাকে। পাত্র ঠান্ডা করুন এবং প্রতিটি রেখা পার হওয়ার পথ রাখুন।',
'ফ্লাস্ক বেঁচে থাকা খেলোয়াড়কে নিশানা করে এবং পড়ার স্থান ১.৪ সেকেন্ড দেখায়। অম্ল ও ক্ষার দুটিই ক্ষতি করে ও গতি কমায়। মিশ্রণ বিকারক সরিয়ে বাষ্প শোষণকারী ও পাত্র ঠান্ডা করা শীতলকারক তৈরি করে। এটি বিক্রিয়ার ফল, সংগ্রহ করার বস্তু নয়।',
'Brutal একই বিকারক জুড়ে দুটি সময়মতো বিস্ফোরণ ঘটায়। প্রথমটির আগে যেকোনো জমা তরল প্রশমিত করলে দুটিই বন্ধ হয়।',
'Crazed বেগুনি অনুঘটক যোগ করে। শীতলকারক সেটি নেভিয়ে নিজেও শেষ হয়; না-মেশা বিকারক নতুন সতর্কতাসহ বিস্ফোরণ ঘটায়। খালি মাটিতে বিপজ্জনক তরল জমে।'
],
ur:[
'تیزاب و اساس کی ٹائٹریشن','کشید','حرارتی بے قابو پن','جزوی کشید',
'عنبر مثلث تیزاب ہیں، نیلے مربع اساس۔ مخالف محلول کی بوتل کو تالاب کے پاس گرنے پر آمادہ کریں، پھر ہٹ جائیں۔ آمیزش ہلکا ٹھنڈا محلول بناتی ہے۔',
'بھاپ میدان پار کرتی ہے۔ ڈیش سے اس کی پٹی پار کریں یا ٹھنڈا محلول استعمال کریں؛ اس کے گرد بھاپ ہٹ جاتی ہے۔',
'دباؤ کے برتن پھٹنے سے پہلے پھولتے ہیں۔ نشان زدہ دھماکے سے پہلے پاس ٹھنڈا محلول بنا کر انہیں ٹھنڈا کریں۔',
'بھاپ کی دو پٹیاں باری باری آتی ہیں، ہر ایک سے پہلے نئی تنبیہ ہوتی ہے۔ برتن ٹھنڈے کریں اور ہر پٹی کے لیے راستہ رکھیں۔',
'شیشیاں بچ جانے والوں کو نشانہ بناتی ہیں اور گرنے کی جگہ 1.4 سیکنڈ پہلے دکھاتی ہیں۔ تیزاب اور اساس دونوں نقصان اور سستی پیدا کرتے ہیں۔ آمیزش کیمیائی مادے ہٹا کر بھاپ جذب کرنے اور برتن ٹھنڈے کرنے والا محلول بناتی ہے۔ یہ تعامل کی پیداوار ہے، اٹھانے کی چیز نہیں۔',
'Brutal یکساں مادوں کو جوڑ کر دو وقت بند دھماکے بناتا ہے۔ پہلے دھماکے سے پہلے کسی تالاب کو بے اثر کرکے دونوں روکیں۔',
'Crazed بنفشی عمل انگیز شامل کرتا ہے۔ ٹھنڈا محلول اسے بجھا کر خرچ ہو جاتا ہے؛ غیر مخلوط مادے نئی تنبیہ والا دھماکا کرتے ہیں۔ خالی زمین پر خطرناک تالاب رہ جاتا ہے۔'
]
};
export function moldMessages(locale){const values=L[locale]??L.en;if(values.length!==keys.length)throw Error('Incomplete chemistry help '+locale);return Object.fromEntries(keys.map((k,i)=>['boss.alchemist.'+k,values[i]]));}
