# 100 Dinge die wir besser machen können als Relive

Relive ist stark in: automatischer 3D-Flyover, Strava-Integration, große Nutzerbasis.
Relive ist schwach in: **Individualisierung, Kartografik, Creator-Tools, Datenkontrolle**.
Genau da greifen wir an.

Legende: 🟢 1 Tag · 🟡 2–3 Tage · 🔴 Stretch (Ende Woche) · ✅ Erledigt

---

## ✅ Zuletzt umgesetzt

- ~~**Undo/Redo für Konfiguration** — Snapshot-before-burst, max 50 Einträge, 800 ms Debounce, Ctrl+Z / Ctrl+Shift+Z~~
- ~~**Satellitenbild als Hintergrund** — Esri World Imagery Kacheln, Deckkraft-Slider, Proxy war schon vorhanden~~
- ~~**Km-Labels frei positionierbar** — Drag & Drop direkt im SVG-Preview, Positionen werden gespeichert~~
- ~~**Momente-Chips frei positionierbar** — Drag & Drop, Chips sofort sichtbar nach Aktivierung (Ghost-Opacity)~~
- ~~**Momente visuell verbessert** — Amber-Farbe, größer, gestrichelte Verbindungslinie zum Routenpunkt~~
- ~~**Routen-Kontur (Halo)** — breitere, halbtransparente Kopie der Routenfarbe darunter, sichtbar auf dunklen und hellen Hintergründen~~
- ~~**Feedback-Button** — direkt in der App-Sidebar, öffnet Dialog~~
- ~~**Dunkel/Hell-Modus** — Toggle in der App-Sidebar~~
- ~~**Flüsse verbessert** — Glow-Effekt (Doppelstrich), variable Strichstärke nach Typ, Streams ergänzt~~
- ~~**Wälder** (`natural=wood`, `landuse=forest`) — grüne Flächen, Mindestflächen-Filter~~
- ~~**Ortsgrenzen** (`place=city|town|village`) — gestrichelte Polygon-Umrisse~~

---

## 🗺️ Karte & Geo-Layer

1. ✅ ~~**Wasserflächen** (Seen, Teiche) — `natural=water` aus Overpass, blau gefüllt~~
2. ✅ ~~**Gletscher** — `natural=glacier`, hellblau/weiß, perfekt für Alpenrouten~~
3. ✅ ~~**Weinberge / Obstgärten** — `landuse=vineyard|orchard`, eigene Farbe~~
4. ✅ ~~**Wiesen / Felder** — `landuse=meadow|farmland`, dezentes Gelbgrün~~
5. ✅ ~~**Bebauung / Siedlungsflächen** — `landuse=residential|commercial`, graubeige~~
6. ✅ ~~**Farbschema für Landnutzung** — alle Flächen als kohärentes Paket (wie Topo-Karte)~~
7. ✅ ~~**Schummerung** (Hillshade) — aus AWS Terrarium Höhendaten eine Schattenebene berechnen~~
8. ✅ ~~**Topografischer Kartenstil** — vordefiniertes Preset das alle Geo-Layer zusammen aktiviert~~
9. ✅ ~~**Straßen** — Hauptstraßen/Autobahnen aus Overpass, sehr dezent, nur als Orientierung~~
10. ✅ ~~**Satellitenbild als Hintergrund** — optionale Kachel-Ebene hinter allem (schon Proxy vorhanden)~~

---

## 🎨 Visuelle Anpassung (Relives größte Schwäche)

11. 🟢 **Farbthemen / Presets** — 5–8 vorgefertigte Farbschemata (Dark, Light, Topo, Neon, Vintage)
12. 🟢 **Routenfarbe nach Herzfrequenz** — wenn GPX HR-Daten hat, Farbe = HR-Zone
13. ✅ ~~**Routenfarbe nach Tempo** — langsam = kalt, schnell = warm~~
14. 🟢 **Routenfarbe nach Steigung** — grün = flach, rot = steil (schon teilweise vorhanden)
15. 🟢 **Strichstärke der Route** konfigurierbar — dünne elegante Linie vs. fette Sportlinie
16. 🟢 **Gestrichelte Route** — Dash-Pattern wählbar (Punkte, Striche, custom)
17. 🟡 **Gradient entlang Route** — Farbe wechselt kontinuierlich von Start bis Ziel
18. 🟡 **Hintergrundfarbe aus Bild extrahieren** — User lädt Foto hoch, App nimmt Hauptfarbe
19. 🟡 **Schriftart wählbar** — System-Fonts + Google Fonts für Labels
20. 🟢 **Marker-Icon wählbar** — Punkt, Pfeil, Fahrrad, Läufer, Wanderer (SVG-Icons)

---

## 📊 Elevation & Statistiken (Relive zeigt kaum Daten)

21. 🟢 **Herzfrequenz-Kurve** neben Höhenprofil — wenn GPX-Daten vorhanden
22. 🟢 **Tempo-Kurve** — Geschwindigkeit über Distanz als eigene Linie
23. 🟢 **Watt-Kurve** (Power) — für Radfahrer mit PowerMeter
24. 🟢 **Kadenz-Kurve** — für Radfahrer/Läufer
25. 🟢 **Mehrere Kurven übereinandergelegt** — z.B. Höhe + HR gleichzeitig
26. 🟡 **Live-Stats animiert** — Zahlen zählen während Animation hoch (Distance, Gain, Time)
27. 🟡 **Segmentvergleich** — markiere ein Segment, zeige Vor/Zurück-Zeiten
28. 🟡 **Höhenprofilvergleich** — zwei Routen im gleichen Chart vergleichen
29. ✅ ~~**Max/Min Annotationen auto** — höchster/niedrigster Punkt, steilster Auf-/Abstieg auto-markiert (Momente-Feature)~~
30. ✅ ~~**Pässe / Gipfel erkennen** — GPX-Hochpunkte als Peaks aus Overpass API mit Label~~

---

## 🎬 Animation & Export (Relive: nur ein festes Format)

31. 🟢 **Exportformat wählbar** — 9:16 (Reels), 1:1 (Feed), 16:9 (YouTube), 4:5 (Portrait)
32. 🟢 **Animationsgeschwindigkeit** — Slider für fps / Gesamtdauer (schon vorhanden, verbessern)
33. 🟡 **Slow-Motion an Pässen** — automatisch langsamer werden bei steilen Segmenten
34. 🟡 **Reverse-Animation** — Route rückwärts abspielen
35. 🟡 **Loop-Modus** — Animation wiederholt sich nahtlos (gut für Social)
36. 🟢 **Standbild-Export** — schönstes Frame als PNG/SVG exportieren
37. 🟡 **GIF-Export** — für Plattformen ohne Video-Support
38. 🔴 **Mehrere Routen in einem Video** — z.B. Hin- und Rückweg
39. 🟢 **Intro-Dauer** konfigurierbar — wie lange Titel steht (schon teilweise vorhanden)
40. 🟢 **Outro mit Gesamtstats** — letztes Frame zeigt alle Zahlen zusammengefasst

---

## ✏️ Overlays & Text (Relive: kaum Custom-Text)

41. 🟢 **Beliebige Text-Overlays** — User tippt Text, positioniert frei per Drag
42. 🟢 **Aktivitätstyp-Label** — "🚴 Radfahren", "🏃 Laufen", "🥾 Wandern" als Chip
43. 🟢 **Datum/Uhrzeit Overlay** — aus GPX-Timestamp automatisch
44. 🟢 **Wetter-Overlay** — manuell eingebbar (Temperatur, Bedingungen)
45. 🟢 **Logo/Wasserzeichen** — eigenes Bild hochladen als Overlay
46. 🟡 **Strava-Segment-Namen** als Annotations einblenden
47. ✅ ~~**Kilometermarker** — konfigurierbar (Intervall wählbar) + frei per Drag positionierbar~~
48. 🟢 **Startzeit einblenden** — "Gestartet: 07:42 Uhr"
49. 🟡 **Teammate-Tracking** — mehrere Routen gleichzeitig animiert (z.B. Gruppenausfahrt)
50. 🟢 **Fortschrittsbalken** unten — subtiler Balken der mit Animation mitläuft

---

## 🔌 Import & Integration (Relives Kernvorteil — aber angreifbar)

51. 🔴 **Strava OAuth Import** — direkter Connect ohne GPX-Download
52. 🟡 **Garmin Connect Import** — via FIT-File Parser
53. 🟢 **FIT-File Support** — Garmin/Wahoo/Polar Dateien direkt einlesen
54. 🟢 **TCX-File Support** — älteres Garmin-Format
55. 🟢 **KML-File Support** — Google Maps Export
56. 🟢 **Komoot-Link einfügen** — URL einfügen, GPX wird automatisch geladen
57. 🟡 **Drag & Drop Upload** — Datei direkt auf die Seite ziehen
58. 🟢 **Mehrere GPX gleichzeitig** — ganzen Urlaub als Sammlung hochladen
59. 🔴 **Apple Health / Wahoo Integration**
60. 🟡 **URL-Share einer Route** — Route in URL encodiert, direkt teilbar

---

## 📱 UX & Onboarding (Relive: guter Onboarding-Flow)

61. 🟢 **One-Click Demo** — Beispiel-Route vorgeladen, sofort spielen ohne Upload
62. 🟢 **Preset-Gallery** — 6 fertige Styles zum Anklicken, sofort sieht man das Ergebnis
63. 🟡 **Tour durch Features** — interaktiver Tooltip-Guide beim ersten Besuch
64. ✅ ~~**Undo/Redo** für Konfigurationsänderationen~~
65. 🟢 **Config als JSON exportieren/importieren** — Settings zwischen Projekten teilen
66. 🟡 **Vorschau-Thumbnails** für Farbthemen statt nur Text-Dropdown
67. 🟢 **Keyboard Shortcuts** — Leertaste = Play/Pause, Pfeile = vor/zurück scrubben
68. 🟢 **Fullscreen-Vorschau** — F oder Button für Vollbild
69. 🟡 **Mobile-optimierte Sidebar** — Sidebar als Bottom-Sheet auf kleinen Screens
70. 🟢 **"Zuletzt verwendet" Presets** — letzte 3 Configs merken

---

## 🔒 Datenschutz & Kontrolle (Relive: Daten gehen auf deren Server)

71. 🟢 **"Alle Daten bleiben lokal"** — prominent kommunizieren, kein Upload der GPX-Daten
72. ✅ ~~**Route anonymisieren** — Start/Ziel automatisch unscharf machen (Radius konfigurierbar)~~
73. 🟢 **Bereich ausblenden** — User zieht Rechteck auf Karte, dieser Bereich wird nicht animiert
74. 🟡 **Offline-Modus** — gecachte Tiles, App läuft auch ohne Internet
75. 🟢 **DSGVO-Banner prominent** — "Kein Account nötig, keine Daten gespeichert"

---

## 🏔️ Sport-spezifische Features

76. 🟢 **Aktivitätstyp-Preset** — "Radfahren" aktiviert andere Default-Layer als "Wandern"
77. 🟢 **Baumgrenze einzeichnen** — horizontale Linie bei ~2000m im Höhenprofil
78. 🟢 **Schneegrenze** — analog zur Baumgrenze
79. 🟡 **Strava-KOM Segmente** einzeichnen (via Strava API)
80. 🟢 **Gesamthöhenmeter prominent** — große Zahl im Overlay, nicht nur im Stats-Block
81. 🟢 **W/kg Anzeige** — wenn Power + Gewicht bekannt
82. 🟢 **Ø-Herzfrequenz Zone** — farbiger Hintergrund hinter HR-Kurve nach Zone
83. 🟡 **Höhenprofil gespiegelt** — Hinweg oben, Rückweg unten (für Rundtouren)
84. 🟢 **Steigungsklassen-Legende** — Farbskala neben Karte
85. 🟢 **Distanz bis zum Gipfel** — automatisch aus Peaks + Route berechnet

---

## 💡 Kleine Quick-Wins die großen Eindruck machen

86. ✅ ~~**Puls-Animation am Marker** — der Punkt "atmet" während er sich bewegt~~
87. ✅ ~~**Route erscheint mit Zeichnen-Effekt** — Linie wird sichtbar gezeichnet~~
88. ✅ ~~**Schatten unter Route-Linie** — dezenter Drop-Shadow für Tiefe~~
89. 🟢 **Kartenrand-Vignette** — dunkler Rand-Gradient für kinematischen Look
90. 🟢 **Start-Marker = grün, Ziel-Marker = rot** — klar unterscheidbar
91. 🟢 **"Gerade hochgeladen"** Konfetti-Animation beim ersten Rendern
92. 🟢 **Zeitstempel im Video** — läuft mit GPS-Zeit mit
93. 🟡 **Kamera-Shake** — minimales Wackeln beim Chase-Mode für immersiveres Gefühl
94. ✅ ~~**Dunkel/Hell-Modus** für die App selbst~~
95. 🟢 **Ladebalken beim Overpass-Fetch** mit Schätzung "~3 Sekunden"

---

## 📣 Marketing & Wachstum

96. 🟢 **"Made with [Appname]"** Wasserzeichen optional einblenden (opt-in, nicht opt-out)
97. 🟢 **Share-Button** der direkt zu Instagram/TikTok führt
98. 🟡 **Galerie öffentlicher Routen** — User können ihr Video freigeben, andere sehen es
99. 🟡 **Embed-Code** — fertige Animation als `<iframe>` einbetten
100. ✅ ~~**Feedback-Button** direkt in der App — niedrigschwellig, geht an dich als Email~~

---

## Prioritäten — nächste Schritte

| # | Feature | Status | Warum |
|---|---------|--------|-------|
| 1 | ~~Wasserflächen (Seen)~~ | ✅ | — |
| 2 | Farbthemen / Presets | 🟢 | Größter WOW-Effekt für neue User |
| 3 | One-Click Demo Route | 🟢 | Senkt Onboarding-Friction drastisch |
| 4 | FIT-File Support | 🟢 | Öffnet Garmin-Zielgruppe |
| 5 | Marker-Icon wählbar | 🟢 | Kleine Sache, große Personalisierung |
| 6 | ~~Schummerung (Hillshade)~~ | ✅ | — |
| 7 | Outro mit Gesamtstats | 🟢 | Perfektes letztes Frame für Social |
| 8 | ~~Route anonymisieren~~ | ✅ | — |
| 9 | ~~Satellitenbild als Hintergrund~~ | ✅ | — |
| 10 | Keyboard Shortcuts | 🟢 | Macht die App sofort professioneller |
| 11 | "Alle Daten bleiben lokal" kommunizieren | 🟢 | Killer-Argument gegen Relive |
