// --- UI-MODUL ---
// Denne modulen håndterer brukergrensesnitt-elementer og interaksjoner.

import { findNearestResource } from './api.js';

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
}

/**
 * Setter opp logikk for å håndtere klikk direkte på kartet (ikke på et objekt),
 * som utløser en romlig spørring for å finne nærmeste ressurs.
 * @param {maplibregl.Map} map - Kartobjektet.
 */
export function addMapClickInteraction(map) {
    map.on('click', async (e) => {
        // 1. Sjekk om klikket traff et eksisterende objekt. I så fall, avbryt,
        // fordi da skal den vanlige popupen for det objektet vises.
        const features = map.queryRenderedFeatures(e.point, {
            layers: ['tilfluktsrom-lag', 'ressurser-lag']
        });
        if (features.length > 0) {
            return;
        }

        // 2. Hent koordinatene for klikket.
        const { lng, lat } = e.lngLat;

        // 3. Utfør den romlige spørringen via API-modulen.
        const nearestData = await findNearestResource(lng, lat);

        // 4. Vis resultatet i en ny popup.
        if (nearestData && nearestData.length > 0) {
            const nearest = nearestData[0];
            const distance = Math.round(nearest.avstand_meter); // Rund av til hele meter.

            new maplibregl.Popup({ className: 'custom-popup' })
                .setLngLat([lng, lat])
                .setHTML(`
                    <div class="popup-hendelse">
                        <h4>📍 Din posisjon</h4>
                        <p><strong>Nærmeste ressurs:</strong><br> ${nearest.navn}</p>
                        <p><strong>Kategori:</strong> ${nearest.kategori}</p>
                        <p><strong>Avstand:</strong> ca. ${distance} meter</p>
                    </div>
                `)
                .addTo(map);
        }
    });
}

/**
 * Setter opp funksjonalitet for "Finn min posisjon"-knappen.
 * @param {maplibregl.Map} map - Kartobjektet.
 */
export function setupMyLocationButton(map) {
    const myLocationBtn = document.getElementById('my-location-btn');
    let userLocationMarker = null; // Holder styr på markøren for brukerens posisjon

    myLocationBtn.addEventListener('click', () => {
        if (!navigator.geolocation) {
            alert("Geolokasjon støttes ikke av nettleseren din.");
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { longitude, latitude } = position.coords;

                // Flytt kartet til brukerens posisjon
                map.flyTo({
                    center: [longitude, latitude],
                    zoom: 15,
                    speed: 1.5
                });

                // Fjern gammel markør hvis den finnes
                if (userLocationMarker) {
                    userLocationMarker.remove();
                }

                // Legg til en ny markør på brukerens posisjon
                userLocationMarker = new maplibregl.Marker({ color: '#007bff' })
                    .setLngLat([longitude, latitude])
                    .addTo(map);
            },
            (error) => {
                console.error("Feil ved henting av posisjon:", error);
                alert("Kunne ikke hente posisjonen din. Sørg for at du har gitt tillatelse.");
            }
        );
    });
}