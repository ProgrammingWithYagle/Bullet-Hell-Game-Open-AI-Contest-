// AI-authored; native-language acceptance remains open.
const rows = {
  en: [
    "The field grows with form. The notch identifies I in Intake and the last seal in Appeal (V in Brutal, X in Crazed). Wait for green to shelter from marked volleys. A late appeal begins after the old field closes.",
    "Wait for the last strike, then enter notched I when it turns green. Read hazard shapes as well as color.",
    "After the Clerk moves, read the full new field. The notched final seal (V/X) reopens after its strike; wait for green.",
    "Brutal marks five seals. Purple triangles deal double red-stamp damage. The green shield stops marked shots; its outer rim counts down to closure.",
    "Crazed marks ten seals, including purple triangles and black skulls. A black seal removes 75% of current health once per activation, leaving at least 1 HP. It bypasses armor and shields; dash invulnerability and green shelter still prevent it.",
  ],
  "zh-Hans": [
    "印记数量随形态增加。缺口标出收件阶段的I和申诉阶段的最后一个印记：残酷为V，狂乱为X。等变绿后躲进预警弹幕的掩护。旧印记场结束后才开始下一轮申诉。",
    "等最后一次盖印后，带缺口的I变绿再进入。同时看颜色和危险符号。",
    "书记员移动后，观察整组新印记。带缺口的最后一个印记V/X会在落下后重新开放，等它变绿。",
    "残酷会标出五个印记。紫色三角印记伤害为红色的两倍。绿色护盾挡住预警子弹，外圈表示保护剩余时间。",
    "狂乱会标出十个印记，包括紫色三角和黑色骷髅。每个黑色印记每次激活仅扣除一次当前生命的75%，至少留下1点生命。它无视护甲和护盾；闪避无敌和绿色掩护仍能阻止。",
  ],
  "zh-Hant": [
    "印記數量隨形態增加。缺口標出收件階段的I和申訴階段的最後一個印記：殘酷為V，狂亂為X。等變綠後躲進預警彈幕的掩護。舊印記場結束後才開始下一輪申訴。",
    "等最後一次蓋印後，帶缺口的I變綠再進入。同時看顏色和危險符號。",
    "書記員移動後，觀察整組新印記。帶缺口的最後一個印記V/X會在落下後重新開放，等它變綠。",
    "殘酷會標出五個印記。紫色三角印記傷害為紅色的兩倍。綠色護盾擋住預警子彈，外圈表示保護剩餘時間。",
    "狂亂會標出十個印記，包括紫色三角和黑色骷髏。每個黑色印記每次啟動僅扣除一次目前生命的75%，至少留下1點生命。它無視護甲和護盾；閃避無敵和綠色掩護仍能阻止。",
  ],
  ja: [
    "形態によって印が増える。切り欠きは受付ではI、異議申立てでは最後の印（BrutalはV、CrazedはX）。緑になるまで待つと予告弾を防げる。次の異議申立ては前の印が消えてから始まる。",
    "最後の印が押された後、切り欠きのIが緑になってから入ろう。色と危険マークの両方を読もう。",
    "書記の移動後は新しい印全体を確認。切り欠きの最後のV/Xは押された後に開くので、緑を待とう。",
    "Brutalは五つの印。紫の三角は赤い印の二倍のダメージ。緑の盾は予告弾を防ぎ、外側の輪は残り時間を示す。",
    "Crazedは紫の三角と黒い髑髏を含む十の印。黒は発動ごとに一度だけ現在HPの75%を奪うが、最低1HP残る。防御力とシールドを無視するが、回避の無敵と緑の保護では防げる。",
  ],
  es: [
    "El campo crece con la forma. La muesca señala I en Ingreso y el último sello en Apelación: V en Brutal, X en Crazed. Espera al verde para cubrirte de las descargas marcadas. La siguiente apelación empieza al cerrarse el campo anterior.",
    "Tras el último golpe, entra en I con muesca cuando esté verde. Lee símbolos y colores.",
    "Tras moverse el funcionario, lee todo el campo nuevo. El último sello con muesca V/X se reabre después de golpear; espera al verde.",
    "Brutal marca cinco sellos. Los triángulos morados hacen el doble de daño que los rojos. El escudo verde detiene los disparos marcados; su borde exterior indica el tiempo restante.",
    "Crazed marca diez sellos, con triángulos morados y calaveras negras. Cada sello negro quita el 75% de la salud actual una vez por activación, dejando al menos 1 PV. Ignora armadura y escudos; la invulnerabilidad de esquiva y el refugio verde lo impiden.",
  ],
  fr: [
    "Le champ grandit selon la forme. L’entaille indique I à l’accueil et le dernier sceau en appel : V en Brutal, X en Crazed. Attendez le vert pour bloquer les salves marquées. Un nouvel appel commence après la fermeture du champ précédent.",
    "Après la dernière frappe, entrez dans I entaillé lorsqu’il devient vert. Lisez les symboles autant que les couleurs.",
    "Après le déplacement du greffier, lisez tout le nouveau champ. Le dernier sceau entaillé V/X se rouvre après sa frappe ; attendez le vert.",
    "Brutal marque cinq sceaux. Les triangles violets infligent le double des sceaux rouges. Le bouclier vert bloque les tirs marqués ; son bord extérieur indique le temps restant.",
    "Crazed marque dix sceaux, dont des triangles violets et des crânes noirs. Un sceau noir retire 75 % de la vie actuelle une fois par activation, en laissant au moins 1 PV. Il ignore armure et boucliers ; l’invulnérabilité d’esquive et l’abri vert le bloquent.",
  ],
  de: [
    "Das Feld wächst mit der Form. Die Kerbe markiert I im Einlass und das letzte Siegel im Einspruch: V bei Brutal, X bei Crazed. Warte auf Grün als Schutz vor markierten Salven. Der nächste Einspruch beginnt nach dem Schließen des alten Feldes.",
    "Nach dem letzten Schlag betritt das gekerbte I erst bei Grün. Achte auf Symbole und Farben.",
    "Nach dem Ortswechsel lies das ganze neue Feld. Das letzte gekerbte Siegel V/X öffnet nach seinem Schlag; warte auf Grün.",
    "Brutal markiert fünf Siegel. Violette Dreiecke verursachen doppelt so viel Schaden wie rote Siegel. Der grüne Schild stoppt markierte Schüsse; der äußere Ring zeigt die Restzeit.",
    "Crazed markiert zehn Siegel mit violetten Dreiecken und schwarzen Schädeln. Ein schwarzes Siegel nimmt je Aktivierung einmal 75 % der aktuellen Gesundheit und lässt mindestens 1 LP. Es umgeht Rüstung und Schilde; Ausweich-Unverwundbarkeit und grüner Schutz verhindern es.",
  ],
  "pt-BR": [
    "O campo cresce com a forma. O entalhe marca I na entrada e o último selo na apelação: V em Brutal, X em Crazed. Espere o verde para bloquear rajadas marcadas. Uma nova apelação começa após o campo anterior fechar.",
    "Após o último golpe, entre no I entalhado quando ficar verde. Leia símbolos e cores.",
    "Depois que o escrivão se mover, leia todo o campo novo. O último selo entalhado V/X reabre após golpear; espere o verde.",
    "Brutal marca cinco selos. Triângulos roxos causam o dobro do dano vermelho. O escudo verde para os tiros marcados; o aro externo mostra o tempo restante.",
    "Crazed marca dez selos, incluindo triângulos roxos e caveiras negras. Cada selo negro retira 75% da vida atual uma vez por ativação, deixando pelo menos 1 PV. Ignora armadura e escudos; invulnerabilidade de esquiva e abrigo verde impedem isso.",
  ],
  ru: [
    "Поле растёт с формой. Выемка отмечает I в приёме и последнюю печать в апелляции: V у Brutal, X у Crazed. Дождитесь зелёного для защиты от отмеченных залпов. Следующая апелляция начинается после закрытия прежнего поля.",
    "После последнего удара входите в I с выемкой только на зелёном. Читайте символы и цвета.",
    "После перемещения писаря осмотрите новое поле целиком. Последняя печать V/X с выемкой открывается после удара; дождитесь зелёного.",
    "Brutal отмечает пять печатей. Фиолетовые треугольники наносят двойной урон красных. Зелёный щит блокирует отмеченные выстрелы; внешнее кольцо показывает остаток времени.",
    "Crazed отмечает десять печатей с фиолетовыми треугольниками и чёрными черепами. Чёрная печать раз за активацию отнимает 75% текущего здоровья, оставляя минимум 1 ОЗ. Она обходит броню и щиты; неуязвимость рывка и зелёная защита предотвращают удар.",
  ],
  ar: [
    "يكبر الحقل حسب الشكل. يحدد الشق I في الاستقبال وآخر ختم في الاستئناف: V في Brutal وX في Crazed. انتظر الأخضر للحماية من الرشقات المحددة. يبدأ استئناف جديد بعد إغلاق الحقل السابق.",
    "بعد الضربة الأخيرة ادخل I المشقوق عندما يخضر. اقرأ الرموز والألوان معاً.",
    "بعد انتقال الكاتب اقرأ الحقل الجديد كله. ينفتح آخر ختم مشقوق V/X بعد ضربته؛ انتظر الأخضر.",
    "يحدد Brutal خمسة أختام. المثلثات البنفسجية تسبب ضعف ضرر الأحمر. يوقف الدرع الأخضر الطلقات المحددة وتوضح حلقته الخارجية الوقت المتبقي.",
    "يحدد Crazed عشرة أختام مع مثلثات بنفسجية وجماجم سوداء. يزيل الختم الأسود 75% من الصحة الحالية مرة لكل تفعيل ويترك نقطة صحة واحدة على الأقل. يتجاوز الدرع والدروع الواقية؛ يمنعه حصانة الاندفاع والملجأ الأخضر.",
  ],
  hi: [
    "रूप के साथ क्षेत्र बढ़ता है। खाँचा प्रवेश में I और अपील में अंतिम मुहर बताता है: Brutal में V, Crazed में X। चिह्नित बौछार रोकने के लिए हरे का इंतज़ार करें। पुराना क्षेत्र बंद होने के बाद नई अपील आती है।",
    "अंतिम प्रहार के बाद खाँचे वाला I हरा हो तभी प्रवेश करें। रंग के साथ चिह्न भी पढ़ें।",
    "लिपिक के खिसकने के बाद पूरा नया क्षेत्र पढ़ें। खाँचे वाली अंतिम V/X प्रहार के बाद खुलती है; हरे का इंतज़ार करें।",
    "Brutal पाँच मुहरें बनाता है। बैंगनी त्रिकोण लाल मुहर से दोगुना नुकसान देते हैं। हरा कवच चिह्नित गोलियाँ रोकता है; बाहरी घेरा बचा समय दिखाता है।",
    "Crazed दस मुहरें बनाता है, जिनमें बैंगनी त्रिकोण और काली खोपड़ियाँ हैं। काली मुहर हर सक्रियता में एक बार वर्तमान स्वास्थ्य का 75% घटाती है और कम से कम 1 HP छोड़ती है। यह कवच और ढाल को अनदेखा करती है; डैश की अजेयता और हरा आश्रय इसे रोकते हैं।",
  ],
  bn: [
    "রূপের সঙ্গে ক্ষেত্র বাড়ে। খাঁজটি প্রবেশে I এবং আপিলে শেষ মোহর দেখায়: Brutal-এ V, Crazed-এ X। চিহ্নিত গুলি ঠেকাতে সবুজের অপেক্ষা করুন। পুরোনো ক্ষেত্র বন্ধ হলে নতুন আপিল আসে।",
    "শেষ আঘাতের পর খাঁজযুক্ত I সবুজ হলে ঢুকুন। রঙের সঙ্গে চিহ্নও দেখুন।",
    "কেরানি সরার পর পুরো নতুন ক্ষেত্র দেখুন। খাঁজযুক্ত শেষ V/X আঘাতের পরে খোলে; সবুজের অপেক্ষা করুন।",
    "Brutal পাঁচটি মোহর দেয়। বেগুনি ত্রিভুজ লালের দ্বিগুণ ক্ষতি করে। সবুজ ঢাল চিহ্নিত গুলি আটকায়; বাইরের বলয় বাকি সময় দেখায়।",
    "Crazed দশটি মোহর দেয়, যার মধ্যে বেগুনি ত্রিভুজ ও কালো খুলি আছে। কালো মোহর প্রতি সক্রিয়তায় একবার বর্তমান স্বাস্থ্যের 75% কমায়, অন্তত 1 HP রাখে। বর্ম ও ঢাল এড়িয়ে যায়; ড্যাশের অক্ষত সময় ও সবুজ আশ্রয় তা ঠেকায়।",
  ],
  id: [
    "Bidang membesar sesuai bentuk. Takik menandai I saat masuk dan cap terakhir saat banding: V pada Brutal, X pada Crazed. Tunggu hijau untuk menahan rentetan bertanda. Banding baru dimulai setelah bidang lama menutup.",
    "Setelah hantaman terakhir, masuk ke I bertakik saat hijau. Baca simbol dan warna.",
    "Setelah petugas berpindah, baca seluruh bidang baru. Cap akhir bertakik V/X membuka setelah hantamannya; tunggu hijau.",
    "Brutal menandai lima cap. Segitiga ungu memberi dua kali kerusakan merah. Perisai hijau menahan tembakan bertanda; cincin luar menunjukkan sisa waktunya.",
    "Crazed menandai sepuluh cap dengan segitiga ungu dan tengkorak hitam. Cap hitam mengurangi 75% kesehatan saat ini sekali per aktivasi, menyisakan setidaknya 1 HP. Ia melewati zirah dan perisai; kekebalan dash dan perlindungan hijau tetap mencegahnya.",
  ],
  ur: [
    "شکل کے ساتھ میدان بڑھتا ہے۔ کھانچا داخلے میں I اور اپیل میں آخری مہر بتاتا ہے: Brutal میں V، Crazed میں X۔ نشان زدہ بوچھاڑ روکنے کے لیے سبز کا انتظار کریں۔ پرانا میدان بند ہونے پر نئی اپیل آتی ہے۔",
    "آخری وار کے بعد کھانچے والا I سبز ہو تو داخل ہوں۔ رنگ کے ساتھ نشان بھی پڑھیں۔",
    "محرر کے سرکنے کے بعد پورا نیا میدان دیکھیں۔ کھانچے والی آخری V/X وار کے بعد کھلتی ہے؛ سبز کا انتظار کریں۔",
    "Brutal پانچ مہریں لگاتا ہے۔ بنفشی مثلث سرخ سے دوگنا نقصان دیتی ہے۔ سبز ڈھال نشان زدہ گولیاں روکتی ہے؛ بیرونی دائرہ باقی وقت بتاتا ہے۔",
    "Crazed دس مہریں لگاتا ہے، جن میں بنفشی مثلث اور سیاہ کھوپڑیاں ہیں۔ سیاہ مہر ہر سرگرمی میں ایک بار موجودہ صحت کا 75% گھٹاتی ہے اور کم از کم 1 HP چھوڑتی ہے۔ یہ زرہ اور ڈھال کو نظرانداز کرتی ہے؛ ڈیش کی بے ضرری اور سبز پناہ اسے روکتی ہیں۔",
  ],
  ko: [
    "형태에 따라 도장이 늘어납니다. 홈은 접수에서 I, 이의 제기에서 마지막 도장을 가리킵니다. Brutal은 V, Crazed는 X입니다. 초록색을 기다리면 표시된 탄막을 막습니다. 이전 장판이 닫힌 뒤 새 이의 제기가 시작됩니다.",
    "마지막 도장이 찍힌 뒤 홈이 있는 I이 초록색이 되면 들어가세요. 색과 기호를 함께 읽으세요.",
    "서기가 옮겨 간 뒤 새 장판 전체를 읽으세요. 홈이 있는 마지막 V/X는 찍힌 후 열리므로 초록색을 기다리세요.",
    "Brutal은 도장 다섯 개를 표시합니다. 보라색 삼각형은 빨간 도장의 두 배 피해를 줍니다. 초록 방패가 표시된 탄환을 막고 바깥 고리가 남은 시간을 보여 줍니다.",
    "Crazed는 보라색 삼각형과 검은 해골을 포함한 도장 열 개를 표시합니다. 검은 도장은 활성화마다 한 번 현재 체력의 75%를 빼앗되 최소 1 HP를 남깁니다. 방어력과 보호막을 무시하지만 대시 무적과 초록 보호는 막아 줍니다.",
  ],
};
export function clerkVerdictMessages(locale) {
  const r = rows[locale];
  if (!r || r.length !== 5) throw Error("Missing graded Clerk help " + locale);
  const [description, early, late, brutal, crazed] = r.map((s) =>
    s.normalize("NFC"),
  );
  return {
    "boss.quarantine-clerk.advancedDescription": description,
    "boss.quarantine-clerk.advancedPhaseHint.0": early,
    "boss.quarantine-clerk.advancedPhaseHint.1": late,
    "boss.quarantine-clerk.brutalHelp": brutal,
    "boss.quarantine-clerk.crazedHelp": crazed,
  };
}
