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
    });
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

/**
 * Henter og legger til flomsoner og sårbare tilfluktsrom fra våre lokale GeoJSON-filer.
 * @param {maplibregl.Map} map - Kartobjektet laget skal legges til på.
 */
export function addFloodLayers(map) {
    // 1. Flomsonen (Vi legger den til, men prøver å plassere den under punktene)
    map.addSource('flomsone-kilde', {
        type: 'geojson',
        data: './data/flomsone_web.geojson'
    });

    map.addLayer({
        id: 'flomsone-lag',
        type: 'fill',
        source: 'flomsone-kilde',
        paint: {
            'fill-color': '#007cbf',
            'fill-opacity': 0.6, // Litt mørkere for å synes bedre
            'fill-outline-color': '#004a73'
        }
    }, 'tilfluktsrom-lag'); // <--- Dette trikset legger flommen UNDER tilfluktsrommene!

    // 2. Sårbare tilfluktsrom (De røde)
    map.addSource('saarbare-kilde', {
        type: 'geojson',
        data: './data/saarbare_tilfluktsrom_web.geojson' 
    });

    map.addLayer({
        id: 'saarbare-lag',
        type: 'circle',
        source: 'saarbare-kilde',
        paint: {
            'circle-radius': 10,       // Litt større enn de vanlige (som er 8)
            'circle-color': '#FF0000', // Rød
            'circle-stroke-width': 3,
            'circle-stroke-color': '#ffffff'
        }
    });
}

