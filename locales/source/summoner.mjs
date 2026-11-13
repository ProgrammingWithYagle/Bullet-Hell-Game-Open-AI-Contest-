// Draft mechanical editions. Native-language and rendered-layout review remain open.
const rows={
en:`Summoner|Retinue|Escort|Hold|Focus|Focus|Rebind|Beaconwork|Bonds|Waykeeping|Call and Answer|Call Retinue|Gather|Open Muster|Caller's Baton|Braided Staff|Surveyor's Crook|Company Standard|Running Pack|Closed Ranks|Patient Company|Binding Spool|Clear Beacon|Quick Loop|Deep Spool|Ready Ties|Permanent|Temporary|Cycle order|Tatterhound|Lanternwing|Wickerward|Companion capacity|Beacon bond|Follow the caller and engage nearby enemies.|Hold a reachable point up to 140 units in the aim direction. Cover stops its placement.|Attack only the enemy marked by your actual primary hit. The mark lasts 8 seconds.`,
es:`Invocador|Séquito|Escoltar|Mantener|Concentrar|Concentración|Volver a atar|Señales|Vínculos|Orientación|Llamada y respuesta|Llamar al séquito|Reunir|Convocatoria abierta|Bastón del llamador|Vara trenzada|Cayado del agrimensor|Estandarte de compañía|Manada veloz|Filas cerradas|Compañía paciente|Carrete de ataduras|Señal clara|Lazo rápido|Carrete profundo|Ataduras listas|Permanentes|Temporales|Cambiar orden|Sabueso de retales|Ala farol|Guardián de mimbre|Capacidad del séquito|Vínculo de la señal|Sigue al invocador y ataca a enemigos cercanos.|Mantén un punto alcanzable hasta a 140 unidades en la dirección de la mira. La cobertura limita su posición.|Ataca solo al enemigo marcado por un impacto real de tu ataque primario. La marca dura 8 segundos.`,
fr:`Invocateur|Suite|Escorter|Tenir|Cibler|Concentration|Renouer|Balises|Liens|Guidage|Appel et réponse|Appeler la suite|Rassembler|Rassemblement ouvert|Bâton d'appel|Bâton tressé|Crosse d'arpenteur|Étendard de compagnie|Meute rapide|Rangs serrés|Compagnie patiente|Bobine de liens|Balise nette|Boucle rapide|Grande bobine|Liens préparés|Permanents|Temporaires|Changer d'ordre|Limier de chiffons|Aile-lanterne|Gardien d'osier|Capacité de la suite|Lien de balise|Suit l'invocateur et attaque les ennemis proches.|Tient un point accessible à 140 unités au plus dans la direction visée. Les obstacles limitent son placement.|Attaque uniquement l'ennemi réellement touché et marqué par votre attaque principale. La marque dure 8 secondes.`,
de:`Beschwörer|Gefolge|Begleiten|Halten|Fokussieren|Konzentration|Neu binden|Signalführung|Bindungen|Wegführung|Ruf und Antwort|Gefolge rufen|Sammeln|Offenes Aufgebot|Rufstab|Geflochtener Stab|Vermesserkrummstab|Kompaniebanner|Laufendes Rudel|Geschlossene Reihen|Geduldige Gesellschaft|Bindegarnrolle|Klares Signal|Schnelle Schlaufe|Tiefe Garnrolle|Fertige Bänder|Dauerhaft|Vorübergehend|Befehl wechseln|Flickenhund|Laternenflügel|Weidenwächter|Gefolgekapazität|Signalbindung|Folgt dem Beschwörer und bekämpft nahe Gegner.|Hält einen erreichbaren Punkt bis zu 140 Einheiten in Zielrichtung. Deckung begrenzt die Platzierung.|Greift nur den Gegner an, den dein tatsächlicher Primärtreffer markiert hat. Die Markierung hält 8 Sekunden.`,
'pt-BR':`Invocador|Séquito|Escoltar|Manter|Focar|Concentração|Refazer laços|Sinalização|Vínculos|Orientação|Chamado e resposta|Chamar séquito|Reunir|Convocação aberta|Bastão do chamador|Cajado trançado|Cajado do agrimensor|Estandarte de companhia|Matilha veloz|Fileiras fechadas|Companhia paciente|Carretel de vínculos|Sinal claro|Laço rápido|Carretel fundo|Laços prontos|Permanentes|Temporários|Alternar ordem|Cão de retalhos|Asa-lanterna|Guardião de vime|Capacidade do séquito|Vínculo do sinal|Segue o invocador e ataca inimigos próximos.|Mantém um ponto alcançável até 140 unidades na direção da mira. A cobertura limita a posição.|Ataca apenas o inimigo marcado por um acerto real do ataque primário. A marca dura 8 segundos.`,
ru:`Призыватель|Свита|Сопровождать|Удерживать|Сосредоточить|Сосредоточение|Перевязать|Маяки|Узы|Путеводительство|Зов и ответ|Призвать свиту|Собрать|Открытый сбор|Жезл призыва|Оплетённый посох|Крюк землемера|Знамя отряда|Быстрая стая|Сомкнутый строй|Терпеливые спутники|Катушка связей|Ясный маяк|Быстрая петля|Глубокая катушка|Готовые завязки|Постоянные|Временные|Сменить приказ|Лоскутная гончая|Фонарное крыло|Плетёный страж|Вместимость свиты|Связь маяка|Следовать за призывателем и атаковать ближайших врагов.|Удерживать доступную точку до 140 единиц по направлению прицела. Укрытия ограничивают размещение.|Атаковать только врага, помеченного настоящим попаданием основной атаки. Метка держится 8 секунд.`,
ja:`召喚士|従者|護衛|待機|集中攻撃|集中力|結び直し|標導|結び|道守り|呼び声と応え|従者を呼ぶ|集合|開かれた招集|呼び手の杖|組紐の杖|測量師の曲杖|一団の旗|走る群れ|密集陣|気長な仲間|結び糸巻き|明瞭な標|素早い輪|深い糸巻き|用意した結び紐|常設|一時|命令を切り替える|継ぎ布の猟犬|灯籠羽|籐の守り手|従者の上限|標との結び|召喚士に付き従い、近くの敵と戦う。|狙う方向の最大140単位先にある到達可能な地点を守る。遮蔽物が配置を制限する。|自分の通常攻撃が実際に命中して印を付けた敵だけを攻撃する。印は8秒続く。`,
'zh-Hans':`召唤师|随从|护送|驻守|集火|专注|重新结绳|信标术|羁绊|引路|呼唤与回应|召集随从|归队|开放征召|呼唤短杖|编绳长杖|测绘弯杖|队伍旗杖|疾行犬群|紧密队列|耐心同伴|缚绳线轴|清晰信标|迅捷绳环|深槽线轴|备好绳结|常驻|临时|切换命令|拼布猎犬|灯笼翼|藤编守卫|随从容量|信标羁绊|跟随召唤师，攻击附近的敌人。|驻守瞄准方向最多140单位内可到达的地点。掩体限制落点。|只攻击被你普通攻击实际命中并标记的敌人。标记持续8秒。`,
'zh-Hant':`召喚師|隨從|護送|駐守|集火|專注|重新結繩|信標術|羈絆|引路|呼喚與回應|召集隨從|歸隊|開放徵召|呼喚短杖|編繩長杖|測繪彎杖|隊伍旗杖|疾行犬群|緊密隊列|耐心同伴|縛繩線軸|清晰信標|迅捷繩環|深槽線軸|備好繩結|常駐|臨時|切換命令|拼布獵犬|燈籠翼|藤編守衛|隨從容量|信標羈絆|跟隨召喚師，攻擊附近的敵人。|駐守瞄準方向最多140單位內可到達的地點。掩體限制落點。|只攻擊被你普通攻擊實際命中並標記的敵人。標記持續8秒。`,
ko:`소환사|수행단|호위|거점 유지|집중 공격|집중력|다시 묶기|표식술|유대|길지기|부름과 응답|수행단 호출|집합|열린 소집|부름 지팡이|땋은 지팡이|측량사의 굽은 지팡이|부대 깃대|달리는 무리|밀집 대형|기다리는 동료|결속 실타래|선명한 표식|빠른 고리|깊은 실패|준비한 끈|상시|임시|명령 전환|누더기 사냥개|등불날개|버들 수호자|수행단 수용량|표식 유대|소환사를 따라가며 가까운 적과 싸운다.|조준 방향으로 최대 140단위 안의 도달 가능한 지점을 지킨다. 엄폐물이 배치를 막는다.|자신의 기본 공격이 실제로 맞아 표식을 남긴 적만 공격한다. 표식은 8초간 유지된다.`,
id:`Pemanggil|Pengiring|Kawal|Bertahan|Fokus sasaran|Konsentrasi|Ikat ulang|Suar|Ikatan|Penuntun jalan|Panggilan dan jawaban|Panggil pengiring|Berkumpul|Pengerahan terbuka|Tongkat pemanggil|Tongkat kepang|Tongkat juru ukur|Panji kelompok|Kawanan pelari|Barisan rapat|Rekan yang sabar|Gulungan pengikat|Suar jelas|Simpul cepat|Gulungan dalam|Tali siap pakai|Tetap|Sementara|Ganti perintah|Anjing perca|Sayap lentera|Penjaga anyaman|Kapasitas pengiring|Ikatan suar|Ikuti pemanggil dan serang musuh di dekatnya.|Pertahankan titik terjangkau hingga 140 unit ke arah bidik. Penghalang membatasi penempatannya.|Serang hanya musuh yang ditandai oleh serangan utama milikmu yang benar-benar mengenai sasaran. Tanda bertahan 8 detik.`,
hi:`आह्वाहक|अनुचर दल|साथ चलो|ठहरो|लक्ष्य साधो|एकाग्रता|फिर बाँधें|संकेत कला|बंधन|पथरक्षा|पुकार और उत्तर|अनुचर बुलाएँ|एकत्र हों|खुला आह्वान|पुकार छड़ी|गूँथा दंड|सर्वेक्षक का दंड|दल का ध्वज|दौड़ता झुंड|सघन पंक्ति|धीर साथी|बंधन की रील|स्पष्ट संकेत|तेज फंदा|गहरी रील|तैयार डोरियाँ|स्थायी|अस्थायी|आदेश बदलें|पैबंद शिकारी|लालटेन पंख|बेंत रक्षक|अनुचर क्षमता|संकेत बंधन|आह्वाहक के साथ चलकर पास के शत्रुओं से लड़ें।|निशाने की दिशा में अधिकतम 140 इकाई दूर पहुँच योग्य जगह पर रुकें। आड़ जगह तय करने को रोकती है।|अपने मुख्य हमले के असली प्रहार से चिह्नित शत्रु पर ही हमला करें। निशान 8 सेकंड रहता है।`,
bn:`আহ্বায়ক|অনুচর দল|সঙ্গে চল|অবস্থান ধর|লক্ষ্যে আঘাত|মনোযোগ|আবার বাঁধো|সংকেতবিদ্যা|বন্ধন|পথরক্ষা|ডাক ও সাড়া|অনুচর ডাকো|জড়ো হও|খোলা সমাবেশ|ডাকার ছড়ি|বোনা দণ্ড|জরিপকারীর বাঁকা দণ্ড|দলের পতাকা|দৌড়ানো পাল|ঘন সারি|ধৈর্যশীল সঙ্গী|বাঁধনের নাটাই|স্পষ্ট সংকেত|দ্রুত ফাঁস|গভীর নাটাই|তৈরি দড়ি|স্থায়ী|সাময়িক|আদেশ বদলাও|তালির শিকারি|লণ্ঠনডানা|বেতের রক্ষী|অনুচর ধারণক্ষমতা|সংকেতের বন্ধন|আহ্বায়কের সঙ্গে থেকে কাছের শত্রুদের আক্রমণ করে।|নিশানার দিকে সর্বোচ্চ 140 এককের মধ্যে পৌঁছানো যায় এমন জায়গা ধরে রাখে। আড়াল অবস্থান নির্ধারণে বাধা দেয়।|নিজের মূল আক্রমণ সত্যি আঘাত করে যে শত্রুকে চিহ্নিত করেছে শুধু তাকেই আক্রমণ করে। চিহ্ন 8 সেকেন্ড থাকে।`,
ar:`مستدع|رفقة|مرافقة|تمركز|تركيز الهجوم|تركيز|إعادة الربط|عمل المنارة|روابط|حفظ الطريق|نداء وجواب|استدعاء الرفقة|تجمع|حشد مفتوح|عصا المنادي|عصا مضفورة|عكاز المساح|راية الرفقة|قطيع راكض|صفوف متراصة|رفقة صبورة|بكرة ربط|منارة واضحة|حلقة سريعة|بكرة عميقة|أربطة جاهزة|دائمون|مؤقتون|تبديل الأمر|كلب الرقع|جناح الفانوس|حارس الخوص|سعة الرفقة|رابطة المنارة|يتبع المستدعي ويهاجم الأعداء القريبين.|يحرس نقطة يمكن بلوغها حتى 140 وحدة في اتجاه التصويب. يحد الغطاء من موضعها.|يهاجم فقط العدو الذي أصابته هجمة أساسية فعلية منك ووسمته. يدوم الوسم 8 ثوان.`,
ur:`طلب گر|رفقا|ساتھ چلو|ٹھہرو|ہدف پر توجہ|ارتکاز|دوبارہ باندھو|اشارے کا ہنر|بندھن|راہبانی|پکار اور جواب|رفقا بلاؤ|جمع ہو|کھلا اجتماع|پکار کی چھڑی|گندھا عصا|نقشہ ساز کا خم دار عصا|دستے کا علم|دوڑتا غول|بند صفیں|صابر ساتھی|بندھن کی چرخی|صاف اشارہ|تیز پھندا|گہری چرخی|تیار ڈوریاں|مستقل|عارضی|حکم بدلو|پیوندی شکاری|لالٹین پر|بید محافظ|رفقا کی گنجائش|اشارے کا بندھن|طلب گر کے ساتھ چل کر قریبی دشمنوں سے لڑو۔|نشانے کی سمت زیادہ سے زیادہ 140 اکائی دور قابل رسائی جگہ پر ٹھہرو۔ آڑ جگہ کے تعین کو روکتی ہے۔|صرف اسی دشمن پر حملہ کرو جسے تمہارا حقیقی بنیادی وار لگا اور نشان دیا۔ نشان 8 سیکنڈ رہتا ہے۔`,
};

const contracts={
en:[
'Call one Tatterhound and one Lanternwing into legal nearby space, up to four permanent companions. Existing survivors keep their health; a full or blocked call spends no cooldown. Bodies move, attack, take damage and respect cover.',
'For 4 seconds, living companions return physically at 40% extra speed. Each companion present at the cast can recover 12 base health once after arriving. No teleport, resurrection, repeated-arrival healing or invulnerability.',
'Call up to two temporary Wickerwards for 16 seconds and increase retinue damage by 25% during that interval. All forms share an eight-body owner limit. Expiry withdraws temporary forms without damage or refund.',
'Actual primary beacon hits mark one living enemy for 8 seconds. Companion attacks cannot create marks. Focus chooses that mark; primary fire spends focus, and Rebind refills it. The weapon bond strengthens real companions.',
'Call a finite retinue, mark its target and keep its members alive with orders and physical recall.',
'Joss Merrow entered Summoner training after organizing market deliveries. Some of his old delivery squares are still empty.',
'Call two Hounds instead of the balanced pair. They have 20% less health and move 12% faster. Permanent and total capacity limits still apply.',
'Gather arrival grants 45% damage reduction for 4 seconds instead of repairing health. Each companion present at the cast receives one arrival benefit.',
'Temporary Wickerwards last 8 seconds longer. Give up the 25% retinue damage boost; ultimate potency still strengthens the Warders themselves.'
],
es:[
'Llama a un Sabueso de retales y un Ala farol a un espacio cercano válido, hasta cuatro compañeros permanentes. Los supervivientes conservan su salud; una llamada llena o bloqueada no gasta recarga. Los cuerpos se mueven, atacan, reciben daño y respetan la cobertura.',
'Durante 4 segundos, los compañeros vivos regresan físicamente un 40% más rápido. Cada uno presente al lanzar recupera 12 de salud base una vez al llegar. Sin teletransporte, resurrección, curación repetida ni invulnerabilidad.',
'Llama hasta dos Guardianes de mimbre temporales durante 16 segundos y aumenta un 25% el daño del séquito en ese intervalo. Todas las formas comparten un límite de ocho cuerpos por dueño. Al expirar se retiran sin daño ni reembolso.',
'Los impactos primarios reales de la señal marcan a un enemigo vivo durante 8 segundos. Los ataques de compañeros no crean marcas. Concentrar elige esa marca; el ataque primario gasta concentración y Volver a atar la repone. El vínculo del arma fortalece a los compañeros reales.',
'Llama a un séquito limitado, marca su objetivo y mantenlo vivo con órdenes y un regreso físico.',
'Joss Merrow entró en la formación de Invocador después de organizar repartos en el mercado. Algunas casillas de sus viejos repartos siguen vacías.',
'Llama a dos Sabuesos en vez de la pareja equilibrada. Tienen un 20% menos de salud y se mueven un 12% más rápido. Se mantienen los límites de capacidad.',
'La llegada al Reunir otorga un 45% de reducción de daño durante 4 segundos en vez de reparar salud. Cada compañero presente al lanzar recibe un solo beneficio de llegada.',
'Los Guardianes temporales duran 8 segundos más. Pierdes la mejora del 25% al daño del séquito; la potencia de la definitiva sigue fortaleciendo a los propios Guardianes.'
],
fr:[
'Appelle un Limier de chiffons et une Aile-lanterne dans un espace proche valide, jusqu’à quatre compagnons permanents. Les survivants gardent leur santé ; un appel plein ou bloqué ne consomme aucun délai. Les corps se déplacent, attaquent, subissent des dégâts et respectent les obstacles.',
'Pendant 4 secondes, les compagnons vivants reviennent physiquement avec 40 % de vitesse en plus. Chaque compagnon présent au lancement récupère une fois 12 points de santé de base à son arrivée. Sans téléportation, résurrection, soin répété ni invulnérabilité.',
'Appelle jusqu’à deux Gardiens d’osier temporaires pendant 16 secondes et augmente les dégâts de la suite de 25 % durant cet intervalle. Toutes les formes partagent une limite de huit corps par propriétaire. Leur expiration les retire sans dégâts ni remboursement.',
'Les impacts réels de balise de l’attaque principale marquent un ennemi vivant pendant 8 secondes. Les compagnons ne créent pas de marques. Cibler choisit cette marque ; l’attaque principale dépense de la concentration et Renouer la recharge. Le lien de l’arme renforce les compagnons réels.',
'Appelle une suite limitée, marque sa cible et garde ses membres en vie par des ordres et un retour physique.',
'Joss Merrow a commencé sa formation d’Invocateur après avoir organisé les livraisons du marché. Certaines cases de ses anciennes livraisons restent vides.',
'Appelle deux Limiers au lieu du duo équilibré. Ils ont 20 % de santé en moins et se déplacent 12 % plus vite. Les limites de capacité restent applicables.',
'L’arrivée de Rassembler accorde 45 % de réduction des dégâts pendant 4 secondes au lieu de réparer la santé. Chaque compagnon présent au lancement reçoit un seul bénéfice d’arrivée.',
'Les Gardiens temporaires durent 8 secondes de plus. Perd le bonus de 25 % aux dégâts de la suite ; la puissance ultime renforce toujours les Gardiens eux-mêmes.'
],
de:[
'Ruft einen Flickenhund und einen Laternenflügel auf legalen nahen Boden, bis zu vier dauerhaften Begleitern. Überlebende behalten ihre Gesundheit; ein voller oder blockierter Ruf verbraucht keine Abklingzeit. Körper bewegen sich, greifen an, nehmen Schaden und beachten Deckung.',
'Für 4 Sekunden kehren lebende Begleiter körperlich mit 40 % mehr Tempo zurück. Jeder beim Wirken vorhandene Begleiter kann bei Ankunft einmal 12 Basisgesundheit erhalten. Keine Teleportation, Wiederbelebung, wiederholte Ankunftsheilung oder Unverwundbarkeit.',
'Ruft bis zu zwei vorübergehende Weidenwächter für 16 Sekunden und erhöht den Gefolgeschaden in dieser Zeit um 25 %. Alle Formen teilen das Besitzerlimit von acht Körpern. Beim Ablauf verschwinden sie ohne Schaden oder Erstattung.',
'Echte primäre Signaltreffer markieren einen lebenden Gegner für 8 Sekunden. Begleiterangriffe erzeugen keine Markierung. Fokussieren wählt diese Markierung; Primärfeuer verbraucht Konzentration, Neu binden füllt sie auf. Die Waffenbindung stärkt echte Begleiter.',
'Rufe ein begrenztes Gefolge, markiere sein Ziel und halte es mit Befehlen und körperlicher Rückkehr am Leben.',
'Joss Merrow begann die Beschwörerausbildung nach der Organisation von Marktlieferungen. Einige Kästchen seiner alten Lieferungen sind noch leer.',
'Ruft zwei Hunde statt des ausgeglichenen Paars. Sie haben 20 % weniger Gesundheit und bewegen sich 12 % schneller. Dauerhafte und gesamte Kapazitätsgrenzen gelten weiter.',
'Die Ankunft beim Sammeln gibt 4 Sekunden lang 45 % Schadensreduktion statt Gesundheitsreparatur. Jeder beim Wirken vorhandene Begleiter erhält einen Ankunftsvorteil.',
'Vorübergehende Wächter bleiben 8 Sekunden länger. Der Gefolgeschadensbonus von 25 % entfällt; ultimative Stärke verbessert weiterhin die Wächter selbst.'
],
'pt-BR':[
'Chama um Cão de retalhos e uma Asa-lanterna para um espaço próximo válido, até quatro companheiros permanentes. Sobreviventes mantêm a vida; uma chamada cheia ou bloqueada não gasta recarga. Corpos se movem, atacam, sofrem dano e respeitam cobertura.',
'Por 4 segundos, companheiros vivos voltam fisicamente com 40% mais velocidade. Cada um presente no lançamento recupera 12 de vida base uma vez ao chegar. Sem teleporte, ressurreição, cura repetida de chegada ou invulnerabilidade.',
'Chama até dois Guardiões de vime temporários por 16 segundos e aumenta o dano do séquito em 25% nesse intervalo. Todas as formas dividem o limite de oito corpos por dono. Ao expirar, formas temporárias saem sem dano nem reembolso.',
'Acertos reais do sinal primário marcam um inimigo vivo por 8 segundos. Ataques de companheiros não criam marcas. Focar escolhe a marca; o ataque primário gasta concentração e Refazer laços a repõe. O vínculo da arma fortalece companheiros reais.',
'Chame um séquito limitado, marque seu alvo e mantenha os membros vivos com ordens e retorno físico.',
'Joss Merrow começou a formação de Invocador depois de organizar entregas no mercado. Algumas casas das antigas entregas ainda estão vazias.',
'Chama dois Cães em vez do par equilibrado. Eles têm 20% menos vida e se movem 12% mais rápido. Os limites permanentes e totais continuam valendo.',
'Chegar ao Reunir concede 45% de redução de dano por 4 segundos em vez de reparar vida. Cada companheiro presente no lançamento recebe um único benefício de chegada.',
'Guardiões temporários duram 8 segundos a mais. Perde o bônus de 25% ao dano do séquito; a potência da suprema ainda fortalece os próprios Guardiões.'
],
ru:[
'Призывает Лоскутную гончую и Фонарное крыло в допустимое место рядом, до четырёх постоянных спутников. Выжившие сохраняют здоровье; заполненный или перекрытый призыв не тратит перезарядку. Тела движутся, атакуют, получают урон и учитывают укрытия.',
'На 4 секунды живые спутники физически возвращаются со скоростью на 40 % выше. Каждый спутник, бывший при применении, восстанавливает 12 базового здоровья один раз по прибытии. Без телепортации, воскрешения, повторного лечения или неуязвимости.',
'Призывает до двух временных Плетёных стражей на 16 секунд и повышает урон свиты на 25 % на это время. Общий предел всех форм — восемь тел на владельца. По истечении срока временные формы уходят без урона и возврата.',
'Настоящие попадания основного маяка метят одного живого врага на 8 секунд. Атаки спутников не создают метки. Сосредоточить выбирает эту метку; основной огонь тратит сосредоточение, а Перевязать его восстанавливает. Связь оружия усиливает настоящих спутников.',
'Призывайте ограниченную свиту, отмечайте её цель и сохраняйте спутников приказами и физическим возвращением.',
'Джосс Мерроу начал обучение Призывателя после организации рыночных доставок. Некоторые клетки старых доставок ещё пусты.',
'Призывает двух Гончих вместо сбалансированной пары. У них на 20 % меньше здоровья и на 12 % больше скорость. Постоянные и общие пределы сохраняются.',
'Прибытие после Сбора даёт снижение урона на 45 % на 4 секунды вместо восстановления здоровья. Каждый спутник при применении получает один бонус прибытия.',
'Временные Стражи живут на 8 секунд дольше. Бонус урона свиты в 25 % теряется; сила высшей способности по-прежнему усиливает самих Стражей.'
],
ja:[
'近くの配置可能な場所に継ぎ布の猟犬1体と灯籠羽1体を呼ぶ。常設従者は初期上限4体。生き残った従者の体力はそのままで、満員や配置不可ではクールダウンを消費しない。実体が移動・攻撃・被弾し、遮蔽物に従う。',
'4秒間、生きている従者が移動速度40%増加で実際に戻ってくる。発動時にいた各従者は到着時に一度だけ基礎体力12を回復する。転送、蘇生、到着し直しての反復回復、無敵はない。',
'一時的な籐の守り手を最大2体、16秒間呼び、その間の従者ダメージを25%増やす。全形態を合わせて所有者1人につき8体が上限。時間切れで一時形態は攻撃や払い戻しを伴わず退く。',
'通常の標弾が実際に命中すると、生きた敵1体に8秒間の印を付ける。従者の攻撃は印を作らない。集中攻撃はその印を選ぶ。通常攻撃は集中力を使い、結び直しで補充する。武器の結びは実際の従者を強化する。',
'数に限りのある従者を呼び、対象に印を付け、命令と実際の帰還で仲間を守る。',
'ジョス・メロウは市場の配達を取りまとめた後、召喚士の訓練を始めた。昔の配達表にはまだ空欄がある。',
'均衡した組の代わりに猟犬2体を呼ぶ。体力が20%減り、移動が12%速くなる。常設数と総数の上限は変わらない。',
'集合で到着すると体力修復の代わりに4秒間45%のダメージ軽減を得る。発動時にいた各従者が一度だけ到着効果を得る。',
'一時的な守り手の持続時間が8秒延びる。従者全体への25%ダメージ増加は失うが、究極技の威力強化は守り手自身に適用される。'
],
'zh-Hans':[
'在附近可用空间召来1只拼布猎犬和1只灯笼翼，初始最多4个常驻随从。存活者保留当前生命；容量已满或落点受阻时不消耗冷却。随从拥有真实移动、攻击和生命，并受掩体阻挡。',
'4秒内，存活随从以提高40%的速度实际返回。施放时已存在的每个随从到达后可恢复一次12点基础生命。不会传送、复活、反复到达刷治疗或获得无敌。',
'召来最多2个临时藤编守卫，持续16秒，其间随从伤害提高25%。所有形态合计每位主人最多8个。临时形态到期退场，不爆炸也不返还资源。',
'普通信标攻击实际命中后，标记1个存活敌人8秒。随从攻击不能产生标记。集火选择该标记；普通攻击消耗专注，重新结绳补满专注。武器羁绊强化真实随从。',
'召集数量有限的随从，标记目标，通过命令和实际归队保护它们。',
'乔斯·梅罗曾安排市场送货，后来才开始召唤师训练。他旧送货单上仍有未勾选的方格。',
'改为召来2只猎犬，取代均衡组合。它们生命降低20%，移动速度提高12%。常驻和总容量上限不变。',
'归队到达改为获得4秒45%伤害减免，不再恢复生命。施放时已有的每个随从只获得一次到达收益。',
'临时守卫多持续8秒，失去随从全体25%的伤害加成；终极技能强度仍强化守卫本身。'
],
'zh-Hant':[
'在附近可用空間召來1隻拼布獵犬和1隻燈籠翼，初始最多4個常駐隨從。存活者保留目前生命；容量已滿或落點受阻時不消耗冷卻。隨從擁有真實移動、攻擊和生命，並受掩體阻擋。',
'4秒內，存活隨從以提高40%的速度實際返回。施放時已存在的每個隨從到達後可恢復一次12點基礎生命。不會傳送、復活、反覆到達刷治療或獲得無敵。',
'召來最多2個臨時藤編守衛，持續16秒，其間隨從傷害提高25%。所有形態合計每位主人最多8個。臨時形態到期退場，不爆炸也不返還資源。',
'普通信標攻擊實際命中後，標記1個存活敵人8秒。隨從攻擊不能產生標記。集火選擇該標記；普通攻擊消耗專注，重新結繩補滿專注。武器羈絆強化真實隨從。',
'召集數量有限的隨從，標記目標，透過命令和實際歸隊保護它們。',
'喬斯·梅羅曾安排市場送貨，後來才開始召喚師訓練。他舊送貨單上仍有未勾選的方格。',
'改為召來2隻獵犬，取代均衡組合。牠們生命降低20%，移動速度提高12%。常駐和總容量上限不變。',
'歸隊到達改為獲得4秒45%傷害減免，不再恢復生命。施放時已有的每個隨從只獲得一次到達收益。',
'臨時守衛多持續8秒，失去隨從全體25%的傷害加成；終極技能強度仍強化守衛本身。'
],
ko:[
'가까운 유효 공간에 누더기 사냥개 하나와 등불날개 하나를 부른다. 기본 상시 한도는 4마리다. 생존한 동료의 체력은 유지되며 가득 찼거나 막혔다면 재사용 시간을 쓰지 않는다. 실제 몸이 이동하고 공격하며 피해와 엄폐물의 영향을 받는다.',
'4초간 살아 있는 동료가 40% 빠른 속도로 실제 이동해 돌아온다. 시전 때 존재하던 각 동료는 도착 후 한 번 기본 체력 12를 회복한다. 순간이동, 부활, 반복 도착 회복이나 무적은 없다.',
'임시 버들 수호자를 최대 둘까지 16초간 부르고 그동안 수행단 피해를 25% 높인다. 모든 형태를 합쳐 주인 한 명당 몸 8개가 한도다. 시간이 끝나면 피해나 환급 없이 임시 형태가 철수한다.',
'기본 표식 공격이 실제로 맞으면 살아 있는 적 하나를 8초간 표시한다. 동료 공격은 표식을 만들지 않는다. 집중 공격은 그 표식을 선택한다. 기본 공격은 집중력을 쓰고 다시 묶기로 채운다. 무기 유대는 실제 동료를 강화한다.',
'한정된 수행단을 부르고 목표를 표시하며 명령과 실제 귀환으로 동료를 살린다.',
'조스 메로는 시장 배달을 정리하던 일을 하다가 소환사 훈련을 시작했다. 예전 배달표의 몇 칸은 아직 비어 있다.',
'균형 잡힌 한 쌍 대신 사냥개 둘을 부른다. 체력이 20% 줄고 이동 속도가 12% 오른다. 상시 및 전체 한도는 유지된다.',
'집합 도착 시 체력 수리 대신 4초간 45% 피해 감소를 얻는다. 시전 때 있던 각 동료는 도착 혜택을 한 번만 받는다.',
'임시 수호자가 8초 더 유지된다. 수행단 전체의 피해 25% 증가는 잃지만 궁극기 위력은 수호자 자체를 계속 강화한다.'
],
id:[
'Panggil satu Anjing perca dan satu Sayap lentera ke ruang dekat yang sah, hingga empat rekan tetap. Rekan yang hidup mempertahankan kesehatannya; panggilan penuh atau terhalang tidak memakai jeda. Tubuh bergerak, menyerang, menerima kerusakan dan mematuhi penghalang.',
'Selama 4 detik, rekan hidup kembali secara fisik dengan kecepatan tambahan 40%. Setiap rekan yang ada saat pemakaian dapat memulihkan 12 kesehatan dasar sekali setelah tiba. Tanpa teleportasi, kebangkitan, penyembuhan kedatangan berulang atau kekebalan.',
'Panggil hingga dua Penjaga anyaman sementara selama 16 detik dan tingkatkan kerusakan pengiring 25% selama itu. Semua bentuk berbagi batas delapan tubuh per pemilik. Bentuk sementara mundur saat habis tanpa ledakan atau pengembalian.',
'Serangan utama suar yang benar-benar mengenai menandai satu musuh hidup selama 8 detik. Serangan rekan tidak membuat tanda. Fokus sasaran memilih tanda itu; serangan utama memakai konsentrasi dan Ikat ulang mengisinya. Ikatan senjata memperkuat rekan nyata.',
'Panggil pengiring terbatas, tandai sasarannya dan jaga anggotanya lewat perintah serta kepulangan fisik.',
'Joss Merrow masuk latihan Pemanggil setelah mengatur pengiriman pasar. Beberapa kotak pengiriman lamanya masih kosong.',
'Panggil dua Anjing sebagai ganti pasangan seimbang. Kesehatan berkurang 20% dan gerak 12% lebih cepat. Batas tetap dan total masih berlaku.',
'Kedatangan Berkumpul memberi pengurangan kerusakan 45% selama 4 detik, bukan perbaikan kesehatan. Setiap rekan saat pemakaian menerima satu manfaat kedatangan.',
'Penjaga sementara bertahan 8 detik lebih lama. Kehilangan peningkatan kerusakan pengiring 25%; kekuatan pamungkas masih memperkuat Penjaga itu sendiri.'
],
hi:[
'पास की वैध जगह में एक पैबंद शिकारी और एक लालटेन पंख बुलाएँ, शुरू में अधिकतम चार स्थायी साथी। जीवित साथियों का स्वास्थ्य बना रहता है; जगह भरी या बंद हो तो कूलडाउन खर्च नहीं होता। शरीर सचमुच चलते, हमला करते, नुकसान लेते और आड़ मानते हैं।',
'4 सेकंड तक जीवित साथी 40% अतिरिक्त गति से सचमुच वापस आते हैं। उपयोग के समय मौजूद हर साथी पहुँचकर एक बार 12 आधार स्वास्थ्य पा सकता है। टेलीपोर्ट, पुनर्जीवन, बार-बार पहुँचकर उपचार या अजेयता नहीं।',
'16 सेकंड के लिए अधिकतम दो अस्थायी बेंत रक्षक बुलाएँ और उस दौरान अनुचर नुकसान 25% बढ़ाएँ। सभी रूप मिलाकर प्रति स्वामी आठ शरीर की सीमा है। अवधि पूरी होने पर अस्थायी रूप बिना नुकसान या वापसी के हटते हैं।',
'मुख्य संकेत के असली प्रहार से एक जीवित शत्रु 8 सेकंड चिह्नित होता है। साथियों के हमले निशान नहीं बनाते। लक्ष्य साधो वही निशान चुनता है; मुख्य हमला एकाग्रता खर्च करता है और फिर बाँधें उसे भरता है। हथियार का बंधन वास्तविक साथियों को मजबूत करता है।',
'सीमित अनुचर बुलाएँ, उनका लक्ष्य चिह्नित करें और आदेश तथा वास्तविक वापसी से उन्हें बचाएँ।',
'जॉस मेरो ने बाजार की डिलीवरी व्यवस्थित करने के बाद आह्वाहक प्रशिक्षण शुरू किया। पुराने वितरण के कुछ खाने अब भी खाली हैं।',
'संतुलित जोड़ी की जगह दो शिकारी बुलाएँ। उनका स्वास्थ्य 20% कम और गति 12% अधिक है। स्थायी और कुल क्षमता सीमाएँ लागू रहती हैं।',
'एकत्र होने पर स्वास्थ्य सुधारने की जगह 4 सेकंड के लिए 45% नुकसान में कमी मिलती है। उपयोग के समय मौजूद हर साथी को एक आगमन लाभ मिलता है।',
'अस्थायी रक्षक 8 सेकंड और रहते हैं। अनुचर नुकसान का 25% लाभ छोड़ते हैं; अंतिम क्षमता की शक्ति रक्षकों को खुद मजबूत करती रहती है।'
],
bn:[
'কাছের বৈধ জায়গায় একটি তালির শিকারি ও একটি লণ্ঠনডানা ডাকো, শুরুতে সর্বোচ্চ চার স্থায়ী সঙ্গী। বেঁচে থাকা সঙ্গীদের স্বাস্থ্য থাকে; জায়গা পূর্ণ বা বাধাগ্রস্ত হলে কুলডাউন খরচ হয় না। দেহ সত্যি চলে, আক্রমণ করে, ক্ষতি নেয় ও আড়াল মানে।',
'4 সেকেন্ড জীবিত সঙ্গীরা 40% বাড়তি গতিতে বাস্তবে ফিরে আসে। ব্যবহারের সময় উপস্থিত প্রতি সঙ্গী পৌঁছে একবার 12 মূল স্বাস্থ্য ফেরত পায়। টেলিপোর্ট, পুনরুত্থান, বারবার পৌঁছে চিকিৎসা বা অজেয়তা নেই।',
'16 সেকেন্ডের জন্য সর্বোচ্চ দুই সাময়িক বেতের রক্ষী ডাকে এবং সেই সময় অনুচরের ক্ষতি 25% বাড়ায়। সব রূপ মিলিয়ে প্রতি মালিকের আট দেহের সীমা। মেয়াদ শেষে সাময়িক রূপ ক্ষতি বা ফেরত ছাড়া সরে যায়।',
'মূল সংকেতের সত্যিকারের আঘাত একটি জীবিত শত্রুকে 8 সেকেন্ড চিহ্নিত করে। সঙ্গীর আক্রমণ চিহ্ন তৈরি করে না। লক্ষ্যে আঘাত সেই চিহ্ন বেছে নেয়; মূল আক্রমণে মনোযোগ খরচ হয়, আবার বাঁধো তা ভরে। অস্ত্রের বন্ধন বাস্তব সঙ্গীকে শক্তিশালী করে।',
'সীমিত অনুচর ডাকো, লক্ষ্য চিহ্নিত করো এবং আদেশ ও সত্যিকারের প্রত্যাবর্তনে তাদের বাঁচাও।',
'জস মেরো বাজারের সরবরাহ গুছিয়ে দেওয়ার পর আহ্বায়কের প্রশিক্ষণ শুরু করে। পুরোনো সরবরাহের কিছু ঘর এখনও ফাঁকা।',
'সুষম জুটির বদলে দুই শিকারি ডাকে। স্বাস্থ্য 20% কম এবং চলার গতি 12% বেশি। স্থায়ী ও মোট সীমা অপরিবর্তিত।',
'জড়ো হয়ে পৌঁছালে স্বাস্থ্য মেরামতের বদলে 4 সেকেন্ড 45% ক্ষতি হ্রাস পায়। ব্যবহারের সময় থাকা প্রতি সঙ্গী একবার আগমনের সুবিধা পায়।',
'সাময়িক রক্ষী আরও 8 সেকেন্ড থাকে। অনুচরের ক্ষতিতে 25% বৃদ্ধি হারায়; চূড়ান্ত শক্তি রক্ষীদের নিজেদের এখনও শক্তিশালী করে।'
],
ar:[
'يستدعي كلب رقع وجناح فانوس إلى مكان قريب صالح حتى أربعة رفاق دائمين. يحتفظ الناجون بصحتهم؛ لا تستهلك الدعوة الممتلئة أو المحجوبة فترة التهدئة. تتحرك الأجسام وتهاجم وتتضرر وتحترم الغطاء.',
'لمدة 4 ثوان يعود الرفاق الأحياء فعليا بسرعة إضافية 40%. يستعيد كل رفيق موجود عند الإلقاء 12 صحة أساسية مرة واحدة عند الوصول. لا انتقال آني أو إحياء أو علاج وصول متكرر أو حصانة.',
'يستدعي حتى حارسي خوص مؤقتين لمدة 16 ثانية ويرفع ضرر الرفقة 25% خلالها. تشترك كل الأشكال في حد ثمانية أجسام لكل مالك. تنسحب الأشكال المؤقتة عند انتهاء المدة بلا ضرر أو استرداد.',
'توسم إصابات المنارة الأساسية الفعلية عدوا حيا واحدا لمدة 8 ثوان. لا تصنع هجمات الرفاق وسوما. يختار تركيز الهجوم ذلك الوسم؛ يستهلك الهجوم الأساسي التركيز وتملؤه إعادة الربط. تقوي رابطة السلاح الرفاق الفعليين.',
'استدع رفقة محدودة وسم هدفها وأبق أفرادها أحياء بالأوامر والعودة الفعلية.',
'دخل جوس ميرو تدريب المستدعين بعد تنظيم توصيلات السوق. ما زالت بعض مربعات توصيلاته القديمة فارغة.',
'يستدعي كلبين بدل الثنائي المتوازن. صحتهما أقل 20% وحركتهما أسرع 12%. تبقى حدود السعة الدائمة والإجمالية.',
'يمنح الوصول بعد التجمع تقليل ضرر 45% لمدة 4 ثوان بدل ترميم الصحة. يحصل كل رفيق موجود عند الإلقاء على فائدة وصول واحدة.',
'يبقى الحراس المؤقتون 8 ثوان إضافية. تفقد زيادة ضرر الرفقة 25%؛ تظل قوة القدرة القصوى تقوي الحراس أنفسهم.'
],
ur:[
'قریب کی درست جگہ پر ایک پیوندی شکاری اور ایک لالٹین پر بلاؤ، ابتدا میں زیادہ سے زیادہ چار مستقل ساتھی۔ زندہ ساتھی اپنی صحت رکھتے ہیں؛ جگہ بھری یا بند ہو تو وقفہ خرچ نہیں ہوتا۔ جسم حقیقی طور پر چلتے، حملہ کرتے، نقصان لیتے اور آڑ مانتے ہیں۔',
'4 سیکنڈ تک زندہ ساتھی 40% اضافی رفتار سے حقیقی طور پر واپس آتے ہیں۔ استعمال کے وقت موجود ہر ساتھی پہنچ کر ایک بار 12 بنیادی صحت پاتا ہے۔ ٹیلی پورٹ، دوبارہ زندگی، بار بار پہنچنے کا علاج یا ناقابل شکست ہونا نہیں۔',
'16 سیکنڈ کے لیے زیادہ سے زیادہ دو عارضی بید محافظ بلاؤ اور اس دوران رفقا کا نقصان 25% بڑھاؤ۔ تمام شکلوں کی مشترک حد فی مالک آٹھ جسم ہے۔ وقت ختم ہونے پر عارضی شکلیں بغیر نقصان یا واپسی کے ہٹتی ہیں۔',
'بنیادی اشارے کی حقیقی ضرب ایک زندہ دشمن کو 8 سیکنڈ کا نشان دیتی ہے۔ ساتھیوں کے حملے نشان نہیں بناتے۔ ہدف پر توجہ اسی نشان کو چنتا ہے؛ بنیادی حملہ ارتکاز خرچ کرتا ہے اور دوبارہ باندھو اسے بھرتا ہے۔ ہتھیار کا بندھن حقیقی ساتھیوں کو مضبوط کرتا ہے۔',
'محدود رفقا بلاؤ، ان کا ہدف نشان زد کرو اور احکام اور حقیقی واپسی سے انہیں زندہ رکھو۔',
'جوس میرو نے بازار کی ترسیل منظم کرنے کے بعد طلب گر کی تربیت شروع کی۔ پرانی ترسیل کے کچھ خانے اب بھی خالی ہیں۔',
'متوازن جوڑے کے بجائے دو شکاری بلاؤ۔ ان کی صحت 20% کم اور رفتار 12% زیادہ ہے۔ مستقل اور کل گنجائش کی حدیں برقرار ہیں۔',
'جمع ہو کر پہنچنے پر صحت کی مرمت کے بجائے 4 سیکنڈ کے لیے 45% نقصان میں کمی ملتی ہے۔ استعمال کے وقت موجود ہر ساتھی کو ایک آمد کا فائدہ ملتا ہے۔',
'عارضی محافظ 8 سیکنڈ زیادہ رہتے ہیں۔ رفقا کے نقصان کا 25% اضافہ ختم ہوتا ہے؛ آخری صلاحیت کی طاقت خود محافظوں کو مضبوط کرتی رہتی ہے۔'
],
};

const supplyDescriptions={"en": "Refill primary focus immediately. Does not heal or call companions. Maximum carried: {maximum}.", "es": "Repone la concentración primaria al instante. No cura ni llama compañeros. Máximo transportado: {maximum}.", "fr": "Recharge immédiatement la concentration principale. Ne soigne ni n’appelle de compagnons. Maximum porté : {maximum}.", "de": "Füllt die Primärkonzentration sofort auf. Heilt oder ruft keine Begleiter. Tragelimit: {maximum}.", "pt-BR": "Repõe a concentração primária imediatamente. Não cura nem chama companheiros. Máximo carregado: {maximum}.", "ru": "Мгновенно восстанавливает основное сосредоточение. Не лечит и не призывает спутников. Предел запаса: {maximum}.", "ja": "通常攻撃の集中力を即座に補充する。従者を回復したり呼び出したりはしない。所持上限：{maximum}。", "zh-Hans": "立即补满普通攻击的专注。不会治疗或召集随从。携带上限：{maximum}。", "zh-Hant": "立即補滿普通攻擊的專注。不會治療或召集隨從。攜帶上限：{maximum}。", "ko": "기본 공격의 집중력을 즉시 채운다. 동료를 회복하거나 부르지 않는다. 소지 한도: {maximum}.", "id": "Langsung mengisi konsentrasi utama. Tidak menyembuhkan atau memanggil rekan. Batas bawaan: {maximum}.", "hi": "मुख्य एकाग्रता तुरंत भरें। साथियों को उपचार नहीं मिलता और वे बुलाए नहीं जाते। अधिकतम साथ रखें: {maximum}।", "bn": "মূল মনোযোগ সঙ্গে সঙ্গে ভরে। সঙ্গীকে সারায় বা ডাকে না। বহনের সর্বোচ্চ: {maximum}।", "ar": "يملأ التركيز الأساسي فورا. لا يعالج الرفاق ولا يستدعيهم. أقصى حمل: {maximum}.", "ur": "بنیادی ارتکاز فوراً بھریں۔ ساتھیوں کو شفا نہیں دیتا اور نہ بلاتا ہے۔ اٹھانے کی حد: {maximum}۔"};
const normalized=out=>Object.fromEntries(Object.entries(out).map(([k,v])=>{if(typeof v!=='string')throw Error('Missing Summoner string '+k);return [k,v.normalize('NFC')];}));
export function summonerTalentMessages(language){
 const r=rows[language]?.split('|'),a=contracts[language];if(!r||r.length!==37||!a||a.length!==9)throw Error('Missing Summoner edition '+language);
 return normalized(Object.fromEntries(['running-pack','closed-ranks','patient-company'].flatMap((id,i)=>[['talent.'+id+'.name',r[18+i]],['talent.'+id+'.description',a[6+i]]])));
}
export function summonerMessages(language,c,existing){
 const r=rows[language]?.split('|'),a=contracts[language];if(!r||r.length!==37||!a)throw Error('Missing Summoner edition '+language);
 const out={'class.summoner.name':r[0],'class.summoner.role':a[4],'class.summoner.lore':a[5],
 'branch.beaconwork':r[7],'branch.bonds':r[8],'branch.waykeeping':r[9],
 'ui.summonerFocus':r[5],'ui.summonerRebind':r[6],'ui.retinueOrders':r[1],'ui.retinue.escort':r[2],'ui.retinue.hold':r[3],'ui.retinue.focus':r[4],
 'ui.retinue.escortHint':r[34],'ui.retinue.holdHint':r[35],'ui.retinue.focusHint':r[36],
 'ui.retinueHealth':r[1]+' · '+existing['ui.health'],'ui.retinueSummary':r[26]+' {permanent}/{capacity} · '+r[27]+' {temporary}',
 'ui.retinueCycleHint':r[28]+' · {binding}','ui.retinueHealthRow':'{name} · {health}/{maximum}',
 'ui.retinue.hound':r[29],'ui.retinue.wing':r[30],'ui.retinue.ward':r[31],
 'stat.retinueCapacity':r[32],'stat.summonBond':r[33],
 'supply.summoner-thread-spool.name':r[21],'supply.summoner-thread-spool.description':supplyDescriptions[language],
 ...summonerTalentMessages(language)};
 for(const [i,id]of['summoner-q','summoner-e','summoner-ultimate'].entries()){out['ability.'+id+'.name']=r[11+i];out['ability.'+id+'.description']=a[i];}
 for(const [i,id]of['damage','fire-rate','magazine','reload'].entries())out['upgrade.summoner-'+id+'.name']=r[22+i];
 for(const [key,base]of Object.entries({summonHealth:'health',summonDamage:'damage',summonSpeed:'moveSpeed',summonAttackRate:'fireRate',summonReach:'range'}))out['stat.'+key]=r[1]+' · '+existing['stat.'+base];
 for(const [i,w]of c.weapons.filter(w=>w.classId==='summoner').entries()){out['weapon.'+w.id+'.name']=r[14+i];out['weapon.'+w.id+'.description']=a[3];}
 const cl=c.classes.find(cl=>cl.id==='summoner');
 for(const s of c.skills.filter(s=>s.classId==='summoner')){
   const branch=cl.branches.findIndex(b=>b.id===s.branchId),focus=s.lane?(out[s.subbranchNameKey]??existing[s.subbranchNameKey]):'';
   out['skill.'+s.id+'.name']=s.transform?out['talent.'+s.transform+'.name']:s.id==='summoner-bonds-1'?r[10]:language==='en'?s.name:r[7+branch]+' '+s.depth+(focus?' · '+focus:'');
   out['skill.'+s.id+'.description']=existing['skill.soldier-command-1.description'];
 }
 return normalized(out);
}
