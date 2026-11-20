import { LevelDefinition } from '../types';

export const CAMPAIGN_LEVELS: LevelDefinition[] = [
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
  }
];
