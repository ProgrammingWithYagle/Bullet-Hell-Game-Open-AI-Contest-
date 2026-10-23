// Keys are CLDR cardinal categories, selected from the numeric count before formatting.
export default {
en: { players: { one:'{count} player', other:'{count} players' }, encounters:{one:'{count} encounter',other:'{count} encounters'}, seconds:{one:'{count} second',other:'{count} seconds'} },
'zh-Hans': { players:{other:'{count} 名玩家'}, encounters:{other:'{count} 场战斗'}, seconds:{other:'{count} 秒'} },
'zh-Hant': { players:{other:'{count} 名玩家'}, encounters:{other:'{count} 場戰鬥'}, seconds:{other:'{count} 秒'} },
ja: { players:{other:'{count} 人'}, encounters:{other:'{count} 戦'}, seconds:{other:'{count} 秒'} },
es: { players:{one:'{count} jugador',many:'{count} jugadores',other:'{count} jugadores'}, encounters:{one:'{count} encuentro',many:'{count} encuentros',other:'{count} encuentros'}, seconds:{one:'{count} segundo',many:'{count} segundos',other:'{count} segundos'} },
fr: { players:{one:'{count} joueur',many:'{count} joueurs',other:'{count} joueurs'}, encounters:{one:'{count} combat',many:'{count} combats',other:'{count} combats'}, seconds:{one:'{count} seconde',many:'{count} secondes',other:'{count} secondes'} },
de: { players:{one:'{count} Spieler',other:'{count} Spieler'}, encounters:{one:'{count} Kampf',other:'{count} Kämpfe'}, seconds:{one:'{count} Sekunde',other:'{count} Sekunden'} },
'pt-BR': { players:{one:'{count} jogador',many:'{count} jogadores',other:'{count} jogadores'}, encounters:{one:'{count} encontro',many:'{count} encontros',other:'{count} encontros'}, seconds:{one:'{count} segundo',many:'{count} segundos',other:'{count} segundos'} },
ru: { players:{one:'{count} игрок',few:'{count} игрока',many:'{count} игроков',other:'{count} игрока'}, encounters:{one:'{count} бой',few:'{count} боя',many:'{count} боёв',other:'{count} боя'}, seconds:{one:'{count} секунда',few:'{count} секунды',many:'{count} секунд',other:'{count} секунды'} },
hi: { players:{one:'{count} खिलाड़ी',other:'{count} खिलाड़ी'}, encounters:{one:'{count} मुठभेड़',other:'{count} मुठभेड़ें'}, seconds:{one:'{count} सेकंड',other:'{count} सेकंड'} },
ar: { players:{zero:'عدد اللاعبين: {count}',one:'لاعب واحد ({count})',two:'لاعبان ({count})',few:'{count} لاعبين',many:'{count} لاعبًا',other:'{count} لاعب'}, encounters:{zero:'عدد المواجهات: {count}',one:'مواجهة واحدة ({count})',two:'مواجهتان ({count})',few:'{count} مواجهات',many:'{count} مواجهة',other:'{count} مواجهة'}, seconds:{zero:'المدة بالثواني: {count}',one:'ثانية واحدة ({count})',two:'ثانيتان ({count})',few:'{count} ثوانٍ',many:'{count} ثانية',other:'{count} ثانية'} },
bn: { players:{one:'{count} জন খেলোয়াড়',other:'{count} জন খেলোয়াড়'}, encounters:{one:'{count}টি লড়াই',other:'{count}টি লড়াই'}, seconds:{one:'{count} সেকেন্ড',other:'{count} সেকেন্ড'} },
id: { players:{other:'{count} pemain'}, encounters:{other:'{count} pertempuran'}, seconds:{other:'{count} detik'} },
ur: { players:{one:'{count} کھلاڑی',other:'{count} کھلاڑی'}, encounters:{one:'{count} جھڑپ',other:'{count} جھڑپیں'}, seconds:{one:'{count} سیکنڈ',other:'{count} سیکنڈ'} },
ko: { players:{other:'{count}명'}, encounters:{other:'{count}회 전투'}, seconds:{other:'{count}초'} }
};
