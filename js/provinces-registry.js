/* =========================================================================
   provinces-registry.js
   ---------------------------------------------------------------------
   Elenco CANONICO delle 107 province italiane: nome, sigla (targa) e
   regione. Serve da "lingua comune" fra:
     - i nomi provincia usati in sede-provincia-mapping.js
     - il campo "prov_acr" (sigla) del GeoJSON delle province in map.js

   PERCHÉ SI USA LA SIGLA E NON IL NOME PER L'ABBINAMENTO GEOGRAFICO
   I nomi ufficiali ISTAT delle province contengono accenti, apostrofi e
   varianti ("Reggio nell'Emilia", "Bolzano/Bozen", "Valle d'Aosta/Vallée
   d'Aoste"...) che rendono il confronto testuale fragile e soggetto a
   falsi negativi. La sigla automobilistica è invece univoca e stabile,
   quindi è la chiave scelta per il join provincia ↔ geometria. Il nome
   resta comunque disponibile per la visualizzazione in interfaccia.
   ========================================================================= */

const PROVINCES_REGISTRY = [
  ["Torino","TO","Piemonte"],["Vercelli","VC","Piemonte"],["Novara","NO","Piemonte"],
  ["Cuneo","CN","Piemonte"],["Asti","AT","Piemonte"],["Alessandria","AL","Piemonte"],
  ["Biella","BI","Piemonte"],["Verbano-Cusio-Ossola","VB","Piemonte"],
  ["Aosta","AO","Valle d'Aosta"],
  ["Milano","MI","Lombardia"],["Bergamo","BG","Lombardia"],["Brescia","BS","Lombardia"],
  ["Como","CO","Lombardia"],["Cremona","CR","Lombardia"],["Mantova","MN","Lombardia"],
  ["Pavia","PV","Lombardia"],["Sondrio","SO","Lombardia"],["Varese","VA","Lombardia"],
  ["Lecco","LC","Lombardia"],["Lodi","LO","Lombardia"],["Monza e della Brianza","MB","Lombardia"],
  ["Trento","TN","Trentino-Alto Adige"],["Bolzano","BZ","Trentino-Alto Adige"],
  ["Verona","VR","Veneto"],["Vicenza","VI","Veneto"],["Belluno","BL","Veneto"],
  ["Treviso","TV","Veneto"],["Venezia","VE","Veneto"],["Padova","PD","Veneto"],["Rovigo","RO","Veneto"],
  ["Udine","UD","Friuli-Venezia Giulia"],["Gorizia","GO","Friuli-Venezia Giulia"],
  ["Trieste","TS","Friuli-Venezia Giulia"],["Pordenone","PN","Friuli-Venezia Giulia"],
  ["Genova","GE","Liguria"],["Imperia","IM","Liguria"],["La Spezia","SP","Liguria"],["Savona","SV","Liguria"],
  ["Piacenza","PC","Emilia-Romagna"],["Parma","PR","Emilia-Romagna"],["Reggio nell'Emilia","RE","Emilia-Romagna"],
  ["Modena","MO","Emilia-Romagna"],["Bologna","BO","Emilia-Romagna"],["Ferrara","FE","Emilia-Romagna"],
  ["Ravenna","RA","Emilia-Romagna"],["Forlì-Cesena","FC","Emilia-Romagna"],["Rimini","RN","Emilia-Romagna"],
  ["Massa-Carrara","MS","Toscana"],["Lucca","LU","Toscana"],["Pistoia","PT","Toscana"],
  ["Firenze","FI","Toscana"],["Livorno","LI","Toscana"],["Pisa","PI","Toscana"],
  ["Arezzo","AR","Toscana"],["Siena","SI","Toscana"],["Grosseto","GR","Toscana"],["Prato","PO","Toscana"],
  ["Perugia","PG","Umbria"],["Terni","TR","Umbria"],
  ["Pesaro e Urbino","PU","Marche"],["Ancona","AN","Marche"],["Macerata","MC","Marche"],
  ["Ascoli Piceno","AP","Marche"],["Fermo","FM","Marche"],
  ["Viterbo","VT","Lazio"],["Rieti","RI","Lazio"],["Roma","RM","Lazio"],["Latina","LT","Lazio"],["Frosinone","FR","Lazio"],
  ["L'Aquila","AQ","Abruzzo"],["Teramo","TE","Abruzzo"],["Pescara","PE","Abruzzo"],["Chieti","CH","Abruzzo"],
  ["Campobasso","CB","Molise"],["Isernia","IS","Molise"],
  ["Caserta","CE","Campania"],["Benevento","BN","Campania"],["Napoli","NA","Campania"],
  ["Avellino","AV","Campania"],["Salerno","SA","Campania"],
  ["Foggia","FG","Puglia"],["Bari","BA","Puglia"],["Taranto","TA","Puglia"],
  ["Brindisi","BR","Puglia"],["Lecce","LE","Puglia"],["Barletta-Andria-Trani","BT","Puglia"],
  ["Potenza","PZ","Basilicata"],["Matera","MT","Basilicata"],
  ["Cosenza","CS","Calabria"],["Catanzaro","CZ","Calabria"],["Reggio di Calabria","RC","Calabria"],
  ["Crotone","KR","Calabria"],["Vibo Valentia","VV","Calabria"],
  ["Trapani","TP","Sicilia"],["Palermo","PA","Sicilia"],["Messina","ME","Sicilia"],
  ["Agrigento","AG","Sicilia"],["Caltanissetta","CL","Sicilia"],["Enna","EN","Sicilia"],
  ["Catania","CT","Sicilia"],["Ragusa","RG","Sicilia"],["Siracusa","SR","Sicilia"],
  ["Sassari","SS","Sardegna"],["Nuoro","NU","Sardegna"],["Cagliari","CA","Sardegna"],
  ["Oristano","OR","Sardegna"],["Sud Sardegna","SU","Sardegna"]
].map(([name, sigla, regione]) => ({ name, sigla, regione }));

const PROVINCE_BY_SIGLA = {};
const PROVINCE_BY_NAME = {};
PROVINCES_REGISTRY.forEach(p => {
  PROVINCE_BY_SIGLA[p.sigla] = p;
  PROVINCE_BY_NAME[p.name] = p;
});

if (typeof window !== "undefined") {
  window.PROVINCES_REGISTRY = PROVINCES_REGISTRY;
  window.PROVINCE_BY_SIGLA = PROVINCE_BY_SIGLA;
  window.PROVINCE_BY_NAME = PROVINCE_BY_NAME;
}
