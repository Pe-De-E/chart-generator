#!/usr/bin/env node
/**
 * Prepare Natural Earth 50m GeoJSON data for the route map renderer.
 *
 * Downloads Natural Earth 50m datasets, strips unnecessary properties,
 * rounds coordinates to 3 decimal places, and outputs minimal JSON files.
 * 50m resolution provides enough vertices for route-level zoom while
 * keeping file sizes reasonable for frontend bundling.
 *
 * Usage:
 *   node scripts/prepare-geodata.js
 *
 * Output:
 *   packages/frontend/src/data/geo/countries.json
 *   packages/frontend/src/data/geo/rivers.json
 *   packages/frontend/src/data/geo/cities.json
 */

const fs = require('fs')
const path = require('path')
const https = require('https')

const OUTPUT_DIR = path.join(__dirname, '..', 'packages', 'frontend', 'src', 'data', 'geo')

const BASE_URL = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson'

const DATASETS = {
  // 50m for country borders (good detail, reasonable size)
  countries: `${BASE_URL}/ne_50m_admin_0_countries.geojson`,
  // 10m for rivers and cities (small rivers like Inn, medium cities like Innsbruck)
  rivers: `${BASE_URL}/ne_10m_rivers_lake_centerlines.geojson`,
  cities: `${BASE_URL}/ne_10m_populated_places.geojson`,
}

/** Round a coordinate to N decimal places */
function roundCoord(val, decimals = 3) {
  const factor = Math.pow(10, decimals)
  return Math.round(val * factor) / factor
}

/** Round all coordinates in a GeoJSON coordinate array (recursive) */
function roundCoords(coords, decimals = 3) {
  if (typeof coords[0] === 'number') {
    // It's a single [lon, lat] pair
    return coords.map(c => roundCoord(c, decimals))
  }
  return coords.map(c => roundCoords(c, decimals))
}

/** Download a URL and return the body as a string */
function download(url) {
  return new Promise((resolve, reject) => {
    const fetch = (url) => {
      https.get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          fetch(res.headers.location)
          return
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${url}`))
          return
        }
        const chunks = []
        res.on('data', chunk => chunks.push(chunk))
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')))
        res.on('error', reject)
      }).on('error', reject)
    }
    fetch(url)
  })
}

/** Process countries: keep only name + geometry */
function processCountries(geojson) {
  return {
    type: 'FeatureCollection',
    features: geojson.features
      .filter(f => f.geometry && (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon'))
      .map(f => ({
        type: 'Feature',
        properties: { name: f.properties.NAME || f.properties.name || '' },
        geometry: {
          type: f.geometry.type,
          coordinates: roundCoords(f.geometry.coordinates),
        },
      })),
  }
}

/** Process rivers: keep only name + geometry */
function processRivers(geojson) {
  return {
    type: 'FeatureCollection',
    features: geojson.features
      .filter(f => f.geometry && (f.geometry.type === 'LineString' || f.geometry.type === 'MultiLineString'))
      .map(f => ({
        type: 'Feature',
        properties: { name: f.properties.name || f.properties.NAME || '' },
        geometry: {
          type: f.geometry.type,
          coordinates: roundCoords(f.geometry.coordinates),
        },
      })),
  }
}

/** Process cities: flat array with name, lat, lon, pop */
function processCities(geojson) {
  return geojson.features
    .filter(f => f.geometry && f.geometry.type === 'Point')
    .map(f => ({
      name: f.properties.NAME || f.properties.name || '',
      lon: roundCoord(f.geometry.coordinates[0], 2),
      lat: roundCoord(f.geometry.coordinates[1], 2),
      pop: Math.round(f.properties.POP_MAX || f.properties.pop_max || f.properties.POP_EST || 0),
    }))
    .filter(c => c.pop > 0)
    .sort((a, b) => b.pop - a.pop)
}

async function main() {
  // Ensure output dir exists
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })

  console.log('Downloading Natural Earth 110m datasets...\n')

  // Download all three
  const [countriesRaw, riversRaw, citiesRaw] = await Promise.all([
    download(DATASETS.countries).then(s => { console.log('  Countries downloaded'); return s }),
    download(DATASETS.rivers).then(s => { console.log('  Rivers downloaded'); return s }),
    download(DATASETS.cities).then(s => { console.log('  Cities downloaded'); return s }),
  ])

  console.log('\nProcessing...')

  const countries = processCountries(JSON.parse(countriesRaw))
  const rivers = processRivers(JSON.parse(riversRaw))
  const cities = processCities(JSON.parse(citiesRaw))

  // Write output
  const countriesPath = path.join(OUTPUT_DIR, 'countries.json')
  const riversPath = path.join(OUTPUT_DIR, 'rivers.json')
  const citiesPath = path.join(OUTPUT_DIR, 'cities.json')

  fs.writeFileSync(countriesPath, JSON.stringify(countries))
  fs.writeFileSync(riversPath, JSON.stringify(rivers))
  fs.writeFileSync(citiesPath, JSON.stringify(cities))

  // Report sizes
  const sizeKB = (p) => (fs.statSync(p).size / 1024).toFixed(1)
  console.log(`\nOutput:`)
  console.log(`  countries.json  ${sizeKB(countriesPath)} KB  (${countries.features.length} features)`)
  console.log(`  rivers.json     ${sizeKB(riversPath)} KB  (${rivers.features.length} features)`)
  console.log(`  cities.json     ${sizeKB(citiesPath)} KB  (${cities.length} cities)`)
  console.log(`  Total:          ${(
    parseFloat(sizeKB(countriesPath)) +
    parseFloat(sizeKB(riversPath)) +
    parseFloat(sizeKB(citiesPath))
  ).toFixed(1)} KB`)
  console.log('\nDone!')
}

main().catch(err => {
  console.error('Error:', err.message)
  process.exit(1)
})
