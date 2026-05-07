/**
 * parse-hdx-data.mjs
 *
 * One-time script: reads the HDX Turkey POI GeoJSON and populates
 * src/data/attractions.json, hotels.json, restaurants.json.
 *
 * transportation.json is intentionally preserved — it holds route/leg data
 * (origin→destination pairs) that cannot be derived from POI nodes.
 * Bus stations and ferry terminals found in the dataset are appended to
 * attractions.json as "transport_hub" category instead.
 *
 * Usage:
 *   node scripts/parse-hdx-data.mjs
 *
 * No extra packages needed — uses only Node built-ins + streaming JSON parser.
 * For the 110 MB file we use stream-json to avoid loading everything into RAM.
 * Install once: npm install --save-dev stream-json
 */

import { createReadStream } from 'fs';
import { writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pipeline } from 'stream/promises';
import streamChainPkg from 'stream-chain';
import streamJsonPkg from 'stream-json';
import streamArrayPkg from 'stream-json/streamers/StreamArray.js';
import pickPkg from 'stream-json/filters/Pick.js';

const { chain } = streamChainPkg;
const { parser } = streamJsonPkg;
const { streamArray } = streamArrayPkg;
const { pick } = pickPkg;

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ─── Region bounding boxes [minLon, minLat, maxLon, maxLat] ──────────────────
// Derived from OSM data exploration. Generous bounds to catch suburbs.
const REGIONS = {
  Istanbul:    [28.0,  40.8,  29.5,  41.4],
  Cappadocia:  [34.4,  38.3,  35.2,  39.3],  // Nevşehir / Göreme / Ürgüp
  Antalya:     [30.3,  36.7,  31.0,  37.1],
  Ephesus:     [27.2,  37.8,  27.6,  38.1],  // Selçuk / Kuşadası area
  Pamukkale:   [28.7,  37.8,  29.2,  38.0],  // Denizli / Pamukkale
  Bodrum:      [27.1,  36.9,  27.6,  37.2],
};

// Name fragments that override bbox when addr:city is missing
const REGION_NAME_HINTS = {
  Istanbul:   ['istanbul', 'İstanbul'],
  Cappadocia: ['cappadoc', 'kapadok', 'göreme', 'goreme', 'ürgüp', 'urgup', 'nevşehir', 'nevsehir', 'uçhisar', 'uchis'],
  Antalya:    ['antalya', 'kaleiçi', 'kaleici'],
  Ephesus:    ['ephesus', 'efes', 'selçuk', 'selcuk', 'kuşadası', 'kusadasi'],
  Pamukkale:  ['pamukkale', 'hierapolis', 'denizli'],
  Bodrum:     ['bodrum', 'halicarnassus', 'halicarnassos'],
};

// ─── Category rules ───────────────────────────────────────────────────────────
// Returns { bucket, category } or null if not relevant.
function classify(props) {
  const amenity = props.amenity || '';
  const tourism = props.tourism || '';
  const historic = props.historic || '';
  const shop    = props.shop || '';

  // Hotels
  if (['hotel', 'hostel', 'motel', 'guest_house', 'apartment'].includes(tourism)) {
    return { bucket: 'hotels', category: tourism };
  }

  // Restaurants / cafes
  if (['restaurant', 'cafe', 'fast_food', 'food_court', 'ice_cream', 'bar', 'pub'].includes(amenity)) {
    return { bucket: 'restaurants', category: amenity };
  }

  // Attractions
  if (['attraction', 'museum', 'viewpoint', 'artwork', 'gallery', 'theme_park', 'zoo', 'aquarium'].includes(tourism)) {
    return { bucket: 'attractions', category: tourism };
  }
  if (historic) {
    return { bucket: 'attractions', category: 'historic' };
  }
  if (['place_of_worship', 'theatre', 'cinema', 'arts_centre', 'library'].includes(amenity)) {
    return { bucket: 'attractions', category: amenity };
  }

  // Transport hubs (kept as attractions since transportation.json holds routes)
  if (['bus_station', 'ferry_terminal', 'taxi'].includes(amenity)) {
    return { bucket: 'attractions', category: 'transport_hub' };
  }

  return null;
}

// ─── City detection ───────────────────────────────────────────────────────────
function detectCity(props, lon, lat) {
  // 1. Try addr:city field (normalise Turkish chars for comparison)
  const addrCity = (props['addr:city'] || props['addr:district'] || '').trim();
  if (addrCity) {
    for (const [city, hints] of Object.entries(REGION_NAME_HINTS)) {
      if (hints.some(h => addrCity.toLowerCase().includes(h))) return city;
    }
  }

  // 2. Try feature name
  const name = (props.name || props['name:en'] || '').toLowerCase();
  for (const [city, hints] of Object.entries(REGION_NAME_HINTS)) {
    if (hints.some(h => name.includes(h))) return city;
  }

  // 3. Bounding box fallback
  for (const [city, [minLon, minLat, maxLon, maxLat]] of Object.entries(REGIONS)) {
    if (lon >= minLon && lon <= maxLon && lat >= minLat && lat <= maxLat) return city;
  }

  return null; // outside all target regions
}

// ─── Output schema builders ───────────────────────────────────────────────────
let idCounter = 1;

function buildAttraction(props, city, lon, lat) {
  const tags = [];
  ['amenity','tourism','historic','man_made','shop'].forEach(k => {
    if (props[k]) tags.push(`${k}=${props[k]}`);
  });
  return {
    id: `hdx-attr-${idCounter++}`,
    name: props['name:en'] || props.name || 'Unnamed',
    city,
    category: props.tourism || props.historic || props.amenity || 'attraction',
    latitude: lat,
    longitude: lon,
    duration_hours: null,   // placeholder — UI expects this field
    cost_usd: 0,            // placeholder
    rating: null,           // placeholder
    description: null,      // placeholder
    tags,
  };
}

function buildHotel(props, city, lon, lat) {
  return {
    id: `hdx-hotel-${idCounter++}`,
    name: props['name:en'] || props.name || 'Unnamed',
    city,
    latitude: lat,
    longitude: lon,
    price_per_night: null,  // placeholder
    rating: null,           // placeholder
    family_friendly: null,  // placeholder
    rooms: props.rooms ? Number(props.rooms) : null,
    beds: props.beds ? Number(props.beds) : null,
    tags: [props.tourism].filter(Boolean),
  };
}

function buildRestaurant(props, city, lon, lat) {
  return {
    id: `hdx-rest-${idCounter++}`,
    name: props['name:en'] || props.name || 'Unnamed',
    city,
    latitude: lat,
    longitude: lon,
    cuisine: null,          // placeholder
    halal: null,            // placeholder
    price_range: null,      // placeholder
    rating: null,           // placeholder
    opening_hours: props.opening_hours || null,
    tags: [props.amenity].filter(Boolean),
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const geojsonPath = resolve(ROOT, 'hotosm_tur_points_of_interest_points_geojson.geojson');

  if (!existsSync(geojsonPath)) {
    console.error('ERROR: GeoJSON file not found at', geojsonPath);
    process.exit(1);
  }

  console.log('Streaming', geojsonPath, '...');

  const buckets = { attractions: [], hotels: [], restaurants: [] };
  let processed = 0;
  let matched = 0;
  let skippedNoName = 0;

  const fileStream = createReadStream(geojsonPath, { encoding: 'utf8' });

  await pipeline(
    fileStream,
    parser(),
    pick({ filter: 'features' }),
    streamArray(),
    async function* (source) {
      for await (const { value: feature } of source) {
        processed++;
        if (processed % 50000 === 0) {
          process.stdout.write(`  processed ${processed.toLocaleString()} features, matched ${matched}...\n`);
        }

        const props = feature.properties || {};
        const coords = feature.geometry?.coordinates;
        if (!coords || feature.geometry?.type !== 'Point') continue;

        const [lon, lat] = coords;

        // Skip unnamed entries for hotels/restaurants (noise); keep for attractions
        const hasName = !!(props.name || props['name:en']);

        const classification = classify(props);
        if (!classification) continue;

        const city = detectCity(props, lon, lat);
        if (!city) continue;

        if (!hasName && classification.bucket !== 'attractions') {
          skippedNoName++;
          continue;
        }

        matched++;

        switch (classification.bucket) {
          case 'attractions':
            buckets.attractions.push(buildAttraction(props, city, lon, lat));
            break;
          case 'hotels':
            buckets.hotels.push(buildHotel(props, city, lon, lat));
            break;
          case 'restaurants':
            buckets.restaurants.push(buildRestaurant(props, city, lon, lat));
            break;
        }
      }
    }
  );

  console.log(`\nDone. Processed: ${processed.toLocaleString()}, Matched: ${matched}, Skipped (no name): ${skippedNoName}`);
  console.log('Bucket sizes:', Object.fromEntries(Object.entries(buckets).map(([k,v]) => [k, v.length])));

  // ─── Deduplicate by name+city (OSM can have duplicate nodes) ───────────────
  for (const [key, arr] of Object.entries(buckets)) {
    const seen = new Set();
    buckets[key] = arr.filter(item => {
      const sig = `${item.name.toLowerCase()}|${item.city}`;
      if (seen.has(sig)) return false;
      seen.add(sig);
      return true;
    });
  }
  console.log('After dedup:', Object.fromEntries(Object.entries(buckets).map(([k,v]) => [k, v.length])));

  // ─── Merge with existing curated data (prepend curated, append HDX) ────────
  // Curated entries have no `id` field — they stay at top, HDX entries follow.
  const targets = {
    attractions: resolve(ROOT, 'src/data/attractions.json'),
    hotels:      resolve(ROOT, 'src/data/hotels.json'),
    restaurants: resolve(ROOT, 'src/data/restaurants.json'),
  };

  for (const [key, hdxEntries] of Object.entries(buckets)) {
    const path = targets[key];
    let existing = [];
    try {
      const raw = (await import('fs')).readFileSync(path, 'utf8');
      existing = JSON.parse(raw);
    } catch {
      // file missing or empty — start fresh
    }

    // Avoid re-adding HDX entries on repeated runs
    const existingHdxIds = new Set(existing.filter(e => e.id).map(e => e.id));
    const newEntries = hdxEntries.filter(e => !existingHdxIds.has(e.id));

    const merged = [...existing, ...newEntries];
    writeFileSync(path, JSON.stringify(merged, null, 2), 'utf8');
    console.log(`Wrote ${merged.length} entries to src/data/${key}.json (${existing.length} existing + ${newEntries.length} new)`);
  }

  console.log('\nDone. transportation.json untouched (route data, not POI nodes).');
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
