<template>
  <v-container class="landing-page fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="6" class="text-center">
        <img src="/Logo.png" alt="Altavio" class="landing-logo mb-4" />
        <h1 class="text-h3 font-weight-bold mb-2">Altavio</h1>
        <p class="text-h6 text-medium-emphasis mb-8">
          Erstelle schöne Diagramme aus deinen Daten
        </p>
        <div class="d-flex justify-center ga-4">
          <v-btn
            color="primary"
            size="large"
            :to="{ name: 'Login' }"
          >
            Anmelden
          </v-btn>
          <v-btn
            variant="outlined"
            size="large"
            :to="{ name: 'Signup' }"
          >
            Registrieren
          </v-btn>
        </div>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
.landing-logo {
  width: 96px;
  height: 96px;
  object-fit: contain;
}
</style>
