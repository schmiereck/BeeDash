import { LevelDefinition } from '../types';

export interface CampaignWorld {
  number: number;
  title: string;
  emoji: string;
  subtitle: string;
}

export const CAMPAIGN_WORLDS: CampaignWorld[] = [
  {
    number: 1,
    emoji: '🍯',
    title: 'Welt 1: Der gemütliche Bienenstock',
    subtitle: 'Waben 1–12'
  },
  {
    number: 2,
    emoji: '🌸',
    title: 'Welt 2: Der Sonnenblüten-Garten',
    subtitle: 'Waben 13–24'
  }
];

const RAW_CAMPAIGN_LEVELS: LevelDefinition[] = [
  {
    id: 'wabe-1',
    number: 1,
    title: 'Hallo, kleine Biene!',
    chapter: 'Kapitel 1: Im gemütlichen Bienenstock',
    mapCoords: { q: 0, r: 0 },
    intro: 'Sammle alle 4 Blüten ein und fliege in Frau Honigs gelb-schwarzen Koffer!',
    tip: 'Du kannst ganz in Ruhe durch das weiche Wachs summen. Sobald alle Blüten gesammelt sind, öffnet sich der Koffer von selbst!',
    ascii: [
      '###########',
      '#P..F....E#',
      '#.........#',
      '#..F...F..#',
      '#.........#',
      '#....F....#',
      '###########'
    ]
  },
  {
    id: 'wabe-2',
    number: 2,
    title: 'Freundin in Not',
    chapter: 'Kapitel 1: Im gemütlichen Bienenstock',
    mapCoords: { q: 1, r: 0 },
    intro: 'Eine kleine Bienenfreundin steckt im Wachs fest. Grabe den Gang direkt neben ihr frei, damit sie wegfliegen kann!',
    tip: 'Sobald neben einer gefangenen Biene ein Feld frei wird, platzt ihre Wachsblase und sie fliegt fröhlich davon!',
    ascii: [
      '###########',
      '#P..#....E#',
      '#.F.#.###.#',
      '#...#.B...#',
      '#.###.###.#',
      '#..F...F..#',
      '#....F....#',
      '###########'
    ]
  },
  {
    id: 'wabe-3',
    number: 3,
    title: 'Vorsicht, Honigtopf!',
    chapter: 'Kapitel 1: Im gemütlichen Bienenstock',
    mapCoords: { q: 1, r: 1 },
    intro: 'Schwere Honigtöpfe fallen herunter, sobald du dich unter ihnen wegbewegst und Platz frei wird!',
    tip: 'Solange du direkt unter einem ruhenden Honigtopf stehst, hältst du ihn sicher auf. Fliegst du weg, wackelt er kurz und fällt dann herunter – stelle dich nie unter einen schon fallenden Topf!',
    ascii: [
      '############',
      '#P..O..O..O#',
      '#..........#',
      '#.F. .F..F.#',
      '#..#....#..#',
      '#.F..B...F.#',
      '#.........E#',
      '############'
    ]
  },
  {
    id: 'wabe-4',
    number: 4,
    title: 'Schubsen erlaubt!',
    chapter: 'Kapitel 1: Im gemütlichen Bienenstock',
    mapCoords: { q: 0, r: 1 },
    intro: 'Ein dicker Honigtopf versperrt den Weg zur oberen Bienenfreundin. Schieb ihn einfach zur Seite!',
    tip: 'Drücke von links gegen den mittleren Honigtopf, damit er in die kleine Grube fällt. Grabe dann das Wachs neben der Freundin weg! Mit „Zurück“ kannst du Züge jederzeit rückgängig machen.',
    ascii: [
      '#############',
      '#P..O #######',
      '#.#####.#####',
      '#.F..O  .B.F#',
      '#.#### ######',
      '#..O.....O..#',
      '#.F..#.#..F.#',
      '#....B..F..E#',
      '#############'
    ]
  },
  {
    id: 'wabe-5',
    number: 5,
    title: 'Goldener Honigfluss',
    chapter: 'Kapitel 2: Auf in die Honigwelt',
    mapCoords: { q: -1, r: 1 },
    intro: 'Jetzt wird die Welt größer! Liegender Honig schmeckt lecker – aber Vorsicht vor herabtropfendem Honig!',
    tip: 'Flüssigen Honig kannst du sicher von oben oder von der Seite einsammeln. Nur wenn er von oben auf dich tropft (oder du von unten hineinfliegst), verkleben die Flügel.',
    ascii: [
      '##################',
      '#P....#..S...#..E#',
      '#.F...#.. ...#...#',
      '#.....#.. ...#.F.#',
      '#.###.#.. ...#...#',
      '#..~~~..###....B.#',
      '#..###.......#...#',
      '#......F.....#...#',
      '#.F...B....F.#...#',
      '#......F.........#',
      '##################'
    ]
  },
  {
    id: 'wabe-6',
    number: 6,
    title: 'Die Honig-Rinne',
    chapter: 'Kapitel 2: Auf in die Honigwelt',
    mapCoords: { q: -1, r: 0 },
    intro: 'Oben sammelt sich Honig! Öffne rechts daneben den kleinen Wachspfropfen, damit er sicher abfließen kann.',
    tip: 'Wenn du neben einem Honigsee Platz nach unten machst, fließt der Honig ruhig ab. Und von der Seite kannst du ihn auch direkt vernaschen!',
    ascii: [
      '####################',
      '#P...#..S.....#...E#',
      '#.F..#.~~~~...#..F.#',
      '#....#.#### ..#....#',
      '#.O..#....# ..##.###',
      '#......F..# ..#..O.#',
      '#.###.###.# ..#.B..#',
      '#..O....#.....#....#',
      '#.F..B..#...O...F..#',
      '#.......#.F...#....#',
      '#.............#..F.#',
      '####################'
    ]
  },
  {
    id: 'wabe-7',
    number: 7,
    title: 'Im Kirschbaum',
    chapter: 'Kapitel 2: Auf in die Honigwelt',
    mapCoords: { q: 0, r: -1 },
    intro: 'Runde Kirschbaum-Waben lassen Honigtöpfe seitlich abrollen. Befreie alle drei Freundinnen!',
    tip: 'Auf abgerundeten Waben bleiben Honigtöpfe nur liegen, solange links und rechts Wachs stützt. Schau dir jeden Topf kurz an, bevor du gräbst!',
    ascii: [
      '######################',
      '#P...O..#....S....#.E#',
      '#....R..#...~~~...#..#',
      '#.F..#..#...###...#.F#',
      '#....#..#.........#..#',
      '#.###.#.#####.###.#..#',
      '#..O....O  ......O...#',
      '#.RRR.#.###.#.R..###.#',
      '#..F..#..B..#...F....#',
      '#.....#.....#.###.##.#',
      '#.B.F....O......B....#',
      '#....###.#.#####.#...#',
      '#.F......F.....F.....#',
      '######################'
    ]
  },
  {
    id: 'wabe-8',
    number: 8,
    title: 'Frau Honigs großer Koffer',
    chapter: 'Kapitel 2: Auf in die Honigwelt',
    mapCoords: { q: 1, r: -1 },
    intro: 'Die große Schatzkammer! Sammle alle 10 Blüten, rette alle 3 Bienenfreundinnen und finde Frau Honigs Koffer!',
    tip: 'Nimm dir Zeit, schiebe die blockierenden Honigtöpfe in die freien Kammern und nutze „Zurück“, falls einmal ein Gang versperrt ist.',
    ascii: [
      '########################',
      '#P...O..#..S...S..#...E#',
      '#....R..#..~~.~~..#....#',
      '#.F..#..#..##.##..#..F.#',
      '#....#............#....#',
      '#.####.####.#####.####.#',
      '#..O.....O  .....O.....#',
      '#.RRR.#.####.###.#.RRR.#',
      '#..F..#..B...F...#..F..#',
      '#.....#..........#.....#',
      '#.###.#####..#####.###.#',
      '#.F...O  .B..F...O..B..#',
      '#..#..###......###..#..#',
      '#.F......F...........F.#',
      '########################'
    ]
  },
  {
    id: 'wabe-9',
    number: 9,
    title: 'Die zwei Honig-Tore',
    chapter: 'Kapitel 3: Rätsel im Bienenstock',
    mapCoords: { q: 2, r: -1 },
    intro: 'Zwei schwere Honigtöpfe versperren die Tore! Schiebe den ersten in die Grube und lass den zweiten nach unten plumpsen.',
    tip: 'Drücke den ersten Honigtopf nach rechts in die Grube und warte einen kurzen Moment, bis er hinunterfällt. Beim zweiten Topf gräbst du erst das Wachs direkt unter ihm weg und fliegst kurz zurück – dann fällt er hinunter und der Weg ist frei!',
    ascii: [
      '#############',
      '#P..#...#..E#',
      '#.F.#.F.#.F.#',
      '#...O ..#.#.#',
      '#.#.# #.#.#.#',
      '#.F.###.O...#',
      '#...###..#B.#',
      '#...#####...#',
      '#############'
    ]
  },
  {
    id: 'wabe-10',
    number: 10,
    title: 'Frau Honigs Rätsel-Labyrinth',
    chapter: 'Kapitel 3: Rätsel im Bienenstock',
    mapCoords: { q: 2, r: 0 },
    intro: 'Vier echte Rätsel-Kammern warten auf dich! Schiebe Töpfe, lass einen von der runden Wabe abrollen und öffne alle Wege zum Koffer.',
    tip: '1) Schiebe den ersten Topf nach rechts aufs Regal, um nach unten zu graben. 2) Grabe links neben der runden Wabe beide Felder frei, damit der Topf herunterrollt. 3) Grabe unter dem mittleren Tor-Topf das Wachs weg. 4) Schiebe den letzten Topf in die Grube zur Koffer-Kammer!',
    ascii: [
      '#######################',
      '#P....#..#S....#..F.B.#',
      '#.F.F.#..#~~~..#......#',
      '#.....#.F.###..#...####',
      '#.##..#........O...####',
      '#..O ##...B.....#..####',
      '###.#####......#..O ###',
      '#......##...F..###. ###',
      '#.F.#..##.##...#...#F.#',
      '#...#...O......#......#',
      '#.B.....R#.F...#.F...E#',
      '#......###.....#......#',
      '#######################'
    ]
  },
  {
    id: 'wabe-11',
    number: 11,
    title: 'Die goldene Honigschale',
    chapter: 'Kapitel 4: Die goldene Honigschale',
    mapCoords: { q: 2, r: 1 },
    intro: 'Ein Honig-Tor versperrt den Weg! Grabe dem flüssigen Honig einen Kanal bis hinunter in die goldene Schale.',
    tip: 'Grabe die senkrechte Rinne rechts neben dem Honigsee frei und weiche oben kurz zur Seite aus. Sobald Honig in die goldene Schale tropft, springt das Honig-Tor auf!',
    ascii: [
      '#############',
      '#P..#S..#..E#',
      '#.F.#~~.#.F.#',
      '#...###.#...#',
      '#.......G...#',
      '#.F.#...#.B.#',
      '#...#...#...#',
      '#...###U#.F.#',
      '#############'
    ]
  },
  {
    id: 'wabe-12',
    number: 12,
    title: 'Der versperrte Honigkanal',
    chapter: 'Kapitel 4: Die goldene Honigschale',
    mapCoords: { q: 3, r: 0 },
    intro: 'Lass die goldene Schale auf den Vorsprung am Tor hinabgleiten, räume den Honigtopf aus der Rinne und leite den Honig von oben hinein!',
    tip: '1) Grabe unter der goldenen Schale das Wachs weg, damit sie auf dem Vorsprung am Honig-Tor landet. 2) Grabe dann unter dem blockierenden Honigtopf, damit er nach unten fällt. 3) Öffne den Honigschacht – der Honig tropft von oben in die Schale und öffnet das Tor direkt darunter!',
    ascii: [
      '#####################',
      '#P...##S#.#....#....#',
      '#.F.....#.#..F.#..B.#',
      '#.....#.#.#....O....#',
      '#.##....O.#....R#...#',
      '#....###..#...##....#',
      '#.......#U#....#.F###',
      '#..#......#....#.O ##',
      '#.B.......#....##. ##',
      '#...F....##.F..#..#.#',
      '#.........G....#F..E#',
      '#####################'
    ]
  },
  {
    id: 'wabe-13',
    number: 13,
    world: 2,
    title: 'Wiedersehen im Sonnenstock',
    chapter: 'Kapitel 5: Der Sonnenblüten-Garten',
    mapCoords: { q: 0, r: 0 },
    intro: 'Willkommen in Welt 2! Schiebe den ersten Honigtopf in die Grube und lass den zweiten von der runden Wabe abrollen!',
    tip: '1) Schiebe oben den Honigtopf nach rechts in die Grube. 2) Grabe rechts neben dem unteren Topf auf der runden Wabe beide Felder frei, damit er hinunterrollt und dir die versteckte Blüte freigibt!',
    ascii: [
      '#############',
      '#P..O  #...E#',
      '#.F.# ..###.#',
      '#...###..F..#',
      '#.#.#FO..##.#',
      '#.F.##R..#B.#',
      '#...###..#..#',
      '#B..#..F....#',
      '#############'
    ]
  },
  {
    id: 'wabe-14',
    number: 14,
    world: 2,
    title: 'Zwei Honigquellen',
    chapter: 'Kapitel 5: Der Sonnenblüten-Garten',
    mapCoords: { q: 1, r: 0 },
    intro: 'Schiebe den Honigtopf aus dem Weg und leite den goldenen Honig von oben hinunter in die Schale!',
    tip: 'Gehe durch die Mitte nach rechts, schiebe den Honigtopf zur Seite auf den Platz neben dem Schacht und öffne dann direkt darüber den Wachspfropfen am Honigsee!',
    ascii: [
      '###################',
      '#P..#S...#...S#..E#',
      '#.F.#~~..#..~~#...#',
      '#...###..#..###.F.#',
      '#.#....O #....#...#',
      '#.#...R..#....G...#',
      '#.F.#....#.#..#.B.#',
      '#...#..U.#.F..#...#',
      '#B..######.##.#...#',
      '#........F....#.F.#',
      '###################'
    ]
  },
  {
    id: 'wabe-15',
    number: 15,
    world: 2,
    title: 'Die Blüten-Druckplatte',
    chapter: 'Kapitel 6: Blüten-Schalter & Tore',
    mapCoords: { q: 1, r: 1 },
    intro: 'Neu entdeckt: Eine rosa Blüten-Druckplatte! Schiebe einen schweren Honigtopf darauf, um das Blüten-Tor zu öffnen.',
    tip: 'Schiebe den Honigtopf einfach nach rechts bis an die Steinwand auf das rosa Blüten-Kissen. Sofort geht weiter unten das Blüten-Tor auf!',
    ascii: [
      '#############',
      '#P......#..E#',
      '#.F.....#...#',
      '#..O  D##.F.#',
      '#.#######...#',
      '#.......T...#',
      '#.F...#.#.B.#',
      '#.....#.#.F.#',
      '#############'
    ]
  },
  {
    id: 'wabe-16',
    number: 16,
    world: 2,
    title: 'Topf auf den Knopf!',
    chapter: 'Kapitel 6: Blüten-Schalter & Tore',
    mapCoords: { q: 0, r: 1 },
    intro: 'Diesmal musst du den Honigtopf direkt auf den Blüten-Schalter hinunterplumpsen lassen!',
    tip: 'Grabe zuerst den Schacht unter dem rechten Ende der oberen runden Wabe bis zur Druckplatte frei. Steige dann kurz oben neben dem Topf hoch und geh wieder zur Seite – schon rollt er genau auf den Knopf!',
    ascii: [
      '#############',
      '#P...#O.#..E#',
      '#.F..#R.#.F.#',
      '#....#..#...#',
      '#.##....T...#',
      '#..#.#..###.#',
      '#.F..#.D#...#',
      '#....####.B.#',
      '#############'
    ]
  },
  {
    id: 'wabe-17',
    number: 17,
    world: 2,
    title: 'Schale und Blüten-Schalter',
    chapter: 'Kapitel 6: Blüten-Schalter & Tore',
    mapCoords: { q: -1, r: 1 },
    intro: 'Erst öffnet goldener Honig das Honig-Tor – danach knackt ein geschobener Topf auch noch das Blüten-Tor!',
    tip: '1) Grabe links der Honigquelle den Schacht bis zur Schale frei und stelle dich rechts vom Schacht ans Honig-Tor. 2) Dahinter wartet schon der Honigtopf vor dem rosa Blüten-Schalter!',
    ascii: [
      '###################',
      '#P.#S...#....#...E#',
      '#.F#~~..#..F.#..F.#',
      '#..###..#....T....#',
      '#.......G....#....#',
      '#.F.#...#.O D#....#',
      '#...#...######.##.#',
      '#...##U.#....#....#',
      '#.B...#.#.F....B..#',
      '#.......#....#.F..#',
      '###################'
    ]
  },
  {
    id: 'wabe-18',
    number: 18,
    world: 2,
    title: 'Das große Blüten-Schloss',
    chapter: 'Kapitel 6: Blüten-Schalter & Tore',
    mapCoords: { q: -1, r: 0 },
    intro: 'Zwei rosa Blüten-Druckplatten halten das große Schloss-Tor verschlossen! Nur wenn beide gedrückt sind, öffnet es sich.',
    tip: '1) Schiebe oben links den ersten Honigtopf auf die obere Druckplatte. 2) Grabe in der Mitte den Fallschacht bis zur zweiten Druckplatte frei und lasse den Topf von der runden Wabe genau darauf fallen!',
    ascii: [
      '#####################',
      '#P......#O..#S..#..E#',
      '#.F..F..#R..#~~.#.F.#',
      '#..O  D##...###.#...#',
      '#.#######.......T...#',
      '#.......#.......#...#',
      '#.F.#...#..##...#.B.#',
      '#...#...#.D#....#...#',
      '#.B.#.F.####..F.#...#',
      '#...............#B.F#',
      '#####################'
    ]
  },
  {
    id: 'wabe-19',
    number: 19,
    world: 2,
    title: 'Honigtopf-Karussell',
    chapter: 'Kapitel 6: Blüten-Schalter & Tore',
    mapCoords: { q: 0, r: -1 },
    intro: 'Schiebe unten den Honigtopf aufs rosa Blüten-Kissen und lass oben einen zweiten Topf von der runden Wabe abrollen!',
    tip: '1) Drücke unten den Honigtopf nach rechts auf die Druckplatte – oben springt das Blüten-Tor auf! 2) Grabe oben rechts neben dem zweiten Topf beide Wachsfelder frei und weiche kurz aus, damit er von der runden Wabe abrollt.',
    ascii: [
      '#############',
      '#P.#FO..T..E#',
      '#.F##R..#.F.#',
      '#..##...#...#',
      '#.##..###...#',
      '#....O  D#..#',
      '#.F.######B.#',
      '#B..#F......#',
      '#############'
    ]
  },
  {
    id: 'wabe-20',
    number: 20,
    world: 2,
    title: 'Honigfall und Blüten-Knopf',
    chapter: 'Kapitel 6: Blüten-Schalter & Tore',
    mapCoords: { q: 1, r: -1 },
    intro: 'Erst öffnet der Blüten-Schalter den Weg zur Honigquelle – danach füllt der goldene Honig die Schale am Ausgang!',
    tip: '1) Schiebe den Honigtopf auf die rosa Druckplatte, um durch das Blüten-Tor in die mittlere Kammer zu fliegen. 2) Grabe dort unter dem Honigsee den Schacht frei, warte rechts davon auf die Schale – schon öffnet sich auch das Honig-Tor!',
    ascii: [
      '###################',
      '#P.....#S...#....E#',
      '#.F..F.#~~..#.F...#',
      '#..O D####..#.....#',
      '#.#####.....#.....#',
      '#......T....G.....#',
      '#.F.#..#....#...B.#',
      '#...#..#..U.#.....#',
      '#.B.#..######.....#',
      '#......#..F.....F.#',
      '###################'
    ]
  },
  {
    id: 'wabe-21',
    number: 21,
    world: 2,
    title: 'Die Zauberblüte',
    chapter: 'Kapitel 7: Magische Blüten-Portale',
    mapCoords: { q: 2, r: -1 },
    intro: 'Neu entdeckt: Zwei leuchtende lila Zauberblüten! Fliege in eine hinein, um blitzschnell zur anderen zu schwirren!',
    tip: 'Auf der linken Seite sammelst du beide Blüten ein. Fliegst du danach direkt auf die leuchtende lila Portal-Blüte, ploppst du auf der anderen Seite der Steinmauer wieder heraus!',
    ascii: [
      '#############',
      '#P....#....E#',
      '#.F...#..F..#',
      '#...1.#.1...#',
      '#.....#.....#',
      '#.F...#..B..#',
      '#.....#.....#',
      '#.....#..F..#',
      '#############'
    ]
  },
  {
    id: 'wabe-22',
    number: 22,
    world: 2,
    title: 'Hin und zurück durchs Portal',
    chapter: 'Kapitel 7: Magische Blüten-Portale',
    mapCoords: { q: 2, r: 0 },
    intro: 'Schlüpfe durch die Zauberblüte nach rechts, drücke die Druckplatte und kehre durch dieselbe Zauberblüte wieder heim!',
    tip: '1) Fliege oben rechts durch das lila Portal. 2) Schiebe dort den Honigtopf auf die Druckplatte, sammle die beiden Blüten und befreie die Freundin. 3) Durch das Portal zurück kannst du unten durchs offene Blüten-Tor zum Koffer!',
    ascii: [
      '#############',
      '#P..1.#.1...#',
      '#.F...#..F..#',
      '#.....#.O D##',
      '####T##.#####',
      '#.....#..F..#',
      '#.F...#.B...#',
      '#E....#.....#',
      '#############'
    ]
  },
  {
    id: 'wabe-23',
    number: 23,
    world: 2,
    title: 'Die zwei Zauberblüten',
    chapter: 'Kapitel 7: Magische Blüten-Portale',
    mapCoords: { q: 2, r: 1 },
    intro: 'Lila führt zu Lila und Türkis führt zu Türkis! Öffne erst das Honig-Tor zur zweiten Zauberblüte!',
    tip: '1) Sammle links alle Blüten, befreie die Biene und nutze die lila Zauberblüte. 2) Fülle in der Mitte die goldene Schale mit Honig, um zum türkisen Portal zu gelangen. 3) Drüben warten noch Freundin, Blüten und Koffer!',
    ascii: [
      '###################',
      '#P....#S....#..2.E#',
      '#.F...#~~...#.F...#',
      '#..1..###...#.....#',
      '#.###.#...1.#..O..#',
      '#..F..#.....#..R..#',
      '#..B..#.....#.F...#',
      '#.....#..U..#...B.#',
      '#.....####G##.....#',
      '#..F..#.F..2#..F..#',
      '###################'
    ]
  },
  {
    id: 'wabe-24',
    number: 24,
    world: 2,
    title: 'Frau Honigs Zauber-Garten',
    chapter: 'Kapitel 7: Magische Blüten-Portale',
    mapCoords: { q: 3, r: 0 },
    intro: 'Das große Welt-2-Finale! Lila Portal, Blüten-Druckplatte, goldene Honigschale und türkises Portal führen dich ans Ziel!',
    tip: '1) Fliege links durchs lila Portal, schiebe den Topf auf die Druckplatte und schlüpfe zurück. 2) Durch das geöffnete Blüten-Tor gelangst du zur Honigkammer – fülle die Schale für das Honig-Tor. 3) Durch das türkise Portal wartet rechts der Koffer!',
    ascii: [
      '#####################',
      '#P...#1....#S...#2.E#',
      '#.F..#..F..#~~..#...#',
      '#..1.#.O D####..#.F.#',
      '#....#######....#...#',
      '#....T..........#O..#',
      '#.F..#..B..#....#R..#',
      '#..B.#..F..#..U.#.F.#',
      '#....#.....####G#...#',
      '#..F.#.....#2.F.#B.F#',
      '#####################'
    ]
  }
];

export const CAMPAIGN_LEVELS: LevelDefinition[] = RAW_CAMPAIGN_LEVELS.map((level) => ({
  world: 1,
  ...level
}));
