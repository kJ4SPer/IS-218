// --- LAG-MODUL ---
// Denne modulen tar seg av å legge til ulike datalag på kartet.

import { getAllResources, fetchLocalShelters } from './api.js';

/**
 * Legger til Geonorges gråtone-bakgrunnskart som et WMS-lag.
 * Dette gir en nøytral bakgrunn som får våre data til å stå tydeligere frem.
 * @param {maplibregl.Map} map - Kartobjektet laget skal legges til på.
 */
export function addWmsLayer(map) {
    // Legger til en 'source' (datakilde) for WMS-tjenesten.
    map.addSource('geonorge-bakgrunn-kilde', {
        type: 'raster', // Denne kilden leverer ferdige kartbilder (raster).
        tiles: [
            // URL-en til Kartverkets WMS-tjeneste. MapLibre erstatter automatisk {bbox-epsg-3857}
            // med koordinatene for kartutsnittet som skal vises.
            'https://wms.geonorge.no/skwms1/wms.topograatone?service=WMS&version=1.1.1&request=GetMap&layers=topograatone&styles=&format=image/png&transparent=true&srs=EPSG:3857&bbox={bbox-epsg-3857}&width=256&height=256'
        ],
        tileSize: 256, // Størrelsen på bildene som hentes.
        attribution: '&copy; <a href="http://www.kartverket.no/">Kartverket</a>' // Viser kreditering.
    });

    // Legger til selve laget som viser bildene fra kilden vi definerte over.
    map.addLayer({
        id: 'geonorge-bakgrunn-lag',
        type: 'raster',
        source: 'geonorge-bakgrunn-kilde',
        paint: {
            'raster-opacity': 1.0 // Full synlighet.
        }
    }, 'tilfluktsrom-lag'); // Andre parameter: Legg laget UNDER tilfluktsrom-laget, om det finnes.
}

/**
 * Henter ressurser fra Supabase og legger dem til på kartet som et sirkel-lag.
 * @param {maplibregl.Map} map - Kartobjektet laget skal legges til på.
 */
export async function addResourcesLayer(map) {
    const geoJsonData = await getAllResources();
    if (!geoJsonData) return; // Avbryt hvis data ikke kunne hentes.

    map.addSource('supabase-ressurser', {
        type: 'geojson',
        data: geoJsonData
    });

    map.addLayer({
        id: 'ressurser-lag',
        type: 'circle',
        source: 'supabase-ressurser',
        paint: {
            'circle-color': '#00ff00', // Grønn farge for ressurser.
            'circle-radius': 8,
            'circle-stroke-width': 1.5,
            'circle-stroke-color': '#000000'
        }
    });
}

/**
 * Henter tilfluktsrom fra lokal GeoJSON og legger dem til på kartet.
 * Bruker datadrevet styling for farge og størrelse basert på kapasitet.
 * @param {maplibregl.Map} map - Kartobjektet laget skal legges til på.
 */
export async function addSheltersLayer(map) {
    const tilfluktsromData = await fetchLocalShelters();
    if (!tilfluktsromData) return; // Avbryt hvis data ikke kunne hentes.
    
    map.addSource('tilfluktsrom-kilde', {
        type: 'geojson',
        data: tilfluktsromData
    });

    map.addLayer({
        id: 'tilfluktsrom-lag',
        type: 'circle',
        source: 'tilfluktsrom-kilde',
        paint: {
            // 'circle-color' styres av kapasiteten ('plasser') i dataene.
            'circle-color': [
                'step',                    // Bruker en "trappetrinn"-funksjon.
                ['get', 'plasser'],        // Verdien som skal evalueres.
                '#ff9999',                 // Farge for plasser < 200 (lyserød).
                200, '#cc0000'             // Farge for plasser >= 200 (mørkerød).
            ],
            // 'circle-radius' (størrelse) styres også av kapasiteten.
            'circle-radius': [
                'step',
                ['get', 'plasser'],
                6,                         // Radius for plasser < 200.
                200, 12                    // Radius for plasser >= 200.
            ],
            'circle-stroke-width': 1,
            'circle-stroke-color': '#ffffff'
        }
    });
}