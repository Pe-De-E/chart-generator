<template>
  <div class="legal-page">
    <v-card flat class="legal-card">
      <v-card-title class="text-h5">
        {{ title }}
      </v-card-title>
      <v-card-text class="legal-content">
        <div v-if="type === 'impressum'">
          <h3>Angaben gemäß § 5 TMG</h3>
          <p>
            [Name]<br>
            [Straße Nr.]<br>
            [PLZ Ort]
          </p>

          <h3>Kontakt</h3>
          <p>
            E-Mail: [email@example.com]
          </p>

          <p class="text-caption text-medium-emphasis mt-4">
            Platzhalter – bitte mit echten Daten ersetzen.
          </p>
        </div>

        <div v-else-if="type === 'datenschutz'">
          <h3>Datenschutzerklärung</h3>
          <p>
            Der Schutz Ihrer persönlichen Daten ist uns wichtig. Diese Datenschutzerklärung informiert Sie über die Art, den Umfang und den Zweck der Erhebung und Verwendung personenbezogener Daten.
          </p>

          <h3>Verantwortlicher</h3>
          <p>[Name und Kontaktdaten einfügen]</p>

          <h3>Erhobene Daten</h3>
          <p>
            Bei der Nutzung dieser Anwendung werden folgende Daten verarbeitet:
          </p>
          <ul>
            <li>E-Mail-Adresse (für Account-Erstellung)</li>
            <li>Hochgeladene GPX-Dateien (temporär für Verarbeitung)</li>
            <li>Erstellte Charts (wenn gespeichert)</li>
          </ul>

          <p class="text-caption text-medium-emphasis mt-4">
            Platzhalter – bitte mit vollständiger Datenschutzerklärung ersetzen.
          </p>
        </div>

        <div v-else-if="type === 'agb'">
          <h3>Allgemeine Geschäftsbedingungen</h3>

          <h4>§ 1 Geltungsbereich</h4>
          <p>
            Diese Allgemeinen Geschäftsbedingungen gelten für die Nutzung der Anwendung Altavio.
          </p>

          <h4>§ 2 Leistungsbeschreibung</h4>
          <p>
            Die Anwendung ermöglicht das Erstellen von animierten Höhenprofilen aus GPX-Dateien für Social Media.
          </p>

          <h4>§ 3 Nutzungsrechte</h4>
          <p>
            Exportierte Videos dürfen frei verwendet werden. Die Rechte an hochgeladenen GPX-Daten verbleiben beim Nutzer.
          </p>

          <p class="text-caption text-medium-emphasis mt-4">
            Platzhalter – bitte mit vollständigen AGB ersetzen.
          </p>
        </div>
      </v-card-text>

      <v-card-actions>
        <v-btn variant="text" @click="$router.back()">
          <v-icon start>mdi-arrow-left</v-icon>
          Zurück
        </v-btn>
      </v-card-actions>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const type = computed(() => {
  const path = route.path.replace('/', '')
  return path as 'impressum' | 'datenschutz' | 'agb'
})

const title = computed(() => {
  switch (type.value) {
    case 'impressum': return 'Impressum'
    case 'datenschutz': return 'Datenschutzerklärung'
    case 'agb': return 'Allgemeine Geschäftsbedingungen'
    default: return ''
  }
})
</script>

<style scoped>
.legal-page {
  max-width: 800px;
  margin: 0 auto;
}

.legal-card {
  border-radius: var(--radius-lg, 16px);
}

.legal-content {
  line-height: 1.7;
}

.legal-content h3 {
  margin-top: 24px;
  margin-bottom: 8px;
  font-size: 1.1rem;
  font-weight: 600;
}

.legal-content h3:first-child {
  margin-top: 0;
}

.legal-content h4 {
  margin-top: 16px;
  margin-bottom: 4px;
  font-size: 1rem;
  font-weight: 500;
}

.legal-content p {
  margin-bottom: 12px;
}

.legal-content ul {
  margin-left: 20px;
  margin-bottom: 12px;
}
</style>
