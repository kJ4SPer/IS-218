# Prosjektskisse: Klimarisiko og Beredskap i Kristiansand 🌊🚨

### 1. Problemstilling (Tema: Totalforsvaret)

_Hvilke offentlige tilfluktsrom og kritiske beredskapsressurser i Kristiansand er mest sårbare for ekstremvær og stormflod, og hvordan påvirker dette beredskapskapasiteten?_

### 2. Kort prosjektbeskrivelse

Prosjektet bygger videre på "Beredskapskartet" utviklet i tidligere oppgaver. Målet med hovedprosjektet er å kartlegge hvordan klimaendringer, spesifikt flom og stormflod, kan true kritisk infrastruktur i en krisesituasjon. Ved å kombinere data over tilfluktsrom med modellerte flomsoner, skal vi identifisere hvilke ressurser som risikerer å bli utilgjengelige. Applikasjonen vil visualisere disse risikosonene og la brukeren interaktivt utforske sårbarheten i sitt nærområde, samt se nøyaktig hvor mange tilfluktsplasser som går tapt i ulike flomscenarioer.

### 3. Aktuelle datasett og datakilder

For å gjennomføre analysen og visualiseringen, vil vi benytte følgende geografiske datasett:

1. **Offentlige tilfluktsrom (Vektor - Punkt):** Hentes fra DSB/Geonorge. Viser plassering og kapasitet.
2. **Beredskapsressurser (Vektor - Punkt):** Egendefinert datasett lagret i Supabase (PostGIS).
3. **Flomsone / Stormflod (Vektor - Polygon):** Hentes fra NVE (Norges vassdrags- og energidirektorat) eller Kartverket. Viser områder utsatt for f.eks. 200-års stormflod.
4. **Bearbeidet datasett - "Sårbare ressurser" (Skapt via analyse):** Et nytt datasett generert ved hjelp av en romlig overlay-analyse (Intersection). Datasettet vil kun inneholde de tilfluktsrommene og ressursene som geografisk overlapper med flomsonene.

### 4. Skisse til teknologi og verktøy

- **Dataprosessering og Vektoranalyse:** Vi vil bruke **Python (GeoPandas)** eller **QGIS** for å vaske data og utføre den innledende romlige analysen (Spatial Join / Overlay) for å finne snittet mellom flomsoner og tilfluktsrom.
- **Database & Backend:** **Supabase med PostGIS**. Her vil vi lagre det prosesserte datasettet og sette opp romlige SQL-funksjoner (f.eks. dynamisk beregning av tapte tilfluktsplasser).
- **Frontend (Geografisk webteknologi):** **MapLibre GL JS** i kombinasjon med Vanilla JavaScript (modulær struktur). Vi vil eventuelt bruke **Turf.js** for enkle vektoranalyser i nettleseren (f.eks. avstand til nærmeste trygge tilfluktsrom).
- **Kartografiske visualiseringsmetoder:** \* _Datadrevet styling:_ Tilfluktsrommene vil få ulik farge basert på risikostatus (f.eks. grønn for trygg, rød for oversvømt).
  - _Temakart:_ Polygonene for flomsoner vil visualiseres med semi-transparent styling for å skape et tydelig overlay uten å skjule bakgrunnskartet (Geonorge WMS gråtone).

### 5. Forventet resultat

Sluttproduktet er en interaktiv Web-GIS-applikasjon der brukeren kan:

1. Skru av og på "Flomsone"-kartlaget for å visualisere faren.
2. Se fargekodingen på tilfluktsrommene endre seg dynamisk (fra trygg til sårbar) når flomlaget aktiveres.
3. Klikke på sårbare tilfluktsrom for å få opp en popup som forklarer hvorfor den er i faresonen.
4. Se statistikk (i et sidepanel) som automatisk regner ut totalt antall tilfluktsplasser som "slås ut" av flommen i det synlige kartutsnittet.
