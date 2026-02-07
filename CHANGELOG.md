# Changelog

Alle wichtigen Änderungen an diesem Projekt werden hier dokumentiert.

Das Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.0.0/),
und dieses Projekt verwendet [Semantic Versioning](https://semver.org/lang/de/).

## [Unreleased]

## [0.2.0] - 2026-02-07

### Hinzugefügt
- **Animationsmodi:** Zeitbasiert, Steigung (mit Intensitätsregler) und Anstrengung (variable Linienstärke, Farbverlauf, Glow-Aura)
- **Titel-Blende:** Fade-in/hold/fade-out Titelkarte vor der Chart-Animation mit eigenem Farbwähler
- **Bild-Hintergrund:** Upload, Position, Weichzeichnung, Helligkeit, Kontrast, Overlay
- **Theme-System:** Eigene Presets speichern und laden via API
- **Hintergrundtypen:** Solid, Gradient, Mesh, Grid, Dots, Bild
- **Labels:** Höhenmeter- und Kilometer-Anzeige mit Farbwähler
- **Flächenfüllung:** Ein/Aus Toggle für den Bereich unter der Kurve
- **Export-Einstellungen:** Dialog für Auflösung (SD/HD/Full HD), FPS und Qualität
- **Dark Mode** mit CSS Custom Properties
- **Öffentliche Landingpage** mit Dashboard unter /dashboard
- **Ticket-System** für Bug Reports und Feature Requests
- **Rechtliche Seiten:** Impressum, Datenschutz, AGB-Akzeptanz
- **Pay-what-you-want** Button nach erfolgreichem Video-Export

### Geändert
- UI-Redesign mit einklappbaren Sidebars und fixierten Playback-Controls
- Chart-Name direkt in der Sidebar editierbar
- Upload nutzt jetzt Axios mit Bildkomprimierung

### Behoben
- Hintergrund-Bild wird beim Export korrekt gerendert
- Chart-Typ Dialog übersprungen, Kurven-Padding korrigiert
- Doppelter Chart-Titel auf Karten-Vorschau entfernt
- "Neuer Chart" Button in Sidebar funktioniert wieder

### Technisch
- **Komponentenextraktion:** ElevationChartStep.vue von ~1940 auf 545 Zeilen reduziert
  - ExportSettingsDialog, SaveThemeDialog, VideoExportProgressDialog, ElevationControlsSidebar als eigenständige Komponenten
  - EmptyState, ChartsGrid, DeleteChartDialog aus Home.vue extrahiert
- **Composables:** useElevationConfig für Animation-Config Getter/Setter
- **elevationChart.ts** in fokussierte Module aufgeteilt
- **Shared Types:** Type-Imports nach @chart-generator/shared verschoben
- **Tests:** 19 neue Tests für ElevationChartStep (6 Gruppen)
- **Code-Bereinigung:** Aufgelöste TODOs entfernt, .gitignore aktualisiert

## [0.1.0] - 2026-01-25

### Hinzugefügt
- GPX Import mit Downsampling
- Elevation Chart Animation (Stroke-draw + Marker)
- MP4 Export via ffmpeg.wasm (Client-seitig)
- Silhouette-Modus für Instagram Reels (1080x1920)
- Kurvenhöhe-Slider (15-100%)
- Easing-Optionen (linear, ease-in, ease-out, ease-in-out)
- Animation Preview mit Play/Pause/Scrubber
- Coordinate Contract für saubere Datentransformation

### Technisch
- Vue 3 + TypeScript + Vuetify
- Frame-basierte Animation für pixelgenauen Export
- 91 Tests mit 98% Coverage für elevationChart.ts

[Unreleased]: https://github.com/Pe-De-E/chart-generator/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/Pe-De-E/chart-generator/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/Pe-De-E/chart-generator/releases/tag/v0.1.0
