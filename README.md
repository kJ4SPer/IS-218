# Beredskapskart for Kristiansand 🚨

### TL;DR

Dette er en interaktiv kartløsning utviklet for å gi innbyggere i Kristiansand oversikt over kritisk infrastruktur som tilfluktsrom og beredskapsressurser. Applikasjonen lar brukere filtrere kartlag, finne sin egen posisjon, og utføre romlige søk for å lokalisere nærmeste nødressurs ved en hendelse.

### Demo av systemet

![Demo av løsningen](demo.gif)
_(Last opp en GIF eller bilde i repoet ditt og bytt ut "demo.gif" med filnavnet, eller legg inn en lenke til YouTube/Vimeo her)_

### Teknisk Stack

Prosjektet er bygget som en modulær frontend-applikasjon uten byggsteg (Vanilla JS + ES Modules).

- **Kartbibliotek:** MapLibre GL JS (v4.7.1)
- **Database & Backend:** Supabase (PostgreSQL med PostGIS-utvidelse)
- **Klient:** Supabase JS Client (v2)
- **GIS-verktøy:** QGIS 3.40 (for dataprosessering)
- **Språk:** JavaScript (ES6 Modules), CSS3, HTML5

### Datakatalog

| Datasett                    | Kilde                   | Format              | Bearbeiding                                                                                                                                                                       |
| :-------------------------- | :---------------------- | :------------------ | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Offentlige tilfluktsrom** | DSB / Geonorge          | GeoJSON             | Lastet ned rådata for hele Norge. Filtrert ut Kristiansand kommune i QGIS. Transformert koordinatsystem fra UTM33 til WGS84 (EPSG:4326) og eksportert som `tilfluktsrom.geojson`. |
| **Beredskapsressurser**     | Egendefinert (Supabase) | PostGIS (Geography) | Lagret i skybasert SQL-database. Hentes dynamisk via RPC-kall (`get_all_ressurser`). Inneholder punkter som hjertestartere og samlingsplasser.                                    |
| **Bakgrunnskart**           | Kartverket / Geonorge   | WMS (Raster)        | Hentes direkte fra Geonorge sin WMS-tjeneste ("Topografisk norgeskart gråtone") for å gi nøytral bakgrunn med god kontrast.                                                       |

### Arkitekturskisse

Slik flyter dataene gjennom applikasjonen:

```mermaid
graph TD
    User[Bruker / Nettleser]

    subgraph "Eksterne Kilder"
        WMS[Geonorge WMS]
    end

    subgraph "Backend & Data"
        Supabase[(Supabase PostGIS)]
        LocalFile[Lokal GeoJSON fil]
    end

    User -- 1. Henter bakgrunnskart (Tiles) --> WMS
    User -- 2. Henter statiske tilfluktsrom --> LocalFile
    User -- 3. Henter dynamiske ressurser (RPC) --> Supabase
    User -- 4. Sender koordinater (Klikk) --> Supabase
    Supabase -- 5. Returnerer nærmeste ressurs (Spatial Query) --> User
```
