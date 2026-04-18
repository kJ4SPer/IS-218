import { findNearestResource, findResourcesWithinRadius } from './api.js';

function toggleLayerVisibility(map, layerId, isVisible) {
    if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, 'visibility', isVisible ? 'visible' : 'none');
    }
}

export function setupLayerToggles(map) {
    document.getElementById('toggle-tilfluktsrom').addEventListener('change', (e) => {
        toggleLayerVisibility(map, 'tilfluktsrom-lag', e.target.checked);
        toggleLayerVisibility(map, 'tilfluktsrom-clusters', e.target.checked);
        toggleLayerVisibility(map, 'cluster-count', e.target.checked);
        toggleLayerVisibility(map, 'saarbare-lag', e.target.checked);
        toggleLayerVisibility(map, 'saarbare-glod', e.target.checked);
    });

    document.getElementById('toggle-ressurser').addEventListener('change', (e) => {
        toggleLayerVisibility(map, 'ressurser-lag', e.target.checked);
    });

    document.getElementById('toggle-flomsone').addEventListener('change', (e) => {
        toggleLayerVisibility(map, 'flomsone-lag', e.target.checked);
        const flomInfo = document.getElementById('flom-info');
        if (flomInfo) flomInfo.style.display = e.target.checked ? 'block' : 'none';
    });
}

export function addLayerInteractions(map) {
    const layers = ['tilfluktsrom-lag', 'ressurser-lag', 'saarbare-lag', 'tilfluktsrom-clusters'];
    
    layers.forEach(layer => {
        map.on('mouseenter', layer, () => map.getCanvas().style.cursor = 'crosshair');
        map.on('mouseleave', layer, () => map.getCanvas().style.cursor = '');
    });

    // Zoom inn når man klikker på et cluster
    map.on('click', 'tilfluktsrom-clusters', (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ['tilfluktsrom-clusters'] });
        const clusterId = features[0].properties.cluster_id;
        map.getSource('tilfluktsrom-kilde').getClusterExpansionZoom(clusterId, (err, zoom) => {
            if (err) return;
            map.easeTo({ center: features[0].geometry.coordinates, zoom: zoom });
        });
    });
}

export function addMapClickInteraction(map) {
    map.on('click', async (e) => {
        const features = map.queryRenderedFeatures(e.point, {
            layers: ['saarbare-lag', 'tilfluktsrom-lag', 'ressurser-lag']
        });

        // 1. KLIKK PÅ OBJEKT
        if (features.length > 0) {
            const feature = features[0];
            const coords = feature.geometry.coordinates.slice();
            const props = feature.properties;
            let htmlContent = '';

            if (feature.layer.id === 'tilfluktsrom-lag' || feature.layer.id === 'saarbare-lag') {
                const isVulnerable = feature.layer.id === 'saarbare-lag';
                htmlContent = `
                    <div class="custom-popup font-mono">
                        <h3>OBJ: TILFLUKTSROM</h3>
                        <p class="text-muted">ID: ${props.romnr || 'N/A'}</p>
                        <p>LOC: ${props.adresse || 'UKJENT'}</p>
                        <p>KAP: <span class="text-light">${props.plasser} PAX</span></p>
                        ${isVulnerable ? `<div class="mt-2 text-danger fw-bold blink-text">[!] STATUS: KRITISK - FLOMSONE</div>` : ''}
                    </div>
                `;
            } else if (feature.layer.id === 'ressurser-lag') {
                htmlContent = `
                    <div class="custom-popup font-mono">
                        <h3 style="color: #4fd1c5; border-color: #4fd1c5;">OBJ: RESSURS</h3>
                        <p class="text-muted">TYP: ${props.kategori}</p>
                        <p>ID: ${props.navn}</p>
                    </div>
                `;
            }

            new maplibregl.Popup({ closeButton: false, closeOnClick: true })
                .setLngLat(coords)
                .setHTML(htmlContent)
                .addTo(map);
                
            return;
        }

        // 2. KLIKK PÅ TOMT KART: RADARSØK
        const klikk_lon = e.lngLat.lng;
        const klikk_lat = e.lngLat.lat;
        const radiusMeter = 1000;

        const ressurser = await findResourcesWithinRadius(klikk_lon, klikk_lat, radiusMeter);

        const center = [klikk_lon, klikk_lat];
        const options = { steps: 64, units: 'meters' };
        const circlePolygon = turf.circle(center, radiusMeter, options);

        if (map.getSource('sok-radius-kilde')) {
            map.getSource('sok-radius-kilde').setData(circlePolygon);
        } else {
            map.addSource('sok-radius-kilde', { type: 'geojson', data: circlePolygon });
            map.addLayer({
                id: 'sok-radius-lag',
                type: 'line',
                source: 'sok-radius-kilde',
                paint: {
                    'line-color': '#4fd1c5',
                    'line-width': 1,
                    'line-dasharray': [2, 4]
                }
            });
            map.addLayer({
                id: 'sok-radius-fill',
                type: 'fill',
                source: 'sok-radius-kilde',
                paint: {
                    'fill-color': '#4fd1c5',
                    'fill-opacity': 0.05
                }
            });
        }

        let htmlInnhold = `
            <div class="custom-popup font-mono">
                <h3 style="color: #4fd1c5; border-color: #4fd1c5;">OMRÅDESØK</h3>
                <p>RAD: ${radiusMeter}m</p>
        `;

        if (ressurser && ressurser.length > 0) {
            htmlInnhold += `<p class="mt-2 text-light">TREFF (${ressurser.length}):</p><ul class="list-unstyled mb-0 ms-2">`;
            ressurser.forEach(r => {
                htmlInnhold += `<li>> ${r.navn} [${Math.round(r.avstand)}m]</li>`;
            });
            htmlInnhold += `</ul></div>`;
        } else {
            htmlInnhold += `<p class="mt-2 text-muted">> INGEN TREFF</p></div>`;
        }

        new maplibregl.Popup({ closeButton: false })
            .setLngLat([klikk_lon, klikk_lat])
            .setHTML(htmlInnhold)
            .addTo(map);
    });
}

export function setupMyLocationButton(map) {
    const btn = document.getElementById('my-location-btn');
    let marker = null;

    btn.addEventListener('click', () => {
        if (!navigator.geolocation) return alert("SYS.ERR: GEO_NOT_SUPPORTED");

        navigator.geolocation.getCurrentPosition((pos) => {
            const { longitude, latitude } = pos.coords;
            map.flyTo({ center: [longitude, latitude], zoom: 15, speed: 1.2 });

            if (marker) marker.remove();
            
            // Taktisk blå markør
            marker = new maplibregl.Marker({ color: '#3b82f6' })
                .setLngLat([longitude, latitude])
                .addTo(map);
                
        }, () => alert("SYS.ERR: GEO_DENIED"));
    });
}