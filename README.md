# AJAC — simulatore e analisi trasferimenti Guardia di Finanza

**AJAC** è una piattaforma analitica e decisionale creata per supportare i militari della **Guardia di Finanza (Ruolo Ispettori)** nella valutazione della propria domanda di trasferimento verso le sedi desiderate, basandosi sui dati reali dei bandi e su un modello predittivo che integra il **fattore sorpresa** (chiamato indice di imprevedibilità storica).

---

## 1. Finalità e Autore

- **Finalità:** aiutare il collega ispettore della Guardia di Finanza a orientare la propria domanda di mobilità con dati oggettivi, stimando la probabilità che il proprio punteggio sia sufficiente in base ai posti previsti e all'imprevedibilità storica della sede.
- **Autore:** ideato e realizzato da **Giuseppe M.**, appassionato di informatica, finanza e matematica, come progetto no-profit e indipendente a disposizione dei colleghi.
- **Fonte dei dati:** i punteggi ufficiali pubblicati annualmente dall'amministrazione per finalità di trasparenza (graduatorie ordinarie, posti messi a bando, domande pervenute, cutoff dell'ultimo vincitore e media dei non vincitori).

---

## 2. Come avviare il sito in locale

Il sito carica `data/graduatorie-test.csv` e la mappa geografica `data/limits_IT_provinces.geojson` via `fetch()`. Per le policy CORS dei browser, **va eseguito servendolo via HTTP**:

```bash
python -m http.server 8000
```

Poi aprire nel browser:
```
http://localhost:8000
```

Se aperto direttamente tramite `file://`, un banner diagnostico nell'interfaccia segnalerà il blocco CORS e ricorderà il comando.

---

## 3. Come aggiornare i dati in futuro

Il sistema è progettato per essere **completamente dinamico**:

1. Quando l'amministrazione pubblica una nuova graduatoria (es. anno 2027, 2028...), apri il file `data/graduatorie-test.csv` e accoda semplicemente le nuove righe (oppure sostituiscilo con il nuovo CSV aggiornato);
2. Salva ed esegui il push su GitHub (o ricarica la pagina in locale);
3. **Il sito farà tutto da solo:**
   - Rileverà automaticamente il nuovo anno e aggiornerà tutti i testi di storico (`2023 → 2027`);
   - Ricalcolerà dinamicamente la regressione empirica sull'effetto dei posti ($\beta_P$) e della domanda ($\beta_D$);
   - Eseguirà in tempo reale un nuovo fold di backtesting out-of-sample per il nuovo anno (misurando MAE, bias e copertura empirica);
   - Ricalcolerà per ciascuna sede il punteggio atteso, lo shrinkage empirico e l'indice di imprevedibilità storica;
   - Aggiornerà la mappa provinciale con le nuove saturazioni.

**Non serve modificare alcuna riga di codice JavaScript o HTML per aggiungere nuovi anni o nuove sedi.**

---

## 4. Il Modello Predittivo con Fattore Sorpresa

Il modello predittivo stima la distribuzione del cutoff futuro $C_{s,t+1}$ condizionata al punteggio personale $S$ e ai posti previsti $P$:

1. **Cutoff atteso ($\widehat{C}$):** ponderazione temporale che privilegia gli anni recenti, shrinkage verso la media aggregata per sedi con poche osservazioni ed effetto posti regolarizzato ($\beta_P \approx -15.0$ pt/posto).
2. **Previsione della Domanda ($\widehat{D}$):** stima condizionata al numero di posti previsti con intervallo di incertezza.
3. **Indice di Imprevedibilità Storica (0–100):** misura l'errore out-of-sample residuo non spiegato dal modello, stabilizzato tramite **Empirical Bayes Shrinkage** per non sovrastimare la varianza delle sedi con pochi anni. Classificato in *Bassa (0–35)*, *Moderata (36–65)*, ed *Elevata (66–100)*.
4. **Distribuzione Predittiva Student-$t$ ($\nu=4$):** modella le code pesanti e incorpora l'incertezza storica senza moltiplicatori arbitrari. Supporta intervalli all'80% (standard) e 90% (prudente).
5. **Probabilità di Superamento $P(C \le S)$:** calcolata sulla distribuzione cumulata, con salvaguardie di certezza (nessuna falsa garanzia: $\ge 95\%$ segnala *«Probabilità stimata molto alta — il trasferimento non è garantito»*).
6. **Affidabilità della Stima:** valutata separatamente dalla probabilità (punteggio 0–100, *Alta*, *Media*, *Bassa*) in base alla completezza dello storico, alla stabilità della sede e alla vicinanza dei posti ipotizzati rispetto al range passato.

---

## 5. Struttura dei File

```
index.html                     ← Markup HTML5 moderno e pulito (lang="it", Doctype)
css/
  style.css                    ← Unico file CSS principale ben organizzato (inclusa sezione FAQ)
data/
  graduatorie-test.csv          ← Dataset storico (anni >= 2023)
  limits_IT_provinces.geojson   ← Geometria ISTAT delle province italiane
js/
  provinces-registry.js         ← Elenco canonico delle 107 province italiane
  sede-provincia-mapping.js     ← Mapping sedi → province per la mappa territoriale
  data.js                       ← Caricamento CSV e gestione dinamica degli anni
  competitiveness.js            ← Indice di competitività provinciale della mappa (DEMO)
  predictive-model.js           ← Modello predittivo a fattore sorpresa e backtesting dinamico
  map.js                        ← Mappa Leaflet nativa GeoJSON (senza TopoJSON)
  app.js                        ← Controller interfaccia, sincronizzazione e simulatore
README.md                      ← Documentazione tecnica e guida GitHub Pages
```

---

## 6. Limitazioni Metodologiche

- Il dataset storico non traccia in modo trasparente i subentri da rinunce successive alla pubblicazione (c.d. "scorrimenti");
- L'indice territoriale della mappa descrive la saturazione provinciale a fini orientativi e resta distinto dalla previsione della singola sede;
- La stima probabilistica costituisce un supporto statistico alle decisioni e non una garanzia formale di trasferimento.
