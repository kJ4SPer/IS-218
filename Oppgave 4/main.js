import { initializeMap } from './map.js';
import { addResourcesLayer, addSheltersLayer, addFloodLayers } from './layers.js';
import { setupLayerToggles, addLayerInteractions, addMapClickInteraction, setupMyLocationButton } from './ui.js';

const loader = document.getElementById('loader');

const hideLoader = () => {
    if (loader) {
        loader.classList.remove('d-flex');
        loader.classList.add('d-none');
    }
};

const map = initializeMap();

map.on('load', async () => {
    try {
        await Promise.all([
            addSheltersLayer(map),
            addResourcesLayer(map)
        ]);
        
        addFloodLayers(map);

        setupLayerToggles(map);
        addLayerInteractions(map);
        addMapClickInteraction(map);
        setupMyLocationButton(map);

        // --- ANIMERT RADARPULS FOR SÅRBARE OBJEKTER ---
        let radius = 15;
        let opacity = 0.8;
        
        function animateVulnerablePulse() {
            setTimeout(() => {
                requestAnimationFrame(animateVulnerablePulse);
                
                radius += 0.4;
                opacity -= 0.015;

                if (opacity <= 0) {
                    radius = 15;
                    opacity = 0.8;
                }

                if (map.getLayer('saarbare-glod')) {
                    map.setPaintProperty('saarbare-glod', 'circle-radius', radius);
                    map.setPaintProperty('saarbare-glod', 'circle-opacity', Math.max(0, opacity));
                }
            }, 1000 / 30); // 30 FPS
        }
        animateVulnerablePulse();

    } catch (error) {
        console.error("SYS.ERR:", error);
    } finally {
        hideLoader();
    }
});