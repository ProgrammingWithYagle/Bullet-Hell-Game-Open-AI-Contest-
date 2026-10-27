// AI-authored; native-language acceptance remains open.
const rows = {
  en: [
    "The notch reveals the future green shelter before any strike. Brutal keeps I in phase one and chooses a random number in phase two; Crazed chooses a random number in every field.",
    "Read the notched seal and wait for green. Brutal starts with I; Crazed can choose any number.",
    "After the Clerk moves, find the newly notched seal. Its number is random in Brutal and Crazed; wait for green before entering.",
    "Brutal marks five seals. Green lasts at least 3.5 seconds and remains until the final marked echo reaches its rim.",
    "Crazed marks ten seals. Green lasts at least five seconds and covers the final marked echoes. Black skulls remove 75% of current health once per seal activation, bypassing armor and shields but leaving at least 1 HP.",
    "Purple triangles deal double red impact damage. First contact per seal also removes 15% of current health through armor/shields and applies three seconds of poison (2 base damage each half-second) and 35% walking slow. Poison refreshes without stacking. Cleanses remove it; green shelter and invulnerability prevent application and poison damage. Dash speed is unchanged.",
  ],
  "zh-Hans": [
    "落印前，缺口就会标出将变绿的庇护印记。残酷第一阶段固定为I，第二阶段随机编号；狂乱每组都随机选择编号。",
    "认清带缺口的印记，等它变绿。残酷开场是I；狂乱可以是任意编号。",
    "书记员移动后，找到新一组带缺口的印记。残酷和狂乱的安全编号随机，等变绿再进入。",
    "残酷有五个印记。绿色庇护至少持续3.5秒，并覆盖最后一轮预警回响抵达边缘的时间。",
    "狂乱有十个印记。绿色庇护至少持续5秒，覆盖最后的预警回响。黑色骷髅每个印记每次激活仅扣除一次当前生命的75%，无视护甲和护盾，至少留下1点生命。",
    "紫色三角的撞击伤害是红色的两倍。每个印记首次命中还会无视护甲和护盾扣除当前生命的15%，并施加3秒中毒（每半秒2点基础伤害）及35%步行减速。中毒只刷新、不叠加；净化可移除。绿色庇护和无敌可阻止施加及毒伤，冲刺速度不变。",
  ],
  "zh-Hant": [
    "落印前，缺口就會標出將變綠的庇護印記。殘酷第一階段固定為I，第二階段隨機編號；狂亂每組都隨機選擇編號。",
    "認清帶缺口的印記，等它變綠。殘酷開場是I；狂亂可以是任意編號。",
    "書記員移動後，找到新一組帶缺口的印記。殘酷和狂亂的安全編號隨機，等變綠再進入。",
    "殘酷有五個印記。綠色庇護至少持續3.5秒，並涵蓋最後一輪預警回響抵達邊緣的時間。",
    "狂亂有十個印記。綠色庇護至少持續5秒，涵蓋最後的預警回響。黑色骷髏每個印記每次啟動僅扣除一次目前生命的75%，無視護甲與護盾，至少留下1點生命。",
    "紫色三角的撞擊傷害是紅色的兩倍。每個印記首次命中還會無視護甲與護盾扣除目前生命的15%，並施加3秒中毒（每半秒2點基礎傷害）與35%步行減速。中毒只刷新、不疊加；淨化可移除。綠色庇護與無敵可阻止施加及毒傷，衝刺速度不變。",
  ],
  ja: [
    "切り欠きは、攻撃前から緑になる保護の印を示す。Brutalの第1段階はI、第2段階はランダムな番号。Crazedは毎回ランダムな番号になる。",
    "切り欠きの印を見つけ、緑を待とう。Brutalの開始時はI、Crazedではどの番号にもなり得る。",
    "書記の移動後、新しい切り欠きを探そう。BrutalとCrazedの安全な番号はランダム。緑になってから入ろう。",
    "Brutalは五つの印。緑の保護は最低3.5秒続き、最後の予告された反復弾が縁に届くまで残る。",
    "Crazedは十の印。緑の保護は最低5秒続き、最後の反復弾まで防ぐ。黒い髑髏は印の発動ごとに一度、現在HPの75%を奪う。防御力とシールドを無視するが最低1HP残る。",
    "紫の三角は赤の二倍の衝撃ダメージ。各印の初回命中は防御力とシールドを無視して現在HPの15%も奪い、3秒の毒（0.5秒ごとに基礎2ダメージ）と歩行速度35%低下を与える。毒は重複せず時間を更新。浄化で解除でき、緑の保護と無敵は付与と毒ダメージを防ぐ。ダッシュ速度は変わらない。",
  ],
  es: [
    "La muesca revela el futuro refugio verde antes de los golpes. Brutal mantiene I en la primera fase y elige un número aleatorio en la segunda; Crazed lo elige en cada grupo.",
    "Busca el sello con muesca y espera al verde. Brutal empieza con I; Crazed puede elegir cualquier número.",
    "Tras el movimiento, busca la nueva muesca. El número seguro es aleatorio en Brutal y Crazed; espera al verde para entrar.",
    "Brutal marca cinco sellos. El refugio verde dura al menos 3.5 segundos y cubre la llegada del último eco marcado al borde.",
    "Crazed marca diez sellos. El refugio dura al menos cinco segundos y cubre los últimos ecos. Cada calavera negra quita el 75% de la salud actual una vez por activación, ignorando armadura y escudos, pero deja al menos 1 PV.",
    "Los triángulos morados hacen el doble de daño de impacto que los rojos. El primer contacto por sello también quita el 15% de salud actual ignorando armadura y escudos, y aplica tres segundos de veneno (2 de daño base cada medio segundo) y 35% de lentitud al caminar. El veneno se renueva sin acumularse. Las limpiezas lo eliminan; el refugio verde y la invulnerabilidad impiden aplicarlo y recibir su daño. La velocidad de esquiva no cambia.",
  ],
  fr: [
    "L’entaille révèle le futur abri vert avant les frappes. Brutal garde I en première phase et choisit un numéro aléatoire en seconde ; Crazed le choisit à chaque groupe.",
    "Repérez le sceau entaillé et attendez le vert. Brutal commence par I ; Crazed peut choisir n’importe quel numéro.",
    "Après le déplacement, trouvez la nouvelle entaille. Le numéro sûr est aléatoire en Brutal et Crazed ; attendez le vert pour entrer.",
    "Brutal marque cinq sceaux. L’abri vert dure au moins 3.5 secondes et reste jusqu’à l’arrivée du dernier écho marqué sur son bord.",
    "Crazed marque dix sceaux. L’abri dure au moins cinq secondes et couvre les derniers échos. Chaque crâne noir retire une fois par activation 75% de la vie actuelle, ignore armure et boucliers, mais laisse au moins 1 PV.",
    "Les triangles violets infligent deux fois les dégâts d’impact rouges. Le premier contact par sceau retire aussi 15% de la vie actuelle à travers armure et boucliers, puis applique trois secondes de poison (2 dégâts de base par demi-seconde) et 35% de ralentissement de marche. Le poison se renouvelle sans se cumuler. La purification le retire ; l’abri vert et l’invulnérabilité empêchent son application et ses dégâts. La vitesse d’esquive reste inchangée.",
  ],
  de: [
    "Die Kerbe zeigt den späteren grünen Schutz vor jedem Schlag. Brutal behält I in Phase eins und wählt in Phase zwei eine zufällige Nummer; Crazed wählt sie in jedem Feld neu.",
    "Suche die Kerbe und warte auf Grün. Brutal beginnt mit I; Crazed kann jede Nummer wählen.",
    "Suche nach dem Ortswechsel die neue Kerbe. Die sichere Nummer ist bei Brutal und Crazed zufällig; betritt sie erst bei Grün.",
    "Brutal markiert fünf Siegel. Grüner Schutz hält mindestens 3.5 Sekunden und deckt die Ankunft des letzten markierten Echos am Rand ab.",
    "Crazed markiert zehn Siegel. Der Schutz hält mindestens fünf Sekunden und deckt die letzten Echos ab. Jeder schwarze Schädel nimmt je Aktivierung einmal 75% der aktuellen Gesundheit, umgeht Rüstung und Schilde, lässt aber mindestens 1 LP.",
    "Violette Dreiecke verursachen doppelten roten Aufprallschaden. Der erste Kontakt je Siegel nimmt zusätzlich 15% der aktuellen Gesundheit durch Rüstung und Schilde und verursacht drei Sekunden Gift (2 Basisschaden je halbe Sekunde) sowie 35% langsameres Gehen. Gift erneuert sich ohne Stapelung. Reinigung entfernt es; grüner Schutz und Unverwundbarkeit verhindern Anwendung und Giftschaden. Das Ausweichtempo bleibt gleich.",
  ],
  "pt-BR": [
    "O entalhe revela o futuro abrigo verde antes dos golpes. Brutal mantém I na primeira fase e escolhe um número aleatório na segunda; Crazed escolhe em cada grupo.",
    "Procure o selo com entalhe e espere o verde. Brutal começa com I; Crazed pode escolher qualquer número.",
    "Após o movimento, encontre o novo entalhe. O número seguro é aleatório em Brutal e Crazed; espere o verde para entrar.",
    "Brutal marca cinco selos. O abrigo verde dura pelo menos 3.5 segundos e cobre a chegada do último eco marcado à borda.",
    "Crazed marca dez selos. O abrigo dura pelo menos cinco segundos e cobre os últimos ecos. Cada caveira preta retira 75% da vida atual uma vez por ativação, ignora armadura e escudos, mas deixa pelo menos 1 PV.",
    "Triângulos roxos causam o dobro do dano de impacto vermelho. O primeiro contato por selo também retira 15% da vida atual através de armadura e escudos e aplica três segundos de veneno (2 de dano base a cada meio segundo) e 35% de lentidão ao andar. O veneno renova sem acumular. Purificações o removem; o abrigo verde e a invulnerabilidade impedem aplicação e dano do veneno. A velocidade de esquiva não muda.",
  ],
  ru: [
    "Надрез заранее отмечает будущий зелёный щит. В Brutal первая фаза сохраняет I, во второй номер случаен; в Crazed он случаен в каждом наборе.",
    "Найдите надрез и дождитесь зелёного цвета. Brutal начинает с I; Crazed может выбрать любой номер.",
    "После перемещения ищите новый надрез. В Brutal и Crazed безопасный номер случаен; входите только после появления зелёного цвета.",
    "Brutal отмечает пять печатей. Зелёный щит держится минимум 3.5 секунды и прикрывает прибытие последнего отмеченного эха к краю.",
    "Crazed отмечает десять печатей. Щит держится минимум пять секунд и прикрывает последние эхо. Каждый чёрный череп раз за активацию снимает 75% текущего здоровья сквозь броню и щиты, оставляя минимум 1 ОЗ.",
    "Фиолетовые треугольники наносят двойной красный урон при попадании. Первый контакт с каждой печатью также снимает 15% текущего здоровья сквозь броню и щиты и даёт три секунды яда (2 базового урона каждые полсекунды) и замедления ходьбы на 35%. Яд обновляется без суммирования. Очищение снимает его; зелёный щит и неуязвимость предотвращают наложение и урон яда. Скорость рывка не меняется.",
  ],
  ar: [
    "تكشف الثلمة موضع الملجأ الأخضر قبل الضربات. يحتفظ Brutal بالرقم I في المرحلة الأولى ويختار رقماً عشوائياً في الثانية؛ ويختار Crazed رقماً عشوائياً لكل مجموعة.",
    "ابحث عن الختم ذي الثلمة وانتظر اللون الأخضر. يبدأ Brutal بالرقم I؛ وقد يختار Crazed أي رقم.",
    "بعد حركة الكاتب ابحث عن الثلمة الجديدة. الرقم الآمن عشوائي في Brutal وCrazed؛ انتظر الأخضر قبل الدخول.",
    "يضع Brutal خمسة أختام. يدوم الملجأ الأخضر 3.5 ثوانٍ على الأقل ويغطي وصول آخر صدى معلّم إلى حافته.",
    "يضع Crazed عشرة أختام. يدوم الملجأ خمس ثوانٍ على الأقل ويغطي الأصداء الأخيرة. تزيل كل جمجمة سوداء 75% من الصحة الحالية مرة لكل تفعيل، متجاوزة الدرع والحواجز، وتترك نقطة صحة واحدة على الأقل.",
    "تسبب المثلثات البنفسجية ضعف ضرر الاصطدام الأحمر. أول تماس بكل ختم يزيل أيضاً 15% من الصحة الحالية عبر الدرع والحواجز، ويطبق ثلاث ثوانٍ من السم (ضرران أساسيان كل نصف ثانية) وبطء المشي بنسبة 35%. يتجدد السم دون تكدس. يزيله التطهير؛ ويمنع الملجأ الأخضر والمناعة تطبيقه وضرره. سرعة الاندفاع لا تتغير.",
  ],
  hi: [
    "हर वार से पहले कटाव आगे बनने वाले हरे आश्रय को दिखाता है। Brutal के पहले चरण में I रहता है, दूसरे में संख्या यादृच्छिक होती है; Crazed हर समूह में यादृच्छिक संख्या चुनता है।",
    "कटाव वाली मुहर खोजें और हरे होने की प्रतीक्षा करें। Brutal में शुरुआत I से है; Crazed कोई भी संख्या चुन सकता है।",
    "क्लर्क के चलने के बाद नया कटाव खोजें। Brutal और Crazed में सुरक्षित संख्या यादृच्छिक है; हरा होने पर ही प्रवेश करें।",
    "Brutal में पाँच मुहरें हैं। हरा आश्रय कम से कम 3.5 सेकंड रहता है और आखिरी चिह्नित प्रतिध्वनि के किनारे तक पहुँचने को ढकता है।",
    "Crazed में दस मुहरें हैं। आश्रय कम से कम पाँच सेकंड रहता है और अंतिम प्रतिध्वनियों को रोकता है। हर काली खोपड़ी प्रति सक्रियण एक बार वर्तमान स्वास्थ्य का 75% कवच और ढाल के पार हटाती है, पर कम से कम 1 HP छोड़ती है।",
    "बैंगनी त्रिकोण लाल से दुगुना टक्कर नुकसान देते हैं। हर मुहर का पहला संपर्क कवच और ढाल के पार वर्तमान स्वास्थ्य का 15% भी हटाता है, और तीन सेकंड ज़हर (हर आधे सेकंड 2 मूल नुकसान) तथा चलने में 35% धीमापन देता है। ज़हर जुड़ता नहीं, अवधि ताज़ा होती है। शुद्धिकरण हटाता है; हरा आश्रय और अजेयता लगने और ज़हर नुकसान से बचाते हैं। डैश गति नहीं बदलती।",
  ],
  id: [
    "Takik menunjukkan calon perlindungan hijau sebelum serangan. Brutal tetap I pada fase pertama dan memilih nomor acak pada fase kedua; Crazed memilih nomor acak setiap kelompok.",
    "Cari segel bertakik dan tunggu hijau. Brutal dimulai dengan I; Crazed dapat memilih nomor apa pun.",
    "Setelah petugas bergerak, cari takik baru. Nomor aman acak pada Brutal dan Crazed; tunggu hijau sebelum masuk.",
    "Brutal menandai lima segel. Perlindungan hijau bertahan setidaknya 3.5 detik dan mencakup tibanya gema bertanda terakhir di tepinya.",
    "Crazed menandai sepuluh segel. Perlindungan bertahan setidaknya lima detik dan mencakup gema terakhir. Setiap tengkorak hitam mengurangi 75% kesehatan saat ini sekali per aktivasi, melewati zirah dan perisai, tetapi menyisakan setidaknya 1 HP.",
    "Segitiga ungu memberi dua kali kerusakan benturan merah. Kontak pertama per segel juga mengurangi 15% kesehatan saat ini melewati zirah/perisai dan memberi tiga detik racun (2 kerusakan dasar tiap setengah detik) serta perlambatan jalan 35%. Racun diperbarui tanpa menumpuk. Pembersihan menghilangkannya; perlindungan hijau dan kekebalan mencegah penerapan serta kerusakan racun. Kecepatan dash tetap.",
  ],
  bn: [
    "আঘাতের আগেই খাঁজ ভবিষ্যতের সবুজ আশ্রয় দেখায়। Brutal প্রথম পর্যায়ে I রাখে, দ্বিতীয় পর্যায়ে এলোমেলো সংখ্যা বেছে নেয়; Crazed প্রতিটি দলে এলোমেলো সংখ্যা নেয়।",
    "খাঁজওয়ালা সিল খুঁজে সবুজের অপেক্ষা করুন। Brutal শুরুতে I; Crazed যেকোনো সংখ্যা নিতে পারে।",
    "ক্লার্ক সরার পরে নতুন খাঁজ খুঁজুন। Brutal ও Crazed-এ নিরাপদ সংখ্যা এলোমেলো; সবুজ না হওয়া পর্যন্ত ঢুকবেন না।",
    "Brutal-এ পাঁচটি সিল। সবুজ আশ্রয় অন্তত 3.5 সেকেন্ড থাকে এবং শেষ চিহ্নিত প্রতিধ্বনি প্রান্তে পৌঁছানো পর্যন্ত রক্ষা করে।",
    "Crazed-এ দশটি সিল। আশ্রয় অন্তত পাঁচ সেকেন্ড থাকে এবং শেষ প্রতিধ্বনিগুলি আটকায়। প্রতিটি কালো খুলি প্রতি সক্রিয়তায় একবার বর্তমান স্বাস্থ্যের 75% বর্ম ও ঢাল পেরিয়ে সরায়, তবে অন্তত 1 HP রাখে।",
    "বেগুনি ত্রিভুজ লালের দ্বিগুণ আঘাতের ক্ষতি দেয়। প্রতিটি সিলের প্রথম সংস্পর্শ বর্ম ও ঢাল পেরিয়ে বর্তমান স্বাস্থ্যের 15%ও সরায়, আর তিন সেকেন্ড বিষ (প্রতি অর্ধ সেকেন্ডে 2 ভিত্তি ক্ষতি) ও হাঁটায় 35% ধীরগতি দেয়। বিষ জমে না, মেয়াদ নবায়ন হয়। শোধন সরায়; সবুজ আশ্রয় ও অজেয়তা প্রয়োগ এবং বিষের ক্ষতি ঠেকায়। ড্যাশের গতি বদলায় না।",
  ],
  ur: [
    "وار سے پہلے کھانچا آئندہ سبز پناہ دکھاتا ہے۔ Brutal پہلے مرحلے میں I رکھتا ہے، دوسرے میں بے ترتیب نمبر چنتا ہے؛ Crazed ہر گروہ میں بے ترتیب نمبر چنتا ہے۔",
    "کھانچے والی مہر ڈھونڈیں اور سبز ہونے کا انتظار کریں۔ Brutal میں ابتدا I سے ہے؛ Crazed کوئی بھی نمبر چن سکتا ہے۔",
    "محرر کے سرکنے کے بعد نیا کھانچا تلاش کریں۔ Brutal اور Crazed میں محفوظ نمبر بے ترتیب ہے؛ سبز ہونے کے بعد داخل ہوں۔",
    "Brutal میں پانچ مہریں ہیں۔ سبز پناہ کم از کم 3.5 سیکنڈ رہتی ہے اور آخری نشان زدہ گونج کے کنارے تک پہنچنے کو ڈھانپتی ہے۔",
    "Crazed میں دس مہریں ہیں۔ پناہ کم از کم پانچ سیکنڈ رہتی ہے اور آخری گونجیں روکتی ہے۔ ہر سیاہ کھوپڑی ہر سرگرمی میں ایک بار موجودہ صحت کا 75% زرہ اور ڈھال کے پار گھٹاتی ہے، مگر کم از کم 1 HP چھوڑتی ہے۔",
    "بنفشی مثلث سرخ سے دوگنا ٹکر کا نقصان دیتی ہے۔ ہر مہر کا پہلا لمس زرہ اور ڈھال کے پار موجودہ صحت کا 15% بھی گھٹاتا ہے، اور تین سیکنڈ زہر (ہر آدھے سیکنڈ 2 بنیادی نقصان) اور چلنے میں 35% سستی دیتا ہے۔ زہر جمع نہیں ہوتا، مدت تازہ ہوتی ہے۔ تطہیر اسے ہٹاتی ہے؛ سبز پناہ اور بے ضرری لگنے اور زہر کے نقصان کو روکتی ہیں۔ ڈیش کی رفتار وہی رہتی ہے۔",
  ],
  ko: [
    "홈은 타격 전부터 나중에 초록색이 될 보호 도장을 알려 줍니다. Brutal은 1단계 I, 2단계 무작위 번호이며 Crazed는 매번 무작위 번호를 고릅니다.",
    "홈이 있는 도장을 보고 초록색을 기다리세요. Brutal은 I로 시작하며 Crazed는 어떤 번호도 고를 수 있습니다.",
    "서기가 이동한 뒤 새 홈을 찾으세요. Brutal과 Crazed의 안전 번호는 무작위입니다. 초록색이 된 뒤 들어가세요.",
    "Brutal은 도장 다섯 개를 표시합니다. 초록 보호는 최소 3.5초 지속되고 마지막 표시된 반복탄이 테두리에 도착할 때까지 이어집니다.",
    "Crazed는 도장 열 개를 표시합니다. 보호는 최소 5초 지속되며 마지막 반복탄도 막습니다. 검은 해골은 도장 활성화마다 한 번 현재 체력의 75%를 방어력과 보호막을 무시하고 빼앗되 최소 1 HP를 남깁니다.",
    "보라색 삼각형은 빨간색의 두 배 충돌 피해를 줍니다. 도장별 첫 접촉은 방어력과 보호막을 무시하고 현재 체력의 15%도 빼앗으며, 3초간 독(0.5초마다 기본 피해 2)과 걷기 속도 35% 감소를 줍니다. 독은 중첩 없이 갱신됩니다. 정화로 제거할 수 있고, 초록 보호와 무적은 부여와 독 피해를 막습니다. 대시 속도는 그대로입니다.",
  ],
};
export function clerkVerdictMessages(locale) {
  const r = rows[locale];
  if (!r || r.length !== 6)
    throw Error("Missing Clerk affliction help " + locale);
  const [description, early, late, brutal, crazed, purple] = r.map((s) =>
    s.normalize("NFC"),
  );
  return {
    "boss.quarantine-clerk.advancedDescription": description,
    "boss.quarantine-clerk.advancedPhaseHint.0": early,
    "boss.quarantine-clerk.advancedPhaseHint.1": late,
    "boss.quarantine-clerk.brutalHelp": brutal + " " + purple,
    "boss.quarantine-clerk.crazedHelp": crazed + " " + purple,
  };
}
