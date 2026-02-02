# Sprint-Plan GPX → Insta-Reels (Feb 2026 – Ende 2027)

> **Stand:** Januar 2026 | **Status:** Kernprodukt fertig, Monetarisierung läuft

**Legende:** 🟢 Kern | 🔵 UX | 🟣 Style | 🟡 Business | 🧘 Stabilisierung

---

## Situation & Prinzipien

**Neue Situation (Jan 2026):** Kündigung erhalten. Projekt = potenzieller Einkommenspfad.
Prioritäten: Feedback > Eleganz, Zahlungsbereitschaft > Features, Geschwindigkeit > Perfektion.

**Belastungs-Regeln:**

- Max. 2–3 schwere Themen pro Monat
- Stabilisierungs-Monate: **Jun 2026 🧘, Okt 2026 🧘, Feb 2027 🧘**
- Energie > Features, Pause ≠ Niederlage

**Ziel:** Nischenprodukt mit 500–2000 zahlenden Nutzern.

---

## ✅ Abgeschlossen (Feb 2026)

<details>
<summary><strong>Kernprodukt komplett implementiert</strong> (klicken zum Aufklappen)</summary>

### GPX & Datenverarbeitung

- ✅ GPX Import + Downsampling (Douglas-Peucker, 500–1500 Punkte)
- ✅ Coordinate-Contract (GPX → normiert 0–1 → ViewBox px)
- ✅ Visuelle Normalisierung (Y-Axis Compression/Expansion, Überhöhung)
- ✅ Failure Paths (Validierung, Edge Cases, deutsche Fehlermeldungen)

### Animation & Export

- ✅ Frame-basierte SVG-Animation (Progress 0–1, Easing)
- ✅ Linie + Area-Fill progressiv zeichnen
- ✅ Marker-Punkt am aktuellen Ende
- ✅ Preview-Player (Play/Pause, Scrubber, 0.25x–2x Speed)
- ✅ Frame-Truth (Preview = Export, pixelgenau)
- ✅ MP4 Export (ffmpeg.wasm, H.264, Client-seitig)
- ✅ Export-Settings (Auflösung, FPS, Qualität)
- ✅ Progress-Anzeige (Stages + Prozent)

### Theme-System

- ✅ 5 Themes: dark, minimal, bold, neon, sunset
- ✅ 5 Background-Types: Solid, Gradient, Mesh, Grid, Dots
- ✅ Farb-Customization (Kurve, Labels, Marker, Hintergrund)
- ✅ Silhouette-Modus (Kurve an Rändern, Höhen-Slider 15–100%)

### Monetarisierung

- ✅ Pay-what-you-want Button nach Export (PayPal)

### DevOps

- ✅ Changelog, Semantic Versioning, Git Branching

### Presets & Themes

- ✅ Chart Presets System (Farben, Overlays, StyleOverrides fuer Bar/Line/Scatter/Pie/Area)
- ✅ Elevation Themes ins Backend migriert (5 System-Themes)
- ✅ Eigene Presets/Themes speichern (privat pro User)
- ✅ 4 System-Presets fuer Charts (Corporate Blue, Minimalist, Presentation, Dark Mode)

</details>

---

## 🔄 Offen (Feb 2026)

- [ ] 🔵 2–3 eigene GPX-Tracks testen
- [ ] 🔵 Browser-Kompatibilität prüfen (SharedArrayBuffer: Chrome, Firefox, Edge)
- [x] 🔵 Charts benennen (Name in Dashboard anzeigen)

---

## Mär 2026 – Feedback & Bezahlschranke

**Kernfrage:** Drückt jemand freiwillig auf Bezahlen? Kommen sie wieder?

- [ ] 🟡 **Weiche Bezahlschranke** (kritisch!)
  - 2–3 Exporte kostenlos, danach: Wasserzeichen / 720p / Wartezeit
  - Ziel: Reibung testen, nicht Gier
- [ ] 🔵 **Freunde testen lassen** (GATE!)
  - Wenn niemand außerhalb der Bubble postet → kein Produkt
- [ ] 🔵 UX-Fehler sammeln & beheben
- [ ] 🔵 **Audio-Entscheidung** – klar kommunizieren: "Video ohne Audio, für Reels"

---

## Apr 2026 – Landingpage & UX

- [ ] 🔵 Landingpage bauen
- [ ] 🔵 **Quick Export** – "Sieht gut aus"-Pfad für 80% der Nutzer
- [ ] 🟢 Export optimieren (Encoding, Speed)
- [ ] 🟢 **GPX-Tracks verknüpfen** (Multi-Track zu einer Strecke kombinieren)
- [ ] 🔵 Erste Reels posten & Feedback
- [ ] 🟡 Erste 5–10 bezahlte Exporte

---

## Mai 2026 – Textlayer

- [ ] 🟣 **Animierbare Textlayer** (km, Höhenmeter, Datum)
  - Fade-in bei 10–15% Progress
  - Ohne Text = "nice", mit Text = **postwürdig**
- [ ] 🟡 Preis / Abo-Option überlegen

---

## Jun 2026 – Stabilisierung 🧘

- [ ] 🔵 Feedback auswerten
- [ ] 🟣 Typo, Marker, Tempo verfeinern
- [ ] 🧘 Tech Debt aufräumen

---

## Jul 2026 – Zweites Feature (NUR EINES!)

- [ ] 🟢 **Landscape Mode** (1920×1080) – YouTube, Desktop
- [ ] 🟢 **ODER: Foto-Hintergrund** – eigenes Foto mit Blur/Transparenz
- [ ] 🔵 Mobile UI/UX optimieren

---

## Aug 2026 – Polish & Social Proof

- [ ] 🟣 Zweites Feature stabilisieren
- [ ] 🟡 Pay-per-Export + kleine Abos
- [ ] 🔵 Testimonials sammeln
- [ ] 🟢 Export mit Alpha-Kanal

---

## Sep 2026 – Pro Features

- [ ] 🟣 „Pro Creator" Templates
- [ ] 🟡 Monetarisierung optimieren

---

## Okt 2026 – Stabilisierung 🧘

- [ ] 🧘 Bugs, Performance-Monitoring, Backup

---

## Nov–Dez 2026 – Feedback & Marketing

- [ ] 🔵 Größere Nutzergruppe testen
- [ ] 🔵 Marketing pushen
- [ ] 🟡 Abo + Pay-per-Export offiziell
- [ ] 🔵 Jahresrückblick

---

## 2027 – Wachstum & Realitäts-Check

**Q1:** Community aufbauen, Monetarisierung skalieren
**Feb 🧘:** Stabilisierung, Retrospektive
**Q2–Q3:** Social Proof, Einnahmen stabilisieren
**Q4:** Harte Fragen – trägt sich das Projekt? Weitermachen, Pivoten, oder Pause?

> **Kein Scheitern, sondern Daten.** Ein Experiment mit klarem Ergebnis ist wertvoller als ewiges Hoffen.

---

## 💡 Ideen-Backlog (nicht eingeplant)

- Höhenmeter über das Jahr aggregiert animieren (End of Year Content)
- Trainingstimeline über Monat/Jahr
- **Service-Integrationen** – Strava, Komoot, Garmin (nicht vor Produkt-Market-Fit)
- **Instagram-Integration** – Direkt-Posting (⚠️ zu viel Overhead, nicht vor 2027)
- [ ] Version in der App anzeigen
