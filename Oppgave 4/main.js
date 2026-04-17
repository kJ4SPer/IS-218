// --- HOVEDFIL (main.js) ---
// Denne filen er applikasjonens startpunkt. Den importerer funksjonalitet
// fra de ulike modulene og sørger for at alt blir initialisert i riktig rekkefølge.

import { initializeMap } from './map.js';
import { addWmsLayer, addResourcesLayer, addSheltersLayer } from './layers.js';
import { setupLayerToggles, addLayerInteractions, addMapClickInteraction, setupMyLocationButton } from './ui.js';

// Hent referanse til laste-elementet
const loader = document.getElementById('loader');

// Funksjon for å skjule laste-indikatoren
const hideLoader = () => {
    loader.style.display = 'none';
};

// 1. Initialiser kartet
const map = initializeMap();

// 2. Når kartet er fullstendig lastet, kan vi begynne å legge til data og funksjonalitet.
map.on('load', async () => {
    console.log("Kartet er lastet. Starter å legge til lag og funksjonalitet...");

    // 3. Legg til de ulike kartlagene
    // Bruker Promise.all for å vente på at alle lag som henter data er ferdige.
    await Promise.all([
        addSheltersLayer(map),  // Tilfluktsrom (røde sirkler)
        addResourcesLayer(map) // Beredskapsressurser (grønne sirkler)
    ]);
    
    addWmsLayer(map); // Geonorge bakgrunnskart (legges under de andre)

    // 4. Sett opp UI-elementer og interaksjoner
    setupLayerToggles(map);         // Koble av/på-knappene til kartlagene
    addLayerInteractions(map);      // Aktiver popups og hover-effekter for lagene
    addMapClickInteraction(map);    // Aktiver "finn nærmeste"-funksjonen ved klikk på kartet
    setupMyLocationButton(map);     // Aktiver "Finn min posisjon"-knappen

    // 5. Skjul laste-indikatoren
    hideLoader();
    console.log("Applikasjonen er klar!");
});