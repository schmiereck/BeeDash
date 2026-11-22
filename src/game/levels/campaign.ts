import { LevelDefinition } from '../types';

export type HivePersonality = 'diligent' | 'funny' | 'shy' | 'lazy' | 'curious';

export interface CampaignWorld {
  number: number;
  title: string;
  shortTitle: string;
  personality: HivePersonality;
  personalityTag: string;
  emoji: string;
  subtitle: string;
  accentColor: string;
}

export const CAMPAIGN_WORLDS: CampaignWorld[] = [
  {
    number: 1,
    emoji: '🍯',
    title: 'Bienenstock 1: Die Fleißigen',
    shortTitle: 'Die Fleißigen',
    personality: 'diligent',
    personalityTag: 'Fleißig & hilfsbereit',
    subtitle: 'Waben 1–12',
    accentColor: '#f5b731'
  },
  {
    number: 2,
    emoji: '🎉',
    title: 'Bienenstock 2: Die Lustigen',
    shortTitle: 'Die Lustigen',
    personality: 'funny',
    personalityTag: 'Lustig & verspielt',
    subtitle: 'Waben 13–24',
    accentColor: '#f46d91'
  },
  {
    number: 3,
    emoji: '🌸',
    title: 'Bienenstock 3: Die Schüchternen',
    shortTitle: 'Die Schüchternen',
    personality: 'shy',
    personalityTag: 'Schüchtern & schlau',
    subtitle: 'Waben 25–36',
    accentColor: '#e87fa5'
  },
  {
    number: 4,
    emoji: '💤',
    title: 'Bienenstock 4: Die Faulen',
    shortTitle: 'Die Faulen',
    personality: 'lazy',
    personalityTag: 'Gemütlich & verträumt',
    subtitle: 'Waben 37–48',
    accentColor: '#639cd9'
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
  },
  {
    id: 'wabe-25',
    number: 25,
    world: 3,
    title: 'Schüchterne Doppel-Brücke',
    chapter: 'Kapitel 8: Versteckte Schalter & Portale',
    mapCoords: { q: 0, r: 0 },
    intro: 'Willkommen bei den Schüchternen! Schiebe oben den Topf aufs Blüten-Kissen und lass unten einen zweiten Topf von der runden Wabe abrollen!',
    tip: '1) Schiebe den oberen Honigtopf auf die Druckplatte – das Blüten-Tor öffnet sich. 2) Grabe unten links neben der runden Wabe den Platz frei, damit der mittlere Topf abrollt und dir den Durchgang öffnet!',
    ascii: [
      '#############',
      '#P..O  D#..E#',
      '#.F.#####...#',
      '#...O...T.F.#',
      '#.#.R###.##.#',
      '#....#F..#..#',
      '#.F..#..B#..#',
      '#....#....F.#',
      '#############'
    ]
  },
  {
    id: 'wabe-26',
    number: 26,
    world: 3,
    title: 'Portal-Postbote',
    chapter: 'Kapitel 8: Versteckte Schalter & Portale',
    mapCoords: { q: 1, r: 0 },
    intro: 'Zwei verschlossene Blüten-Tore trennen die Kammern! Fliege durchs lila Portal ganz nach rechts hinter den Honigtopf und schiebe ihn nach links!',
    tip: 'Schlüpfe oben durch die lila Zauberblüte nach rechts, fliege rechts an der Wand hinter den Honigtopf und schiebe ihn nach links auf die Druckplatte. Dadurch gehen gleich beide Blüten-Tore auf!',
    ascii: [
      '#############',
      '#P..1.#...1.#',
      '#.F...#.F...#',
      '#.....#D  O.#',
      '####T########',
      '#.....#....E#',
      '#.F...T..F..#',
      '#..B..#.....#',
      '#############'
    ]
  },
  {
    id: 'wabe-27',
    number: 27,
    world: 3,
    title: 'Honigtropfen-Portal',
    chapter: 'Kapitel 8: Versteckte Schalter & Portale',
    mapCoords: { q: 1, r: 1 },
    intro: 'Das Honig-Tor unten bleibt zu, bis der Honig durch die obere Portal-Kammer in die goldene Schale getropft ist!',
    tip: '1) Fliege durchs lila Portal zur Honigquelle. 2) Grabe senkrecht unterhalb rechts vom See bis zur goldenen Schale frei und weiche seitlich aus, damit der Honig hineintropft. 3) Zurück durchs Portal steht unten das Honig-Tor offen!',
    ascii: [
      '#############',
      '#P..1.#S..1.#',
      '#.F...#~~...#',
      '#.....##....#',
      '##.####.....#',
      '#..F..#..U..#',
      '#..B..#######',
      '#.....G..F.E#',
      '#############'
    ]
  },
  {
    id: 'wabe-28',
    number: 28,
    world: 3,
    title: 'Honig hinterm Blüten-Tor',
    chapter: 'Kapitel 8: Versteckte Schalter & Portale',
    mapCoords: { q: 0, r: 1 },
    intro: 'Vorrätiger Honig wartet hoch oben auf einem geschlossenen Blüten-Tor! Grabe erst darunter den Schacht zur Schale, bevor du das Tor öffnest!',
    tip: '1) Grabe in der Mitte direkt unter dem Blüten-Tor den Schacht bis knapp über der goldenen Schale frei. 2) Schiebe dann links den Honigtopf auf die Druckplatte: Das Blüten-Tor öffnet sich, der Honig tropft in die Schale und öffnet dir trocken das Honig-Tor!',
    ascii: [
      '#################',
      '#P....##.##....E#',
      '#.F...##~##..F..#',
      '#.....##~##.....#',
      '#..O D##T##.....#',
      '#.######.##.....#',
      '#..........G....#',
      '#.F..B.#.#.#.F..#',
      '#......#U#.#..B.#',
      '#......###.#....#',
      '#################'
    ]
  },
  {
    id: 'wabe-29',
    number: 29,
    world: 3,
    title: 'Doppel-Schalter-Tausch',
    chapter: 'Kapitel 8: Versteckte Schalter & Portale',
    mapCoords: { q: -1, r: 1 },
    intro: 'Zwei Druckplatten in verschiedenen Kammern: eine erreichst du zu Fuß, auf die zweite muss ein Honigtopf von oben punktgenau abrollen!',
    tip: '1) Schiebe links den ersten Topf auf das obere Blüten-Kissen. 2) Fliege durch das lila Portal in die Mitte, grabe den Fallschacht links der runden Wabe bis zur zweiten Druckplatte frei und weiche links aus – schon rollt der Topf perfekt auf den Schalter!',
    ascii: [
      '###################',
      '#P....#1..O..#...E#',
      '#.F...#...R..#.F..#',
      '#..1..#......#....#',
      '#.....#......#....#',
      '#.....#......T....#',
      '#..O D###....#.##.#',
      '#.#######....#..B.#',
      '#.......#D#..#....#',
      '#.F..B..######.F..#',
      '###################'
    ]
  },
  {
    id: 'wabe-30',
    number: 30,
    world: 3,
    title: 'Zwei-Wege-Zauber',
    chapter: 'Kapitel 8: Versteckte Schalter & Portale',
    mapCoords: { q: -1, r: 0 },
    intro: 'Lila und türkis im schnellen Doppelpass! Ohne den Schalter oben bleibt das Blüten-Tor in der unteren Mitte für dich versperrt.',
    tip: '1) Nimm links das lila Portal in die obere Mitte und schiebe dort den Honigtopf auf die Druckplatte. 2) Fliege per lila Portal zurück, schlüpfe unten ins türkise Portal und wandere durch das geöffnete Blüten-Tor zur letzten Blüte und Freundin!',
    ascii: [
      '#############',
      '#P.1#1...#2E#',
      '#.F.#.F..#..#',
      '#...#.O D#F.#',
      '#...######..#',
      '#..2#....T..#',
      '#.B.#.F..#B.#',
      '#...#....#..#',
      '#############'
    ]
  },
  {
    id: 'wabe-31',
    number: 31,
    world: 3,
    title: 'Die zwei goldenen Schalen',
    chapter: 'Kapitel 9: Die große Kniffel-Wabe',
    mapCoords: { q: 0, r: -1 },
    intro: 'Gleich zwei goldene Honigschalen müssen voll werden, bevor das große Honig-Tor aufgeht! Räume links den Topf beiseite und senke rechts die zweite Schale ab.',
    tip: '1) Schiebe in der ersten Honigkammer den Topf nach rechts, grabe direkt darunter zur Schale und öffne den ersten Honigdamm. 2) Grabe rechts unter der zweiten Schale bis auf den Steinboden, damit sie tief hinabsinkt, und öffne dann erst den rechten Honigsee!',
    ascii: [
      '###################',
      '#P...#S...#..S#..E#',
      '#.F..#~~..#.~~#...#',
      '#....###..#.###.F.#',
      '#....#..O #...#...#',
      '#......#..#U..#...#',
      '#.F..#..U.#...#.B.#',
      '#..B.#.####...G...#',
      '#....#........#...#',
      '#....#....##..#.F.#',
      '###################'
    ]
  },
  {
    id: 'wabe-32',
    number: 32,
    world: 3,
    title: 'Doppel-Wippe im Portal',
    chapter: 'Kapitel 9: Die große Kniffel-Wabe',
    mapCoords: { q: 1, r: -1 },
    intro: 'Auf der rechten Seite wartet hinter dem Blüten-Tor noch eine gefangene Freundin! Aktiviere erst beide Druckplatten, ehe du das türkise Portal nimmst.',
    tip: '1) Drücke links den ersten Topf auf das Kissen. 2) Schlüpfe per lila Portal in die Mitte und grabe den Schacht links der runden Wabe bis zur zweiten Druckplatte frei, damit der Topf hinabfällt. 3) Durch das türkise Portal steht jetzt das Blüten-Tor offen!',
    ascii: [
      '###################',
      '#P...#1..O..#2...E#',
      '#.F..#...R..#.F...#',
      '#..1.#......#.....#',
      '#....#......#.....#',
      '#....###.#.####T###',
      '#..O D##....#.....#',
      '#.######..2.#..B..#',
      '#......#D#..#.....#',
      '#.F..B.######..F..#',
      '###################'
    ]
  },
  {
    id: 'wabe-33',
    number: 33,
    world: 3,
    title: 'Die Domino-Schale',
    chapter: 'Kapitel 9: Die große Kniffel-Wabe',
    mapCoords: { q: 2, r: -1 },
    intro: 'Eine echte Kettenreaktion: Die Druckplatte lässt die goldene Schale genau zwischen zwei Honigseen plumpsen – und öffnet so das Honig-Tor zum Portal!',
    tip: '1) Schiebe den Honigtopf auf die Druckplatte – die goldene Schale fällt mitten ins Honigbad und öffnet unten das Honig-Tor! 2) Dahinter wartet das lila Portal: Rolle drüben den oberen Topf nach rechts von der runden Wabe, um an die geheime Blüte zu kommen.',
    ascii: [
      '###################',
      '#P.....#.F.#1....E#',
      '#.F......U.#..F...#',
      '#..O D###T####....#',
      '#.######   ##FO...#',
      '#......#   ###R...#',
      '#.F..B.#~ ~#......#',
      '#......#####..B...#',
      '#......G.1.#..F...#',
      '#......#####......#',
      '###################'
    ]
  },
  {
    id: 'wabe-34',
    number: 34,
    world: 3,
    title: 'Doppel-Topf-Aufzug',
    chapter: 'Kapitel 9: Die große Kniffel-Wabe',
    mapCoords: { q: 2, r: 0 },
    intro: 'Zwei gestapelte Honigtöpfe über zwei Blüten-Kissen! Mach zuerst den Weg darunter sauber, dann plumpsen sie im Takt nebeneinander.',
    tip: '1) Grabe zuerst über der linken Druckplatte ein freies Feld und anschließend die ganze Spalte unter den beiden gestapelten Töpfen bis zur rechten Druckplatte frei! 2) Weiche nach links aus: Der untere Topf landet rechts, der obere rollt von ihm aufs linke Kissen. Danach kannst du in der rechten Kammer die Honigschale füllen!',
    ascii: [
      '#####################',
      '#P...#..O..#S...#..E#',
      '#.F..#..O..#~~..#.F.#',
      '#....#.....##...#...#',
      '#..........#....#...#',
      '#....#.....T....#...#',
      '#.F..#.....#....#.B.#',
      '#..B.#.....#..U.#...#',
      '#....##DD#.#..###...#',
      '#....#######..F.G.F.#',
      '#####################'
    ]
  },
  {
    id: 'wabe-35',
    number: 35,
    world: 3,
    title: 'Kreuz-und-Quer-Portale',
    chapter: 'Kapitel 9: Die große Kniffel-Wabe',
    mapCoords: { q: 2, r: 1 },
    intro: 'Vier verschlossene Ecken und zwei Portale: Finde erst den Rückweg über die Zauberblüten, um das Honig-Tor zum Koffer zu sprengen!',
    tip: '1) Über das lila Portal kommst du nach unten rechts: Schiebe dort den Topf auf das Blüten-Kissen. 2) Über das türkise Portal geht es nach oben rechts durch das geöffnete Blüten-Tor zur Honigquelle – fülle die Schale für das Honig-Tor. 3) Durch beide Portale zurück öffnet sich nun die Kammer unten links!',
    ascii: [
      '#####################',
      '#P.......##2...#...S#',
      '#.F...F..##.F..#..~~#',
      '#.......1##....T..###',
      '#........##....#.U..#',
      '#####G###############',
      '#..#.....##.........#',
      '#.#FO....##1.....B..#',
      '#.B#R..F.##..O D###.#',
      '#E.......##..###2.F.#',
      '#####################'
    ]
  },
  {
    id: 'wabe-36',
    number: 36,
    world: 3,
    title: 'Das große Finale der Schüchternen',
    chapter: 'Kapitel 9: Die große Kniffel-Wabe',
    mapCoords: { q: 3, r: 0 },
    intro: 'Das Meisterstück im 3. Bienenstock! Alle Mechaniken arbeiten hier Hand in Hand bis in die geheime Schatzkammer zum Koffer.',
    tip: '1) Drücke links die erste Druckplatte und springe durchs lila Portal. 2) Grabe in der oberen Mitte unter der runden Wabe bis zur zweiten Druckplatte, damit der Topf darauf abrollt – das Blüten-Tor öffnet sich! 3) Fülle dahinter rechts die Honigschale für das Honig-Tor, rolle unten den letzten Topf von der runden Wabe ab und fliege durchs türkise Portal in die Schatzkammer!',
    ascii: [
      '#######################',
      '#P....#1.....#.....S..#',
      '#.F...#...OF.#.F..~~..#',
      '#.....#...R..#...U##..#',
      '#..O D#......T........#',
      '#.#####......#........#',
      '#.....#.#D#..#####G####',
      '#..B..#########.......#',
      '#.F...#..F..##FO......#',
      '#.....#..B..###R....F.#',
      '#..1..#E...2#.2....B..#',
      '#.....#.....#.........#',
      '#######################'
    ]
  },
  {
    id: 'wabe-37',
    number: 37,
    world: 4,
    title: 'Die gemütliche Made',
    chapter: 'Kapitel 10: Hungrige Maden & flinke Milben',
    mapCoords: { q: 0, r: 0 },
    intro: 'Willkommen bei den Faulen! Hier wohnt eine langsame Waben-Made. Sie futtert sich gemächlich durchs Wachs und nascht gern an Blüten – aber keine Sorge: jede vernaschte Blüte wächst als Knospe wieder nach!',
    tip: 'Du brauchst vor der Made keine Angst zu haben! Wenn du schneller bist, schnappst du ihr die Blüten direkt vor der Nase weg – oder du wartest kurz, bis ihre Knospe wieder aufgeblüht ist.',
    ascii: [
      '#############',
      '#P..F......E#',
      '#..##...##..#',
      '#.....M.....#',
      '#.F.......F.#',
      '#...##.##...#',
      '#.....F.....#',
      '#############'
    ]
  },
  {
    id: 'wabe-38',
    number: 38,
    world: 4,
    title: 'Nachwachsende Knospen',
    chapter: 'Kapitel 10: Hungrige Maden & flinke Milben',
    mapCoords: { q: 1, r: 0 },
    intro: 'Gleich zwei Maden suchen im Wachs nach frischen Blüten! Befreie unten deine Bienenfreundin und schnappe dir alle Blüten – notfalls nach dem Nachwachsen!',
    tip: 'Sobald eine Made eine Blüte vernascht hat, sprießt dort eine kleine grüne Knospe. Nach einigen Sekunden blüht sie wieder prachtvoll auf!',
    ascii: [
      '#############',
      '#P..#...#..E#',
      '#.F.#.F.#...#',
      '# M # M #F..#',
      '#.......#...#',
      '#..###.###..#',
      '#.F...B...F.#',
      '#...........#',
      '#############'
    ]
  },
  {
    id: 'wabe-39',
    number: 39,
    world: 4,
    title: 'Flinke Milbe im Gang',
    chapter: 'Kapitel 10: Hungrige Maden & flinke Milben',
    mapCoords: { q: 1, r: 1 },
    intro: 'Die kleine rote Honig-Milbe flitzt besonders schnell durch bereits freie Tunnel! Im weichen Wachs hingegen bremst sie ab.',
    tip: 'Fliege zuerst links hinunter zu den offenen Blüten, bevor die Milbe dich überholt, und arbeite dich dann rechts hoch bis zum Koffer!',
    ascii: [
      '#############',
      '#P..F......E#',
      '#.###.###.#.#',
      '#.F.....F.#.#',
      '#.#.###.#.#.#',
      '#...........#',
      '#.#######.#.#',
      '#F    m   .F#',
      '#############'
    ]
  },
  {
    id: 'wabe-40',
    number: 40,
    world: 4,
    title: 'Topf drauf, Pause!',
    chapter: 'Kapitel 10: Hungrige Maden & flinke Milben',
    mapCoords: { q: 0, r: 1 },
    intro: 'Schwere Honigtöpfe helfen gegen die hungrige Made! Lass den Topf oben rechts in den Tunnel unter ihm plumpsen, damit die Made sanft schläft.',
    tip: '1) Grabe unter dem Honigtopf senkrecht bis zu dem offenen Tunnel über der Made und weiche seitlich aus – plumps, schon versperrt der Topf ihren Weg! 2) Sammle alle Blüten ein und befreie rechts die Freundin.',
    ascii: [
      '#################',
      '#P....O....#...E#',
      '#.F........#.F..#',
      '#......###.#....#',
      '#...M  F...#....#',
      '#..###.###.#.##.#',
      '#.......m..#..B.#',
      '#.F...###..#....#',
      '#.....F........F#',
      '#################'
    ]
  },
  {
    id: 'wabe-41',
    number: 41,
    world: 4,
    title: 'Schlummer-Topf am Rundkorb',
    chapter: 'Kapitel 10: Hungrige Maden & flinke Milben',
    mapCoords: { q: -1, r: 1 },
    intro: 'Eine flink umherwuselnde Milbe, eine gemächliche Made und ein wackeliger Honigtopf auf der runden Wabe erwarten dich!',
    tip: 'Lass den Wachs-Schutz um die rechte Seitenkammer ruhig so lange stehen, bis du links alles gesammelt hast – die runde Wabe hilft dir beim Abrollen des Topfes nach Wunsch.',
    ascii: [
      '#################',
      '#P....O....#...E#',
      '#.F...R....#.F..#',
      '#..........#....#',
      '#..######..#....#',
      '#.F.#..M...#..B.#',
      '#...#..F...#.##.#',
      '#..........#....#',
      '#.m.....F..#..F.#',
      '#...............#',
      '#################'
    ]
  },
  {
    id: 'wabe-42',
    number: 42,
    world: 4,
    title: 'Blüten-Schalter & Waben-Diebe',
    chapter: 'Kapitel 10: Hungrige Maden & flinke Milben',
    mapCoords: { q: -1, r: 0 },
    intro: 'Ein Blüten-Kissen öffnet das rechte Gatter – währenddessen knabbert die Made schon an der linken Blüte! Entscheid dich klug für deine Reihenfolge.',
    tip: '1) Schnappe dir zuerst schnell die linke Blüte oder warte geduldig, bis sie nachwächst. 2) Schiebe dann den oberen Honigtopf nach rechts auf die Druckplatte und rette hinter dem Tor deine Freundin!',
    ascii: [
      '#############',
      '#P..O D#...E#',
      '#.F.####.F..#',
      '#......T....#',
      '#..M...#.##.#',
      '#.F....#.B..#',
      '#......#....#',
      '#...m....F..#',
      '#############'
    ]
  },
  {
    id: 'wabe-43',
    number: 43,
    world: 4,
    title: 'Honigfluss trotz Maden-Appetit',
    chapter: 'Kapitel 11: Im verträumten Bienenstock',
    mapCoords: { q: 0, r: -1 },
    intro: 'In den tieferen Hallen warten Honigquelle, goldene Schale und Honig-Tor – gleichzeitig naschen zwei Maden fröhlich vor sich hin.',
    tip: 'Grabe zuerst links deine erste Freundin frei, wandere unten in den mittleren Raum und öffne der Honigquelle senkrecht den Weg in die goldene Schale. Schon öffnet sich rechts das Honig-Tor!',
    ascii: [
      '###################',
      '#P....#S...#.....E#',
      '#.F...#~~..#.F....#',
      '#..M..##...#......#',
      '#.....#....#..B...#',
      '#....F#..U.#......#',
      '#.....####.#G######',
      '#..........#......#',
      '#.B...#..M.....F..#',
      '#.....#..F.#......#',
      '###################'
    ]
  },
  {
    id: 'wabe-44',
    number: 44,
    world: 4,
    title: 'Wettlauf durch Zauber-Portale',
    chapter: 'Kapitel 11: Im verträumten Bienenstock',
    mapCoords: { q: 1, r: -1 },
    intro: 'Zwei Zauber-Portale verbinden ferne Kammern, während zwei flinke Milben schon Kurs auf die versteckten Blüten genommen haben!',
    tip: '1) Nutze links das lila Portal nach unten rechts und sammle schnell die Blüte ein. 2) Arbeite dich in der Mitte hoch und hinüber nach unten links zur Freundin. 3) Durchs türkise Portal geht es schließlich zum Koffer!',
    ascii: [
      '###################',
      '#P....#.....F#2..E#',
      '#.F...#...####....#',
      '#..1..#..m...#..F.#',
      '#######......#....#',
      '#....2#..F...#....#',
      '#.F...#####.#######',
      '#..B..#......#....#',
      '#................F#',
      '#.....#..m...#.1..#',
      '###################'
    ]
  },
  {
    id: 'wabe-45',
    number: 45,
    world: 4,
    title: 'Rolltreppe aufs Blüten-Kissen',
    chapter: 'Kapitel 11: Im verträumten Bienenstock',
    mapCoords: { q: 2, r: -1 },
    intro: 'Oben ruht ein schwerer Topf auf der runden Wabe, direkt über einer tiefen Blüten-Druckplatte! Beeil dich an der Made vorbei nach oben.',
    tip: '1) Sammle links ein, wandere durch den rechten Durchgang nach oben in die Mittelkammer und grabe die linke Fallspalte bis auf die Druckplatte frei. 2) Fliege oben über den Topf nach links – schon rollt er genau aufs Kissen und öffnet das Blüten-Tor!',
    ascii: [
      '###################',
      '#P....#..O..#....E#',
      '#.F...#..R..#..F..#',
      '#..M..#.....#.....#',
      '#.....#.....T.....#',
      '#.....#.....#..m..#',
      '#.....##D#.##.##.##',
      '#.......#...#..B..#',
      '#.F...#.....#.....#',
      '#.....#.....#..F..#',
      '###################'
    ]
  },
  {
    id: 'wabe-46',
    number: 46,
    world: 4,
    title: 'Die doppelte Bäckerei',
    chapter: 'Kapitel 11: Im verträumten Bienenstock',
    mapCoords: { q: 2, r: 0 },
    intro: 'Zwei Blüten-Druckplatten auf der linken Seite, dazu eine goldene Honigschale in der Mitte – und überall wuseln hungrige Mitbewohner herum!',
    tip: '1) Drücke beide Honigtöpfe links auf ihre Blüten-Kissen – das Blüten-Tor rechts öffnet sich. 2) Öffne in der Mitte den Weg zwischen Honigsee und goldener Schale, damit unten das Honig-Tor aufspringt!',
    ascii: [
      '#####################',
      '#P....#..S...#.....E#',
      '#.F...#..~~..#..F...#',
      '#..M..#.#.#..#......#',
      '#.....#......#..B...#',
      '#..O D#..U...T......#',
      '#.#########..########',
      '#............#..m...#',
      '#.O D.#..M...#.F....#',
      '#.###.#..F...G....F.#',
      '#####################'
    ]
  },
  {
    id: 'wabe-47',
    number: 47,
    world: 4,
    title: 'Zwei-Portale-Kuchen',
    chapter: 'Kapitel 11: Im verträumten Bienenstock',
    mapCoords: { q: 2, r: 1 },
    intro: 'Lila führt in den Keller, Türkis hoch zum geheimen Abroll-Topf vor dem Koffer – und zwischendurch will die goldene Honigschale gefüllt werden!',
    tip: '1) Fliege per lila Portal in die Mitte, fülle dort die Honigschale für das Honig-Tor und besuche unten rechts und unten links die Blüten. 2) Durchs türkise Portal rollst du den letzten Honigtopf links von der runden Wabe weg zur Freundin und zum Koffer!',
    ascii: [
      '#####################',
      '#P....#..S...#2.#..E#',
      '#.F...#..~~..#..O.F.#',
      '#..1..#.#.##.#..R#..#',
      '#######......#..##..#',
      '#....2#..U...#...#B.#',
      '#..M..#####.#########',
      '#.....#.....#....m..#',
      '#.F........mG..M....#',
      '#.....#..1..#..F..F.#',
      '#####################'
    ]
  },
  {
    id: 'wabe-48',
    number: 48,
    world: 4,
    title: 'Das große Finale der Faulen',
    chapter: 'Kapitel 11: Im verträumten Bienenstock',
    mapCoords: { q: 3, r: 0 },
    intro: 'Das krönende Meisterstück von Bienenstock 4! Druckplatten, Rolltopf, Honigquelle, Zauber-Portale, Bienenfreundinnen sowie Maden und Milben greifen hier alle ineinander.',
    tip: '1) Drücke links oben die Druckplatte und nimm unten das lila Portal. 2) Rolle den oberen Topf auf das zweite Kissen, um das Blüten-Tor zu öffnen. 3) Fülle dahinter die Honigschale fürs Honig-Tor, springe unten rechts durchs türkise Portal in die Schatzkammer und kehre per Portal zurück zum Koffer!',
    ascii: [
      '#######################',
      '#P....#1.....#..S.#..E#',
      '#.F...#...O..#..~~#F..#',
      '#..M..#...R..#..U##...#',
      '#..O D#......#..#.#...#',
      '#.#####..m...T....#...#',
      '#.....#.#D#..####G#.#.#',
      '#..B..#########.......#',
      '#.F...#..F..#m..O.....#',
      '#.....#...B.#...R...F.#',
      '#..1..#.2...#.2....B..#',
      '#.....#..M..#.........#',
      '#######################'
    ]
  }
];

export const CAMPAIGN_LEVELS: LevelDefinition[] = RAW_CAMPAIGN_LEVELS.map((level) => ({
  world: 1,
  ...level
}));
