// --- UI-MODUL ---
// Denne modulen håndterer brukergrensesnitt-elementer og interaksjoner.

import { findNearestResource, findResourcesWithinRadius } from './api.js';

/**
 * Setter opp funksjonalitet for å vise/skjule kartlag via avkrysningsbokser.
 * @param {maplibregl.Map} map - Kartobjektet som skal styres.
 */
export function setupLayerToggles(map) {
    // Lytter etter endringer på avkrysningsboksen for tilfluktsrom.
    document.getElementById('toggle-tilfluktsrom').addEventListener('change', (e) => {
        const visibility = e.target.checked ? 'visible' : 'none';
        map.setLayoutProperty('tilfluktsrom-lag', 'visibility', visibility);
    });

    // Lytter etter endringer på avkrysningsboksen for ressurser.
    document.getElementById('toggle-ressurser').addEventListener('change', (e) => {
        const visibility = e.target.checked ? 'visible' : 'none';
        map.setLayoutProperty('ressurser-lag', 'visibility', visibility);
    });

    // Lytter etter endringer på avkrysningsboksen for flomsone.
    document.getElementById('toggle-flomsone').addEventListener('change', (e) => {
    const visibility = e.target.checked ? 'visible' : 'none';
    const display = e.target.checked ? 'block' : 'none'; // Ny linje
    
    map.setLayoutProperty('flomsone-lag', 'visibility', visibility);
    map.setLayoutProperty('saarbare-lag', 'visibility', visibility);
    map.setLayoutProperty('saarbare-glod', 'visibility', visibility);
    document.getElementById('flom-info').style.display = display; // Ny linje
});
}

/**
 * Legger til interaksjoner (popup ved klikk, endring av musepeker) for et gitt kartlag.
 * @param {maplibregl.Map} map - Kartobjektet.
 * @param {string} layerId - ID-en til laget interaksjonen gjelder for.
 * @param {function} createPopupHtml - En funksjon som tar egenskapene (properties) til et
 *                                     kartobjekt og returnerer en HTML-streng for popupen.
 */
function addInteraction(map, layerId, createPopupHtml) {
    // Viser popup ved klikk på et objekt i laget.
    map.on('click', layerId, (e) => {
        const properties = e.features[0].properties;
        const coordinates = e.features[0].geometry.coordinates.slice();

        new maplibregl.Popup({ className: 'custom-popup' })
            .setLngLat(coordinates)
            .setHTML(createPopupHtml(properties))
            .addTo(map);
    });

    // Endrer musepekeren til en "pointer" når den er over et objekt i laget.
    map.on('mouseenter', layerId, () => {
        map.getCanvas().style.cursor = 'pointer';
    });
    // Endrer musepekeren tilbake når den forlater objektet.
    map.on('mouseleave', layerId, () => {
        map.getCanvas().style.cursor = '';
    });
}


/**
 * Setter opp alle interaksjoner for kartlagene (ressurser og tilfluktsrom).
 * @param {maplibregl.Map} map - Kartobjektet.
 */
export function addLayerInteractions(map) {
    // Interaksjon for ressurs-laget.
    addInteraction(map, 'ressurser-lag', (props) => `
        <h3>${props.navn}</h3>
        <p><strong>Kategori:</strong> ${props.kategori}</p>
        <p>${props.beskrivelse}</p>
    `);

    // Interaksjon for tilfluktsrom-laget.
    addInteraction(map, 'tilfluktsrom-lag', (props) => `
        <h3>${props.adresse || 'Ukjent adresse'}</h3>
        <p><strong>Type:</strong> ${props.objtype}</p>
        <p><strong>Kapasitet:</strong> ${props.plasser} personer</p>
        <p><em>Romnummer: ${props.romnr}</em></p>
    `);

    map.on('click', 'saarbare-lag', (e) => {
    const properties = e.features[0].properties;
    
    new maplibregl.Popup()
        .setLngLat(e.lngLat)
        .setHTML(`
            <div style="color: #d32f2f; font-weight: bold; border-bottom: 1px solid #ccc; margin-bottom: 5px;">
                🚨 STATUS: KRITISK (I FLOMSONE)
            </div>
            <strong>Adresse:</strong> ${properties.adresse || 'Ukjent'}<br>
            <strong>Kapasitet:</strong> ${properties.plasser} plasser<br>
            <p style="font-size: 0.9em; margin-top: 5px; color: #555;">
                <em>Merk: Tilgang kan være begrenset ved 200-årsflom.</em>
            </p>
        `)
        .addTo(map);
});
}

/**
 * Setter opp logikk for å håndtere klikk direkte på kartet (ikke på et objekt),
 * som utløser en romlig spørring for å finne nærmeste ressurs.
 * @param {maplibregl.Map} map - Kartobjektet.
 */
export function addMapClickInteraction(map) {
    map.on('click', async (e) => {
        // Sjekk om vi klikket direkte på en eksisterende prikk
        const features = map.queryRenderedFeatures(e.point, {
            layers: ['tilfluktsrom-lag', 'ressurser-lag']
        });
        if (features.length > 0) return; // Avbryt, la standard popup ta seg av dette

        const klikk_lon = e.lngLat.lng;
        const klikk_lat = e.lngLat.lat;
        const radiusMeter = 1000; // Vi setter søkeradius til 1 kilometer

        // 1. Spør Supabase: "Hva finnes innenfor 1000 meter herfra?"
        const ressurser = await findResourcesWithinRadius(klikk_lon, klikk_lat, radiusMeter);

        // 2. Tegn en visuell sirkel i kartet med Turf.js
        const center = [klikk_lon, klikk_lat];
        const options = { steps: 64, units: 'meters' };
        // turf.circle lager en GeoJSON-polygon formet som en sirkel
        const circlePolygon = turf.circle(center, radiusMeter, options);

        // Sjekk om vi allerede har tegnet en sirkel før. I så fall oppdaterer vi den, ellers lager vi en ny.
        if (map.getSource('sok-radius-kilde')) {
            map.getSource('sok-radius-kilde').setData(circlePolygon);
        } else {
            map.addSource('sok-radius-kilde', {
                type: 'geojson',
                data: circlePolygon
            });
            map.addLayer({
                id: 'sok-radius-lag',
                type: 'fill',
                source: 'sok-radius-kilde',
                paint: {
                    'fill-color': '#007cbf', // Blåfarge
                    'fill-opacity': 0.2,     // Litt gjennomsiktig
                    'fill-outline-color': '#004a73'
                }
            });
        }

        // 3. Bygg innholdet i Popup-boksen
        let htmlInnhold = `
            <div style="border-left: 4px solid #007cbf; padding-left: 10px;">
                <h4>📍 Områdesøk</h4>
                <p><strong>Radius:</strong> ${radiusMeter} meter</p>
        `;

        if (ressurser && ressurser.length > 0) {
            htmlInnhold += `<p><strong>Fant ${ressurser.length} ressurser:</strong></p><ul style="padding-left: 20px; margin-top: 5px;">`;
            ressurser.forEach(r => {
                htmlInnhold += `<li>${r.navn} - <em>${Math.round(r.avstand)}m</em></li>`;
            });
            htmlInnhold += `</ul></div>`;
        } else {
            htmlInnhold += `<p>Ingen beredskapsressurser funnet i dette området.</p></div>`;
        }

        // 4. Vis Popup
        new maplibregl.Popup()
            .setLngLat([klikk_lon, klikk_lat])
            .setHTML(htmlInnhold)
            .addTo(map);
    });
} // <--- Denne lukker addMapClickInteraction

/**
 * Setter opp funksjonalitet for "Finn min posisjon"-knappen.
 * @param {maplibregl.Map} map - Kartobjektet.
 */
export function setupMyLocationButton(map) {
    const myLocationBtn = document.getElementById('my-location-btn');
    let userLocationMarker = null;

    myLocationBtn.addEventListener('click', () => {
        if (!navigator.geolocation) {
            alert("Geolokasjon støttes ikke av nettleseren din.");
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { longitude, latitude } = position.coords;
                map.flyTo({
                    center: [longitude, latitude],
                    zoom: 15,
                    speed: 1.5
                });

                if (userLocationMarker) {
                    userLocationMarker.remove();
                }

                userLocationMarker = new maplibregl.Marker({ color: '#007bff' })
                    .setLngLat([longitude, latitude])
                    .addTo(map);
            },
            (error) => {
                console.error("Feil ved henting av posisjon:", error);
                alert("Kunne ikke hente posisjonen din.");
            }
        );
    });
} 