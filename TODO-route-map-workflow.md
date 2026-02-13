# Route Map + Elevation Workflow — TODO

## Überblick

Zweiter Workflow: Ein Instagram-Reel das **oben** eine animierte Kartenansicht der GPX-Route zeigt und **unten** die bekannte Höhenkurve. Beide Bereiche sind synchronisiert — der Marker bewegt sich gleichzeitig auf der Karte und auf der Kurve.

**Layout (1080×1920, 9:16 Reel):**
```
┌──────────────────┐
│                  │
│    KARTEN-       │
│    ANSICHT       │  ← ~60% Höhe: Route auf stilisierter Karte
│    (Route)       │
│                  │
│                  │
├──────────────────┤
│   HÖHENKURVE     │  ← ~40% Höhe: Bekannte Elevation-Animation (reuse)
│   (Profil)       │
└──────────────────┘
```

**Zwei Kamera-Modi für die Karte:**
1. **Draufsicht (Overview):** Gesamte Route sichtbar, Marker bewegt sich darüber
2. **Verfolgersicht (Chase Cam):** Kamera folgt dem Marker, nur Umgebung sichtbar, Route als dezente Übersichtslinie im Hintergrund

---

## Reuse-Analyse: Was vom Elevation-Workflow wiederverwendbar ist

### Direkt wiederverwendbar (1:1)
| Modul | Pfad | Nutzung |
|-------|------|---------|
| `useChartAnimation` | `composables/useChartAnimation.ts` | Progress-Steuerung, Playback, Speed |
| `useVideoExport` | `composables/useVideoExport.ts` | MP4-Export mit FFmpeg.wasm |
| `ExportSettingsDialog` | `chartWorkflow/ExportSettingsDialog.vue` | Resolution/FPS/Quality Dialog |
| `VideoExportProgressDialog` | `chartWorkflow/VideoExportProgressDialog.vue` | Export-Fortschritt |
| `generateBackgroundElements` | `elevationChart/background.ts` | Hintergründe (solid, gradient, mesh, image) |
| `getTitleCardOpacity` | `titleCardGenerator.ts` | Title-Fade-Timing |
| `findHookPoint` | `elevationChart/hookDetection.ts` | Auto-Hook für Höhenkurve |
| `timeMapping` | `utils/timeMapping.ts` | Zeitbasierte Animation |
| `downsampling` | `utils/downsampling.ts` | Douglas-Peucker Downsampling |
| `gpxValidation` | `utils/gpxValidation.ts` | GPX-Validierung |

### Wiederverwendbar mit Anpassung
| Modul | Anpassung |
|-------|-----------|
| `useCSVParser.parseGPX()` | Muss lat/lon beibehalten (aktuell verworfen) |
| `ElevationControlsSidebar` | Pattern kopieren, neue Controls für Karte |
| `coordinateContract.ts` | Neue Preset-Funktionen für Kartenprojektion |
| `elevationChart/animation.ts` | Höhenkurven-Teil reuse, Karten-Teil neu |
| `elevationChart/panZoom.ts` | Konzept reuse für Karten-Kamerafahrt |

### Komplett neu zu bauen
| Modul | Beschreibung |
|-------|-------------|
| Route-zu-SVG Projektion | Lat/Lon → SVG-Koordinaten (Mercator-ähnlich) |
| Karten-SVG-Generator | Stilisierte Route auf Karte rendern |
| Karten-Kamera-System | Chase Cam + Overview für Kartenansicht |
| Combined-Frame-Generator | Map + Elevation in einem SVG |
| RouteMapGenerator.vue | Neuer 2-Step Workflow |

---

## Phase 0: Daten-Pipeline — Lat/Lon beibehalten

> **Ziel:** GPX-Parsing erweitern, sodass Lat/Lon-Koordinaten durch die gesamte Pipeline verfügbar sind.

### 0.1 RoutePoint-Typ definieren
- [ ] In `packages/shared/src/types/chart.ts` neuen Typ anlegen:
  ```typescript
  interface RoutePoint {
    lat: number        // Breitengrad
    lon: number        // Längengrad
    elevation: number  // Höhe in Metern
    distance: number   // Kumulative Distanz in km
    time?: number      // ms seit Start
  }
  ```
- [ ] Typ exportieren in shared index

### 0.2 GPX-Parser erweitern
- [ ] In `composables/useCSVParser.ts` Funktion `parseGPX()` anpassen:
  - Lat/Lon nicht mehr verwerfen, sondern in `RoutePoint[]` speichern
  - Rückgabetyp `GPXParseResult` um `routePoints: RoutePoint[]` erweitern
- [ ] Bestehende Downstream-Nutzung (ElevationGenerator) darf nicht brechen
- [ ] Test schreiben: GPX mit bekannten Koordinaten parsen, RoutePoint[] prüfen

### 0.3 Downsampling für RoutePoints
- [ ] `downsampling.ts` erweitern: `downsampleRoutePoints(points: RoutePoint[])`
  - Douglas-Peucker auf lat/lon (nicht nur elevation)
  - Oder: bestehenden `downsampleGPX` so erweitern, dass er RoutePoint[] akzeptiert
- [ ] Sicherstellen, dass extrema (höchster/tiefster Punkt) erhalten bleiben

---

## Phase 1: Route-zu-SVG Projektion

> **Ziel:** Lat/Lon-Koordinaten in SVG-Pixel umwandeln für die Kartendarstellung.

### 1.1 Projektionsfunktionen
- [ ] Neue Datei: `utils/chartGenerators/routeMap/projection.ts`
- [ ] `projectRouteToSvg(points: RoutePoint[], config: MapViewConfig): MapPoint[]`
  - Einfache äquirektanguläre Projektion (für kleine Gebiete ausreichend)
  - Lat/Lon → normalisierte Koordinaten (0-1)
  - Skalierung auf SVG-ViewBox mit Padding
  - Seitenverhältnis der Route beibehalten (keine Verzerrung)
- [ ] `MapPoint`-Typ:
  ```typescript
  interface MapPoint {
    x: number           // SVG-Pixel
    y: number           // SVG-Pixel
    lat: number         // Original
    lon: number         // Original
    elevation: number   // Original
    distance: number    // Kumulative km
  }
  ```
- [ ] `MapViewConfig`-Typ:
  ```typescript
  interface MapViewConfig {
    width: number       // SVG-Breite (z.B. 1080)
    height: number      // SVG-Höhe (z.B. 1152 = 60% von 1920)
    padding: { top, right, bottom, left }
  }
  ```
- [ ] Tests: Bekannte Koordinaten projizieren, Bounds prüfen, Aspect Ratio validieren

### 1.2 Routenlinie rendern
- [ ] Neue Datei: `utils/chartGenerators/routeMap/routeLine.ts`
- [ ] `generateRouteLine(points: MapPoint[], progress: number, style: RouteLineStyle): string`
  - SVG-Polyline aus MapPoints
  - Clip-Path für progressbasierte Enthüllung (wie bei Höhenkurve)
  - Styling: Farbe, Breite, Opacity, optional Glow
- [ ] `RouteLineStyle`-Typ:
  ```typescript
  interface RouteLineStyle {
    color: string
    width: number
    opacity: number
    glow: boolean
    glowColor: string
    glowIntensity: number
    dashArray?: string    // Für die noch-nicht-enthüllte Strecke
  }
  ```
- [ ] Optional: "Trail"-Effekt — hinter dem Marker wird die Linie heller/dicker
- [ ] Tests: Polyline-Output validieren, Clip-Path bei verschiedenen Progress-Werten

### 1.3 Marker auf Karte
- [ ] In `routeLine.ts` oder eigene Datei: Marker-Rendering
  - Kreis/Pfeil am aktuellen Fortschritt
  - Optional: Richtungspfeil (Rotation basierend auf nächstem Segment)
  - Größe skaliert mit Zoom
- [ ] `getRouteMarkerPosition(points: MapPoint[], progress: number): MapPoint`
  - Analog zu `getMarkerPosition()` aus elevation animation

---

## Phase 2: Karten-SVG-Generator

> **Ziel:** Vollständiger SVG-Frame-Generator für die Kartenansicht.

### 2.1 Basis-Kartengenerator
- [ ] Neue Datei: `utils/chartGenerators/routeMap/mapGenerator.ts`
- [ ] `generateMapFrame(options: MapFrameOptions): string`
  - Rendert: Hintergrund + Route + Marker + optional Labels
  - Nutzt `generateBackgroundElements()` für den Hintergrund (reuse!)
  - Gibt SVG-String zurück
- [ ] `MapFrameOptions`-Typ:
  ```typescript
  interface MapFrameOptions {
    routePoints: RoutePoint[]
    progress: number          // 0-1
    width: number
    height: number
    // Styling
    backgroundColor: string
    backgroundType: BackgroundType
    routeStyle: RouteLineStyle
    showMarker: boolean
    markerSize: number
    markerColor: string
    // Kamera
    cameraMode: 'overview' | 'chase'
    chaseZoomLevel: number    // Für Chase-Cam
    // Labels
    showDistanceMarkers: boolean
    distanceMarkerInterval: number  // Alle X km eine Markierung
    // Optional
    showStartEndLabels: boolean
    showElevationColoring: boolean  // Route einfärben nach Höhe
  }
  ```

### 2.2 Overview-Kamera (Draufsicht)
- [ ] In `mapGenerator.ts` oder eigene Datei
- [ ] Gesamte Route immer sichtbar
- [ ] Optional: Leichter Zoom auf den aktiven Bereich (dezent, nicht so stark wie Chase)
- [ ] Marker bewegt sich über die statische Route

### 2.3 Chase-Kamera (Verfolgersicht)
- [ ] Neue Datei: `utils/chartGenerators/routeMap/mapCamera.ts`
- [ ] `calculateMapCameraViewport(progress, points, config): CameraViewport`
  - Kamera folgt dem Marker
  - Zeigt nur einen Ausschnitt der Route
  - Rotation: Kamera dreht sich mit der Fahrtrichtung (optional)
  - Vorausblick: Marker nicht zentriert, sondern leicht nach hinten versetzt
- [ ] Reuse-Konzept von `panZoom.ts` — ähnliches `CameraViewport`-Interface
- [ ] Smooth Interpolation: Kamera bewegt sich sanft, keine Sprünge bei Richtungswechseln
- [ ] Tests: Kameraposition bei verschiedenen Progress-Werten, Edge Cases (Start/Ende)

### 2.4 Hintergrund-Route (für Chase-Modus)
- [ ] Im Chase-Modus: dezente Gesamtroute im Hintergrund anzeigen
  - Dünne Linie, niedrige Opacity
  - Zeigt dem Zuschauer, wo die Route insgesamt verläuft
  - "Hier bin ich, und so sieht der Rest aus"
- [ ] Separates SVG-Element, nicht vom Chase-Zoom betroffen (im Outer-SVG)

---

## Phase 3: Combined Frame — Karte + Höhenkurve

> **Ziel:** Beide Visualisierungen in einem einzigen SVG-Frame kombinieren.

### 3.1 Split-Layout-Generator
- [ ] Neue Datei: `utils/chartGenerators/routeMap/combinedFrame.ts`
- [ ] `generateCombinedFrame(options: CombinedFrameOptions): string`
  - Outerstes SVG: 1080×1920
  - Oberer Bereich (~60%): Karten-SVG (als `<svg>` nested oder `<g>` mit Transform)
  - Unterer Bereich (~40%): Höhenkurven-SVG (reuse `generateAnimatedSilhouette`)
  - Optionale Trennlinie zwischen beiden Bereichen
- [ ] `CombinedFrameOptions`-Typ:
  ```typescript
  interface CombinedFrameOptions {
    routePoints: RoutePoint[]
    chartData: Array<{ label: string; value: number }>
    progress: number
    // Layout
    mapHeightRatio: number     // 0.4-0.8, default 0.6
    // Map-Optionen
    mapOptions: MapFrameOptions
    // Elevation-Optionen (reuse FrameOptions)
    elevationOptions: Partial<FrameOptions>
    // Gemeinsam
    backgroundColor: string
    backgroundType: BackgroundType
  }
  ```

### 3.2 Synchronisierte Marker
- [ ] Marker auf Karte und Marker auf Höhenkurve zeigen den gleichen Punkt
- [ ] Gleicher `progress`-Wert steuert beide
- [ ] Optional: Verbindungslinie/Highlight zwischen den beiden Markern

### 3.3 Gemeinsamer Hintergrund
- [ ] Ein Hintergrund für das gesamte Reel (nicht zwei separate)
- [ ] Hintergrund-Layer im äußersten SVG
- [ ] Karte und Kurve als "Fenster" darüber

### 3.4 Höhenkurve im Combined-Modus anpassen
- [ ] `generateAnimatedSilhouette()` muss mit reduzierter Höhe funktionieren
  - Aktuell: Volle 1920px Höhe
  - Neu: ~768px Höhe (40% von 1920)
  - ViewBox anpassen, Labels skalieren
- [ ] `curveEndpoint` soll relativ zum verfügbaren Bereich bleiben
- [ ] Elevation-Labels müssen in den kleineren Bereich passen

---

## Phase 4: Workflow-Komponenten

> **Ziel:** Vue-Komponenten für den neuen Workflow, nach dem bestehenden Pattern.

### 4.1 RouteMapGenerator.vue (Hauptworkflow)
- [ ] Neue Datei: `components/RouteMapGenerator.vue`
- [ ] 2-Step Workflow (wie ElevationGenerator):
  1. **GPX Upload** — reuse FileUploadStep-Pattern + parseGPX
  2. **Chart erstellen** — RouteMapChartStep
- [ ] State: `routePoints: RoutePoint[]`, `chartData`, `timeArray`, `animationConfig`
- [ ] GPX-Upload muss jetzt auch `routePoints` mit lat/lon liefern
- [ ] Laden von gespeicherten Charts unterstützen (wie bei Elevation)

### 4.2 RouteMapChartStep.vue (Chart-Hauptkomponente)
- [ ] Neue Datei: `components/chartWorkflow/RouteMapChartStep.vue`
- [ ] Kopiert Pattern von `ElevationChartStep.vue`:
  - Preview-Bereich (zentriertes Reel-Preview)
  - Sidebar für Controls
  - Export-Dialoge
  - 3-Phasen-Animation (Title → Transition → Chart)
- [ ] Props: `routePoints`, `chartData`, `timeArray`, `animationConfig`, `chartTitle`
- [ ] Computed `animationSvg`: ruft `generateCombinedFrame()` auf
- [ ] `renderFrame`-Callback für Video-Export
- [ ] Reuse: `useChartAnimation`, `useVideoExport`, `ExportSettingsDialog`, `VideoExportProgressDialog`

### 4.3 RouteMapAnimationConfig Interface
- [ ] Neues Config-Interface (erweitert ElevationAnimationConfig):
  ```typescript
  interface RouteMapAnimationConfig extends ElevationAnimationConfig {
    // Karten-spezifisch
    cameraMode: 'overview' | 'chase'
    chaseZoomLevel: number
    routeColor: string
    routeWidth: number
    routeGlow: boolean
    showDistanceMarkers: boolean
    distanceMarkerInterval: number
    showElevationColoring: boolean
    mapHeightRatio: number
    showStartEndLabels: boolean
  }
  ```

### 4.4 RouteMapControlsSidebar.vue
- [ ] Neue Datei: `components/chartWorkflow/RouteMapControlsSidebar.vue`
- [ ] Kopiert Layout-Pattern von `ElevationControlsSidebar.vue`
- [ ] Sections:
  1. **Kamera** — Modus (Overview/Chase), Zoom-Level
  2. **Route** — Farbe, Breite, Glow, Elevation-Coloring
  3. **Höhenprofil** — Alle bestehenden Elevation-Settings (reuse)
  4. **Hintergrund** — Reuse background picker
  5. **Animation** — Duration, Easing, Mode
  6. **Labels** — Distanzmarker, Start/Ende
  7. **Playback** — Play/Pause, Speed, Slider (reuse)
  8. **Export** — Export-Button (reuse)

### 4.5 useRouteMapConfig Composable
- [ ] Neue Datei: `composables/useRouteMapConfig.ts`
- [ ] Computed getter/setter Paare für RouteMapAnimationConfig
- [ ] Pattern kopieren von `useElevationConfig.ts`

---

## Phase 5: Router & Navigation Integration

### 5.1 Route hinzufügen
- [ ] In `router/index.ts`: Neue Route `/route-map` → `RouteMapGenerator`
  ```typescript
  { path: '/route-map', name: 'RouteMap', component: RouteMapGenerator, meta: { requiresAuth: true } }
  ```

### 5.2 ChartTypeDialog erweitern
- [ ] In `ChartTypeDialog.vue`: Dritten Typ hinzufügen
  - "Route Map + Elevation" — mit Icon und Beschreibung
  - Routing zu `/route-map`

### 5.3 AppSidebar anpassen
- [ ] `handleNewChart()` soll jetzt den `ChartTypeDialog` zeigen (nicht direkt zu `/elevation`)
- [ ] Oder: Zwei Buttons "Höhenprofil" und "Route Map" in der Sidebar

### 5.4 Dashboard-Integration
- [ ] `Home.vue`: Routing-Logic für neuen Chart-Typ
  - `chart.type === 'route-map'` → Route zu `/route-map`
- [ ] Chart-Typ in Shared Types ergänzen

---

## Phase 6: Stilisierte Karten-Optik

> **Ziel:** Die Karte soll nicht wie Google Maps aussehen, sondern stilisiert/minimalistisch.

### 6.1 Routing-Stil Optionen
- [ ] **Neon-Trail:** Leuchtende Route auf dunklem Hintergrund (wie Strava Heatmap)
- [ ] **Minimalist:** Dünne weiße Linie auf Schwarz, nur Route sichtbar
- [ ] **Topografisch:** Dezente Höhenlinien-Andeutung basierend auf den Elevation-Daten
- [ ] **Gradient:** Route eingefärbt nach Elevation oder Steigung
- [ ] Implementierung: Preset-System mit vordefinierten Kombinationen

### 6.2 Elevation-Coloring der Route
- [ ] Route auf der Karte einfärben basierend auf Höhe
  - Niedrig: Grün/Blau
  - Hoch: Rot/Orange
- [ ] SVG: `<linearGradient>` entlang der Polyline, oder segmentierte Linie
- [ ] Farbskala konfigurierbar

### 6.3 Richtungsindikatoren
- [ ] Kleiner Pfeil am Marker zeigt Fahrtrichtung
- [ ] Berechnung: Winkel zwischen aktuellem und nächstem Punkt
- [ ] SVG: Rotiertes Dreieck oder Pfeil-Symbol

### 6.4 Distanzmarker auf Karte
- [ ] Alle X km ein kleiner Punkt/Marker auf der Route
- [ ] Mit Beschriftung ("5 km", "10 km", ...)
- [ ] Im Chase-Modus: nur die im Sichtbereich

---

## Phase 7: Title-Hook für Combined-View

> **Ziel:** Auch der neue Workflow bekommt einen automatischen Hook.

### 7.1 Hook-Punkt auf Karte
- [ ] `findHookPoint()` reuse für Höhenkurve
- [ ] Gleicher Punkt auch auf der Karte als Kameraposition nutzen
- [ ] Im Chase-Modus: Hook-Punkt = Kamera-Startposition

### 7.2 Title über Combined-View
- [ ] Title-Overlay-System reuse (`titleOverlay` in FrameOptions)
- [ ] Title zentriert über dem gesamten Reel (nicht nur über der Karte)
- [ ] Fade-In/Hold/Fade-Out wie beim Elevation-Workflow

### 7.3 Transition zum Animationsstart
- [ ] Kamera fährt vom Hook zum Start (wie beim Elevation-Workflow)
- [ ] Szene fadet aus, Animation beginnt mit Fade-In
- [ ] Reuse der `curveOpacity`/`panStart`/`panEnd`-Logik

---

## Phase 8: Video-Export

### 8.1 Combined Frame Export
- [ ] `renderFrame`-Callback nutzt `generateCombinedFrame()`
- [ ] Alle Export-Settings reuse (Resolution, FPS, Quality)
- [ ] Frame-Count Berechnung mit Intro-Phasen

### 8.2 Performance
- [ ] Combined Frame hat mehr SVG-Elemente → Performance testen
- [ ] Evtl. Route-Polyline vereinfachen für Export (weniger Punkte)
- [ ] Canvas-Rendering optimieren (SVG → Canvas → Frame)

---

## Phase 9: Tests

### 9.1 Unit Tests
- [ ] `projection.ts` — Koordinatenprojektion mit bekannten Werten
- [ ] `routeLine.ts` — SVG-Output, Clip-Path, Marker-Position
- [ ] `mapCamera.ts` — Kameraberechnung, Zoom, Edge Cases
- [ ] `combinedFrame.ts` — SVG-Struktur, Split-Layout
- [ ] `mapGenerator.ts` — Vollständige Frame-Generierung

### 9.2 Komponenten-Tests
- [ ] `RouteMapGenerator.vue` — Mount, Step-Wechsel, GPX-Upload
- [ ] `RouteMapChartStep.vue` — Animation, Export, Config-Passing
- [ ] `RouteMapControlsSidebar.vue` — Events, Props, Config-Updates

### 9.3 Integration
- [ ] Router: `/route-map` erreichbar, Auth-Guard aktiv
- [ ] ChartTypeDialog: Dritter Typ sichtbar und routbar
- [ ] Dashboard: Gespeicherte Route-Map Charts laden

---

## Implementierungsreihenfolge (empfohlen)

```
Phase 0 (Daten)          ████░░░░░░░░░░░░░░░░  Basis — alles hängt davon ab
Phase 1 (Projektion)     ░░░░████░░░░░░░░░░░░  Route als SVG darstellbar machen
Phase 2 (Karten-SVG)     ░░░░░░░░████░░░░░░░░  Kartenansicht generieren
Phase 3 (Combined)       ░░░░░░░░░░░░████░░░░  Karte + Kurve zusammen
Phase 4 (Komponenten)    ░░░░░░░░░░░░░░░░████  Vue-Workflow
Phase 5 (Router)         ░░░░░░░░░░░░░░░░░░██  Navigation
Phase 6 (Stil)           ░░░░░░░░░░░░░░░░████  Visuelles Polish
Phase 7 (Hook)           ░░░░░░░░░░░░░░░░░░██  Title-Hook reuse
Phase 8 (Export)          ░░░░░░░░░░░░░░░░░░██  Video-Export
Phase 9 (Tests)          ████████████████████  Fortlaufend
```

### Quick Wins (sofort sichtbarer Fortschritt)
1. Phase 0 → GPX-Parser liefert lat/lon
2. Phase 1 → Route als SVG-Linie sichtbar
3. Phase 2.1 → Erster animierter Karten-Frame
4. Phase 3.1 → Combined-View: erstes Mal Karte+Kurve zusammen im Reel-Format

### Meilensteine
- **M1:** Statische Route als SVG auf Hintergrund sichtbar
- **M2:** Animierte Route mit Marker (progress-gesteuert)
- **M3:** Combined-View: Karte oben + Höhenkurve unten
- **M4:** Vollständiger Workflow: Upload → Preview → Export
- **M5:** Chase-Cam und stilisierte Optik
- **M6:** Video-Export funktioniert
