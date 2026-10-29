// AI-authored translations; native-language acceptance remains open.
const keys=['medicReviveHealth','medicReviveBaby','medicReviveOne','reviveMedicOnly','reviveNobody',
  'regenReduced','regenOff','regenUnchanged','selfReviveHelp','selfReviveToggleHelp','waitMedicRevive',
  'waitTeammateRevive','reviveKitOneHealth','medicBabyShield','reviveRulesHelp','ordinaryReviveHealth'];
const rows={
en:[
 'Revived by a Medic: {health}% health.','Revived by a Medic: full health + a 20% maximum-health shield.','Revived by a Medic: 1 HP.',
 'Only Medics can revive themselves or teammates.','No revives, including Medic abilities and items.',
 'Passive health regeneration: {percent}% less for every class.','Passive health regeneration: disabled for every class.','Passive health regeneration: unchanged.',
 'Hold {binding} to revive yourself. Charges left: {count}.','Press {binding} to start or cancel self-revival. Charges left: {count}.',
 'Wait for a Medic to revive you.','Wait for a teammate to revive you.','Revive a downed teammate at 1 HP. Maximum carried: {maximum}.',
 'Medic revival also grants a shield worth 20% of the revived player’s maximum health.',
 'Self-revival uses a charge and a two-second channel. Medics can use it in a team; other classes only in Solo. Health recovers between fights.',
 'Revived by other classes: {health}% health.'
],
'zh-Hans':[
 '由医疗兵复活：恢复{health}%生命。','由医疗兵复活：满生命，另获得相当于最大生命20%的护盾。','由医疗兵复活：恢复1点生命。',
 '只有医疗兵可以自救或复活队友。','禁止一切复活，包括医疗兵技能和道具。',
 '所有职业的被动生命恢复降低{percent}%。','所有职业均无法被动恢复生命。','被动生命恢复不变。',
 '按住{binding}自救。剩余次数：{count}。','按{binding}开始或取消自救。剩余次数：{count}。',
 '等待医疗兵复活你。','等待队友复活你。','以1点生命复活倒地的队友。携带上限：{maximum}。',
 '医疗兵复活还会给予相当于被复活者最大生命20%的护盾。',
 '自救消耗一次机会并需持续引导两秒。医疗兵组队时也可自救；其他职业仅限单人。战斗之间恢复生命。',
 '由其他职业复活：恢复{health}%生命。'
],
'zh-Hant':[
 '由醫療兵復活：恢復{health}%生命。','由醫療兵復活：滿生命，另獲得相當於最大生命20%的護盾。','由醫療兵復活：恢復1點生命。',
 '只有醫療兵可以自救或復活隊友。','禁止一切復活，包括醫療兵技能和道具。',
 '所有職業的被動生命恢復降低{percent}%。','所有職業均無法被動恢復生命。','被動生命恢復不變。',
 '按住{binding}自救。剩餘次數：{count}。','按{binding}開始或取消自救。剩餘次數：{count}。',
 '等待醫療兵復活你。','等待隊友復活你。','以1點生命復活倒地的隊友。攜帶上限：{maximum}。',
 '醫療兵復活還會給予相當於被復活者最大生命20%的護盾。',
 '自救消耗一次機會並需持續引導兩秒。醫療兵組隊時也可自救；其他職業僅限單人。戰鬥之間恢復生命。',
 '由其他職業復活：恢復{health}%生命。'
],
ja:[
 '衛生兵による蘇生：体力{health}%。','衛生兵による蘇生：体力全回復＋最大体力の20%のシールド。','衛生兵による蘇生：体力1。',
 '自己蘇生と味方の蘇生ができるのは衛生兵だけです。','衛生兵の能力やアイテムを含め、蘇生はすべて無効です。',
 '全クラスの体力自動回復が{percent}%低下。','全クラスの体力自動回復が無効。','体力自動回復は通常どおり。',
 '{binding}を長押しで自己蘇生。残り{count}回。','{binding}で自己蘇生を開始・中止。残り{count}回。',
 '衛生兵の蘇生を待ってください。','味方の蘇生を待ってください。','倒れた味方を体力1で蘇生。最大所持数：{maximum}。',
 '衛生兵による蘇生では、蘇生した人の最大体力の20%のシールドも付与します。',
 '自己蘇生は回数を1つ消費し、2秒の操作が必要です。衛生兵はチームでも使え、他のクラスはSoloのみ。戦闘の合間に体力が回復します。',
 '他クラスによる蘇生：体力{health}%。'
],
es:[
 'Reanimación por Médico: {health}% de salud.','Reanimación por Médico: salud completa y escudo del 20% de la salud máxima.','Reanimación por Médico: 1 PV.',
 'Solo los Médicos pueden reanimarse o reanimar a compañeros.','Sin reanimaciones, ni con habilidades del Médico ni con objetos.',
 'Regeneración pasiva de salud: {percent}% menos para todas las clases.','Regeneración pasiva de salud desactivada para todas las clases.','Regeneración pasiva de salud sin cambios.',
 'Mantén {binding} para reanimarte. Cargas restantes: {count}.','Pulsa {binding} para iniciar o cancelar tu reanimación. Cargas restantes: {count}.',
 'Espera a que un Médico te reanime.','Espera a que un compañero te reanime.','Reanima a un compañero caído con 1 PV. Máximo transportable: {maximum}.',
 'La reanimación del Médico también otorga un escudo del 20% de la salud máxima del jugador reanimado.',
 'Reanimarte consume una carga y requiere dos segundos de canalización. El Médico puede hacerlo en equipo; las demás clases, solo en Solo. La salud se recupera entre combates.',
 'Reanimación por otras clases: {health}% de salud.'
],
fr:[
 'Réanimation par un Médecin : {health}% de vie.','Réanimation par un Médecin : vie complète et bouclier de 20% de la vie maximale.','Réanimation par un Médecin : 1 PV.',
 'Seuls les Médecins peuvent se réanimer ou réanimer leurs équipiers.','Aucune réanimation, même avec les capacités du Médecin ou les objets.',
 'Régénération passive : réduction de {percent}% pour toutes les classes.','Régénération passive désactivée pour toutes les classes.','Régénération passive inchangée.',
 'Maintenez {binding} pour vous réanimer. Charges restantes : {count}.','Appuyez sur {binding} pour lancer ou annuler votre réanimation. Charges restantes : {count}.',
 'Attendez qu’un Médecin vous réanime.','Attendez qu’un équipier vous réanime.','Réanime un équipier à terre avec 1 PV. Maximum transportable : {maximum}.',
 'La réanimation du Médecin accorde aussi un bouclier de 20% de la vie maximale du joueur réanimé.',
 'Se réanimer consomme une charge et demande deux secondes de canalisation. Le Médecin peut le faire en équipe ; les autres classes, uniquement en Solo. La vie revient entre les combats.',
 'Réanimation par les autres classes : {health}% de vie.'
],
de:[
 'Wiederbelebung durch Sanitäter: {health}% Gesundheit.','Wiederbelebung durch Sanitäter: volle Gesundheit und ein Schild mit 20% der maximalen Gesundheit.','Wiederbelebung durch Sanitäter: 1 LP.',
 'Nur Sanitäter können sich selbst oder Teammitglieder wiederbeleben.','Keine Wiederbelebung, auch nicht durch Sanitäterfähigkeiten oder Gegenstände.',
 'Passive Gesundheitsregeneration: für alle Klassen um {percent}% reduziert.','Passive Gesundheitsregeneration für alle Klassen deaktiviert.','Passive Gesundheitsregeneration unverändert.',
 '{binding} halten, um dich wiederzubeleben. Verbleibende Ladungen: {count}.','{binding} drücken, um die Selbstwiederbelebung zu starten oder abzubrechen. Verbleibende Ladungen: {count}.',
 'Warte auf einen Sanitäter, der dich wiederbelebt.','Warte auf ein Teammitglied, das dich wiederbelebt.','Belebt ein am Boden liegendes Teammitglied mit 1 LP wieder. Maximal tragbar: {maximum}.',
 'Sanitäter gewähren beim Wiederbeleben zusätzlich einen Schild mit 20% der maximalen Gesundheit des wiederbelebten Spielers.',
 'Selbstwiederbelebung verbraucht eine Ladung und dauert zwei Sekunden. Sanitäter können sie auch im Team nutzen; andere Klassen nur in Solo. Zwischen Kämpfen erholt sich die Gesundheit.',
 'Wiederbelebung durch andere Klassen: {health}% Gesundheit.'
],
'pt-BR':[
 'Reanimação por Médico: {health}% de vida.','Reanimação por Médico: vida cheia e escudo de 20% da vida máxima.','Reanimação por Médico: 1 PV.',
 'Só Médicos podem reanimar a si mesmos ou aos colegas.','Nenhuma reanimação, nem por habilidades do Médico ou itens.',
 'Regeneração passiva de vida: {percent}% menor para todas as classes.','Regeneração passiva de vida desativada para todas as classes.','Regeneração passiva de vida sem alterações.',
 'Segure {binding} para se reanimar. Cargas restantes: {count}.','Pressione {binding} para iniciar ou cancelar sua reanimação. Cargas restantes: {count}.',
 'Espere um Médico reanimar você.','Espere um colega reanimar você.','Reanima um colega caído com 1 PV. Máximo carregado: {maximum}.',
 'A reanimação do Médico também concede um escudo de 20% da vida máxima do jogador reanimado.',
 'Reanimar a si mesmo consome uma carga e exige dois segundos de canalização. Médicos podem fazer isso em equipe; outras classes, só no Solo. A vida se recupera entre lutas.',
 'Reanimação por outras classes: {health}% de vida.'
],
ru:[
 'Оживление Медиком: {health}% здоровья.','Оживление Медиком: полное здоровье и щит на 20% максимального здоровья.','Оживление Медиком: 1 ОЗ.',
 'Только Медики могут оживлять себя или товарищей.','Оживления запрещены, включая способности Медика и предметы.',
 'Пассивное восстановление здоровья снижено на {percent}% у всех классов.','Пассивное восстановление здоровья отключено у всех классов.','Пассивное восстановление здоровья без изменений.',
 'Удерживайте {binding}, чтобы оживить себя. Зарядов осталось: {count}.','Нажмите {binding}, чтобы начать или отменить самооживление. Зарядов осталось: {count}.',
 'Дождитесь, пока Медик вас оживит.','Дождитесь, пока товарищ вас оживит.','Оживляет упавшего товарища с 1 ОЗ. Максимум при себе: {maximum}.',
 'При оживлении Медик также даёт щит на 20% максимального здоровья оживлённого игрока.',
 'Самооживление тратит заряд и требует двух секунд подготовки. Медики могут делать это в команде; остальные классы — только в Solo. Здоровье восстанавливается между боями.',
 'Оживление другими классами: {health}% здоровья.'
],
hi:[
 'मेडिक द्वारा पुनर्जीवन: {health}% स्वास्थ्य।','मेडिक द्वारा पुनर्जीवन: पूरा स्वास्थ्य और अधिकतम स्वास्थ्य के 20% की ढाल।','मेडिक द्वारा पुनर्जीवन: 1 HP।',
 'केवल मेडिक खुद को या साथियों को पुनर्जीवित कर सकते हैं।','मेडिक की क्षमताओं और वस्तुओं सहित हर तरह का पुनर्जीवन बंद है।',
 'सभी वर्गों का निष्क्रिय स्वास्थ्य पुनर्जनन {percent}% कम।','सभी वर्गों का निष्क्रिय स्वास्थ्य पुनर्जनन बंद।','निष्क्रिय स्वास्थ्य पुनर्जनन में बदलाव नहीं।',
 'खुद को पुनर्जीवित करने के लिए {binding} दबाए रखें। शेष चार्ज: {count}।','खुद का पुनर्जीवन शुरू या रद्द करने के लिए {binding} दबाएँ। शेष चार्ज: {count}।',
 'मेडिक के आपको पुनर्जीवित करने की प्रतीक्षा करें।','किसी साथी के आपको पुनर्जीवित करने की प्रतीक्षा करें।','गिरे हुए साथी को 1 HP पर पुनर्जीवित करें। रखने की सीमा: {maximum}।',
 'मेडिक का पुनर्जीवन खिलाड़ी को उसके अधिकतम स्वास्थ्य के 20% की ढाल भी देता है।',
 'खुद का पुनर्जीवन एक चार्ज लेता है और दो सेकंड की प्रक्रिया माँगता है। मेडिक टीम में भी ऐसा कर सकते हैं; अन्य वर्ग केवल Solo में। लड़ाइयों के बीच स्वास्थ्य लौटता है।',
 'अन्य वर्गों द्वारा पुनर्जीवन: {health}% स्वास्थ्य।'
],
ar:[
 'الإنعاش بواسطة المسعف: صحة {health}%.','الإنعاش بواسطة المسعف: صحة كاملة ودرع يعادل 20% من أقصى صحة.','الإنعاش بواسطة المسعف: نقطة صحة واحدة.',
 'المسعفون وحدهم يستطيعون إنعاش أنفسهم أو زملائهم.','كل الإنعاشات معطلة، بما فيها قدرات المسعف والأدوات.',
 'تجدد الصحة التلقائي أقل بنسبة {percent}% لكل الفئات.','تجدد الصحة التلقائي معطل لكل الفئات.','تجدد الصحة التلقائي دون تغيير.',
 'اضغط مطولًا على {binding} لإنعاش نفسك. الشحنات المتبقية: {count}.','اضغط على {binding} لبدء إنعاش نفسك أو إلغائه. الشحنات المتبقية: {count}.',
 'انتظر مسعفًا لينعشك.','انتظر زميلًا لينعشك.','أنعش زميلًا ساقطًا بنقطة صحة واحدة. أقصى عدد محمول: {maximum}.',
 'إنعاش المسعف يمنح أيضًا درعًا يعادل 20% من أقصى صحة للاعب المُنعش.',
 'إنعاش النفس يستهلك شحنة ويتطلب ثانيتين من التفعيل. يمكن للمسعف استخدامه ضمن فريق، وللفئات الأخرى في Solo فقط. تعود الصحة بين المعارك.',
 'الإنعاش بواسطة الفئات الأخرى: صحة {health}%.'
],
bn:[
 'মেডিকের পুনরুজ্জীবনে স্বাস্থ্য: {health}%।','মেডিকের পুনরুজ্জীবনে পূর্ণ স্বাস্থ্য ও সর্বোচ্চ স্বাস্থ্যের 20% ঢাল।','মেডিকের পুনরুজ্জীবনে স্বাস্থ্য: 1 HP।',
 'শুধু মেডিক নিজেকে বা সতীর্থকে পুনরুজ্জীবিত করতে পারেন।','মেডিকের ক্ষমতা ও সরঞ্জামসহ সব পুনরুজ্জীবন বন্ধ।',
 'সব শ্রেণির নিষ্ক্রিয় স্বাস্থ্য পুনরুদ্ধার {percent}% কম।','সব শ্রেণির নিষ্ক্রিয় স্বাস্থ্য পুনরুদ্ধার বন্ধ।','নিষ্ক্রিয় স্বাস্থ্য পুনরুদ্ধার অপরিবর্তিত।',
 'নিজেকে পুনরুজ্জীবিত করতে {binding} ধরে রাখুন। বাকি চার্জ: {count}।','নিজের পুনরুজ্জীবন শুরু বা বাতিল করতে {binding} চাপুন। বাকি চার্জ: {count}।',
 'কোনো মেডিক আপনাকে পুনরুজ্জীবিত করা পর্যন্ত অপেক্ষা করুন।','কোনো সতীর্থ আপনাকে পুনরুজ্জীবিত করা পর্যন্ত অপেক্ষা করুন।','পড়ে যাওয়া সতীর্থকে 1 HP-তে পুনরুজ্জীবিত করুন। সর্বোচ্চ বহন: {maximum}।',
 'মেডিকের পুনরুজ্জীবনে খেলোয়াড় তার সর্বোচ্চ স্বাস্থ্যের 20% ঢালও পান।',
 'নিজের পুনরুজ্জীবনে এক চার্জ ও দুই সেকেন্ড লাগে। মেডিক দলেও এটি করতে পারেন; অন্য শ্রেণি শুধু Solo-তে। লড়াইয়ের মাঝে স্বাস্থ্য ফেরে।',
 'অন্য শ্রেণির পুনরুজ্জীবনে স্বাস্থ্য: {health}%।'
],
id:[
 'Dihidupkan Medic: {health}% kesehatan.','Dihidupkan Medic: kesehatan penuh dan perisai sebesar 20% kesehatan maksimum.','Dihidupkan Medic: 1 HP.',
 'Hanya Medic yang dapat menghidupkan diri atau rekan tim.','Semua kebangkitan dilarang, termasuk kemampuan Medic dan barang.',
 'Regenerasi kesehatan pasif: berkurang {percent}% untuk semua kelas.','Regenerasi kesehatan pasif dinonaktifkan untuk semua kelas.','Regenerasi kesehatan pasif tidak berubah.',
 'Tahan {binding} untuk menghidupkan diri. Sisa penggunaan: {count}.','Tekan {binding} untuk memulai atau membatalkan kebangkitan diri. Sisa penggunaan: {count}.',
 'Tunggu Medic menghidupkanmu.','Tunggu rekan tim menghidupkanmu.','Hidupkan rekan yang tumbang dengan 1 HP. Batas bawaan: {maximum}.',
 'Kebangkitan oleh Medic juga memberi perisai sebesar 20% kesehatan maksimum pemain yang dibangkitkan.',
 'Menghidupkan diri memakai satu jatah dan perlu penyaluran dua detik. Medic dapat melakukannya dalam tim; kelas lain hanya di Solo. Kesehatan pulih di antara pertarungan.',
 'Dihidupkan kelas lain: {health}% kesehatan.'
],
ur:[
 'میڈک کے ذریعے بحالی: {health}% صحت۔','میڈک کے ذریعے بحالی: پوری صحت اور زیادہ سے زیادہ صحت کے 20% کی ڈھال۔','میڈک کے ذریعے بحالی: 1 HP۔',
 'صرف میڈک خود کو یا ساتھیوں کو بحال کر سکتے ہیں۔','میڈک کی صلاحیتوں اور اشیا سمیت ہر قسم کی بحالی بند ہے۔',
 'تمام کلاسوں کی خودکار صحت کی بحالی {percent}% کم ہے۔','تمام کلاسوں کی خودکار صحت کی بحالی بند ہے۔','خودکار صحت کی بحالی میں کوئی تبدیلی نہیں۔',
 'خود کو بحال کرنے کے لیے {binding} دبائے رکھیں۔ باقی چارج: {count}۔','اپنی بحالی شروع یا منسوخ کرنے کے لیے {binding} دبائیں۔ باقی چارج: {count}۔',
 'میڈک کے آپ کو بحال کرنے کا انتظار کریں۔','کسی ساتھی کے آپ کو بحال کرنے کا انتظار کریں۔','گرے ہوئے ساتھی کو 1 HP پر بحال کریں۔ ساتھ رکھنے کی حد: {maximum}۔',
 'میڈک کی بحالی کھلاڑی کو اس کی زیادہ سے زیادہ صحت کے 20% کی ڈھال بھی دیتی ہے۔',
 'خود کو بحال کرنے میں ایک چارج اور دو سیکنڈ لگتے ہیں۔ میڈک ٹیم میں بھی ایسا کر سکتے ہیں؛ دوسری کلاسیں صرف Solo میں۔ لڑائیوں کے درمیان صحت واپس آتی ہے۔',
 'دوسری کلاسوں کے ذریعے بحالی: {health}% صحت۔'
],
ko:[
 '의무병 부활: 체력 {health}%.','의무병 부활: 체력 완전 회복과 최대 체력의 20% 보호막.','의무병 부활: 체력 1.',
 '의무병만 자신이나 팀원을 부활시킬 수 있습니다.','의무병 능력과 아이템을 포함한 모든 부활이 금지됩니다.',
 '모든 직업의 지속 체력 재생이 {percent}% 감소합니다.','모든 직업의 지속 체력 재생이 비활성화됩니다.','지속 체력 재생은 그대로입니다.',
 '{binding}을 길게 눌러 자신을 부활시키세요. 남은 횟수: {count}.','{binding}을 눌러 자기 부활을 시작하거나 취소하세요. 남은 횟수: {count}.',
 '의무병의 부활을 기다리세요.','팀원의 부활을 기다리세요.','쓰러진 팀원을 체력 1로 부활시킵니다. 최대 소지: {maximum}.',
 '의무병 부활은 부활한 플레이어 최대 체력의 20%에 해당하는 보호막도 제공합니다.',
 '자기 부활은 횟수를 1회 소비하며 2초간 진행해야 합니다. 의무병은 팀에서도, 다른 직업은 Solo에서만 사용할 수 있습니다. 전투 사이에 체력이 회복됩니다.',
 '다른 직업의 부활: 체력 {health}%.'
]
};
export function medicRecoveryMessages(locale){
  const row=rows[locale];if(!row||row.length!==keys.length)throw Error('Missing Medic recovery locale '+locale);
  return Object.fromEntries(keys.map((key,i)=>['ui.'+key,row[i].normalize('NFC')]));
}
