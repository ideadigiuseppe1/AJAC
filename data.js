/* =========================================================================
   data.js
   ---------------------------------------------------------------------
   Caricamento e normalizzazione del dataset delle graduatorie.
   Periodo storico valido: anni dal 2023 in poi (2022 escluso).
   L'aggiornamento con nuovi anni futuri (es. 2027, 2028...) avviene
   automaticamente sostituendo o aggiornando il file CSV.
   ========================================================================= */

const DATASET_CANDIDATE_URLS = [
  "data/graduatorie-test.csv",
  "graduatorie-test.csv"
];

const GraduatorieDB = {
  raw: [],              // righe originali degli anni >= 2023
  byProvincia: {},       // { "Napoli": [righe con provincia risolta, ...] }
  bySede: {},            // { "Napoli": [righe ordinate per anno, ...] }
  allSedi: [],           // Elenco ordinato di tutte le sedi uniche
  unmatched: [],         // righe la cui "sede" non è mappata a nessuna provincia
  years: [],             // anni presenti nel dataset (dal 2023 in poi)
  loaded: false,
  loadError: null,

  yearRange() {
    if (!this.years.length) return null;
    return { min: this.years[0], max: this.years[this.years.length - 1] };
  },

  recordsForProvincia(provinciaName) {
    return this.byProvincia[provinciaName] || [];
  },

  sediInProvincia(provinciaName) {
    const set = new Set(this.recordsForProvincia(provinciaName).map(r => r.sede));
    return Array.from(set).sort();
  },

  recordsForSede(sedeName) {
    return this.bySede[sedeName] || [];
  },

  hasDataForProvincia(provinciaName) {
    return this.recordsForProvincia(provinciaName).length > 0;
  }
};

async function loadGraduatorieDB() {
  let csvText = null;
  let lastErr = null;

  for (const url of DATASET_CANDIDATE_URLS) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        csvText = await res.text();
        break;
      } else {
        lastErr = new Error(`HTTP ${res.status} per ${url}`);
      }
    } catch (err) {
      lastErr = err;
    }
  }

  if (!csvText) {
    const isFileProto = window.location.protocol === "file:";
    let detail = `Impossibile caricare il dataset (${DATASET_CANDIDATE_URLS[0]}). `;
    if (isFileProto) {
      detail += "Il browser blocca l'accesso alle risorse locali per policy CORS quando la pagina è aperta con il protocollo file://. ";
      detail += "Per visualizzare l'applicazione, avvia un server locale via terminale con: 'python -m http.server 8000' e apri http://localhost:8000 nel browser.";
    } else {
      detail += `Dettagli errore: ${lastErr ? lastErr.message : "Risorsa non trovata"}. Verifica che la cartella 'data/' contenga il file graduatorie-test.csv.`;
    }
    GraduatorieDB.loadError = detail;
    throw new Error(detail);
  }

  const parsed = Papa.parse(csvText, { header: true, dynamicTyping: true, skipEmptyLines: true });
  if (parsed.errors && parsed.errors.length) {
    console.warn("[GraduatorieDB] Avvisi durante il parsing del CSV:", parsed.errors);
  }

  // Regola 1: Utilizzare gli anni dal 2023 in poi. L'anno 2022 e precedenti sono esclusi per disomogeneità.
  // Qualsiasi nuovo anno aggiunto al CSV (es. 2027, 2028...) viene acquisito automaticamente.
  const validRows = parsed.data.filter(r => r.anno && r.sede && Number(r.anno) >= 2023);
  GraduatorieDB.raw = validRows;

  const byProvincia = {};
  const bySede = {};
  const unmatched = [];

  validRows.forEach(row => {
    // Normalizzazione tipi
    row.anno = Number(row.anno);
    row.posti_disponibili = Number(row.posti_disponibili) || 1;
    row.domande_pervenute = Number(row.domande_pervenute) || 0;
    row.saturazione = Number(row.saturazione) || (row.domande_pervenute / row.posti_disponibili);
    row.punteggio_cutoff = Number(row.punteggio_cutoff) || 0;

    // Raggruppamento per sede
    if (!bySede[row.sede]) bySede[row.sede] = [];
    bySede[row.sede].push(row);

    // Mappatura territoriale per la mappa provinciale
    const provincia = typeof SEDE_TO_PROVINCIA !== "undefined" ? SEDE_TO_PROVINCIA[row.sede] : null;
    if (!provincia) {
      unmatched.push(row);
      return;
    }
    if (!byProvincia[provincia]) byProvincia[provincia] = [];
    byProvincia[provincia].push(Object.assign({}, row, { provincia }));
  });

  Object.keys(bySede).forEach(s => {
    bySede[s].sort((a, b) => a.anno - b.anno);
  });

  GraduatorieDB.byProvincia = byProvincia;
  GraduatorieDB.bySede = bySede;
  GraduatorieDB.allSedi = Object.keys(bySede).sort();
  GraduatorieDB.unmatched = unmatched;
  GraduatorieDB.years = Array.from(new Set(validRows.map(r => r.anno))).sort((a, b) => a - b);
  GraduatorieDB.loaded = true;

  console.info(`[GraduatorieDB] Caricate ${validRows.length} osservazioni per ${GraduatorieDB.allSedi.length} sedi (anni: ${GraduatorieDB.years.join(", ")}).`);
  return GraduatorieDB;
}

if (typeof window !== "undefined") {
  window.GraduatorieDB = GraduatorieDB;
  window.loadGraduatorieDB = loadGraduatorieDB;
}
