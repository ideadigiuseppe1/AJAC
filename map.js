/* =========================================================================
   map.js
   ---------------------------------------------------------------------
   Mappa provinciale d'Italia basata su GeoJSON nativo (dati ISTAT).
   Eliminata qualsiasi dipendenza da TopoJSON per prevenire errori MIME CDN.
   ========================================================================= */

const GEOJSON_SOURCES = [
  "data/limits_IT_provinces.geojson",
  "https://raw.githubusercontent.com/guglielmo/geojson-italy/main/geojson/limits_IT_provinces.geojson"
];

const LEVEL_COLORS = {
  easy: "#3f8f5c", mid: "#c99a2e", hard: "#cf6d2e", vhard: "#b8402f", nodata: "#cfcac0"
};

const ItalyMap = {
  map: null,
  geoLayer: null,
  layerBySigla: {},
  featureBySigla: {},
  onProvinceClick: null,
  onProvinceHover: null,
  competitivenessBySigla: {},

  async init(containerId) {
    this.map = L.map(containerId, {
      zoomControl: false,
      minZoom: 4.7,
      maxZoom: 9,
      scrollWheelZoom: true
    }).setView([42.2, 12.6], 5.35);

    L.control.zoom({ position: "topright" }).addTo(this.map);

    const geo = await this._fetchGeoJSON();

    this.geoLayer = L.geoJSON(geo, {
      style: f => this._styleFor(f),
      onEachFeature: (feature, layer) => this._bindFeature(feature, layer)
    }).addTo(this.map);

    geo.features.forEach(f => {
      const sigla = this._siglaOf(f);
      if (sigla) this.featureBySigla[sigla] = f;
    });

    this.map.fitBounds(this.geoLayer.getBounds(), { padding: [8, 8] });
    return geo;
  },

  async _fetchGeoJSON() {
    let lastErr;
    for (const url of GEOJSON_SOURCES) {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
      } catch (err) {
        lastErr = err;
        console.warn(`[ItalyMap] Sorgente GeoJSON non raggiungibile (${url}):`, err.message);
      }
    }
    throw new Error("Nessuna sorgente GeoJSON delle province raggiungibile: " + lastErr);
  },

  _siglaOf(feature) {
    const p = feature.properties || {};
    return p.prov_acr || p.sigla || p.PROV_ACR || null;
  },

  _nameOf(feature) {
    const p = feature.properties || {};
    return p.prov_name || p.name || p.PROV_NAME || "";
  },

  _styleFor(feature) {
    const sigla = this._siglaOf(feature);
    const comp = sigla ? this.competitivenessBySigla[sigla] : null;
    const key = comp && comp.level ? comp.level.key : "nodata";
    return {
      fillColor: LEVEL_COLORS[key] || LEVEL_COLORS.nodata,
      fillOpacity: 0.82,
      color: "#0e1a17",
      weight: 0.7,
      opacity: 0.55
    };
  },

  _bindFeature(feature, layer) {
    const sigla = this._siglaOf(feature);
    if (sigla) this.layerBySigla[sigla] = layer;

    layer.on("mouseover", (e) => {
      layer.setStyle({ weight: 2.4, opacity: 1, fillOpacity: 0.95 });
      layer.bringToFront();
      if (this.onProvinceHover) this.onProvinceHover(sigla, this._nameOf(feature), e.originalEvent);
    });
    layer.on("mousemove", (e) => {
      if (this.onProvinceHover) this.onProvinceHover(sigla, this._nameOf(feature), e.originalEvent);
    });
    layer.on("mouseout", () => {
      layer.setStyle(this._styleFor(feature));
      if (this.onProvinceHover) this.onProvinceHover(null);
    });
    layer.on("click", () => {
      if (this.onProvinceClick) this.onProvinceClick(sigla, this._nameOf(feature));
    });
  },

  setCompetitiveness(bySigla) {
    this.competitivenessBySigla = bySigla || {};
    if (!this.geoLayer) return;
    this.geoLayer.eachLayer(layer => {
      const feature = layer.feature;
      layer.setStyle(this._styleFor(feature));
    });
  },

  highlightSigla(sigla) {
    Object.entries(this.layerBySigla).forEach(([s, layer]) => {
      const feature = layer.feature;
      if (s === sigla) {
        layer.setStyle({ weight: 3, opacity: 1, color: "#0e1a17" });
        layer.bringToFront();
      } else {
        layer.setStyle(this._styleFor(feature));
      }
    });
  },

  focusSigla(sigla) {
    const layer = this.layerBySigla[sigla];
    if (!layer) return;
    this.map.fitBounds(layer.getBounds(), { maxZoom: 8, padding: [40, 40] });
    this.highlightSigla(sigla);
  },

  dimAllExcept(siglaSet) {
    Object.entries(this.layerBySigla).forEach(([s, layer]) => {
      const feature = layer.feature;
      const base = this._styleFor(feature);
      if (!siglaSet || siglaSet.size === 0) {
        layer.setStyle(base);
      } else if (siglaSet.has(s)) {
        layer.setStyle(Object.assign({}, base, { fillOpacity: 0.95, weight: 2, opacity: 1 }));
      } else {
        layer.setStyle(Object.assign({}, base, { fillOpacity: 0.12, weight: 0.4, opacity: 0.25 }));
      }
    });
  },

  resetZoom() {
    if (this.geoLayer) this.map.fitBounds(this.geoLayer.getBounds(), { padding: [8, 8] });
  }
};

if (typeof window !== "undefined") {
  window.ItalyMap = ItalyMap;
}
