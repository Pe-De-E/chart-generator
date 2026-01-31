# UI Redesign Plan: "Elevation" Theme

## Design-Prinzipien

- **Dunkle Sidebar** als Navigation
- **Lime Green (#C8FF00)** als Signature-Farbe
- **Warmes Off-White (#F5F5F0)** als Hintergrund
- **Abgerundete Ecken (8-24px)** - KEINE Pill-Shapes
- **Weiche Schatten** mit warmem Farbton
- **Große, fette Zahlen/Headlines**

---

## Farbpalette - "Warm & Soft" (basierend auf UI_Inspo.jpg)

```
Basis:
├── sidebar         #2D2A26   (warmes Dunkelbraun)
├── background      #F7F4EF   (warmes Creme/Beige)
├── surface         #FFFFFF   (Karten)
├── surfaceVariant  #F0EBE3   (leichtes Beige)
├── border          #E5E0D8   (subtile Borders)

Primary:
├── primary         #2D8B7A   (warmes Teal)
├── primaryLight    #4ECDC4   (für Dark Mode)
├── primaryDark     #247A6A   (für Hover)

Akzente (Pastell):
├── rose            #E8A0BF   (sanftes Rosa)
├── gold            #F2C94C   (warmes Gelb)
├── mint            #7BC47F   (sanftes Grün)
├── sky             #7EB8DA   (sanftes Blau)

Semantic:
├── success         #7BC47F   (Mint)
├── warning         #F2C94C   (Gold)
├── error           #E57373   (sanftes Rot)
├── info            #7EB8DA   (Sky)

Text:
├── onLight         #2D2A26   (warmes Dunkelbraun)
├── onDark          #F5F2ED   (warmes Off-White)
├── muted           #6B6560   (gedämpft)
```

---

## Border-Radius System

```
--radius-sm:   8px    (Chips, kleine Buttons)
--radius-md:   12px   (Buttons, Inputs)
--radius-lg:   16px   (Cards, Dialogs)
--radius-xl:   24px   (große Panels, Hero-Elemente)
```

---

## Umsetzungs-Phasen

### Phase 1: Foundation (Vuetify Theme + Globals)
- [x] `plugins/vuetify.ts` - Neue Farbpalette
- [x] `styles/variables.scss` - CSS Custom Properties erstellen
- [x] `styles/overrides.scss` - Vuetify-Komponenten Rundungen überschreiben (in variables.scss integriert)

### Phase 2: Layout Umbau
- [x] `App.vue` - Von Top-AppBar zu Sidebar-Layout
- [x] `components/AppSidebar.vue` - Neue dunkle Sidebar erstellen
- [x] `components/StepNavigation.vue` - Styling angepasst

### Phase 3: Komponenten-Styling
- [x] `components/ChartCard.vue` - Neue Karten-Styles
- [x] `components/ElevationGenerator.vue` - Layout anpassen, Dark Mode Fixes
- [x] `components/chartWorkflow/ElevationChartStep.vue` - Panel-Styles
- [x] `components/UserMenu.vue` - In AppSidebar integriert

### Phase 4: Feinschliff
- [x] Hover-States und Transitions
- [x] Dark Mode anpassen (CSS Custom Properties für alle Komponenten)
- [ ] Responsive Anpassungen

---

## Dateien mit TODOs

Die folgenden Dateien enthalten `<!-- TODO [UI-REDESIGN] -->` oder `// TODO [UI-REDESIGN]` Kommentare:

| Datei | Phase | Beschreibung |
|-------|-------|--------------|
| `src/plugins/vuetify.ts` | 1 | Neue Farbpalette + Default-Props |
| `src/styles/variables.scss` | 1 | CSS Custom Properties + Vuetify Overrides |
| `src/App.vue` | 2 | Layout-Umbau zu Sidebar |
| `src/components/StepNavigation.vue` | 2 | Dark Sidebar Styling |
| `src/components/ChartCard.vue` | 3 | Card-Styling mit neuen Rundungen |
| `src/components/chartWorkflow/ElevationChartStep.vue` | 3 | Panel/Button/Dialog Styling |

### Neue Dateien erstellt:

- `src/styles/variables.scss` - Muss noch in `main.ts` importiert werden!

```ts
// In main.ts hinzufügen:
import './styles/variables.scss'
```

---

## Referenz-Bilder

- `UI_Inspo.jpg` - Warme Beige-Töne, Sidebar
- `UI_Inspo2.webp` - Dark Dashboard, Lime + Purple Gradient
- `UI_Inspo3.webp` - Sage Green, Lime Akzent, Clean
- `UI_Inspo4.webp` - Neon auf Dark, bunte Gradients
- `UI_Inspo5.webp` - Lime Green Signature, moderne Cards
