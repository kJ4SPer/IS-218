// --- HOVEDFIL (main.js) ---
// Denne filen er applikasjonens startpunkt. Den importerer funksjonalitet
// fra de ulike modulene og sørger for at alt blir initialisert i riktig rekkefølge.

import { initializeMap } from './map.js';
import { addWmsLayer, addResourcesLayer, addSheltersLayer, addFloodLayers } from './layers.js';
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

    // 3. Legg til de ulike kartlagene i riktig rekkefølge
    
    // Først legger vi til bakgrunnskartet
    addWmsLayer(map);

    // Så venter vi på at hoveddataene (punktene) skal lastes ferdig
    await Promise.all([
        addSheltersLayer(map), // Dette oppretter 'tilfluktsrom-lag'
        addResourcesLayer(map) // Dette oppretter 'ressurser-lag'
    ]);
    
    // NÅ som 'tilfluktsrom-lag' eksisterer, kan vi trygt legge til flomvannet under det!
    addFloodLayers(map);
    
    

    // 4. Sett opp UI-elementer og interaksjoner
    setupLayerToggles(map);         // Koble av/på-knappene til kartlagene
    addLayerInteractions(map);      // Aktiver popups og hover-effekter for lagene
    addMapClickInteraction(map);    // Aktiver "finn nærmeste"-funksjonen ved klikk på kartet
    setupMyLocationButton(map);     // Aktiver "Finn min posisjon"-knappen

    // 5. Skjul laste-indikatoren
    hideLoader();
    console.log("Applikasjonen er klar!");
});