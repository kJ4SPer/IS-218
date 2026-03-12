// --- KART-MODUL ---
// Denne modulen er ansvarlig for å opprette og initialisere kartobjektet.

/**
 * Initialiserer og returnerer et MapLibre-kartobjekt.
 * @returns {maplibregl.Map} En instans av MapLibre-kartet.
 */
export function initializeMap() {
    // Oppretter en ny kart-instans.
    const map = new maplibregl.Map({
        container: 'map', // ID-en til HTML-elementet der kartet skal vises.
        style: 'https://demotiles.maplibre.org/style.json', // En enkel standardstil. Vi legger vårt eget bakgrunnskart over dette.
        center: [8.005, 58.15], // Start-senter: Kristiansand.
        zoom: 12 // Start-zoomnivå.
    });

    // Legger til standard zoom- og rotasjonskontroller i øvre høyre hjørne.
    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    
    return map;
}