# BeeDash – Leitfaden für eigene 3D-Modelle & Sounds

BeeDash startet sofort mit eingebauten 3D-Modellen und Web-Audio-Sounds.  
Wenn du später Grafiken oder Sounds von spezialisierten Anbietern (z. B. **Meshy**, **Tripo3D**, **Blender**, **Suno**, **ElevenLabs SFX** oder **Freesound**) einbinden möchtest, kannst du sie hier einfach als Drop-in-Dateien ablegen.

---

## 1. Ordnerstruktur

```text
public/assets/
├── manifest.json       <- Verknüpft Schlüssel mit Dateipfaden
├── models/             <- Eigene 3D-Modelle im .glb-Format
└── audio/              <- Eigene Soundeffekte & Musik (.mp3 / .wav / .ogg)
```

---

## 2. 3D-Modelle (`.glb`) einbinden

Lege deine `.glb`-Dateien in `public/assets/models/` ab und trage sie in `public/assets/manifest.json` unter `"models"` ein.  
BeeDash skaliert jedes geladene Modell automatisch passend auf eine Waben-Feldgröße (~`0.88` Einheiten) und zentriert es.

### Mögliche Modell-Schlüssel
| Schlüssel | Bedeutung im Spiel | Tipps zur Ausrichtung |
| :--- | :--- | :--- |
| `bee` | Spieler-Biene | Blickrichtung standardmäßig nach vorne (`+Z`) oder leicht geneigt, Flügel seitlich |
| `honeypot` | Honigtopf | Aufrecht (`+Y` oben) |
| `flower` | Einsammelbare Blüte | Blüte Richtung Kamera (`+Z`) oder leicht nach `+Y/+Z` geneigt |
| `trapped_bee` | Eingeschlossene Bienenfreundin | Aufrecht in kleiner Blase |
| `suitcase` | Frau Honigs Koffer (Ziel) | Vorderseite Richtung `+Z` |
| `wax` | Grabbares Bienenwachs | Würfel-/Wabenform |
| `wall` | Fester Bienenstock-Rahmen | Holz-/Harzblock |
| `rounded_wall` | Abgerundete Wabe | Abgerundeter Block zum Abrollen |
| `honey_source` | Tropfende Honigwabe (Quelle) | Auslass nach unten (`-Y`) |

Beispiel für `manifest.json`:
```json
{
  "models": {
    "bee": "assets/models/biene.glb",
    "honeypot": "assets/models/honigtopf.glb",
    "flower": "assets/models/blume.glb"
  },
  "audio": {}
}
```

---

## 3. Sounds & Musik (`.mp3`, `.wav`, `.ogg`) einbinden

Lege Audiodateien in `public/assets/audio/` ab und trage sie unter `"audio"` in `manifest.json` ein.  
Nicht eingetragene Schlüssel nutzen automatisch die freundlichen eingebauten Synth-Sounds.

### Mögliche Audio-Schlüssel
| Schlüssel | Wann wird er abgespielt? |
| :--- | :--- |
| `dig` | Biene knabbert/gräbt durch Wachs |
| `bee_move` | Sanftes Brummen beim Weiterfliegen von Feld zu Feld |
| `trick_1` | Lustiger Sound beim Mini-Purzelbaum (Joystick-Taste) |
| `trick_2` | Verspielter Wirbel-Sound bei der Pirouette (Joystick-Taste) |
| `trick_3` | Hüpf-Sound beim Schwänzeltanz (Joystick-Taste) |
| `flower` | Blüte eingesammelt |
| `rescue` | Bienenfreundin befreit |
| `pot_wobble` | Honigtopf wackelt kurz vor dem Fallen |
| `pot_land` | Honigtopf landet weich |
| `pot_push` | Honigtopf wird geschoben |
| `honey_drip` | Flüssiger Honig tropft |
| `honey_collect` | Flüssiger Honig sicher eingesammelt |
| `exit_open` | Alle Ziele erreicht – Frau Honigs Koffer öffnet sich |
| `exit_locked` | Koffer ist noch verschlossen |
| `bonk_pot` | Honigtopf auf dem Kopf gelandet |
| `sticky_wings` | Flügel im tropfenden Honig verklebt |
| `win` | Wabe geschafft! |
| `bgm` | Leise Hintergrundmusik im Level (Endlosschleife) |
| `map_bgm` | Ruhige, langsame Melodie auf der Bienenstock-Karte |

Beispiel:
```json
{
  "models": {},
  "audio": {
    "flower": "assets/audio/blume.mp3",
    "win": "assets/audio/fanfare.mp3",
    "bgm": "assets/audio/bienenwiese.mp3"
  }
}
```
