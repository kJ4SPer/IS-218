// --- STEG 1: OPPSETT AV KARTET ---
const map = new maplibregl.Map({
    container: 'map',
    // Vi bruker standard stilen som vi vet virker
    style: 'https://demotiles.maplibre.org/style.json', 
    center: [8.005, 58.15], // Kristiansand
    zoom: 13
});

map.addControl(new maplibregl.NavigationControl(), 'top-right');

// --- STEG 2: LASTE INN DATA (Når kartet er ferdig) ---
map.on('load', () => {
    console.log("Kartet er lastet inn!");

    // A. GEOJSON (Tilfluktsrom)
    map.addSource('tilfluktsrom-data', {
        type: 'geojson',
        data: 'tilfluktsrom.geojson'
    });

    map.addLayer({
        id: 'tilfluktsrom-lag',
        type: 'circle',
        source: 'tilfluktsrom-data',
        paint: {
            'circle-color': '#ff0000',
            'circle-radius': 8,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff'
        }
    });

    // B. INTERAKSJON (Klikk på tilfluktsrom)
    map.on('click', 'tilfluktsrom-lag', (e) => {
        const feature = e.features[0];
        const coordinates = feature.geometry.coordinates.slice();
        const props = feature.properties;

        new maplibregl.Popup()
            .setLngLat(coordinates)
            .setHTML(`
                <h3>${props.navn}</h3>
                <p><strong>Type:</strong> ${props.type}</p>
                <p><strong>Kapasitet:</strong> ${props.kapasitet}</p>
            `)
            .addTo(map);
    });

    // C. MOUSE HOVER EFFEKT
    map.on('mouseenter', 'tilfluktsrom-lag', () => {
        map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', 'tilfluktsrom-lag', () => {
        map.getCanvas().style.cursor = '';
    });
});