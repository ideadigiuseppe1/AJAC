/* =========================================================================
   competitiveness.js
   ---------------------------------------------------------------------
   ⚠️ MODALITÀ DEMO — METODOLOGIA PROPOSTA, NON ANCORA APPROVATA.

   Questo modulo calcola il livello di competitività (🟢🟡🟠🔴) di una
   provincia a partire dai dati REALI del dataset (colonna "Saturazione"),
   ma con una metodologia di aggregazione dichiaratamente provvisoria.
   Non deve essere considerata definitiva finché non sarà validata.

   PERCHÉ NON È UNA SEMPLICE MEDIA
   Una provincia può contenere più sedi con numeri di posti molto diversi.
   Una media aritmetica della Saturazione tratterebbe allo stesso modo una
   sede da 1 posto e una da 20, il che non riflette la pressione reale.
   Per la prima implementazione si è scelto un criterio prudente e
   trasparente: la Saturazione MASSIMA osservata nell'ultimo anno
   disponibile per quella provincia — cioè "quanto è competitiva, nel
   dataset, la sede più ambita di questa provincia in quel territorio?".

   QUESTO CRITERIO È UNA PROPOSTA, NON LA VERSIONE FINALE.
   Altri criteri ragionevoli (media pesata sui posti, mediana, ultimo
   triennio, ecc.) sono possibili e potranno sostituire questa funzione
   senza toccare il resto dell'applicazione: tutta l'app chiama solo
   calculateCompetitiveness(records) e non conosce i dettagli interni.
   ========================================================================= */

const COMPETITIVENESS_MODE = "DEMO"; // 'DEMO' finché la metodologia non è approvata

const LEVELS = {
  easy:  { key: "easy",  label: "Facile",           emoji: "🟢", desc: "Bassa pressione competitiva osservata" },
  mid:   { key: "mid",   label: "Media",             emoji: "🟡", desc: "Pressione competitiva nella media" },
  hard:  { key: "hard",  label: "Difficile",         emoji: "🟠", desc: "Elevata pressione competitiva osservata" },
  vhard: { key: "vhard", label: "Molto difficile",   emoji: "🔴", desc: "Pressione competitiva molto elevata" },
  nodata:{ key: "nodata",label: "Dati non disponibili", emoji: "⚪", desc: "Nessun dato storico per questa provincia" }
};

/* Calcola le soglie dei quartili sulla distribuzione REALE della
   Saturazione (ultimo anno per ciascuna provincia), invece di usare
   numeri fissi inventati: le soglie si aggiornano da sole quando il
   dataset cambia. */
function computeQuartileThresholds(values) {
  const sorted = values.slice().sort((a, b) => a - b);
  const q = p => {
    const idx = (sorted.length - 1) * p;
    const lo = Math.floor(idx), hi = Math.ceil(idx);
    if (lo === hi) return sorted[lo];
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
  };
  return { p25: q(0.25), p50: q(0.50), p75: q(0.75) };
}

/* Punto d'ingresso principale. Riceve TUTTI i record di UNA provincia
   (già risolti tramite sede-provincia-mapping.js) e le soglie correnti
   calcolate sull'intero dataset, restituisce il livello di competitività. */
function calculateCompetitiveness(provinciaRecords, thresholds) {
  if (!provinciaRecords || provinciaRecords.length === 0) {
    return { level: LEVELS.nodata, proposedIndex: null, basedOnYear: null, mode: COMPETITIVENESS_MODE };
  }
  const maxYear = Math.max(...provinciaRecords.map(r => r.anno));
  const latest = provinciaRecords.filter(r => r.anno === maxYear);
  const maxSaturazione = Math.max(...latest.map(r => r.saturazione));

  let level;
  if (maxSaturazione <= thresholds.p25) level = LEVELS.easy;
  else if (maxSaturazione <= thresholds.p50) level = LEVELS.mid;
  else if (maxSaturazione <= thresholds.p75) level = LEVELS.hard;
  else level = LEVELS.vhard;

  return { level, proposedIndex: maxSaturazione, basedOnYear: maxYear, mode: COMPETITIVENESS_MODE };
}

/* Calcola la competitività per TUTTE le province presenti in GraduatorieDB,
   in un'unica passata (serve a colorare la mappa). Ritorna una mappa
   { "Napoli": {level, proposedIndex, basedOnYear}, ... } */
function calculateCompetitivenessForAllProvince(db) {
  const provinceNames = Object.keys(db.byProvincia);

  // Soglie calcolate una sola volta sull'ultimo anno di ciascuna provincia,
  // per coerenza fra tutte le province mostrate sulla mappa.
  const latestValues = provinceNames.map(name => {
    const recs = db.byProvincia[name];
    const maxYear = Math.max(...recs.map(r => r.anno));
    const latest = recs.filter(r => r.anno === maxYear);
    return Math.max(...latest.map(r => r.saturazione));
  });
  const thresholds = computeQuartileThresholds(latestValues);

  const result = {};
  provinceNames.forEach(name => {
    result[name] = calculateCompetitiveness(db.byProvincia[name], thresholds);
  });
  return { byProvincia: result, thresholds };
}

if (typeof window !== "undefined") {
  window.COMPETITIVENESS_MODE = COMPETITIVENESS_MODE;
  window.LEVELS = LEVELS;
  window.calculateCompetitiveness = calculateCompetitiveness;
  window.calculateCompetitivenessForAllProvince = calculateCompetitivenessForAllProvince;
  window.computeQuartileThresholds = computeQuartileThresholds;
}
