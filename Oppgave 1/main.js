// --- KONFIGURASJON ---
// 1. URL til Supabase-prosjektet
const SUPABASE_URL = 'https://chivwckzhhugbzmpmstu.supabase.co';

// 2. API-nøkkel (Anon/Public key)
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoaXZ3Y2t6aGh1Z2J6bXBtc3R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MjA0ODYsImV4cCI6MjA4NjM5NjQ4Nn0.mbCIwUL6tzEN_JEus9vfAjStauOC5NbSd1OqM7TRy-U';

// Opprett kobling til Supabase
const supabaseClient = maplibregl.supaClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);


// --- KART-OPPSETT ---
const kristiansand = [7.994, 58.146];

const map = new maplibregl.Map({
    container: 'map',
    style: 'https://tiles.stadiamaps.com/styles/alidade_smooth.json',
    center: kristiansand,
    zoom: 12
});
map.addControl(new maplibregl.NavigationControl(), 'top-right');    

// --- NÅR KARTET ER LASTET ---
map.on('load', async () => {
    console.log("Kartet er lastet, nå henter vi data...");

    // ============================================================
    // DEL 1: HENT DATA FRA SUPABASE (GRØNNE SIRKLER)
    // ============================================================

    // 1. Hent data via RPC-funksjon fra databasen
    const { data, error } = await supabaseClient.rpc('get_all_ressurser');

    if (error) {
        console.error("Feil ved henting av data:", error);
        return;
    }

    console.log("Vi fant disse ressursene:", data);

    // 2. Konverter dataene til GeoJSON-format
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

    const geoJsonData = {
        type: 'FeatureCollection',
        features: features
    };

    // 3. Legg til kilde og lag på kartet
    map.addSource('supabase-ressurser', {
        type: 'geojson',
        data: geoJsonData
    });

    map.addLayer({
        id: 'ressurser-lag',
        type: 'circle',
        source: 'supabase-ressurser',
        paint: {
            'circle-color': '#00ff00', // Grønn
            'circle-radius': 10,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#000000'
        }
    });

    // 4. Interaksjon (Popup og Hover)
    map.on('click', 'ressurser-lag', (e) => {
        const props = e.features[0].properties;
        const coords = e.features[0].geometry.coordinates.slice();

        new maplibregl.Popup()
            .setLngLat(coords)
            .setHTML(`
                <h3>${props.navn}</h3>
                <p><strong>Kategori:</strong> ${props.kategori}</p>
                <p>${props.beskrivelse}</p>
            `)
            .addTo(map);
    });
    
    map.on('mouseenter', 'ressurser-lag', () => map.getCanvas().style.cursor = 'pointer');
    map.on('mouseleave', 'ressurser-lag', () => map.getCanvas().style.cursor = '');


    // ============================================================
    // DEL 2: HENT LOKALE DATA (RØDE SIRKLER - TILFLUKTSROM)
    // ============================================================

    // 1. Hent lokal fil
    const response = await fetch('./tilfluktsrom.geojson');
    const tilfluktsromData = await response.json();
    console.log("Vi fant disse tilfluktsrommene:", tilfluktsromData);

    // 2. Legg til kilde og lag
    map.addSource('tilfluktsrom-kilde', {
        type: 'geojson',
        data: tilfluktsromData
    });

    map.addLayer({
        id: 'tilfluktsrom-lag',
        type: 'circle',
        source: 'tilfluktsrom-kilde',
        paint: {
            'circle-color': '#ff0000', // Rød
            'circle-radius': 8,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff'
        }
    });

    // 3. Interaksjon (Popup og Hover)
    map.on('click', 'tilfluktsrom-lag', (e) => {
        const props = e.features[0].properties;
        const coords = e.features[0].geometry.coordinates.slice();

        new maplibregl.Popup()
            .setLngLat(coords)
            .setHTML(`
                <h3>${props.navn}</h3>
                <p><strong>Type:</strong> ${props.type}</p>
                <p><strong>Kapasitet:</strong> ${props.kapasitet} personer</p>
            `)
            .addTo(map);
    });
    
    map.on('mouseenter', 'tilfluktsrom-lag', () => map.getCanvas().style.cursor = 'pointer');
    map.on('mouseleave', 'tilfluktsrom-lag', () => map.getCanvas().style.cursor = '');

    // ============================================================
    // DEL 3: KONTROLLPANEL (VIS/SKJUL LAG)
    // ============================================================

    // Knapp for Tilfluktsrom
    document.getElementById('toggle-tilfluktsrom').addEventListener('change', (e) => {
        const visibility = e.target.checked ? 'visible' : 'none';
        map.setLayoutProperty('tilfluktsrom-lag', 'visibility', visibility);
    });

    // Knapp for Ressurser
    document.getElementById('toggle-ressurser').addEventListener('change', (e) => {
        const visibility = e.target.checked ? 'visible' : 'none';
        map.setLayoutProperty('ressurser-lag', 'visibility', visibility);
    });
});