# Sprint-Plan GPX → Insta-Reels (Feb 2026 – Aug 2027)

**Legende:**

- 🟢 Kernprodukt
- 🔵 UX / Feedback
- 🟣 Style / Animation
- 🟡 Monetarisierung / Business
- 🧘 Stabilisierung (bewusst nichts Neues)

**Hinweis:** Du bleibst bis August 2027 in deiner Vollzeitstelle. Der Exit ist **bedingungsabhängig** – nur wenn dein Projekt ausreichend Einnahmen generiert.

---

## Belastungs-Prinzipien (verbindlich)

Diese Regeln gelten für jeden Monat:

| Regel | Begründung |
|-------|------------|
| **Max. 2–3 schwere Themen pro Monat** | Mit Vollzeitjob, Krankheit, Depression ist mehr nicht nachhaltig |
| **Stabilisierungs-Monate einplanen** | Bewusst nichts Neues bauen, nur pflegen und atmen |
| **Energie > Features** | Ein fertiges Feature bei 70% Energie ist besser als drei angefangene bei 100% |
| **Pause ist keine Niederlage** | Schlechte Woche? Dann Wartung statt Neubau |

**Markierte Stabilisierungs-Monate:** Jun 2026 🧘, Okt 2026 🧘, Feb 2027 🧘

---

## Projekt-Eigenschaften

**Drei Eigenschaften, die es verkaufbar machen:**
1. Klarer, enger Use Case (GPX → Reel)
2. Visuelles Ergebnis (leicht teilbar, leicht zeigbar)
3. Creator-Zielgruppe (zahlen eher als B2C-Normalnutzer)

**Erwartung:** Nischenprodukt mit 500–2000 zahlenden Nutzern. Kein Unicorn, aber stabiler Cashflow.

---

## Ideen-Backlog (nicht eingeplant)

- Höhenmeter über das Jahr aggregiert animieren für End of Year Content
- Trainingstimeline über Monat oder Jahr erstellen
- **Eigene Presets speichern**
  - Aktuelles Design als eigenes Theme speichern
  - Name und Vorschau für gespeicherte Presets
  - Presets in localStorage oder Account speichern
  - Presets exportieren/importieren (JSON)
- **Service-Integrationen** (ergänzend zum GPX-Upload, nicht ersetzend)
  - Strava-Anbindung (OAuth2, Activity Streams API)
  - Komoot-Anbindung
  - Weitere Services: Garmin Connect, Wahoo, etc.
  - Ziel: Aktivität direkt auswählen statt GPX-Datei suchen

---

## Produkt-Hygiene Punkte (eingebaut Jan 2026)

Die folgenden 8 Punkte wurden als Lücken identifiziert und in die Timeline integriert:

| Punkt | Wo eingeplant | Kategorie |
|-------|---------------|-----------|
| 1. Visuelle Normalisierung (Y-Axis) | Feb 2026 | 🟢 Kern |
| 2. Coordinate-Contract | Feb 2026 | 🟢 Kern |
| 3. Animierbare Textlayer | Mai 2026 | 🟣 Style |
| 4. Theme- & Style-Layer | Feb 2026 | 🟣 Style |
| 5. Frame-Truth | Feb 2026 | 🟢 Kern |
| 6. Audio-Entscheidung | Mär 2026 | 🔵 UX |
| 7. Produkt-UX Basics | Apr 2026 | 🔵 UX |
| 8. Failure Paths | Mär 2026 | 🔵 UX |

---

## Feb 2026 – Technische Wahrheit + Theme-System

**Fokus:** Reproduzierbar schöne Videos + Design-Fundament für später
**Kein:** Preis, Business, Landingpage-Gedanke. Reine Technik.

- [x] 🟢 GPX Import + Downsampling (500–1500 Punkte)
- [x] 🟢 **Coordinate-Contract** (saubere Datenraum-Trennung)
  - `normalizeElevation(points)` → 0..1 (GPX → Chart-Datenraum)
  - `scaleToViewBox(normalizedPoints, width, height, padding)` → SVG-Pixel
  - Klare Trennung: GPX-Raum (m, km) → normiert (0–1) → ViewBox (px)
  - Ohne das wird jedes neue Feature zur Sauerei
- [x] 🟢 **Visuelle Normalisierung** (Wahrnehmung, nicht Performance)
  - Automatische Y-Axis Compression/Expansion
  - Mindest-Höhenunterschied für visuelle Spannung
  - Optional: "Visuelle Überhöhung" (nicht lügen, aber lesbar machen)
  - Ohne das sehen flache Strecken tot aus, steile sprengen die Skala
- [x] 🟢 **SVG-Animation: Stroke-draw + Marker** (Frame-basiert für Video-Export)
  - [x] 🟣 1. Animations-Architektur
    - `generateElevationFrame(options, progress: 0-1)` Funktion erstellen
    - Progress 0 = Start, Progress 1 = Ende
    - Rückgabe: SVG-String für diesen Frame
  - [x] 🟣 2. Linie progressiv zeichnen
    - Nur Datenpunkte bis `progress * data.length` rendern
    - Oder: clipPath mit `width = progress * chartWidth`
  - [x] 🟣 3. Area-Fill synchron zur Linie
    - Polygon nur bis zum aktuellen Fortschritt aufbauen
    - Gleicher clipPath-Ansatz wie Linie
  - [x] 🟣 4. Marker-Punkt am aktuellen Ende
    - Position = letzter sichtbarer Punkt der Kurve
    - Kreis mit konfigurierbarer Größe/Farbe
  - [x] 🟣 5. Animations-Optionen in ChartOptions
    - `animation?: { enabled: boolean, durationMs: number, fps: number, easing: 'linear' | 'ease-in-out' }`
    - Easing-Funktion auf Progress anwenden
  - [x] 🟣 6. Frame-Generator Utility
    - `generateAnimationFrames(options)` → Array von SVG-Strings
    - Berechnet alle Frames basierend auf fps + duration
    - z.B. 30fps × 5s = 150 Frames
  - [x] 🔵 7. Preview-Player im Generator
    - Frames als "Daumenkino" abspielen (requestAnimationFrame)
    - Play/Pause/Scrubber Controls
    - Geschwindigkeitsregler (0.25x - 2x)
  - [x] 🔵 8. Testen & Feinschliff
    - Performance mit 500+ Datenpunkten ✅
    - Smooth Easing testen ✅
    - Memory-Verbrauch bei vielen Frames ✅
    - 91 Tests, 98% Coverage für elevationChart.ts
- [x] 🟢 **Frame-Truth** (deterministische Frame-Erzeugung)
  - SVG ist die Single Source of Truth
  - Gleiche Frames im Preview wie im Export (pixelgenau)
  - Kein "Warum sieht mein Video anders aus als die Vorschau?"
  - Vertrauen = Produkt-Qualität
- [x] 🟢 **MP4 Export 1080×1920** (ffmpeg.wasm, Client-seitig)
  - [x] Setup
    - [x] ffmpeg.wasm Packages installieren (`@ffmpeg/ffmpeg`, `@ffmpeg/util`)
    - [x] Vite-Config: SharedArrayBuffer Headers hinzufügen (COOP/COEP)
  - [x] Composable `useVideoExport`
    - [x] FFmpeg laden und initialisieren
    - [x] SVG-Frames zu PNG konvertieren (via Canvas)
    - [x] PNG-Sequenz an FFmpeg übergeben
    - [x] FFmpeg MP4-Encoding ausführen (H.264, 30fps)
    - [x] MP4 als Download anbieten
  - [x] UI
    - [x] Export-Button in ElevationChartStep hinzufügen
    - [x] Progress-Anzeige während Export (Ladebalken + Stage-Chip)
    - [x] Kurvenhöhe-Slider (15-60% der Reel-Höhe)
    - [ ] Export-Einstellungen Dialog (Auflösung, FPS, Qualität)
  - [ ] Qualitätssicherung
    - [ ] Browser-Kompatibilität prüfen (SharedArrayBuffer Support)
    - [ ] Testen auf Chrome, Firefox, Edge
  - [x] Instagram Reel Specs: 9:16, 1080x1920, SVG mit Gradient-Hintergrund
- [x] 🟣 **Silhouette-Modus Customization** (Jan 2026)
  - [x] Kurve berührt alle Ränder (links, rechts, unten)
  - [x] Kurvenhöhe-Slider erweitert auf 15-100% der Reel-Höhe
  - [x] Marker ein-/ausschaltbar
  - [x] Höhenmeter-Labels mit Farbwähler
  - [x] Kilometer-Labels mit Farbwähler
  - [x] Hintergrundfarbe wählbar (Solid Color)
  - [x] Multiple Hintergrundtypen: Solid, Gradient, Mesh, Grid, Dots
  - [x] Kurvenfarbe wählbar
- [ ] 🔵 2–3 eigene GPX-Tracks testen
- [x] 🟣 **Theme- & Style-Layer** (Design-System statt Hardcoding)
  - [x] Definierte Themes: dark, minimal, bold, neon, sunset
  - [x] Design-Tokens: Farben, Stroke-Width, Marker-Stil, Background-Type
  - [x] Theme-Auswahl im UI mit Vorschau
  - [x] Fundament für Textlayer und Pro-Templates

## Mär 2026 – Feedback & Realitätstest

**Kernfrage dieses Monats:** Drückt irgendwer freiwillig auf Bezahlen?

- [ ] 🟡 **Früher Monetarisierungs-Test** (wichtigste Metrik!)
  - "Pay what you want" oder "Support this export with 3€"
  - Nicht um Geld zu verdienen – um Zahlungsbereitschaft zu validieren
  - **Diese eine Zahl ist wertvoller als jede Feature-Idee**
- [ ] 🔵 Freunde / Kollegen GPX hochladen lassen
- [ ] 🔵 UX-Fehler sammeln & beheben
- [ ] 🔵 **Failure Paths** (Edge Cases & Robustheit)
  - Was wenn GPX nur 30 Punkte hat? → Warnung + sinnvoller Fallback
  - Was wenn Strecke 800 km lang ist? → Auto-Downsampling + Hinweis
  - Was wenn Höhenmeter = 0? → Flache Linie oder Hinweis
  - Was wenn GPX kaputt ist? → Klare Fehlermeldung
- [ ] 🔵 **Audio-Entscheidung** (bewusste Positionierung)
  - Stummes Video? → Klar kommunizieren
  - Klare Aussage: "Video bewusst ohne Audio – für Reels gedacht"  

## Apr 2026 – Landingpage & UX Polish

- [ ] 🔵 Landingpage bauen
- [ ] 🔵 **Produkt-UX Basics** (Upload → Klick → Posten)
  - Presets statt Optionen-Overload
  - "Quick Export" Button für Standardfall
  - "Sieht gut aus"-Pfad für 80% der Nutzer
- [ ] 🟢 Export optimieren (Encoding, Geschwindigkeit)
- [ ] 🔵 Erste Reels posten & Feedback sammeln
- [ ] 🟡 Monetarisierung: erste 5–10 bezahlte Exporte  

## Mai 2026 – Textlayer

**Ein schweres Thema: Animierbare Textlayer (Theme-Layer bereits in Feb erledigt)**

- [ ] 🟣 **Animierbare Textlayer** (Social-Media-Gold)
  - Strecke (km), Höhenmeter, Datum als animierbare Elemente
  - Text fade-in bei 10–15% Progress
  - Nutzt Design-Tokens aus Theme-Layer
  - Ohne Text = "nice", mit Text = **postwürdig**
- [ ] 🟣 Erste Theme-Varianten erstellen (minimal, bold, dark, neon)
- [ ] 🟡 Monetarisierung: Preis / Abo-Option überlegen  

## Jun 2026 – Stabilisierung 🧘

**Bewusst nichts Neues bauen. Atmen, pflegen, verfeinern.**

- [ ] 🔵 Feedback auswerten
- [ ] 🟣 Typo, Marker, Animationstempo verfeinern
- [ ] 🧘 Technische Schulden aufräumen
- [ ] 🧘 Dokumentation aktualisieren
- [ ] 🟡 Monetarisierung: bestehende Flows optimieren (nicht neue Features)  

## Jul 2026 – Performance & Overlay

- [ ] 🟢 Ruckelfrei auf allen Geräten
- [ ] 🔵 Mobile UI/UX optimieren
- [ ] 🟢 Overlay-Idee vorbereiten (Video-Hintergrund)
- [ ] 🟢 Export mit Alpha-Kanal vorbereiten  

## Aug 2026 – Overlay & Social Proof

- [ ] 🟢 Overlay offiziell testen
- [ ] 🟡 Monetarisierung: Pay-per-Export + kleine Abos
- [ ] 🔵 Social Proof sammeln: erste Testimonials, Screenshots  

## Sep 2026 – Pro Features

- [ ] 🟢 Kernprodukt stabil & skalierbar
- [ ] 🟣 Style finalisieren
- [ ] 🟣 „Pro Creator" Templates anbieten
- [ ] 🟡 Monetarisierung optimieren

## Okt 2026 – Stabilisierung 🧘

**Pause. Nur Bugfixes und kleine Verbesserungen.**

- [ ] 🧘 Bugs aus September beheben
- [ ] 🧘 Performance-Monitoring einrichten
- [ ] 🧘 Backup/Recovery prüfen
- [ ] 🔵 Nutzerfeedback kategorisieren (für nächste Phase)  

## Nov 2026 – Feedbackrunde 2

- [ ] 🔵 Größere Nutzergruppe testen
- [ ] 🟢 Bugs beheben, Performance final
- [ ] 🔵 Feedback sammeln und priorisieren

## Dez 2026 – Marketing & Monetarisierung

- [ ] 🔵 Marketing pushen: Reichweite erhöhen
- [ ] 🟡 Monetarisierung: Abo + Pay-per-Export offiziell
- [ ] 🔵 Jahresrückblick: Erfolge und Learnings dokumentieren  

## Jan 2027 – Wachstum

- [ ] 🟢 Stabilität & Export/Overlay perfektionieren
- [ ] 🔵 Community aufbauen
- [ ] 🟡 Monetarisierung skalieren

## Feb 2027 – Stabilisierung 🧘

**Halbzeit-Pause. Energie tanken vor der letzten Phase.**

- [ ] 🧘 Nur Wartung, keine neuen Features
- [ ] 🧘 Codebase aufräumen
- [ ] 🔵 Retrospektive: Was funktioniert, was nicht?
- [ ] 🔵 Plan für Mär–Jul adjustieren basierend auf Realität

## Mär–Jul 2027 – Exit-Vorbereitung

- [ ] 🔵 Social Proof ausbauen (Testimonials, Case Studies)
- [ ] 🟡 Einnahmen stabilisieren
- [ ] 🔵 Exit nur vorbereiten, wenn Projekt tragfähig
- [ ] 🔵 Notfallplan dokumentieren (falls Exit nicht möglich)  

## Aug 2027 – Bedingungsabhängiger Exit / Vollzeitstelle bleibt

- [ ] 🟡 Exit durchführen nur, wenn Einnahmen & Sicherheit stimmen  
- [ ] 🔵 Rad abgeleast → Freiheit  
- [ ] 🟢 Projekt bereit für nächste Phase, unabhängig vom Jobstatus
