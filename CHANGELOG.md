# Changelog

Alle wichtigen Änderungen an diesem Projekt werden hier dokumentiert.

Das Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.0.0/),
und dieses Projekt verwendet [Semantic Versioning](https://semver.org/lang/de/).

## [Unreleased]

### Hinzugefügt
- Theme-System mit 5 Presets (Dark, Minimal, Bold, Neon, Sunset)
- Export-Einstellungen Dialog (Auflösung, FPS, Qualität)
- Multiple Hintergrundtypen (Solid, Gradient, Mesh, Grid, Dots)
- Kilometer-Labels für Elevation Chart
- Höhenmeter-Labels mit Farbwähler

### Geändert
- UI zu Collapsible Panels umgebaut
- Verbesserte Label-Positionierung (keine Überlappung mehr)

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

[Unreleased]: https://github.com/Pe-De-E/chart-generator/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Pe-De-E/chart-generator/releases/tag/v0.1.0
