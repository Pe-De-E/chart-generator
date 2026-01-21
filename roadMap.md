# Sprint-Plan GPX → Insta-Reels (Feb 2026 – Aug 2027)

**Legende:**  

- 🟢 Kernprodukt  
- 🔵 UX / Feedback  
- 🟣 Style / Animation  
- 🟡 Monetarisierung / Business

**Hinweis:** Du bleibst bis August 2027 in deiner Vollzeitstelle. Der Exit ist **bedingungsabhängig** – nur wenn dein Projekt ausreichend Einnahmen generiert.

---

Weitere Ideen:

- Höhenmeter über das Jahr aggregiert animieren für End of Year Content
- Trainingstimeline über Monat oder Jahr erstellen

---

## Produkt-Hygiene Punkte (eingebaut Jan 2026)

Die folgenden 8 Punkte wurden als Lücken identifiziert und in die Timeline integriert:

| Punkt | Wo eingeplant | Kategorie |
|-------|---------------|-----------|
| 1. Visuelle Normalisierung (Y-Axis) | Feb 2026 | 🟢 Kern |
| 2. Coordinate-Contract | Feb 2026 | 🟢 Kern |
| 3. Animierbare Textlayer | Mai 2026 | 🟣 Style |
| 4. Theme- & Style-Layer | Mai 2026 | 🟣 Style |
| 5. Frame-Truth | Feb 2026 | 🟢 Kern |
| 6. Audio-Entscheidung | Mär 2026 | 🔵 UX |
| 7. Produkt-UX Basics | Mär 2026 | 🔵 UX |
| 8. Failure Paths | Mär 2026 | 🔵 UX |

---

## Feb 2026 – Basis & Pipeline

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
- [ ] 🟢 **SVG-Animation: Stroke-draw + Marker** (Frame-basiert für Video-Export)
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
  - [ ] 🔵 7. Preview-Player im Generator
    - Frames als "Daumenkino" abspielen (setInterval)
    - Play/Pause/Scrubber Controls
  - [ ] 🔵 8. Testen & Feinschliff
    - Performance mit 500+ Datenpunkten
    - Smooth Easing testen
    - Memory-Verbrauch bei vielen Frames
- [x] 🟢 **Frame-Truth** (deterministische Frame-Erzeugung)
  - SVG ist die Single Source of Truth
  - Gleiche Frames im Preview wie im Export (pixelgenau)
  - Kein "Warum sieht mein Video anders aus als die Vorschau?"
  - Vertrauen = Produkt-Qualität
- [ ] 🟢 **MP4 Export 1080×1920** (ffmpeg.wasm, Client-seitig)
  - [ ] Setup
    - [ ] ffmpeg.wasm Packages installieren (`@ffmpeg/ffmpeg`, `@ffmpeg/util`)
    - [ ] Vite-Config: SharedArrayBuffer Headers hinzufügen (COOP/COEP)
  - [ ] Composable `useVideoExport`
    - [ ] FFmpeg laden und initialisieren
    - [ ] SVG-Frames zu PNG konvertieren (via Canvas)
    - [ ] PNG-Sequenz an FFmpeg übergeben
    - [ ] FFmpeg MP4-Encoding ausführen (H.264, 30fps)
    - [ ] MP4 als Download anbieten
  - [ ] UI
    - [ ] Export-Button in ElevationChartStep hinzufügen
    - [ ] Progress-Anzeige während Export (Ladebalken)
    - [ ] Export-Einstellungen (Auflösung, FPS, Qualität)
  - [ ] Qualitätssicherung
    - [ ] Browser-Kompatibilität prüfen (SharedArrayBuffer Support)
    - [ ] Testen auf Chrome, Firefox, Edge
  - [ ] Instagram Reel Specs: 9:16, min 720x1280, 3-90 Sek
- [ ] 🔵 2–3 eigene GPX-Tracks testen  

## Mär 2026 – Feedback & erste Monetarisierung

- [ ] 🔵 Freunde / Kollegen GPX hochladen lassen
- [ ] 🔵 UX-Fehler sammeln & beheben
- [ ] 🟣 Animation flüssiger machen
- [ ] 🔵 **Failure Paths** (Edge Cases & Robustheit)
  - Was wenn GPX nur 30 Punkte hat? → Warnung + sinnvoller Fallback
  - Was wenn Strecke 800 km lang ist? → Auto-Downsampling + Hinweis
  - Was wenn Höhenmeter = 0? → Flache Linie oder Hinweis
  - Was wenn GPX kaputt ist? → Klare Fehlermeldung
  - Ohne das fühlt sich das Produkt "fragil" an
- [ ] 🔵 **Produkt-UX Basics** (Upload → Klick → Posten)
  - Presets statt Optionen-Overload
  - "Quick Export" Button für Standardfall
  - "Sieht gut aus"-Pfad für 80% der Nutzer
  - Power-User-Optionen später/versteckt
- [ ] 🔵 **Audio-Entscheidung** (bewusste Positionierung)
  - Stummes Video? → Klar kommunizieren
  - Musik separat in Insta hinzufügen? → Dokumentieren
  - Klare Aussage: "Video bewusst ohne Audio – für Reels gedacht"
  - Unklarheit = Support-Hölle
- [ ] 🟡 Pay-per-Export testen / freiwilliger Support-Button  

## Apr 2026 – Landingpage & Social Sharing

- [ ] 🔵 Landingpage bauen  
- [ ] 🟢 Export optimieren (Encoding, Geschwindigkeit)  
- [ ] 🔵 erste Reels posten & Feedback sammeln  
- [ ] 🟡 Monetarisierung: erste 5–10 bezahlte Exporte  

## Mai 2026 – Templates & Overlay-Test

- [ ] 🟣 **Theme- & Style-Layer** (Design-System statt Hardcoding)
  - Definierte Themes: minimal, bold, dark, neon
  - Design-Tokens: Farben, Line-Width, Marker-Stil, Area-Opacity
  - Nicht hart codieren → später verkaufbar
  - Theme-Auswahl im UI
- [ ] 🟣 **Animierbare Textlayer** (Social-Media-Gold)
  - Strecke (km), Höhenmeter, Datum, Ort als animierbare Elemente
  - Timing: Text fade-in nicht bei Frame 0, sondern bei 10–15% Progress
  - Ohne Text = "nice", mit Text = **postwürdig**
  - Konfigurierbar: welche Infos anzeigen, Position, Font
- [ ] 🟣 Dark / Neon / Minimal Templates einbauen (nutzt Theme-Layer)
- [ ] 🟢 Overlay-Idee vorbereiten (Video-Hintergrund)
- [ ] 🟢 Export stabilisieren
- [ ] 🟡 Monetarisierung: Preis / Abo-Option überlegen  

## Jun 2026 – UX & Style Feinschliff

- [ ] 🔵 Feedback auswerten  
- [ ] 🟣 Typo, Marker, Animationstempo verfeinern  
- [ ] 🟢 Overlay-Export testen  
- [ ] 🟡 Monetarisierung pushen: erste Einnahmen skalieren  

## Jul 2026 – Performance & Mobile

- [ ] 🟢 Ruckelfrei auf allen Geräten  
- [ ] 🔵 Mobile UI/UX optimieren  
- [ ] 🟢 Export mit Alpha-Kanal vorbereiten  
- [ ] 🔵 Marketing vorbereiten (Reels, Feedback)  

## Aug 2026 – Overlay offiziell & Social Proof

- [ ] 🟢 Overlay offiziell testen, wenn positiv  
- [ ] 🟡 Monetarisierung: Pay-per-Export + kleine Abos  
- [ ] 🔵 Social Proof sammeln: Testimonials, Screenshots, Reels  

## Sep–Okt 2026 – Stabilität & Pro Features

- [ ] 🟢 Kernprodukt stabil & skalierbar  
- [ ] 🟣 Style finalisieren  
- [ ] 🟣 „Pro Creator“ Templates anbieten  
- [ ] 🟡 Monetarisierung optimieren & wiederholen  

## Nov–Dez 2026 – Feedbackrunde 2 & Marketing

- [ ] 🔵 Größere Nutzergruppe testen  
- [ ] 🟢 Bugs beheben, Performance final  
- [ ] 🔵 Marketing pushen: Reichweite erhöhen  
- [ ] 🟡 Monetarisierung: Abo + Pay-per-Export offiziell  

## Jan–Jul 2027 – Wachstum & Exit-Vorbereitung

- [ ] 🟢 Stabilität & Export/Overlay perfektionieren  
- [ ] 🔵 Community & Social Proof ausbauen  
- [ ] 🟡 Monetarisierung skalieren  
- [ ] 🔵 Exit nur vorbereiten, wenn Projekt tragfähig  

## Aug 2027 – Bedingungsabhängiger Exit / Vollzeitstelle bleibt

- [ ] 🟡 Exit durchführen nur, wenn Einnahmen & Sicherheit stimmen  
- [ ] 🔵 Rad abgeleast → Freiheit  
- [ ] 🟢 Projekt bereit für nächste Phase, unabhängig vom Jobstatus
