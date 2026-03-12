# Oppgave 2: GIScience og Romlig Analyse 🌍

## Notebook-guide (Del A)

For den analytiske delen av oppgaven (Romlig analyse i Python), se den vedlagte Jupyter Notebook-filen:
👉 **[oppgave2.ipynb](./oppgave2.ipynb)**

---

## Utvidelse av Webkart (Del B)

### Beskrivelse av utvidelsen

Beredskapskartet fra Oppgave 1 er nå utvidet med en interaktiv områdesøk-funksjon (Spatial SQL). Når brukeren klikker et sted i kartet, vil applikasjonen:

1. Sende koordinatene for klikket til databasen (Supabase).
2. Gjennomføre et romlig søk som finner alle beredskapsressurser innenfor en radius på 1000 meter.
3. Tegne en visuell, blå sirkel (buffer) på kartet ved hjelp av `Turf.js`.
4. Vise en dynamisk popup som lister opp de funnede ressursene og deres nøyaktige avstand i meter fra klikkpunktet.

### Demo av systemet

[Klikk her for å se en demonstrasjon av systemet (YouTube)](https://youtu.be/d7U8nEflTzY)

### SQL-snippet (PostGIS)

For å utføre det romlige søket, ble følgende RPC-funksjon opprettet i Supabase. Funksjonen tar i bruk `ST_DWithin` for å filtrere ut ressurser som befinner seg innenfor sirkelen, og `ST_Distance` for å nøyaktig beregne avstanden til hver ressurs.

```sql
CREATE OR REPLACE FUNCTION finn_ressurser_innen_radius(bruker_lon FLOAT, bruker_lat FLOAT, radius_meter FLOAT)
RETURNS TABLE (
    id INT,
    navn TEXT,
    kategori TEXT,
    avstand FLOAT,
    lat FLOAT,
    lon FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        r.id,
        r.navn,
        r.kategori,
        -- ST_Distance beregner avstanden i meter
        ST_Distance(
            r.location,
            ST_SetSRID(ST_Point(bruker_lon, bruker_lat), 4326)::geography
        ) AS avstand,
        ST_Y(r.location::geometry) AS lat,
        ST_X(r.location::geometry) AS lon
    FROM ressurser r
    -- ST_DWithin sjekker om ressursen er innenfor oppgitt radius
    WHERE ST_DWithin(
        r.location,
        ST_SetSRID(ST_Point(bruker_lon, bruker_lat), 4326)::geography,
        radius_meter
    )
    ORDER BY avstand ASC;
END;
$$;
```
