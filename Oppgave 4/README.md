# 🛡️ Beredskap i Agder

### _Smartere beredskap gjennom interaktiv klimaanalyse_

![Banner](banner_beredskap_agder.png)

## Hvorfor, Hva og Hvordan?

### **Hvorfor? (Problemet)**

Klimaendringene øker risikoen for ekstreme flomhendelser og havnivåstigning i Kristiansand. Under en krisesituasjon er tilgang til tilfluktsrom og beredskapsressurser kritisk. Men hva skjer når selve tryggheten, tilfluktsrommene, blir rammet av flommen?

### **Hva? (Løsningen)**

Vi har utviklet en interaktiv web-portal som kombinerer sanntidsdata fra **Supabase** med avansert **geografisk analyse**. Kartet gir beredskapsledelsen full oversikt over:

- **Offentlige tilfluktsrom** og deres kapasitet.
- **Sårbarhetsanalyse:** Identifisering av rom som settes ut av spill ved en 200-årsflom.
- **Ressurskartlegging:** Nærmeste apotek, matbutikker og beredskapslagre (blir lagt inn fortløpende).

### **Hvordan? (Teknologien)**

- **Analyse:** Vi har brukt **Python og GeoPandas** for å utføre en "Spatial Join" mellom flomsoner (NVE) og tilfluktsrom (DSB).
- **Resultat:** Analysen avdekket at **150 tilfluktsplasser** går tapt i Kristiansand ved en 200-årsflom.
- **Frontend:** Visualisert med **MapLibre GL JS** for sømløs ytelse.
- **Backend:** Data håndteres via en **PostgreSQL-database (Supabase)**.

---

## 📸 Demo

![Demo av applikasjonen](demo.gif)

---

## 🛠️ Teknisk Oppsett

Prosjektet er bygget på en moderne **GeoStack** som sikrer effektiv dataflyt fra rådata til interaktiv visualisering.

- **Analyse (Python):** Vi benytter **GeoPandas** for avansert romlig analyse (_Spatial Join_). Ved å koble flomsoner fra NVE med tilfluktsrom-data fra DSB, har vi identifisert kritiske sårbarheter. All data er transformert fra **EPSG:25832** til **Web Mercator (EPSG:4326)** for optimal ytelse i nettleseren.
- **Backend & Database (Supabase):** Dynamiske beredskapsressurser håndteres via en skybasert **PostgreSQL**-database. Dette gjør løsningen skalerbar og muliggjør sanntidsoppdatering av kartet uten at kildekoden må endres.
- **Kartmotor (MapLibre GL JS):** Valgt for sin evne til å bruke maskinvareakselerert rendering (WebGL). Dette sikrer at tunge datasett, som 200-årsflomsoner, vises sømløst med høy bildefrekvens.
- **Arkitektur:** Applikasjonen følger **modulære prinsipper (ES6)**. Logikken er separert i dedikerte moduler (`api.js`, `layers.js`, `ui.js`) for å skille datakall, kartografi og brukergrensesnitt.

---

## 👥 Gruppen bak prosjektet: De Digitale Disiplene

_Laget i forbindelse med faget IS-218 ved Universitetet i Agder._
