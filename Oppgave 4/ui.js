import { findNearestResource, findResourcesWithinRadius, fetchRoute, fetchLocalShelters } from './api.js';
import { updateRouteLayer } from './layers.js';

// Delt tilstand for å lagre brukerens posisjon på tvers av funksjoner
let currentUserPosition = null;

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

        const originalText = btn.innerHTML;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> SØKER...';

        navigator.geolocation.getCurrentPosition((pos) => {
            const { longitude, latitude } = pos.coords;
            currentUserPosition = [longitude, latitude];
            
            map.flyTo({ center: currentUserPosition, zoom: 15, speed: 1.2 });

            if (marker) marker.remove();
            
            // Wow-faktor: Pulserende taktiksk markør
            const el = document.createElement('div');
            el.className = 'user-location-pulse';

            marker = new maplibregl.Marker({ element: el })
                .setLngLat(currentUserPosition)
                .addTo(map);
                
            btn.innerHTML = originalText;
        }, () => {
            alert("SYS.ERR: GEO_DENIED");
            btn.innerHTML = originalText;
        });
    });
}

export function setupRoutingUI(map) {
    const routeBtn = document.getElementById('find-route-btn');
    if (!routeBtn) return;

    routeBtn.onclick = async () => {
        if (!currentUserPosition) {
            alert("[!] DATA MANGEL: Aktiver POS. TRACKING først.");
            return;
        }

        routeBtn.disabled = true;
        const originalText = routeBtn.innerHTML;
        routeBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> BEREGNER...';

        try {
            const sheltersData = await fetchLocalShelters();
            
            if (!sheltersData) {
                alert("SYS.ERR: Tilfluktsrom-data utilgjengelig.");
                return;
            }

            // Finn nærmeste punkt ved hjelp av Turf.js (mer nøyaktig enn queryRenderedFeatures)
            const userPoint = turf.point(currentUserPosition);
            const nearest = turf.nearestPoint(userPoint, sheltersData);

            // API-kall til OSRM
            const startCoords = { lng: currentUserPosition[0], lat: currentUserPosition[1] };
            const routeData = await fetchRoute(startCoords, nearest.geometry.coordinates);

            if (routeData && routeData.geometry) {
                updateRouteLayer(map, routeData.geometry);
                
                const distanceKm = (routeData.distance / 1000).toFixed(1);
                const timeMin = Math.max(1, Math.round((distanceKm / 60) * 60));

                showRouteInfo(distanceKm, timeMin, nearest.properties.navn || nearest.properties.adresse || "Nærmeste rom");
                
                // Wow-faktor: Filmatisk "Helikopter-view"
                const bearing = turf.bearing(userPoint, nearest);
                const bounds = new maplibregl.LngLatBounds(currentUserPosition, currentUserPosition);
                bounds.extend(nearest.geometry.coordinates);

                map.fitBounds(bounds, {
                    padding: {top: 50, bottom: 50, left: 350, right: 50},
                    maxZoom: 15,
                    pitch: 60,       // Tilt kartet
                    bearing: bearing, // Roter i kjøreretning
                    duration: 3000,   // Myk overgang
                    essential: true
                });
            } else {
                alert("SYS.ERR: Kunne ikke beregne rute.");
            }
        } catch (error) {
            console.error("Routing error:", error);
        } finally {
            routeBtn.disabled = false;
            routeBtn.innerHTML = originalText;
        }
    };
}

function showRouteInfo(dist, time, name) {
    const infoBox = document.getElementById('route-info-box');
    if (!infoBox) return;
    
    infoBox.style.display = 'block';
    infoBox.innerHTML = `
        <div class="fw-bold text-danger mb-1 border-bottom border-secondary pb-1 text-uppercase">Aktiv Rute</div>
        <div class="mt-2 text-truncate" title="${name}">MÅL: ${name}</div>
        <div>AVST: ${dist} km</div>
        <div>TID: ~${time} min (60km/t)</div>
    `;
}

export async function setupLiveHUD(map) {
    // Vi henter dataen kun én gang for å spare nettverk, og lagrer den i minnet
    const sheltersData = await fetchLocalShelters();
    if (!sheltersData) return;

    const countEl = document.getElementById('hud-count');
    const capEl = document.getElementById('hud-cap');
    if (!countEl || !capEl) return;

    function updateHUD() {
        // Hent koordinatene for det som er synlig på skjermen akkurat nå
        const bounds = map.getBounds();
        
        // Formaterer bounding-boxen slik Turf.js vil ha den: [minX, minY, maxX, maxY]
        const bbox = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()];
        const searchPoly = turf.bboxPolygon(bbox);

        // Finner alle tilfluktsrom som befinner seg innenfor firkanten
        const visiblePoints = turf.pointsWithinPolygon(sheltersData, searchPoly);

        // Kalkulerer totalsummene
        const count = visiblePoints.features.length;
        const totalCapacity = visiblePoints.features.reduce((sum, feature) => {
            return sum + (feature.properties.plasser || 0);
        }, 0);

        // Oppdaterer DOM - toLocaleString gir fine tusenskilletegn (f.eks 10 500)
        countEl.innerText = count.toLocaleString('no-NO');
        capEl.innerText = totalCapacity.toLocaleString('no-NO') + ' PAX';
    }

    // Lytter på kartbevegelser. Oppdaterer HUD-en hver gang brukeren slipper musa etter panorering/zoom.
    map.on('moveend', updateHUD);
    map.on('zoomend', updateHUD);
    
    // Tvinger en umiddelbar oppdatering når kartet lastes første gang
    updateHUD();}