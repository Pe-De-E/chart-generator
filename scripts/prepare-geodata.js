#!/usr/bin/env node
/**
 * Prepare geodata for the route map renderer.
 *
 * Downloads:
 *   - Natural Earth 50m country borders
 *   - Natural Earth 10m rivers
 *   - GeoNames cities5000 (all cities with population > 5,000)
 *
 * Strips unnecessary properties, rounds coordinates, and outputs minimal JSON.
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
const http = require('http')
const { execSync } = require('child_process')
const os = require('os')

const OUTPUT_DIR = path.join(__dirname, '..', 'packages', 'frontend', 'src', 'data', 'geo')

const BASE_URL = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson'

const DATASETS = {
  // 50m for country borders (good detail, reasonable size)
  countries: `${BASE_URL}/ne_50m_admin_0_countries.geojson`,
  // 10m for rivers (small rivers like Inn)
  rivers: `${BASE_URL}/ne_10m_rivers_lake_centerlines.geojson`,
}

// GeoNames: all cities with population > 5,000 (~50K cities)
const GEONAMES_URL = 'https://download.geonames.org/export/dump/cities5000.zip'

/** Round a coordinate to N decimal places */
function roundCoord(val, decimals = 3) {
  const factor = Math.pow(10, decimals)
  return Math.round(val * factor) / factor
}

/** Round all coordinates in a GeoJSON coordinate array (recursive) */
function roundCoords(coords, decimals = 3) {
  if (typeof coords[0] === 'number') {
    return coords.map(c => roundCoord(c, decimals))
  }
  return coords.map(c => roundCoords(c, decimals))
}

/** Download a URL and return the body as a string */
function download(url) {
  return new Promise((resolve, reject) => {
    const fetch = (url) => {
      const mod = url.startsWith('https') ? https : http
      mod.get(url, (res) => {
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

/** Download a URL and return the body as a Buffer */
function downloadBinary(url) {
  return new Promise((resolve, reject) => {
    const fetch = (url) => {
      const mod = url.startsWith('https') ? https : http
      mod.get(url, (res) => {
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
        res.on('end', () => resolve(Buffer.concat(chunks)))
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

/**
 * Process GeoNames cities5000.txt (tab-separated).
 * Columns: geonameid, name, asciiname, alternatenames, latitude, longitude,
 *          feature class, feature code, country code, cc2, admin1..4,
 *          population, elevation, dem, timezone, modification date
 */
function processGeoNamesCities(tsv) {
  return tsv
    .split('\n')
    .filter(line => line.trim())
    .map(line => {
      const f = line.split('\t')
      if (f.length < 15) return null
      const pop = parseInt(f[14], 10) || 0
      const lat = parseFloat(f[4])
      const lon = parseFloat(f[5])
      if (!pop || isNaN(lat) || isNaN(lon)) return null
      return {
        name: f[1],
        lat: roundCoord(lat, 2),
        lon: roundCoord(lon, 2),
        pop,
      }
    })
    .filter(Boolean)
    .sort((a, b) => b.pop - a.pop)
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })

  console.log('Downloading geodata...\n')

  // Download Natural Earth (countries + rivers) in parallel with GeoNames
  const [countriesRaw, riversRaw, citiesZip] = await Promise.all([
    download(DATASETS.countries).then(s => { console.log('  Countries (NE 50m) downloaded'); return s }),
    download(DATASETS.rivers).then(s => { console.log('  Rivers (NE 10m) downloaded'); return s }),
    downloadBinary(GEONAMES_URL).then(b => { console.log('  Cities (GeoNames 5000) downloaded'); return b }),
  ])

  console.log('\nProcessing...')

  // Process countries + rivers
  const countries = processCountries(JSON.parse(countriesRaw))
  const rivers = processRivers(JSON.parse(riversRaw))

  // Extract GeoNames zip → cities5000.txt
  const tmpDir = path.join(os.tmpdir(), 'geodata-' + Date.now())
  fs.mkdirSync(tmpDir, { recursive: true })
  const zipPath = path.join(tmpDir, 'cities5000.zip')
  fs.writeFileSync(zipPath, citiesZip)

  try {
    if (process.platform === 'win32') {
      execSync(`powershell -command "Expand-Archive -Force -Path '${zipPath}' -DestinationPath '${tmpDir}'"`)
    } else {
      execSync(`unzip -o '${zipPath}' -d '${tmpDir}'`)
    }
  } catch (e) {
    console.error('Failed to unzip GeoNames:', e.message)
    process.exit(1)
  }

  const citiesTsv = fs.readFileSync(path.join(tmpDir, 'cities5000.txt'), 'utf-8')
  const cities = processGeoNamesCities(citiesTsv)

  // Clean up temp
  fs.rmSync(tmpDir, { recursive: true, force: true })

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
