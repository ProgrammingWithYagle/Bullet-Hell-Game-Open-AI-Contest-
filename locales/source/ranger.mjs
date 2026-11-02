// Draft mechanical editions; native-language acceptance remains open.
const rows = {
  en: "Ranger|Bowcraft|Fieldcraft|Trailkeeping|Drawn Line|Tripline|Surveyor's Circuit|Crosswind|Linked Stakes|Long Survey|Quiver|Replenish|Honed Heads|Waxed String|Deep Quiver|Ready Arrows|Arrow Bundle|Tripline capacity|Tripline duration|Triplines · {count} / {capacity}|Survey charges · {count}|Survey Bow|Ashwood Bow|Crossing Bow|Watershed Bow",
  es: "Guardabosques|Arquería|Trabajo de campo|Cuidado del sendero|Línea tensada|Cable trampa|Circuito de agrimensura|Viento cruzado|Estacas enlazadas|Estudio largo|Carcaj|Reponer|Puntas afiladas|Cuerda encerada|Carcaj profundo|Flechas listas|Haz de flechas|Capacidad de cables|Duración de cables|Cables · {count} / {capacity}|Cargas de posición · {count}|Arco de agrimensura|Arco de fresno|Arco de cruce|Arco de divisoria",
  fr: "Rôdeuse|Archerie|Travail de terrain|Entretien des sentiers|Ligne tendue|Fil-piège|Circuit d'arpentage|Vent de travers|Piquets liés|Long relevé|Carquois|Regarnir|Pointes affûtées|Corde cirée|Carquois profond|Flèches prêtes|Fagot de flèches|Capacité de fils|Durée des fils|Fils · {count} / {capacity}|Charges de position · {count}|Arc d'arpentage|Arc de frêne|Arc de passage|Arc de partage",
  de: "Waldläuferin|Bogenkunst|Feldkunde|Wegepflege|Gezogene Linie|Stolperdraht|Vermessungskreis|Seitenwind|Verbundene Pflöcke|Lange Vermessung|Köcher|Nachfüllen|Geschärfte Spitzen|Gewachste Sehne|Tiefer Köcher|Bereite Pfeile|Pfeilbündel|Drahtkapazität|Drahtdauer|Drähte · {count} / {capacity}|Positionsladungen · {count}|Vermessungsbogen|Eschenbogen|Übergangsbogen|Wasserscheidenbogen",
  "pt-BR":
    "Patrulheira|Arquearia|Técnica de campo|Cuidado das trilhas|Linha tensionada|Fio de tropeço|Circuito de topografia|Vento cruzado|Estacas ligadas|Levantamento longo|Aljava|Reabastecer|Pontas afiadas|Corda encerada|Aljava funda|Flechas prontas|Feixe de flechas|Capacidade de fios|Duração dos fios|Fios · {count} / {capacity}|Cargas de posição · {count}|Arco de topografia|Arco de freixo|Arco de travessia|Arco de divisória",
  ru: "Следопыт|Стрельба из лука|Полевая подготовка|Забота о тропах|Натянутая линия|Растяжка|Круг землемера|Боковой ветер|Связанные колья|Долгий промер|Колчан|Пополнить|Острые наконечники|Вощёная тетива|Глубокий колчан|Готовые стрелы|Связка стрел|Предел растяжек|Время растяжек|Растяжки · {count} / {capacity}|Заряды позиций · {count}|Лук землемера|Ясеневый лук|Лук переправы|Лук водораздела",
  ja: "レンジャー|弓術|野外技術|道の手入れ|引き絞る一線|足止め索|測量士の巡回|横風|連結杭|長期測量|矢筒|補充|研いだ矢尻|蝋引きの弦|深い矢筒|準備した矢|予備の矢束|索の設置数|索の持続時間|索 · {count} / {capacity}|射撃点の残り回数 · {count}|測量の弓|トネリコの弓|渡しの弓|分水嶺の弓",
  "zh-Hans":
    "游侠|弓术|野外技艺|护径|引弦一线|绊索|测绘回路|侧风|连桩|长时勘测|箭袋|补箭|磨利箭头|蜡弦|深箭袋|备好箭支|备用箭束|绊索上限|绊索时长|绊索 · {count} / {capacity}|射位次数 · {count}|测绘弓|白蜡木弓|渡口弓|分水岭弓",
  "zh-Hant":
    "遊俠|弓術|野外技藝|護徑|引弦一線|絆索|測繪迴路|側風|連樁|長時勘測|箭袋|補箭|磨利箭頭|蠟弦|深箭袋|備好箭支|備用箭束|絆索上限|絆索時長|絆索 · {count} / {capacity}|射位次數 · {count}|測繪弓|白蠟木弓|渡口弓|分水嶺弓",
  ko: "레인저|궁술|야외 기술|길 돌봄|당긴 선|발걸림 줄|측량사의 순환|옆바람|연결 말뚝|긴 측량|화살통|보충|날카로운 화살촉|밀랍 활시위|깊은 화살통|준비한 화살|예비 화살 묶음|줄 설치 한도|줄 지속 시간|줄 · {count} / {capacity}|사격점 횟수 · {count}|측량 활|물푸레나무 활|건널목 활|분수령 활",
  id: "Penjelajah|Seni panah|Keterampilan lapangan|Perawatan jalur|Garis tarikan|Tali sandung|Sirkuit pengukur|Angin silang|Pasak terhubung|Survei panjang|Tabung panah|Isi ulang|Mata tajam|Tali berlilin|Tabung dalam|Panah siap|Bundel panah|Kapasitas tali|Durasi tali|Tali · {count} / {capacity}|Muatan posisi · {count}|Busur pengukur|Busur kayu ash|Busur penyeberangan|Busur batas air",
  hi: "वनरक्षक|धनुर्विद्या|मैदानी कौशल|पथ देखभाल|खींची रेखा|ठोकर डोर|सर्वेक्षक का घेरा|तिरछी हवा|जुड़े खूँटे|लंबा सर्वेक्षण|तरकश|फिर भरें|तेज नोकें|मोम लगी डोरी|गहरा तरकश|तैयार तीर|तीरों का बंडल|डोर सीमा|डोर अवधि|डोर · {count} / {capacity}|स्थान के शेष तीर · {count}|सर्वेक्षण धनुष|ऐश लकड़ी धनुष|पारगमन धनुष|जलविभाजक धनुष",
  bn: "বনরক্ষী|ধনুর্বিদ্যা|মাঠের কৌশল|পথের যত্ন|টানা রেখা|হোঁচট দড়ি|জরিপকারীর চক্র|আড়বায়ু|জোড়া খুঁটি|দীর্ঘ জরিপ|তূণ|ভরো|ধারালো ফলা|মোম মাখা ছিলা|গভীর তূণ|তৈরি তীর|তীরের গুচ্ছ|দড়ির সীমা|দড়ির সময়|দড়ি · {count} / {capacity}|অবস্থানের ব্যবহার · {count}|জরিপ ধনুক|অ্যাশ কাঠের ধনুক|পারাপার ধনুক|জলবিভাজক ধনুক",
  ar: "الجوالة|فن القوس|مهارة الميدان|رعاية الدروب|خط مشدود|سلك تعثر|دائرة المساحة|ريح جانبية|أوتاد مترابطة|مسح طويل|جعبة|تعبئة|نصال مسنونة|وتر مشمع|جعبة عميقة|سهام جاهزة|حزمة سهام|حد الأسلاك|مدة الأسلاك|أسلاك · {count} / {capacity}|شحنات المواقع · {count}|قوس المساحة|قوس الدردار|قوس العبور|قوس خط المياه",
  ur: "جنگل بان|تیر اندازی|میدانی ہنر|راستوں کی دیکھ بھال|کھنچی لکیر|ٹھوکر ڈوری|مساح کا دائرہ|ترچھی ہوا|جڑے کھونٹے|طویل سروے|ترکش|دوبارہ بھریں|تیز نوکیں|موم لگی کمان ڈوری|گہرا ترکش|تیار تیر|تیروں کا گٹھا|ڈوری کی حد|ڈوری کا دورانیہ|ڈوریاں · {count} / {capacity}|جگہ کے باقی تیر · {count}|سروے کمان|ایش لکڑی کی کمان|گزرگاہ کمان|آبی تقسیم کمان",
};
const contracts = {
  en: [
    "Spend 1 ready arrow. Hold the chosen aim for 0.4 seconds at 55% movement speed, then release a real 95-damage arrow with 2 pierce and 980 range. Cover stops it. Dodge cancels the release without refunding the arrow or cooldown.",
    "Place a legal finite cable: 0.8-second arming, 20-second active life, initially 2 cables. A real crossing deals 45 damage and slows ordinary enemies 40% for 3 seconds. Bosses receive damage without a root or attack cancellation. Full or blocked placement spends no cooldown.",
    "For 8 seconds, prepare up to 2 legal fixed firing positions with radius 34 and 3 charges each. Primary arrows committed inside gain 60% damage and 1 pierce. Only the nearest position spends a charge, including cancelled draws. Casting alone deals no damage or invulnerability.",
    "Primary arrows spend quiver charges, commit their aim for 0.2 seconds and release from the actual position. Move at 82% speed during the draw. Cover blocks them; dodge cancels without a refund. Replenish refills the quiver from its unlimited reserve.",
    "Nela Venn copied water-survey routes before recently entering Ranger training. A line on her map can still fail the person who must use it.",
    "Commit to bow aims, control crossings and use prepared firing positions.",
    "Drawn Line spends 3 ready arrows and releases a narrow fan of 3 real arrows, each at 50% damage. Keep the full committed draw; dodge cancels without refund.",
    "Each cable can catch 3 different enemies under one shared quota. It never damages the same target twice or roots a boss.",
    "Replace the 2 positions with 1 forward position lasting 14 seconds and granting 90% damage. Finite charges, radius and commitment rules still apply.",
    "Instantly refill the primary quiver. Does not reset abilities, triplines or Survey charges. Carry limit: {maximum}.",
  ],
  es: [
    "Gasta 1 flecha preparada. Fija la puntería 0,4 segundos con 55% de velocidad y suelta una flecha real de 95 de daño, 2 de perforación y 980 de alcance. La cobertura la detiene. Esquivar cancela sin devolver flecha ni recarga.",
    "Coloca un cable válido y finito: se arma en 0,8 segundos, dura 20 segundos activo y admite 2 al inicio. Un cruce real causa 45 de daño y ralentiza enemigos comunes 40% durante 3 segundos. Los jefes reciben daño sin inmovilización ni cancelar ataques. Una colocación llena o bloqueada no gasta recarga.",
    "Durante 8 segundos prepara hasta 2 posiciones fijas de radio 34 con 3 cargas cada una. Las flechas primarias iniciadas dentro ganan 60% de daño y 1 de perforación. Solo la posición más cercana gasta una carga, incluso al cancelar. Lanzar no causa daño ni invulnerabilidad.",
    "Las flechas primarias gastan el carcaj, fijan la puntería 0,2 segundos y salen desde la posición real. Muévete al 82% durante el tensado. La cobertura las bloquea; esquivar cancela sin devolución. Reponer rellena el carcaj desde una reserva ilimitada.",
    "Nela Venn copiaba rutas de estudios del agua antes de empezar su formación de Guardabosques. Una línea en su mapa aún puede fallarle a quien deba usarla.",
    "Fija la puntería del arco, controla los cruces y usa posiciones preparadas.",
    "Línea tensada gasta 3 flechas listas y suelta un abanico estrecho de 3 flechas reales al 50% de daño cada una. Conserva todo el tensado; esquivar cancela sin devolución.",
    "Cada cable atrapa a 3 enemigos distintos con una sola cuota compartida. Nunca daña dos veces al mismo objetivo ni inmoviliza a un jefe.",
    "Cambia las 2 posiciones por 1 adelantada que dura 14 segundos y concede 90% de daño. Se mantienen las cargas limitadas, el radio y el compromiso.",
    "Rellena al instante el carcaj primario. No reinicia habilidades, cables ni cargas de posición. Límite: {maximum}.",
  ],
  fr: [
    "Dépense 1 flèche prête. Fixe la visée pendant 0,4 seconde à 55 % de vitesse, puis libère une vraie flèche de 95 dégâts avec 2 de perforation et 980 de portée. Les obstacles l'arrêtent. L'esquive annule sans rendre la flèche ni le délai.",
    "Pose un fil fini sur un terrain valide : armement en 0,8 seconde, 20 secondes actives, 2 fils au départ. Un passage réel inflige 45 dégâts et ralentit les ennemis ordinaires de 40 % pendant 3 secondes. Les boss subissent des dégâts sans immobilisation ni annulation d'attaque. Une pose pleine ou bloquée ne consomme aucun délai.",
    "Prépare jusqu’à 2 positions fixes pendant 8 secondes, de rayon 34 avec 3 charges chacune. Les flèches principales engagées dedans gagnent 60 % de dégâts et 1 de perforation. Seule la position la plus proche dépense une charge, même en cas d'annulation. Aucun dégât ni invulnérabilité au lancement seul.",
    "Les flèches principales dépensent le carquois, fixent la visée pendant 0,2 seconde et partent de la position réelle. Déplacement à 82 % pendant l'armement. Les obstacles les arrêtent ; l'esquive annule sans remboursement. Regarnir remplit le carquois depuis une réserve illimitée.",
    "Nela Venn copiait des parcours de relevés d'eau avant de commencer sa formation de Rôdeuse. Une ligne sur sa carte peut encore trahir la personne qui doit l'emprunter.",
    "Engage la visée du tir, contrôle les passages et utilise des positions préparées.",
    "Ligne tendue dépense 3 flèches prêtes et libère un éventail étroit de 3 vraies flèches à 50 % de dégâts chacune. L'armement engagé reste entier ; l'esquive annule sans remboursement.",
    "Chaque fil peut toucher 3 ennemis différents avec un quota commun. Il ne blesse jamais deux fois la même cible et n'immobilise pas les boss.",
    "Remplace les 2 positions par 1 position avancée durant 14 secondes et accordant 90 % de dégâts. Les charges limitées, le rayon et l'engagement restent applicables.",
    "Remplit immédiatement le carquois principal. Ne réinitialise ni capacités, ni fils, ni charges de position. Limite : {maximum}.",
  ],
  de: [
    "Verbraucht 1 bereiten Pfeil. Fixiert das Ziel für 0,4 Sekunden bei 55 % Bewegung und löst einen echten Pfeil mit 95 Schaden, 2 Durchschlag und 980 Reichweite. Deckung stoppt ihn. Ausweichen bricht ohne Pfeil- oder Abklingzeiterstattung ab.",
    "Legt einen endlichen Draht auf gültigen Boden: 0,8 Sekunden Scharfstellung, 20 aktive Sekunden, anfangs 2 Drähte. Ein echtes Kreuzen verursacht 45 Schaden und verlangsamt gewöhnliche Gegner 3 Sekunden um 40 %. Bosse erhalten Schaden ohne Wurzel oder Angriffsabbruch. Volle oder blockierte Platzierung verbraucht keine Abklingzeit.",
    "Bereitet für 8 Sekunden bis zu 2 gültige feste Schusspositionen mit Radius 34 und je 3 Ladungen vor. Darin begonnene Primärpfeile erhalten 60 % Schaden und 1 Durchschlag. Nur die nächste Position verbraucht eine Ladung, auch bei Abbruch. Das Wirken allein verursacht keinen Schaden oder Unverwundbarkeit.",
    "Primärpfeile verbrauchen den Köcher, fixieren das Ziel 0,2 Sekunden und starten an der tatsächlichen Position. Währenddessen 82 % Bewegung. Deckung blockiert; Ausweichen bricht ohne Erstattung ab. Nachfüllen füllt den Köcher aus unbegrenzter Reserve.",
    "Nela Venn zeichnete Wasservermessungswege ab, bevor sie kürzlich ihre Waldläuferausbildung begann. Eine Linie auf ihrer Karte kann der Person versagen, die sie benutzen muss.",
    "Lege Bogenziele fest, kontrolliere Übergänge und nutze vorbereitete Schusspositionen.",
    "Gezogene Linie verbraucht 3 bereite Pfeile und löst 3 echte Pfeile in einem engen Fächer mit je 50 % Schaden. Der volle Spannvorgang bleibt nötig; Ausweichen bricht ohne Erstattung ab.",
    "Jeder Draht kann unter einem gemeinsamen Kontingent 3 verschiedene Gegner treffen. Er verletzt nie dieselbe Figur zweimal und verwurzelt keinen Boss.",
    "Ersetzt die 2 Positionen durch 1 vordere Position für 14 Sekunden mit 90 % Schaden. Begrenzte Ladungen, Radius und Bindung bleiben bestehen.",
    "Füllt den Primärköcher sofort. Setzt weder Fähigkeiten noch Drähte oder Positionsladungen zurück. Tragelimit: {maximum}.",
  ],
  "pt-BR": [
    "Gasta 1 flecha pronta. Fixa a mira por 0,4 segundo com 55% da velocidade e solta uma flecha real de 95 de dano, 2 de perfuração e 980 de alcance. Cobertura bloqueia. Esquivar cancela sem devolver flecha ou recarga.",
    "Coloca um fio finito em terreno válido: arma em 0,8 segundo, dura 20 segundos ativos e começa com limite de 2. Um cruzamento real causa 45 de dano e reduz a velocidade de inimigos comuns em 40% por 3 segundos. Chefes recebem dano sem imobilização nem cancelamento de ataque. Colocação cheia ou bloqueada não gasta recarga.",
    "Prepara até 2 posições fixas por 8 segundos, com raio 34 e 3 cargas cada. Flechas primárias iniciadas dentro ganham 60% de dano e 1 de perfuração. Só a posição mais próxima gasta uma carga, mesmo ao cancelar. Apenas lançar não causa dano nem invulnerabilidade.",
    "Flechas primárias gastam a aljava, fixam a mira por 0,2 segundo e saem da posição real. Movimento a 82% durante a puxada. Cobertura bloqueia; esquivar cancela sem reembolso. Reabastecer enche a aljava com reserva ilimitada.",
    "Nela Venn copiava rotas de levantamentos de água antes de começar a formação de Patrulheira. Uma linha em seu mapa ainda pode falhar com quem precisa usá-la.",
    "Comprometa a mira do arco, controle travessias e use posições preparadas.",
    "Linha tensionada gasta 3 flechas prontas e solta um leque estreito de 3 flechas reais com 50% do dano cada. Mantém toda a puxada; esquivar cancela sem reembolso.",
    "Cada fio pode atingir 3 inimigos diferentes sob uma cota compartilhada. Nunca atinge duas vezes o mesmo alvo nem imobiliza chefes.",
    "Troca as 2 posições por 1 posição à frente que dura 14 segundos e concede 90% de dano. Permanecem cargas limitadas, raio e compromisso.",
    "Enche imediatamente a aljava primária. Não reinicia habilidades, fios ou cargas de posição. Limite: {maximum}.",
  ],
  ru: [
    "Тратит 1 готовую стрелу. Фиксирует прицел на 0,4 секунды при 55% скорости, затем выпускает настоящую стрелу с 95 урона, 2 пробивания и дальностью 980. Укрытие останавливает её. Уклонение отменяет выстрел без возврата стрелы и перезарядки.",
    "Ставит конечную растяжку на допустимой земле: взводится за 0,8 секунды, действует 20 секунд, начальный предел — 2. Реальное пересечение наносит 45 урона и замедляет обычных врагов на 40% на 3 секунды. Боссы получают урон без обездвиживания и отмены атак. Заполненная или перекрытая установка не тратит перезарядку.",
    "На 8 секунд готовит до 2 неподвижных огневые позиции радиусом 34 и с 3 зарядами каждая. Основные стрелы, начатые внутри, получают 60% урона и 1 пробивание. Заряд тратит лишь ближайшая позиция, включая отменённые выстрелы. Само применение не наносит урона и не даёт неуязвимости.",
    "Основные стрелы тратят колчан, фиксируют прицел на 0,2 секунды и вылетают из реальной позиции. При натяжении движение 82%. Укрытия блокируют, уклонение отменяет без возврата. Пополнение наполняет колчан из бесконечного резерва.",
    "Нела Венн копировала маршруты водных съёмок, прежде чем недавно начать обучение Следопыта. Линия на её карте ещё может подвести того, кому придётся по ней идти.",
    "Фиксируйте прицел лука, контролируйте переходы и используйте подготовленные позиции.",
    "Натянутая линия тратит 3 готовые стрелы и выпускает узкий веер из 3 настоящих стрел с 50% урона каждая. Полное натяжение сохраняется; уклонение отменяет без возврата.",
    "Одна растяжка ловит 3 разных врагов по общей квоте. Она не ранит одну цель дважды и не обездвиживает босса.",
    "Заменяет 2 позиции на 1 переднюю, действующую 14 секунд и дающую 90% урона. Ограниченные заряды, радиус и обязательство сохраняются.",
    "Мгновенно наполняет основной колчан. Не сбрасывает способности, растяжки и заряды позиций. Предел: {maximum}.",
  ],
  ja: [
    "準備済みの矢を1本使う。照準を0.4秒固定し、移動速度55%で構えてから、威力95・貫通2・射程980の実体矢を放つ。遮蔽物で止まる。回避すると発射を中止するが、矢とクールダウンは戻らない。",
    "配置可能な地面に有限の索を張る。作動準備0.8秒、作動後20秒、初期上限2本。敵が実際に横切ると45ダメージを与え、通常敵を3秒間40%減速する。ボスにはダメージだけを与え、拘束や攻撃中断はしない。満員や配置不可ではクールダウンを使わない。",
    "8秒間、半径34・各3回の配置可能な固定射撃点を最大2か所用意する。内側で構え始めた通常矢は威力60%増加と貫通1を得る。最寄りの射撃点だけが回数を使い、中止しても戻らない。発動だけではダメージや無敵を得ない。",
    "通常矢は矢筒を消費し、照準を0.2秒固定して実際の位置から放つ。構え中の移動は82%。遮蔽物で止まり、回避による中止では返却されない。補充で無限の予備から矢筒を満たす。",
    "ネラ・ヴェンは水路測量の経路を書き写した後、最近レンジャーの訓練を始めた。地図の線が、そこを通る人の役に立つとは限らない。",
    "弓の照準を定め、通路を制し、準備した射撃点を使う。",
    "引き絞る一線で準備済みの矢3本を使い、それぞれ威力50%の実体矢3本を狭い扇状に放つ。構え時間は変わらず、回避による中止で矢は戻らない。",
    "索1本が共通の回数制限で異なる敵3体に当たる。同じ敵を2回攻撃せず、ボスを拘束しない。",
    "射撃点2か所を前方1か所に置き換える。14秒持続し、威力90%増加。有限の回数・半径・構え開始時の消費はそのまま。",
    "通常攻撃の矢筒を即座に満たす。能力、索、射撃点の回数はリセットしない。所持上限：{maximum}。",
  ],
  "zh-Hans": [
    "消耗1支备好的箭。锁定瞄准0.4秒，其间移速为55%，随后射出伤害95、穿透2、射程980的实体箭。掩体会阻挡。闪避会取消发射，但不退还箭或冷却。",
    "在合法地面设置有限绊索：0.8秒布防，生效后持续20秒，初始最多2条。敌人实际穿越时受到45伤害，普通敌人减速40%，持续3秒。首领只受伤害，不被定身或中断攻击。容量已满或位置受阻不消耗冷却。",
    "在合法位置准备最多2个固定射位，持续8秒，半径34，各有3次使用。站在其中开始拉弓的普通箭获得60%额外伤害和1穿透。仅最近的射位消耗次数，取消拉弓也不退还。单纯施放不会造成伤害或提供无敌。",
    "普通箭消耗箭袋次数，锁定瞄准0.2秒后从实际位置射出。拉弓时移速为82%。掩体阻挡箭，闪避取消且不退还。补箭会从无限备用箭中填满箭袋。",
    "内拉·文曾抄录水务勘测路线，最近才开始游侠训练。她图上的一条线仍可能让真正走那条路的人陷入困境。",
    "锁定弓箭瞄准，控制通路，利用预先布置的射位。",
    "引弦一线消耗3支备好的箭，射出3支窄扇形实体箭，每支伤害为50%。完整拉弓时间不变；闪避取消不会退还箭。",
    "每条绊索在共同次数限制内命中3个不同敌人。不重复伤害同一目标，也不定身首领。",
    "将2个射位换为前方1个，持续14秒，额外伤害90%。次数、半径和开始拉弓时消耗的规则仍然有限。",
    "立即补满普通箭袋。不重置能力、绊索或射位次数。携带上限：{maximum}。",
  ],
  "zh-Hant": [
    "消耗1支備好的箭。鎖定瞄準0.4秒，其間移速為55%，隨後射出傷害95、穿透2、射程980的實體箭。掩體會阻擋。閃避會取消發射，但不退還箭或冷卻。",
    "在合法地面設置有限絆索：0.8秒布防，生效後持續20秒，初始最多2條。敵人實際穿越時受到45傷害，普通敵人減速40%，持續3秒。首領只受傷害，不被定身或中斷攻擊。容量已滿或位置受阻不消耗冷卻。",
    "在合法位置準備最多2個固定射位，持續8秒，半徑34，各有3次使用。站在其中開始拉弓的普通箭獲得60%額外傷害和1穿透。僅最近的射位消耗次數，取消拉弓也不退還。單純施放不會造成傷害或提供無敵。",
    "普通箭消耗箭袋次數，鎖定瞄準0.2秒後從實際位置射出。拉弓時移速為82%。掩體阻擋箭，閃避取消且不退還。補箭會從無限備用箭中填滿箭袋。",
    "內拉·文曾抄錄水務勘測路線，最近才開始遊俠訓練。她圖上的一條線仍可能讓真正走那條路的人陷入困境。",
    "鎖定弓箭瞄準，控制通路，利用預先佈置的射位。",
    "引弦一線消耗3支備好的箭，射出3支窄扇形實體箭，每支傷害為50%。完整拉弓時間不變；閃避取消不會退還箭。",
    "每條絆索在共同次數限制內命中3個不同敵人。不重複傷害同一目標，也不定身首領。",
    "將2個射位換為前方1個，持續14秒，額外傷害90%。次數、半徑和開始拉弓時消耗的規則仍然有限。",
    "立即補滿普通箭袋。不重置能力、絆索或射位次數。攜帶上限：{maximum}。",
  ],
  ko: [
    "준비한 화살 1개를 쓴다. 조준을 0.4초 고정하고 이동 속도 55%로 당긴 뒤 피해 95, 관통 2, 사거리 980의 실제 화살을 놓는다. 엄폐물이 막는다. 회피로 취소해도 화살과 재사용 시간은 돌아오지 않는다.",
    "유효한 땅에 유한한 줄을 놓는다. 준비 0.8초, 작동 후 20초, 기본 한도 2개다. 실제로 가로지른 적에게 피해 45를 주고 일반 적을 3초간 40% 느리게 한다. 보스는 피해만 받고 속박되거나 공격이 취소되지 않는다. 가득 찼거나 막힌 배치는 재사용 시간을 쓰지 않는다.",
    "8초간 반경 34의 유효한 고정 사격점을 최대 2개 준비하며 각 3회 쓸 수 있다. 안에서 당기기 시작한 기본 화살은 피해 60%와 관통 1을 더 얻는다. 가장 가까운 점만 횟수를 쓰며 취소해도 돌려주지 않는다. 시전 자체는 피해나 무적을 주지 않는다.",
    "기본 화살은 화살통 횟수를 쓰고 조준을 0.2초 고정한 뒤 실제 위치에서 나간다. 당기는 동안 이동은 82%다. 엄폐물이 막고 회피는 환급 없이 취소한다. 보충은 무한 예비 화살로 화살통을 채운다.",
    "넬라 벤은 수로 조사 경로를 베껴 그리다가 최근 레인저 훈련을 시작했다. 지도 위 선이 실제로 그 길을 써야 하는 사람에게는 맞지 않을 수 있다.",
    "활 조준을 확정하고 건널목을 통제하며 준비한 사격점을 활용한다.",
    "당긴 선이 준비 화살 3개를 쓰고 각각 피해 50%인 실제 화살 3개를 좁은 부채꼴로 놓는다. 당기기 시간은 그대로이며 회피 취소는 환급하지 않는다.",
    "줄 하나가 공통 횟수 안에서 서로 다른 적 3명을 맞힌다. 같은 대상을 두 번 해치거나 보스를 속박하지 않는다.",
    "사격점 2개를 전방 1개로 바꾼다. 14초 지속하고 피해를 90% 더 준다. 유한한 횟수, 반경, 당기기 시작 시 소모 규칙은 그대로다.",
    "기본 화살통을 즉시 채운다. 능력, 줄, 사격점 횟수는 초기화하지 않는다. 소지 한도: {maximum}.",
  ],
  id: [
    "Pakai 1 panah siap. Kunci bidikan 0,4 detik pada 55% kecepatan gerak, lalu lepaskan panah nyata dengan 95 kerusakan, 2 tembus dan jangkauan 980. Penghalang menghentikannya. Mengelak membatalkan tanpa mengembalikan panah atau jeda.",
    "Pasang tali terbatas di tanah yang sah: persiapan 0,8 detik, aktif 20 detik, batas awal 2. Perlintasan nyata memberi 45 kerusakan dan memperlambat musuh biasa 40% selama 3 detik. Bos hanya menerima kerusakan tanpa ikatan atau pembatalan serangan. Penempatan penuh atau terhalang tidak memakai jeda.",
    "Siapkan hingga 2 posisi tembak tetap yang sah selama 8 detik, radius 34 dengan 3 muatan masing-masing. Panah utama yang mulai ditarik di dalam mendapat 60% kerusakan dan 1 tembus. Hanya posisi terdekat memakai muatan, termasuk tarikan yang dibatalkan. Pemakaian saja tidak memberi kerusakan atau kekebalan.",
    "Panah utama memakai isi tabung, mengunci bidikan 0,2 detik lalu keluar dari posisi nyata. Gerak saat menarik 82%. Penghalang memblokir; mengelak membatalkan tanpa pengembalian. Isi ulang memenuhi tabung dari cadangan tanpa batas.",
    "Nela Venn menyalin rute survei air sebelum baru-baru ini mulai berlatih sebagai Penjelajah. Garis pada petanya masih bisa mengecewakan orang yang harus memakainya.",
    "Tetapkan bidikan busur, kendalikan penyeberangan dan gunakan posisi tembak yang disiapkan.",
    "Garis tarikan memakai 3 panah siap dan melepaskan kipas sempit 3 panah nyata, masing-masing 50% kerusakan. Waktu tarik tetap penuh; mengelak membatalkan tanpa pengembalian.",
    "Setiap tali menangkap 3 musuh berbeda dalam satu kuota bersama. Tidak merusak sasaran yang sama dua kali atau mengikat bos.",
    "Ganti 2 posisi dengan 1 posisi depan selama 14 detik yang memberi 90% kerusakan. Muatan terbatas, radius dan aturan saat mulai menarik tetap berlaku.",
    "Langsung isi tabung panah utama. Tidak mengatur ulang kemampuan, tali atau muatan posisi. Batas bawaan: {maximum}.",
  ],
  hi: [
    "1 तैयार तीर खर्च करें। 0.4 सेकंड निशाना स्थिर रखकर 55% चाल से खींचें, फिर 95 नुकसान, 2 भेदन और 980 दूरी वाला असली तीर छोड़ें। आड़ रोकती है। चकमा तीर छोड़े बिना रोकता है; तीर या कूलडाउन वापस नहीं मिलता।",
    "वैध जमीन पर सीमित डोर लगाएँ: 0.8 सेकंड में तैयार, 20 सक्रिय सेकंड, शुरू में अधिकतम 2। सचमुच पार करने पर 45 नुकसान और साधारण शत्रु को 3 सेकंड के लिए 40% धीमा करती है। बॉस को नुकसान मिलता है, जकड़न या हमला रद्द नहीं होता। जगह भरी या बंद हो तो कूलडाउन नहीं लगता।",
    "8 सेकंड के लिए वैध जगहों पर अधिकतम 2 स्थिर निशाने के स्थान बनाएँ; त्रिज्या 34, प्रत्येक में 3 उपयोग। भीतर से खींचना शुरू किए मुख्य तीर को 60% नुकसान और 1 भेदन बढ़ता है। केवल सबसे निकट स्थान का एक उपयोग खर्च होता है, रद्द करने पर भी। सिर्फ क्षमता चलाने से नुकसान या अजेयता नहीं मिलती।",
    "मुख्य तीर तरकश से खर्च होते हैं, 0.2 सेकंड निशाना स्थिर रखकर असली स्थिति से निकलते हैं। खींचते समय चाल 82% है। आड़ रोकती है; चकमा बिना वापसी के रद्द करता है। फिर भरें असीमित भंडार से तरकश भरता है।",
    "नेला वेन जल सर्वेक्षण के रास्ते नकल करती थीं और हाल ही में वनरक्षक प्रशिक्षण शुरू किया। नक्शे की रेखा उस व्यक्ति के काम न भी आ सकती है जिसे वहाँ चलना पड़े।",
    "धनुष का निशाना तय करें, पारगमन रोकें और तैयार निशाने के स्थान इस्तेमाल करें।",
    "खींची रेखा 3 तैयार तीर खर्च कर संकरे पंखे में 3 असली तीर छोड़ती है, हर तीर का नुकसान 50%। पूरा खींचने का समय रहता है; चकमा बिना वापसी रद्द करता है।",
    "हर डोर एक साझा सीमा में 3 अलग शत्रुओं को लग सकती है। एक लक्ष्य को दो बार चोट नहीं देती और बॉस को नहीं जकड़ती।",
    "2 स्थान की जगह आगे 1 स्थान बनाएँ जो 14 सेकंड रहता है और 90% नुकसान बढ़ाता है। सीमित उपयोग, त्रिज्या और खींचना शुरू करते समय खर्च का नियम बना रहता है।",
    "मुख्य तरकश तुरंत भरें। क्षमताएँ, डोर या स्थान के उपयोग रीसेट नहीं होते। उठाने की सीमा: {maximum}।",
  ],
  bn: [
    "1টি তৈরি তীর খরচ করো। 0.4 সেকেন্ড লক্ষ্য স্থির রেখে 55% গতিতে টানো, তারপর 95 ক্ষতি, 2 ভেদ ও 980 পাল্লার বাস্তব তীর ছাড়ো। আড়াল বাধা দেয়। ডজ করলে তীর ছাড়া বন্ধ হয়, তীর বা কুলডাউন ফেরত আসে না।",
    "বৈধ মাটিতে সীমিত দড়ি বসাও: প্রস্তুতি 0.8 সেকেন্ড, সক্রিয় সময় 20 সেকেন্ড, শুরুতে সর্বোচ্চ 2টি। সত্যি পার হলে 45 ক্ষতি দেয় এবং সাধারণ শত্রুকে 3 সেকেন্ড 40% ধীর করে। বস ক্ষতি পায় কিন্তু বাঁধা পড়ে না বা আক্রমণ বাতিল হয় না। পূর্ণ বা বাধাগ্রস্ত বসানো কুলডাউন খরচ করে না।",
    "8 সেকেন্ডের জন্য বৈধ জায়গায় সর্বোচ্চ 2টি স্থির তীর ছাড়ার স্থান তৈরি করো; ব্যাসার্ধ 34, প্রতিটিতে 3টি ব্যবহার। ভিতরে টান শুরু করা মূল তীরে 60% ক্ষতি ও 1 ভেদ বাড়ে। কেবল সবচেয়ে কাছের স্থান একবার খরচ করে, বাতিল হলেও। শুধু ব্যবহার করলে ক্ষতি বা অভেদ্যতা আসে না।",
    "মূল তীর তূণ খরচ করে, 0.2 সেকেন্ড লক্ষ্য স্থির রেখে প্রকৃত অবস্থান থেকে বের হয়। টানার সময় গতি 82%। আড়াল আটকায়; ডজ ফেরত ছাড়াই বাতিল করে। ভরো অসীম মজুত থেকে তূণ পূর্ণ করে।",
    "নেলা ভেন জল জরিপের পথ নকল করতেন, সম্প্রতি বনরক্ষীর প্রশিক্ষণ শুরু করেছেন। তাঁর মানচিত্রের রেখা যাকে সেই পথ নিতে হয় তার কাজে নাও লাগতে পারে।",
    "ধনুকের লক্ষ্য স্থির করো, পারাপার নিয়ন্ত্রণ করো এবং তৈরি তীর ছাড়ার স্থান ব্যবহার করো।",
    "টানা রেখা 3টি তৈরি তীর খরচ করে সরু পাখায় 3টি বাস্তব তীর ছাড়ে, প্রতিটির ক্ষতি 50%। পুরো টানার সময় থাকে; ডজ ফেরত ছাড়াই বাতিল করে।",
    "প্রতি দড়ি একটি যৌথ সীমায় 3জন আলাদা শত্রুকে ধরতে পারে। একই লক্ষ্যকে দুবার আঘাত করে না বা বসকে বাঁধে না।",
    "2টি স্থানের বদলে সামনে 1টি স্থান দাও, যা 14 সেকেন্ড থাকে এবং 90% ক্ষতি বাড়ায়। সীমিত ব্যবহার, ব্যাসার্ধ ও টান শুরুতে খরচের নিয়ম থাকে।",
    "মূল তূণ সঙ্গে সঙ্গে ভরো। ক্ষমতা, দড়ি বা স্থানের ব্যবহার পুনরায় শুরু হয় না। বহনের সর্বোচ্চ: {maximum}।",
  ],
  ar: [
    "يستهلك سهما جاهزا واحدا. يثبت التصويب 0.4 ثانية بسرعة حركة 55% ثم يطلق سهما فعليا بضرر 95 واختراق 2 ومدى 980. توقفه الحواجز. يلغي التفادي الإطلاق دون رد السهم أو وقت الانتظار.",
    "ضع سلكا محدودا على أرض صالحة: يتسلح خلال 0.8 ثانية ويعمل 20 ثانية، والحد الأولي سلكان. العبور الفعلي يسبب ضررا 45 ويبطئ الأعداء العاديين 40% لمدة 3 ثوان. يتضرر الزعماء دون تثبيت أو إلغاء هجوم. الامتلاء أو الموضع المحجوب لا يستهلك وقت الانتظار.",
    "جهز حتى موقعين ثابتين للرماية لمدة 8 ثوان بنصف قطر 34 و3 شحنات لكل موقع. السهام الأساسية التي يبدأ شدها داخلهما تكسب ضررا 60% واختراقا واحدا. ينفق أقرب موقع فقط شحنة، حتى عند الإلغاء. الاستخدام وحده لا يسبب ضررا أو حصانة.",
    "تستهلك السهام الأساسية الجعبة وتثبت التصويب 0.2 ثانية ثم تخرج من الموضع الفعلي. الحركة أثناء الشد 82%. تحجبها الحواجز ويلغيها التفادي دون رد. تعيد التعبئة ملء الجعبة من احتياطي غير محدود.",
    "كانت نيلا فين تنسخ مسارات مسح المياه قبل أن تبدأ حديثا تدريب الجوالة. قد يخذل خط على خريطتها الشخص الذي يضطر إلى استخدامه.",
    "التزم بتصويب القوس واضبط المعابر واستخدم مواقع رماية مجهزة.",
    "يستهلك الخط المشدود 3 سهام جاهزة ويطلق مروحة ضيقة من 3 سهام فعلية بضرر 50% لكل منها. تبقى مدة الشد كاملة ويلغي التفادي دون رد.",
    "يمكن لكل سلك إصابة 3 أعداء مختلفين ضمن حصة مشتركة واحدة. لا يضر الهدف نفسه مرتين ولا يثبت زعيما.",
    "استبدل الموقعين بموقع أمامي واحد يدوم 14 ثانية ويمنح ضررا 90%. تبقى الشحنات المحدودة ونصف القطر والإنفاق عند بدء الشد.",
    "يملأ الجعبة الأساسية فورا. لا يعيد ضبط القدرات أو الأسلاك أو شحنات المواقع. أقصى حمل: {maximum}.",
  ],
  ur: [
    "1 تیار تیر خرچ کریں۔ 0.4 سیکنڈ نشانہ قائم رکھ کر 55% رفتار سے کھینچیں، پھر 95 نقصان، 2 چھید اور 980 فاصلے والا حقیقی تیر چھوڑیں۔ آڑ اسے روکتی ہے۔ ڈاج چھوڑنا منسوخ کرتا ہے، تیر یا کول ڈاؤن واپس نہیں ملتا۔",
    "درست زمین پر محدود ڈوری لگائیں: 0.8 سیکنڈ تیاری، 20 فعال سیکنڈ، شروع میں حد 2۔ حقیقی عبور پر 45 نقصان اور عام دشمن 3 سیکنڈ کے لیے 40% سست ہوتا ہے۔ باس کو نقصان پہنچتا ہے مگر جکڑتا یا حملہ منسوخ نہیں کرتا۔ بھری یا رکی جگہ کول ڈاؤن نہیں خرچ کرتی۔",
    "8 سیکنڈ کے لیے درست جگہ پر تیر چلانے کی زیادہ سے زیادہ 2 مقررہ جگہیں تیار کریں؛ رداس 34 اور ہر جگہ 3 استعمال۔ اندر سے کھینچنا شروع کیے بنیادی تیر کو 60% نقصان اور 1 چھید ملتا ہے۔ صرف قریب ترین جگہ ایک استعمال خرچ کرتی ہے، منسوخی پر بھی۔ صرف صلاحیت چلانے سے نقصان یا ناقابل تسخیر ہونا نہیں ملتا۔",
    "بنیادی تیر ترکش خرچ کرتے ہیں، نشانہ 0.2 سیکنڈ قائم رکھ کر حقیقی مقام سے نکلتے ہیں۔ کھینچتے وقت حرکت 82% ہے۔ آڑ روکتی ہے، ڈاج بغیر واپسی منسوخ کرتا ہے۔ دوبارہ بھرنا لامحدود ذخیرے سے ترکش بھرتا ہے۔",
    "نیلا وین پانی کے سروے کے راستے نقل کرتی تھیں اور حال ہی میں جنگل بان کی تربیت شروع کی ہے۔ ان کے نقشے کی لکیر اس شخص کو ناکام کر سکتی ہے جسے وہ راستہ استعمال کرنا ہو۔",
    "کمان کا نشانہ طے کریں، گزرگاہیں قابو کریں اور تیار تیر چلانے کی جگہیں استعمال کریں۔",
    "کھنچی لکیر 3 تیار تیر خرچ کر کے تنگ پنکھے میں 3 حقیقی تیر چھوڑتی ہے، ہر ایک 50% نقصان کے ساتھ۔ کھینچنے کا پورا وقت رہتا ہے؛ ڈاج بغیر واپسی منسوخ کرتا ہے۔",
    "ہر ڈوری ایک مشترک حد میں 3 مختلف دشمنوں کو لگ سکتی ہے۔ ایک ہدف کو دو بار نقصان نہیں دیتی اور باس کو نہیں جکڑتی۔",
    "2 جگہوں کی بجائے سامنے 1 جگہ دیں جو 14 سیکنڈ رہتی ہے اور 90% نقصان دیتی ہے۔ محدود استعمال، رداس اور کھینچنا شروع کرتے وقت خرچ کا اصول قائم رہتا ہے۔",
    "بنیادی ترکش فوراً بھرتا ہے۔ صلاحیتوں، ڈوریوں یا جگہ کے استعمال کو ری سیٹ نہیں کرتا۔ اٹھانے کی حد: {maximum}۔",
  ],
};
const normalize = (out) =>
  Object.fromEntries(
    Object.entries(out).map(([k, v]) => {
      if (typeof v !== "string") throw Error("Missing Ranger string " + k);
      return [k, v.normalize("NFC")];
    }),
  );
export function rangerTalentMessages(language) {
  const r = rows[language]?.split("|"),
    a = contracts[language];
  if (r?.length !== 25 || a?.length !== 10)
    throw Error("Missing Ranger edition " + language);
  return normalize(
    Object.fromEntries(
      ["crosswind", "linked-stakes", "long-survey"].flatMap((id, i) => [
        ["talent." + id + ".name", r[7 + i]],
        ["talent." + id + ".description", a[6 + i]],
      ]),
    ),
  );
}
export function rangerMessages(language, c, existing) {
  const r = rows[language]?.split("|"),
    a = contracts[language];
  if (r?.length !== 25 || a?.length !== 10)
    throw Error("Missing Ranger edition " + language);
  const out = {
    "class.ranger.name": r[0],
    "class.ranger.role": a[5],
    "class.ranger.lore": a[4],
    "branch.bowcraft": r[1],
    "branch.fieldcraft": r[2],
    "branch.trailkeeping": r[3],
    "ui.rangerQuiver": r[10],
    "ui.rangerReplenish": r[11],
    "ui.rangerTraps": r[19],
    "ui.rangerSurvey": r[20],
    "stat.rangerTrapCapacity": r[17],
    "stat.rangerTrapDuration": r[18],
    "supply.ranger-arrow-bundle.name": r[16],
    "supply.ranger-arrow-bundle.description": a[9],
    ...rangerTalentMessages(language),
  };
  for (const [i, id] of ["ranger-q", "ranger-e", "ranger-ultimate"].entries()) {
    out["ability." + id + ".name"] = r[4 + i];
    out["ability." + id + ".description"] = a[i];
  }
  for (const [i, id] of ["damage", "fire-rate", "magazine", "reload"].entries())
    out["upgrade.ranger-" + id + ".name"] = r[12 + i];
  for (const [i, w] of c.weapons
    .filter((w) => w.classId === "ranger")
    .entries()) {
    out["weapon." + w.id + ".name"] = r[21 + i];
    out["weapon." + w.id + ".description"] = a[3];
  }
  const cl = c.classes.find((cl) => cl.id === "ranger");
  for (const s of c.skills.filter((s) => s.classId === "ranger")) {
    const branch = cl.branches.findIndex((b) => b.id === s.branchId),
      focus = s.lane
        ? (out[s.subbranchNameKey] ?? existing[s.subbranchNameKey])
        : "";
    out["skill." + s.id + ".name"] = s.transform
      ? out["talent." + s.transform + ".name"]
      : language === "en"
        ? s.name
        : r[1 + branch] + " " + s.depth + (focus ? " · " + focus : "");
    out["skill." + s.id + ".description"] =
      existing["skill.soldier-command-1.description"];
  }
  return normalize(out);
}
