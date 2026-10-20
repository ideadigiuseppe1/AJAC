/* =========================================================================
   app.js — GraduatoriaIndex / AJAC
   ---------------------------------------------------------------------
   Collega interfaccia utente, dati (data.js), mappa GeoJSON (map.js)
   e modello predittivo con fattore sorpresa (predictive-model.js).
   ========================================================================= */

const MAX_SCORE = 1200;
const DEFAULT_SCORE = 650;

const AppState = {
  selectedSigla: null,
  selectedSede: null,
  userScore: DEFAULT_SCORE,
  plannedPosti: 1,
  intervalLevel: 0.80,
  competitiveness: { byProvincia: {}, thresholds: null },
  competitivenessBySigla: {}
};

/* ---------------------------------------------------------------------
   Avvio dell'applicazione
   --------------------------------------------------------------------- */
async function bootstrap() {
  const errorBanner = document.getElementById("errorBanner");
  const mapStatus = document.getElementById("mapStatus");

  try {
    await loadGraduatorieDB();
  } catch (err) {
    console.error("[GraduatorieDB Error]", err);
    if (errorBanner) {
      errorBanner.innerHTML = `<strong>Attenzione:</strong> ${err.message}`;
      errorBanner.classList.add("visible");
    }
    if (mapStatus) {
      mapStatus.innerHTML = `<strong>Impossibile caricare i dati:</strong><br>${err.message}`;
      mapStatus.style.display = "flex";
    }
    return;
  }

  // Inizializza il Modello Predittivo con fattore sorpresa sui dati 2023-2026
  PredictiveModel.init(GraduatorieDB);

  updateHeaderStats();

  // Calcolo indice di competitività territoriale per la mappa (metodologia DEMO, distinta dalla singola sede)
  AppState.competitiveness = calculateCompetitivenessForAllProvince(GraduatorieDB);
  AppState.competitivenessBySigla = mapCompetitivenessToSigle(AppState.competitiveness.byProvincia);

  // Inizializzazione della mappa geografica (GeoJSON locale)
  try {
    await ItalyMap.init("italyMap");
  } catch (err) {
    console.error("[ItalyMap Error]", err);
    if (mapStatus) {
      mapStatus.innerHTML = `<strong>Impossibile caricare la mappa:</strong><br>${err.message}`;
      mapStatus.style.display = "flex";
    }
    return;
  }

  if (mapStatus) mapStatus.style.display = "none";

  ItalyMap.setCompetitiveness(AppState.competitivenessBySigla);
  ItalyMap.onProvinceClick = (sigla) => selectProvincia(sigla);
  ItalyMap.onProvinceHover = (sigla, name, evt) => handleHover(sigla, name, evt);

  setupSearch();
  setupZoomControls();
  setupSimulator();
  setupBacktestModal();

  // Seleziona una sede di partenza significativa (es. Roma o Napoli)
  const defaultSede = GraduatorieDB.allSedi.includes("Roma") ? "Roma" : GraduatorieDB.allSedi[0];
  if (defaultSede) {
    setSimulatorSede(defaultSede);
  }
}

/* ---------------------------------------------------------------------
   Aggiornamento contatori e range anni nell'interfaccia
   --------------------------------------------------------------------- */
function updateHeaderStats() {
  const range = GraduatorieDB.yearRange();
  const label = range ? `${range.min} → ${range.max}` : "2023 → 2026";
  document.querySelectorAll(".year-range").forEach(el => el.textContent = label);
  const statEl = document.getElementById("statProvince");
  if (statEl) statEl.textContent = Object.keys(GraduatorieDB.byProvincia).length;
}

function mapCompetitivenessToSigle(byProvinciaName) {
  const out = {};
  Object.entries(byProvinciaName).forEach(([name, comp]) => {
    const entry = typeof PROVINCE_BY_NAME !== "undefined" ? PROVINCE_BY_NAME[name] : null;
    if (entry) out[entry.sigla] = comp;
  });
  return out;
}

/* ---------------------------------------------------------------------
   Tooltip Hover Mappa
   --------------------------------------------------------------------- */
function handleHover(sigla, name, evt) {
  const tooltip = document.getElementById("tooltip");
  if (!tooltip) return;
  if (!sigla) {
    tooltip.style.display = "none";
    return;
  }
  const entry = typeof PROVINCE_BY_SIGLA !== "undefined" ? PROVINCE_BY_SIGLA[sigla] : null;
  const provinciaName = entry ? entry.name : name;
  const comp = AppState.competitivenessBySigla[sigla];
  const level = comp && comp.level ? comp.level : LEVELS.nodata;

  tooltip.innerHTML = `<b>${(provinciaName || name || "").toUpperCase()}</b>
    <div class="tt-level">${level.emoji} ${level.label}</div>
    <div class="tt-sub">${level.desc}</div>`;
  tooltip.style.display = "block";
  if (evt) {
    tooltip.style.left = evt.clientX + "px";
    tooltip.style.top = evt.clientY + "px";
  }
}

/* ---------------------------------------------------------------------
   Selezione Provincia e visualizzazione nel pannello laterale
   --------------------------------------------------------------------- */
function selectProvincia(sigla) {
  AppState.selectedSigla = sigla;
  ItalyMap.focusSigla(sigla);

  const entry = PROVINCE_BY_SIGLA[sigla];
  const container = document.getElementById("provinceDetail");
  if (!entry || !container) return;

  const records = GraduatorieDB.recordsForProvincia(entry.name);
  const comp = AppState.competitivenessBySigla[sigla] || { level: LEVELS.nodata };
  const level = comp.level;

  if (!records.length) {
    container.innerHTML = `
      <div class="panel-head">
        <div>
          <h3>${entry.name}</h3>
          <div class="panel-region">${entry.regione} (${sigla})</div>
        </div>
        <span class="badge ${level.key}">${level.label}</span>
      </div>
      <p style="color:var(--muted);font-size:13px;">Nessuna sede associata a questa provincia nel dataset 2023–2026.</p>
    `;
    return;
  }

  const sedi = GraduatorieDB.sediInProvincia(entry.name);
  const maxYear = Math.max(...records.map(r => r.anno));
  const latestRecords = records.filter(r => r.anno === maxYear);
  const totalPosti = latestRecords.reduce((acc, r) => acc + r.posti_disponibili, 0);
  const totalDomande = latestRecords.reduce((acc, r) => acc + r.domande_pervenute, 0);

  let sediHtml = "";
  sedi.forEach(sede => {
    const sRows = records.filter(r => r.sede === sede).sort((a, b) => b.anno - a.anno);
    const tableRows = sRows.map(r => `
      <tr>
        <td><b>${r.anno}</b></td>
        <td>${r.posti_disponibili}</td>
        <td>${r.domande_pervenute}</td>
        <td>${r.saturazione.toFixed(1)}</td>
        <td><b>${r.punteggio_cutoff.toFixed(1)}</b></td>
      </tr>
    `).join("");

    sediHtml += `
      <div class="sede-block">
        <div class="sede-block-head">
          <b>${sede}</b>
          <button type="button" class="btn-simulate-sede" data-sede="${sede}">Simula trasferimento →</button>
        </div>
        <div class="table-scroll">
          <table class="data-table">
            <thead>
              <tr><th>Anno</th><th>Posti</th><th>Dom.</th><th>Sat.</th><th>Cutoff</th></tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
        </div>
      </div>
    `;
  });

  container.innerHTML = `
    <div class="panel-head">
      <div>
        <h3>${entry.name}</h3>
        <div class="panel-region">${entry.regione} (${sigla})</div>
      </div>
      <span class="badge ${level.key}">${level.label}</span>
    </div>

    <div class="stat-card">
      <div class="sc-label">Indice territoriale provincia</div>
      <div class="sc-value">${comp.proposedIndex ? comp.proposedIndex.toFixed(1) : "—"}</div>
      <div class="sc-sub">Saturazione massima nell'ultimo anno (${maxYear}) · ${totalPosti} posti, ${totalDomande} domande</div>
    </div>

    <div style="margin:16px 0 8px;font-family:var(--font-mono);font-size:11px;text-transform:uppercase;color:var(--muted);letter-spacing:.04em;">
      Sedi presenti (${sedi.length})
    </div>
    ${sediHtml}

    <div class="methodology-note">
      <b>Nota Metodologica Cutoff</b>
      I cutoff sono valori storici minimi osservati nel bando ordinario. Non costituiscono garanzia di trasferimento futuro né tengono conto in modo univoco delle subentranze per rinuncia.
    </div>
  `;

  // Listener per pulsanti "Simula trasferimento" all'interno del pannello
  container.querySelectorAll(".btn-simulate-sede").forEach(btn => {
    btn.addEventListener("click", () => {
      const targetSede = btn.getAttribute("data-sede");
      setSimulatorSede(targetSede);
      const simSection = document.getElementById("simulatore");
      if (simSection) simSection.scrollIntoView({ behavior: "smooth" });
    });
  });
}

/* ---------------------------------------------------------------------
   Ricerca testuale province
   --------------------------------------------------------------------- */
function setupSearch() {
  const input = document.getElementById("searchInput");
  const results = document.getElementById("searchResults");
  if (!input || !results) return;

  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    if (!q) {
      results.style.display = "none";
      ItalyMap.dimAllExcept(null);
      return;
    }
    const matches = PROVINCES_REGISTRY.filter(p => p.name.toLowerCase().includes(q)).slice(0, 8);
    if (!matches.length) {
      results.innerHTML = '<div style="color:var(--muted)">Nessuna provincia trovata</div>';
      results.style.display = "block";
      return;
    }
    results.innerHTML = matches.map(p =>
      `<div data-sigla="${p.sigla}"><span>${p.name}</span><span class="r-region">${p.regione}</span></div>`
    ).join("");
    results.style.display = "block";
    ItalyMap.dimAllExcept(new Set(matches.map(p => p.sigla)));
  });

  results.addEventListener("click", e => {
    const row = e.target.closest("div[data-sigla]");
    if (!row) return;
    const sigla = row.getAttribute("data-sigla");
    input.value = PROVINCE_BY_SIGLA[sigla].name;
    results.style.display = "none";
    ItalyMap.dimAllExcept(null);
    ItalyMap.focusSigla(sigla);
    selectProvincia(sigla);
  });

  document.addEventListener("click", e => {
    if (!e.target.closest(".search-box")) results.style.display = "none";
  });
}

function setupZoomControls() {
  const resetBtn = document.getElementById("zoomReset");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      ItalyMap.resetZoom();
      const input = document.getElementById("searchInput");
      if (input) input.value = "";
      ItalyMap.dimAllExcept(null);
    });
  }
}

/* ---------------------------------------------------------------------
   Simulatore Predittivo con Fattore Sorpresa
   --------------------------------------------------------------------- */
function setupSimulator() {
  const sedeSelect = document.getElementById("simSedeSelect");
  const numberInput = document.getElementById("scoreNumber");
  const rangeInput = document.getElementById("scoreRange");
  const postiInput = document.getElementById("plannedPostiInput");
  const maxLabel = document.getElementById("scoreMaxLabel");

  if (maxLabel) maxLabel.textContent = MAX_SCORE;

  // Popola la select con tutte le sedi uniche in ordine alfabetico
  if (sedeSelect && GraduatorieDB.allSedi.length) {
    sedeSelect.innerHTML = GraduatorieDB.allSedi.map(s => {
      const records = GraduatorieDB.recordsForSede(s);
      const reg = records.length ? records[0].regione : "";
      return `<option value="${s}">${s} (${reg})</option>`;
    }).join("");

    sedeSelect.addEventListener("change", () => {
      const s = sedeSelect.value;
      const prof = PredictiveModel.sediProfiles[s];
      if (prof && postiInput) {
        // Imposta i posti di default a quelli dell'ultimo anno osservato
        postiInput.value = prof.latestPosti || 1;
        updatePostiHints(prof);
      }
      runSimulation();
    });
  }

  // Sincronizzazione score input e slider (MAX_SCORE = 1200)
  [numberInput, rangeInput].forEach(el => {
    if (!el) return;
    el.min = 0;
    el.max = MAX_SCORE;
    el.value = DEFAULT_SCORE;
  });

  if (numberInput && rangeInput) {
    numberInput.addEventListener("input", () => {
      let val = Number(numberInput.value);
      if (val < 0) val = 0;
      if (val > MAX_SCORE) val = MAX_SCORE;
      rangeInput.value = val;
      AppState.userScore = val;
      runSimulation();
    });

    rangeInput.addEventListener("input", () => {
      numberInput.value = rangeInput.value;
      AppState.userScore = Number(rangeInput.value);
      runSimulation();
    });
  }

  // Input posti previsti
  if (postiInput) {
    postiInput.addEventListener("input", () => {
      let p = Math.max(1, parseInt(postiInput.value, 10) || 1);
      AppState.plannedPosti = p;
      const s = sedeSelect ? sedeSelect.value : null;
      if (s && PredictiveModel.sediProfiles[s]) {
        updatePostiHints(PredictiveModel.sediProfiles[s]);
      }
      runSimulation();
    });
  }

  // Selettore livello di copertura intervallo predittivo (80% / 90%)
  document.querySelectorAll(".interval-pill").forEach(pill => {
    pill.addEventListener("click", () => {
      document.querySelectorAll(".interval-pill").forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      const level = parseFloat(pill.getAttribute("data-level")) || 0.80;
      AppState.intervalLevel = level;
      runSimulation();
    });
  });
}

function updatePostiHints(prof) {
  const hintEl = document.getElementById("simPostiHint");
  if (!hintEl || !prof) return;
  hintEl.innerHTML = `Range storico sede: <b>${prof.minPosti}–${prof.maxPosti} posti</b> (media: ${prof.avgPosti.toFixed(1)}).`;
}

function setSimulatorSede(sedeName) {
  const sedeSelect = document.getElementById("simSedeSelect");
  const postiInput = document.getElementById("plannedPostiInput");
  if (sedeSelect) {
    sedeSelect.value = sedeName;
  }
  const prof = PredictiveModel.sediProfiles[sedeName];
  if (prof && postiInput) {
    postiInput.value = prof.latestPosti || 1;
    updatePostiHints(prof);
  }
  runSimulation();
}

/* ---------------------------------------------------------------------
   Esecuzione e Rendering del Risultato Predittivo
   --------------------------------------------------------------------- */
function runSimulation() {
  const sedeSelect = document.getElementById("simSedeSelect");
  const numberInput = document.getElementById("scoreNumber");
  const postiInput = document.getElementById("plannedPostiInput");
  const dashboard = document.getElementById("predictionResultDashboard");

  if (!dashboard || !sedeSelect) return;

  const sede = sedeSelect.value;
  const score = Number(numberInput.value) || 0;
  const posti = Math.max(1, parseInt(postiInput.value, 10) || 1);

  if (!sede) {
    dashboard.innerHTML = '<p style="color:var(--muted)">Seleziona una sede per visualizzare la simulazione.</p>';
    return;
  }

  const pred = PredictiveModel.predict(sede, score, posti, AppState.intervalLevel);
  if (pred.error) {
    dashboard.innerHTML = `<div class="error-banner visible">${pred.message}</div>`;
    return;
  }

  // Calcolo margine formattato
  const marginSign = pred.margin >= 0 ? "+" : "";
  const marginText = `${marginSign}${pred.margin.toFixed(1)} pt rispetto al cutoff atteso`;
  const marginClass = pred.margin >= 0 ? "easy" : "vhard";

  // Tabella storico sede
  const historyRows = pred.records.map(r => `
    <tr>
      <td><b>${r.anno}</b></td>
      <td>${r.posti_disponibili}</td>
      <td>${r.domande_pervenute}</td>
      <td>${r.saturazione.toFixed(1)}</td>
      <td>${r.punteggio_primo ? r.punteggio_primo.toFixed(1) : "—"}</td>
      <td><b>${r.punteggio_cutoff.toFixed(1)}</b></td>
      <td>${r.media_non_vincitori ? r.media_non_vincitori.toFixed(1) : "—"}</td>
    </tr>
  `).join("");

  // Affidabilità: motivi e warning
  const reliabilityReasons = pred.reliability.reasons.map(r => `
    <li><span class="bullet" style="color:var(--easy);">✓</span> <span>${r}</span></li>
  `).join("");
  const reliabilityWarnings = pred.reliability.warnings.map(w => `
    <div class="deep-warning-box">⚠️ ${w}</div>
  `).join("");

  dashboard.innerHTML = `
    <div class="prediction-dashboard">
      <div class="pred-header">
        <div>
          <div class="pred-meta">Analisi del trasferimento · Storico ${pred.historicalYears.join(", ")}</div>
          <h3>${pred.sede} (${pred.regione})</h3>
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
          <span class="badge ${pred.reliability.badgeClass}">Affidabilità: ${pred.reliability.level} (${pred.reliability.score}/100)</span>
          <span class="badge" style="background:var(--paper-dim);color:var(--ink);">Posti inseriti: ${pred.plannedPosti}</span>
        </div>
      </div>

      <!-- Metriche Principali -->
      <div class="pred-key-metrics">
        <!-- 1. Cutoff Atteso Centrale -->
        <div class="metric-box">
          <div class="metric-label">Cutoff futuro atteso</div>
          <div class="metric-value">${pred.expectedCutoff.toFixed(1)}</div>
          <div class="metric-sub">Punti stimati dal modello</div>
        </div>

        <!-- 2. Intervallo Predittivo -->
        <div class="metric-box">
          <div class="metric-label">Fascia predittiva (${pred.predictiveInterval.level})</div>
          <div class="metric-value" style="font-size:23px;">${pred.predictiveInterval.lower} — ${pred.predictiveInterval.upper}</div>
          <div class="metric-sub">Copertura empirica: ${pred.predictiveInterval.empiricalCoverage} (ampiezza: ${pred.predictiveInterval.width} pt)</div>
        </div>

        <!-- 3. Margine Personale -->
        <div class="metric-box">
          <div class="metric-label">Punteggio personale (${pred.userScore})</div>
          <div class="metric-value" style="color:${pred.margin >= 0 ? 'var(--easy)' : 'var(--vhard)'};">${marginSign}${pred.margin.toFixed(1)}</div>
          <div class="metric-sub">${marginText}</div>
        </div>

        <!-- 4. Probabilità stimata di superare il cutoff -->
        <div class="metric-box highlight">
          <div class="metric-label">Probabilità stimata</div>
          <div class="metric-value" style="color:${pred.probability.color};">${pred.probability.formatted}</div>
          <div class="metric-sub">${pred.probability.status}</div>
          <div class="prob-meter-wrap">
            <div class="prob-meter-bar" style="width:${pred.probability.percentage}%;background:${pred.probability.color};"></div>
          </div>
        </div>
      </div>

      <!-- Avviso e Disclaimer Trasparente sulla Non-Garanzia -->
      <div class="prob-disclaimer-box">
        <strong>Limite statistico della previsione</strong>
        ${pred.probability.note} La probabilità stimata esprime la frazione della distribuzione predittiva in cui il punteggio inserito eguaglia o supera il cutoff futuro stimato. <em>Non costituisce una garanzia formale di trasferimento né un dato ufficiale di amministrazione</em>.
      </div>

      <!-- Scomposizione Dettagliata: Sorpresa, Affidabilità e Domanda -->
      <div class="pred-deep-grid">
        <!-- Fattore Sorpresa: Indice di Imprevedibilità Storica -->
        <div class="deep-card">
          <div class="deep-card-title">
            <h4>Indice di imprevedibilità storica</h4>
            <span class="badge" style="background:${pred.surpriseFactor.color}20;color:${pred.surpriseFactor.color};">
              ${pred.surpriseFactor.category} (${pred.surpriseFactor.index}/100)
            </span>
          </div>
          <p>${pred.surpriseFactor.desc}</p>
          <div style="font-size:12px;color:var(--muted);margin-top:6px;">
            Errore medio out-of-sample regolarizzato (shrinkage empirico): <b>${pred.surpriseFactor.shrunkMae} pt</b>.
            <div style="margin-top:4px;"><em>Nota: l'indice misura l'incertezza storica della sede rispetto alle previsioni, non è una probabilità di insuccesso.</em></div>
          </div>
        </div>

        <!-- Previsione Domanda e Saturazione -->
        <div class="deep-card">
          <div class="deep-card-title">
            <h4>Previsione della domanda</h4>
            <span class="badge mid">Sat. attesa: ${pred.demand.expectedSaturation}x</span>
          </div>
          <p>Domande stimate: <b>~${pred.demand.dHat}</b> (fascia di incertezza: ${pred.demand.dLower}–${pred.demand.dUpper}).</p>
          <div style="font-size:12px;color:var(--muted);">
            ${pred.demand.note} La domanda futura è stimata e include la propria incertezza.
          </div>
        </div>

        <!-- Affidabilità della Stima -->
        <div class="deep-card" style="grid-column: span 2;">
          <div class="deep-card-title">
            <h4>Affidabilità metodologica della previsione</h4>
            <span class="badge ${pred.reliability.badgeClass}">${pred.reliability.level} (${pred.reliability.score} / 100)</span>
          </div>
          <p>L'affidabilità descrive quanto sia ragionevole fidarsi della stima in base alla quantità di dati disponibili e alla distanza dello scenario dal passato:</p>
          <ul class="deep-factor-list">
            ${reliabilityReasons}
          </ul>
          ${reliabilityWarnings}
        </div>
      </div>

      <!-- Storico Completo della Sede nel Dataset 2023-2026 -->
      <div class="sede-history-wrap">
        <h4>Storico osservato per ${pred.sede} (2023–2026)</h4>
        <div class="table-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th>Anno</th>
                <th>Posti</th>
                <th>Domande</th>
                <th>Saturazione</th>
                <th>Punteggio 1°</th>
                <th>Cutoff</th>
                <th>Media Non Vincitori</th>
              </tr>
            </thead>
            <tbody>
              ${historyRows}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

/* ---------------------------------------------------------------------
   Modale con Risultati di Validazione e Backtesting
   --------------------------------------------------------------------- */
function setupBacktestModal() {
  const openBtn = document.getElementById("btnOpenBacktestModal");
  const modal = document.getElementById("backtestModalBackdrop");
  const closeBtn = document.getElementById("btnCloseBacktestModal");

  if (!openBtn || !modal) return;

  openBtn.addEventListener("click", () => {
    renderBacktestModalContent();
    modal.classList.add("open");
  });

  if (closeBtn) {
    closeBtn.addEventListener("click", () => modal.classList.remove("open"));
  }

  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.classList.remove("open");
  });
}

function renderBacktestModalContent() {
  const container = document.getElementById("backtestModalBody");
  if (!container || !PredictiveModel.backtestResults) return;

  const res = PredictiveModel.backtestResults;
  const foldsHtml = res.folds.map(f => `
    <div style="background:var(--paper);border:1px solid var(--line);border-radius:12px;padding:16px;margin-bottom:14px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <h4 style="margin:0;font-size:16px;">Target anno ${f.targetYear} (Train ${f.trainYears})</h4>
        <span class="badge easy">${f.testCount} sedi verificate</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:10px;font-family:var(--font-mono);font-size:12px;">
        <div><b>MAE Modello:</b> ${f.modelMae} pt</div>
        <div><b>MAE Baseline Last:</b> ${f.baselineLastMae} pt</div>
        <div><b>Bias sistematico:</b> ${f.modelBias} pt</div>
        <div><b>Copertura intervallo 80%:</b> ${f.empiricalCoverage80}</div>
        <div><b>Copertura intervallo 90%:</b> ${f.empiricalCoverage90}</div>
      </div>
    </div>
  `).join("");

  container.innerHTML = `
    <p style="font-size:13.5px;color:var(--muted);line-height:1.5;margin-bottom:18px;">
      In conformità ai requisiti di progetto, il modello predittivo con fattore sorpresa è stato sottoposto a verifica out-of-sample temporale su tutte le sedi del periodo 2023–2026. Non sono stati usati dati in-sample per misurare l'errore né dati del 2022.
    </p>

    ${foldsHtml}

    <div style="background:#f3f6f4;border:1px solid #c2dbd1;border-radius:12px;padding:16px;font-size:13px;line-height:1.55;">
      <h4 style="margin:0 0 8px;font-family:var(--font-mono);text-transform:uppercase;color:var(--brand);">Conclusioni della Validazione</h4>
      <div>• <b>Riduzione errore:</b> Il modello riduce il MAE del ${res.overallMetrics.reductionPercent} rispetto alla baseline naïf (ultimo cutoff osservato).</div>
      <div>• <b>Effetto posti (β_posti):</b> Stimato a ${res.overallMetrics.betaPostiEmpirical} punti per posto (p-value: ${res.overallMetrics.betaPostiPValue}, statisticamente significativo).</div>
      <div>• <b>Calibrazione intervallo:</b> L'intervallo a copertura nominale 80% raggiunge il ${res.overallMetrics.nominal80Coverage} effettivo nei test temporali; l'intervallo al 90% raggiunge il ${res.overallMetrics.nominal90Coverage}.</div>
      <div style="margin-top:8px;color:var(--muted);font-size:11.5px;"><em>Nota metodologica: con 4 anni disponibili (2023-2026), il modello viene mantenuto in modalità dichiaratamente prudente e sperimentale.</em></div>
    </div>
  `;
}

document.addEventListener("DOMContentLoaded", bootstrap);
