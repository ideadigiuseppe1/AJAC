/* =========================================================================
   sede-provincia-mapping.js
   ---------------------------------------------------------------------
   Tabella di corrispondenza SEDE (colonna "Sede" del dataset graduatorie)
   → PROVINCIA (unità geografica mostrata sulla mappa).
   ---------------------------------------------------------------------
   PERCHÉ QUESTO FILE ESISTE SEPARATO
   Il dataset è organizzato per ANNO + SEDE. La mappa è organizzata per
   PROVINCIA. Una provincia può contenere una o più sedi (es. diverse sedi
   di reparto nella stessa provincia), quindi la relazione NON è 1:1 e non
   può essere dedotta automaticamente con certezza in ogni caso.

   REGOLA SEGUITA
   Ogni voce "Sede" del dataset è stata mappata a una provincia SOLO
   quando l'appartenenza geografica è nota con certezza (es. "Ischia" →
   provincia di Napoli, "Cortina d'Ampezzo" → provincia di Belluno).
   Le sedi che identificano comandi/reparti centrali non riconducibili a
   un territorio (es. sigle di comandi) sono mappate a `null` e restano
   ESCLUSE dall'aggregazione provinciale, elencate in UNMAPPED_SEDI così
   da poter essere corrette manualmente in seguito, senza inventare
   un'associazione.

   COME CORREGGERE / COMPLETARE
   Modifica solo questo file. Le chiavi sono i valori esatti della
   colonna "Sede" nel dataset (case-sensitive). Il valore è il nome
   CANONICO della provincia, come definito in js/provinces-registry.js.
   ========================================================================= */

const SEDE_TO_PROVINCIA = {
  "Agrigento": "Agrigento",
  "Alessandria": "Alessandria",
  "Ancona": "Ancona",
  "Arezzo": "Arezzo",
  "Ascoli Piceno": "Ascoli Piceno",
  "Asti": "Asti",
  "Avellino": "Avellino",
  "BAT": "Barletta-Andria-Trani",
  "Bari": "Bari",
  "Belluno": "Belluno",
  "Benevento": "Benevento",
  "Bergamo": "Bergamo",
  "Biella": "Biella",
  "Bologna": "Bologna",
  "Bolzano": "Bolzano",
  "Bormio": "Sondrio",                 // Bormio è comune della provincia di Sondrio
  "Brescia": "Brescia",
  "Brindisi": "Brindisi",
  "Cagliari": "Cagliari",
  "Caltanissetta": "Caltanissetta",
  "Campobasso": "Campobasso",
  "Capri": "Napoli",                   // isola di Capri, provincia di Napoli
  "Caserta": "Caserta",
  "Castelporziano": "Roma",            // tenuta di Castelporziano, comune di Roma
  "Catania": "Catania",
  "Catanzaro": "Catanzaro",
  "Chieti": "Chieti",
  "Cirò Marina": "Crotone",            // Cirò Marina, provincia di Crotone
  "Como": "Como",
  "Corleone": "Palermo",               // Corleone, provincia di Palermo
  "Cortina d'Ampezzo": "Belluno",      // Cortina d'Ampezzo, provincia di Belluno
  "Cosenza": "Cosenza",
  "Cremona": "Cremona",
  "Crotone": "Crotone",
  "Cuneo": "Cuneo",
  "Elba": "Livorno",                   // Isola d'Elba, provincia di Livorno
  "Enna": "Enna",
  "Fermo": "Fermo",
  "Ferrara": "Ferrara",
  "Firenze": "Firenze",
  "Foggia": "Foggia",
  "Forlì Cesena": "Forlì-Cesena",
  "Frosinone": "Frosinone",
  "Genova": "Genova",
  "Gorizia": "Gorizia",
  "Grosseto": "Grosseto",
  "Imperia": "Imperia",
  "Ischia": "Napoli",                  // Isola d'Ischia, provincia di Napoli
  "Isernia": "Isernia",
  "L'Aquila": "L'Aquila",
  "La Spezia": "La Spezia",
  "Lampedusa": "Agrigento",            // Lampedusa, provincia di Agrigento
  "Latina": "Latina",
  "Lauria": "Potenza",                 // Lauria, provincia di Potenza
  "Lecce": "Lecce",
  "Lecco": "Lecco",
  "Livorno": "Livorno",
  "Lodi": "Lodi",
  "Lucca": "Lucca",
  "Macerata": "Macerata",
  "Mantova": "Mantova",
  "Massa Carrara": "Massa-Carrara",
  "Matera": "Matera",
  "Messina": "Messina",
  "Milano": "Milano",
  "Modena": "Modena",
  "Monza-Brianza": "Monza e della Brianza",
  "Napoli": "Napoli",
  "Novara": "Novara",
  "Nuoro": "Nuoro",
  "Oristano": "Oristano",
  "Orvieto": "Terni",                  // Orvieto, provincia di Terni
  "Padova": "Padova",
  "Palermo": "Palermo",
  "Pantelleria": "Trapani",            // Pantelleria, provincia di Trapani
  "Parma": "Parma",
  "Pavia": "Pavia",
  "Perugia": "Perugia",
  "Pesaro Urbino": "Pesaro e Urbino",
  "Pescara": "Pescara",
  "Piacenza": "Piacenza",
  "Pisa": "Pisa",
  "Pistoia": "Pistoia",
  "Ponza": "Latina",                   // Ponza, provincia di Latina
  "Pordenone": "Pordenone",
  "Potenza": "Potenza",
  "Pratica di mare": "Roma",           // Pratica di Mare (Pomezia), provincia di Roma
  "Prato": "Prato",
  "Predazzo": "Trento",                // Predazzo, provincia di Trento
  "Ragusa": "Ragusa",
  "Ravenna": "Ravenna",
  "Reggio Calabria": "Reggio di Calabria",
  "Reggio Emilia": "Reggio nell'Emilia",
  "Rieti": "Rieti",
  "Rimini": "Rimini",
  "Roma": "Roma",
  "Rovigo": "Rovigo",
  "Salerno": "Salerno",
  "San Ferdinando": "Reggio di Calabria", // San Ferdinando, provincia di Reggio Calabria
  "San Giovanni in Fiore": "Cosenza",     // San Giovanni in Fiore, provincia di Cosenza
  "Sassari": "Sassari",
  "Savona": "Savona",
  "Siena": "Siena",
  "Siracusa": "Siracusa",
  "Sondrio": "Sondrio",
  "Taranto": "Taranto",
  "Tarvisio": "Udine",                 // Tarvisio, provincia di Udine
  "Teramo": "Teramo",
  "Terni": "Terni",
  "Torino": "Torino",
  "Trapani": "Trapani",
  "Trento": "Trento",
  "Treviso": "Treviso",
  "Udine": "Udine",
  "Varese": "Varese",
  "Venezia": "Venezia",
  "Ventotene": "Latina",               // Ventotene, provincia di Latina
  "Verbania": "Verbano-Cusio-Ossola",
  "Vercelli": "Vercelli",
  "Verona": "Verona",
  "Vibo Valentia": "Vibo Valentia",
  "Vicenza": "Vicenza",
  "Vieste": "Foggia",                  // Vieste, provincia di Foggia
  "Viggiano": "Potenza",               // Viggiano, provincia di Potenza
  "Viterbo": "Viterbo"
};

/* Sedi presenti nel dataset che NON sono state associate a una provincia
   perché identificano comandi/reparti centrali o sigle non riconducibili
   con certezza a un singolo territorio. Restano escluse dalla mappa e
   dall'aggregazione provinciale finché non verranno chiarite manualmente. */
const UNMAPPED_SEDI = ["CIAN", "CTEF", "Comando Unità Speciali", "SCICO"];

if (typeof window !== "undefined") {
  window.SEDE_TO_PROVINCIA = SEDE_TO_PROVINCIA;
  window.UNMAPPED_SEDI = UNMAPPED_SEDI;
}
