# 100 Dinge die wir besser machen können als Relive

Relive ist stark in: automatischer 3D-Flyover, Strava-Integration, große Nutzerbasis.
Relive ist schwach in: **Individualisierung, Kartografik, Creator-Tools, Datenkontrolle**.
Genau da greifen wir an.

Legende: 🔴 Hoher Impact · 🟡 Mittlerer Impact · 🟢 Kleiner Impact / Nische · ✅ Erledigt

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
- ~~**Ladebalken mit Fortschritt & Schätzung** — simulierter Fortschritt + "~X Sek." für alle 12 Geo-Layer~~
- ~~**Wetter-Overlay** — automatisch via Open-Meteo API aus GPX-Koordinaten + Zeitstempel, editierbar~~
- ~~**Flüsse verbessert** — Glow-Effekt (Doppelstrich), variable Strichstärke nach Typ, Streams ergänzt~~
- ~~**Wälder** (`natural=wood`, `landuse=forest`) — grüne Flächen, Mindestflächen-Filter~~
- ~~**Ortsgrenzen** (`place=city|town|village`) — gestrichelte Polygon-Umrisse~~

---

## 🔴 Hoher Impact

_Direkte Differenzierung gegenüber Relive, Onboarding-Friction, virales Potenzial._

- 61. **One-Click Demo** — Beispiel-Route vorgeladen, kein Upload nötig → senkt Absprungrate drastisch
- 31. **Exportformat wählbar** — 9:16 (Reels), 1:1 (Feed), 16:9 (YouTube) → ohne das ist das Video unbrauchbar für Social
- ~~26. **Live-Stats animiert** — Zahlen zählen während Animation hoch (Distance, Gain, Time) → viralestsem Feature~~ ✅
- 53. **FIT-File Support** — Garmin/Wahoo/Polar direkt einlesen → öffnet die größte Zielgruppe
- ~~62. **Preset-Gallery** — 6 fertige Styles zum Anklicken → sofortiger WOW-Effekt ohne Konfiguration~~ ✅
- 41. **Beliebige Text-Overlays** — User tippt Text, positioniert frei → größte Personalisierungslücke von Relive
- 36. **Standbild-Export** — schönstes Frame als PNG → viele wollen kein Video, nur ein schönes Bild
- 96. **"Made with [Appname]"** — opt-in Wasserzeichen → virales Wachstum, kostenloser Marketing-Kanal
- 97. **Share-Button** → direkt zu Instagram/TikTok
- 21. **Herzfrequenz-Kurve** neben Höhenprofil — wenn GPX-Daten vorhanden → Datenerweiterung die Relive nicht bietet
- 22. **Tempo-Kurve** — Geschwindigkeit über Distanz → meistgefragte Statistik nach Höhe

---

## 🟡 Mittlerer Impact

_Klarer Mehrwert für aktive Nutzer, verbessert das Produkt spürbar._

_(Visuelle Anpassung)_
- 17. **Gradient entlang Route** — Farbe wechselt kontinuierlich von Start bis Ziel → sieht professionell aus
- 19. **Schriftart wählbar** — System-Fonts + Google Fonts für Labels

_(Elevation & Statistiken)_
- 25. **Mehrere Kurven übereinandergelegt** — z.B. Höhe + HR gleichzeitig
- 23. **Watt-Kurve** (Power) — für Radfahrer mit PowerMeter
- 24. **Kadenz-Kurve** — für Radfahrer/Läufer
- 80. **Gesamthöhenmeter prominent** — große Zahl im Overlay, nicht nur im Stats-Block

_(Animation & Export)_
- 35. **Loop-Modus** — Animation wiederholt sich nahtlos → gut für Stories/GIFs
- 37. **GIF-Export** — für Plattformen ohne Video-Support
- 33. **Slow-Motion an Pässen** — automatisch langsamer bei steilen Segmenten

_(Overlays & Text)_
- 42. **Aktivitätstyp-Label** — "🚴 Radfahren", "🏃 Laufen", "🥾 Wandern" als Chip
- 43. **Datum/Uhrzeit Overlay** — aus GPX-Timestamp automatisch
- 45. **Logo/Wasserzeichen** — eigenes Bild hochladen als Overlay
- 48. **Startzeit einblenden** — "Gestartet: 07:42 Uhr"

_(Import & Integration)_
- 54. **TCX-File Support** — älteres Garmin-Format
- 55. **KML-File Support** — Google Maps Export
- 56. **Komoot-Link einfügen** — URL einfügen, GPX automatisch laden
- 58. **Mehrere GPX gleichzeitig** — ganzen Urlaub als Sammlung
- 52. **Garmin Connect Import** — via FIT-File Parser

_(UX & Onboarding)_
- 67. **Keyboard Shortcuts** — Leertaste = Play/Pause, Pfeile = scrubben → macht die App professionell
- 68. **Fullscreen-Vorschau** — F oder Button für Vollbild
- 65. **Config als JSON exportieren/importieren** — Settings zwischen Projekten teilen
- 66. **Vorschau-Thumbnails** für Farbthemen statt nur Text-Dropdown
- 70. **"Zuletzt verwendet" Presets** — letzte 3 Configs merken

_(Datenschutz)_
- 73. **Bereich ausblenden** — User zieht Rechteck, dieser Bereich wird nicht animiert

_(Sport-spezifisch)_
- 76. **Aktivitätstyp-Preset** — "Radfahren" aktiviert andere Default-Layer als "Wandern"
- 84. **Steigungsklassen-Legende** — Farbskala neben Karte

_(Marketing)_
- 98. **Galerie öffentlicher Routen** — User können ihr Video freigeben
- 60. **URL-Share einer Route** — Route in URL encodiert, direkt teilbar

---

## 🟢 Kleiner Impact / Nische

_Nice-to-have, sehr spezifisch, oder aufwendig für wenig Reichweite._

_(Visuelle Anpassung)_
- 18. **Hintergrundfarbe aus Bild extrahieren** — User lädt Foto hoch, App nimmt Hauptfarbe → Nische, manuell genauso schnell

_(Elevation & Statistiken)_
- 27. **Segmentvergleich** — markiere ein Segment, zeige Vor/Zurück-Zeiten → Trainingsdaten-Nische
- 28. **Höhenprofilvergleich** — zwei Routen im gleichen Chart vergleichen

_(Animation & Export)_
- 34. **Reverse-Animation** — Route rückwärts abspielen → Gimmick
- 38. **Mehrere Routen in einem Video** — z.B. Hin- und Rückweg → komplex, seltener Use-Case

_(Overlays & Text)_
- 46. **Strava-Segment-Namen** als Annotations → abhängig von Strava API
- 49. **Teammate-Tracking** — mehrere Routen gleichzeitig animiert → komplex, seltener Use-Case

_(Import & Integration)_
- 57. **Drag & Drop Upload** — Datei direkt auf die Seite ziehen → kleine UX-Verbesserung
- 51. **Strava OAuth Import** → Strava kann Zugang jederzeit sperren, hohes Risiko
- 59. **Apple Health / Wahoo Integration** → sehr komplex, sehr nischig

_(UX & Onboarding)_
- 63. **Tour durch Features** — interaktiver Tooltip-Guide beim ersten Besuch → low Retention-Impact
- 69. **Mobile-optimierte Sidebar** — Bottom-Sheet auf kleinen Screens → Mobile ist nicht die Kernzielgruppe

_(Datenschutz)_
- 74. **Offline-Modus** — gecachte Tiles → komplex, wenig Mehrwert bei Karten-App

_(Sport-spezifisch)_
- 77. **Baumgrenze einzeichnen** — horizontale Linie bei ~2000m
- 78. **Schneegrenze** — analog zur Baumgrenze
- 79. **Strava-KOM Segmente** → API-abhängig
- 81. **W/kg Anzeige** — wenn Power + Gewicht bekannt → sehr nischig
- 82. **Ø-Herzfrequenz Zone** — farbiger Hintergrund hinter HR-Kurve
- 83. **Höhenprofil gespiegelt** — Hinweg oben, Rückweg unten
- 85. **Distanz bis zum Gipfel** — automatisch berechnet

_(Quick-Wins)_
- 91. **Konfetti-Animation** beim ersten Rendern → Gimmick
- 92. **Zeitstempel im Video** — läuft mit GPS-Zeit mit
- 93. **Kamera-Shake** — minimales Wackeln beim Chase-Mode → Gimmick

_(Marketing)_
- 99. **Embed-Code** — fertige Animation als `<iframe>` einbetten

---

## ✅ Erledigt

_(Karte & Geo-Layer)_
- 1. ~~**Wasserflächen** (Seen, Teiche) — `natural=water` aus Overpass~~
- 2. ~~**Gletscher** — `natural=glacier`, hellblau/weiß~~
- 3. ~~**Weinberge / Obstgärten** — `landuse=vineyard|orchard`~~
- 4. ~~**Wiesen / Felder** — `landuse=meadow|farmland`~~
- 5. ~~**Bebauung / Siedlungsflächen** — `landuse=residential|commercial`~~
- 6. ~~**Farbschema für Landnutzung** — alle Flächen als kohärentes Paket~~
- 7. ~~**Schummerung** (Hillshade) — aus AWS Terrarium Höhendaten~~
- 8. ~~**Topografischer Kartenstil** — Preset das alle Geo-Layer zusammen aktiviert~~
- 9. ~~**Straßen** — Hauptstraßen/Autobahnen aus Overpass~~
- 10. ~~**Satellitenbild als Hintergrund** — Esri World Imagery~~

_(Visuelle Anpassung)_
- 11. ~~**Farbthemen / Presets** — 5–8 vorgefertigte Farbschemata~~
- 12. ✅ **Routenfarbe nach Herzfrequenz** — 5 Zonen (Z1–Z5, blau→rot) basierend auf % HFmax
- 13. ~~**Routenfarbe nach Tempo** — langsam = kalt, schnell = warm~~
- 14. ~~**Routenfarbe nach Steigung** — grün = flach, rot = steil~~
- 15. ~~**Strichstärke der Route** konfigurierbar~~
- 16. ~~**Gestrichelte Route** — Trail-Pattern für die noch-nicht-gezeichnete Strecke~~
- 20. ✅ **Marker-Icon wählbar** — Punkt, Pfeil (Fahrrad/Läufer/Wanderer im Backlog)

_(Elevation & Statistiken)_
- 29. ~~**Max/Min Annotationen auto** — höchster/niedrigster Punkt, steilster Auf-/Abstieg~~
- 30. ~~**Pässe / Gipfel erkennen** — GPX-Hochpunkte als Peaks aus Overpass~~

_(Animation & Export)_
- 32. ~~**Animationsgeschwindigkeit** — Duration Slider, Easing wählbar~~
- 39. ~~**Intro-Dauer** konfigurierbar~~
- 40. ~~**Outro mit Gesamtstats** — letztes Frame zeigt alle Zahlen~~

_(Overlays & Text)_
- 44. ~~**Wetter-Overlay** — automatisch aus GPX-Timestamp + Open-Meteo~~
- 47. ~~**Kilometermarker** — Intervall wählbar + frei per Drag positionierbar~~

_(UX & Onboarding)_
- 64. ~~**Undo/Redo** für Konfigurationsänderungen~~

_(Datenschutz)_
- 72. ~~**Route anonymisieren** — Start/Ziel automatisch unscharf machen~~

_(Quick-Wins)_
- 86. ~~**Puls-Animation am Marker** — der Punkt "atmet" während er sich bewegt~~
- 87. ~~**Route erscheint mit Zeichnen-Effekt** — Linie wird sichtbar gezeichnet~~
- 88. ~~**Schatten unter Route-Linie** — dezenter Drop-Shadow für Tiefe~~
- 89. ~~**Kartenrand-Vignette** — `showMapFade` Gradient am unteren Kartenrand~~
- 90. ~~**Start-Marker = grün, Ziel-Marker = rot**~~
- 94. ~~**Dunkel/Hell-Modus** für die App selbst~~
- 95. ~~**Ladebalken beim Overpass-Fetch**~~

_(Marketing)_
- 100. ~~**Feedback-Button** direkt in der App~~

---

## ➕ Implementiert (nicht in ursprünglicher Liste)

- ✅ ~~**Chase-Kamera** — Marker-Verfolgung mit Zoom-Out am Ende, optionale Rotation~~
- ✅ ~~**Pan-Zoom (Kamerafahrt)** — Höhenprofil zoomt ins steilste Segment rein und wieder raus~~
- ✅ ~~**Effort-Animationsmodus** — variable Strichstärke + Farbverlauf + Glow je nach Steigung~~
- ✅ ~~**Hintergrundbild** — eigenes Foto als Hintergrund mit Blur, Helligkeit, Kontrast, Overlay~~
- ✅ ~~**Nordpfeil** — automatisch ausgerichtet~~
- ✅ ~~**Maßstabsleiste** — geografisch korrekt berechnet~~
- ✅ ~~**Höhenlinien (Konturen)** — aus AWS Terrarium Tiles~~
- ✅ ~~**Wälder** — `natural=wood` + `landuse=forest`~~
- ✅ ~~**Fahrtrichtungspfeil** — Pfeil am Marker dreht sich mit Route~~
- ✅ ~~**Start/Ziel-Labels** — A/B Punkte einblendbar~~
- ✅ ~~**Flüsse** — aus Overpass mit Glow-Effekt und variabler Strichstärke~~
- ✅ ~~**Ortsgrenzen** — gestrichelte Polygon-Umrisse~~
- ✅ ~~**Momente (Annotations)** — frei positionierbare Chips mit Leader-Line, Ghost-Preview~~
- ✅ ~~**Route-Kontur (Halo)** — halbtransparente Outline unter der Route~~
- ✅ ~~**Gradient/Time-based Animationsmodus** — Route animiert nach Steigung oder GPS-Zeit~~
