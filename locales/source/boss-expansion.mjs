// Stage 1 authored names and signature counterplay. Original eleven bosses stay in source/<locale>.mjs.
// Each line is name|complete mechanic and counterplay description, in the explicit ID order below.
export const bossExpansionIds = [
  'tollkeeper','lantern-warden','ratcatcher','quarantine-clerk','chain-marshal','gate-widow','black-ambulance',
  'glass-surgeon','ash-baker','sluice-keeper','stationmaster','lamplighter','anatomist','plague-gardener','red-abbess','vesper-judge',
  'cinder-foreman','canal-diver','clockmender','wire-seamstress','gravedigger','ink-notary','spore-beekeeper','ice-custodian',
  'bridge-ferryman','porcelain-mourner','boiler-tender','mirror-undertaker','chalk-magistrate','wire-harpist','crow-shepherd','ledger-leech','salt-patriarch',
  'chain-colossus','ossuary-leviathan','bell-triplets','quarantine-heart','crown-procession','city-eater','last-breath-saint',
  'hourglass-widow','unlit-astronomer','folded-man','red-comet','memory-taxer','choir-of-moths','zero-hour-conductor','walking-district','last-knocker'
];
const authored = {
en: `The Tollkeeper|A coin wheel banks off the wall and returns. Follow both arrow segments and cross after it passes.
Lantern Warden|A narrow spark cone rotates around the lantern. Follow behind it through the outlined safe wedge.
Ratcatcher|Rat packs follow three scent trails. Break the outlined sack to interrupt a pack, or cross between trails.
Quarantine Clerk|Three numbered stamps activate in sequence. Move into the first stamp when it is erased into a safe zone.
Chain Marshal|Two wall anchors sweep chains through marked sectors. Use an unswept quadrant or destroy an anchor.
Gate Widow|Two portcullis lanes close while one opens. Follow the open-lane outline and the next latch cue.
Black Ambulance|It circles, stops at a marked station, then charges. Avoid the destination and attack the exposed driver during recovery.
Glass Surgeon|Glass needles form a dangerous polygon with one missing edge. Escape through that opening before activation.
Ash Baker|Slow loaves split into two crumbs after landing. Avoid the landing circles and both marked split directions.
Sluice Keeper|Alternating currents push sideways without damage. Use the dry raised strips or steer against the current while dodging bullets.
Last Stationmaster|Signals alternate danger between two rail lanes. Follow the cross and arrow symbols, not color alone.
The Lamplighter|Three candles cast safe shadow pockets before a pulse. Enter an outlined pocket and stay within its boundary.
The Anatomist|Delayed calipers strike two locked positions. Leave the fixed circles after the target-lock icon changes.
Plague Gardener|Four radial vines grow, then one becomes a healing path. Use the cut strip or destroy a root to shorten growth.
Red Abbess|Two moving sanctuaries protect against an inward wave. Reach either sanctuary and hold its neutralizing pad.
Vesper Judge|A verdict marks one arena half for a strike. Cross the center during the warning; the other half remains open.
Cinder Foreman|Three work zones prepare to vent. Use the neutral cooling switch or the naturally safe third sector.
Canal Diver|It vanishes into three puddles and emerges where bubbles appear first. Leave that ring, then attack during resurfacing recovery.
Clockmender|A slow bullet ring stops, then resumes in the same direction. Cross while it is stationary before the three-beat cue ends.
Seamstress of Wires|Three anchors form a zigzag fence with one stable doorway. Use the doorway or break an anchor to remove its wire.
Gravedigger|A moving earth ridge blocks hostile bullets, then collapses into pits. Take cover briefly and leave the marked collapse path.
Ink Notary|An incomplete ink spiral hardens into danger. Exit through its visible mouth before activation rather than crossing the stroke.
Spore Beekeeper|Three drones prepare a swarm. Destroy one to open a wedge, or use the permanent fallback gap.
Ice Custodian|Three icy strips cause bounded sideways sliding. Stay on dry strips; normal dodging remains available.
Bridge Ferryman|Two bridges alternate over dangerous water bands. Follow the open arrow or take the safe outer bypass.
Porcelain Mourner|Four mask fragments move as cover, then crack into radial hazards. Leave a fragment when its cracking warning begins.
Boiler Tender|Three valves build pressure. Hold any neutral valve to vent a safe wedge, or use the marked outer gap.
Mirror Undertaker|A harmless reflection copies an earlier position. Find the real body by its black foot marker and ignore the hollow outline.
Chalk Magistrate|A rectangle closes with three flashing walls and one erased wall. Cross the erased side during the warning; walls never physically trap you.
Wire Harpist|Three strings strike in numbered low-middle-high order. Move between lanes using the dashed next-string cue and visible countdown.
Crow Shepherd|Three cohesive bird flocks cross marked trails. Read the dashed paths and cross behind the leading bird.
Ledger Leech|Paper seals slow marked players. Walk through either cleansing circle or wait for the bounded slow to expire; currency is never stolen.
Salt Patriarch|A salt boundary advances inward in three steps. Use either broad gate; an Accord pad can briefly delay the next step.
Chain Colossus|Three pylons pull a marked floor section. Destroy any pylon for a damage opening, or use the clear outer lane.
Ossuary Leviathan|Three ribs become weak points in numbered order. Focus the exposed rib and stay outside the thick body outline.
Bell Triplets|Three keepers cast in turns. Hit the highlighted keeper to interrupt a beam; a fixed safe gap always remains.
Quarantine Heart|Four hoses stream toward the walls. Hold a neutral valve to reverse a stream into the core, or attack from the open side.
Crown Procession|Four attendants carry a moving throne. Defeat any attendant to lower it, or attack during the scheduled throne rest.
City Eater|Two bite lanes leave one broad escape corridor. Use the unmarked corridor and attack in recovery; break temporary walls to expose the core.
Saint of the Last Breath|Inhalation pulls gently before slow exhaled rings. Use either shelter pad or steer outward; solo needs only one pad.
Hourglass Widow|A slow fan replays the same path after a countdown. Follow the dashed replay paths or use the persistent safe flank.
Unlit Astronomer|Two orbiting hazards surround a harmless safe marker. Follow the hollow marker's orbit and avoid the solid hazards.
Folded Man|A floor fold reflects bullets once at a mirrored angle. Read both predicted path segments or stay on the unreflected side.
Red Comet|Three waypoint dashes leave trails that fade in creation order. Follow the numbers and cross the oldest faded trail.
Memory Taxer|Three symbols identify safe pads before a pulse. Choose the first shown symbol using the visible HUD history; memorization is optional.
Choir of Moths|Three curved moth ribbons leave one visibly broken crossing. Cross at that break rather than through the intact ribbons.
Zero-Hour Conductor|Four visible beats release alternating lane attacks. Follow the beat pips and safe-lane marker; hearing the rhythm is unnecessary.
Walking District|Two building blocks shift along marked lanes and expose the core. Take the outer bypass or the cleared center after they settle.
The Last Knocker|Three visible knocks precede a marked door swing. Move behind the hinge and attack during the open-door recovery.`,
es: `El cobrador del peaje|Una rueda de monedas rebota en la pared y regresa. Sigue ambos tramos de la flecha y cruza cuando pase.
Guardián del farol|Un cono de chispas gira alrededor del farol. Avanza detrás de él por la cuña segura marcada.
Cazarratas|Las manadas siguen tres rastros. Rompe el saco marcado para interrumpir una manada o cruza entre los rastros.
Escribano de cuarentena|Tres sellos numerados se activan en orden. Entra en el primero cuando se borre y se vuelva seguro.
Mariscal de cadenas|Dos anclajes barren sectores con cadenas. Usa un cuadrante intacto o destruye un anclaje.
Viuda de la puerta|Dos carriles de rastrillos se cierran y uno se abre. Sigue el contorno abierto y la señal del cerrojo.
Ambulancia negra|Rodea la arena, para en una estación y carga. Evita el destino y ataca al conductor durante su recuperación.
Cirujano de cristal|Agujas de cristal forman un polígono peligroso con un lado ausente. Sal por esa abertura antes de que se active.
Panadero de ceniza|Los panes lentos se dividen en dos migas al caer. Evita los círculos de caída y las dos direcciones marcadas.
Guardián de la esclusa|Corrientes alternas empujan lateralmente sin daño. Usa las franjas secas elevadas o nada contra la corriente mientras esquivas.
Último jefe de estación|Las señales alternan el peligro entre dos vías. Sigue los símbolos de cruz y flecha, además del color.
El farolero|Tres velas proyectan sombras seguras antes de un pulso. Entra en una sombra marcada y permanece dentro.
El anatomista|Unas pinzas golpean dos posiciones fijadas tras una demora. Sal de los círculos cuando cambie el icono de fijación.
Jardinero de la peste|Crecen cuatro enredaderas radiales y una se convierte en senda curativa. Úsala o destruye una raíz para acortar el crecimiento.
Abadesa roja|Dos santuarios móviles protegen de una ola entrante. Alcanza cualquiera y mantén su placa neutralizadora.
Juez del ocaso|Un veredicto marca media arena para un golpe. Cruza el centro durante el aviso; la otra mitad queda libre.
Capataz de cenizas|Tres zonas se preparan para expulsar vapor. Usa el interruptor de enfriamiento neutral o el tercer sector seguro.
Buzo del canal|Se sumerge en tres charcos y sale del que burbujea primero. Evita ese anillo y ataca al emerger.
Relojero|Un anillo lento se detiene y vuelve a avanzar en la misma dirección. Crúzalo antes de terminar la cuenta de tres pulsos.
Costurera de alambres|Tres anclajes forman una valla en zigzag con una puerta fija. Usa la puerta o rompe un anclaje para quitar su alambre.
Sepulturero|Una cresta móvil bloquea balas y luego se derrumba en fosas. Cúbrete brevemente y sal de la ruta marcada.
Notario de tinta|Una espiral de tinta incompleta se endurece. Sal por su boca visible antes de activarse, sin cruzar el trazo.
Apicultor de esporas|Tres zánganos preparan un enjambre. Destruye uno para abrir una cuña o usa la abertura permanente.
Custodio del hielo|Tres franjas heladas causan deslizamiento lateral limitado. Usa las franjas secas; la esquiva normal sigue disponible.
Barquero del puente|Dos puentes se alternan sobre agua peligrosa. Sigue la flecha abierta o usa el desvío exterior seguro.
Doliente de porcelana|Cuatro fragmentos de máscara sirven de cobertura y luego explotan radialmente. Aléjate cuando empiecen a agrietarse.
Cuidador de calderas|Tres válvulas acumulan presión. Mantén cualquiera neutral para abrir una cuña o usa el hueco exterior marcado.
Funerario del espejo|Un reflejo inofensivo copia una posición anterior. Localiza el cuerpo real por la marca negra de sus pies e ignora el contorno hueco.
Magistrado de tiza|Un rectángulo tiene tres paredes activas y una borrada. Cruza la borrada durante el aviso; las paredes no te encierran físicamente.
Arpista de alambres|Tres cuerdas atacan en orden grave, medio y agudo numerado. Cambia de carril siguiendo el próximo trazo y la cuenta visual.
Pastor de cuervos|Tres bandadas cruzan rutas marcadas. Lee las líneas discontinuas y cruza detrás del primer pájaro.
Sanguijuela del registro|Sellos de papel ralentizan a los marcados. Cruza un círculo purificador o espera; nunca roba monedas.
Patriarca de sal|Un límite salino avanza en tres pasos. Usa una de las dos puertas anchas; una placa del Pacto retrasa el avance.
Coloso de cadenas|Tres pilones arrastran una zona del suelo. Destruye cualquiera para abrir una fase de daño o usa el carril exterior libre.
Leviatán del osario|Tres costillas exponen puntos débiles en orden numerado. Ataca la costilla expuesta y evita el contorno grueso del cuerpo.
Trillizos de la campana|Tres guardianes lanzan ataques por turnos. Golpea al resaltado para interrumpir un rayo; siempre queda un hueco seguro.
Corazón de la cuarentena|Cuatro mangueras lanzan chorros a las paredes. Mantén una válvula para volver un chorro al núcleo o ataca desde el lado abierto.
Procesión de la corona|Cuatro sirvientes cargan un trono móvil. Derrota a cualquiera para bajarlo o ataca durante su descanso programado.
Devoraciudades|Dos mordiscos dejan un pasillo de escape ancho. Usa el pasillo libre y ataca en la recuperación; rompe muros temporales para exponer el núcleo.
Santo del último aliento|La inhalación atrae suavemente antes de exhalar anillos lentos. Usa un refugio o empuja hacia fuera; en solitario basta una placa.
Viuda del reloj de arena|Un abanico lento repite su ruta tras una cuenta atrás. Lee las rutas discontinuas o usa el flanco seguro permanente.
Astrónomo sin luz|Dos peligros orbitales rodean una marca segura inofensiva. Sigue la órbita del marcador hueco y evita los sólidos.
Hombre plegado|Un pliegue del suelo refleja las balas una vez. Lee ambos tramos previstos o quédate en el lado sin reflejo.
Cometa rojo|Tres carreras dejan estelas que se apagan en orden. Sigue los números y cruza la estela más antigua ya apagada.
Recaudador de recuerdos|Tres símbolos identifican placas seguras antes de un pulso. Elige el primero usando el historial visible; memorizar es opcional.
Coro de polillas|Tres cintas curvas de polillas dejan un cruce visiblemente roto. Cruza por la rotura, evitando las cintas enteras.
Director de la hora cero|Cuatro pulsos visibles lanzan carriles alternos. Sigue los puntos del ritmo y el carril seguro; no necesitas oírlo.
Distrito andante|Dos bloques de edificios se mueven por rutas y exponen el núcleo. Usa el desvío exterior o el centro cuando se detengan.
El último llamador|Tres golpes visibles preceden al giro de una puerta marcada. Ponte detrás de la bisagra y ataca mientras queda abierta.`,
fr: `Le péager|Une roue de pièces rebondit au mur puis revient. Suivez les deux flèches et traversez après son passage.
Gardien de la lanterne|Un cône étroit d'étincelles tourne autour de la lanterne. Suivez-le dans le secteur sûr délimité.
Chasseur de rats|Les meutes suivent trois pistes. Brisez le sac marqué pour interrompre une meute, ou passez entre les pistes.
Greffier de quarantaine|Trois tampons numérotés s'activent successivement. Entrez dans le premier lorsqu'il est effacé et devient sûr.
Maréchal des chaînes|Deux ancrages balaient les secteurs marqués avec des chaînes. Utilisez un quadrant libre ou détruisez un ancrage.
Veuve de la porte|Deux couloirs de herses se ferment, un s'ouvre. Suivez le contour ouvert et le signal du verrou.
Ambulance noire|Elle tourne, s'arrête à une station puis charge. Évitez sa destination et frappez le conducteur pendant son repos.
Chirurgien de verre|Des aiguilles forment un polygone dangereux auquel manque un côté. Sortez par l'ouverture avant son activation.
Boulanger de cendres|Les pains lents se divisent en deux miettes après l'atterrissage. Évitez les cercles et les deux directions annoncées.
Gardien des écluses|Des courants alternés poussent sans blesser. Utilisez les bandes sèches ou luttez contre le courant tout en esquivant.
Dernier chef de gare|Les signaux alternent le danger entre deux voies. Suivez les croix et flèches, pas seulement la couleur.
L'allumeur de réverbères|Trois bougies créent des poches d'ombre sûres avant une pulsation. Rejoignez une ombre délimitée et restez dedans.
L'anatomiste|Des compas frappent deux positions figées avec retard. Quittez les cercles lorsque l'icône de verrouillage change.
Jardinier de la peste|Quatre lianes poussent, puis une devient un chemin de soin. Empruntez-le ou détruisez une racine pour abréger la pousse.
Abbesse rouge|Deux sanctuaires mobiles protègent de la vague entrante. Rejoignez l'un d'eux et maintenez sa dalle neutralisante.
Juge des vêpres|Un verdict condamne une moitié de l'arène. Traversez le centre pendant l'avertissement ; l'autre moitié reste libre.
Contremaître des braises|Trois zones se préparent à évacuer de la vapeur. Utilisez l'interrupteur de refroidissement ou le troisième secteur sûr.
Plongeur du canal|Il plonge dans les flaques et ressort de celle qui bouillonne d'abord. Évitez son anneau puis attaquez à la remontée.
Réparateur d'horloges|Un anneau lent s'immobilise puis repart dans le même sens. Traversez avant la fin du signal à trois temps.
Couturière des fils|Trois ancrages créent une clôture en zigzag avec une porte fixe. Empruntez-la ou brisez un ancrage pour enlever son fil.
Fossoyeur|Une crête mobile bloque les balles puis devient des fosses. Abritez-vous brièvement et quittez la zone d'effondrement.
Notaire d'encre|Une spirale d'encre incomplète durcit en danger. Sortez par son ouverture avant l'activation, sans traverser le trait.
Apiculteur des spores|Trois drones préparent un essaim. Détruisez-en un pour ouvrir un secteur ou utilisez la brèche permanente.
Gardien des glaces|Trois bandes gelées provoquent une glissade latérale limitée. Restez sur le sec ; l'esquive normale fonctionne toujours.
Passeur des ponts|Deux ponts s'alternent au-dessus d'eau dangereuse. Suivez la flèche ouverte ou le contournement extérieur sûr.
Pleureuse de porcelaine|Quatre fragments de masque servent d'abris puis éclatent. Éloignez-vous dès le début des fissures annoncées.
Gardien de chaudière|Trois vannes accumulent la pression. Maintenez une vanne neutre pour ouvrir un secteur sûr, ou prenez la brèche extérieure.
Croque-mort au miroir|Un reflet inoffensif copie une ancienne position. Repérez le vrai corps par sa marque noire au pied et ignorez le contour creux.
Magistrat de craie|Un rectangle garde trois parois dangereuses et en efface une. Traversez le côté effacé pendant l'avertissement ; aucune collision ne vous enferme.
Harpiste des fils|Trois cordes frappent dans l'ordre numéroté grave-médium-aigu. Changez de voie grâce aux pointillés et au décompte visuel.
Berger des corbeaux|Trois volées traversent des chemins marqués. Lisez les pointillés et passez derrière l'oiseau de tête.
Sangsue du registre|Des sceaux ralentissent les joueurs marqués. Traversez un cercle purifiant ou patientez ; aucune monnaie n'est volée.
Patriarche de sel|Une limite salée avance en trois étapes. Passez par une grande porte ; une dalle du Pacte retarde l'étape suivante.
Colosse des chaînes|Trois pylônes tirent une zone du sol. Détruisez-en un pour créer une ouverture ou prenez la voie extérieure libre.
Léviathan de l'ossuaire|Trois côtes deviennent vulnérables dans l'ordre numéroté. Visez la côte exposée et restez hors du contour épais.
Triplés des cloches|Trois gardiens attaquent à tour de rôle. Frappez le gardien éclairé pour interrompre un rayon ; une brèche sûre reste toujours ouverte.
Cœur de quarantaine|Quatre tuyaux projettent vers les murs. Maintenez une vanne pour renvoyer un jet au cœur, ou attaquez depuis le côté ouvert.
Procession de la couronne|Quatre serviteurs portent un trône mobile. Abattez-en un pour l'abaisser ou frappez pendant son arrêt prévu.
Dévoreur de villes|Deux voies de morsure laissent un large passage. Empruntez-le puis attaquez au repos ; brisez les murs temporaires pour exposer le cœur.
Saint du dernier souffle|Une légère aspiration précède les anneaux expirés. Utilisez un abri ou avancez vers l'extérieur ; une dalle suffit en solo.
Veuve au sablier|Un éventail lent rejoue sa trajectoire après un décompte. Lisez les pointillés ou gardez le flanc sûr permanent.
Astronome sans lumière|Deux dangers orbitent autour d'une marque sûre inoffensive. Suivez l'orbite du marqueur creux et évitez les pleins.
Homme plié|Un pli du sol réfléchit les balles une fois. Lisez les deux segments prévus ou restez du côté sans reflet.
Comète rouge|Trois ruées laissent des traînées qui s'éteignent dans l'ordre. Suivez les numéros et traversez la plus ancienne une fois éteinte.
Taxateur des souvenirs|Trois symboles désignent les dalles sûres avant une onde. Choisissez le premier à l'aide de l'historique affiché ; mémoriser est facultatif.
Chœur des papillons de nuit|Trois rubans courbes laissent une coupure visible. Traversez cette ouverture plutôt que les rubans intacts.
Chef de l'heure zéro|Quatre temps visibles déclenchent des voies alternées. Suivez les points et la voie sûre ; entendre le rythme n'est pas nécessaire.
Quartier ambulant|Deux blocs glissent sur des voies et exposent le cœur. Prenez le détour extérieur ou le centre après leur arrêt.
Le dernier frappeur|Trois coups visibles précèdent le mouvement d'une porte. Placez-vous derrière la charnière et frappez pendant son ouverture.`,
de: `Der Zöllner|Ein Münzrad prallt von der Wand ab und kehrt zurück. Beachte beide Pfeilabschnitte und überquere die Bahn danach.
Laternenwächter|Ein schmaler Funkenkegel rotiert um die Laterne. Folge ihm im markierten sicheren Keil.
Rattenfänger|Rattenrudel folgen drei Duftspuren. Zerstöre den markierten Sack, um ein Rudel zu stoppen, oder nutze die Zwischenräume.
Quarantäneschreiber|Drei nummerierte Stempel werden nacheinander gefährlich. Betritt den ersten, sobald er zur sicheren Fläche gelöscht wird.
Kettenmarschall|Zwei Wandanker schwenken Ketten durch markierte Sektoren. Nutze einen freien Quadranten oder zerstöre einen Anker.
Torwitwe|Zwei Fallgatterbahnen schließen, eine öffnet. Folge der offenen Markierung und dem nächsten Riegelsignal.
Schwarzer Krankenwagen|Er kreist, hält an einer Station und stürmt los. Meide den Zielort und triff den Fahrer während der Erholung.
Glaschirurg|Glasnadeln bilden ein gefährliches Vieleck mit einer offenen Seite. Entkomme dort vor der Aktivierung.
Aschebäcker|Langsame Brote teilen sich nach der Landung in zwei Krümel. Meide Landekreise und beide markierten Teilungsrichtungen.
Schleusenwärter|Wechselnde Strömungen schieben ohne Schaden seitwärts. Nutze trockene Streifen oder steuere dagegen und weiche Kugeln aus.
Letzter Bahnhofsvorsteher|Signale wechseln die Gefahr zwischen zwei Gleisen. Folge Kreuz und Pfeil statt nur der Farbe.
Der Laternenanzünder|Drei Kerzen werfen sichere Schatten vor einem Puls. Bleibe in einer markierten Schattentasche.
Der Anatom|Verzögerte Messzangen treffen zwei festgelegte Positionen. Verlasse die Kreise nach dem Wechsel des Zielsymbols.
Seuchengärtner|Vier Ranken wachsen radial, eine wird zum Heilpfad. Nutze den geschnittenen Streifen oder zerstöre eine Wurzel.
Rote Äbtissin|Zwei wandernde Heiligtümer schützen vor der einlaufenden Welle. Erreiche eines und halte seine Neutralisierungsplatte.
Vesperrichter|Ein Urteil markiert eine Arenahälfte zum Einschlag. Überquere die Mitte während der Warnung; die andere Hälfte bleibt frei.
Glutvorarbeiter|Drei Arbeitsbereiche bereiten Dampf vor. Nutze den neutralen Kühlschalter oder den von selbst sicheren dritten Sektor.
Kanaltaucher|Er taucht in Pfützen ab und erscheint dort, wo zuerst Blasen aufsteigen. Meide den Ring und greife beim Auftauchen an.
Uhrenflicker|Ein langsamer Kugelring stoppt und fährt gleichgerichtet weiter. Überquere ihn vor dem Ende des Dreiertakts.
Drahtnäherin|Drei Anker bilden einen Zickzackzaun mit fester Tür. Nutze die Tür oder zerstöre einen Anker samt seinem Draht.
Totengräber|Ein wandernder Erdwall blockiert Kugeln und fällt dann in Gruben. Nutze kurz Deckung und verlasse die Einsturzmarkierung.
Tintennotar|Eine offene Tintenspirale verhärtet zur Gefahr. Entkomme vor der Aktivierung durch ihre Öffnung statt über den Strich.
Sporenimker|Drei Drohnen bereiten einen Schwarm vor. Zerstöre eine für eine breite Lücke oder nutze die ständige Ausweichöffnung.
Eishüter|Drei Eisstreifen erzeugen begrenztes seitliches Rutschen. Bleibe auf trockenen Streifen; Ausweichen funktioniert weiterhin normal.
Brückenfährmann|Zwei Brücken wechseln über gefährlichen Wasserstreifen. Folge dem offenen Pfeil oder nutze den sicheren Außenweg.
Porzellantrauernde|Vier Maskenteile dienen als bewegliche Deckung und zerbrechen dann radial. Verlasse ein Teil beim sichtbaren Risssignal.
Kesselwärter|Drei Ventile bauen Druck auf. Halte ein neutrales Ventil für einen sicheren Keil oder nutze die markierte Außenlücke.
Spiegelbestatter|Ein harmloses Spiegelbild kopiert eine frühere Position. Erkenne den echten Körper an der schwarzen Fußmarkierung und ignoriere die hohle Kontur.
Kreidemagistrat|Ein Rechteck hat drei gefährliche und eine gelöschte Wand. Überquere die gelöschte Seite rechtzeitig; die Wände sperren dich nicht körperlich ein.
Drahtharfenspieler|Drei Saiten schlagen nummeriert tief-mittel-hoch. Wechsle die Bahnen anhand der gestrichelten Vorschau und des sichtbaren Countdowns.
Krähenhirte|Drei Vogelschwärme kreuzen markierte Bahnen. Lies die gestrichelten Wege und überquere hinter dem Leitvogel.
Kontobuchegel|Papiersiegel verlangsamen markierte Spieler. Laufe durch einen Reinigungskreis oder warte; es wird keine Währung gestohlen.
Salzpatriarch|Eine Salzgrenze rückt in drei Schritten ein. Nutze eines der breiten Tore; eine Paktplatte verzögert den nächsten Schritt.
Kettenkoloss|Drei Pylone ziehen ein markiertes Bodenstück. Zerstöre einen für ein Schadensfenster oder nutze die freie Außenbahn.
Beinhausleviathan|Drei Rippen werden nacheinander zu Schwachpunkten. Triff die markierte Rippe und meide die dicke Körperkontur.
Glockendrillinge|Drei Hüter wirken abwechselnd. Triff den hervorgehobenen, um einen Strahl zu stoppen; eine sichere Lücke bleibt stets.
Quarantäneherz|Vier Schläuche spritzen zu den Wänden. Halte ein Ventil, um einen Strahl zum Kern umzuleiten, oder greife von der offenen Seite an.
Kronenprozession|Vier Diener tragen einen beweglichen Thron. Besiege einen, um ihn zu senken, oder nutze die planmäßige Rast.
Stadtfresser|Zwei Bissbahnen lassen einen breiten Fluchtweg. Nutze ihn und die Erholung; zerstöre vorübergehende Wände, um den Kern freizulegen.
Heiliger des letzten Atems|Sanftes Einsaugen geht langsamen Ringen voraus. Nutze eine Schutzplatte oder steuere nach außen; allein reicht eine Platte.
Sanduhrwitwe|Ein langsamer Kugelfächer wiederholt seinen Weg nach einem Countdown. Beachte die gestrichelte Vorschau oder bleibe an der sicheren Flanke.
Lichtloser Astronom|Zwei kreisende Gefahren umgeben eine harmlose sichere Markierung. Folge deren hohler Umlaufbahn und meide die festen Gefahren.
Gefalteter Mann|Eine Bodenfalte spiegelt Kugeln einmal. Lies Ein- und Austrittsbahn oder bleibe auf der ungespiegelten Seite.
Roter Komet|Drei Wegpunktsprünge hinterlassen nacheinander verblassende Spuren. Folge den Nummern und überquere die älteste verblasste Spur.
Erinnerungsbesteuerer|Drei Symbole zeigen sichere Platten vor einem Puls. Wähle das erste über die sichtbare Verlaufsliste; Auswendiglernen ist freiwillig.
Mottenchor|Drei gebogene Mottenbänder haben eine sichtbar aufgebrochene Querung. Nutze diese Öffnung statt der geschlossenen Bänder.
Nullstundendirigent|Vier sichtbare Takte lösen wechselnde Bahnen aus. Folge Taktpunkten und Sicherheitsmarkierung; Hören ist nicht erforderlich.
Wandelnder Stadtbezirk|Zwei Baublöcke gleiten auf markierten Bahnen und legen den Kern frei. Nutze den Außenweg oder die Mitte nach ihrem Halt.
Der letzte Klopfer|Drei sichtbare Klopfer kündigen einen Türschwenk an. Gehe hinter das Scharnier und greife während der offenen Ruhephase an.`,
'pt-BR': `O cobrador de pedágio|Uma roda de moedas rebate na parede e volta. Siga os dois trechos da seta e atravesse depois que passar.
Guardião da lanterna|Um cone estreito de faíscas gira na lanterna. Siga atrás dele pela abertura segura marcada.
Caça-ratos|Matilhas seguem três rastros. Rompa o saco marcado para interromper uma ou cruze entre os rastros.
Escrivão da quarentena|Três carimbos numerados ativam em sequência. Entre no primeiro quando ele for apagado e ficar seguro.
Marechal das correntes|Duas âncoras varrem setores com correntes. Use um quadrante livre ou destrua uma âncora.
Viúva do portão|Duas grades fecham suas pistas e uma abre. Siga o contorno aberto e o próximo aviso de trinco.
Ambulância negra|Ela circula, para numa estação e investe. Evite o destino e ataque o motorista durante a recuperação.
Cirurgião de vidro|Agulhas formam um polígono perigoso com um lado faltando. Saia pela abertura antes da ativação.
Padeiro de cinzas|Pães lentos se dividem em duas migalhas ao cair. Evite os círculos e as duas direções marcadas.
Guardião da comporta|Correntes alternadas empurram sem dano. Use faixas secas ou nade contra a corrente enquanto esquiva.
Último chefe de estação|Sinais alternam o perigo entre dois trilhos. Siga os símbolos de cruz e seta, além da cor.
O acendedor de lampiões|Três velas deixam sombras seguras antes de um pulso. Entre numa sombra marcada e fique dentro.
O anatomista|Pinças atingem duas posições fixadas após um atraso. Saia dos círculos quando o ícone de alvo mudar.
Jardineiro da peste|Quatro vinhas radiais crescem; uma vira caminho de cura. Use-a ou destrua uma raiz para encurtar o crescimento.
Abadessa vermelha|Dois santuários móveis protegem da onda que se aproxima. Alcance um deles e segure a placa neutralizadora.
Juiz vespertino|Um veredito marca metade da arena para um golpe. Cruze o centro durante o aviso; a outra metade fica livre.
Capataz de brasas|Três áreas se preparam para soltar vapor. Use o interruptor de resfriamento ou o terceiro setor seguro.
Mergulhador do canal|Mergulha em poças e emerge da primeira a borbulhar. Evite esse anel e ataque ao reaparecer.
Consertador de relógios|Um anel lento para e volta na mesma direção. Atravesse antes do fim do aviso de três batidas.
Costureira de arames|Três âncoras criam uma cerca em zigue-zague com porta fixa. Use a porta ou quebre uma âncora para remover seu arame.
Coveiro|Uma crista de terra bloqueia balas e depois desaba em covas. Abrigue-se brevemente e saia da rota de queda.
Notário de tinta|Uma espiral incompleta endurece e causa dano. Saia pela boca visível antes da ativação, sem cruzar o traço.
Apicultor de esporos|Três drones preparam um enxame. Destrua um para abrir uma faixa ou use a brecha permanente.
Guardião do gelo|Três faixas geladas provocam deslizamento lateral limitado. Fique no seco; a esquiva normal continua disponível.
Barqueiro das pontes|Duas pontes alternam sobre água perigosa. Siga a seta aberta ou o desvio externo seguro.
Enlutada de porcelana|Quatro fragmentos de máscara servem de cobertura e depois explodem. Afaste-se assim que começarem a rachar.
Cuidador da caldeira|Três válvulas acumulam pressão. Segure uma neutra para abrir uma faixa segura ou use a brecha externa marcada.
Coveiro do espelho|Um reflexo inofensivo copia uma posição antiga. Ache o corpo real pela marca preta nos pés e ignore o contorno vazio.
Magistrado de giz|Um retângulo tem três paredes perigosas e uma apagada. Cruze a apagada durante o aviso; as paredes não prendem fisicamente.
Harpista de arames|Três cordas atacam na ordem numerada grave-média-aguda. Troque de faixa seguindo a linha tracejada e a contagem visual.
Pastor de corvos|Três bandos cruzam rotas marcadas. Leia os traços e atravesse atrás da ave da frente.
Sanguessuga do livro-caixa|Selos de papel deixam alvos lentos. Cruze um círculo de limpeza ou espere; nenhuma moeda é roubada.
Patriarca do sal|Uma borda de sal avança em três etapas. Use um dos portões largos; uma placa do Pacto atrasa o próximo avanço.
Colosso das correntes|Três pilares puxam uma parte do chão. Destrua qualquer um para abrir dano ou use a faixa externa livre.
Leviatã do ossuário|Três costelas viram pontos fracos em ordem. Ataque a exposta e fique fora do contorno grosso do corpo.
Trigêmeos dos sinos|Três guardiões atacam por turnos. Acerte o destacado para interromper um raio; sempre resta uma brecha segura.
Coração da quarentena|Quatro mangueiras disparam às paredes. Segure uma válvula para virar um jato ao núcleo ou ataque pelo lado aberto.
Procissão da coroa|Quatro servos carregam um trono móvel. Derrote qualquer um para baixá-lo ou ataque durante a parada prevista.
Devorador de cidades|Duas mordidas deixam um corredor largo. Use o caminho livre e ataque na recuperação; quebre paredes temporárias para expor o núcleo.
Santo do último suspiro|Uma inspiração puxa levemente antes dos anéis lentos. Use um abrigo ou force para fora; solo precisa de uma placa só.
Viúva da ampulheta|Um leque lento repete sua rota após a contagem. Veja os traços da repetição ou use o flanco seguro permanente.
Astrônomo sem luz|Dois perigos orbitam uma marca segura inofensiva. Siga a órbita da marca vazia e evite as sólidas.
Homem dobrado|Uma dobra no chão reflete balas uma vez. Leia os dois trechos previstos ou fique no lado sem reflexão.
Cometa vermelho|Três avanços deixam rastros que apagam em ordem. Siga os números e cruze o rastro mais antigo apagado.
Cobrador de memórias|Três símbolos indicam placas seguras antes de um pulso. Escolha o primeiro pelo histórico visível; decorar é opcional.
Coro das mariposas|Três fitas curvas deixam uma passagem rompida visível. Atravesse essa falha, evitando as fitas inteiras.
Maestro da hora zero|Quatro batidas visíveis liberam faixas alternadas. Siga os pontos e a marca segura; não é preciso ouvir o ritmo.
Distrito ambulante|Dois blocos de prédios se movem e expõem o núcleo. Use o desvio externo ou o centro após assentarem.
O último batedor|Três batidas visíveis vêm antes de uma porta girar. Vá atrás da dobradiça e ataque enquanto ela fica aberta.`,
id: `Pemungut Tol|Roda koin memantul dari dinding lalu kembali. Baca kedua bagian panah dan menyeberang setelah roda lewat.
Penjaga Lentera|Kerucut percikan sempit berputar di lentera. Bergerak di belakangnya melalui celah aman bertanda.
Penangkap Tikus|Kawanan tikus mengikuti tiga jejak. Hancurkan karung bertanda untuk menghentikan kawanan, atau lewat di antara jejak.
Juru Tulis Karantina|Tiga cap bernomor aktif berurutan. Masuki cap pertama saat dihapus menjadi zona aman.
Marsekal Rantai|Dua jangkar dinding menyapu sektor dengan rantai. Gunakan kuadran kosong atau hancurkan jangkar.
Janda Gerbang|Dua jalur pintu jeruji menutup dan satu terbuka. Ikuti garis jalur terbuka dan isyarat gerendel berikutnya.
Ambulans Hitam|Ia berkeliling, berhenti di pos, lalu menerjang. Hindari tujuan dan serang pengemudi saat pemulihan.
Ahli Bedah Kaca|Jarum kaca membentuk poligon berbahaya dengan satu sisi terbuka. Keluar melalui sisi itu sebelum aktif.
Pembuat Roti Abu|Roti lambat pecah menjadi dua remah setelah mendarat. Hindari lingkaran pendaratan dan kedua arah pecahan.
Penjaga Pintu Air|Arus bergantian mendorong tanpa melukai. Gunakan jalur kering atau lawan arus sambil mengelak peluru.
Kepala Stasiun Terakhir|Sinyal memindah bahaya di antara dua rel. Ikuti simbol silang dan panah, bukan warna saja.
Penyala Lampu|Tiga lilin memberi kantong bayangan aman sebelum denyut. Masuki kantong bergaris dan tetap di dalamnya.
Ahli Anatomi|Kaliper menghantam dua posisi terkunci setelah jeda. Tinggalkan lingkaran saat ikon kuncian berubah.
Tukang Kebun Wabah|Empat sulur tumbuh radial lalu satu menjadi jalan pemulihan. Gunakan jalur potong atau hancurkan akar untuk mempercepatnya.
Abdis Merah|Dua tempat perlindungan bergerak menahan gelombang masuk. Capai salah satu dan tahan pelat penetralnya.
Hakim Senja|Putusan menandai separuh arena untuk serangan. Seberangi tengah saat peringatan; separuh lain tetap terbuka.
Mandor Bara|Tiga zona bersiap membuang uap. Gunakan sakelar pendingin netral atau sektor ketiga yang aman.
Penyelam Kanal|Ia menyelam dan muncul di genangan yang lebih dahulu bergelembung. Jauhi cincin itu lalu serang saat pulih.
Tukang Jam|Cincin peluru lambat berhenti lalu bergerak searah lagi. Seberangi sebelum isyarat tiga ketukan selesai.
Penjahit Kawat|Tiga jangkar membentuk pagar zigzag dengan pintu tetap. Gunakan pintu atau hancurkan jangkar untuk menghilangkan kawatnya.
Penggali Kubur|Punggung tanah bergerak menahan peluru lalu runtuh menjadi lubang. Berlindung sebentar dan tinggalkan jalur runtuh.
Notaris Tinta|Spiral tinta terbuka mengeras menjadi bahaya. Keluar lewat mulutnya sebelum aktif, bukan melintasi garisnya.
Peternak Lebah Spora|Tiga drone menyiapkan kawanan. Hancurkan satu untuk membuka celah atau gunakan celah cadangan permanen.
Penjaga Es|Tiga jalur es menyebabkan selip samping terbatas. Tetap di jalur kering; mengelak normal tetap tersedia.
Tukang Perahu Jembatan|Dua jembatan bergantian di atas air berbahaya. Ikuti panah terbuka atau jalur luar aman.
Pelayat Porselen|Empat pecahan topeng menjadi pelindung bergerak lalu pecah radial. Menjauh saat tanda retak mulai.
Penjaga Ketel|Tiga katup menumpuk tekanan. Tahan katup netral untuk celah aman atau ambil celah luar bertanda.
Pengurus Jenazah Cermin|Pantulan tak berbahaya meniru posisi lama. Temukan tubuh asli lewat tanda kaki hitam dan abaikan garis berongga.
Hakim Kapur|Persegi panjang memiliki tiga dinding berbahaya dan satu terhapus. Lewati sisi terhapus saat peringatan; dinding tidak mengurung fisik.
Pemain Harpa Kawat|Tiga senar menyerang berurutan rendah-tengah-tinggi bernomor. Pindah jalur mengikuti garis putus dan hitungan visual.
Penggembala Gagak|Tiga kawanan burung menyeberangi jejak bertanda. Baca garis putus dan menyeberang di belakang burung terdepan.
Lintah Buku Besar|Segel kertas memperlambat sasaran. Lewati lingkar pembersih atau tunggu; mata uang tidak pernah dicuri.
Patriark Garam|Batas garam maju dalam tiga tahap. Gunakan salah satu gerbang lebar; pelat Perjanjian dapat menunda tahap berikut.
Raksasa Rantai|Tiga pilar menarik lantai bertanda. Hancurkan satu untuk celah serang atau gunakan jalur luar bebas.
Leviatan Tulang|Tiga rusuk menjadi titik lemah berurutan. Serang rusuk terbuka dan jauhi garis tubuh tebal.
Kembar Tiga Lonceng|Tiga penjaga menyerang bergiliran. Pukul yang disorot untuk membatalkan sinar; celah aman selalu ada.
Jantung Karantina|Empat selang memancar ke dinding. Tahan katup untuk membalik aliran ke inti atau serang dari sisi terbuka.
Arak-arakan Mahkota|Empat pelayan mengangkat takhta bergerak. Kalahkan satu untuk menurunkannya atau serang saat istirahat terjadwal.
Pemakan Kota|Dua jalur gigitan menyisakan koridor lebar. Gunakan koridor bebas dan masa pulih; hancurkan tembok sementara untuk membuka inti.
Santo Napas Terakhir|Tarikan lembut mendahului cincin embusan lambat. Gunakan pelat lindung atau bergerak keluar; solo cukup satu pelat.
Janda Jam Pasir|Kipas lambat mengulang jalur setelah hitungan mundur. Baca jejak putus-putus atau gunakan sisi aman tetap.
Astronom Tanpa Cahaya|Dua bahaya mengorbit penanda aman tak berbahaya. Ikuti orbit penanda berongga dan hindari yang padat.
Manusia Terlipat|Lipatan lantai memantulkan peluru sekali. Baca dua segmen prediksi atau tetap di sisi tanpa pantulan.
Komet Merah|Tiga luncuran meninggalkan jejak yang memudar berurutan. Ikuti nomor dan seberangi jejak tertua yang sudah pudar.
Pemungut Ingatan|Tiga simbol menunjukkan pelat aman sebelum denyut. Pilih simbol pertama lewat riwayat HUD; menghafal tidak wajib.
Paduan Ngengat|Tiga pita ngengat melengkung memiliki celah putus yang jelas. Menyeberang di celah, bukan pita utuh.
Dirigen Jam Nol|Empat ketukan terlihat melepas serangan jalur bergantian. Ikuti titik ketukan dan penanda aman; suara tidak diperlukan.
Distrik Berjalan|Dua blok bangunan bergeser dan membuka inti. Gunakan jalan luar atau tengah setelah blok berhenti.
Pengetuk Terakhir|Tiga ketukan terlihat mendahului ayunan pintu. Bergerak di belakang engsel dan serang saat pintu terbuka.`,
'zh-Hans': `收税人|钱币巨轮撞墙反弹后返回。看清地面两段箭头，等巨轮经过再穿越。
提灯守卫|狭窄火花锥围绕提灯旋转。跟在后方，沿标记的安全扇区移动。
捕鼠人|鼠群沿三条气味路线前进。击破标记鼠袋可中断下一群，或从路线之间穿过。
隔离书记官|三个编号印章依次启动。首个印章被擦除后会变安全，及时进入其中。
锁链元帅|两个墙锚将锁链扫过标记区域。躲入未扫象限，或摧毁锚点扩大缺口。
城门寡妇|三条闸门通道中两条关闭、一条开启。沿开门轮廓通行，留意下一次门闩提示。
黑色救护车|绕场移动，在标记站点停下后冲锋。避开目标位置，在恢复时攻击暴露的车夫。
玻璃外科医生|玻璃针围成危险多边形，但缺少一条边。在启动前从缺口逃出。
灰烬面包师|慢速面包落地后分裂成两块碎屑。避开落点圆圈和两条分裂方向。
水闸看守|交替水流只会横向推动，不造成伤害。站在干燥高台，或逆流移动并躲避弹丸。
末代站长|信号交替封锁两条铁轨。跟随叉号与箭头判断安全，不能只看颜色。
点灯人|三根蜡烛在脉冲前投下安全阴影。进入描边阴影区，保持在边界内。
解剖学家|卡尺延迟攻击两个已锁定位置。锁定图标变化后离开固定圆圈。
瘟疫园丁|四条放射藤蔓生长后，一条会切开成为治疗小径。走小径，或击破根部缩短生长期。
红衣女院长|两个移动圣所抵挡向内涌来的波浪。抵达任一个，并站住其净化踏板。
晚祷法官|判决标记半边场地，随后重击。预警时跨过中央线，另一半始终开放。
余烬工头|三个工区准备喷气。使用中立冷却开关，或前往天然安全的第三扇区。
运河潜水员|潜入三处水洼，从最先冒泡的一处浮出。避开扩散圈，在浮出后的恢复期攻击。
修钟匠|慢速弹环暂停后沿原方向恢复。趁静止穿过，在三拍提示结束前离开。
铁丝裁缝|三个锚点形成折线围栏，留有固定门口。穿门，或摧毁锚点移除相连铁丝。
掘墓人|移动土脊可挡敌弹，随后塌成地坑。短暂借掩护，再离开标记塌陷路线。
墨水公证人|未闭合的墨水螺旋会硬化为危险。启动前从开口出去，不要横穿笔画。
孢子养蜂人|三只蜂巢无人机准备释放虫群。击破一只打开扇区，或使用永久保留的缺口。
寒冰保管员|三条冰带造成有限的侧向滑动。走干燥条带；正常闪避仍然可用。
桥梁摆渡人|两座临时桥交替跨越危险水带。沿开放箭头通行，或走安全外围绕道。
瓷面哀悼者|四块面具碎片先作移动掩体，再碎裂成放射攻击。出现开裂预警就远离。
锅炉看守|三个阀门积蓄压力。站住任一中立阀门可打开安全扇区，也可走标记外围缺口。
镜面殡葬师|无害倒影复制先前位置。通过脚下黑色标记辨认真身，忽略空心倒影轮廓。
粉笔裁判官|矩形三面墙将闪击，一面先被擦除。预警时从擦除面离开；墙体不会以碰撞困住玩家。
铁丝竖琴师|三根弦按低、中、高编号顺序攻击。依据下一弦虚线和可视倒计时切换通道。
牧鸦人|三队鸟群沿交叉路径飞行。看清虚线路线，从领头鸟身后穿过。
账本水蛭|纸封印使目标减速。穿过任一净化圈或等减速结束；不会偷走货币。
盐之族长|盐界分三步向内收缩。穿过任一宽门，契约踏板可暂缓下一步。
锁链巨像|三个柱点拉动标记地面。击破任一个可制造输出窗口，也可沿畅通外围移动。
骨堂利维坦|三根肋骨依编号先后暴露弱点。集火暴露肋骨，避开粗线身体轮廓。
钟声三胞胎|三个守钟人轮流施法。攻击高亮施法者可打断光束，未打断也始终有安全缺口。
隔离之心|四根软管朝墙面喷流。站住阀门将一股水流反送核心，或从保证开放的一侧攻击。
王冠巡游|四名侍从抬着王座移动。击倒任一个可让王座落下，或在定时休息时攻击。
吞城者|两条咬击路线之间留有宽逃生道。走未标记通道并在恢复期输出，打破临时墙可暴露核心。
最后呼吸之圣|轻微吸力后释放慢速呼气弹环。利用任一避难踏板或向外移动，单人只需一个踏板。
沙漏寡妇|慢速扇弹在倒计时后沿原路径重放一次。看清虚线预告，或留在恒定安全侧翼。
无光天文学家|两个绕行危险围绕无害安全标记运转。沿空心标记轨道移动，避开实心危险。
折叠人|地面折线使弹丸镜向反射一次。看清预测的入射与出射线，或待在不反射的一侧。
红色彗星|连续冲过三个固定点，轨迹按生成顺序变安全。跟随编号，穿过最早淡去的轨迹。
记忆征税官|脉冲前展示三个安全踏板符号。按界面保留的历史选择首个符号，无须强记。
飞蛾合唱团|三条弯曲蛾带中有一处明确断口。从断口横穿，不要穿过完整蛾带。
零时指挥家|四个可见节拍依次释放交替通道攻击。跟随节拍圆点与安全通道标记，无须听音辨拍。
行走城区|两块建筑沿标记路线移动并露出核心。走外围绕道，或等落定后穿过中央。
最后叩门者|三次可见叩击后，门体扫过标记扇区。移动到铰链后方，在门打开的恢复期攻击。`,
'zh-Hant': `收稅人|錢幣巨輪撞牆反彈後返回。看清地面兩段箭頭，等巨輪經過再穿越。
提燈守衛|狹窄火花錐圍繞提燈旋轉。跟在後方，沿標記的安全扇區移動。
捕鼠人|鼠群沿三條氣味路線前進。擊破標記鼠袋可中斷下一群，或從路線之間穿過。
隔離書記官|三個編號印章依次啟動。首個印章被擦除後會變安全，及時進入其中。
鎖鏈元帥|兩個牆錨將鎖鏈掃過標記區域。躲入未掃象限，或摧毀錨點擴大缺口。
城門寡婦|三條閘門通道中兩條關閉、一條開啟。沿開門輪廓通行，留意下一次門閂提示。
黑色救護車|繞場移動，在標記站點停下後衝鋒。避開目標位置，在恢復時攻擊暴露的車夫。
玻璃外科醫師|玻璃針圍成危險多邊形，但缺少一條邊。在啟動前從缺口逃出。
灰燼麵包師|慢速麵包落地後分裂成兩塊碎屑。避開落點圓圈和兩條分裂方向。
水閘看守|交替水流只會橫向推動，不造成傷害。站在乾燥高臺，或逆流移動並躲避彈丸。
末代站長|訊號交替封鎖兩條鐵軌。跟隨叉號與箭頭判斷安全，不能只看顏色。
點燈人|三根蠟燭在脈衝前投下安全陰影。進入描邊陰影區，保持在邊界內。
解剖學家|卡尺延遲攻擊兩個已鎖定位置。鎖定圖示變化後離開固定圓圈。
瘟疫園丁|四條放射藤蔓生長後，一條會切開成為治療小徑。走小徑，或擊破根部縮短生長期。
紅衣女院長|兩個移動聖所抵擋向內湧來的波浪。抵達任一個，並站住其淨化踏板。
晚禱法官|判決標記半邊場地，隨後重擊。預警時跨過中央線，另一半始終開放。
餘燼工頭|三個工區準備噴氣。使用中立冷卻開關，或前往天然安全的第三扇區。
運河潛水員|潛入三處水窪，從最先冒泡的一處浮出。避開擴散圈，在浮出後的恢復期攻擊。
修鐘匠|慢速彈環暫停後沿原方向恢復。趁靜止穿過，在三拍提示結束前離開。
鐵絲裁縫|三個錨點形成折線圍欄，留有固定門口。穿門，或摧毀錨點移除相連鐵絲。
掘墓人|移動土脊可擋敵彈，隨後塌成地坑。短暫借掩護，再離開標記塌陷路線。
墨水公證人|未閉合的墨水螺旋會硬化為危險。啟動前從開口出去，不要橫穿筆畫。
孢子養蜂人|三隻蜂巢無人機準備釋放蟲群。擊破一隻打開扇區，或使用永久保留的缺口。
寒冰保管員|三條冰帶造成有限的側向滑動。走乾燥條帶；正常閃避仍然可用。
橋樑擺渡人|兩座臨時橋交替跨越危險水帶。沿開放箭頭通行，或走安全外圍繞道。
瓷面哀悼者|四塊面具碎片先作移動掩體，再碎裂成放射攻擊。出現開裂預警就遠離。
鍋爐看守|三個閥門積蓄壓力。站住任一中立閥門可打開安全扇區，也可走標記外圍缺口。
鏡面殯葬師|無害倒影複製先前位置。透過腳下黑色標記辨認真身，忽略空心倒影輪廓。
粉筆裁判官|矩形三面牆將閃擊，一面先被擦除。預警時從擦除面離開；牆體不會以碰撞困住玩家。
鐵絲豎琴師|三根弦按低、中、高編號順序攻擊。依據下一弦虛線和可視倒數切換通道。
牧鴉人|三隊鳥群沿交叉路徑飛行。看清虛線路線，從領頭鳥身後穿過。
帳本水蛭|紙封印使目標減速。穿過任一淨化圈或等減速結束；不會偷走貨幣。
鹽之族長|鹽界分三步向內收縮。穿過任一寬門，契約踏板可暫緩下一步。
鎖鏈巨像|三個柱點拉動標記地面。擊破任一個可製造輸出窗口，也可沿暢通外圍移動。
骨堂利維坦|三根肋骨依編號先後暴露弱點。集火暴露肋骨，避開粗線身體輪廓。
鐘聲三胞胎|三個守鐘人輪流施法。攻擊醒目施法者可打斷光束，未打斷也始終有安全缺口。
隔離之心|四根軟管朝牆面噴流。站住閥門將一股水流反送核心，或從保證開放的一側攻擊。
王冠巡遊|四名侍從抬著王座移動。擊倒任一個可讓王座落下，或在定時休息時攻擊。
吞城者|兩條咬擊路線之間留有寬逃生道。走未標記通道並在恢復期輸出，打破臨時牆可暴露核心。
最後呼吸之聖|輕微吸力後釋放慢速呼氣彈環。利用任一避難踏板或向外移動，單人只需一個踏板。
沙漏寡婦|慢速扇彈在倒數後沿原路徑重播一次。看清虛線預告，或留在固定安全側翼。
無光天文學家|兩個繞行危險圍繞無害安全標記運轉。沿空心標記軌道移動，避開實心危險。
摺疊人|地面摺線使彈丸鏡向反射一次。看清預測的入射與出射線，或待在不反射的一側。
紅色彗星|連續衝過三個固定點，軌跡按生成順序變安全。跟隨編號，穿過最早淡去的軌跡。
記憶徵稅官|脈衝前展示三個安全踏板符號。按介面保留的歷史選擇首個符號，無須強記。
飛蛾合唱團|三條彎曲蛾帶中有一處明確斷口。從斷口橫穿，不要穿過完整蛾帶。
零時指揮家|四個可見節拍依次釋放交替通道攻擊。跟隨節拍圓點與安全通道標記，無須聽音辨拍。
行走城區|兩塊建築沿標記路線移動並露出核心。走外圍繞道，或等落定後穿過中央。
最後叩門者|三次可見叩擊後，門體掃過標記扇區。移動到鉸鏈後方，在門打開的恢復期攻擊。`,
ja: `通行税の番人|硬貨の車輪が壁で一度跳ね返る。二段の矢印を読み、通過した後に横切ろう。
ランタンの守人|狭い火花の扇形が灯りを回る。後方の印付き安全範囲について進もう。
ネズミ捕り|ネズミの群れが三本の臭い道を進む。印の袋を壊して次の群れを止めるか、道の間を通ろう。
隔離の書記|番号付きの印が三つ順に発動する。最初の印が消えたら安全地帯になるので入ろう。
鎖の元帥|壁の二つの錨から鎖が扇状に動く。掃かれない区画へ逃げるか錨を壊そう。
門の未亡人|三本の格子通路のうち二本が閉じる。開いた道の輪郭と次のかんぬき合図を見よう。
黒い救急馬車|外周を回り、印の停車場から突進する。到着点を避け、停止後に露出した御者を狙おう。
硝子の外科医|硝子の針が一辺の欠けた危険な多角形を作る。発動前に欠けた辺から出よう。
灰のパン職人|遅いパンが着地後に二つの欠片へ分裂する。着地点と二本の分裂予告線を避けよう。
水門守|交互の水流は横へ押すが、それ自体は無害。乾いた高所を使うか流れに逆らい弾を避けよう。
最後の駅長|二本の線路の危険が信号で交代する。色だけでなく、バツと矢印を見よう。
灯火師|三本のろうそくが波動の前に安全な影を作る。輪郭のある影へ入り、範囲内に留まろう。
解剖学者|固定された二地点を遅れてキャリパーが挟む。照準固定アイコンが変わったら円から出よう。
疫病の庭師|放射状の四本の蔓のうち一本が回復路になる。刈られた道を使うか根を壊し成長を短縮しよう。
赤い修道院長|二つの動く聖域が内向きの波を防ぐ。どちらかへ入り、中和パッドに留まろう。
夕祷の裁判官|判決で戦場の半分が攻撃される。予告中に中央線を越えれば、反対側は安全だ。
燃え殻の現場監督|三つの作業区が蒸気を放つ。冷却スイッチを使うか、自然に安全な第三の区画へ行こう。
運河の潜水夫|三つの水たまりへ潜り、最初に泡立った場所から出る。その円を避け、浮上後の隙を狙おう。
時計直し|遅い弾環が止まり、同じ方向に再開する。三拍の合図が終わる前に止まった環を抜けよう。
針金の縫い手|三つの錨が固定の出入口付きジグザグ柵を作る。入口を使うか錨を壊して線を消そう。
墓掘り|動く土の尾根は敵弾を防ぎ、その後穴に崩れる。短く隠れ、崩壊予告の道から離れよう。
墨の公証人|開いた墨の螺旋が硬化して危険になる。発動前に線をまたがず、口の部分から出よう。
胞子の養蜂家|三体の蜂が群れを準備する。一体を倒して大きな隙間を作るか、常設の逃げ道を使おう。
氷の管理人|三本の氷帯では横滑りが起こる。乾いた帯を使おう。通常の回避は常に使える。
橋の渡し守|危険な水帯に二つの橋が交互に開く。開いた矢印か安全な外周の迂回路を使おう。
磁器の弔い人|四つの面片は動く盾となり、割れると放射攻撃になる。ひびの予告が出たら離れよう。
ボイラー守|三つの弁が圧力をためる。中立の弁を保持して安全扇形を開くか、外側の隙間を使おう。
鏡の葬儀屋|無害な鏡像が過去の位置をまねる。黒い足元の印で本体を見つけ、空洞の輪郭は無視しよう。
白墨の判事|長方形の三辺が攻撃され、一辺が消える。予告中に消えた辺を越えよう。壁の衝突で閉じ込められない。
針金のハープ弾き|三本の弦が低・中・高の番号順に鳴る。次の破線と視覚カウントを読み、隣の道へ動こう。
カラスの牧人|三つの群れが交差路を飛ぶ。破線を読み、先頭の鳥が通った後ろを横切ろう。
帳簿のヒル|紙の封印が対象を減速させる。浄化の円を通るか期限を待とう。通貨は盗まれない。
塩の族長|塩の境界が三段階で内へ寄る。二つの広い門を使い、盟約パッドで次の段階を遅らせよう。
鎖の巨像|三本の柱が印の床を引く。どれかを壊して攻撃機会を作るか、開けた外周へ逃げよう。
納骨堂のリヴァイアサン|三本の肋骨が番号順に弱点になる。露出した肋骨へ集中し、太い胴体輪郭の外にいよう。
鐘の三つ子|三人の番人が交代で詠唱する。強調された者を攻撃すれば光線を止められる。失敗しても安全な隙間は残る。
隔離の心臓|四本の管が壁へ噴射する。弁を保持して噴流を核へ返すか、開いた側から攻撃しよう。
王冠の行列|四人が玉座を運ぶ。一人を倒して玉座を下げるか、定期休止中に攻撃しよう。
街喰い|二本の噛みつき路の間に広い逃げ道が残る。そこを使って休止中に攻撃し、仮設壁を壊して核を露出させよう。
最期の息の聖人|弱い吸引の後に遅い弾環を吐く。避難パッドか外向き移動を使おう。ソロは一枚だけでよい。
砂時計の未亡人|遅い扇弾が予告後に同じ軌道を再演する。破線を読むか、常に安全な側面にいよう。
灯なき天文学者|二つの危険が無害な安全マーカーの周囲を回る。中空マーカーの軌道を追い、塗られた危険を避けよう。
折り畳まれた男|床の折線で弾が一度鏡向きに反射する。予測された前後の道を読むか、反射しない側にいよう。
赤い彗星|三地点への突進跡が作られた順に無害になる。番号を読み、最古の消えた跡を横切ろう。
記憶の徴税人|三つの記号が波動前の安全パッドを示す。画面の履歴で最初の記号を選ぼう。暗記は不要。
蛾の合唱団|三本の曲がる蛾の帯に、見える切れ目ができる。帯を突っ切らず、切れ目から渡ろう。
零時の指揮者|見える四拍が交互のレーン攻撃を起こす。拍点と安全印を見よう。音を聞く必要はない。
歩く街区|二つの建物が印の道を動き、核が現れる。外周を回るか、停止後に開いた中央を使おう。
最後のノッカー|見える三回のノック後に扉が扇状に開く。蝶番の後ろへ動き、開いた後の隙を狙おう。`,
ko: `통행세 징수자|동전 바퀴가 벽에 튕겨 돌아옵니다. 두 구간 화살표를 읽고 바퀴가 지난 뒤 건너세요.
등불 수호자|좁은 불꽃 부채꼴이 등불 주위를 돕니다. 뒤쪽에 표시된 안전 구역을 따라가세요.
쥐잡이|쥐 무리가 세 냄새 길을 따릅니다. 표시된 자루를 부숴 무리를 끊거나 길 사이로 건너세요.
격리 서기관|번호가 매겨진 세 도장이 차례로 발동합니다. 첫 도장이 지워져 안전해지면 그곳으로 들어가세요.
사슬 원수|벽의 두 닻에서 사슬이 표시 구역을 훑습니다. 훑지 않는 사분면으로 가거나 닻을 부수세요.
성문의 미망인|세 쇠창살 통로 중 두 곳이 닫힙니다. 열린 통로 윤곽과 다음 빗장 신호를 따르세요.
검은 구급마차|외곽을 돌고 정류장에 멈춘 뒤 돌진합니다. 도착 지점을 피하고 회복 중 노출된 마부를 공격하세요.
유리 외과의|유리 바늘이 한 변이 빠진 위험한 다각형을 만듭니다. 발동하기 전에 빈 변으로 빠져나가세요.
재의 제빵사|느린 빵이 착지 후 두 부스러기로 갈라집니다. 착지 원과 두 갈래 예고 방향을 피하세요.
수문지기|번갈아 흐르는 물은 피해 없이 옆으로 밉니다. 마른 높은 길을 쓰거나 물살을 거슬러 탄환을 피하세요.
마지막 역장|신호가 두 선로의 위험을 바꿉니다. 색뿐 아니라 가위표와 화살표를 보세요.
점등사|세 촛불이 파동 전에 안전한 그림자를 만듭니다. 테두리 안으로 들어가 머무세요.
해부학자|지연된 캘리퍼가 고정된 두 위치를 칩니다. 조준 고정 아이콘이 바뀌면 원에서 나가세요.
역병 정원사|방사형 덩굴 넷이 자란 뒤 하나가 치유 길로 바뀝니다. 잘린 길을 쓰거나 뿌리를 부숴 성장을 줄이세요.
붉은 수녀원장|움직이는 두 성역이 안쪽으로 오는 파동을 막습니다. 하나에 도착해 중화 발판을 지키세요.
저녁 기도의 판사|판결이 전장 절반을 표시한 뒤 공격합니다. 경고 중 중앙을 건너면 반대편은 열려 있습니다.
잿불 감독관|세 작업 구역이 증기를 준비합니다. 중립 냉각 스위치나 원래 안전한 세 번째 구역을 쓰세요.
운하 잠수부|세 웅덩이에 잠수하고 가장 먼저 거품 나는 곳에서 나옵니다. 그 원을 피한 뒤 부상 회복 때 공격하세요.
시계 수선공|느린 탄환 고리가 멈춘 뒤 같은 방향으로 재개됩니다. 세 박자 신호가 끝나기 전에 건너세요.
철사 재봉사|세 닻이 고정 출입구가 있는 지그재그 울타리를 만듭니다. 문으로 가거나 닻을 부숴 철사를 지우세요.
무덤 파는 자|움직이는 흙 능선이 적탄을 막은 뒤 구덩이로 무너집니다. 잠시 숨고 붕괴 표시 경로를 떠나세요.
잉크 공증인|열린 잉크 나선이 굳으며 위험해집니다. 발동 전 선을 넘지 말고 열린 입구로 나가세요.
포자 양봉가|세 벌 드론이 무리를 준비합니다. 하나를 파괴해 틈을 열거나 항상 남는 틈을 쓰세요.
얼음 관리인|세 얼음 띠가 제한된 옆 미끄러짐을 만듭니다. 마른 띠를 쓰세요. 일반 회피는 계속 가능합니다.
다리 뱃사공|위험한 물길 위 두 다리가 번갈아 열립니다. 열린 화살표나 안전한 바깥 우회로를 따르세요.
도자기 조문객|가면 조각 넷이 움직이는 엄폐물 뒤 방사형 위험이 됩니다. 금이 가기 시작하면 물러나세요.
보일러 관리인|세 밸브에 압력이 쌓입니다. 중립 밸브를 지켜 안전 부채꼴을 열거나 표시된 외곽 틈을 쓰세요.
거울 장의사|무해한 반영이 옛 위치를 복사합니다. 발밑 검은 표시로 진짜를 찾고 빈 윤곽은 무시하세요.
분필 치안관|직사각형 세 벽이 번쩍이고 한 벽은 지워집니다. 경고 중 지운 벽으로 건너세요. 벽은 물리적으로 가두지 않습니다.
철사 하프 연주자|세 줄이 낮음·중간·높음 번호순으로 공격합니다. 다음 줄 점선과 시각 초읽기를 보고 통로를 바꾸세요.
까마귀 목자|세 새 무리가 교차 경로를 납니다. 점선을 읽고 선두 새 뒤로 건너세요.
장부 거머리|종이 봉인이 대상의 속도를 늦춥니다. 정화 원을 지나거나 기다리세요. 화폐는 빼앗지 않습니다.
소금 족장|소금 경계가 세 단계로 좁아집니다. 넓은 문 둘 중 하나를 쓰고 서약 발판으로 다음 단계를 늦추세요.
사슬 거상|세 기둥이 표시된 땅을 끌어당깁니다. 하나를 부숴 공격 기회를 만들거나 열린 외곽을 쓰세요.
납골당 레비아탄|갈비뼈 셋이 번호순으로 약점을 드러냅니다. 열린 갈비뼈에 집중하고 굵은 몸 윤곽 밖에 머무세요.
종의 세쌍둥이|세 지기가 번갈아 시전합니다. 강조된 시전자를 쳐 광선을 끊으세요. 실패해도 안전 틈은 남습니다.
격리의 심장|호스 넷이 벽으로 분출합니다. 밸브를 지켜 한 줄기를 핵으로 돌리거나 열린 쪽에서 공격하세요.
왕관 행렬|네 시종이 왕좌를 옮깁니다. 누구든 쓰러뜨려 왕좌를 내리거나 정해진 휴식 때 공격하세요.
도시 포식자|두 깨물기 경로 사이에 넓은 탈출로가 남습니다. 그 길과 회복 틈을 쓰고 임시 벽을 부숴 핵을 드러내세요.
마지막 숨의 성인|약한 들숨 끌림 뒤 느린 날숨 고리가 옵니다. 대피 발판이나 바깥 이동을 쓰세요. 혼자는 하나면 됩니다.
모래시계 미망인|느린 부채꼴이 초읽기 뒤 같은 길을 반복합니다. 예고 점선을 보거나 고정 안전 측면에 머무세요.
빛 없는 천문학자|두 위험이 무해한 안전 표식을 돕니다. 빈 표식의 궤도를 따르고 꽉 찬 위험을 피하세요.
접힌 남자|바닥 접힘선이 탄환을 한 번 반사합니다. 들어오고 나가는 예측선을 읽거나 반사 없는 쪽에 머무세요.
붉은 혜성|세 지점 돌진 흔적이 생긴 순서로 안전해집니다. 번호를 따라 가장 오래되어 흐려진 흔적을 건너세요.
기억 징수자|세 기호가 파동 전 안전 발판을 보여줍니다. 화면 기록에서 처음 기호를 고르세요. 암기는 필요 없습니다.
나방 합창단|세 굽은 나방 띠 중 한 곳이 끊깁니다. 온전한 띠 대신 보이는 틈을 건너세요.
영시 지휘자|보이는 네 박자가 번갈아 통로 공격을 냅니다. 박자 점과 안전 표식을 보세요. 소리는 필요 없습니다.
걸어 다니는 구역|건물 블록 둘이 표시 경로를 옮겨 핵을 드러냅니다. 외곽으로 돌거나 정착 후 열린 중앙을 쓰세요.
마지막 문 두드리는 자|보이는 세 번의 노크 후 문이 표시 구역을 휩씁니다. 경첩 뒤로 가서 문이 열린 회복 때 공격하세요.`,
ru: `Сборщик пошлин|Монетное колесо отражается от стены и возвращается. Читайте оба отрезка стрелки и пересекайте путь после его прохода.
Хранитель фонаря|Узкий конус искр вращается вокруг фонаря. Идите следом по отмеченному безопасному сектору.
Крысолов|Стаи следуют по трём следам запаха. Разбейте отмеченный мешок, чтобы прервать стаю, или проходите между следами.
Карантинный писарь|Три пронумерованные печати срабатывают по очереди. Войдите в первую, когда она сотрётся и станет безопасной.
Цепной маршал|Два стенных якоря проводят цепями по секторам. Укройтесь в свободном квадранте или уничтожьте якорь.
Вдова ворот|Два прохода закрываются решётками, один открывается. Следуйте открытому контуру и сигналу следующего засова.
Чёрная скорая|Кружит, останавливается у станции и бросается вперёд. Избегайте точки назначения и бейте возницу во время отдыха.
Стеклянный хирург|Иглы образуют опасный многоугольник с одной открытой стороной. Выйдите через неё до активации.
Пепельный пекарь|Медленные буханки после приземления делятся на две крошки. Избегайте кругов посадки и обеих отмеченных линий разделения.
Смотритель шлюза|Сменяющиеся течения толкают без урона. Идите по сухим полосам или против течения, уклоняясь от пуль.
Последний начальник станции|Сигналы меняют опасность между двумя путями. Следите за крестом и стрелкой, а не только цветом.
Фонарщик|Три свечи создают безопасные тени перед импульсом. Встаньте в очерченную тень и оставайтесь внутри.
Анатом|Циркуль с задержкой бьёт по двум зафиксированным позициям. Уйдите из кругов после смены значка захвата цели.
Чумной садовник|Четыре лозы растут лучами, затем одна становится лечебной тропой. Идите по срезанной полосе или разбейте корень.
Красная аббатиса|Два движущихся святилища защищают от входящей волны. Дойдите до любого и удерживайте нейтрализующую плиту.
Вечерний судья|Приговор отмечает половину арены для удара. Пересеките центр во время предупреждения; другая половина свободна.
Угольный бригадир|Три участка готовятся выпустить пар. Используйте нейтральный охладитель или безопасный третий сектор.
Канальный ныряльщик|Ныряет в лужи и выходит из первой забурлившей. Избегайте её кольца и атакуйте при всплытии.
Часовщик|Медленное кольцо пуль останавливается и продолжает в ту же сторону. Пересеките его до конца трёх ударов отсчёта.
Проволочная швея|Три якоря создают зигзагообразный забор с постоянным проходом. Используйте проход или уничтожьте якорь вместе с проволокой.
Могильщик|Движущийся земляной гребень задерживает пули, затем рушится в ямы. Укройтесь ненадолго и покиньте отмеченный путь обвала.
Чернильный нотариус|Незамкнутая чернильная спираль твердеет и ранит. Выйдите через её устье до активации, не пересекая черту.
Споровый пчеловод|Три трутня готовят рой. Уничтожьте одного ради широкого просвета или используйте постоянный запасной выход.
Ледяной смотритель|Три ледяные полосы дают ограниченное боковое скольжение. Держитесь сухого; обычное уклонение работает всегда.
Мостовой паромщик|Два моста чередуются над опасной водой. Следуйте открытой стрелке или безопасному обходу снаружи.
Фарфоровая плакальщица|Четыре осколка маски служат укрытием, затем взрываются по кругу. Отходите при предупреждении о трещинах.
Котельщик|Три клапана накапливают давление. Удержите любой нейтральный клапан для безопасного сектора или идите к внешнему просвету.
Зеркальный гробовщик|Безвредное отражение копирует прошлую позицию. Ищите настоящее тело по чёрной метке у ног и игнорируйте полый контур.
Меловой магистрат|У прямоугольника три опасные стенки и одна стёртая. Пересеките стёртую при предупреждении; физической ловушки нет.
Проволочный арфист|Три струны бьют в порядке низкая-средняя-высокая. Меняйте полосы по пунктирной подсказке и видимому отсчёту.
Вороний пастух|Три стаи пересекают отмеченные пути. Читайте пунктир и проходите за ведущей птицей.
Учётная пиявка|Бумажные печати замедляют цели. Пройдите круг очищения или дождитесь конца; валюта не похищается.
Соляной патриарх|Соляная граница сужается в три шага. Используйте любые широкие ворота; плита Пакта задерживает следующий шаг.
Цепной колосс|Три пилона тянут отмеченный участок пола. Разбейте любой ради окна урона или используйте свободную внешнюю полосу.
Левиафан костницы|Три ребра становятся уязвимыми по номерам. Бейте открытое ребро и держитесь вне толстого контура тела.
Колокольные тройняшки|Три хранителя атакуют по очереди. Бейте выделенного, чтобы прервать луч; безопасный просвет остаётся всегда.
Сердце карантина|Четыре шланга бьют к стенам. Удержите клапан, чтобы повернуть струю к ядру, или атакуйте с открытой стороны.
Коронная процессия|Четыре слуги несут подвижный трон. Победите любого, чтобы опустить его, или бейте во время планового отдыха.
Пожиратель городов|Две линии укуса оставляют широкий коридор. Используйте его и время отдыха; ломайте временные стены, открывая ядро.
Святой последнего вздоха|Мягкое втягивание предшествует медленным кольцам выдоха. Используйте укрытие или двигайтесь наружу; одному достаточно одной плиты.
Вдова песочных часов|Медленный веер повторяет путь после отсчёта. Читайте пунктир повтора или держитесь постоянного безопасного фланга.
Незажжённый астроном|Две опасности вращаются вокруг безопасного полого маркера. Следуйте его орбите и избегайте сплошных фигур.
Сложенный человек|Складка пола один раз отражает пули. Читайте оба отрезка предсказанного пути или оставайтесь на неотражённой стороне.
Красная комета|Три рывка оставляют следы, гаснущие по порядку. Следуйте номерам и пересекайте самый старый потухший след.
Сборщик воспоминаний|Три знака показывают безопасные плиты перед импульсом. Выберите первый по истории на экране; запоминать необязательно.
Хор мотыльков|В трёх изогнутых лентах мотыльков появляется видимый разрыв. Пересекайте его, а не целые ленты.
Дирижёр нулевого часа|Четыре видимых удара запускают сменные полосы. Следуйте точкам ритма и безопасной метке; слух не требуется.
Ходячий район|Два блока домов сдвигаются по меткам и открывают ядро. Обходите снаружи или проходите центр после остановки.
Последний стучащий|Три видимых стука предшествуют взмаху двери. Зайдите за петлю и атакуйте во время открытого отдыха.`,
hi: `चुंगी वसूलने वाला|सिक्कों का पहिया दीवार से टकराकर लौटता है। तीर के दोनों हिस्से देखें और पहिया निकलने पर पार करें।
लालटेन रक्षक|चिंगारियों का संकरा शंकु लालटेन के चारों ओर घूमता है। उसके पीछे चिह्नित सुरक्षित हिस्से में चलें।
चूहे पकड़ने वाला|चूहों के झुंड तीन गंध पथों पर चलते हैं। चिह्नित बोरा तोड़कर झुंड रोकें या पथों के बीच से निकलें।
क्वारंटीन लिपिक|तीन क्रमांकित मुहरें क्रम से चलती हैं। पहली मिटकर सुरक्षित हो जाए तो उसमें जाएँ।
जंजीर मार्शल|दीवार के दो लंगर चिह्नित क्षेत्रों में जंजीर घुमाते हैं। खाली चौथाई में रहें या लंगर तोड़ें।
द्वार की विधवा|दो जाली वाले पथ बंद होते हैं, एक खुलता है। खुले पथ की रूपरेखा और अगला कुंडी संकेत देखें।
काली एम्बुलेंस|घूमकर स्टेशन पर रुकती और धावा बोलती है। गंतव्य से दूर रहें और आराम के समय चालक पर हमला करें।
काँच शल्यचिकित्सक|काँच की सुइयाँ एक खुली भुजा वाला खतरनाक बहुभुज बनाती हैं। सक्रिय होने से पहले उसी से निकलें।
राख बेकर|धीमी रोटियाँ गिरकर दो टुकड़ों में बँटती हैं। गिरने के घेरे और दोनों चिह्नित विभाजन दिशाएँ छोड़ें।
जलद्वार रक्षक|बदलती धाराएँ बिना नुकसान बगल में धकेलती हैं। सूखी पट्टियाँ लें या धारा के विरुद्ध चलकर गोलियों से बचें।
आखिरी स्टेशन मास्टर|संकेत दो रेल पथों पर खतरा बदलते हैं। सिर्फ रंग नहीं, क्रॉस और तीर चिह्न देखें।
दीप जलाने वाला|तीन मोमबत्तियाँ स्पंदन से पहले सुरक्षित छाया बनाती हैं। चिह्नित छाया में जाएँ और उसकी सीमा में रहें।
शरीर-विज्ञानी|देर से लगने वाला कैलिपर दो तय स्थानों पर वार करता है। लक्ष्य लॉक चिह्न बदले तो घेरों से निकलें।
प्लेग माली|चार बेलें बढ़ती हैं, फिर एक उपचार पथ बनती है। कटा पथ लें या जड़ तोड़कर वृद्धि छोटी करें।
लाल मठाध्यक्ष|दो चलते पवित्र आश्रय भीतर आती लहर रोकते हैं। किसी एक तक पहुँचकर निष्क्रियकारी पट्टी पर रहें।
सांझ न्यायाधीश|फैसला आधे मैदान पर वार तय करता है। चेतावनी में बीच पार करें; दूसरा आधा खुला रहता है।
अंगार पर्यवेक्षक|तीन कार्य क्षेत्र भाप छोड़ने वाले हैं। तटस्थ शीतलन स्विच या स्वाभाविक सुरक्षित तीसरा क्षेत्र लें।
नहर गोताखोर|पोखरों में डूबकर पहले बुलबुले वाले से निकलता है। उस घेरे से हटें, फिर ऊपर आने के आराम में हमला करें।
घड़ी सुधारक|धीमा गोली घेरा रुककर उसी दिशा में फिर चलता है। तीन ताल के संकेत समाप्त होने से पहले पार करें।
तार दर्जिन|तीन लंगर स्थिर दरवाज़े वाली टेढ़ी बाड़ बनाते हैं। दरवाज़ा लें या लंगर तोड़कर जुड़ा तार हटाएँ।
कब्र खोदने वाला|चलती मिट्टी की धार गोलियाँ रोककर गड्ढों में टूटती है। थोड़ी आड़ लें, फिर चिह्नित गिरावट पथ छोड़ें।
स्याही नोटरी|खुली स्याही सर्पिल कठोर होकर खतरा बनती है। सक्रिय होने से पहले रेखा पार किए बिना खुले मुँह से निकलें।
बीजाणु मधुमक्खीपालक|तीन ड्रोन झुंड तैयार करते हैं। एक तोड़कर चौड़ा रास्ता खोलें या हमेशा खुले विकल्प से जाएँ।
हिम संरक्षक|तीन बर्फ़ पट्टियों पर सीमित बगल फिसलन होती है। सूखी पट्टियाँ लें; सामान्य चकमा उपलब्ध रहता है।
पुल का नाविक|खतरनाक पानी पर दो पुल बारी-बारी खुलते हैं। खुले तीर या सुरक्षित बाहरी रास्ते का पालन करें।
चीनी मिट्टी की शोककर्ता|चार मुखौटा टुकड़े चलती आड़ बनकर चारों ओर टूटते हैं। दरार चेतावनी शुरू होते ही हटें।
बॉयलर सेवक|तीन वाल्व दबाव बनाते हैं। किसी तटस्थ वाल्व पर रुककर सुरक्षित हिस्सा खोलें या बाहरी चिह्नित जगह लें।
दर्पण शवसंस्कारक|हानिरहित प्रतिबिंब पुरानी जगह की नकल करता है। पैर के काले चिह्न से असली शरीर पहचानें, खोखली रूपरेखा छोड़ें।
खड़िया मजिस्ट्रेट|आयत की तीन दीवारें चमकती हैं और एक मिटती है। चेतावनी में मिटे हिस्से से निकलें; भौतिक कैद नहीं होती।
तार वीणावादक|तीन तार नीचे-मध्य-ऊपर क्रमांक में वार करते हैं। अगली बिंदीदार रेखा और दृश्य गिनती देखकर पथ बदलें।
कौवा चरवाहा|तीन पक्षी झुंड काटते रास्तों पर चलते हैं। बिंदीदार पथ पढ़ें और आगे के पक्षी के पीछे पार करें।
बहीखाता जोंक|कागज़ की मुहरें लक्ष्य धीमा करती हैं। शुद्धि घेरे में जाएँ या अवधि बीतने दें; मुद्रा नहीं चुरती।
नमक पितामह|नमक सीमा तीन चरणों में सिकुड़ती है। चौड़े द्वार लें; संधि पट्टी अगला चरण कुछ देर रोकती है।
जंजीर महाकाय|तीन खंभे चिह्नित फ़र्श खींचते हैं। कोई एक तोड़कर हमला अवसर बनाएँ या खुला बाहरी पथ लें।
अस्थि लेवायथन|तीन पसलियाँ क्रमांक में कमज़ोर भाग बनती हैं। खुली पसली पर वार करें और मोटी शरीर रूपरेखा से बाहर रहें।
घंटे के त्रिक|तीन रक्षक बारी से मंत्र चलाते हैं। चमकते रक्षक को मारकर किरण रोकें; सुरक्षित खाली जगह हमेशा रहती है।
क्वारंटीन हृदय|चार नलियाँ दीवारों की ओर बहती हैं। वाल्व रोककर धारा केंद्र की ओर मोड़ें या खुले पक्ष से हमला करें।
मुकुट जुलूस|चार सेवक चलता सिंहासन उठाते हैं। किसी एक को हराकर उसे नीचे लाएँ या तय विश्राम में हमला करें।
नगर भक्षक|दो काटने के पथ चौड़ा निकास छोड़ते हैं। वही लें और विश्राम में वार करें; अस्थायी दीवार तोड़कर केंद्र खोलें।
आखिरी साँस का संत|हल्के खिंचाव के बाद धीमे साँस घेरे आते हैं। आश्रय पट्टी लें या बाहर चलें; अकेले एक पट्टी पर्याप्त है।
रेतघड़ी विधवा|धीमा पंखा गिनती बाद उसी रास्ते पर दोहरता है। बिंदीदार पूर्वानुमान देखें या स्थिर सुरक्षित किनारे रहें।
अंधकार खगोलविद|दो घूमते खतरे हानिरहित सुरक्षित चिह्न को घेरते हैं। खोखले चिह्न की कक्षा पर चलें, भरे खतरों से बचें।
मुड़ा आदमी|फ़र्श की मोड़ रेखा गोलियाँ एक बार प्रतिबिंबित करती है। दोनों अनुमानित भाग पढ़ें या बिना प्रतिबिंब वाले पक्ष में रहें।
लाल धूमकेतु|तीन बिंदु धावे क्रम से मिटती धार छोड़ते हैं। क्रमांक देखें और सबसे पुराना फीका पथ पार करें।
स्मृति करदाता|तीन चिह्न स्पंदन से पहले सुरक्षित पट्टियाँ दिखाते हैं। स्क्रीन इतिहास से पहला चिह्न चुनें; याद करना आवश्यक नहीं।
पतंगा गायक मंडली|तीन मुड़ी पतंगा पट्टियों में साफ़ टूटा रास्ता बनता है। पूरी पट्टियों की जगह उसी छेद से पार करें।
शून्यकाल संचालक|चार दिखती तालें बदलते पथ हमले चलाती हैं। ताल बिंदु और सुरक्षित चिह्न देखें; सुनना आवश्यक नहीं।
चलता ज़िला|दो इमारत खंड चिह्नित पथ पर हटकर केंद्र खोलते हैं। बाहर घूमें या रुकने बाद खुले बीच से जाएँ।
आखिरी दस्तकदाता|तीन दिखती दस्तक बाद दरवाज़ा चिह्नित हिस्से में घूमता है। कब्जे के पीछे जाएँ और खुले विश्राम में हमला करें।`,
ar: `جامع الرسوم|ترتد عجلة نقود عن الجدار وتعود. اقرأ جزأي السهم واعبر بعد مرورها.
حارس الفانوس|يدور مخروط ضيق من الشرر حول الفانوس. تحرك خلفه عبر القطاع الآمن المحدد.
صائد الجرذان|تتبع القطعان ثلاثة مسارات رائحة. اكسر الكيس المحدد لقطع قطيع، أو اعبر بين المسارات.
كاتب الحجر|تتنشط ثلاثة أختام مرقمة بالترتيب. ادخل الختم الأول حين يُمحى ويصبح آمنًا.
مارشال السلاسل|تمسح سلسلتان قطاعات محددة انطلاقًا من مرساتين. استخدم ربعًا لا يُمسح أو دمّر مرساة.
أرملة البوابة|يُغلق ممران بالشبك ويُفتح الثالث. اتبع حدود الممر المفتوح وإشارة المزلاج التالية.
الإسعاف الأسود|يدور ويتوقف عند محطة ثم يندفع. تجنب الوجهة واضرب السائق المكشوف أثناء التعافي.
جرّاح الزجاج|تشكل الإبر مضلعًا خطرًا ينقصه ضلع. اخرج من الفتحة قبل التفعيل.
خباز الرماد|تنقسم الأرغفة البطيئة إلى فتاتين بعد السقوط. تجنب دوائر الهبوط واتجاهي الانقسام المحددين.
حارس السد|تدفع تيارات متناوبة جانبيًا بلا ضرر. استخدم الشرائط الجافة أو قاوم التيار مع تفادي الرصاص.
آخر ناظر محطة|تبدّل الإشارات الخطر بين سكتين. اتبع رمزي التقاطع والسهم، لا اللون وحده.
مُشعل المصابيح|تلقي ثلاث شمعات ظلالًا آمنة قبل النبضة. ادخل ظلًا محددًا وابقَ ضمن حدوده.
عالم التشريح|تضرب ملاقط متأخرة موقعين ثابتين. غادر الدوائر بعد تغير رمز تثبيت الهدف.
بستاني الطاعون|تنمو أربع كروم شعاعية ثم يتحول واحد إلى طريق شفاء. استخدمه أو دمّر جذرًا لتقصير النمو.
رئيسة الدير الحمراء|يحمي ملاذان متحركان من موجة داخلة. بلغ أيهما واثبت على لوح التحييد.
قاضي المساء|يحدد الحكم نصف الساحة لضربة. اعبر الوسط أثناء التحذير؛ النصف الآخر يبقى مفتوحًا.
مشرف الجمر|تستعد ثلاث مناطق لنفث البخار. استخدم مفتاح التبريد المحايد أو القطاع الثالث الآمن بطبيعته.
غواص القناة|يغوص في البرك ويخرج من أولها فقاعات. ابتعد عن الحلقة واضرب أثناء تعافيه بعد الصعود.
مصلح الساعات|تتوقف حلقة رصاص بطيئة ثم تتابع الاتجاه نفسه. اعبر قبل نهاية إشارة الدقات الثلاث.
خياطة الأسلاك|تشكل ثلاث مراسٍ سياجًا متعرجًا بباب ثابت. اعبر الباب أو اكسر مرساة لإزالة سلكها.
حفار القبور|تمنع حافة ترابية متحركة الرصاص ثم تنهار إلى حفر. احتمِ قليلًا ثم غادر مسار الانهيار.
موثق الحبر|يتصلب لولب حبر غير مغلق ليصبح خطرًا. اخرج من فمه الظاهر قبل التفعيل بدل عبور الخط.
نحّال الأبواغ|تجهز ثلاث طائرات خلية سربًا. دمّر واحدة لفتح قطاع أو استخدم الفتحة الاحتياطية الدائمة.
قيّم الجليد|تسبب ثلاثة شرائط جليدية انزلاقًا جانبيًا محدودًا. ابقَ على الجاف؛ المراوغة العادية متاحة دائمًا.
ملّاح الجسور|يتناوب جسران فوق ماء خطر. اتبع سهم الفتح أو الالتفاف الخارجي الآمن.
النائحة الخزفية|تصبح أربع شظايا قناع غطاءً متحركًا ثم تتشقق إلى خطر شعاعي. ابتعد عند بدء إنذار التشقق.
راعي المرجل|يتراكم الضغط عبر ثلاثة صمامات. اثبت عند صمام محايد لفتح قطاع آمن، أو استخدم الفجوة الخارجية المحددة.
متعهد المرآة|يقلد انعكاس غير مؤذٍ موقعًا قديمًا. اعرف الجسد الحقيقي من العلامة السوداء عند القدم وتجاهل المحيط المجوف.
قاضي الطباشير|تومض ثلاثة أضلاع من مستطيل ويُمحى الرابع. اعبر الضلع الممحى أثناء التحذير؛ الجدران لا تحبسك ماديًا.
عازف قيثارة الأسلاك|تضرب ثلاثة أوتار بترتيب منخفض ووسط وعالٍ مرقم. بدّل المسار وفق الخط المتقطع والعد المرئي.
راعي الغربان|تعبر ثلاثة أسراب مسارات متقاطعة. اقرأ الخطوط المتقطعة واعبر خلف الطائر القائد.
علقة السجل|تبطئ أختام الورق الأهداف. اعبر دائرة تطهير أو انتظر انتهاء الأثر؛ لا تُسرق العملات.
بطريرك الملح|يتقدم حد الملح إلى الداخل بثلاث خطوات. استخدم إحدى البوابتين العريضتين؛ لوح الميثاق يؤخر الخطوة التالية.
عملاق السلاسل|تسحب ثلاثة أعمدة جزءًا محددًا من الأرض. دمّر أي عمود لفتح فرصة ضرر أو استخدم المسار الخارجي الخالي.
لوياثان العظام|تنكشف ثلاثة أضلاع كنقاط ضعف بالترتيب. ركز الضلع المكشوف وابقَ خارج محيط الجسد السميك.
ثلاثية الأجراس|يلقي ثلاثة حراس بالتناوب. اضرب الحارس المميز لقطع شعاع؛ تظل فجوة آمنة حتى دون مقاطعة.
قلب الحجر|تضخ أربعة خراطيم نحو الجدران. اثبت عند صمام لعكس تيار نحو القلب، أو هاجم من الجانب المفتوح.
موكب التاج|يحمل أربعة خدم عرشًا متحركًا. اهزم أي خادم لإنزاله أو اضرب خلال استراحته المقررة.
آكل المدن|يترك مسارا عض ممر هروب واسعًا. استخدمه واضرب أثناء التعافي؛ اكسر الجدران المؤقتة لكشف القلب.
قديس النفس الأخير|يسبق سحب لطيف حلقات زفير بطيئة. استخدم لوح ملجأ أو تحرك للخارج؛ يكفي لوح واحد للفردي.
أرملة الساعة الرملية|تعيد مروحة بطيئة المسار نفسه بعد العد. اقرأ مسارات الإعادة المتقطعة أو استخدم الجناح الآمن الدائم.
الفلكي المظلم|يدور خطران حول علامة آمنة غير مؤذية. اتبع مدار العلامة المجوفة وتجنب العلامات المصمتة.
الرجل المطوي|تعكس طية أرضية الرصاص مرة بزاوية مرآتية. اقرأ جزأي المسار المتوقع أو ابقَ في الجانب غير المنعكس.
المذنب الأحمر|تترك ثلاث اندفاعات آثارًا تزول حسب ترتيبها. اتبع الأرقام واعبر أقدم أثر باهت.
جابي الذكريات|تحدد ثلاثة رموز ألواحًا آمنة قبل النبضة. اختر الرمز الأول من السجل المرئي؛ الحفظ غير مطلوب.
جوقة العث|تترك ثلاثة أشرطة منحنية فتحة مقطوعة بوضوح. اعبر من القطع لا من الأشرطة المتصلة.
قائد ساعة الصفر|تطلق أربع دقات مرئية مسارات متناوبة. اتبع نقاط الإيقاع وعلامة الأمان؛ سماع النغم غير لازم.
الحي السائر|يتحرك مبنيان على مسارات محددة ويكشفان القلب. التف من الخارج أو اعبر الوسط بعد استقرارهما.
الطارق الأخير|تسبق ثلاث طرقات مرئية تأرجح باب محدد. تحرك خلف المفصلة واضرب خلال استراحة الباب المفتوح.`,
bn: `টোল আদায়কারী|মুদ্রার চাকা দেয়ালে ধাক্কা খেয়ে ফেরে। তীরের দুই অংশ পড়ুন এবং চাকা গেলে পার হন।
লণ্ঠন রক্ষক|সরু স্ফুলিঙ্গ শঙ্কু লণ্ঠনের চারপাশে ঘোরে। পেছনের চিহ্নিত নিরাপদ অংশে চলুন।
ইঁদুর ধরিয়ে|ইঁদুরের দল তিন গন্ধপথ মানে। চিহ্নিত থলে ভেঙে দল থামান বা পথের মাঝ দিয়ে যান।
সংগনিরোধ কেরানি|তিন নম্বরযুক্ত সিল ক্রমে সক্রিয় হয়। প্রথমটি মুছে নিরাপদ হলে সেখানে যান।
শিকল সেনাপতি|দুই দেয়াল-নোঙর থেকে শিকল অঞ্চল ঝাড়ে। অক্ষত চতুর্থাংশে যান বা নোঙর ভাঙুন।
ফটকের বিধবা|দুই জালদরজার পথ বন্ধ, একটি খোলে। খোলা পথের রেখা ও পরের খিলের সংকেত দেখুন।
কালো অ্যাম্বুল্যান্স|ঘুরে স্টেশনে থেমে ধেয়ে আসে। গন্তব্য এড়ান এবং বিশ্রামে চালককে আঘাত করুন।
কাচের শল্যচিকিৎসক|কাচের সুই এক পাশ খোলা বিপজ্জনক বহুভুজ বানায়। সক্রিয় হওয়ার আগে ফাঁক দিয়ে বের হন।
ছাইয়ের রুটিওয়ালা|ধীর রুটি পড়ে দুই টুকরো হয়। নামার বৃত্ত ও বিভাজনের দুই দিক এড়ান।
জলকপাট রক্ষক|বদলানো স্রোত ক্ষতি ছাড়া পাশে ঠেলে। শুকনো উঁচু পথ নিন বা স্রোতের বিপরীতে চলে গুলি এড়ান।
শেষ স্টেশনমাস্টার|সংকেত দুই রেলের বিপদ পাল্টায়। শুধু রং নয়, ক্রস ও তীর দেখুন।
বাতি জ্বালিয়ে|তিন মোমবাতি স্পন্দনের আগে নিরাপদ ছায়া ফেলে। চিহ্নিত ছায়ায় ঢুকে সীমানায় থাকুন।
অঙ্গসংস্থানবিদ|ক্যালিপার দেরিতে দুই স্থির অবস্থানে আঘাত করে। লক্ষ্য-বন্ধন চিহ্ন বদলালে বৃত্ত ছাড়ুন।
প্লেগ মালি|চার লতা বাড়ে, পরে একটি চিকিৎসার পথ হয়। কাটা পথ নিন বা শিকড় ভেঙে বৃদ্ধি ছোট করুন।
লাল মঠাধ্যক্ষা|দুই চলমান আশ্রয় ভেতরে আসা ঢেউ ঠেকায়। একটিতে পৌঁছে নিষ্ক্রিয়কারী পাত ধরে থাকুন।
সান্ধ্য বিচারক|রায়ে অর্ধেক মাঠে আঘাত আসে। সতর্কতায় মাঝ পার হন; অন্য অর্ধেক খোলা।
অঙ্গার তত্ত্বাবধায়ক|তিন কাজের অঞ্চল বাষ্প ছাড়বে। নিরপেক্ষ শীতল সুইচ বা স্বভাবত নিরাপদ তৃতীয় অঞ্চল নিন।
খালের ডুবুরি|জলাশয়ে ডুবে প্রথম বুদবুদ থেকে ওঠে। সেই বলয় ছাড়ুন, ওঠার পরে বিশ্রামে আঘাত করুন।
ঘড়ি সারিয়ে|ধীর গুলিবলয় থেমে একই দিকে চলে। তিন তাল সংকেত শেষের আগে পার হন।
তারের দর্জি|তিন নোঙর স্থির দরজাসহ আঁকাবাঁকা বেড়া বানায়। দরজা নিন বা নোঙর ভেঙে তার সরান।
কবর খনক|চলমান মাটির ঢিবি গুলি ঠেকিয়ে গর্তে ভাঙে। অল্প আড়াল নিন, পরে ধসের চিহ্নিত পথ ছাড়ুন।
কালির নোটারি|খোলা কালির সর্পিল শক্ত হয়ে বিপদ হয়। সক্রিয় হওয়ার আগে রেখা না ডিঙিয়ে মুখ দিয়ে বের হন।
স্পোর মৌচাষি|তিন ড্রোন ঝাঁক তৈরি করে। একটি ভেঙে ফাঁক খুলুন বা চিরখোলা বিকল্প নিন।
বরফের তত্ত্বাবধায়ক|তিন বরফপথে সীমিত পাশে পিছলানো হয়। শুকনো পথ নিন; সাধারণ এড়ানো চালু থাকে।
সেতুর মাঝি|বিপজ্জনক জলের ওপর দুই সেতু পালা করে খোলে। খোলা তীর বা নিরাপদ বাইরের পথ নিন।
চিনামাটির শোককারিণী|চার মুখোশখণ্ড চলমান আড়াল হয়ে পরে চারদিকে ফাটে। ফাটলের সতর্কতা শুরু হলে সরে যান।
বয়লার রক্ষক|তিন ভালভে চাপ জমে। নিরপেক্ষ ভালভ ধরে নিরাপদ অংশ খুলুন বা চিহ্নিত বাইরের ফাঁক নিন।
আয়নার সৎকারক|নিরীহ প্রতিবিম্ব পুরোনো স্থান নকল করে। পায়ের কালো চিহ্নে আসল দেহ চিনুন, ফাঁপা রেখা উপেক্ষা করুন।
খড়ির ম্যাজিস্ট্রেট|আয়তের তিন দেয়াল ঝলকায়, একটি মোছে। সতর্কতায় মোছা দিক পার হন; দেয়াল শারীরিকভাবে আটকায় না।
তারের বীণাবাদক|তিন তার নিচু-মাঝারি-উঁচু নম্বরক্রমে আঘাত করে। পরের ভাঙা রেখা ও দৃশ্য গণনা দেখে পথ পাল্টান।
কাকের রাখাল|তিন পাখিদল ছেদী পথে উড়ে। ভাঙা রেখা পড়ে প্রথম পাখির পিছনে পার হন।
খাতার জোঁক|কাগজের সিল লক্ষ্য ধীর করে। শোধনবৃত্তে যান বা অপেক্ষা করুন; মুদ্রা চুরি হয় না।
নুনের পিতামহ|নুনের সীমানা তিন ধাপে সংকুচিত হয়। চওড়া ফটক নিন; চুক্তির পাত পরের ধাপ দেরি করায়।
শিকলের দৈত্য|তিন স্তম্ভ চিহ্নিত মাটি টানে। একটি ভেঙে আঘাতের সুযোগ নিন বা খোলা বাইরের পথ নিন।
অস্থির লেভিয়াথান|তিন পাঁজর নম্বরক্রমে দুর্বল হয়। খোলা পাঁজরে আঘাত দিন এবং মোটা দেহরেখার বাইরে থাকুন।
ঘণ্টার ত্রয়ী|তিন রক্ষক পালা করে মন্ত্র চালায়। চিহ্নিত জনকে আঘাত করে রশ্মি থামান; নিরাপদ ফাঁক সবসময় থাকে।
সংগনিরোধের হৃদয়|চার নল দেয়ালে স্রোত ছোড়ে। ভালভ ধরে স্রোত কেন্দ্রে ফেরান বা খোলা পাশ থেকে আঘাত করুন।
মুকুট শোভাযাত্রা|চার ভৃত্য চলমান সিংহাসন বহে। একজন হারিয়ে নামান বা নির্দিষ্ট বিরতিতে আঘাত করুন।
নগরখাদক|দুই কামড়ের পথ বড় পালানোর রাস্তা রাখে। তা নিন ও বিশ্রামে আঘাত দিন; অস্থায়ী দেয়াল ভেঙে কেন্দ্র খুলুন।
শেষ নিঃশ্বাসের সাধু|হালকা টানের পরে ধীর বলয় আসে। আশ্রয়পাত নিন বা বাইরে চলুন; একার জন্য একটি পাত যথেষ্ট।
বালুঘড়ির বিধবা|ধীর পাখা গণনার পরে একই পথ ফেরে। ভাঙা পূর্বাভাস দেখুন বা স্থির নিরাপদ পাশে থাকুন।
অন্ধকার জ্যোতির্বিদ|দুই বিপদ নিরীহ নিরাপদ চিহ্ন ঘিরে ঘোরে। ফাঁপা চিহ্নের কক্ষপথ মানুন, ভরা বিপদ এড়ান।
ভাঁজ মানুষ|মাটির ভাঁজ গুলি একবার প্রতিফলিত করে। পূর্বাভাসের দুই অংশ পড়ুন বা অপ্রতিফলিত পাশে থাকুন।
লাল ধূমকেতু|তিন বিন্দুর ধাবন ক্রমে মুছে যাওয়া রেখা রাখে। নম্বর দেখুন ও পুরোনো ফিকে রেখা পার হন।
স্মৃতির কর আদায়কারী|তিন চিহ্ন স্পন্দনের আগে নিরাপদ পাত দেখায়। পর্দার ইতিহাসে প্রথম চিহ্ন বাছুন; মুখস্থ দরকার নেই।
মথের গায়কদল|তিন বাঁকা মথের ফিতায় স্পষ্ট ফাঁক হয়। অক্ষত ফিতা না ডিঙিয়ে সেই ফাঁক পার হন।
শূন্যঘণ্টার পরিচালক|চার দৃশ্য তাল পাল্টানো পথ আক্রমণ আনে। তাল বিন্দু ও নিরাপদ চিহ্ন দেখুন; শুনতে হয় না।
হাঁটা জেলা|দুই ভবনখণ্ড চিহ্নিত পথে সরে কেন্দ্র খোলে। বাইরে ঘুরুন বা থামার পরে মাঝ দিয়ে যান।
শেষ কড়া নাড়িয়ে|তিন দৃশ্য কড়ার পরে দরজা চিহ্নিত অংশে ঘোরে। কবজার পিছনে যান ও খোলা বিরতিতে আঘাত করুন।`,
ur: `چونگی وصول کنندہ|سکوں کا پہیہ دیوار سے پلٹتا ہے۔ تیر کے دونوں حصے دیکھیں اور پہیہ گزرے تو پار کریں۔
لالٹین محافظ|چنگاریوں کا تنگ مخروط لالٹین کے گرد گھومتا ہے۔ اس کے پیچھے نشان زدہ محفوظ حصے میں چلیں۔
چوہے پکڑنے والا|چوہوں کے غول تین بو کے راستوں پر چلتے ہیں۔ نشان زدہ تھیلا توڑ کر غول روکیں یا بیچ سے گزریں۔
قرنطینہ محرر|تین نمبر والی مہریں ترتیب سے چلتی ہیں۔ پہلی مٹ کر محفوظ ہو تو اس میں جائیں۔
زنجیر مارشل|دو دیواری لنگر زنجیریں علاقوں میں گھماتے ہیں۔ خالی چوتھائی میں رہیں یا لنگر توڑیں۔
دروازے کی بیوہ|دو جالی والے راستے بند اور ایک کھلتا ہے۔ کھلے راستے کی حد اور اگلا کنڈی اشارہ دیکھیں۔
کالی ایمبولینس|گھوم کر اڈے پر رکتی اور دھاوا بولتی ہے۔ منزل سے ہٹیں اور آرام کے وقت ڈرائیور کو ماریں۔
شیشے کا جراح|شیشے کی سوئیاں ایک کھلے ضلع والی خطرناک شکل بناتی ہیں۔ فعال ہونے سے پہلے اسی خلا سے نکلیں۔
راکھ کا نانبائی|آہستہ روٹیاں گر کر دو ٹکڑے ہوتی ہیں۔ گرنے کے دائرے اور دونوں بٹنے کی سمتیں چھوڑیں۔
آبی دروازے کا محافظ|بدلتی دھاریں بغیر نقصان پہلو میں دھکیلتی ہیں۔ خشک پٹیاں لیں یا دھارا کاٹ کر گولیوں سے بچیں۔
آخری اسٹیشن ماسٹر|اشارے دو ریلوں پر خطرہ بدلتے ہیں۔ صرف رنگ نہیں، کاٹ اور تیر کے نشان دیکھیں۔
چراغ جلانے والا|تین موم بتیاں لہر سے پہلے محفوظ سائے بناتی ہیں۔ نشان زدہ سائے میں جائیں اور حد میں رہیں۔
تشریح دان|دیر سے لگنے والا پرکار دو طے جگہوں کو مارتا ہے۔ نشانہ بند نشان بدلے تو دائروں سے نکلیں۔
طاعون باغبان|چار بیلیں بڑھتی ہیں، پھر ایک شفا کا راستہ بنتی ہے۔ کٹا راستہ لیں یا جڑ توڑ کر بڑھنا کم کریں۔
سرخ راہبہ سردار|دو چلتی پناہیں اندر آتی لہر روکتی ہیں۔ کسی ایک تک پہنچیں اور بے اثر تختی پر رہیں۔
شام کا منصف|فیصلہ آدھے میدان پر وار طے کرتا ہے۔ تنبیہ میں وسط پار کریں؛ دوسرا آدھا کھلا ہے۔
انگارے کا نگران|تین کام علاقے بھاپ چھوڑیں گے۔ غیر جانب دار ٹھنڈک سوئچ یا قدرتی محفوظ تیسرا علاقہ لیں۔
نہر غوطہ خور|جوہڑوں میں ڈوب کر پہلے بلبلے والی جگہ سے نکلتا ہے۔ دائرہ چھوڑیں پھر ابھرنے کی بحالی میں ماریں۔
گھڑی ساز|آہستہ گولی حلقہ رک کر اسی طرف چلتا ہے۔ تین تال اشارہ ختم ہونے سے پہلے پار کریں۔
تار درزن|تین لنگر مستقل دروازے والی ٹیڑھی باڑ بناتے ہیں۔ دروازہ لیں یا لنگر توڑ کر جڑا تار ہٹائیں۔
گورکن|چلتی مٹی کی منڈیر گولیاں روک کر گڑھوں میں گرتی ہے۔ مختصر آڑ لیں پھر نشان زدہ گرنے کا راستہ چھوڑیں۔
سیاہی کا محرر|کھلا سیاہی حلزون سخت ہو کر خطرہ بنتا ہے۔ لکیر پار کیے بغیر کھلے منہ سے نکلیں۔
تخموں کا شہدبان|تین ڈرون غول تیار کرتے ہیں۔ ایک توڑ کر چوڑا خلا کھولیں یا ہمیشہ کھلا متبادل لیں۔
برف کا محافظ|تین برف پٹیوں پر محدود پہلو پھسلن ہے۔ خشک پٹیاں لیں؛ عام بچاؤ دستیاب رہتا ہے۔
پل کا ملاح|خطرناک پانی پر دو پل باری باری کھلتے ہیں۔ کھلا تیر یا محفوظ بیرونی راستہ لیں۔
چینی مٹی کی سوگوار|چار نقاب ٹکڑے چلتی آڑ بن کر چاروں طرف پھٹتے ہیں۔ دراڑ کی تنبیہ شروع ہو تو ہٹیں۔
بوائلر خادم|تین والو دباؤ بھرتے ہیں۔ غیر جانب دار والو پر رک کر محفوظ حصہ کھولیں یا بیرونی خلا لیں۔
آئینے کا کفن ساز|بے ضرر عکس پچھلی جگہ نقل کرتا ہے۔ پاؤں کے سیاہ نشان سے اصل بدن پہچانیں، کھوکھلی حد چھوڑیں۔
چاک مجسٹریٹ|مستطیل کی تین دیواریں چمکتی، ایک مٹتی ہے۔ تنبیہ میں مٹا ضلع پار کریں؛ جسمانی قید نہیں ہوتی۔
تار کا بربط نواز|تین تار نیچی، درمیانی، اونچی نمبر ترتیب میں وار کرتے ہیں۔ اگلی ٹوٹی لکیر اور بصری گنتی سے راستہ بدلیں۔
کوؤں کا گڈریا|تین پرندہ غول کٹتے راستوں پر اڑتے ہیں۔ ٹوٹی لکیریں پڑھیں اور پہلے پرندے کے پیچھے پار کریں۔
بہی کھاتے کی جونک|کاغذی مہریں ہدف سست کرتی ہیں۔ صفائی دائرہ لیں یا مدت گزرنے دیں؛ سکے نہیں چرتے۔
نمک بزرگ|نمک حد تین قدم میں سکڑتی ہے۔ چوڑا دروازہ لیں؛ عہد تختی اگلا قدم کچھ دیر روکتی ہے۔
زنجیر کا دیو|تین ستون نشان زدہ فرش کھینچتے ہیں۔ کوئی ایک توڑ کر وار کا موقع لیں یا کھلا بیرونی راستہ لیں۔
ہڈیوں کا لیوایتھن|تین پسلیاں نمبر ترتیب میں کمزور ہوتی ہیں۔ کھلی پسلی ماریں اور موٹی بدن حد سے باہر رہیں۔
گھنٹوں کے تین جڑواں|تین محافظ باری سے حملہ کرتے ہیں۔ نمایاں کو مار کر شعاع روکیں؛ محفوظ خلا ہمیشہ رہتا ہے۔
قرنطینہ دل|چار نالیاں دیواروں کو بہاؤ دیتی ہیں۔ والو روک کر دھار مرکز موڑیں یا کھلے پہلو سے ماریں۔
تاج کا جلوس|چار خادم چلتا تخت اٹھاتے ہیں۔ کسی ایک کو ہرا کر نیچے لائیں یا طے آرام میں ماریں۔
شہر خور|دو کاٹنے کی راہیں چوڑا فرار چھوڑتی ہیں۔ وہ لیں اور بحالی میں ماریں؛ عارضی دیوار توڑ کر مرکز کھولیں۔
آخری سانس کا ولی|ہلکی کھنچاؤ کے بعد آہستہ حلقے نکلتے ہیں۔ پناہ تختی لیں یا باہر چلیں؛ اکیلے ایک کافی ہے۔
ریت گھڑی بیوہ|آہستہ پنکھا گنتی بعد وہی راستہ دہراتا ہے۔ پیش گوئی کی ٹوٹی لکیر دیکھیں یا مستقل محفوظ پہلو رہیں۔
بے نور ماہرِ فلک|دو گھومتے خطرے بے ضرر محفوظ نشان گھیرتے ہیں۔ کھوکھلے نشان کے مدار میں چلیں، بھرے خطروں سے بچیں۔
تہ شدہ آدمی|فرش کی تہ گولیاں ایک بار عکس بناتی ہے۔ آنے جانے کے دونوں اندازے پڑھیں یا بے عکس پہلو رہیں۔
سرخ دمدار ستارہ|تین نقطوں کے دھاوے ترتیب سے مٹتے نشان چھوڑتے ہیں۔ نمبر دیکھیں اور پرانا مدھم نشان پار کریں۔
یادوں کا محصول دار|تین نشان لہر سے پہلے محفوظ تختیاں دکھاتے ہیں۔ اسکرین تاریخ سے پہلا چنیں؛ یاد کرنا لازم نہیں۔
پروانوں کی نغمہ جماعت|تین خمیدہ پروانہ پٹیوں میں واضح ٹوٹا خلا ہے۔ پوری پٹی کے بجائے اسی سے پار کریں۔
صفر ساعت کا ناظم|چار دکھتی تالیں بدلتے راستوں کے وار چلاتی ہیں۔ تال نقطے اور محفوظ نشان دیکھیں؛ سننا ضروری نہیں۔
چلتا ضلع|دو عمارت ٹکڑے نشان زدہ راہوں پر ہٹ کر مرکز کھولتے ہیں۔ باہر گھومیں یا ٹھہرنے پر وسط سے گزریں۔
آخری دستک دینے والا|تین دکھتی دستکوں کے بعد دروازہ نشان زدہ حصے میں گھومتا ہے۔ قبضے کے پیچھے جائیں اور کھلے آرام میں ماریں۔`
};

export function expansionMessages(locale) {
  const text = authored[locale];
  if (!text) throw new Error(`Missing boss expansion locale: ${locale}`);
  const lines = text.trim().split('\n');
  if (lines.length !== bossExpansionIds.length) throw new Error(`${locale}: boss expansion has ${lines.length} rows; expected ${bossExpansionIds.length}`);
  const messages = {};
  lines.forEach((line,index) => {
    const parts = line.split('|');
    if (parts.length !== 2 || parts.some(x=>!x.trim())) throw new Error(`${locale}: invalid boss expansion row ${index+1}`);
    const id = bossExpansionIds[index];
    messages[`boss.${id}.name`] = parts[0].trim().normalize('NFC');
    messages[`boss.${id}.description`] = parts[1].trim().normalize('NFC');
  });
  return messages;
}
