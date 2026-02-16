// --- API-MODUL ---
// Denne modulen håndterer all kommunikasjon med eksterne og interne datakilder.

import { SUPABASE_URL, SUPABASE_KEY } from './config.js';

// Opprett en "klient" for å kommunisere med Supabase-databasen.
// Denne brukes for å sende spørringer (queries) og kalle på database-funksjoner (RPC).
export const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Henter alle beredskapsressurser fra databasen.
 * @returns {Promise<object>} Et GeoJSON FeatureCollection-objekt med ressursene.
 */
export async function getAllResources() {
    // Vi kaller en "Remote Procedure Call" (RPC) i databasen kalt 'get_all_ressurser'.
    // Dette er en egendefinert funksjon på databasesiden som henter og formaterer data for oss.
    const { data, error } = await supabaseClient.rpc('get_all_ressurser');

    if (error) {
        console.error("Feil ved henting av ressurser:", error);
        return null; // Returnerer null hvis noe gikk galt.
    }

    console.log("Ressurser hentet fra Supabase:", data);

    // Konverterer dataene fra databasen (en liste med objekter) til GeoJSON-format,
    // som er standardformatet for geografiske data på web.
    const features = data.map(ressurs => ({
        type: 'Feature',
        geometry: {
            type: 'Point',
            coordinates: [ressurs.lng, ressurs.lat]
        },
        properties: {
            navn: ressurs.navn,
            kategori: ressurs.kategori,
            beskrivelse: ressurs.beskrivelse
        }
    }));

    // Pakker "features" inn i et "FeatureCollection", som er den fullstendige GeoJSON-strukturen.
    return {
        type: 'FeatureCollection',
        features: features
    };
}

/**
 * Finner den nærmeste beredskapsressursen til et gitt punkt.
 * @param {number} lon - Lengdegraden til brukerens klikk.
 * @param {number} lat - Breddegraden til brukerens klikk.
 * @returns {Promise<object|null>} Data om den nærmeste ressursen, eller null ved feil.
 */
export async function findNearestResource(lon, lat) {
    console.log(`Starter romlig spørring for posisjon: ${lon}, ${lat}`);
    
    // Kaller RPC-funksjonen 'finn_naermeste_ressurs' i databasen.
    // Denne funksjonen tar brukerens posisjon som input og bruker PostGIS
    // til å beregne hvilken ressurs i databasen som er nærmest.
    const { data, error } = await supabaseClient.rpc('finn_naermeste_ressurs', {
        bruker_lon: lon,
        bruker_lat: lat
    });

    if (error) {
        console.error("Feil ved romlig spørring:", error);
        return null;
    }
    
    console.log("Resultat fra romlig spørring:", data);
    return data; // Returnerer resultatet (en liste, vanligvis med ett element).
}

/**
 * Henter tilfluktsrom-data fra en lokal GeoJSON-fil.
 * @returns {Promise<object>} Et GeoJSON-objekt med tilfluktsrom.
 */
export async function fetchLocalShelters() {
    try {
        const response = await fetch('./tilfluktsrom.geojson');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log("Tilfluktsrom hentet fra lokal fil:", data);
        return data;
    } catch (e) {
        console.error("Kunne ikke hente lokal GeoJSON-fil for tilfluktsrom:", e);
        return null;
    }
}