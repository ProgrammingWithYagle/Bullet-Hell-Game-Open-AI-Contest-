import { bellCounterpointMessages } from "./bell-counterpoint.mjs";
const replacement = {
  en: {
    "boss.bellringer.description":
      "Standard peals leave a fixed 46-degree opening; advanced forms leave 35 degrees. Keep your whole body inside the gap or cross a front with a dash. The pale approach path is harmless. Each moving front and clapper swing hits once.",
    "boss.bellringer.brutalHelp":
      "Brutal adds one tethered clapper to its overlapping peals. Leave the marked outbound lane. After landing, the cracked white head becomes shootable during a fresh return warning: break it to stop the return, or sidestep the returning head. The thin chain itself is harmless.",
    "boss.bellringer.crazedHelp":
      "Crazed inherits the thrown clapper with a tougher head and deploys a second bell while the primary keeps attacking. Three or four reply fronts and a separate clapper overlap the main score. Read each source and its fixed opening; keep moving between newly aimed strikes.",
  },
  "zh-Hans": {
    "boss.bellringer.description":
      "标准形态的声波保留固定46度缺口，强化形态为35度。让整个身体处于缺口内，或冲刺越过波前。浅色接近路线无害，每道移动声波和钟舌挥击只命中一次。",
    "boss.bellringer.brutalHelp":
      "Brutal在重叠声波中加入一次链式钟舌投掷。离开标记的投掷路线。钟舌落地后，在新的回收预警期间，白色裂纹头部可以被射击；击碎它可阻止回收，否则要避开返回的头部。细链本身无害。",
    "boss.bellringer.crazedHelp":
      "Crazed继承投掷钟舌，头部更耐打，并在主钟持续攻击时部署第二口钟。三或四道回应声波及独立钟舌挥击与主钟重叠。分辨各个声源和固定缺口，在重新瞄准的攻击之间保持移动。",
  },
  "zh-Hant": {
    "boss.bellringer.description":
      "標準形態的聲波保留固定46度缺口，強化形態為35度。讓整個身體處於缺口內，或衝刺越過波前。淺色接近路線無害，每道移動聲波和鐘舌揮擊只命中一次。",
    "boss.bellringer.brutalHelp":
      "Brutal在重疊聲波中加入一次鏈式鐘舌投擲。離開標記的投擲路線。鐘舌落地後，在新的回收預警期間，白色裂紋頭部可以被射擊；擊碎它可阻止回收，否則要避開返回的頭部。細鏈本身無害。",
    "boss.bellringer.crazedHelp":
      "Crazed繼承投擲鐘舌，頭部更耐打，並在主鐘持續攻擊時部署第二口鐘。三或四道回應聲波及獨立鐘舌揮擊與主鐘重疊。分辨各個聲源和固定缺口，在重新瞄準的攻擊之間保持移動。",
  },
  ja: {
    "boss.bellringer.description":
      "通常形態の音波には固定された46度の切れ目があり、強化形態では35度になります。体全体を切れ目に収めるか、ダッシュで波を越えてください。淡い接近経路は無害です。移動する波と鐘舌の振りは、それぞれ一度だけ命中します。",
    "boss.bellringer.brutalHelp":
      "Brutalは重なる音波に、鎖につないだ鐘舌の投擲を一回加えます。表示された往路から離れてください。着地後、新たな引き戻し予告の間だけ、白いひびの入った先端を撃てます。壊せば戻りを止められ、壊さない場合は戻る先端を避けます。細い鎖自体は無害です。",
    "boss.bellringer.crazedHelp":
      "Crazedは先端が頑丈な投擲鐘舌を引き継ぎ、本体が攻撃し続ける間に二つ目の鐘を置きます。三、四本の応答波と別の鐘舌攻撃が本体の攻撃に重なります。音源ごとの固定された切れ目を読み、新たに狙い直す攻撃の間は動き続けてください。",
  },
  es: {
    "boss.bellringer.description":
      "Las ondas de la forma estándar dejan una abertura fija de 46 grados; las formas avanzadas, de 35. Mantén todo el cuerpo dentro del hueco o cruza la onda con una esquiva. La ruta pálida de aproximación es inofensiva. Cada onda móvil y golpe de badajo impacta una sola vez.",
    "boss.bellringer.brutalHelp":
      "Brutal añade un badajo encadenado a las ondas superpuestas. Sal del carril de lanzamiento marcado. Tras aterrizar, la cabeza blanca agrietada puede recibir disparos durante un nuevo aviso de retorno: rómpela para detenerlo o esquiva la cabeza cuando regrese. La cadena fina es inofensiva.",
    "boss.bellringer.crazedHelp":
      "Crazed hereda el badajo lanzado con una cabeza más resistente y coloca otra campana mientras la principal sigue atacando. Tres o cuatro ondas de respuesta y un badajo independiente se superponen a la secuencia principal. Lee cada origen y su abertura fija; muévete entre los golpes que vuelven a apuntar.",
  },
  fr: {
    "boss.bellringer.description":
      "Les ondes de la forme standard laissent une ouverture fixe de 46 degrés ; celles des formes avancées, de 35 degrés. Gardez tout le corps dans cette ouverture ou traversez une onde avec une esquive. Le trajet pâle d’approche est sans danger. Chaque onde mobile et chaque coup de battant ne touche qu’une fois.",
    "boss.bellringer.brutalHelp":
      "Brutal ajoute un lancer de battant enchaîné aux ondes superposées. Quittez le couloir de lancer indiqué. Après l’atterrissage, la tête blanche fissurée peut être visée pendant un nouvel avertissement de retour : brisez-la pour arrêter le rappel, ou évitez la tête qui revient. La fine chaîne est sans danger.",
    "boss.bellringer.crazedHelp":
      "Crazed reprend ce battant avec une tête plus solide et pose une seconde cloche pendant que la principale continue d’attaquer. Trois ou quatre ondes de réponse et un battant distinct se superposent à la séquence principale. Repérez chaque source et son ouverture fixe ; bougez entre les coups qui vous ciblent à nouveau.",
  },
  de: {
    "boss.bellringer.description":
      "Schallwellen der Standardform lassen eine feste Lücke von 46 Grad, fortgeschrittene Formen eine von 35 Grad. Halte den ganzen Körper in der Lücke oder weiche durch eine Welle aus. Der blasse Annäherungsweg ist harmlos. Jede wandernde Welle und jeder Klöpperschwung trifft nur einmal.",
    "boss.bellringer.brutalHelp":
      "Brutal wirft zusätzlich einen angeketteten Klöppel zwischen den überlappenden Wellen. Verlasse die markierte Wurfbahn. Nach der Landung ist der weiß gerissene Kopf während einer neuen Rückholwarnung beschießbar: Zerstöre ihn, um die Rückkehr zu stoppen, oder weiche dem zurückkehrenden Kopf aus. Die dünne Kette selbst ist harmlos.",
    "boss.bellringer.crazedHelp":
      "Crazed übernimmt den Wurfklöppel mit einem robusteren Kopf und stellt eine zweite Glocke auf, während die Hauptglocke weiter angreift. Drei oder vier Antwortwellen und ein eigener Klöppel überlagern die Hauptfolge. Achte auf jede Quelle und ihre feste Lücke; bewege dich zwischen neu gezielten Schlägen.",
  },
  "pt-BR": {
    "boss.bellringer.description":
      "As ondas da forma padrão deixam uma abertura fixa de 46 graus; as formas avançadas, de 35. Mantenha o corpo inteiro na abertura ou atravesse uma onda com uma esquiva. O trajeto claro de aproximação é inofensivo. Cada onda móvel e golpe de badalo acerta uma só vez.",
    "boss.bellringer.brutalHelp":
      "Brutal acrescenta um badalo preso a uma corrente às ondas sobrepostas. Saia da faixa de lançamento marcada. Após a aterrissagem, a cabeça branca rachada pode receber tiros durante um novo aviso de retorno: quebre-a para impedir a volta ou desvie da cabeça que retorna. A corrente fina em si é inofensiva.",
    "boss.bellringer.crazedHelp":
      "Crazed herda o badalo lançado com uma cabeça mais resistente e coloca um segundo sino enquanto o principal continua atacando. Três ou quatro ondas de resposta e outro badalo se sobrepõem à sequência principal. Leia cada origem e sua abertura fixa; mova-se entre os golpes que voltam a mirar.",
  },
  ru: {
    "boss.bellringer.description":
      "Волны обычной формы оставляют неподвижный просвет в 46 градусов, усиленные формы — в 35. Помещайте всё тело в просвет или пересекайте волну рывком. Светлый путь сближения безопасен. Каждая движущаяся волна и каждый взмах языка поражает лишь один раз.",
    "boss.bellringer.brutalHelp":
      "Brutal добавляет к перекрывающимся волнам бросок языка на цепи. Уйдите с отмеченной траектории. После приземления белую треснувшую головку можно обстреливать во время нового предупреждения о возврате: разбейте её, чтобы остановить возврат, или уклонитесь от летящей назад головки. Тонкая цепь сама по себе безопасна.",
    "boss.bellringer.crazedHelp":
      "Crazed наследует бросок с более прочной головкой и ставит второй колокол, пока основной продолжает атаковать. Три или четыре ответные волны и отдельный язык перекрывают основную последовательность. Следите за каждым источником и его неподвижным просветом; двигайтесь между заново нацеленными ударами.",
  },
  hi: {
    "boss.bellringer.description":
      "सामान्य रूप की ध्वनि तरंगों में 46 डिग्री का स्थिर रास्ता खुला रहता है; उन्नत रूपों में 35 डिग्री का। पूरा शरीर उस जगह में रखें या डैश से तरंग पार करें। पास आने का हल्का रास्ता नुकसान नहीं करता। हर चलती तरंग और घंटी की जीभ का हर झटका केवल एक बार लगता है।",
    "boss.bellringer.brutalHelp":
      "Brutal एक जंजीर से बंधी घंटी की जीभ को आपस में मिलती तरंगों के बीच फेंकता है। चिह्नित फेंकने वाले रास्ते से हटें। जमीन पर रुकने के बाद, वापस खींचने की नई चेतावनी के दौरान सफेद दरार वाले सिरे को गोली मार सकते हैं। उसे तोड़कर वापसी रोकें या लौटते सिरे से बचें। पतली जंजीर खुद नुकसान नहीं करती।",
    "boss.bellringer.crazedHelp":
      "Crazed में फेंके जाने वाले सिरे की मजबूती बढ़ती है और मुख्य घंटी के हमला करते समय दूसरी घंटी रखी जाती है। तीन या चार जवाबी तरंगें और अलग जीभ का झटका मुख्य क्रम के साथ आते हैं। हर स्रोत और उसके स्थिर खुले रास्ते को देखें; फिर से निशाना लगने वाले वारों के बीच चलते रहें।",
  },
  ar: {
    "boss.bellringer.description":
      "تترك موجات الشكل العادي فتحة ثابتة بعرض 46 درجة، وتترك الأشكال المتقدمة 35 درجة. أبقِ جسمك كله داخل الفتحة أو اعبر الموجة باندفاعة. مسار الاقتراب الباهت آمن. كل موجة متحركة وكل ضربة لسان جرس تصيب مرة واحدة فقط.",
    "boss.bellringer.brutalHelp":
      "يضيف Brutal رمية لسان جرس مربوط بسلسلة بين الموجات المتداخلة. غادر مسار الرمية المحدد. بعد الهبوط يصبح الرأس الأبيض المتشقق قابلاً لإطلاق النار أثناء تحذير جديد قبل سحبه؛ حطمه لإيقاف العودة أو تفادَ الرأس العائد. السلسلة الرفيعة نفسها لا تسبب ضرراً.",
    "boss.bellringer.crazedHelp":
      "يرث Crazed الرمية برأس أكثر صلابة وينشر جرساً ثانياً بينما يواصل الرئيسي الهجوم. تتداخل ثلاث أو أربع موجات استجابة وضربة مستقلة للسان الجرس مع التسلسل الرئيسي. راقب كل مصدر وفتحته الثابتة وتحرك بين الضربات التي تعيد التصويب.",
  },
  bn: {
    "boss.bellringer.description":
      "সাধারণ রূপের শব্দতরঙ্গে 46 ডিগ্রির স্থির ফাঁক থাকে; উন্নত রূপে 35 ডিগ্রি। পুরো শরীর ফাঁকের মধ্যে রাখুন অথবা ড্যাশ করে তরঙ্গ পেরোন। এগিয়ে আসার হালকা পথটি ক্ষতিকর নয়। প্রতিটি চলন্ত তরঙ্গ ও ঘণ্টার জিভের আঘাত একবারই লাগে।",
    "boss.bellringer.brutalHelp":
      "Brutal একে অন্যের ওপর আসা তরঙ্গের মধ্যে শিকলে বাঁধা ঘণ্টার জিভ ছোড়ে। চিহ্নিত নিক্ষেপপথ থেকে সরে যান। মাটিতে নামার পর ফেরত টানার নতুন সতর্কতার সময় সাদা ফাটলধরা মাথাটিতে গুলি করা যায়। সেটি ভেঙে ফেরত আসা থামান, অথবা ফিরে আসা মাথা এড়িয়ে চলুন। সরু শিকলটি নিজে ক্ষতি করে না।",
    "boss.bellringer.crazedHelp":
      "Crazed আরও শক্ত মাথাসহ নিক্ষেপটি ধরে রাখে এবং মূল ঘণ্টা আক্রমণ চালানোর সময় দ্বিতীয় ঘণ্টা বসায়। তিন বা চারটি জবাবি তরঙ্গ ও আলাদা জিভের আঘাত মূল ক্রমের সঙ্গে আসে। প্রতিটি উৎস ও তার স্থির ফাঁক দেখুন; নতুন করে নিশানা করা আঘাতের ফাঁকে চলতে থাকুন।",
  },
  id: {
    "boss.bellringer.description":
      "Gelombang bentuk Standar menyisakan celah tetap 46 derajat; bentuk lanjutan 35 derajat. Pastikan seluruh tubuh berada di celah atau lewati gelombang dengan dash. Jalur pendekatan pucat tidak berbahaya. Setiap gelombang bergerak dan ayunan bandul hanya mengenai sekali.",
    "boss.bellringer.brutalHelp":
      "Brutal menambahkan satu lemparan bandul berantai di antara gelombang yang bertumpuk. Tinggalkan jalur lempar yang ditandai. Setelah mendarat, kepala putih yang retak dapat ditembak saat peringatan penarikan baru: hancurkan untuk menghentikan kepulangannya, atau hindari kepala yang kembali. Rantai tipisnya sendiri tidak melukai.",
    "boss.bellringer.crazedHelp":
      "Crazed mewarisi bandul lempar dengan kepala yang lebih kuat dan memasang lonceng kedua saat lonceng utama terus menyerang. Tiga atau empat gelombang balasan serta ayunan terpisah bertumpuk dengan rangkaian utama. Baca tiap sumber dan celah tetapnya; terus bergerak di antara serangan yang membidik ulang.",
  },
  ur: {
    "boss.bellringer.description":
      "عام شکل کی صوتی لہروں میں 46 درجے کا مستقل خلا رہتا ہے؛ بہتر شکلوں میں 35 درجے کا۔ پورا جسم خلا میں رکھیں یا ڈیش سے لہر پار کریں۔ قریب آنے کا ہلکا راستہ بے ضرر ہے۔ ہر چلتی لہر اور گھنٹی کی زبان کا ہر وار صرف ایک بار لگتا ہے۔",
    "boss.bellringer.brutalHelp":
      "Brutal آپس میں چڑھتی لہروں کے درمیان زنجیر سے بندھی گھنٹی کی زبان پھینکتا ہے۔ نشان زدہ راستے سے ہٹ جائیں۔ زمین پر رکنے کے بعد واپسی کی نئی تنبیہ کے دوران سفید دراڑ والے سرے پر گولی چلائی جا سکتی ہے۔ اسے توڑ کر واپسی روکیں یا واپس آتے سرے سے بچیں۔ باریک زنجیر خود نقصان نہیں پہنچاتی۔",
    "boss.bellringer.crazedHelp":
      "Crazed میں پھینکے جانے والے سرے کی مضبوطی بڑھتی ہے اور مرکزی گھنٹی کے حملہ کرتے رہنے کے دوران دوسری گھنٹی رکھی جاتی ہے۔ تین یا چار جوابی لہریں اور الگ زبان کا وار مرکزی ترتیب کے ساتھ آتے ہیں۔ ہر منبع اور اس کے مستقل خلا کو دیکھیں؛ دوبارہ نشانہ بننے والے واروں کے درمیان حرکت کرتے رہیں۔",
  },
  ko: {
    "boss.bellringer.description":
      "일반 형태의 음파에는 고정된 46도 틈이 있고, 강화 형태에는 35도 틈이 있습니다. 몸 전체를 틈 안에 두거나 대시로 파면을 넘으세요. 옅은 접근 경로는 무해합니다. 움직이는 파면과 종추 휘두르기는 각각 한 번만 맞힙니다.",
    "boss.bellringer.brutalHelp":
      "Brutal은 겹치는 음파 사이에 사슬 달린 종추를 한 번 던집니다. 표시된 투척 경로에서 벗어나세요. 착지 후 새로운 회수 경고 동안 하얗게 금 간 추 머리를 쏠 수 있습니다. 부수면 회수를 막을 수 있고, 부수지 않으면 돌아오는 추를 피해야 합니다. 가는 사슬 자체는 피해를 주지 않습니다.",
    "boss.bellringer.crazedHelp":
      "Crazed는 더 튼튼한 추 머리의 투척을 계승하며 본체가 계속 공격하는 동안 두 번째 종을 설치합니다. 세 번 또는 네 번의 응답 파면과 별도 종추 공격이 본체 연주에 겹칩니다. 각 음원과 고정된 틈을 읽고 새로 조준하는 공격 사이에서 계속 움직이세요.",
  },
};
export function bellReturnChainMessages(locale) {
  if (!replacement[locale])
    throw Error("Missing returning-clapper locale " + locale);
  return { ...bellCounterpointMessages(locale), ...replacement[locale] };
}
