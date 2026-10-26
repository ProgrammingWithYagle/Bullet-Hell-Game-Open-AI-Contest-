import {classTalents} from '../../content/source/class-talents.mjs';
const rows={
en:`Breach Cadence|E fires three locked-aim shots 0.12 s apart; total damage stays the same.
Supply Line|Ultimate refills ammo again halfway through its field; its base damage bonus falls from 35% to 25%.
Marching Colors|Q follows you, with 25% less radius.
Shoulder Mantlet|E adds a moving 80-base-health front wall; base brace reduction falls from 45% to 25%.
Furnace Vents|Ultimate vents eight short-range shots every two seconds after the first second; base fire-rate bonus falls from 70% to 40%.
Split Suppression|Q divides the same fourteen pellets into two narrow cones with a gap in front.
Wake Guard|Charge leaves an 80-base-health wall for two seconds at departure.
Procession|Ultimate follows you and shields each entrant once for 90 base health instead of 120.
Cornerstone|Q splits its wall into two angled panels, each with half the original health and length.
Serum Relay|E chains heals and cleansing to three distinct allies, within 140 per hop, instead of every nearby ally.
Second Breath|Ultimate trades 40 instant base healing for 24 plus three healing pulses of 6. Difficulty revival rules still apply.
Field Triage|Q follows the most injured nearby ally, with 25% less radius.
Ward Echo|E splits its 65 base damage into 40 now and 25 at the same ground point after 0.75 s.
Orbit Requiem|Ultimate replaces its large fixed pulse with three smaller orbiting centers, each dealing one third of the pulse damage.
Twin Sigils|Q makes two separated smaller sigils, each dealing half damage.
Return Current|Barricade stores up to 120 absorbed damage; destruction or expiry releases 60% of it nearby.
Foundry Relay|Siege follows at 160 pixels per second; base health falls from 200 to 160.
Crossfire Pair|Q makes two turrets with half health and damage each; the second prefers a farther target.
Aftercut|Step deals 60% damage now and 40% along its locked path after 0.45 s.
Unwritten Traps|Ultimate lasts 3.5 s with one fewer free step; empowered departures leave three damaging pulses.
Decoy Veil|Q leaves a 60-health projectile-damageable decoy that attracts aim; base veil duration falls from 6 s to 4 s.`,
'zh-Hans':`破阵节拍|E以0.12秒间隔按固定方向发射三枪，总伤害不变。
补给线|终极技能的区域在中途再次补弹；基础伤害加成从35%降至25%。
行军旗帜|Q跟随你移动，半径缩小25%。
肩部盾墙|E增加随身正面盾墙，基础生命80；架枪减伤从45%降至25%。
炉火排气|终极技能开始一秒后，每两秒发射八枚短程弹；基础射速加成从70%降至40%。
分列压制|Q将原有十四枚弹丸分成两道窄扇面，正前方留出空隙。
冲锋后卫|冲锋在起点留下基础生命80的盾墙，持续两秒。
护卫巡行|终极光环跟随你，每位进入者仅获得一次护盾；基础值从120降至90。
转角堡垒|Q将盾墙分为两块斜板，各有原来一半的生命与长度。
血清接力|E以每跳140距离串联治疗并净化三名不同队友，取代周围全员效果。
第二次呼吸|终极技能将基础瞬间治疗40改为24，再提供三次各6的治疗脉冲。复活仍受难度限制。
随行急救|Q跟随附近伤势最重的队友，半径缩小25%。
结界回响|E将基础伤害65拆为立即40，以及0.75秒后原地25。
环轨安魂|终极技能将固定大范围脉冲改为三个绕身的小中心，各造成三分之一脉冲伤害。
双生符印|Q生成两个分开的较小符印，各造成一半伤害。
回流电路|路障最多储存120点承伤，摧毁或到期时对附近释放其中60%。
随行工坊|攻城机以每秒160像素跟随；基础生命从200降至160。
交叉炮组|Q生成两座各有一半生命和伤害的炮塔，第二座优先攻击较远目标。
迟来斩痕|踏步立即造成60%伤害，0.45秒后沿锁定路径补上40%。
未写陷阱|终极技能持续3.5秒，免费踏步减少一次；强化踏步的起点留下三次伤害脉冲。
替身薄幕|Q留下生命60、可被弹丸摧毁且吸引瞄准的替身；基础隐身从6秒缩至4秒。`,
'zh-Hant':`破陣節拍|E以0.12秒間隔按固定方向發射三槍，總傷害不變。
補給線|終極技能的區域在中途再次補彈；基礎傷害加成從35%降至25%。
行軍旗幟|Q跟隨你移動，半徑縮小25%。
肩部盾牆|E增加隨身正面盾牆，基礎生命80；架槍減傷從45%降至25%。
爐火排氣|終極技能開始一秒後，每兩秒發射八枚短程彈；基礎射速加成從70%降至40%。
分列壓制|Q將原有十四枚彈丸分成兩道窄扇面，正前方留出空隙。
衝鋒後衛|衝鋒在起點留下基礎生命80的盾牆，持續兩秒。
護衛巡行|終極光環跟隨你，每位進入者僅獲得一次護盾；基礎值從120降至90。
轉角堡壘|Q將盾牆分為兩塊斜板，各有原來一半的生命與長度。
血清接力|E以每跳140距離串聯治療並淨化三名不同隊友，取代周圍全員效果。
第二次呼吸|終極技能將基礎瞬間治療40改為24，再提供三次各6的治療脈衝。復活仍受難度限制。
隨行急救|Q跟隨附近傷勢最重的隊友，半徑縮小25%。
結界迴響|E將基礎傷害65拆為立即40，以及0.75秒後原地25。
環軌安魂|終極技能將固定大範圍脈衝改為三個繞身的小中心，各造成三分之一脈衝傷害。
雙生符印|Q生成兩個分開的較小符印，各造成一半傷害。
回流電路|路障最多儲存120點承傷，摧毀或到期時對附近釋放其中60%。
隨行工坊|攻城機以每秒160像素跟隨；基礎生命從200降至160。
交叉炮組|Q生成兩座各有一半生命和傷害的砲塔，第二座優先攻擊較遠目標。
遲來斬痕|踏步立即造成60%傷害，0.45秒後沿鎖定路徑補上40%。
未寫陷阱|終極技能持續3.5秒，免費踏步減少一次；強化踏步的起點留下三次傷害脈衝。
替身薄幕|Q留下生命60、可被彈丸摧毀且吸引瞄準的替身；基礎隱身從6秒縮至4秒。`,
ja:`突破の拍子|Eの3発を固定方向へ0.12秒間隔で発射。合計ダメージは同じです。
補給線|必殺技の領域で中間時点に再装填。基礎ダメージ加算は35%から25%になります。
進軍旗|Qが自分を追従し、半径は25%縮小します。
肩盾|Eに基礎耐久80の追従正面壁を追加。構えの基礎軽減は45%から25%になります。
炉の排気|必殺技開始1秒後から2秒ごとに短射程弾8発。基礎射撃速度加算は70%から40%になります。
分割制圧|Qの14発を狭い2つの扇形へ分割。正面中央は空きます。
突進の残盾|突進開始点に基礎耐久80の壁を2秒間残します。
護衛行進|必殺技が追従し、入った味方に一度ずつ盾を付与。基礎値は120から90になります。
角の砦|Qの壁を斜めの2枚に分割。それぞれ耐久と長さが半分になります。
血清リレー|Eは全周囲の代わりに、1回140以内で別々の味方3人へ回復と浄化を連鎖します。
二度目の息|必殺技の基礎即時回復40を24と6回復3回へ変更。蘇生の難易度制限は守ります。
随伴救護|Qが近くの最も負傷した味方を追従し、半径は25%縮小します。
結界の反響|Eの基礎65ダメージを即時40と0.75秒後の同じ地点の25に分けます。
周回鎮魂|必殺技の固定大円を周回する小円3つへ変更。各円は元の波の3分の1のダメージです。
双子の印|Qは小さな印2つを離して作り、それぞれ半分のダメージを与えます。
還流回路|障壁が受けたダメージを120まで蓄え、破壊か時間切れで60%を周囲へ放ちます。
随行工房|攻城機が毎秒160ピクセルで追従。基礎耐久は200から160になります。
交差砲台|Qは耐久と火力が半分の砲台2基を作成。2基目は遠い敵を優先します。
遅れ刃|踏み込みで60%のダメージを与え、0.45秒後に固定経路へ残り40%を与えます。
未記の罠|必殺技は3.5秒、無料移動は1回減少。強化移動の出発点に攻撃波3回を残します。
身代わりの幕|Qが耐久60の射撃で壊せる囮を残し、照準を引きつけます。基礎隠密は6秒から4秒です。`,
es:`Cadencia de brecha|E dispara tres tiros de dirección fija separados por 0,12 s; conserva el daño total.
Línea de suministro|La definitiva recarga otra vez a mitad del campo; su bonificación base de daño baja del 35% al 25%.
Bandera en marcha|Q te sigue con un radio un 25% menor.
Escudo de hombro|E añade una pared frontal móvil de 80 de vida base; la reducción base al afianzarse baja del 45% al 25%.
Respiraderos de horno|La definitiva lanza ocho tiros cortos cada dos segundos tras el primero; la cadencia adicional base baja del 70% al 40%.
Supresión dividida|Q divide sus catorce perdigones en dos conos estrechos con un hueco frontal.
Guardia de estela|La carga deja una pared de 80 de vida base en el origen durante dos segundos.
Procesión protectora|La definitiva te sigue y protege una vez a cada aliado que entra; el escudo base baja de 120 a 90.
Baluarte angular|Q divide su pared en dos paneles inclinados, cada uno con media vida y longitud.
Relevo de suero|E encadena curación y limpieza a tres aliados distintos, hasta 140 por salto, en vez de a todos los cercanos.
Segundo aliento|La definitiva cambia 40 de curación base inmediata por 24 y tres pulsos de 6. Mantiene las reglas de reanimación.
Triaje móvil|Q sigue al aliado cercano más herido con un radio un 25% menor.
Eco del sello|E divide sus 65 de daño base en 40 ahora y 25 en el mismo punto tras 0,75 s.
Réquiem orbital|La definitiva sustituye el gran pulso fijo por tres centros orbitales menores, con un tercio del daño cada uno.
Sellos gemelos|Q crea dos sellos pequeños separados, con la mitad del daño cada uno.
Corriente de retorno|La barricada almacena hasta 120 de daño absorbido y libera el 60% cerca al destruirse o caducar.
Taller móvil|El cañón de asedio sigue a 160 píxeles por segundo; su vida base baja de 200 a 160.
Pareja cruzada|Q crea dos torretas con media vida y daño cada una; la segunda prefiere un objetivo lejano.
Corte tardío|El paso inflige un 60% del daño ahora y un 40% por la ruta fija tras 0,45 s.
Trampas sin escribir|La definitiva dura 3,5 s y pierde un paso gratis; cada salida potenciada deja tres pulsos dañinos.
Velo señuelo|Q deja un señuelo de 60 de vida que atrae la puntería y recibe proyectiles; el velo base baja de 6 a 4 s.`,
fr:`Cadence de percée|E tire trois coups à visée fixe espacés de 0,12 s ; les dégâts totaux restent identiques.
Ligne de ravitaillement|L’ultime recharge encore à mi-durée du champ ; son bonus de dégâts de base passe de 35 % à 25 %.
Étendard mobile|Q vous suit avec un rayon réduit de 25 %.
Pavois d’épaule|E ajoute un mur frontal mobile de 80 PV de base ; la réduction de base du soutien passe de 45 % à 25 %.
Évents de four|L’ultime tire huit projectiles courts toutes les deux secondes après la première ; le bonus de cadence de base passe de 70 % à 40 %.
Suppression scindée|Q partage ses quatorze plombs entre deux cônes étroits séparés par un vide frontal.
Garde du sillage|La charge laisse un mur de 80 PV de base au départ pendant deux secondes.
Procession protectrice|L’ultime vous suit et protège chaque entrant une fois ; le bouclier de base passe de 120 à 90.
Bastion angulaire|Q sépare son mur en deux panneaux inclinés, chacun avec la moitié des PV et de la longueur.
Relais de sérum|E enchaîne soins et purification sur trois alliés distincts, à 140 par saut, au lieu de tous les proches.
Second souffle|L’ultime remplace 40 soins immédiats de base par 24 et trois impulsions de 6. Les règles de réanimation s’appliquent.
Triage mobile|Q suit l’allié proche le plus blessé avec un rayon réduit de 25 %.
Écho du sceau|E partage ses 65 dégâts de base en 40 immédiats puis 25 au même endroit après 0,75 s.
Réquiem orbital|L’ultime remplace la grande impulsion fixe par trois petits centres orbitaux, infligeant chacun un tiers des dégâts.
Sceaux jumeaux|Q crée deux petits sceaux séparés, infligeant chacun la moitié des dégâts.
Courant de retour|La barricade stocke jusqu’à 120 dégâts absorbés et en libère 60 % autour à sa destruction ou expiration.
Atelier itinérant|La machine de siège suit à 160 pixels par seconde ; ses PV de base passent de 200 à 160.
Paire croisée|Q crée deux tourelles avec moitié de PV et dégâts ; la seconde préfère une cible éloignée.
Entaille tardive|Le pas inflige 60 % des dégâts immédiatement puis 40 % sur le trajet fixé après 0,45 s.
Pièges inédits|L’ultime dure 3,5 s et perd un pas gratuit ; chaque départ renforcé laisse trois impulsions offensives.
Voile leurre|Q laisse un leurre de 60 PV ciblé et destructible par projectiles ; le voile de base passe de 6 à 4 s.`,
de:`Durchbruchstakt|E feuert drei Schüsse mit fester Richtung im Abstand von 0,12 s; der Gesamtschaden bleibt gleich.
Versorgungslinie|Die Ultimativfähigkeit lädt zur Feldhalbzeit erneut nach; der Grundschadensbonus sinkt von 35 % auf 25 %.
Marschbanner|Q folgt dir mit 25 % weniger Radius.
Schulterpavese|E erhält eine bewegliche Frontwand mit 80 Grundleben; die Grundreduktion beim Abstützen sinkt von 45 % auf 25 %.
Ofenventile|Die Ultimativfähigkeit feuert nach einer Sekunde alle zwei Sekunden acht Kurzstreckenschüsse; der Feuerratenbonus sinkt von 70 % auf 40 %.
Geteilte Unterdrückung|Q teilt seine vierzehn Projektile auf zwei schmale Kegel mit einer Lücke vorn auf.
Nachhut|Der Sturmangriff hinterlässt am Start zwei Sekunden eine Wand mit 80 Grundleben.
Schutzprozession|Die Ultimativfähigkeit folgt dir und schützt jeden Eintretenden einmal; der Grundschild sinkt von 120 auf 90.
Eckbastion|Q teilt die Wand in zwei schräge Platten mit je halbem Leben und halber Länge.
Serumstaffel|E heilt und reinigt drei verschiedene Verbündete mit 140 Reichweite je Sprung statt alle nahen Verbündeten.
Zweiter Atem|Die Ultimativfähigkeit tauscht 40 sofortige Grundheilung gegen 24 und drei Impulse zu 6. Wiederbelebungsregeln gelten weiter.
Mobile Triage|Q folgt dem am stärksten verletzten nahen Verbündeten mit 25 % weniger Radius.
Siegelecho|E teilt 65 Grundschaden in 40 sofort und 25 am gleichen Ort nach 0,75 s.
Orbitalrequiem|Die Ultimativfähigkeit ersetzt den großen festen Impuls durch drei kleinere kreisende Zentren mit je einem Drittel Schaden.
Zwillingssigel|Q erzeugt zwei getrennte kleinere Sigel mit je halbem Schaden.
Rückstrom|Die Barrikade speichert bis zu 120 absorbierten Schaden und entlädt bei Zerstörung oder Ablauf 60 % davon in der Nähe.
Wanderwerkstatt|Die Belagerungsmaschine folgt mit 160 Pixeln pro Sekunde; ihr Grundleben sinkt von 200 auf 160.
Kreuzfeuerpaar|Q baut zwei Türme mit je halbem Leben und Schaden; der zweite bevorzugt ein fernes Ziel.
Nachschnitt|Der Schritt verursacht sofort 60 % Schaden und nach 0,45 s weitere 40 % auf der festen Strecke.
Ungeschriebene Fallen|Die Ultimativfähigkeit dauert 3,5 s mit einem freien Schritt weniger; verstärkte Startpunkte hinterlassen drei Schadensimpulse.
Köderschleier|Q hinterlässt einen anvisierbaren, durch Geschosse zerstörbaren Köder mit 60 Leben; die Grunddauer sinkt von 6 auf 4 s.`,
'pt-BR':`Cadência de brecha|E dispara três tiros de mira fixa a cada 0,12 s; o dano total não muda.
Linha de suprimentos|A suprema recarrega novamente na metade do campo; o bônus base de dano cai de 35% para 25%.
Estandarte em marcha|Q acompanha você com raio 25% menor.
Escudo de ombro|E adiciona uma parede frontal móvel com 80 de vida base; a redução base ao firmar cai de 45% para 25%.
Respiros da fornalha|A suprema lança oito tiros curtos a cada dois segundos após o primeiro; o bônus base de cadência cai de 70% para 40%.
Supressão dividida|Q divide os mesmos catorze projéteis em dois cones estreitos com um vão frontal.
Guarda do rastro|A investida deixa uma parede com 80 de vida base na partida por dois segundos.
Procissão protetora|A suprema acompanha você e protege cada aliado que entra uma vez; o escudo base cai de 120 para 90.
Bastião angular|Q divide sua parede em dois painéis inclinados, cada um com metade da vida e do comprimento.
Revezamento de soro|E encadeia cura e limpeza em três aliados distintos, até 140 por salto, em vez de todos os próximos.
Segundo fôlego|A suprema troca 40 de cura base imediata por 24 e três pulsos de 6. As regras de reanimação continuam valendo.
Triagem móvel|Q acompanha o aliado próximo mais ferido com raio 25% menor.
Eco do selo|E divide 65 de dano base em 40 agora e 25 no mesmo local após 0,75 s.
Réquiem orbital|A suprema troca o grande pulso fixo por três centros orbitais menores, com um terço do dano cada.
Selos gêmeos|Q cria dois selos menores separados, cada um com metade do dano.
Corrente de retorno|A barricada guarda até 120 de dano absorvido e libera 60% ao redor quando destruída ou expirada.
Oficina itinerante|A máquina de cerco acompanha a 160 pixels por segundo; a vida base cai de 200 para 160.
Dupla cruzada|Q cria duas torretas com metade da vida e do dano; a segunda prefere um alvo distante.
Corte tardio|O passo causa 60% do dano agora e 40% no caminho fixo após 0,45 s.
Armadilhas inéditas|A suprema dura 3,5 s e perde um passo grátis; saídas fortalecidas deixam três pulsos de dano.
Véu de isca|Q deixa uma isca de 60 de vida que atrai mira e sofre dano de projéteis; o véu base cai de 6 para 4 s.`,
ru:`Ритм прорыва|E делает три выстрела с фиксированным прицелом через 0,12 с; общий урон прежний.
Линия снабжения|Ультимативное поле повторно заряжает оружие в середине срока; базовый бонус урона снижается с 35% до 25%.
Походное знамя|Q следует за вами с радиусом на 25% меньше.
Наплечный щит|E добавляет подвижную переднюю стену с 80 базового здоровья; базовое снижение урона стойки падает с 45% до 25%.
Отдушины печи|После первой секунды ультимативная способность выпускает восемь ближних снарядов каждые две секунды; бонус темпа падает с 70% до 40%.
Раздельное подавление|Q делит те же четырнадцать дробин на два узких конуса с просветом спереди.
Арьергард|Рывок оставляет на старте стену с 80 базового здоровья на две секунды.
Защитная процессия|Ультимативная способность следует за вами и даёт щит каждому вошедшему один раз; базовый щит снижается со 120 до 90.
Угловой бастион|Q делит стену на две наклонные панели, каждая с половиной здоровья и длины.
Эстафета сыворотки|E передаёт лечение и очищение трём разным союзникам с дальностью 140 за прыжок вместо всех ближайших.
Второе дыхание|Ультимативная способность меняет базовое мгновенное лечение 40 на 24 и три импульса по 6. Ограничения оживления сохраняются.
Подвижная помощь|Q следует за самым раненым ближайшим союзником с радиусом на 25% меньше.
Эхо печати|E делит базовый урон 65 на 40 сразу и 25 в той же точке через 0,75 с.
Орбитальный реквием|Ультимативная способность заменяет большой неподвижный импульс тремя малыми орбитальными центрами с третью урона каждый.
Парные печати|Q создаёт две разнесённые малые печати с половинным уроном.
Обратный ток|Баррикада хранит до 120 поглощённого урона и выпускает 60% вокруг при разрушении или истечении срока.
Походная мастерская|Осадная машина следует со скоростью 160 пикселей в секунду; базовое здоровье падает с 200 до 160.
Перекрёстная пара|Q создаёт две турели с половиной здоровья и урона; вторая предпочитает дальнюю цель.
Поздний разрез|Шаг наносит 60% урона сразу и 40% по закреплённому пути через 0,45 с.
Ненаписанные ловушки|Ультимативная способность длится 3,5 с и теряет один свободный шаг; усиленные отправления оставляют три импульса урона.
Завеса-приманка|Q оставляет приманку с 60 здоровья, привлекающую прицел и уязвимую для снарядов; базовая завеса сокращается с 6 до 4 с.`,
hi:`भेदन की लय|E तय दिशा में 0.12 सेकंड के अंतर से तीन गोलियाँ चलाता है; कुल नुकसान समान रहता है।
आपूर्ति रेखा|अल्टीमेट का क्षेत्र बीच में फिर गोला-बारूद भरता है; मूल नुकसान बोनस 35% से 25% होता है।
चलता ध्वज|Q आपके साथ चलता है, पर त्रिज्या 25% कम होती है।
कंधे की ढाल|E सामने चलती 80 मूल स्वास्थ्य की दीवार जोड़ता है; टिककर बचाव की मूल कटौती 45% से 25% होती है।
भट्ठी के निकास|अल्टीमेट एक सेकंड बाद हर दो सेकंड में आठ कम दूरी के शॉट छोड़ता है; मूल गोली गति बोनस 70% से 40% होता है।
विभाजित दमन|Q की वही चौदह गोलियाँ दो संकरे शंकुओं में बँटती हैं; सामने बीच में खाली जगह रहती है।
पीछे का पहरा|धावा शुरुआती जगह पर दो सेकंड के लिए 80 मूल स्वास्थ्य की दीवार छोड़ता है।
रक्षक जुलूस|अल्टीमेट आपके साथ चलता है और हर प्रवेशकर्ता को एक बार ढाल देता है; मूल ढाल 120 से 90 होती है।
कोने का दुर्ग|Q दीवार को दो तिरछे पैनलों में बाँटता है; हर एक का स्वास्थ्य और लंबाई आधी है।
सीरम की कड़ी|E सभी पास के साथियों के बजाय हर छलाँग में 140 दूरी पर तीन अलग साथियों को उपचार और सफाई देता है।
दूसरी साँस|अल्टीमेट का मूल तुरंत उपचार 40 से 24 होता है, फिर 6 के तीन उपचार स्पंदन मिलते हैं। कठिनाई के पुनर्जीवन नियम लागू रहते हैं।
चलती चिकित्सा|Q पास के सबसे घायल साथी के साथ चलता है; त्रिज्या 25% कम होती है।
वार्ड की गूँज|E का मूल 65 नुकसान अभी 40 और उसी जगह 0.75 सेकंड बाद 25 में बँटता है।
परिक्रमा का शोकगीत|अल्टीमेट का बड़ा स्थिर स्पंदन तीन छोटे घूमते केंद्रों में बदलता है; हर केंद्र एक तिहाई नुकसान देता है।
जुड़वाँ चिह्न|Q दो अलग छोटे चिह्न बनाता है; हर एक आधा नुकसान देता है।
वापसी धारा|अवरोध 120 तक रोका नुकसान जमा करता है और टूटने या समय पूरा होने पर उसका 60% पास छोड़ता है।
चलती कार्यशाला|घेराबंदी मशीन 160 पिक्सेल प्रति सेकंड से पीछा करती है; मूल स्वास्थ्य 200 से 160 होता है।
आड़ी गोलीबारी जोड़ी|Q आधे स्वास्थ्य और नुकसान वाली दो बुर्ज बनाता है; दूसरा दूर के लक्ष्य को चुनता है।
देर का वार|कदम अभी 60% और तय रास्ते पर 0.45 सेकंड बाद 40% नुकसान देता है।
अनलिखे जाल|अल्टीमेट 3.5 सेकंड चलता है और एक मुफ्त कदम कम मिलता है; सशक्त कदम की शुरुआत पर तीन नुकसान स्पंदन छूटते हैं।
छलावे का पर्दा|Q निशाना खींचने वाला 60 स्वास्थ्य का छलावा छोड़ता है जिसे गोलियाँ तोड़ सकती हैं; मूल पर्दा 6 से 4 सेकंड होता है।`,
ar:`إيقاع الاختراق|تطلق E ثلاث طلقات باتجاه ثابت بفاصل 0.12 ث؛ الضرر الكلي لا يتغير.
خط الإمداد|تعيد القدرة القصوى تعبئة الذخيرة في منتصف الحقل؛ تنخفض زيادة الضرر الأساسية من 35% إلى 25%.
راية المسير|تتبعك Q بنصف قطر أصغر بنسبة 25%.
ترس الكتف|تضيف E جدارًا أماميًا متحركًا بصحة أساسية 80؛ ينخفض تخفيف الثبات الأساسي من 45% إلى 25%.
منافذ الفرن|تطلق القدرة القصوى ثماني طلقات قصيرة كل ثانيتين بعد الثانية الأولى؛ تنخفض زيادة معدل الإطلاق الأساسية من 70% إلى 40%.
قمع منقسم|تقسم Q المقذوفات الأربع عشرة نفسها إلى مخروطين ضيقين مع فجوة أمامية.
حارس الأثر|تترك الاندفاعة عند البداية جدارًا بصحة أساسية 80 لمدة ثانيتين.
موكب الحماية|تتبعك القدرة القصوى وتمنح كل داخل درعًا مرة واحدة؛ ينخفض الدرع الأساسي من 120 إلى 90.
حصن الزاوية|تقسم Q الجدار إلى لوحين مائلين، لكل منهما نصف الصحة والطول.
ترحيل المصل|تربط E العلاج والتطهير بثلاثة حلفاء مختلفين ضمن 140 لكل قفزة بدل جميع القريبين.
نفس ثانٍ|تستبدل القدرة القصوى شفاء 40 الفوري الأساسي بـ24 وثلاث نبضات شفاء قدرها 6. تبقى قواعد الإحياء حسب الصعوبة.
فرز متحرك|تتبع Q أكثر الحلفاء القريبين إصابة بنصف قطر أصغر بنسبة 25%.
صدى الختم|تقسم E ضررها الأساسي 65 إلى 40 الآن و25 في الموضع نفسه بعد 0.75 ث.
قداس مداري|تستبدل القدرة القصوى النبضة الثابتة الكبيرة بثلاثة مراكز مدارية أصغر، يسبب كل منها ثلث الضرر.
ختمان توأمان|تصنع Q ختمين صغيرين منفصلين، يسبب كل منهما نصف الضرر.
تيار العودة|يخزن الحاجز حتى 120 من الضرر الممتص ويطلق 60% منه حوله عند تحطمه أو انتهاء مدته.
ورشة متنقلة|تتبع آلة الحصار بسرعة 160 بكسل في الثانية؛ تنخفض الصحة الأساسية من 200 إلى 160.
زوج نيران متقاطعة|تصنع Q برجين بنصف الصحة والضرر لكل منهما؛ يفضل الثاني هدفًا أبعد.
قطع متأخر|تسبب الخطوة 60% من الضرر فورًا و40% على مسارها الثابت بعد 0.45 ث.
فخاخ غير مكتوبة|تدوم القدرة القصوى 3.5 ث مع خطوة مجانية أقل؛ تترك البدايات المعززة ثلاث نبضات ضرر.
حجاب الطعم|تترك Q طعمًا بصحة 60 يجذب التصويب ويمكن للمقذوفات تدميره؛ تنخفض مدة الحجاب الأساسية من 6 إلى 4 ث.`,
bn:`ভেদের ছন্দ|E নির্দিষ্ট দিকে 0.12 সেকেন্ড বিরতিতে তিন গুলি চালায়; মোট ক্ষতি একই থাকে।
রসদ রেখা|চূড়ান্ত ক্ষমতার ক্ষেত্রের মাঝসময়ে আবার গুলি ভরে; মূল ক্ষতি বোনাস 35% থেকে 25% হয়।
চলন্ত পতাকা|Q আপনাকে অনুসরণ করে, তবে ব্যাসার্ধ 25% কমে।
কাঁধের ঢাল|E সামনে চলন্ত 80 মূল স্বাস্থ্যের দেয়াল যোগ করে; স্থির প্রতিরক্ষার মূল ক্ষতি হ্রাস 45% থেকে 25% হয়।
চুল্লির বায়ুপথ|চূড়ান্ত ক্ষমতা এক সেকেন্ড পরে প্রতি দুই সেকেন্ডে আটটি স্বল্পপাল্লার গুলি ছোড়ে; মূল গুলির হার বোনাস 70% থেকে 40% হয়।
বিভক্ত দমন|Q একই চোদ্দটি গুলিকে দুটি সরু শঙ্কুতে ভাগ করে; সামনের মাঝে ফাঁক থাকে।
পেছনের প্রহরা|ধাবন শুরুর জায়গায় দুই সেকেন্ডের জন্য 80 মূল স্বাস্থ্যের দেয়াল রাখে।
রক্ষী মিছিল|চূড়ান্ত ক্ষমতা আপনাকে অনুসরণ করে ও প্রত্যেক প্রবেশকারীকে একবার ঢাল দেয়; মূল ঢাল 120 থেকে 90 হয়।
কোণের দুর্গ|Q দেয়ালকে দুটি তির্যক পাতে ভাগ করে; প্রতিটির স্বাস্থ্য ও দৈর্ঘ্য অর্ধেক।
সিরাম শৃঙ্খল|E কাছের সবাইকে নয়, প্রতি ধাপে 140 দূরত্বে তিনজন পৃথক সঙ্গীকে চিকিৎসা ও শোধন দেয়।
দ্বিতীয় শ্বাস|চূড়ান্ত ক্ষমতার মূল তাৎক্ষণিক চিকিৎসা 40 থেকে 24 হয়, সঙ্গে 6 করে তিনটি চিকিৎসার স্পন্দন। কঠিনতার পুনরুজ্জীবন নিয়ম বহাল থাকে।
চলন্ত চিকিৎসা|Q কাছের সবচেয়ে আহত সঙ্গীকে অনুসরণ করে; ব্যাসার্ধ 25% কমে।
রক্ষাচিহ্নের প্রতিধ্বনি|E-এর মূল 65 ক্ষতি এখন 40 ও একই স্থানে 0.75 সেকেন্ড পরে 25 হয়।
কক্ষপথের শোকগান|চূড়ান্ত ক্ষমতার বড় স্থির স্পন্দন তিনটি ছোট ঘূর্ণায়মান কেন্দ্রে বদলায়; প্রতিটি এক তৃতীয়াংশ ক্ষতি দেয়।
যমজ চিহ্ন|Q দুটি পৃথক ছোট চিহ্ন তৈরি করে; প্রতিটি অর্ধেক ক্ষতি দেয়।
ফেরত স্রোত|ব্যারিকেড 120 পর্যন্ত শোষিত ক্ষতি জমায় ও ভাঙলে বা মেয়াদ শেষে তার 60% কাছে ছাড়ে।
চলন্ত কর্মশালা|অবরোধযন্ত্র প্রতি সেকেন্ডে 160 পিক্সেল বেগে অনুসরণ করে; মূল স্বাস্থ্য 200 থেকে 160 হয়।
ক্রসফায়ার জুটি|Q অর্ধেক স্বাস্থ্য ও ক্ষতিসহ দুটি টারেট বানায়; দ্বিতীয়টি দূরের লক্ষ্য পছন্দ করে।
বিলম্বিত কাট|পদক্ষেপ এখন 60% ও নির্দিষ্ট পথে 0.45 সেকেন্ড পরে 40% ক্ষতি দেয়।
অলিখিত ফাঁদ|চূড়ান্ত ক্ষমতা 3.5 সেকেন্ড চলে, বিনামূল্যের পদক্ষেপ একটি কমে; শক্তিশালী প্রস্থানে তিনটি ক্ষতির স্পন্দন থাকে।
টোপের আবরণ|Q লক্ষ্য টানা 60 স্বাস্থ্যের টোপ রাখে, যাকে গুলি ভাঙতে পারে; মূল আবরণ 6 থেকে 4 সেকেন্ড হয়।`,
id:`Irama terobosan|E menembakkan tiga peluru dengan arah terkunci berselang 0,12 dtk; total kerusakan tetap.
Jalur suplai|Ultimate mengisi amunisi lagi di pertengahan bidang; bonus kerusakan dasar turun dari 35% ke 25%.
Panji bergerak|Q mengikuti Anda dengan radius 25% lebih kecil.
Perisai bahu|E menambah dinding depan bergerak dengan 80 kesehatan dasar; pengurangan dasar saat bertumpu turun dari 45% ke 25%.
Ventilasi tungku|Ultimate melepas delapan tembakan pendek tiap dua detik setelah detik pertama; bonus laju tembak dasar turun dari 70% ke 40%.
Penekanan terbagi|Q membagi empat belas peluru yang sama menjadi dua kerucut sempit dengan celah di depan.
Penjaga jejak|Serbuan meninggalkan dinding berkesehatan dasar 80 di awal selama dua detik.
Arak pengawal|Ultimate mengikuti Anda dan memberi perisai sekali ke tiap pendatang; nilai dasar turun dari 120 ke 90.
Benteng sudut|Q membagi dinding menjadi dua panel miring, masing-masing dengan separuh kesehatan dan panjang.
Estafet serum|E merantai penyembuhan dan pembersihan ke tiga rekan berbeda dalam jarak 140 per lompatan, bukan semua rekan dekat.
Napas kedua|Ultimate menukar 40 penyembuhan dasar langsung dengan 24 dan tiga denyut sebesar 6. Aturan kebangkitan kesulitan tetap berlaku.
Triase bergerak|Q mengikuti rekan dekat yang paling terluka dengan radius 25% lebih kecil.
Gema segel|E membagi 65 kerusakan dasar menjadi 40 sekarang dan 25 pada titik yang sama setelah 0,75 dtk.
Rekuiem orbit|Ultimate mengganti denyut besar tetap dengan tiga pusat orbit kecil, masing-masing memberi sepertiga kerusakan.
Segel kembar|Q membuat dua segel kecil terpisah dengan separuh kerusakan masing-masing.
Arus balik|Barikade menyimpan hingga 120 kerusakan terserap dan melepaskan 60% di sekitar saat hancur atau habis waktu.
Bengkel keliling|Mesin pengepung mengikuti dengan 160 piksel per detik; kesehatan dasar turun dari 200 ke 160.
Pasangan silang|Q membuat dua turret dengan separuh kesehatan dan kerusakan; turret kedua memilih sasaran lebih jauh.
Sayatan susulan|Langkah memberi 60% kerusakan sekarang dan 40% di jalur terkunci setelah 0,45 dtk.
Jebakan tak tertulis|Ultimate berlangsung 3,5 dtk dengan satu langkah gratis lebih sedikit; keberangkatan diperkuat meninggalkan tiga denyut kerusakan.
Selubung umpan|Q meninggalkan umpan berkesehatan 60 yang menarik bidikan dan dapat dirusak peluru; durasi dasar turun dari 6 ke 4 dtk.`,
ur:`شگاف کی لے|E طے شدہ سمت میں 0.12 سیکنڈ کے وقفے سے تین گولیاں چلاتا ہے؛ کل نقصان یکساں رہتا ہے۔
رسد کی لکیر|حتمی صلاحیت کے میدان کے وسط میں گولیاں دوبارہ بھرتی ہیں؛ بنیادی نقصان بونس 35% سے 25% ہوتا ہے۔
چلتا پرچم|Q آپ کے ساتھ چلتا ہے، مگر رداس 25% کم ہوتا ہے۔
کندھے کی ڈھال|E سامنے متحرک 80 بنیادی صحت کی دیوار دیتا ہے؛ جم کر دفاع کی بنیادی کمی 45% سے 25% ہوتی ہے۔
بھٹی کے روزن|حتمی صلاحیت ایک سیکنڈ بعد ہر دو سیکنڈ میں آٹھ کم فاصلے کے شاٹ چھوڑتی ہے؛ بنیادی رفتار بونس 70% سے 40% ہوتا ہے۔
تقسیم شدہ دباؤ|Q انہی چودہ گولیوں کو دو تنگ مخروطوں میں تقسیم کرتا ہے، سامنے درمیان خالی رہتا ہے۔
پیچھے کا پہرا|دھاوے کی ابتدا پر دو سیکنڈ کے لیے 80 بنیادی صحت کی دیوار بنتی ہے۔
محافظ جلوس|حتمی صلاحیت آپ کے ساتھ چل کر ہر آنے والے کو ایک بار ڈھال دیتی ہے؛ بنیادی ڈھال 120 سے 90 ہوتی ہے۔
کونے کا قلعہ|Q دیوار کو دو ترچھے تختوں میں بانٹتا ہے؛ ہر ایک کی صحت اور لمبائی آدھی ہے۔
سیرم کی کڑی|E تمام قریبی ساتھیوں کے بجائے ہر چھلانگ میں 140 فاصلے تک تین الگ ساتھیوں کو علاج اور صفائی دیتا ہے۔
دوسرا سانس|حتمی صلاحیت کا بنیادی فوری علاج 40 سے 24 ہوتا ہے، ساتھ 6 کے تین علاج کے دھڑکے ملتے ہیں۔ مشکل کے احیا کے قواعد برقرار ہیں۔
متحرک طبی امداد|Q قریب کے سب سے زخمی ساتھی کے ساتھ چلتا ہے؛ رداس 25% کم ہوتا ہے۔
مہر کی گونج|E کا بنیادی 65 نقصان ابھی 40 اور اسی جگہ 0.75 سیکنڈ بعد 25 میں بٹتا ہے۔
مداری نوحہ|حتمی صلاحیت کا بڑا ساکن دھڑکا تین چھوٹے گھومتے مراکز بنتا ہے، ہر ایک ایک تہائی نقصان دیتا ہے۔
جڑواں مہریں|Q دو الگ چھوٹی مہریں بناتا ہے، ہر ایک آدھا نقصان دیتی ہے۔
واپسی کا بہاؤ|رکاوٹ 120 تک جذب شدہ نقصان رکھتی ہے اور ٹوٹنے یا وقت پورا ہونے پر اس کا 60% قریب چھوڑتی ہے۔
چلتی کارگاہ|محاصرے کی مشین 160 پکسل فی سیکنڈ سے پیچھا کرتی ہے؛ بنیادی صحت 200 سے 160 ہوتی ہے۔
ترچھی فائرنگ کی جوڑی|Q آدھی صحت اور نقصان والے دو برج بناتا ہے؛ دوسرا دور کا ہدف چنتا ہے۔
تاخیر کا وار|قدم ابھی 60% اور طے شدہ راستے پر 0.45 سیکنڈ بعد 40% نقصان دیتا ہے۔
ان لکھے پھندے|حتمی صلاحیت 3.5 سیکنڈ چلتی ہے اور ایک مفت قدم کم ملتا ہے؛ مضبوط قدم کی ابتدا پر تین نقصان کے دھڑکے رہتے ہیں۔
بہکاوے کا پردہ|Q نشانہ کھینچنے والا 60 صحت کا بہکاوا چھوڑتا ہے جسے گولیاں توڑ سکتی ہیں؛ بنیادی پردہ 6 سے 4 سیکنڈ ہوتا ہے۔`,
ko:`돌파 박자|E가 고정 방향으로 0.12초 간격으로 3발을 쏩니다. 총 피해는 같습니다.
보급선|궁극기 영역이 절반 시점에 탄약을 다시 채웁니다. 기본 피해 보너스는 35%에서 25%로 줄어듭니다.
행군 깃발|Q가 자신을 따라다니며 반경은 25% 줄어듭니다.
어깨 방패|E에 기본 체력 80의 이동 전면벽이 생깁니다. 기본 버티기 피해 감소는 45%에서 25%로 줄어듭니다.
용광로 배기|궁극기 시작 1초 후부터 2초마다 단거리 탄 8발을 쏩니다. 기본 연사 보너스는 70%에서 40%로 줄어듭니다.
분할 제압|Q의 같은 탄환 14개를 좁은 부채꼴 둘로 나누고 정면 중앙에 틈을 둡니다.
돌진 후위|돌진 시작점에 기본 체력 80의 벽을 2초간 남깁니다.
수호 행렬|궁극기가 따라다니며 들어온 아군마다 한 번 보호막을 줍니다. 기본 수치는 120에서 90으로 줄어듭니다.
모서리 요새|Q가 벽을 기울어진 판 두 개로 나눕니다. 각각 체력과 길이가 절반입니다.
혈청 릴레이|E가 주변 모두 대신 매 연결 거리 140 이내의 서로 다른 아군 3명을 회복하고 정화합니다.
두 번째 숨|궁극기의 기본 즉시 회복 40을 24와 6 회복 3회로 바꿉니다. 난이도별 부활 규칙은 유지됩니다.
이동 응급처치|Q가 근처 가장 다친 아군을 따라다니며 반경은 25% 줄어듭니다.
결계 메아리|E의 기본 피해 65를 즉시 40과 0.75초 뒤 같은 지점의 25로 나눕니다.
궤도 진혼곡|궁극기의 큰 고정 파동을 작은 공전 중심 3개로 바꿉니다. 각각 파동 피해의 3분의 1을 줍니다.
쌍둥이 인장|Q가 떨어진 작은 인장 둘을 만들며 각각 절반의 피해를 줍니다.
귀환 전류|바리케이드가 받은 피해를 120까지 저장하고 파괴나 만료 시 60%를 주변에 방출합니다.
이동 공방|공성기가 초당 160픽셀로 따라옵니다. 기본 체력은 200에서 160으로 줄어듭니다.
교차 포탑|Q가 체력과 피해가 각각 절반인 포탑 둘을 만듭니다. 두 번째는 더 먼 적을 우선합니다.
지연 베기|발걸음이 즉시 60%, 0.45초 뒤 고정 경로에 40% 피해를 줍니다.
미기록 함정|궁극기가 3.5초간 지속되고 무료 발걸음이 하나 줄어듭니다. 강화 발걸음 출발점에 피해 파동 3회를 남깁니다.
미끼 장막|Q가 조준을 끌고 탄환으로 파괴할 수 있는 체력 60의 미끼를 남깁니다. 기본 은폐는 6초에서 4초로 줄어듭니다.`
};
const ids=Object.values(classTalents).flat();
export function classTalentMessages(locale,catalog){
 if(!rows[locale])throw Error('Missing class talent locale '+locale);
 const entries=rows[locale].normalize('NFC').split('\n');if(entries.length!==21)throw Error('Expected 21 translated talents '+locale);
 const messages={};entries.forEach((row,i)=>{const [name,description]=row.split('|');if(!name||!description)throw Error('Malformed talent '+locale+'/'+i);messages['talent.'+ids[i]+'.name']=name;messages['talent.'+ids[i]+'.description']=description;});
 if(catalog)for(const node of catalog.skills.filter(s=>s.transform))messages['skill.'+node.id+'.name']=messages['talent.'+node.transform+'.name'];
 return messages;
}
