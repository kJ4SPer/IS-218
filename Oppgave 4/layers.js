import { getAllResources, fetchLocalShelters } from './api.js';

export async function addSheltersLayer(map) {
    const tilfluktsromData = await fetchLocalShelters();
    if (!tilfluktsromData) return;
    
    // Aktiver clustering
    map.addSource('tilfluktsrom-kilde', {
        type: 'geojson',
        data: tilfluktsromData,
        cluster: true,
        clusterMaxZoom: 13, // Løs opp clustere når man zoomer inn
        clusterRadius: 50
    });

    // Lag for grupperinger (Clusters)
    map.addLayer({
        id: 'tilfluktsrom-clusters',
        type: 'circle',
        source: 'tilfluktsrom-kilde',
        filter: ['has', 'point_count'],
        paint: {
            'circle-color': '#334155', // Taktisk grå
            'circle-radius': ['step', ['get', 'point_count'], 14, 5, 18, 15, 22],
            'circle-stroke-width': 2,
            'circle-stroke-color': '#cbd5e1'
        }
    });

    // Tekst inni clusters
    map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'tilfluktsrom-kilde',
        filter: ['has', 'point_count'],
        layout: {
            'text-field': '{point_count_abbreviated}',
            'text-size': 12,
            'text-allow-overlap': true
        },
        paint: {
            'text-color': '#ffffff'
        }
    });

    // Individuelle tilfluktsrom
    map.addLayer({
        id: 'tilfluktsrom-lag',
        type: 'circle',
        source: 'tilfluktsrom-kilde',
        filter: ['!', ['has', 'point_count']],
        paint: {
            'circle-color': [
                'step',
                ['get', 'plasser'],
                '#ed8936', // Amber (< 200)
                200, '#e53e3e' // Rød (>= 200)
            ],
            'circle-radius': 6,
            'circle-stroke-width': 0
        }
    });
}

export async function addResourcesLayer(map) {
    const geoJsonData = await getAllResources();
    if (!geoJsonData) return;

    map.addSource('supabase-ressurser', {
        type: 'geojson',
        data: geoJsonData
    });

    map.addLayer({
        id: 'ressurser-lag',
        type: 'circle',
        source: 'supabase-ressurser',
        paint: {
            'circle-color': '#4fd1c5', // Taktisk cyan/grønn
            'circle-radius': 5,
            'circle-stroke-width': 0
        }
    });
}

export function addFloodLayers(map) {
    map.addSource('flomsone-kilde', {
        type: 'geojson',
        data: './data/flomsone_web.geojson'
    });

    map.addLayer({
        id: 'flomsone-lag',
        type: 'fill',
        source: 'flomsone-kilde',
        paint: {
            'fill-color': '#e53e3e',
            'fill-opacity': 0.15,
            'fill-outline-color': '#e53e3e'
        }
    }, 'tilfluktsrom-clusters'); // Legg bak

    map.addSource('saarbare-kilde', {
        type: 'geojson',
        data: './data/saarbare_tilfluktsrom_web.geojson' 
    });

    // Statisk kjerne
    map.addLayer({
        id: 'saarbare-lag',
        type: 'circle',
        source: 'saarbare-kilde',
        paint: {
            'circle-radius': 8,
            'circle-color': '#e53e3e',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff'
        }
    });

    // Animert puls-lag (styres av main.js)
    map.addLayer({
        id: 'saarbare-glod',
        type: 'circle',
        source: 'saarbare-kilde',
        paint: {
            'circle-radius': 15,
            'circle-color': '#e53e3e',
            'circle-opacity': 0.8,
            'circle-stroke-width': 1,
            'circle-stroke-color': '#e53e3e'
        }
    });
}

export function addRouteLayer(map) {
    map.addSource('route', {
        type: 'geojson',
        data: {
            type: 'FeatureCollection',
            features: []
        }
    });

    map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        layout: {
            'line-join': 'round',
            'line-cap': 'round'
        },
        paint: {
            'line-color': '#007cbf',
            'line-width': 5,
            'line-opacity': 0.75
        }
    });
}

export function updateRouteLayer(map, routeGeoJSON) {
    const source = map.getSource('route');
    if (source) {
        source.setData({
            type: 'Feature',
            properties: {},
            geometry: routeGeoJSON
        });
    }
}

export function add3DBuildings(map) {
    // Finn det første laget som inneholder tekst (for å legge bygningene under gatenavnene)
    const layers = map.getStyle().layers;
    let labelLayerId;
    for (let i = 0; i < layers.length; i++) {
        if (layers[i].type === 'symbol' && layers[i].layout['text-field']) {
            labelLayerId = layers[i].id;
            break;
        }
    }

    map.addLayer(
        {
            'id': '3d-buildings',
            'source': 'composite', // Avhenger av stilen din, ofte 'openmaptiles' eller 'composite'
            'source-layer': 'building',
            'filter': ['==', 'extrude', 'true'],
            'type': 'fill-extrusion',
            'minzoom': 14,
            'paint': {
                'fill-extrusion-color': '#aaa',
                'fill-extrusion-height': [
                    'interpolate', ['linear'], ['zoom'],
                    14, 0,
                    15.05, ['get', 'height']
                ],
                'fill-extrusion-base': [
                    'interpolate', ['linear'], ['zoom'],
                    14, 0,
                    15.05, ['get', 'min_height']
                ],
                'fill-extrusion-opacity': 0.6
            }
        },
        labelLayerId
    );
}