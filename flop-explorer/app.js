let payload = null;
let data = [];
const colors = {
  rainbow: "#4C78A8",
  two_tone: "#8DC6C2",
  two_tone_AB: "#F58518",
  two_tone_AC: "#E45756",
  two_tone_BC: "#72B7B2",
  monotone: "#54A24B",
  paired_two_tone: "#B279A2",
  paired_two_tone_AB: "#7F3C8D",
  paired_two_tone_AC: "#B279A2",
  paired_two_tone_BC: "#D5A6C8",
  paired_rainbow: "#9D755D",
  trips: "#FF9DA6"
};
const svg = document.getElementById("plot");
const tooltip = document.getElementById("tooltip");
const readout = document.getElementById("readout");
const heroFrequencyPanel = document.getElementById("heroFrequencyPanel");
const villainFrequencyPanel = document.getElementById("villainFrequencyPanel");
const loadingOverlay = document.getElementById("loadingOverlay");
const loadingStatus = document.getElementById("loadingStatus");
const loadingBar = document.getElementById("loadingBar");
const pinned = new Set();
const boardDetailCache = new Map();
const currentShowdownCache = new Map();
const futureShowdownCache = new Map();
const futureRowsByCellCache = new WeakMap();
const futureEquitySummaryCache = new WeakMap();
const exactFutureRowsCache = new Map();
const exactFutureEquitySummaryCache = new WeakMap();
const drawRunoutCache = new WeakMap();
const highCardDrawHitBandCache = new WeakMap();
const pairDrawHitBandCache = new WeakMap();
const tripsDrawHitBandCache = new WeakMap();
const pairBandCache = new WeakMap();
const rangeFrequencyHtmlCache = new Map();
const boardDetailVersion = "draw-outs-4-straight-draw-class";
const rangePlotDataVersion = "range-plot-matrix-11";
const futureShowdownVersion = "pair-straight-matrix-1";
const displayRoleLabels = {
  hero: "Aggressor",
  villain: "Caller"
};
let rangeOrder = [];
let rangeRank = new Map();
let sliderRankMaps = new Map();
const rankOrder = "AKQJT98765432".split("");
const canonicalSuits = ["●", "○", "△", "◆"];
let hoveredFlop = null;
let selectedFlop = null;
let plotView = "wetDynamic";
let drawPressureRole = "hero";
let yMode = "futureNut";
let transformMode = "raw";
let allBoardDetailsLoaded = false;
let detailPreloadStarted = false;
let boardDetailsLoadedCount = 0;
let lastBackgroundDetailDraw = 0;
let rangePlotDataLoaded = false;
let rangePlotDataPromise = null;
let rangePlotGainScale = 1e9;
let rangePlotStrengthScale = 1e6;
let rangePlotOutsScale = 1e6;
let rangePlotMatrixFieldCount = 10;
let rangeCacheKey = "";
let rangeCacheRows = null;
let rangePresetConfig = null;
let rangePresets = [];
let baseRangePresets = new Map();
let rangePresetRevision = 0;
let rangeUpdateTimer = null;
const rangePaintDrafts = {hero: null, villain: null};
const rangePresetStorageKey = "pokersim.rangePresets.v1";
const localHosts = new Set(["", "localhost", "127.0.0.1"]);
const drawPressureStableDomain = {
  x: [0.02, 0.29],
  y: [-0.005, 0.126],
};
const controls = {
  heroRangePercent: document.getElementById("heroRangePercent"),
  villainRangePercent: document.getElementById("villainRangePercent"),
  heroRangePreset: document.getElementById("heroRangePreset"),
  villainRangePreset: document.getElementById("villainRangePreset"),
  texture: document.getElementById("textureFilter"),
  search: document.getElementById("search")
};

function setReadout(html) {
  if (readout) readout.innerHTML = html;
}

function fmt(value, digits = 3) {
  return Number(value).toFixed(digits);
}

function fmtTick(value, span) {
  const absSpan = Math.abs(span);
  let digits = 1;
  if (absSpan < 0.01) {
    digits = 5;
  } else if (absSpan < 0.1) {
    digits = 4;
  } else if (absSpan < 1) {
    digits = 3;
  } else if (absSpan < 10) {
    digits = 2;
  }
  const rounded = Number(value.toFixed(digits));
  return (Math.abs(rounded) < Math.pow(10, -digits) ? 0 : rounded).toFixed(digits);
}

function rowKey(d) {
  return `${d.flop_key}|${d.suit_texture}`;
}

function extent(values) {
  return [Math.min(...values), Math.max(...values)];
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

async function loadRangePresets() {
  try {
    const response = await fetch("range_presets.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    rangePresetConfig = await response.json();
  } catch (error) {
    rangePresetConfig = fallbackRangePresetConfig();
    console.warn("Using fallback range presets.", error);
  }
  normalizeRangePresets();
  applyStoredRangePresetOverrides();
}

function fallbackRangePresetConfig() {
  return {
    version: "fallback-binary-1",
    presets: [
      {id: "linear_open_slider", label: "Linear open priority", group: "Slider Orders", mode: "slider", hands: []},
      {id: "polar_priority_slider", label: "Polar priority", group: "Slider Orders", mode: "slider", hands: []},
      {id: "top_strength_slider", label: "Static strength order", group: "Slider Orders", mode: "slider", hands: []},
      {id: "co_rfi", label: "CO RFI", group: "RFI", hands: ["AA", "KK", "QQ", "JJ", "TT", "99", "88", "77", "66", "55", "44", "33", "22", "AKs", "AQs", "AJs", "ATs", "A9s", "A8s", "A5s", "A4s", "KQs", "KJs", "KTs", "QJs", "QTs", "JTs", "T9s", "98s", "87s", "76s", "AKo", "AQo", "AJo", "ATo", "KQo"]},
      {id: "bb_call_vs_co", label: "BB Call vs CO", group: "Facing RFI", hands: ["QQ", "JJ", "TT", "99", "88", "77", "66", "55", "44", "33", "22", "AQs", "AJs", "ATs", "A9s", "A8s", "A7s", "A6s", "A5s", "A4s", "A3s", "A2s", "KQs", "KJs", "KTs", "K9s", "K8s", "QJs", "QTs", "Q9s", "JTs", "J9s", "T9s", "T8s", "98s", "97s", "87s", "76s", "65s", "AQo", "AJo", "ATo", "KQo", "KJo", "QJo"]}
    ]
  };
}

function normalizeRangePresets() {
  sliderRankMaps = new Map();
  const validHands = new Set(rangeOrder);
  rangePresets = (rangePresetConfig?.presets || [])
    .map(preset => ({
      id: String(preset.id || "").trim(),
      label: String(preset.label || preset.id || "").trim(),
      group: String(preset.group || "Presets").trim(),
      description: String(preset.description || "").trim(),
      mode: preset.mode === "slider" || preset.mode === "all" ? preset.mode : "hands",
      range_type: String(preset.range_type || "").trim(),
      shape: String(preset.shape || "").trim(),
      confidence: String(preset.confidence || "").trim(),
      binary: preset.binary !== false,
      hands: uniqueHands(preset.hands || [], validHands)
    }))
    .filter(preset => preset.id && preset.label);
  if (!rangePresets.some(preset => preset.mode === "slider")) {
    rangePresets.unshift({id: "linear_open_slider", label: "Linear open priority", group: "Slider Orders", description: "", mode: "slider", hands: []});
  }
  baseRangePresets = new Map(rangePresets.map(preset => [preset.id, {...preset, hands: [...preset.hands]}]));
}

function uniqueHands(hands, validHands = new Set(rangeOrder)) {
  const result = [];
  const seen = new Set();
  for (const raw of hands) {
    const key = normalizeHandKey(raw);
    if (!key || !validHands.has(key) || seen.has(key)) continue;
    seen.add(key);
    result.push(key);
  }
  return result;
}

function normalizeHandKey(raw) {
  const text = String(raw || "").trim();
  if (!text) return "";
  if (text.length === 2) return text.toUpperCase();
  if (text.length === 3) return `${text[0].toUpperCase()}${text[1].toUpperCase()}${text[2].toLowerCase()}`;
  return text;
}

function applyStoredRangePresetOverrides() {
  let overrides = [];
  try {
    overrides = JSON.parse(localStorage.getItem(rangePresetStorageKey) || "[]");
  } catch (error) {
    console.warn("Could not parse range preset overrides.", error);
  }
  const validHands = new Set(rangeOrder);
  for (const override of Array.isArray(overrides) ? overrides : []) {
    const preset = rangePresets.find(item => item.id === override.id && item.mode === "hands");
    if (preset) preset.hands = uniqueHands(override.hands || [], validHands);
  }
}

function saveRangePresetOverrides() {
  const overrides = rangePresets
    .filter(preset => preset.mode === "hands")
    .map(preset => ({id: preset.id, hands: preset.hands}));
  localStorage.setItem(rangePresetStorageKey, JSON.stringify(overrides));
}

function presetById(id) {
  return rangePresets.find(preset => preset.id === id) || rangePresets[0] || null;
}

function presetControl(role) {
  return role === "hero" ? controls.heroRangePreset : controls.villainRangePreset;
}

function selectedPreset(role) {
  return presetById(presetControl(role)?.value);
}

function rangeOrderRankMap(preset) {
  if (!preset || preset.mode !== "slider") return rangeRank;
  const cacheKey = preset.hands?.length ? preset.id : "static-strength";
  if (sliderRankMaps.has(cacheKey)) return sliderRankMaps.get(cacheKey);
  const order = preset.hands?.length ? preset.hands : rangeOrder;
  const rankMap = new Map(order.map((hand, index) => [hand, index + 1]));
  sliderRankMaps.set(cacheKey, rankMap);
  return rankMap;
}

function rangeRankText(role, key, preset = selectedPreset(role)) {
  if (!preset) return "";
  const rank = rangeOrderRankMap(preset).get(key);
  if (!rank) return "";
  if (preset.mode === "slider") return `${preset.label || "Slider order"} #${rank}`;
  return `Static strength #${rangeRank.get(key) || rank}`;
}

function activeDetailFlop() {
  return selectedFlop || hoveredFlop;
}

function opponentRole(role) {
  return role === "hero" ? "villain" : "hero";
}

function drawPressureRoleLabel() {
  return displayRoleLabels[drawPressureRole] || "Aggressor";
}

function rangeUsesTopStrengthSlider(role) {
  const preset = selectedPreset(role);
  return !preset || preset.id === "top_strength_slider";
}

function setDefaults() {
  selectedFlop = null;
  hoveredFlop = null;
  controls.heroRangePercent.value = 100;
  controls.villainRangePercent.value = 100;
  const defaultSlider = presetById("linear_open_slider") ? "linear_open_slider" : presetById("top_strength_slider") ? "top_strength_slider" : rangePresets[0]?.id || "";
  if (controls.heroRangePreset) controls.heroRangePreset.value = defaultSlider;
  if (controls.villainRangePreset) controls.villainRangePreset.value = defaultSlider;
  controls.search.value = "";
  controls.texture.value = "all";
  drawPressureRole = "hero";
  document.querySelectorAll('input[name="drawPressureRole"]').forEach(input => {
    input.checked = input.value === drawPressureRole;
  });
  plotView = "wetDynamic";
  yMode = "futureNut";
  transformMode = "raw";
  document.getElementById("pcaTransform").textContent = "Transform: PCA";
  renderPlotTabs();
  renderRangeEditor();
  renderRangeMatrices();
}

function initControls() {
  const textures = [...new Set(data.map(d => d.suit_texture))].sort();
  for (const texture of textures) {
    const option = document.createElement("option");
    option.value = texture;
    option.textContent = texture;
    controls.texture.appendChild(option);
  }
  populateRangePresetControls();
  setDefaults();
}

function populateRangePresetControls() {
  const selects = [controls.heroRangePreset, controls.villainRangePreset].filter(Boolean);
  for (const select of selects) {
    select.innerHTML = "";
    const groups = new Map();
    for (const preset of rangePresets) {
      if (!groups.has(preset.group)) groups.set(preset.group, []);
      groups.get(preset.group).push(preset);
    }
    for (const [group, presets] of groups.entries()) {
      const optgroup = document.createElement("optgroup");
      optgroup.label = group;
      for (const preset of presets) {
        const option = document.createElement("option");
        option.value = preset.id;
        option.textContent = preset.label;
        optgroup.appendChild(option);
      }
      select.appendChild(optgroup);
    }
  }
}

function rangePaintElements(role) {
  const prefix = role === "hero" ? "hero" : "villain";
  return {
    panel: document.getElementById(`${prefix}PaintPanel`),
    toggle: document.getElementById(`${prefix}PaintToggle`),
    hands: document.getElementById(`${prefix}RangeEditorHands`),
    grid: document.getElementById(`${prefix}RangePaintGrid`),
    count: document.getElementById(`${prefix}RangePaintCount`),
    status: document.getElementById(`${prefix}RangeEditorStatus`),
  };
}

function rangeSourceKey(role, preset = selectedPreset(role)) {
  if (!preset) return "none";
  const percentControl = role === "hero" ? controls.heroRangePercent : controls.villainRangePercent;
  const percent = percentControl?.value || "";
  return `${preset.id}|${preset.mode}|${percent}`;
}

function rangePresetKey(preset = null) {
  return preset ? `${preset.id}|${preset.mode}` : "none";
}

function baseSelectedRangeKeys(role, preset = selectedPreset(role)) {
  if (preset && preset.mode === "all") return new Set(rangeOrder);
  if (preset && preset.mode !== "slider") return new Set(preset.hands);
  const control = role === "hero" ? controls.heroRangePercent : controls.villainRangePercent;
  const percent = Number(control.value);
  const sliderOrder = preset?.hands?.length ? preset.hands : rangeOrder;
  const count = percent >= 100 ? sliderOrder.length : Math.max(1, Math.floor(sliderOrder.length * percent / 100));
  return new Set(sliderOrder.slice(0, count));
}

function rangePaintDraft(role, preset = selectedPreset(role)) {
  if (!preset) return null;
  const sourceKey = rangeSourceKey(role, preset);
  const presetKey = rangePresetKey(preset);
  const current = rangePaintDrafts[role];
  if (current?.active && current.presetKey === presetKey) return current;
  if (!current || current.sourceKey !== sourceKey || current.presetKey !== presetKey) {
    rangePaintDrafts[role] = {sourceKey, presetKey, active: false, hands: [...baseSelectedRangeKeys(role, preset)]};
  }
  return rangePaintDrafts[role];
}

function renderRangeEditor(role = "") {
  if (role) {
    renderRangePaintEditor(role);
    return;
  }
  renderRangePaintEditor("hero");
  renderRangePaintEditor("villain");
}

function renderRangePaintEditor(role) {
  const elements = rangePaintElements(role);
  if (!elements.hands || !elements.grid) return;
  const preset = selectedPreset(role);
  const draft = rangePaintDraft(role, preset);
  elements.hands.disabled = !draft;
  elements.hands.value = draft?.hands.join(" ") || "";
  if (elements.status && !elements.status.textContent) {
    elements.status.textContent = draft?.active
      ? `Using painted ${displayRoleLabels[role] || role} range.`
      : `${preset?.label || "Range"} loaded as paint start.`;
  }
  renderRangePaintGrid(role, preset);
}

function renderRangePaintGrid(role, preset = null) {
  const elements = rangePaintElements(role);
  if (!elements.grid) return;
  const selected = preset || selectedPreset(role);
  const draft = rangePaintDraft(role, selected);
  const selectedHands = new Set(draft?.hands || []);
  elements.grid.classList.toggle("disabled", !draft);
  elements.grid.innerHTML = "";
  if (elements.count) elements.count.textContent = draft ? `${selectedHands.size}/${rangeOrder.length}` : "locked";
  for (let row = 0; row < rankOrder.length; row++) {
    for (let col = 0; col < rankOrder.length; col++) {
      const key = matrixKey(row, col);
      const button = document.createElement("button");
      button.type = "button";
      button.className = `range-paint-cell ${rangeClass(key)}${selectedHands.has(key) ? " selected" : ""}`;
      button.textContent = key;
      button.disabled = !draft;
      button.setAttribute("aria-pressed", selectedHands.has(key) ? "true" : "false");
      button.title = draft ? `${selectedHands.has(key) ? "Remove" : "Add"} ${key}` : "No range is available to paint.";
      button.addEventListener("click", () => togglePaintedRangeHand(role, key));
      elements.grid.appendChild(button);
    }
  }
}

function refreshAfterRangePaintChange(role, message = "", options = {}) {
  const elements = rangePaintElements(role);
  rangePresetRevision += 1;
  clearRangeDerivedCaches();
  if (elements.status && message) elements.status.textContent = message;
  if (options.renderEditor !== false) renderRangeEditor(role);
  renderRangeMatrices();
  refreshHoveredReadout();
  draw();
}

function parseEditorHands(text) {
  const validHands = new Set(rangeOrder);
  const tokens = String(text || "").split(/[\s,;]+/).filter(Boolean);
  const hands = [];
  const invalid = [];
  const seen = new Set();
  for (const token of tokens) {
    const key = normalizeHandKey(token);
    if (!validHands.has(key)) {
      invalid.push(token);
    } else if (!seen.has(key)) {
      seen.add(key);
      hands.push(key);
    }
  }
  return {hands, invalid};
}

function stageRangeEditorHands(role) {
  const elements = rangePaintElements(role);
  const preset = selectedPreset(role);
  const draft = rangePaintDraft(role, preset);
  if (!preset || !draft) return;
  const parsed = parseEditorHands(elements.hands?.value || "");
  draft.hands = parsed.hands;
  draft.active = true;
  renderRangePaintGrid(role, preset);
  if (elements.status) {
    const invalidText = parsed.invalid.length ? ` Ignored invalid: ${parsed.invalid.slice(0, 8).join(", ")}${parsed.invalid.length > 8 ? "..." : ""}` : "";
    elements.status.textContent = `${preset.label}: using ${draft.hands.length} painted hands.${invalidText}`;
  }
  refreshAfterRangePaintChange(role, "", {renderEditor: false});
}

function applyRangeEditorHands(role) {
  const elements = rangePaintElements(role);
  const preset = selectedPreset(role);
  const draft = rangePaintDraft(role, preset);
  if (!preset || !draft) {
    if (elements.status) elements.status.textContent = "No range is available to paint.";
    return;
  }
  const parsed = parseEditorHands(elements.hands?.value || "");
  draft.hands = parsed.hands;
  draft.active = true;
  const invalidText = parsed.invalid.length ? ` Ignored invalid: ${parsed.invalid.slice(0, 8).join(", ")}${parsed.invalid.length > 8 ? "..." : ""}` : "";
  refreshAfterRangePaintChange(role, `Using painted ${preset.label}: ${draft.hands.length} hands.${invalidText}`);
}

function togglePaintedRangeHand(role, key) {
  const preset = selectedPreset(role);
  const draft = rangePaintDraft(role, preset);
  if (!preset || !draft) return;
  const selected = new Set(draft.hands);
  if (selected.has(key)) {
    selected.delete(key);
  } else {
    selected.add(key);
  }
  draft.hands = rangeOrder.filter(hand => selected.has(hand));
  draft.active = true;
  refreshAfterRangePaintChange(role, `${preset.label}: ${selected.has(key) ? "added" : "removed"} ${key}. ${draft.hands.length} hands selected.`);
}

function setPaintedRangeHands(role, mode) {
  const elements = rangePaintElements(role);
  const preset = selectedPreset(role);
  const draft = rangePaintDraft(role, preset);
  if (!preset || !draft) {
    if (elements.status) elements.status.textContent = "No range is available to paint.";
    return;
  }
  draft.hands = mode === "all" ? [...rangeOrder] : [];
  draft.active = true;
  refreshAfterRangePaintChange(role, `${preset.label}: ${mode === "all" ? "selected all" : "cleared"}. ${draft.hands.length} hands selected.`);
}

function resetRangeEditorPreset(role) {
  const elements = rangePaintElements(role);
  const preset = selectedPreset(role);
  const draft = rangePaintDraft(role, preset);
  if (!preset || !draft) {
    if (elements.status) elements.status.textContent = "No range is available to reset.";
    return;
  }
  draft.hands = [...baseSelectedRangeKeys(role, preset)];
  draft.active = false;
  refreshAfterRangePaintChange(role, `Reset paint to ${preset.label}.`);
}

function selectedRangeKeys(role) {
  const preset = selectedPreset(role);
  const draft = rangePaintDraft(role, preset);
  if (draft?.active) return new Set(draft.hands);
  return baseSelectedRangeKeys(role, preset);
}

function selectedComboSummary(d, selected) {
  const cells = d?.range_cells || null;
  if (!cells) return null;
  let selectedPostCombos = 0;
  let totalPostCombos = 0;
  let selectedPreCombos = 0;
  let totalPreCombos = 0;
  for (const key of rangeOrder) {
    const preComboCount = preblockComboCount(key);
    const postComboCount = Number(cells[key]?.combo_count || 0);
    totalPreCombos += preComboCount;
    totalPostCombos += postComboCount;
    if (selected.has(key)) {
      selectedPreCombos += preComboCount;
      selectedPostCombos += postComboCount;
    }
  }
  return {selectedPreCombos, selectedPostCombos, totalPreCombos, totalPostCombos};
}

function preblockComboCount(key) {
  if (key.length === 2) return 6;
  return key.endsWith("s") ? 4 : 12;
}

function rangeClass(key) {
  if (key.length === 2) return "pair";
  return key.endsWith("s") ? "suited" : "offsuit";
}

function matrixKey(rowIndex, columnIndex) {
  if (rowIndex === columnIndex) return rankOrder[rowIndex] + rankOrder[columnIndex];
  if (rowIndex < columnIndex) return rankOrder[rowIndex] + rankOrder[columnIndex] + "s";
  return rankOrder[columnIndex] + rankOrder[rowIndex] + "o";
}

function renderRangeMatrices() {
  const perspectiveSection = document.getElementById("drawPressurePerspectiveSection");
  if (perspectiveSection) perspectiveSection.hidden = plotView !== "wetDynamic";
  const heroSection = document.getElementById("heroRangeSection");
  const villainSection = document.getElementById("villainRangeSection");
  if (heroSection) heroSection.classList.toggle("active-perspective", plotView === "wetDynamic" && drawPressureRole === "hero");
  if (villainSection) {
    villainSection.hidden = false;
    villainSection.classList.toggle("active-perspective", plotView === "wetDynamic" && drawPressureRole === "villain");
  }
  renderRangeMatrix("hero");
  renderRangeMatrix("villain");
}

function renderRangeMatrix(role) {
  const selected = selectedRangeKeys(role);
  const detailFlop = activeDetailFlop();
  const currentShowdownRows = detailFlop?._currentShowdowns || null;
  const futureShowdownRows = detailFlop?._futureShowdowns || null;
  const opponentSelected = selectedRangeKeys(opponentRole(role));
  const percentControl = role === "hero" ? controls.heroRangePercent : controls.villainRangePercent;
  const rangePreset = selectedPreset(role);
  const output = document.getElementById(role === "hero" ? "heroRangeOutput" : "villainRangeOutput");
  const countLabel = document.getElementById(role === "hero" ? "heroRangeCount" : "villainRangeCount");
  const matrix = document.getElementById(role === "hero" ? "heroRangeMatrix" : "villainRangeMatrix");
  const count = selected.size;
  const strengths = detailFlop ? detailFlop.hand_strengths || {} : {};
  const comboSummary = selectedComboSummary(detailFlop, selected);
  const rangeActive = ["gold", "wetDynamic"].includes(plotView);
  const richCellTooltips = Boolean(selectedFlop && detailFlop && rowKey(selectedFlop) === rowKey(detailFlop));
  const usesSlider = !rangePreset || rangePreset.mode === "slider";
  output.textContent = usesSlider ? `Top ${percentControl.value}%` : "Preset";
  percentControl.disabled = !rangeActive || !usesSlider;
  countLabel.innerHTML = "";
  if (!rangeActive) {
    countLabel.textContent = "Range controls apply to Gold and Draw Pressure";
  } else {
    const rankLine = document.createElement("div");
    const presetLabel = usesSlider ? rangePreset?.label || "Slider order" : rangePreset.label;
    const boardLabel = detailFlop
      ? `${selectedFlop ? "selected " : ""}${detailFlop.flop_key} ranks`
      : "no board selected";
    rankLine.textContent = usesSlider
      ? `Slider order: ${presetLabel} - top ${percentControl.value}% (${count}/${rangeOrder.length} hand cells) - ${boardLabel}`
      : `${presetLabel}: ${count}/${rangeOrder.length} hand cells - ${boardLabel}`;
    const comboLine = document.createElement("div");
    comboLine.className = "combo-compression";
    comboLine.textContent = comboSummary
      ? `range ${fmtCombos(comboSummary.selectedPreCombos)} pre -> ${fmtCombos(comboSummary.selectedPostCombos)} post (${pct(comboSummary.selectedPostCombos / Math.max(1, comboSummary.selectedPreCombos))} live) | board ${fmtCombos(comboSummary.totalPreCombos)} pre -> ${fmtCombos(comboSummary.totalPostCombos)} post (${pct(comboSummary.totalPostCombos / Math.max(1, comboSummary.totalPreCombos))} live)`
      : "range -- pre -> -- post (-- live) | board -- pre -> -- post (-- live)";
    countLabel.appendChild(rankLine);
    countLabel.appendChild(comboLine);
  }
  matrix.innerHTML = "";
  for (let row = 0; row < rankOrder.length; row++) {
    for (let col = 0; col < rankOrder.length; col++) {
      const key = matrixKey(row, col);
      const cellSelected = rangeActive && selected.has(key);
      const cell = document.createElement("div");
      cell.className = `range-cell ${rangeClass(key)}${cellSelected ? " selected" : ""}`;
      const label = document.createElement("span");
      label.className = "range-cell-label";
      label.textContent = key;
      cell.appendChild(label);
      const rankText = rangeRankText(role, key, rangePreset);
      const contribution = detailFlop?.range_cells?.[key] || null;
      const drawBadge = cellSelected ? drawOutBadgeSummary(contribution, detailFlop, key) : null;
      const drawLabels = richCellTooltips && detailFlop ? drawLabelsForContribution(contribution, true, detailFlop, key) : [];
      const titleFor = richCellTooltips
        ? (futureRows, exactRowsByCell = null) => rangeCellTooltip(role, key, detailFlop, contribution, strengths[key], currentShowdownRows, futureRows, opponentSelected, cellSelected, rankText, drawLabels, drawBadge, exactRowsByCell)
        : null;
      const titleText = () => titleFor
        ? titleFor(null)
        : rangeCellSummaryTitle(role, key, detailFlop, contribution, cellSelected, rankText, drawBadge);
      let badge = null;
      if (drawBadge) {
        badge = document.createElement("span");
        badge.className = `draw-out-badge ${drawBadge.badgeClass}`;
        badge.textContent = drawBadge.label;
        cell.appendChild(badge);
      }
      if (!rangeActive) {
        cell.style.background = "#1b242b";
        cell.style.borderColor = "#2d3942";
        cell.style.color = "#697782";
        cell.style.opacity = 0.55;
        cell.title = `${key}: range controls apply to Gold and Draw Pressure`;
      } else if (detailFlop && strengths[key] && cellSelected) {
        const strength = strengths[key].strength || 0;
        cell.style.background = strengthColor(strength);
        cell.style.borderColor = "#26343d";
        cell.style.color = strength > 0.72 ? "#1f262a" : "#ffffff";
        cell.title = titleText();
      } else if (detailFlop && !cellSelected) {
        cell.style.background = "#1b242b";
        cell.style.borderColor = "#2d3942";
        cell.style.color = "#697782";
        cell.style.opacity = 0.55;
        cell.title = titleText();
      } else if (detailFlop) {
        cell.title = titleText();
      } else {
        cell.title = rankText ? `${key}: ${rankText}` : key;
      }
      if (richCellTooltips && detailFlop && futureShowdownRows && rangeActive) {
        const enrichTitle = () => {
          cell.title = titleFor(futureShowdownRows);
          if (badge) badge.title = cell.title;
        };
        cell.addEventListener("mouseenter", enrichTitle);
        cell.addEventListener("focus", enrichTitle);
      }
      if (badge) badge.title = cell.title;
      matrix.appendChild(cell);
    }
  }
}

function rangeCellSummaryTitle(role, key, d, contribution, isInRange, rankText, drawBadge) {
  const roleLabel = displayRoleLabels[role] || role;
  if (!d) return rankText ? `${key}: ${rankText}` : key;
  const lines = [
    `${key} on ${d.flop_key}`,
    `${isInRange ? roleLabel + " range" : "outside " + roleLabel + " range"}${rankText ? ` - ${rankText}` : ""}`,
  ];
  if (!contribution || !contribution.combo_count) {
    lines.push("0 live combos after board removal");
    return lines.join("\n");
  }
  lines.push(`${fmtCombos(Number(contribution.combo_count || 0))} live combos after board removal`);
  const strength = Number(contribution.current_strength || 0);
  lines.push(`Current hand percentile: ${pct(strength)}`);
  if (drawBadge) lines.push(`Draw avg outs: ${drawBadge.label}`);
  lines.push("Click a flop for detailed hand matchup results.");
  return lines.join("\n");
}

function rangeCellTooltip(role, key, d, contribution, strengthEntry, currentShowdownRows, futureShowdownRows, opponentSelected, isInRange, rankText, drawLabels, drawBadge, exactRowsByCell = null) {
  const roleLabel = displayRoleLabels[role] || role;
  const otherLabel = displayRoleLabels[opponentRole(role)] || opponentRole(role);
  const lines = [
    `${key} on ${d.flop_key}`,
    `${isInRange ? roleLabel + " range" : "outside " + roleLabel + " range"}${rankText ? ` - ${rankText}` : ""}`,
  ];
  if (!contribution || !contribution.combo_count) {
    lines.push("0 live combos after board removal");
    lines.push("Blocked by the board for this flop.");
    return lines.join("\n");
  }

  const comboCount = Number(contribution.combo_count || 0);
  lines.push(`${fmtCombos(comboCount)} live combos after board removal`);
  const categoryText = comboMapText(contribution.current_category_combos || {}, comboCount);
  if (categoryText) lines.push(`Current made hand: ${categoryText}`);
  const drawText = drawLabels?.length ? drawLabels.join(", ") : "";
  if (drawText) {
    lines.push(`Draws: ${drawText}${drawBadge ? `; avg outs ${drawBadge.label}` : ""}`);
    const hitText = drawRunoutHitText(d, key, contribution);
    if (hitText) lines.push(`Draw runouts hit by river: ${hitText}`);
  }
  const strength = Number(strengthEntry?.strength ?? contribution.current_strength ?? 0);
  const category = strengthEntry?.category ? ` ${strengthEntry.category}` : "";
  lines.push(`Current hand percentile: ${pct(strength)}${category}`);

  if (!isInRange) {
    lines.push(`Not included in the selected ${roleLabel} preset.`);
  }

  if (plotView === "wetDynamic") {
    lines.push("Opponent range is not used in Draw Pressure.");
    return lines.join("\n");
  }

  const exactEquity = exactRowsByCell
    ? exactCellVsRangeEquity(key, exactRowsByCell, opponentSelected)
    : null;
  if (exactEquity && exactEquity.total) {
    const equity = (exactEquity.wins + 0.5 * exactEquity.ties) / exactEquity.total;
    lines.push(`Exact showdown equity vs selected ${otherLabel} range: ${pct(equity)}`);
    lines.push(`win ${pct(exactEquity.wins / exactEquity.total)} / tie ${pct(exactEquity.ties / exactEquity.total)} / lose ${pct(exactEquity.losses / exactEquity.total)}`);
    const suitBuckets = exactSuitBucketEquities(key, d, exactRowsByCell, opponentSelected);
    if (suitBuckets.length > 1) {
      lines.push("Suit split:");
      for (const bucket of suitBuckets) {
        const bucketEquity = (bucket.wins + 0.5 * bucket.ties) / bucket.total;
        lines.push(`  ${bucket.label}: ${pct(bucketEquity)} equity (${bucket.comboCount} combo${bucket.comboCount === 1 ? "" : "s"})`);
      }
    }
    lines.push(`${fmtWeighted(exactEquity.total)} exact turn-river combo matchups`);
    return lines.join("\n");
  }

  const futureEquity = futureShowdownRows
    ? futureCellVsRangeEquity(key, futureShowdownRows, opponentSelected)
    : null;
  if (futureEquity && futureEquity.total) {
    const equity = (futureEquity.wins + 0.5 * futureEquity.ties) / futureEquity.total;
    lines.push(`Showdown equity estimate vs selected ${otherLabel} range: ${pct(equity)}`);
    lines.push(`win ${pct(futureEquity.wins / futureEquity.total)} / tie ${pct(futureEquity.ties / futureEquity.total)} / lose ${pct(futureEquity.losses / futureEquity.total)}`);
    lines.push(`${fmtWeighted(futureEquity.total)} compact weighted future rows`);
    return lines.join("\n");
  }

  const showdown = currentShowdownRows
    ? cellVsRangeShowdownSummary(role, key, d, currentShowdownRows, opponentSelected)
    : null;
  if (showdown && showdown.total) {
    const good = (showdown.wins + showdown.ties) / showdown.total;
    const equity = (showdown.wins + 0.5 * showdown.ties) / showdown.total;
    lines.push(`Current same-category snapshot vs selected ${otherLabel}: good ${pct(good)}, equity ${pct(equity)}`);
    lines.push(`wins ${pct(showdown.wins / showdown.total)} / ties ${pct(showdown.ties / showdown.total)} / loses ${pct(showdown.losses / showdown.total)}`);
    const exactShare = showdown.exactTotal ? `${pct(showdown.exactTotal / showdown.total)} exact same-category` : "";
    const estimatedShare = showdown.estimatedTotal ? `${pct(showdown.estimatedTotal / showdown.total)} strength-estimated cross-category` : "";
    const sourceText = [exactShare, estimatedShare].filter(Boolean).join(", ");
    lines.push(`${fmtCombos(showdown.total)} live combo-class matchups${sourceText ? ` (${sourceText})` : ""}`);
  } else if (currentShowdownRows) {
    lines.push(`No live matchups versus the selected ${otherLabel} range.`);
  } else {
    lines.push(`Click a flop to load ${roleLabel} vs ${otherLabel} matchup results.`);
  }
  return lines.join("\n");
}

function cellVsRangeShowdownSummary(role, key, d, rows, otherSelected) {
  const cellIndex = (rangeRank.get(key) || 0) - 1;
  if (cellIndex < 0) return null;
  const cells = d.range_cells || {};
  const output = {wins: 0, ties: 0, losses: 0, total: 0, exactTotal: 0, estimatedTotal: 0};
  const exactOpponentIndexes = new Set();
  const ownCombos = Number(cells[key]?.combo_count || 0);
  if (!ownCombos) return output;
  const otherIndexes = selectedCellIndexes(otherSelected);
  for (const row of rows || []) {
    const [heroCellIndex, villainCellIndex, , heroWins, ties, villainWins] = row;
    if (role === "hero") {
      if (heroCellIndex !== cellIndex || !otherIndexes.has(villainCellIndex)) continue;
      exactOpponentIndexes.add(villainCellIndex);
      output.wins += heroWins || 0;
      output.ties += ties || 0;
      output.losses += villainWins || 0;
    } else {
      if (villainCellIndex !== cellIndex || !otherIndexes.has(heroCellIndex)) continue;
      exactOpponentIndexes.add(heroCellIndex);
      output.wins += villainWins || 0;
      output.ties += ties || 0;
      output.losses += heroWins || 0;
    }
  }
  output.exactTotal = output.wins + output.ties + output.losses;
  const ownStrength = cellStrengthScore(d, key);
  for (const otherKey of otherSelected) {
    const otherIndex = (rangeRank.get(otherKey) || 0) - 1;
    if (otherIndex < 0 || exactOpponentIndexes.has(otherIndex)) continue;
    const otherCombos = Number(cells[otherKey]?.combo_count || 0);
    if (!otherCombos) continue;
    const weight = ownCombos * otherCombos;
    const otherStrength = cellStrengthScore(d, otherKey);
    if (ownStrength > otherStrength + 1e-9) {
      output.wins += weight;
    } else if (ownStrength < otherStrength - 1e-9) {
      output.losses += weight;
    } else {
      output.ties += weight;
    }
    output.estimatedTotal += weight;
  }
  output.total = output.wins + output.ties + output.losses;
  return output;
}

function cellStrengthScore(d, key) {
  const handStrength = d.hand_strengths?.[key]?.strength;
  if (Number.isFinite(handStrength)) return Number(handStrength);
  const currentStrength = d.range_cells?.[key]?.current_strength;
  return Number.isFinite(currentStrength) ? Number(currentStrength) : 0;
}

function futureCellVsRangeEquity(key, rows, otherSelected) {
  const cellIndex = (rangeRank.get(key) || 0) - 1;
  if (cellIndex < 0 || !rows) return null;
  let rowCache = futureEquitySummaryCache.get(rows);
  if (!rowCache) {
    rowCache = new Map();
    futureEquitySummaryCache.set(rows, rowCache);
  }
  const opponentKeys = [...otherSelected].sort();
  const cacheKey = `${key}|${opponentKeys.join(",")}`;
  if (rowCache.has(cacheKey)) return rowCache.get(cacheKey);

  const rowsByCell = futureRowsByCell(rows);
  const ownRows = rowsByCell.get(cellIndex) || [];
  const opponentRows = [];
  for (const opponentKey of opponentKeys) {
    const opponentIndex = (rangeRank.get(opponentKey) || 0) - 1;
    if (opponentIndex < 0) continue;
    const cellRows = rowsByCell.get(opponentIndex);
    if (cellRows?.length) opponentRows.push(...cellRows);
  }

  const output = {wins: 0, ties: 0, losses: 0, total: 0};
  for (const own of ownRows) {
    for (const other of opponentRows) {
      if (own.runoutId !== null && other.runoutId !== null && own.runoutId !== other.runoutId) continue;
      if (own.holeMask && other.holeMask && (BigInt(own.holeMask) & BigInt(other.holeMask)) !== 0n) continue;
      const weight = own.weight * other.weight;
      if (!weight) continue;
      if (own.rank < other.rank) {
        output.wins += weight;
      } else if (own.rank > other.rank) {
        output.losses += weight;
      } else {
        output.ties += weight;
      }
      output.total += weight;
    }
  }
  rowCache.set(cacheKey, output);
  return output;
}

function exactCellVsRangeEquity(key, rowsByCell, otherSelected) {
  const cellIndex = (rangeRank.get(key) || 0) - 1;
  if (cellIndex < 0 || !rowsByCell) return null;
  let rowCache = exactFutureEquitySummaryCache.get(rowsByCell);
  if (!rowCache) {
    rowCache = new Map();
    exactFutureEquitySummaryCache.set(rowsByCell, rowCache);
  }
  const opponentKeys = [...otherSelected].sort();
  const cacheKey = `${key}|${opponentKeys.join(",")}`;
  if (rowCache.has(cacheKey)) return rowCache.get(cacheKey);

  const ownRows = rowsByCell.get(cellIndex) || [];
  const opponentRowsByRunout = opponentExactRowsByRunout(rowsByCell, opponentKeys);
  const output = compareExactRowsByRunout(ownRows, opponentRowsByRunout);
  rowCache.set(cacheKey, output);
  return output;
}

function exactSuitBucketEquities(key, d, rowsByCell, otherSelected) {
  const bucketInfo = flushPressureBucketInfo(d);
  if (!bucketInfo || !rowsByCell) return [];
  const cellIndex = (rangeRank.get(key) || 0) - 1;
  if (cellIndex < 0) return [];
  const opponentKeys = [...otherSelected].sort();
  const opponentRowsByRunout = opponentExactRowsByRunout(rowsByCell, opponentKeys);
  const buckets = new Map();
  for (const own of rowsByCell.get(cellIndex) || []) {
    const bucket = classifyFlushPressureBucket(own.holeMask, bucketInfo);
    if (!bucket) continue;
    const output = buckets.get(bucket.id) || {id: bucket.id, label: bucket.label, order: bucket.order, wins: 0, ties: 0, losses: 0, total: 0, combos: new Set()};
    output.combos.add(String(own.holeMask));
    addExactRowComparisons(output, own, opponentRowsByRunout.get(own.runoutKey) || []);
    buckets.set(bucket.id, output);
  }
  return [...buckets.values()]
    .filter(bucket => bucket.total > 0)
    .map(bucket => ({...bucket, comboCount: bucket.combos.size}))
    .sort((left, right) => left.order - right.order);
}

function opponentExactRowsByRunout(rowsByCell, opponentKeys) {
  const rowsByRunout = new Map();
  for (const opponentKey of opponentKeys) {
    const opponentIndex = (rangeRank.get(opponentKey) || 0) - 1;
    if (opponentIndex < 0) continue;
    for (const row of rowsByCell.get(opponentIndex) || []) {
      const list = rowsByRunout.get(row.runoutKey) || [];
      list.push(row);
      rowsByRunout.set(row.runoutKey, list);
    }
  }
  return rowsByRunout;
}

function compareExactRowsByRunout(ownRows, opponentRowsByRunout) {
  const output = {wins: 0, ties: 0, losses: 0, total: 0};
  for (const own of ownRows) {
    addExactRowComparisons(output, own, opponentRowsByRunout.get(own.runoutKey) || []);
  }
  return output;
}

function addExactRowComparisons(output, own, opponentRows) {
  for (const other of opponentRows) {
    if (own.holeMask && other.holeMask && (BigInt(own.holeMask) & BigInt(other.holeMask)) !== 0n) continue;
    const weight = own.weight || other.weight || 0;
    if (!weight) continue;
    if (own.rank < other.rank) {
      output.wins += weight;
    } else if (own.rank > other.rank) {
      output.losses += weight;
    } else {
      output.ties += weight;
    }
    output.total += weight;
  }
}

function futureRowsByCell(rows) {
  if (!rows) return new Map();
  if (futureRowsByCellCache.has(rows)) return futureRowsByCellCache.get(rows);
  const distributionRows = Array.isArray(rows) ? rows : rows.rows || [];
  const rowsByCell = new Map();
  for (const row of distributionRows) {
    const normalized = normalizeFutureShowdownRow(row);
    if (!normalized || !Number.isFinite(normalized.rank) || !normalized.weight) continue;
    const list = rowsByCell.get(normalized.cellIndex) || [];
    list.push(normalized);
    rowsByCell.set(normalized.cellIndex, list);
  }
  futureRowsByCellCache.set(rows, rowsByCell);
  return rowsByCell;
}

function normalizeFutureShowdownRow(row) {
  if (!Array.isArray(row) || row.length < 4) return null;
  const hasMask = row.length >= 5;
  return {
    cellIndex: Number(row[0]),
    categoryIndex: Number(row[1]),
    rank: Number(row[2]),
    holeMask: hasMask ? row[3] : 0,
    runoutId: row.length >= 6 ? row[4] : null,
    weight: Number(row[row.length - 1] || 0),
  };
}

function flushPressureBucketInfo(d) {
  const boardCards = parseFlopCards(d?.flop_key || "");
  if (!boardCards.length) return null;
  const suitCounts = {};
  for (const card of boardCards) {
    if (!card.suit) continue;
    suitCounts[card.suit] = (suitCounts[card.suit] || 0) + 1;
  }
  const entries = Object.entries(suitCounts).sort((left, right) => right[1] - left[1]);
  const [primarySuit, primaryCount] = entries[0] || [];
  if (!primarySuit || primaryCount < 2) return null;
  const sideSuit = entries.find(([, count]) => count === 1)?.[0] || "";
  return {primarySuit, primaryCount, sideSuit};
}

function parseFlopCards(flopKey) {
  return String(flopKey || "")
    .split(/\s+/)
    .filter(Boolean)
    .map(text => ({rank: text[0], suit: text.slice(1)}));
}

const straightWindows = [
  ["A", "2", "3", "4", "5"],
  ["2", "3", "4", "5", "6"],
  ["3", "4", "5", "6", "7"],
  ["4", "5", "6", "7", "8"],
  ["5", "6", "7", "8", "9"],
  ["6", "7", "8", "9", "T"],
  ["7", "8", "9", "T", "J"],
  ["8", "9", "T", "J", "Q"],
  ["9", "T", "J", "Q", "K"],
  ["T", "J", "Q", "K", "A"],
];

function straightWindowCount(d) {
  const ranks = new Set(parseFlopCards(d?.flop_key || "").map(card => card.rank));
  return straightWindows.filter(window => window.filter(rank => ranks.has(rank)).length >= 2).length;
}

function classifyFlushPressureBucket(holeMask, bucketInfo) {
  const cards = cardsFromMask(holeMask);
  if (cards.length !== 2) return null;
  const primaryCount = cards.filter(card => card.suit === bucketInfo.primarySuit).length;
  if (bucketInfo.primaryCount >= 3) {
    if (primaryCount >= 2) return {id: "made_flush", label: "Made flush", order: 0};
    if (primaryCount === 1) return {id: "one_card_flush_draw", label: "Flush draw", order: 1};
    return {id: "no_board_suit", label: "No flush draw", order: 2};
  }

  if (primaryCount >= 2) return {id: "flush_draw", label: "Flush draw", order: 0};
  if (primaryCount === 1) return {id: "one_card_backdoor", label: "Backdoor flush draw", order: 1};
  const sideCount = bucketInfo.sideSuit
    ? cards.filter(card => card.suit === bucketInfo.sideSuit).length
    : 0;
  if (sideCount >= 2) return {id: "side_suit_backdoor", label: "Backdoor flush draw", order: 2};
  return {id: "wrong_suit", label: "No flush draw", order: 3};
}

function cardsFromMask(mask) {
  let bits = BigInt(mask || 0);
  const cards = [];
  for (let rankIndex = 0; rankIndex < rankOrder.length; rankIndex++) {
    for (let suitIndex = 0; suitIndex < canonicalSuits.length; suitIndex++) {
      const bitIndex = BigInt(rankIndex * canonicalSuits.length + suitIndex);
      if (bits & (1n << bitIndex)) {
        cards.push({rank: rankOrder[rankIndex], suit: canonicalSuits[suitIndex]});
      }
    }
  }
  return cards;
}

function comboMapText(map, total = 0) {
  const entries = Object.entries(map || {})
    .filter(([, value]) => Number(value || 0) > 0)
    .sort(([left], [right]) => {
      const leftIndex = categoryOrder.indexOf(left);
      const rightIndex = categoryOrder.indexOf(right);
      return (leftIndex === -1 ? 999 : leftIndex) - (rightIndex === -1 ? 999 : rightIndex);
    });
  return entries
    .map(([category, value]) => {
      const count = Number(value || 0);
      const share = total ? ` ${pct(count / total)}` : "";
      return `${categoryLabel(category)} ${fmtCombos(count)}${share}`;
    })
    .join(", ");
}

function strengthColor(strength) {
  const clamped = Math.max(0, Math.min(1, strength));
  const stops = [
    [0.00, [68, 1, 84]],
    [0.25, [59, 82, 139]],
    [0.50, [33, 145, 140]],
    [0.75, [94, 201, 98]],
    [1.00, [253, 231, 37]],
  ];
  for (let i = 0; i < stops.length - 1; i++) {
    const [leftT, leftRgb] = stops[i];
    const [rightT, rightRgb] = stops[i + 1];
    if (clamped <= rightT) {
      const local = (clamped - leftT) / (rightT - leftT);
      const rgb = leftRgb.map((value, index) => Math.round(value + (rightRgb[index] - value) * local));
      return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
    }
  }
  return "rgb(253, 231, 37)";
}

function rangePlotContribution(d, key) {
  const cells = d?.range_cells;
  if (cells?.[key]) return cells[key];
  const matrix = d?.range_plot_matrix;
  const rank = rangeRank.get(key);
  if (!matrix || !rank) return null;
  const offset = (rank - 1) * rangePlotMatrixFieldCount;
  const comboCount = Number(matrix[offset] || 0);
  const gain = Number(matrix[offset + 1] || 0) / rangePlotGainScale;
  const nutGain = Number(matrix[offset + 2] || 0) / rangePlotGainScale;
  const drawCombos = {
    open_ender: Number(matrix[offset + 3] || 0),
    gutshot: Number(matrix[offset + 4] || 0),
    backdoor_straight: Number(matrix[offset + 5] || 0),
    flush_draw: Number(matrix[offset + 6] || 0),
    backdoor_flush: Number(matrix[offset + 7] || 0),
  };
  const currentStrength = Number(matrix[offset + 8] || 0) / rangePlotStrengthScale;
  const effectiveOuts = Number(matrix[offset + 9] || 0) / rangePlotOutsScale;
  if (!comboCount && !gain && !nutGain && !currentStrength && !effectiveOuts) return null;
  return {
    combo_count: comboCount,
    gain,
    nut_gain: nutGain,
    current_strength: currentStrength,
    effective_outs: effectiveOuts,
    current_draw_combos: drawCombos,
  };
}

function sumFutureContributions(d, selected) {
  let gain = 0;
  let nutGain = 0;
  let combos = 0;
  for (const key of selected) {
    const contribution = rangePlotContribution(d, key);
    if (!contribution) continue;
    gain += contribution.gain || 0;
    nutGain += contribution.nut_gain || 0;
    combos += contribution.combo_count || 0;
  }
  return {
    gain,
    nutGain,
    combos,
    effectiveOuts: 47 * gain,
    nutOuts: 47 * nutGain,
    nutPotential: gain > 0 ? Math.max(0, Math.min(1, nutGain / gain)) : 0,
  };
}

function rangeComposition(d, selected, options = {}) {
  const includeBands = options.includeBands !== false;
  const cells = d.range_cells || {};
  let combos = 0;
  let nutMadeCombos = 0;
  let flushCombos = 0;
  let flushAccessCombos = 0;
  const categories = {};
  const highCardDrawHitBands = {};
  const pairDrawHitBands = {};
  const tripsDrawHitBands = {};
  const pairBands = {};
  for (const key of selected) {
    const contribution = cells[key];
    if (!contribution) continue;
    const comboCount = contribution.combo_count || 0;
    combos += comboCount;
    nutMadeCombos += contribution.current_nut_made_combos || 0;
    const madeFlushCombos = contribution.current_flush_combos || 0;
    const drawCombos = currentDrawCombos(contribution, d, key);
    flushCombos += madeFlushCombos;
    flushAccessCombos += madeFlushCombos
      + Number(drawCombos.flush_draw || 0)
      + 0.25 * Number(drawCombos.backdoor_flush || 0);
    const categoryCombos = contribution.current_category_combos || {};
    for (const [category, count] of Object.entries(categoryCombos)) {
      categories[category] = (categories[category] || 0) + count;
    }
  }
  if (includeBands && Number(categories.high_card || 0) > 0) {
    for (const key of selected) {
      const contribution = cells[key];
      if (!contribution) continue;
      const exactHighCardBands = highCardDrawHitBandsForCell(d, key, contribution);
      for (const [band, count] of Object.entries(exactHighCardBands)) {
        highCardDrawHitBands[band] = (highCardDrawHitBands[band] || 0) + count;
      }
    }
  }
  if (includeBands && Number(categories.pair || 0) > 0) {
    for (const key of selected) {
      const contribution = cells[key];
      if (!contribution) continue;
      if (isPairedBoard(d)) {
        const exactPairDrawHitBands = pairDrawHitBandsForCell(d, key, contribution);
        for (const [band, count] of Object.entries(exactPairDrawHitBands)) {
          pairDrawHitBands[band] = (pairDrawHitBands[band] || 0) + count;
        }
      } else {
        const exactPairBands = pairBandsForCell(d, key, contribution);
        for (const [band, count] of Object.entries(exactPairBands)) {
          pairBands[band] = (pairBands[band] || 0) + count;
        }
      }
    }
  }
  if (includeBands && isTripsBoard(d) && Number(categories.trips || 0) > 0) {
    for (const key of selected) {
      const contribution = cells[key];
      if (!contribution) continue;
      const exactTripsDrawHitBands = tripsDrawHitBandsForCell(d, key, contribution);
      for (const [band, count] of Object.entries(exactTripsDrawHitBands)) {
        tripsDrawHitBands[band] = (tripsDrawHitBands[band] || 0) + count;
      }
    }
  }
  return {
    combos,
    nutMadeCombos,
    flushCombos,
    categories,
    highCardDrawHitBands,
    pairDrawHitBands,
    tripsDrawHitBands,
    pairBands,
    nutMadeShare: combos ? nutMadeCombos / combos : 0,
    flushShare: combos ? flushCombos / combos : 0,
    flushAccessShare: combos ? flushAccessCombos / combos : 0,
  };
}

function highCardDrawHitCategory(probability) {
  const value = Number(probability) || 0;
  if (value > 0.5) return "high_card_gt_50";
  if (value > 0.33) return "high_card_gt_33";
  if (value > 0.15) return "high_card_gt_15";
  return "air_lt_15";
}

function highCardDrawHitBandsForCell(d, key, contribution) {
  const highCardCombos = Number(contribution?.current_category_combos?.high_card || 0);
  if (!highCardCombos || !d || !key) return {};
  let boardCache = highCardDrawHitBandCache.get(d);
  if (!boardCache) {
    boardCache = new Map();
    highCardDrawHitBandCache.set(d, boardCache);
  }
  if (boardCache.has(key)) return boardCache.get(key);

  const board = parseBoardForDraws(d.flop_key);
  const bands = {};
  for (const combo of exactHoleCombosForDraws(key, board)) {
    const cards = [...board, ...combo];
    if (!isCurrentHighCardForDraws(cards)) continue;
    const probability = exactStraightFlushHitProbabilityByRiver(board, combo);
    const band = highCardDrawHitCategory(probability);
    bands[band] = (bands[band] || 0) + 1;
  }

  const exactTotal = Object.values(bands).reduce((sum, count) => sum + count, 0);
  if (exactTotal && exactTotal !== highCardCombos) {
    const scale = highCardCombos / exactTotal;
    for (const band of Object.keys(bands)) bands[band] *= scale;
  } else if (!exactTotal && highCardCombos) {
    bands.air_lt_15 = highCardCombos;
  }
  boardCache.set(key, bands);
  return bands;
}

function pairDrawHitBandsForCell(d, key, contribution) {
  const pairCombos = Number(contribution?.current_category_combos?.pair || 0);
  if (!pairCombos || !d || !key) return {};
  let boardCache = pairDrawHitBandCache.get(d);
  if (!boardCache) {
    boardCache = new Map();
    pairDrawHitBandCache.set(d, boardCache);
  }
  if (boardCache.has(key)) return boardCache.get(key);

  const board = parseBoardForDraws(d.flop_key);
  const bands = {};
  for (const combo of exactHoleCombosForDraws(key, board)) {
    const cards = [...board, ...combo];
    if (!isCurrentSinglePairForDraws(cards)) continue;
    const probability = exactStraightFlushHitProbabilityByRiver(board, combo);
    const band = highCardDrawHitCategory(probability);
    bands[band] = (bands[band] || 0) + 1;
  }

  const exactTotal = Object.values(bands).reduce((sum, count) => sum + count, 0);
  if (exactTotal && exactTotal !== pairCombos) {
    const scale = pairCombos / exactTotal;
    for (const band of Object.keys(bands)) bands[band] *= scale;
  } else if (!exactTotal && pairCombos) {
    bands.air_lt_15 = pairCombos;
  }
  boardCache.set(key, bands);
  return bands;
}

function tripsDrawHitBandsForCell(d, key, contribution) {
  const tripsCombos = Number(contribution?.current_category_combos?.trips || 0);
  if (!tripsCombos || !d || !key) return {};
  let boardCache = tripsDrawHitBandCache.get(d);
  if (!boardCache) {
    boardCache = new Map();
    tripsDrawHitBandCache.set(d, boardCache);
  }
  if (boardCache.has(key)) return boardCache.get(key);

  const board = parseBoardForDraws(d.flop_key);
  const bands = {};
  for (const combo of exactHoleCombosForDraws(key, board)) {
    const cards = [...board, ...combo];
    if (!isCurrentTripsForDraws(cards)) continue;
    const probability = exactStraightFlushHitProbabilityByRiver(board, combo);
    const band = highCardDrawHitCategory(probability);
    bands[band] = (bands[band] || 0) + 1;
  }

  const exactTotal = Object.values(bands).reduce((sum, count) => sum + count, 0);
  if (exactTotal && exactTotal !== tripsCombos) {
    const scale = tripsCombos / exactTotal;
    for (const band of Object.keys(bands)) bands[band] *= scale;
  } else if (!exactTotal && tripsCombos) {
    bands.air_lt_15 = tripsCombos;
  }
  boardCache.set(key, bands);
  return bands;
}

function exactStraightFlushHitProbabilityByRiver(board, combo) {
  const used = new Set([...board, ...combo].map(cardIdForDraws));
  const deck = fullDeckForDraws().filter(card => !used.has(cardIdForDraws(card)));
  let hits = 0;
  let total = 0;
  for (let left = 0; left < deck.length; left++) {
    for (let right = left + 1; right < deck.length; right++) {
      total += 1;
      const finalCards = [...board, ...combo, deck[left], deck[right]];
      if (hasStraightForDraws(finalCards.map(card => card.rank)) || hasFlushForDraws(finalCards)) {
        hits += 1;
      }
    }
  }
  return total ? hits / total : 0;
}

function pairBandsForCell(d, key, contribution) {
  const pairCombos = Number(contribution?.current_category_combos?.pair || 0);
  if (!pairCombos || !d || !key) return {};
  let boardCache = pairBandCache.get(d);
  if (!boardCache) {
    boardCache = new Map();
    pairBandCache.set(d, boardCache);
  }
  if (boardCache.has(key)) return boardCache.get(key);

  const board = parseBoardForDraws(d.flop_key);
  const bands = {};
  for (const combo of exactHoleCombosForDraws(key, board)) {
    const band = pairBandForExactCombo(board, combo);
    if (!band) continue;
    bands[band] = (bands[band] || 0) + 1;
  }

  const exactTotal = Object.values(bands).reduce((sum, count) => sum + count, 0);
  if (exactTotal && exactTotal !== pairCombos) {
    const scale = pairCombos / exactTotal;
    for (const band of Object.keys(bands)) bands[band] *= scale;
  }
  boardCache.set(key, bands);
  return bands;
}

function pairBandForExactCombo(board, combo) {
  const cards = [...board, ...combo];
  if (hasStraightForDraws(cards.map(card => card.rank)) || hasFlushForDraws(cards)) return null;
  const rankCounts = {};
  for (const card of cards) rankCounts[card.rank] = (rankCounts[card.rank] || 0) + 1;
  const pairRanks = Object.entries(rankCounts)
    .filter(([, count]) => count === 2)
    .map(([rank]) => rank);
  if (pairRanks.length !== 1 || Object.values(rankCounts).some(count => count > 2)) return null;

  const pairRank = pairRanks[0];
  const pairValue = rankValueForDraws(pairRank);
  const boardValues = [...new Set(board.map(card => rankValueForDraws(card.rank)).filter(Number.isFinite))]
    .sort((left, right) => right - left);
  const top = boardValues[0] || 0;
  const bottom = boardValues[boardValues.length - 1] || 0;
  const comboIsPocketPair = combo[0]?.rank === combo[1]?.rank && combo[0]?.rank === pairRank;
  if (comboIsPocketPair) {
    if (pairValue > top) return "overpair";
    if (pairValue < bottom) return "underpair";
    return "middle_pair";
  }
  const boardIndex = boardValues.indexOf(pairValue);
  if (boardIndex <= 0) return "top_pair";
  if (boardIndex === boardValues.length - 1) return "bottom_pair";
  return "middle_pair";
}

function finalCategoryShare(d, selected, categories) {
  const cells = d.range_cells || {};
  const categorySet = new Set(categories);
  let selectedWeight = 0;
  let totalWeight = 0;
  for (const key of selected) {
    const contribution = cells[key];
    if (!contribution) continue;
    const categoryWeights = contribution.final_category_weighted_combos || {};
    for (const [category, weight] of Object.entries(categoryWeights)) {
      const value = Number(weight) || 0;
      totalWeight += value;
      if (categorySet.has(category)) selectedWeight += value;
    }
  }
  return totalWeight ? selectedWeight / totalWeight : 0;
}

function futureFlushAccessShare(d, selected) {
  return finalCategoryShare(d, selected, ["straight_flush", "flush"]);
}

function rangeWetnessSummary(d, selected) {
  let combos = 0;
  let totalCombos = 0;
  let straightDrawCombos = 0;
  let flushDrawCombos = 0;
  for (const key of rangeOrder) {
    const contribution = rangePlotContribution(d, key);
    if (!contribution) continue;
    totalCombos += Number(contribution.combo_count || 0);
  }
  for (const key of selected) {
    const contribution = rangePlotContribution(d, key);
    if (!contribution) continue;
    const comboCount = Number(contribution.combo_count || 0);
    combos += comboCount;
    const drawCombos = currentDrawCombos(contribution, d, key);
    straightDrawCombos += Number(drawCombos.open_ender || 0)
      + 0.5 * Number(drawCombos.gutshot || 0)
      + 0.25 * Number(drawCombos.backdoor_straight || 0);
    flushDrawCombos += Number(drawCombos.flush_draw || 0)
      + 0.25 * Number(drawCombos.backdoor_flush || 0);
  }
  const future = sumFutureContributions(d, selected);
  const straightDrawShare = combos ? straightDrawCombos / combos : 0;
  const flushDrawShare = combos ? flushDrawCombos / combos : 0;
  const selectedShare = totalCombos ? combos / totalCombos : 0;
  const futureGainPerSelectedRange = selectedShare ? future.gain / selectedShare : 0;
  const nutShiftPerSelectedRange = selectedShare ? future.nutGain / selectedShare : 0;
  return {
    combos,
    futureGain: futureGainPerSelectedRange,
    nutGain: nutShiftPerSelectedRange,
    straightDrawShare,
    flushDrawShare,
    drawPressure: 0.50 * futureGainPerSelectedRange + 0.30 * straightDrawShare + 0.20 * flushDrawShare,
    nutShiftPressure: nutShiftPerSelectedRange,
  };
}

const drawTypeLabels = {
  open_ender: "OESD",
  gutshot: "Gutshot",
  flush_draw: "FD",
  backdoor_straight: "BDSD",
  backdoor_flush: "BDFD",
};
const primaryDrawTypes = ["open_ender", "gutshot", "flush_draw"];
const secondaryDrawTypes = ["backdoor_straight", "backdoor_flush"];
const deckSuits = ["\u25cf", "\u25cb", "\u25b3", "\u25c6"];

function drawLabelsForContribution(contribution, includeBackdoors = false, d = null, key = "") {
  const drawCombos = currentDrawCombos(contribution, d, key);
  const types = includeBackdoors ? [...primaryDrawTypes, ...secondaryDrawTypes] : primaryDrawTypes;
  return types
    .map(type => {
      const count = Number(drawCombos[type] || 0);
      return count ? `${drawTypeLabels[type]} ${fmtCombos(count)}` : "";
    })
    .filter(Boolean);
}

function drawOutBadgeSummary(contribution, d = null, key = "") {
  if (!contribution) return null;
  const drawCombos = currentDrawCombos(contribution, d, key);
  const comboCount = Number(contribution.combo_count || 0);
  if (!comboCount) return null;
  const openEnder = Number(drawCombos.open_ender || 0);
  const gutshot = Number(drawCombos.gutshot || 0);
  const flushDraw = Number(drawCombos.flush_draw || 0);
  const storedOuts = Number(drawCombos.draw_outs || 0);
  const totalOuts = storedOuts;
  if (!totalOuts) return null;
  const averageOuts = totalOuts / comboCount;
  const roundedOuts = averageOuts >= 10 ? Math.round(averageOuts) : Math.round(averageOuts * 10) / 10;
  const label = Number.isInteger(roundedOuts) ? String(roundedOuts) : roundedOuts.toFixed(1);
  const typeCount = [openEnder > 0, gutshot > 0, flushDraw > 0].filter(Boolean).length;
  const badgeClass = typeCount > 1 ? "combo" : flushDraw > 0 ? "fd" : "straight";
  return {label, badgeClass, averageOuts};
}

function currentDrawCombos(contribution, d = null, key = "") {
  let drawCombos = {};
  if (contribution?.current_draw_combos && Object.keys(contribution.current_draw_combos).length) {
    drawCombos = contribution.current_draw_combos;
  } else if (d && key && contribution) {
    drawCombos = drawRunoutSummary(d, key, contribution)?.counts || {};
  }
  if (!isMonotoneBoard(d) || !drawCombos.backdoor_flush) return drawCombos;
  const sanitized = {...drawCombos};
  delete sanitized.backdoor_flush;
  return sanitized;
}

function drawRunoutHitText(d, key, contribution) {
  const summary = drawRunoutSummary(d, key, contribution);
  if (!summary) return "";
  const types = isMonotoneBoard(d)
    ? [...primaryDrawTypes, "backdoor_straight"]
    : [...primaryDrawTypes, ...secondaryDrawTypes];
  return types
    .map(type => {
      const count = Number(summary.counts[type] || 0);
      const total = Number(summary.runoutTotals[type] || 0);
      if (!count || !total) return "";
      return `${drawTypeLabels[type]} ${pct(summary.runoutHits[type] / total)}`;
    })
    .filter(Boolean)
    .join(", ");
}

function isMonotoneBoard(d) {
  if (!d) return false;
  if (d.suit_texture === "monotone") return true;
  const board = parseBoardForDraws(d.flop_key || "");
  const counts = {};
  for (const card of board) counts[card.suit] = (counts[card.suit] || 0) + 1;
  return Math.max(0, ...Object.values(counts)) >= 3;
}

function isPairedBoard(d) {
  if (!d) return false;
  if (String(d.rank_structure || "").includes("paired") || String(d.pairedness || "").includes("paired")) return true;
  const ranks = String(d.flop_key || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(token => token[0]);
  return new Set(ranks).size < ranks.length;
}

function isTripsBoard(d) {
  if (!d) return false;
  if (String(d.rank_structure || "") === "trips" || String(d.suit_texture || "") === "trips") return true;
  const ranks = String(d.flop_key || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(token => token[0]);
  return ranks.length > 0 && new Set(ranks).size === 1;
}

function drawRunoutSummary(d, key, contribution) {
  if (!d || !key) return null;
  let boardCache = drawRunoutCache.get(d);
  if (!boardCache) {
    boardCache = new Map();
    drawRunoutCache.set(d, boardCache);
  }
  if (boardCache.has(key)) return boardCache.get(key);

  const board = parseBoardForDraws(d.flop_key);
  const combos = exactHoleCombosForDraws(key, board);
  const counts = {
    made_straight: 0,
    open_ender: 0,
    gutshot: 0,
    backdoor_straight: 0,
    made_flush: 0,
    flush_draw: 0,
    backdoor_flush: 0,
    any_draw: 0,
    draw_outs: 0,
  };
  const runoutHits = {};
  const runoutTotals = {};

  for (const combo of combos) {
    const cards = [...board, ...combo];
    const ranks = cards.map(card => card.rank);
    const straightClass = straightDrawClassForDraws(ranks);
    const flushClass = flushDrawClassForDraws(cards, board);
    const madeStraight = straightClass === "made";
    const madeFlush = flushClass === "made";
    let hasPrimaryDraw = false;

    if (madeStraight) {
      counts.made_straight += 1;
    } else if (straightClass === "open_ender" || straightClass === "gutshot") {
      counts[straightClass] += 1;
      hasPrimaryDraw = true;
      addDrawRunoutHits(runoutHits, runoutTotals, straightClass, board, combo, "straight");
    } else if (straightClass === "backdoor") {
      counts.backdoor_straight += 1;
      addDrawRunoutHits(runoutHits, runoutTotals, "backdoor_straight", board, combo, "straight");
    }

    if (madeFlush) {
      counts.made_flush += 1;
    } else if (flushClass === "flush_draw") {
      counts.flush_draw += 1;
      hasPrimaryDraw = true;
      addDrawRunoutHits(runoutHits, runoutTotals, "flush_draw", board, combo, "flush");
    } else if (flushClass === "backdoor_flush") {
      counts.backdoor_flush += 1;
      addDrawRunoutHits(runoutHits, runoutTotals, "backdoor_flush", board, combo, "flush");
    }

    if (hasPrimaryDraw) {
      counts.any_draw += 1;
      counts.draw_outs += turnOutCountForDraws(board, combo, madeStraight, madeFlush);
    }
  }

  const comboCount = Number(contribution?.combo_count || 0);
  const result = comboCount || combos.length
    ? {counts: pruneZeroValues(counts), runoutHits, runoutTotals}
    : null;
  boardCache.set(key, result);
  return result;
}

function addDrawRunoutHits(runoutHits, runoutTotals, type, board, combo, target) {
  const used = new Set([...board, ...combo].map(cardIdForDraws));
  const deck = fullDeckForDraws().filter(card => !used.has(cardIdForDraws(card)));
  for (let left = 0; left < deck.length; left++) {
    for (let right = left + 1; right < deck.length; right++) {
      const finalCards = [...board, ...combo, deck[left], deck[right]];
      const hit = target === "straight"
        ? hasStraightForDraws(finalCards.map(card => card.rank))
        : hasFlushForDraws(finalCards);
      runoutTotals[type] = (runoutTotals[type] || 0) + 1;
      if (hit) runoutHits[type] = (runoutHits[type] || 0) + 1;
    }
  }
}

function turnOutCountForDraws(board, combo, madeStraight, madeFlush) {
  const used = new Set([...board, ...combo].map(cardIdForDraws));
  let outs = 0;
  for (const turn of fullDeckForDraws()) {
    if (used.has(cardIdForDraws(turn))) continue;
    const turnCards = [...board, ...combo, turn];
    const completesStraight = !madeStraight && hasStraightForDraws(turnCards.map(card => card.rank));
    const completesFlush = !madeFlush && hasFlushForDraws(turnCards);
    if (completesStraight || completesFlush) outs += 1;
  }
  return outs;
}

function exactHoleCombosForDraws(key, board) {
  const blocked = new Set(board.map(cardIdForDraws));
  const ranks = key.length === 2 ? [key[0], key[1]] : [key[0], key[1]];
  const suitedness = key.length === 2 ? "pair" : key[2];
  const combos = [];
  for (const suitA of deckSuits) {
    for (const suitB of deckSuits) {
      if (suitedness === "pair" && suitA >= suitB) continue;
      if (suitedness === "s" && suitA !== suitB) continue;
      if (suitedness === "o" && suitA === suitB) continue;
      const cardA = {rank: ranks[0], suit: suitA};
      const cardB = {rank: ranks[1], suit: suitB};
      if (blocked.has(cardIdForDraws(cardA)) || blocked.has(cardIdForDraws(cardB))) continue;
      combos.push([cardA, cardB]);
    }
  }
  return combos;
}

function parseBoardForDraws(flopKey) {
  return String(flopKey || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(token => ({rank: token[0], suit: token.slice(1)}));
}

function fullDeckForDraws() {
  if (fullDeckForDraws.cache) return fullDeckForDraws.cache;
  fullDeckForDraws.cache = rankOrder.flatMap(rank => deckSuits.map(suit => ({rank, suit})));
  return fullDeckForDraws.cache;
}

function cardIdForDraws(card) {
  return `${card.rank}${card.suit}`;
}

function straightDrawClassForDraws(ranks) {
  const values = rankValuesForDraws(ranks);
  if (hasStraightValuesForDraws(values)) return "made";

  const missingRanks = new Set();
  for (let high = 14; high >= 5; high--) {
    const window = new Set([high - 4, high - 3, high - 2, high - 1, high]);
    const present = [...window].filter(value => values.has(value)).length;
    if (present === 4) {
      const missingValue = [...window].find(value => !values.has(value));
      missingRanks.add(missingValue === 1 ? 14 : missingValue);
    }
  }
  if (!missingRanks.size) {
    return hasThreeToStraightForDraws(values) ? "backdoor" : "none";
  }
  return missingRanks.size >= 2 ? "open_ender" : "gutshot";
}

function flushDrawClassForDraws(cards, board = []) {
  const boardCounts = {};
  for (const card of board || []) boardCounts[card.suit] = (boardCounts[card.suit] || 0) + 1;
  const boardIsMonotone = Math.max(0, ...Object.values(boardCounts)) >= 3;
  const counts = {};
  for (const card of cards) counts[card.suit] = (counts[card.suit] || 0) + 1;
  const maxCount = Math.max(0, ...Object.values(counts));
  if (maxCount >= 5) return "made";
  if (maxCount === 4) return "flush_draw";
  if (boardIsMonotone) return "none";
  if (maxCount === 3) return "backdoor_flush";
  return "none";
}

function hasStraightForDraws(ranks) {
  return hasStraightValuesForDraws(rankValuesForDraws(ranks));
}

function rankValuesForDraws(ranks) {
  const values = new Set(ranks.map(rankValueForDraws).filter(value => Number.isFinite(value)));
  if (values.has(14)) values.add(1);
  return values;
}

function rankValueForDraws(rank) {
  const index = rankOrder.indexOf(rank);
  return index === -1 ? NaN : 14 - index;
}

function hasStraightValuesForDraws(values) {
  for (let high = 14; high >= 5; high--) {
    if ([high - 4, high - 3, high - 2, high - 1, high].every(value => values.has(value))) return true;
  }
  return false;
}

function hasThreeToStraightForDraws(values) {
  for (let high = 14; high >= 5; high--) {
    const present = [high - 4, high - 3, high - 2, high - 1, high].filter(value => values.has(value)).length;
    if (present >= 3) return true;
  }
  return false;
}

function hasFlushForDraws(cards) {
  const counts = {};
  for (const card of cards) counts[card.suit] = (counts[card.suit] || 0) + 1;
  return Object.values(counts).some(count => count >= 5);
}

function isCurrentHighCardForDraws(cards) {
  const rankCounts = {};
  for (const card of cards) rankCounts[card.rank] = (rankCounts[card.rank] || 0) + 1;
  if (Object.values(rankCounts).some(count => count >= 2)) return false;
  if (hasStraightForDraws(cards.map(card => card.rank))) return false;
  if (hasFlushForDraws(cards)) return false;
  return true;
}

function isCurrentSinglePairForDraws(cards) {
  const rankCounts = {};
  for (const card of cards) rankCounts[card.rank] = (rankCounts[card.rank] || 0) + 1;
  const counts = Object.values(rankCounts);
  if (counts.filter(count => count === 2).length !== 1) return false;
  if (counts.some(count => count > 2)) return false;
  if (hasStraightForDraws(cards.map(card => card.rank))) return false;
  if (hasFlushForDraws(cards)) return false;
  return true;
}

function isCurrentTripsForDraws(cards) {
  const rankCounts = {};
  for (const card of cards) rankCounts[card.rank] = (rankCounts[card.rank] || 0) + 1;
  const counts = Object.values(rankCounts);
  if (counts.filter(count => count === 3).length !== 1) return false;
  if (counts.some(count => count > 3)) return false;
  if (counts.filter(count => count === 2).length) return false;
  if (hasStraightForDraws(cards.map(card => card.rank))) return false;
  if (hasFlushForDraws(cards)) return false;
  return true;
}

function pruneZeroValues(values) {
  return Object.fromEntries(Object.entries(values).filter(([, value]) => value));
}

function drawBreakdown(d, selected, includeBackdoors = false) {
  const cells = d.range_cells || {};
  const types = includeBackdoors ? [...primaryDrawTypes, ...secondaryDrawTypes] : primaryDrawTypes;
  const totals = {};
  let combos = 0;
  let anyDrawCombos = 0;
  const holdings = [];
  for (const key of selected) {
    const contribution = cells[key];
    if (!contribution) continue;
    const comboCount = contribution.combo_count || 0;
    combos += comboCount;
    const drawCombos = currentDrawCombos(contribution, d, key);
    const labels = drawLabelsForContribution(contribution, includeBackdoors, d, key);
    let typedDrawCombos = 0;
    for (const type of types) {
      const count = Number(drawCombos[type] || 0);
      if (!count) continue;
      totals[type] = (totals[type] || 0) + count;
      typedDrawCombos += count;
    }
    const anyDraw = Number(drawCombos.any_draw || 0) || Math.min(comboCount, typedDrawCombos);
    anyDrawCombos += anyDraw;
    if (labels.length) {
      holdings.push({key, comboCount, anyDraw, typedDrawCombos, labels});
    }
  }
  holdings.sort((a, b) => (b.anyDraw / Math.max(1, b.comboCount)) - (a.anyDraw / Math.max(1, a.comboCount)) || b.typedDrawCombos - a.typedDrawCombos || rangeOrder.indexOf(a.key) - rangeOrder.indexOf(b.key));
  return {combos, anyDrawCombos, totals, holdings};
}

function drawBreakdownHtml(label, breakdown, compact = false) {
  const limit = compact ? 7 : 18;
  const visible = breakdown.holdings.slice(0, limit);
  const hidden = breakdown.holdings.length - visible.length;
  const typeSummary = primaryDrawTypes
    .map(type => {
      const count = breakdown.totals[type] || 0;
      return count ? `${drawTypeLabels[type]} ${pct(count / Math.max(1, breakdown.combos))}` : "";
    })
    .filter(Boolean)
    .join(" / ");
  const holdingText = visible.length
    ? visible.map(item => `<span class="draw-hand"><b>${item.key}</b> ${item.labels.join(", ")}</span>`).join(" ")
    : `<span class="spectrum-note">No front-door straight or flush draws in selected range.</span>`;
  return `<div class="draw-block">
    <div class="spectrum-head">
      <span>${label} draws</span>
      <span class="spectrum-total">${pct(breakdown.anyDrawCombos / Math.max(1, breakdown.combos))}</span>
    </div>
    ${typeSummary ? `<div class="spectrum-note">${typeSummary}</div>` : ""}
    <div class="draw-list">${holdingText}${hidden > 0 ? ` <span class="spectrum-note">+${hidden} more</span>` : ""}</div>
  </div>`;
}

function futureCategoryBreakdown(d, selected, keyName) {
  const cells = d.range_cells || {};
  const categories = {};
  let total = 0;
  for (const key of selected) {
    const contribution = cells[key];
    if (!contribution) continue;
    const categoryOuts = contribution[keyName] || {};
    for (const [category, outs] of Object.entries(categoryOuts)) {
      const value = Number(outs) || 0;
      if (!value) continue;
      categories[category] = (categories[category] || 0) + value;
      total += value;
    }
  }
  return {categories, total};
}

function finalCategoryFrequency(d, selected) {
  const cells = d.range_cells || {};
  const categories = {};
  let total = 0;
  for (const key of selected) {
    const contribution = cells[key];
    if (!contribution) continue;
    const categoryWeights = contribution.final_category_weighted_combos || {};
    for (const [category, weight] of Object.entries(categoryWeights)) {
      const value = Number(weight) || 0;
      if (!value) continue;
      categories[category] = (categories[category] || 0) + value;
      total += value;
    }
  }
  return {categories, total};
}

function currentSameCategoryShowdowns(rows, heroSelected, villainSelected) {
  const heroIndexes = selectedCellIndexes(heroSelected);
  const villainIndexes = selectedCellIndexes(villainSelected);
  const output = {};
  for (const category of categoryOrder) {
    output[category] = {hero: 0, tie: 0, villain: 0, total: 0};
  }
  for (const row of rows || []) {
    const [heroCellIndex, villainCellIndex, categoryIndex, heroWins, ties, villainWins] = row;
    if (!heroIndexes.has(heroCellIndex) || !villainIndexes.has(villainCellIndex)) continue;
    const category = categoryOrder[categoryIndex];
    const bucket = output[category];
    bucket.hero += heroWins || 0;
    bucket.tie += ties || 0;
    bucket.villain += villainWins || 0;
    bucket.total += (heroWins || 0) + (ties || 0) + (villainWins || 0);
  }
  return output;
}

async function loadCurrentShowdowns(d) {
  const path = d.current_showdown_file;
  if (!path) return null;
  if (currentShowdownCache.has(path)) return currentShowdownCache.get(path);
  const promise = fetch(path)
    .then(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .catch(error => {
      console.error(error);
      return null;
    });
  currentShowdownCache.set(path, promise);
  return promise;
}

function attachShowdownData(d, currentRows = null, futureRows = null) {
  if (!d) return d;
  if (currentRows) d._currentShowdowns = currentRows;
  if (futureRows) d._futureShowdowns = futureRows;
  return d;
}

function boardDetailKey(d) {
  const match = String(d?.details_file || "").match(/([^/\\]+)\.json$/);
  return match ? match[1] : "";
}

async function loadBoardDetails(d) {
  if (d.range_cells && d.hand_strengths) return d;
  const path = d.details_file;
  if (!path) return d;
  if (boardDetailCache.has(path)) return boardDetailCache.get(path);
  const url = path.includes("?") ? `${path}&v=${boardDetailVersion}` : `${path}?v=${boardDetailVersion}`;
  const promise = fetch(url)
    .then(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then(detail => {
      Object.assign(d, detail || {});
      return d;
    })
    .catch(error => {
      console.error(error);
      return d;
    });
  boardDetailCache.set(path, promise);
  return promise;
}

function hasBoardDetails(d) {
  return Boolean(d?.range_cells && d?.hand_strengths);
}

function hasRangePlotDetails(d) {
  return Boolean(d?.range_plot_matrix || d?.range_cells);
}

async function loadRangePlotData() {
  if (rangePlotDataLoaded) return true;
  if (rangePlotDataPromise) return rangePlotDataPromise;
  const url = `range_plot_data.json?v=${rangePlotDataVersion}`;
  rangePlotDataPromise = fetch(url)
    .then(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then(compact => {
      const boards = compact?.boards || {};
      rangePlotGainScale = Number(compact?.gain_scale || rangePlotGainScale) || rangePlotGainScale;
      rangePlotStrengthScale = Number(compact?.strength_scale || rangePlotStrengthScale) || rangePlotStrengthScale;
      rangePlotOutsScale = Number(compact?.outs_scale || rangePlotOutsScale) || rangePlotOutsScale;
      rangePlotMatrixFieldCount = Number(compact?.field_count || rangePlotMatrixFieldCount) || rangePlotMatrixFieldCount;
      let loaded = 0;
      for (const row of data) {
        const matrix = boards[boardDetailKey(row)];
        if (!matrix) continue;
        row.range_plot_matrix = matrix;
        loaded++;
      }
      rangePlotDataLoaded = loaded > 0;
      boardDetailsLoadedCount = loaded;
      rangeCacheKey = "";
      rangeCacheRows = null;
      return rangePlotDataLoaded;
    })
    .catch(error => {
      console.error(error);
      return false;
    });
  return rangePlotDataPromise;
}

function delay(ms) {
  return new Promise(resolve => window.setTimeout(resolve, ms));
}

async function preloadAllBoardDetails(options = {}) {
  if (allBoardDetailsLoaded) return;
  if (detailPreloadStarted) return;
  const {
    concurrency = 8,
    delayMs = 0,
    updateEvery = 25,
    redraw = false,
  } = options;
  detailPreloadStarted = true;
  const total = data.length;
  let nextIndex = 0;
  let completed = 0;
  const worker = async () => {
    while (nextIndex < total) {
      const index = nextIndex++;
      await loadBoardDetails(data[index]);
      completed++;
      boardDetailsLoadedCount = data.reduce((count, row) => count + (hasBoardDetails(row) ? 1 : 0), 0);
      if (completed % updateEvery === 0 || completed === total) {
        const detailPercent = total ? completed / total : 1;
        const percent = 45 + Math.round(45 * detailPercent);
        setLoadingProgress(percent, `Loading range details ${completed} / ${total}...`);
        clearRangeDerivedCaches();
        if (redraw && ["gold", "wetDynamic"].includes(plotView)) {
          const now = performance.now();
          if (completed === total || now - lastBackgroundDetailDraw > 750) {
            lastBackgroundDetailDraw = now;
            draw();
          }
        }
      }
      if (delayMs) await delay(delayMs);
    }
  };
  await Promise.all(Array.from({length: Math.min(concurrency, total)}, worker));
  allBoardDetailsLoaded = true;
  boardDetailsLoadedCount = data.length;
  rangeCacheKey = "";
  rangeCacheRows = null;
  if (redraw && ["gold", "wetDynamic"].includes(plotView)) draw();
}

function shouldPreloadBoardDetails() {
  const params = new URLSearchParams(window.location.search);
  return params.has("preloadDetails");
}

function startBackgroundBoardDetailLoad() {
  preloadAllBoardDetails({
    concurrency: 1,
    delayMs: 50,
    updateEvery: 25,
    redraw: true,
  });
}

function selectedCellIndexes(selected) {
  return new Set([...selected].map(key => (rangeRank.get(key) || 1) - 1));
}

function futureSameCategoryShowdowns(rows, heroSelected, villainSelected) {
  const heroIndexes = selectedCellIndexes(heroSelected);
  const villainIndexes = selectedCellIndexes(villainSelected);
  const matrixRows = Array.isArray(rows) ? null : rows && rows.matrix_rows;
  const distributionRows = Array.isArray(rows) ? rows : rows && rows.rows ? rows.rows : [];
  const heroByCategory = categoryOrder.map(() => []);
  const villainByCategory = categoryOrder.map(() => []);
  const output = {};
  for (const category of categoryOrder) {
    output[category] = {hero: 0, tie: 0, villain: 0, total: 0};
  }
  for (const row of matrixRows || []) {
    const [heroCellIndex, villainCellIndex, categoryIndex, heroWins, ties, villainWins] = row;
    if (!heroIndexes.has(heroCellIndex) || !villainIndexes.has(villainCellIndex)) continue;
    const category = categoryOrder[categoryIndex];
    const bucket = output[category];
    bucket.hero += heroWins || 0;
    bucket.tie += ties || 0;
    bucket.villain += villainWins || 0;
    bucket.total += (heroWins || 0) + (ties || 0) + (villainWins || 0);
  }

  for (const row of distributionRows || []) {
    const cellIndex = row[0];
    const categoryIndex = row[1];
    if (matrixRows && output[categoryOrder[categoryIndex]] && output[categoryOrder[categoryIndex]].total) continue;
    const rank = row[2];
    const hasMask = row.length >= 5;
    const holeMask = hasMask ? row[3] : 0;
    const runoutId = row.length >= 6 ? row[4] : null;
    const weight = row[row.length - 1];
    if (heroIndexes.has(cellIndex)) {
      heroByCategory[categoryIndex].push({rank, holeMask, runoutId, weight});
    }
    if (villainIndexes.has(cellIndex)) {
      villainByCategory[categoryIndex].push({rank, holeMask, runoutId, weight});
    }
  }

  categoryOrder.forEach((category, categoryIndex) => {
    const bucket = output[category];
    for (const hero of heroByCategory[categoryIndex]) {
      for (const villain of villainByCategory[categoryIndex]) {
        if (hero.runoutId !== null && villain.runoutId !== null && hero.runoutId !== villain.runoutId) continue;
        if (hero.holeMask && villain.holeMask && (BigInt(hero.holeMask) & BigInt(villain.holeMask)) !== 0n) continue;
        const heroRank = hero.rank;
        const villainRank = villain.rank;
        const heroWeight = hero.weight;
        const villainWeight = villain.weight;
        const weight = heroWeight * villainWeight;
        if (!weight) continue;
        if (heroRank < villainRank) {
          bucket.hero += weight;
        } else if (heroRank > villainRank) {
          bucket.villain += weight;
        } else {
          bucket.tie += weight;
        }
        bucket.total += weight;
      }
    }
  });
  return output;
}

async function loadFutureShowdowns(d) {
  const path = d.future_showdown_file;
  if (!path) return null;
  if (futureShowdownCache.has(path)) return futureShowdownCache.get(path);
  const url = path.includes("?") ? `${path}&v=${futureShowdownVersion}` : `${path}?v=${futureShowdownVersion}`;
  const promise = fetch(url)
    .then(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .catch(error => {
      console.error(error);
      return null;
    });
  futureShowdownCache.set(path, promise);
  return promise;
}

async function loadExactFutureRows(d) {
  const path = exactFutureContributorPath(d);
  if (!path) return null;
  if (exactFutureRowsCache.has(path)) return exactFutureRowsCache.get(path);
  const promise = fetch(path)
    .then(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.text();
    })
    .then(text => parseExactFutureRows(text))
    .catch(error => {
      console.error(error);
      return null;
    });
  exactFutureRowsCache.set(path, promise);
  return promise;
}

function exactFutureContributorPath(d) {
  const candidatePaths = [d?.future_showdown_file, d?.details_file].filter(Boolean);
  for (const path of candidatePaths) {
    const match = String(path).match(/([^/\\]+)\.json$/);
    if (match) return `../../per_flop/${match[1]}/future_runout_contributors.csv`;
  }
  const key = rowKey(d);
  return key ? `../../per_flop/${key}/future_runout_contributors.csv` : "";
}

function parseExactFutureRows(text) {
  const lines = String(text || "").split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return new Map();
  const header = splitCsvLine(lines[0]);
  const index = Object.fromEntries(header.map((name, i) => [name, i]));
  const rowsByCell = new Map();
  for (let lineIndex = 1; lineIndex < lines.length; lineIndex++) {
    const row = splitCsvLine(lines[lineIndex]);
    const cell = rangeCellKeyFromCsv(row[index.rank_key], row[index.preflop_suit_class]);
    const cellIndex = (rangeRank.get(cell) || 0) - 1;
    if (cellIndex < 0) continue;
    const runoutKey = row[index.runout_key] || "";
    const rank = Number(row[index.final_index]);
    const weight = Number(row[index.exact_runout_probability] || 0);
    if (!Number.isFinite(rank) || !weight || !runoutKey) continue;
    const handIds = String(row[index.example_hand_ids] || "").split(";").filter(Boolean);
    for (const handId of handIds) {
      const holeMask = maskForHandId(handId);
      if (!holeMask) continue;
      const list = rowsByCell.get(cellIndex) || [];
      list.push({rank, runoutKey, holeMask, weight});
      rowsByCell.set(cellIndex, list);
    }
  }
  return rowsByCell;
}

function splitCsvLine(line) {
  return String(line || "").split(",");
}

function rangeCellKeyFromCsv(rankKey, preflopSuitClass) {
  if (preflopSuitClass === "pair") return rankKey;
  if (preflopSuitClass === "suited") return `${rankKey}s`;
  if (preflopSuitClass === "offsuit") return `${rankKey}o`;
  return "";
}

function maskForHandId(handId) {
  const text = String(handId || "").trim();
  if (text.length < 4) return 0;
  let mask = 0n;
  for (let index = 0; index + 1 < text.length; index += 2) {
    const rank = text[index];
    const suit = text[index + 1];
    const rankIndex = rankOrder.indexOf(rank);
    const suitIndex = canonicalSuits.indexOf(suit);
    if (rankIndex < 0 || suitIndex < 0) return 0;
    mask |= 1n << BigInt(rankIndex * canonicalSuits.length + suitIndex);
  }
  return Number(mask);
}

function decodeGoldCurrentEdges(d) {
  if (!d.gold_current_edge_grid) return null;
  if (d._goldCurrentEdges) return d._goldCurrentEdges;
  const raw = atob(d.gold_current_edge_grid);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  d._goldCurrentEdges = new Int16Array(bytes.buffer);
  return d._goldCurrentEdges;
}

function goldCurrentMatchupEdge(d) {
  const edges = decodeGoldCurrentEdges(d);
  if (!edges) return null;
  if (!rangeUsesTopStrengthSlider("hero") || !rangeUsesTopStrengthSlider("villain")) return null;
  const heroPercent = Math.max(1, Math.min(100, Number(controls.heroRangePercent.value)));
  const villainPercent = Math.max(1, Math.min(100, Number(controls.villainRangePercent.value)));
  return edges[(heroPercent - 1) * 100 + (villainPercent - 1)] / 10000;
}

function matchupOuts(d, heroSelected, villainSelected) {
  let heroClean = 0;
  let villainClean = 0;
  let dirtyShared = 0;
  let totalWeight = 0;
  for (const heroKey of heroSelected) {
    const hero = rangePlotContribution(d, heroKey);
    if (!hero || !hero.combo_count) continue;
    for (const villainKey of villainSelected) {
      const villain = rangePlotContribution(d, villainKey);
      if (!villain || !villain.combo_count) continue;
      const weight = hero.combo_count * villain.combo_count;
      const heroStrength = hero.current_strength || 0;
      const villainStrength = villain.current_strength || 0;
      const heroOuts = hero.effective_outs || 0;
      const villainOuts = villain.effective_outs || 0;
      const shared = Math.min(heroOuts, villainOuts);
      dirtyShared += shared * weight;
      if (heroStrength <= villainStrength) {
        heroClean += Math.max(0, heroOuts - shared) * weight;
      }
      if (villainStrength <= heroStrength) {
        villainClean += Math.max(0, villainOuts - shared) * weight;
      }
      totalWeight += weight;
    }
  }
  if (!totalWeight) {
    return {heroClean: 0, villainClean: 0, dirtyShared: 0, net: 0};
  }
  heroClean /= totalWeight;
  villainClean /= totalWeight;
  dirtyShared /= totalWeight;
  return {
    heroClean,
    villainClean,
    dirtyShared,
    net: heroClean - villainClean,
  };
}

function applyRanges(d, heroSelected, villainSelected) {
  if (plotView === "wetDynamic") {
    const heroWetness = rangeWetnessSummary(d, heroSelected);
    const villainWetness = rangeWetnessSummary(d, villainSelected);
    const activeWetness = drawPressureRole === "villain" ? villainWetness : heroWetness;
    return {
      ...d,
      hero_draw_pressure: heroWetness.drawPressure,
      villain_draw_pressure: villainWetness.drawPressure,
      range_draw_pressure: activeWetness.drawPressure,
      hero_nut_shift_pressure: heroWetness.nutShiftPressure,
      villain_nut_shift_pressure: villainWetness.nutShiftPressure,
      range_nut_shift_pressure: activeWetness.nutShiftPressure,
    };
  }
  const heroStrength = rangeStrengthSummary(d, heroSelected);
  const villainStrength = rangeStrengthSummary(d, villainSelected);
  const goldCurrentEdge = goldCurrentMatchupEdge(d);
  const heroFuture = sumFutureContributions(d, heroSelected);
  const villainFuture = sumFutureContributions(d, villainSelected);
  const heroAccess = rangeComposition(d, heroSelected, {includeBands: false});
  const villainAccess = rangeComposition(d, villainSelected, {includeBands: false});
  const heroFutureFlushAccess = futureFlushAccessShare(d, heroSelected);
  const villainFutureFlushAccess = futureFlushAccessShare(d, villainSelected);
  const heroWetness = rangeWetnessSummary(d, heroSelected);
  const villainWetness = rangeWetnessSummary(d, villainSelected);
  const dirtyOuts = yMode === "dirtyShared" ? matchupOuts(d, heroSelected, villainSelected) : null;
  return {
    ...d,
    effective_outs: heroFuture.effectiveOuts - villainFuture.effectiveOuts,
    raw_effective_outs_edge: heroFuture.effectiveOuts - villainFuture.effectiveOuts,
    hero_clean_outs: dirtyOuts ? dirtyOuts.heroClean : 0,
    villain_clean_outs: dirtyOuts ? dirtyOuts.villainClean : 0,
    dirty_shared_outs: dirtyOuts ? dirtyOuts.dirtyShared : Math.min(heroFuture.effectiveOuts, villainFuture.effectiveOuts),
    hero_effective_outs: heroFuture.effectiveOuts,
    villain_effective_outs: villainFuture.effectiveOuts,
    hero_nut_outs: heroFuture.nutOuts,
    villain_nut_outs: villainFuture.nutOuts,
    nut_outs_edge: heroFuture.nutOuts - villainFuture.nutOuts,
    hero_current_nut_made_share: heroAccess.nutMadeShare,
    villain_current_nut_made_share: villainAccess.nutMadeShare,
    current_nut_made_edge: heroAccess.nutMadeShare - villainAccess.nutMadeShare,
    hero_flush_share: heroAccess.flushShare,
    villain_flush_share: villainAccess.flushShare,
    hero_flush_access_share: heroAccess.flushAccessShare,
    villain_flush_access_share: villainAccess.flushAccessShare,
    flush_access_edge: heroAccess.flushAccessShare - villainAccess.flushAccessShare,
    hero_future_flush_access_share: heroFutureFlushAccess,
    villain_future_flush_access_share: villainFutureFlushAccess,
    future_flush_access_edge: heroFutureFlushAccess - villainFutureFlushAccess,
    hero_draw_pressure: heroWetness.drawPressure,
    villain_draw_pressure: villainWetness.drawPressure,
    range_draw_pressure: heroWetness.drawPressure,
    hero_nut_shift_pressure: heroWetness.nutShiftPressure,
    villain_nut_shift_pressure: villainWetness.nutShiftPressure,
    range_nut_shift_pressure: heroWetness.nutShiftPressure,
    nut_outs: villainFuture.nutOuts,
    nut_out_potential: villainFuture.nutPotential,
    category_improvement_gain: Math.max(heroFuture.gain, villainFuture.gain),
    hero_strength_sum: heroStrength.weightedSum,
    villain_strength_sum: villainStrength.weightedSum,
    hero_strength_avg: heroStrength.avg,
    villain_strength_avg: villainStrength.avg,
    range_strength_sum_edge: heroStrength.weightedSum - villainStrength.weightedSum,
    legacy_range_advantage: heroStrength.comboTotal && villainStrength.comboTotal ? heroStrength.avg - villainStrength.avg : d.range_advantage || 0,
    range_advantage: goldCurrentEdge === null
      ? (heroStrength.comboTotal && villainStrength.comboTotal ? heroStrength.avg - villainStrength.avg : d.range_advantage || 0)
      : goldCurrentEdge,
  };
}

function rangeStrengthSummary(d, selected) {
  const strengths = d.hand_strengths || {};
  let weightedSum = 0;
  let comboTotal = 0;
  for (const key of selected) {
    const entry = strengths[key];
    const compact = entry ? null : rangePlotContribution(d, key);
    if (!entry && !compact) continue;
    const combos = entry ? entry.combo_count || 0 : compact.combo_count || 0;
    const strength = entry ? entry.strength || 0 : compact.current_strength || 0;
    weightedSum += strength * combos;
    comboTotal += combos;
  }
  return {
    weightedSum,
    comboTotal,
    avg: comboTotal ? weightedSum / comboTotal : 0,
  };
}

function rangedData() {
  if (!["gold", "wetDynamic"].includes(plotView)) return data;
  const cacheKey = `${controls.heroRangePreset?.value || ""}|${controls.villainRangePreset?.value || ""}|${controls.heroRangePercent.value}|${controls.villainRangePercent.value}|${rangePresetRevision}|${yMode}|${plotView}|${drawPressureRole}|${boardDetailsLoadedCount}`;
  if (rangeCacheRows && cacheKey === rangeCacheKey) return rangeCacheRows;
  const heroSelected = selectedRangeKeys("hero");
  const villainSelected = selectedRangeKeys("villain");
  const hasUsableDetails = plotView === "wetDynamic" || yMode === "futureNut" || yMode === "dirtyShared" ? hasRangePlotDetails : hasBoardDetails;
  rangeCacheKey = cacheKey;
  rangeCacheRows = data
    .filter(hasUsableDetails)
    .map(d => applyRanges(d, heroSelected, villainSelected));
  return rangeCacheRows;
}

function clamp(value, minValue, maxValue) {
  return Math.max(minValue, Math.min(maxValue, value));
}

function numberOrZero(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function boardWetnessScore(d) {
  if (Number.isFinite(Number(d.draw_wetness_score))) return numberOrZero(d.draw_wetness_score);
  return (
    0.50 * numberOrZero(d.category_improvement_gain)
    + 0.30 * numberOrZero(d.straight_draw_density)
    + 0.20 * numberOrZero(d.flush_draw_density)
  );
}

function boardDynamicnessScore(d) {
  if (Number.isFinite(Number(d.nut_shift_pressure))) return numberOrZero(d.nut_shift_pressure);
  return numberOrZero(d.category_improvement_gain) * numberOrZero(d.nut_out_potential);
}

function wetnessScore(d) {
  if (Number.isFinite(Number(d.range_draw_pressure))) return numberOrZero(d.range_draw_pressure);
  return boardWetnessScore(d);
}

function dynamicnessScore(d) {
  if (Number.isFinite(Number(d.range_nut_shift_pressure))) return numberOrZero(d.range_nut_shift_pressure);
  return boardDynamicnessScore(d);
}

function filteredData() {
  const texture = controls.texture.value;
  const query = normalizeSearch(controls.search.value);
  return rangedData().filter(d => {
    if (texture !== "all" && d.suit_texture !== texture) return false;
    if (query) {
      if (!matchesSearch(d, query)) return false;
    }
    return true;
  });
}

function visiblePlotData() {
  const rows = filteredData();
  if (!pinned.size && !selectedFlop) return rows;
  const rowsByKey = new Map(rows.map(d => [rowKey(d), d]));
  const rangeRowsByKey = new Map(rangedData().map(d => [rowKey(d), d]));
  const stickyKeys = new Set(pinned);
  if (selectedFlop) stickyKeys.add(rowKey(selectedFlop));
  for (const key of stickyKeys) {
    if (!rowsByKey.has(key) && rangeRowsByKey.has(key)) {
      rows.push(rangeRowsByKey.get(key));
    }
  }
  return rows;
}

function normalizeSearch(value) {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

function matchesSearch(d, query) {
  if (query === "two_tone") return /^two_tone_/.test(d.suit_texture);
  if (query === "paired_two_tone") return /^paired_two_tone_/.test(d.suit_texture);
  if (query === "rainbow") return d.suit_texture === "rainbow";
  if (query === "paired_rainbow") return d.suit_texture === "paired_rainbow";
  if (query === "monotone") return d.suit_texture === "monotone";
  if (query === "trips") return d.suit_texture === "trips" || d.rank_structure === "trips";
  const haystack = `${d.flop_key} ${d.ranks_key} ${d.suit_texture} ${d.rank_structure} ${d.pairedness}`.toLowerCase();
  return haystack.includes(query);
}

function rankedRows(rows) {
  let output = rows.map(d => ({
    ...d,
    x_value: xMetricValue(d),
    y_value: yMetricValue(d),
  }));
  if (transformMode === "pca") output = pcaRows(output);
  return output;
}

function xMetricValue(d) {
  if (plotView === "wetDynamic") return wetnessScore(d);
  return d.range_advantage || 0;
}

function yMetricValue(d) {
  if (plotView === "wetDynamic") return dynamicnessScore(d);
  if (yMode === "dirtyShared") return d.dirty_shared_outs || 0;
  return d.nut_outs_edge || 0;
}

function xModeLabel() {
  if (transformMode === "pca") return "PC1: " + xModeLabelBase() + " / " + yModeLabelBase();
  if (plotView === "wetDynamic") return `${drawPressureRoleLabel()} Draw Pressure`;
  return "Aggressor Edge: Current Strength";
}

function yModeLabel() {
  if (transformMode === "pca") return "PC2: Decorrelated Contrast";
  if (plotView === "wetDynamic") return "Nut-Shift Dynamicness";
  return yModeLabelBase();
}

function xModeLabelBase() {
  if (plotView === "wetDynamic") return `${drawPressureRoleLabel()} Draw Pressure`;
  return "Current Strength Edge";
}

function yModeLabelBase() {
  if (plotView === "wetDynamic") return "Nut-Shift Dynamicness";
  if (yMode === "dirtyShared") return "Dirty Shared Outs";
  return "Aggressor Edge: Future Nut Outs";
}

function yModeTitle() {
  const baseTitle = plotView === "wetDynamic"
    ? `${drawPressureRoleLabel()} Draw Pressure vs Nut-Shift Dynamicness`
    : yMode === "dirtyShared"
    ? "Aggressor vs Caller: Current Strength vs Dirty Shared Outs"
    : "Aggressor vs Caller: Current Strength vs Future Nut Outs";
  if (transformMode === "pca") return `${baseTitle} (PCA Transform)`;
  return baseTitle;
}

function renderPlotTabs() {
  document.querySelectorAll(".plot-tab").forEach(button => {
    const tabYMode = button.dataset.yMode || "";
    button.classList.toggle("active", button.dataset.view === plotView && (plotView !== "gold" || tabYMode === yMode));
  });
  document.querySelectorAll('input[name="drawPressureRole"]').forEach(input => {
    input.checked = input.value === drawPressureRole;
  });
  document.getElementById("pcaTransform").classList.toggle("active", transformMode === "pca");
  renderRangeMatrices();
}

function pcaRows(rows) {
  if (rows.length < 2) return rows.map(d => ({...d, pca_x: 0, pca_y: 0}));
  const values = rows.map(d => [d.x_value || 0, d.y_value || 0]);
  const means = [
    values.reduce((sum, row) => sum + row[0], 0) / values.length,
    values.reduce((sum, row) => sum + row[1], 0) / values.length,
  ];
  const stds = [0, 1].map(index => {
    const variance = values.reduce((sum, row) => sum + Math.pow(row[index] - means[index], 2), 0) / values.length;
    return Math.sqrt(variance) || 1;
  });
  const normalized = values.map(row => [(row[0] - means[0]) / stds[0], (row[1] - means[1]) / stds[1]]);
  const cov00 = normalized.reduce((sum, row) => sum + row[0] * row[0], 0) / Math.max(1, normalized.length - 1);
  const cov01 = normalized.reduce((sum, row) => sum + row[0] * row[1], 0) / Math.max(1, normalized.length - 1);
  const cov11 = normalized.reduce((sum, row) => sum + row[1] * row[1], 0) / Math.max(1, normalized.length - 1);
  const trace = cov00 + cov11;
  const delta = Math.sqrt(Math.pow(cov00 - cov11, 2) + 4 * cov01 * cov01);
  const lambda = (trace + delta) / 2;
  let pc1 = Math.abs(cov01) > 1e-9 ? [cov01, lambda - cov00] : [1, 0];
  const pc1Length = Math.hypot(pc1[0], pc1[1]) || 1;
  pc1 = [pc1[0] / pc1Length, pc1[1] / pc1Length];
  if (pc1[0] + pc1[1] < 0) pc1 = [-pc1[0], -pc1[1]];
  const pc2 = [-pc1[1], pc1[0]];
  return rows.map((d, index) => ({
    ...d,
    pca_x: normalized[index][0] * pc1[0] + normalized[index][1] * pc1[1],
    pca_y: normalized[index][0] * pc2[0] + normalized[index][1] * pc2[1],
  }));
}

function clearSvg() {
  while (svg.firstChild) svg.removeChild(svg.firstChild);
}

function el(name, attrs = {}) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  return node;
}

function appendSvgTitle(node, text) {
  const title = el("title");
  title.textContent = text;
  node.appendChild(title);
}

function polygonPoints(cx, cy, radius, sides, rotation = -Math.PI / 2) {
  return Array.from({length: sides}, (_, index) => {
    const angle = rotation + index * 2 * Math.PI / sides;
    return `${(cx + radius * Math.cos(angle)).toFixed(2)},${(cy + radius * Math.sin(angle)).toFixed(2)}`;
  }).join(" ");
}

function starPoints(cx, cy, outerRadius, innerRadius = outerRadius * 0.45) {
  return Array.from({length: 10}, (_, index) => {
    const radius = index % 2 === 0 ? outerRadius : innerRadius;
    const angle = -Math.PI / 2 + index * Math.PI / 5;
    return `${(cx + radius * Math.cos(angle)).toFixed(2)},${(cy + radius * Math.sin(angle)).toFixed(2)}`;
  }).join(" ");
}

function pointSymbolForCount(count, cx, cy, radius, attrs = {}) {
  count = Math.max(0, Math.min(5, Number(count) || 0));
  cx = Number(cx || attrs.cx || 0);
  cy = Number(cy || attrs.cy || 0);
  const baseAttrs = {
    ...attrs,
    "data-straight-windows": count,
  };
  delete baseAttrs.cx;
  delete baseAttrs.cy;
  delete baseAttrs.r;
  if (count === 0) {
    return el("circle", {...baseAttrs, cx, cy, r: radius});
  }
  if (count === 1) {
    return el("polygon", {...baseAttrs, points: polygonPoints(cx, cy, radius * 1.12, 3)});
  }
  if (count === 2) {
    return el("polygon", {...baseAttrs, points: polygonPoints(cx, cy, radius * 1.08, 4)});
  }
  if (count === 3) {
    return el("polygon", {...baseAttrs, points: polygonPoints(cx, cy, radius * 1.02, 4, Math.PI / 4)});
  }
  if (count === 4) {
    return el("polygon", {...baseAttrs, points: polygonPoints(cx, cy, radius * 1.08, 5)});
  }
  return el("polygon", {...baseAttrs, points: starPoints(cx, cy, radius * 1.22)});
}

function pointSymbol(d, radius, attrs = {}) {
  return pointSymbolForCount(straightWindowCount(d), d._cx, d._cy, radius, attrs);
}

function paddedExtent(values, padRatio = 0.08) {
  let [minValue, maxValue] = extent(values);
  if (minValue === maxValue) {
    minValue -= 0.5;
    maxValue += 0.5;
  }
  const pad = (maxValue - minValue) * padRatio;
  return [minValue - pad, maxValue + pad];
}

function expandDomainToValues(domain, values, padRatio = 0.08) {
  if (!values.length) return domain;
  let [domainMin, domainMax] = domain;
  const [valueMin, valueMax] = extent(values);
  if (valueMin < domainMin) {
    const pad = (domainMax - valueMin) * padRatio;
    domainMin = valueMin - pad;
  }
  if (valueMax > domainMax) {
    const pad = (valueMax - domainMin) * padRatio;
    domainMax = valueMax + pad;
  }
  return [domainMin, domainMax];
}

function plotDomains(xValues, yValues, isPcaTransform) {
  if (plotView === "wetDynamic" && !isPcaTransform) {
    return {
      x: expandDomainToValues(drawPressureStableDomain.x, xValues),
      y: expandDomainToValues(drawPressureStableDomain.y, yValues),
    };
  }
  return {
    x: paddedExtent(xValues),
    y: paddedExtent(yValues),
  };
}

function draw() {
  clearSvg();
  const bounds = svg.getBoundingClientRect();
  const width = Math.max(720, bounds.width);
  const height = Math.max(560, bounds.height);
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  let rows = rankedRows(visiblePlotData());
  const title = yModeTitle();
  document.getElementById("plotTitle").textContent = title;
  document.title = title;
  const isRangeAwareView = ["gold", "wetDynamic"].includes(plotView);
  document.getElementById("count").textContent = isRangeAwareView && !allBoardDetailsLoaded
    ? `${rows.length} / ${data.length} flops shown`
    : `${rows.length} / ${data.length} flops`;
  renderRangeMatrices();
  renderFrequencyPanels();
  renderPinnedList();
  if (!rows.length) {
    svg.appendChild(el("text", {x: width / 2, y: height / 2, class: "empty"})).textContent = isRangeAwareView && !boardDetailsLoadedCount
      ? "Loading flop data..."
      : "No flops match the current filters";
    return;
  }

  const margin = {top: 28, right: 26, bottom: 58, left: 72};
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  const isPcaTransform = transformMode === "pca";
  const xValues = rows.map(d => isPcaTransform ? d.pca_x : d.x_value);
  const yValues = rows.map(d => isPcaTransform ? d.pca_y : d.y_value);
  const domains = plotDomains(xValues, yValues, isPcaTransform);
  let [xMin, xMax] = domains.x;
  let [yMin, yMax] = domains.y;
  const x = value => margin.left + (((isPcaTransform ? value : clamp(value, xMin, xMax)) - xMin) / (xMax - xMin)) * innerW;
  const y = value => margin.top + (1 - (((isPcaTransform ? value : clamp(value, yMin, yMax)) - yMin) / (yMax - yMin))) * innerH;

  for (let i = 0; i <= 5; i++) {
    const xt = xMin + (xMax - xMin) * i / 5;
    const yt = yMax - (yMax - yMin) * i / 5;
    const gx = x(xt);
    const gy = y(yt);
    svg.appendChild(el("line", {x1: gx, y1: margin.top, x2: gx, y2: margin.top + innerH, class: "grid"}));
    svg.appendChild(el("line", {x1: margin.left, y1: gy, x2: margin.left + innerW, y2: gy, class: "grid"}));
    const xTick = el("text", {x: gx, y: margin.top + innerH + 22, "text-anchor": "middle", class: "tick"});
    xTick.textContent = fmtTick(xt, xMax - xMin);
    svg.appendChild(xTick);
    const yTick = el("text", {x: margin.left - 12, y: gy + 4, "text-anchor": "end", class: "tick"});
    yTick.textContent = fmtTick(yt, yMax - yMin);
    svg.appendChild(yTick);
  }

  svg.appendChild(el("line", {x1: margin.left, y1: margin.top + innerH, x2: margin.left + innerW, y2: margin.top + innerH, stroke: "#32393d"}));
  svg.appendChild(el("line", {x1: margin.left, y1: margin.top, x2: margin.left, y2: margin.top + innerH, stroke: "#32393d"}));

  const mx = x(median(xValues));
  const my = y(median(yValues));
  svg.appendChild(el("line", {x1: mx, y1: margin.top, x2: mx, y2: margin.top + innerH, class: "median"}));
  svg.appendChild(el("line", {x1: margin.left, y1: my, x2: margin.left + innerW, y2: my, class: "median"}));

  const xLabel = el("text", {x: margin.left + innerW / 2, y: height - 17, "text-anchor": "middle", class: "axis-label"});
  xLabel.textContent = xModeLabel();
  appendSvgTitle(xLabel, plotView === "wetDynamic"
    ? "How much the chosen range can improve on future streets."
    : "Current hand-strength edge for the aggressor range minus the caller range.");
  svg.appendChild(xLabel);
  const yLabel = el("text", {x: 19, y: margin.top + innerH / 2, transform: `rotate(-90 19 ${margin.top + innerH / 2})`, "text-anchor": "middle", class: "axis-label"});
  yLabel.textContent = yModeLabel();
  appendSvgTitle(yLabel, plotView === "wetDynamic"
    ? "How much future cards can change nutted-hand access."
    : yMode === "dirtyShared"
    ? "Outs that both selected ranges can share or block."
    : "Future nut outs for the aggressor range minus the caller range.");
  svg.appendChild(yLabel);
  drawLegend(width, margin);

  const labeledKeys = sparseLabelKeys(rows);
  const screenRows = rows.map(d => ({
    ...d,
    _cx: x(isPcaTransform ? d.pca_x : d.x_value),
    _cy: y(isPcaTransform ? d.pca_y : d.y_value),
    _radius: 5
  }));

  for (const d of screenRows) {
    const radius = d._radius;
    const key = rowKey(d);
    const isPinned = pinned.has(key);
    const isSelected = selectedFlop && rowKey(selectedFlop) === key;
    const symbolRadius = isSelected ? radius + 4 : isPinned ? radius + 3 : radius;
    const point = pointSymbol(d, symbolRadius, {
      fill: colors[d.suit_texture] || "#BAB0AC",
      class: "point",
      stroke: isSelected ? "#f7fafb" : isPinned ? "#f7fafb" : "rgba(232, 237, 240, 0.36)",
      "stroke-width": isSelected ? 4 : isPinned ? 3 : 1,
      opacity: isSelected || isPinned ? 1 : 0.72
    });
    point.addEventListener("mouseenter", event => showTooltip(event, d));
    point.addEventListener("mousemove", event => {
      if (tooltip.style.display === "block") positionTooltip(event);
    });
    point.addEventListener("mouseleave", hideTooltip);
    point.addEventListener("click", event => {
      event.stopPropagation();
      selectFlop(d);
    });
    svg.appendChild(point);
  }

  for (const d of screenRows) {
    const radius = d._radius;
    const key = rowKey(d);
    const isPinned = pinned.has(key);
    const isSelected = selectedFlop && rowKey(selectedFlop) === key;
    const shouldLabel = isSelected || isPinned || labeledKeys.has(key);
    if (!shouldLabel) continue;
    const fontSize = isSelected || isPinned ? 13 : 9;
    const placement = labelPlacement(d, xMin, xMax, fontSize, isSelected || isPinned);
    const label = el("text", {
      x: placement.x,
      y: placement.y,
      "text-anchor": placement.anchor,
      fill: isSelected || isPinned ? "#f7fafb" : "#b7c3ca",
      "font-size": fontSize,
      "font-weight": isSelected || isPinned ? 800 : 500,
      opacity: isSelected || isPinned ? 1 : 0.58,
      "paint-order": "stroke",
      stroke: "#0e1216",
      "stroke-width": isSelected || isPinned ? 4 : 2,
      "pointer-events": "none"
    });
    label.textContent = d.flop_key;
    svg.appendChild(label);
    if (isSelected || isPinned) {
      const ring = el("circle", {
        cx: d._cx,
        cy: d._cy,
        r: radius + (isSelected ? 10 : 7),
        fill: "none",
        stroke: "#f7fafb",
        "stroke-width": isSelected ? 2 : 1.5,
        "stroke-dasharray": isSelected ? "none" : "3 3",
        "pointer-events": "none"
      });
      svg.appendChild(ring);
    }
  }
}

function sparseLabelKeys(rows) {
  const keys = new Set();
  if (rows.length <= 60) {
    rows.forEach(d => keys.add(rowKey(d)));
    return keys;
  }
  const [minX, maxX] = extent(rows.map(d => d.x_value));
  const spread = Math.max(0.001, maxX - minX);
  const buckets = new Map();
  for (const d of rows) {
    const xNorm = (d.x_value - minX) / spread;
    const xBucket = Math.min(5, Math.floor(xNorm * 6));
    const yValues = rows.map(row => row.y_value);
    const [minY, maxY] = extent(yValues);
    const yNorm = (d.y_value - minY) / Math.max(0.001, maxY - minY);
    const yBucket = Math.min(5, Math.floor(Math.max(0, Math.min(0.999, yNorm)) * 6));
    const bucketKey = `${xBucket}:${yBucket}`;
    const current = buckets.get(bucketKey);
    if (!current || d.category_improvement_gain > current.category_improvement_gain) {
      buckets.set(bucketKey, d);
    }
  }
  [...buckets.values()]
    .sort((a, b) => b.category_improvement_gain - a.category_improvement_gain)
    .slice(0, 28)
    .forEach(d => keys.add(rowKey(d)));
  for (const d of rows) {
    if (String(d.ranks_key) === "J72") keys.add(rowKey(d));
  }
  return keys;
}

function drawLegend(width, margin) {
  const textures = [...new Set(data.map(d => d.suit_texture))].sort();
  const itemWidth = 116;
  const itemHeight = 20;
  const columns = 2;
  const textureRows = Math.ceil(textures.length / columns);
  const legendWidth = Math.max(itemWidth * columns + 18, 276);
  const legendHeight = textureRows * itemHeight + 78;
  const x0 = margin.left + 10;
  const y0 = margin.top + 8;
  svg.appendChild(el("rect", {
    x: x0,
    y: y0,
    width: legendWidth,
    height: legendHeight,
    rx: 6,
    fill: "rgba(22,29,35,0.90)",
    stroke: "#34414b"
  }));
  const title = el("text", {
    x: x0 + 10,
    y: y0 + 17,
    fill: "#96a3ad",
    "font-size": 11,
    "font-weight": 700
  });
  title.textContent = "Suit Texture";
  svg.appendChild(title);
  textures.forEach((texture, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    const x = x0 + 10 + col * itemWidth;
    const y = y0 + 34 + row * itemHeight;
    svg.appendChild(el("circle", {
      cx: x,
      cy: y - 4,
      r: 5,
      fill: colors[texture] || "#BAB0AC",
      stroke: "rgba(232,237,240,0.36)"
    }));
    const label = el("text", {
      x: x + 11,
      y,
      fill: "#d8e0e5",
      "font-size": 11
    });
    label.textContent = texture;
    svg.appendChild(label);
  });
  const shapeY = y0 + 34 + textureRows * itemHeight + 15;
  const shapeTitle = el("text", {
    x: x0 + 10,
    y: shapeY,
    fill: "#96a3ad",
    "font-size": 11,
    "font-weight": 700
  });
  shapeTitle.textContent = "Straight Windows";
  svg.appendChild(shapeTitle);
  for (let count = 0; count <= 5; count++) {
    const x = x0 + 18 + count * 41;
    const y = shapeY + 19;
    svg.appendChild(pointSymbolForCount(count, x, y - 4, 5, {
      fill: "#aab6be",
      stroke: "rgba(232,237,240,0.45)",
      "stroke-width": 1,
      opacity: 0.9
    }));
    const label = el("text", {
      x: x + 12,
      y,
      fill: "#d8e0e5",
      "font-size": 11
    });
    label.textContent = String(count);
    svg.appendChild(label);
  }
}

function labelPlacement(target, xMin, xMax, fontSize, isPinned) {
  const xNorm = (target.x_value - xMin) / Math.max(0.001, xMax - xMin);
  const offset = target._radius + (isPinned ? 12 : 7);
  const anchor = xNorm > 0.72 ? "end" : "start";
  const xSign = anchor === "end" ? -1 : 1;
  const yNorm = Math.max(0, Math.min(1, target.y_value));
  const ySign = yNorm < 0.18 ? -1 : yNorm > 0.82 ? 1 : 0;
  return {
    x: target._cx + xSign * offset,
    y: target._cy + ySign * offset + fontSize * 0.35,
    anchor,
  };
}

function pct(value) {
  return `${(100 * value).toFixed(1)}%`;
}

function fmtCombos(value) {
  return Number(value || 0).toFixed(0);
}

function fmtWeighted(value) {
  const number = Number(value || 0);
  if (number >= 100) return number.toFixed(0);
  if (number >= 10) return number.toFixed(1);
  if (number >= 1) return number.toFixed(2);
  return number.toPrecision(3);
}

const categoryOrder = ["straight_flush", "quads", "full_house", "flush", "straight", "trips", "two_pair", "pair", "high_card"];
const categorySpectrumColors = {
  straight_flush: "#f5c84c",
  quads: "#e58f48",
  full_house: "#c96f71",
  flush: "#4fa88b",
  straight: "#4c8fc7",
  trips: "#7b79c9",
  two_pair: "#9c77ad",
  pair: "#8f9aa3",
  high_card: "#c1c8cc",
  overpair: "#40525c",
  top_pair: "#647883",
  middle_pair: "#87969e",
  bottom_pair: "#a7b1b7",
  underpair: "#c7cdd1",
  high_card_gt_50: "#7a8790",
  high_card_gt_33: "#9aa5ac",
  high_card_gt_15: "#b9c0c5",
  air_lt_15: "#d7dcdf"
};
const pairBandOrder = ["underpair", "bottom_pair", "middle_pair", "top_pair", "overpair"];
const highCardBandOrder = ["air_lt_15", "high_card_gt_15", "high_card_gt_33", "high_card_gt_50"];

function categoryLabel(category) {
  const labels = {
    overpair: "overpair",
    top_pair: "top pair",
    middle_pair: "middle pair",
    bottom_pair: "bottom pair",
    underpair: "underpair",
    high_card_gt_50: "draw prob >50%",
    high_card_gt_33: "draw prob 33-50%",
    high_card_gt_15: "draw prob 15-33%",
    air_lt_15: "draw prob <15%",
  };
  if (labels[category]) return labels[category];
  return category.replaceAll("_", " ");
}

function spectrumSegmentsHtml(category, breakdown) {
  if (breakdown?.segments?.length) {
    const nonzeroSegments = breakdown.segments.filter(segment => Number(segment.value || 0) > 0);
    const segmentSummary = nonzeroSegments
      .map(segment => `${segment.label} ${pct(segment.value / breakdown.total)}`)
      .join("&#10;");
    return breakdown.segments.map(segment => {
      const width = breakdown.total > 0 ? 100 * segment.value / breakdown.total : 0;
      const shareText = pct(segment.value / breakdown.total);
      const title = segmentSummary && nonzeroSegments.length > 1
        ? `${segment.label}: ${shareText}&#10;${segmentSummary}`
        : `${segment.label}: ${shareText}`;
      return `<div class="spectrum-segment" style="width: ${width.toFixed(1)}%; background: ${segment.color};" title="${title}"></div>`;
    }).join("");
  }
  if (!breakdown || !breakdown.total) {
    return `<div class="spectrum-segment" style="width: 100%; background: ${categorySpectrumColors[category]};"></div>`;
  }
  const heroWidth = 100 * breakdown.hero / breakdown.total;
  const tieWidth = 100 * breakdown.tie / breakdown.total;
  const villainWidth = 100 * breakdown.villain / breakdown.total;
  return `<div class="spectrum-segment hero" style="width: ${heroWidth.toFixed(1)}%;" title="Aggressor wins ${pct(breakdown.hero / breakdown.total)}"></div>
    <div class="spectrum-segment tie" style="width: ${tieWidth.toFixed(1)}%;" title="Tie ${pct(breakdown.tie / breakdown.total)}"></div>
    <div class="spectrum-segment villain" style="width: ${villainWidth.toFixed(1)}%;" title="Caller wins ${pct(breakdown.villain / breakdown.total)}"></div>`;
}

function categoryPieStops(categories, total) {
  if (!total) return "#2a343d 0deg 360deg";
  let start = 0;
  const stops = [];
  for (const category of categoryOrder) {
    const value = Number(categories[category] || 0);
    if (!value) continue;
    const degrees = 360 * value / total;
    const end = start + degrees;
    stops.push(`${categorySpectrumColors[category]} ${start.toFixed(2)}deg ${end.toFixed(2)}deg`);
    start = end;
  }
  return stops.length ? stops.join(", ") : "#2a343d 0deg 360deg";
}

function topCategoryShares(categories, total, limit = 3) {
  if (!total) return [];
  return categoryOrder
    .map(category => ({
      category,
      share: Number(categories[category] || 0) / total,
      color: categorySpectrumColors[category],
    }))
    .filter(item => item.share > 0)
    .sort((left, right) => right.share - left.share || categoryOrder.indexOf(left.category) - categoryOrder.indexOf(right.category))
    .slice(0, limit);
}

function categoryPieHtml(title, categories, total, centerLabel, totalLabel) {
  const topShares = topCategoryShares(categories, total);
  const leader = topShares[0] || null;
  const shareLine = topShares.length
    ? topShares.map(item => `<span class="frequency-chip" title="${categoryLabel(item.category)} ${pct(item.share)}"><span style="background:${item.color};"></span>${categoryLabel(item.category)} ${pct(item.share)}</span>`).join("")
    : `<span class="frequency-chip muted">No selected combos</span>`;
  return `<div class="frequency-pie-card">
    <div class="frequency-pie" style="background: conic-gradient(${categoryPieStops(categories, total)});" role="img" aria-label="${title} pie chart">
      <div class="frequency-pie-center">
        <b>${leader ? pct(leader.share) : "0.0%"}</b>
        <span>${leader ? categoryLabel(leader.category) : centerLabel}</span>
      </div>
    </div>
    <div class="frequency-pie-meta">
      <div class="frequency-pie-title">${title}</div>
      <div class="frequency-pie-total">${fmtCombos(total)} ${totalLabel}</div>
      <div class="frequency-chip-row">${shareLine}</div>
    </div>
  </div>`;
}

function highCardBandBreakdown(bands) {
  const total = highCardBandOrder.reduce((sum, band) => sum + Number(bands?.[band] || 0), 0);
  if (!total) return null;
  return {
    total,
    segments: highCardBandOrder.map(band => ({
      value: Number(bands[band] || 0),
      label: categoryLabel(band),
      color: categorySpectrumColors[band],
    })),
  };
}

function pairBandBreakdown(bands) {
  const total = pairBandOrder.reduce((sum, band) => sum + Number(bands?.[band] || 0), 0);
  if (!total) return null;
  return {
    total,
    segments: pairBandOrder.map(band => ({
      value: Number(bands[band] || 0),
      label: categoryLabel(band),
      color: categorySpectrumColors[band],
    })),
  };
}

function spectrumRowsHtml(categories, total, showdowns = null, bandBreakdowns = null) {
  return categoryOrder
    .map(category => {
      const value = Number(categories[category] || 0);
      const share = total > 0 ? value / total : 0;
      const width = Math.max(0, Math.min(100, share * 100));
      const breakdown = bandBreakdowns?.[category] || (showdowns ? showdowns[category] : null);
      return `<div class="spectrum-row${value ? "" : " zero"}">
        <div class="spectrum-label" title="${categoryLabel(category)}">${categoryLabel(category)}</div>
        <div class="spectrum-track"><div class="spectrum-fill" style="width: ${width.toFixed(1)}%;">${spectrumSegmentsHtml(category, breakdown)}</div></div>
        <div class="spectrum-value">${pct(share)}</div>
      </div>`;
    })
    .join("");
}

function categoryBreakdownHtml(label, composition, showdowns = null, d = null) {
  const bandBreakdowns = {
    trips: isTripsBoard(d)
      ? highCardBandBreakdown(composition.tripsDrawHitBands)
      : null,
    pair: isPairedBoard(d)
      ? highCardBandBreakdown(composition.pairDrawHitBands)
      : pairBandBreakdown(composition.pairBands),
    high_card: highCardBandBreakdown(composition.highCardDrawHitBands),
  };
  return `<div class="spectrum-head">
    <span>${label}</span>
    <span class="spectrum-total">${fmtCombos(composition.combos)} combos</span>
  </div>
  ${categoryPieHtml("Current", composition.categories, composition.combos, "current", "combos")}
  <div class="spectrum">${spectrumRowsHtml(composition.categories, composition.combos, showdowns, bandBreakdowns)}</div>`;
}

function finalCategoryFrequencyHtml(label, breakdown, showdowns = null) {
  return `<div class="spectrum-head">
    <span>${label}</span>
    <span class="spectrum-total">turn + river</span>
  </div>
  ${categoryPieHtml("Final", breakdown.categories, breakdown.total, "final", "weighted combos")}
  <div class="spectrum">${spectrumRowsHtml(breakdown.categories, breakdown.total, showdowns)}</div>`;
}

function compactTooltipHtml(d) {
  const xValue = Number.isFinite(Number(d.x_value)) ? fmt(d.x_value, 3) : "--";
  const yValue = Number.isFinite(Number(d.y_value)) ? fmt(d.y_value, 3) : "--";
  return `<b>${d.flop_key}</b>
    <div>${d.suit_texture} / ${d.rank_structure} / ${d.pairedness}</div>
    <div>x ${xValue} / y ${yValue}</div>
    <div>Straight windows: ${straightWindowCount(d)} / 5</div>`;
}

function rangeFrequencyHtml(role, d, currentShowdowns = null, futureShowdowns = null) {
  const label = displayRoleLabels[role] || role;
  const titlePrefix = selectedFlop && d && rowKey(selectedFlop) === rowKey(d) ? "Selected: " : "";
  if (!["gold", "wetDynamic"].includes(plotView)) {
    return `<div class="frequency-empty">Range frequencies apply to range-aware views.</div>`;
  }
  if (!d) {
    return `<div class="frequency-empty">Hover a flop for ${label.toLowerCase()} frequencies.</div>`;
  }
  if (!d.range_cells || !d.hand_strengths) {
    return `<div class="frequency-title">${titlePrefix}${d.flop_key}</div>
      <div class="frequency-empty">Loading board details...</div>`;
  }
  const useShowdownSplits = plotView !== "wetDynamic";
  const cacheKey = [
    role,
    rowKey(d),
    plotView,
    useShowdownSplits ? "showdowns" : "composition",
    currentShowdowns ? "current" : "no-current",
    futureShowdowns ? "future" : "no-future",
    controls.heroRangePreset?.value || "",
    controls.villainRangePreset?.value || "",
    controls.heroRangePercent.value,
    controls.villainRangePercent.value,
    rangePresetRevision,
    selectedFlop ? rowKey(selectedFlop) : "",
  ].join("|");
  if (cacheKey && rangeFrequencyHtmlCache.has(cacheKey)) return rangeFrequencyHtmlCache.get(cacheKey);
  const selected = selectedRangeKeys(role);
  const composition = rangeComposition(d, selected);
  const finalFrequency = finalCategoryFrequency(d, selected);
  const currentShowdownSplits = useShowdownSplits && currentShowdowns ? currentSameCategoryShowdowns(currentShowdowns, selectedRangeKeys("hero"), selectedRangeKeys("villain")) : null;
  const futureShowdownSplits = useShowdownSplits && futureShowdowns ? futureSameCategoryShowdowns(futureShowdowns, selectedRangeKeys("hero"), selectedRangeKeys("villain")) : null;
  const html = `<div class="frequency-title">${titlePrefix}${d.flop_key}</div>
    ${useShowdownSplits ? sameCategoryLegendHtml(true) : ""}
    <div class="frequency-columns">
      <div class="frequency-block">
        <div class="frequency-subtitle">Current composition</div>
        ${categoryBreakdownHtml(label, composition, currentShowdownSplits, d)}
      </div>
      <div class="frequency-block">
        <div class="frequency-subtitle">Final hand frequency</div>
        ${finalCategoryFrequencyHtml(label, finalFrequency, futureShowdownSplits)}
      </div>
    </div>`;
  if (cacheKey) rangeFrequencyHtmlCache.set(cacheKey, html);
  return html;
}

function renderFrequencyPanels(d = activeDetailFlop(), currentShowdowns = null, futureShowdowns = null) {
  currentShowdowns = currentShowdowns || d?._currentShowdowns || null;
  futureShowdowns = futureShowdowns || d?._futureShowdowns || null;
  heroFrequencyPanel.innerHTML = rangeFrequencyHtml("hero", d, currentShowdowns, futureShowdowns);
  villainFrequencyPanel.innerHTML = rangeFrequencyHtml("villain", d, currentShowdowns, futureShowdowns);
}

function sameCategoryLegendHtml(compact = false) {
  return `<div class="spectrum-legend${compact ? " compact" : ""}" aria-label="Same-category showdown legend">
    <span class="spectrum-legend-item"><span class="spectrum-legend-swatch hero"></span>Aggressor</span>
    <span class="spectrum-legend-item"><span class="spectrum-legend-swatch tie"></span>Tie</span>
    <span class="spectrum-legend-item"><span class="spectrum-legend-swatch villain"></span>Caller</span>
  </div>`;
}

function tooltipHtml(d, currentShowdowns = null, futureShowdowns = null, compact = false) {
  if (plotView !== "gold") {
    return `<b>${d.flop_key}</b>
      <div>${d.suit_texture} / ${d.rank_structure} / ${d.pairedness}</div>
      <div>Straight windows: ${straightWindowCount(d)} / 5</div>
      <hr>
      <div>Aggressor draw pressure: ${fmt(wetnessScore(d), 3)}</div>
      <div>Nut-shift dynamicness: ${fmt(dynamicnessScore(d), 3)}</div>
      <div>Current texture pressure: ${fmt(d.current_texture_pressure || 0, 3)}</div>
      <div>Straight draw density: ${fmt(d.straight_draw_density || 0, 3)}</div>
      <div>Flush draw density: ${fmt(d.flush_draw_density || 0, 3)}</div>
      <div>Nut turnover probability: ${fmt(d.nut_turnover_probability || 0, 3)}</div>`;
  }
  if (!d.range_cells || !d.hand_strengths) {
    return `<b>${d.flop_key}</b>
      <div>${d.suit_texture} / ${d.rank_structure} / ${d.pairedness}</div>
      <div>Straight windows: ${straightWindowCount(d)} / 5</div>
      <hr>
      <div>Loading board details...</div>`;
  }
  const heroSelected = selectedRangeKeys("hero");
  const villainSelected = selectedRangeKeys("villain");
  const clean = matchupOuts(d, heroSelected, villainSelected);
  const heroComposition = rangeComposition(d, heroSelected);
  const villainComposition = rangeComposition(d, villainSelected);
  const heroFinalFrequency = finalCategoryFrequency(d, heroSelected);
  const villainFinalFrequency = finalCategoryFrequency(d, villainSelected);
  const currentShowdownSplits = currentShowdowns ? currentSameCategoryShowdowns(currentShowdowns, heroSelected, villainSelected) : null;
  const futureShowdownSplits = futureShowdowns ? futureSameCategoryShowdowns(futureShowdowns, heroSelected, villainSelected) : null;
  const detailCopy = compact ? "" : `
    <div>After turn and river across compressed runouts, weighted by selected range combos.</div>
    <div class="spectrum-note">Color split compares same-runout, non-overlapping hole-card combos inside blocker-sensitive hand groups.</div>`;
  const currentCopy = compact ? "" : `
    <div>Independent by selected cells, not matchup-blocker adjusted.</div>
    <div class="spectrum-note">Bar length is this range's frequency. Color split shows who wins when both players are in that same hand group.</div>`;
  const metricsHtml = compact ? "" : `
    <hr>
    <div><b>Texture metrics</b></div>
    <div>Aggressor draw pressure: ${fmt(wetnessScore(d), 3)}</div>
    <div>Nut-shift dynamicness: ${fmt(dynamicnessScore(d), 3)}</div>
    <div>Current strength edge (Aggressor - Caller): ${fmt(d.range_advantage || 0, 3)}</div>
    <div>Current nut made edge (Aggressor - Caller): ${fmt(d.current_nut_made_edge || 0, 3)}</div>
    <div>Current flush access edge (Aggressor - Caller): ${fmt(d.flush_access_edge || 0, 3)}</div>
    <div>Future nut outs edge (Aggressor - Caller): ${fmt(d.nut_outs_edge || 0, 3)}</div>
    <div>Future flush access edge (Aggressor - Caller): ${fmt(d.future_flush_access_edge || 0, 3)}</div>
    <div>Clean outs edge (Aggressor - Caller): ${fmt(clean.net || 0, 3)} (${fmt(clean.heroClean || 0, 3)} - ${fmt(clean.villainClean || 0, 3)})</div>
    <div>Dirty/shared outs: ${fmt(clean.dirtyShared || 0, 3)}</div>`;
  return `<b>${d.flop_key}</b>
    <div>${d.suit_texture} / ${d.rank_structure} / ${d.pairedness}</div>
    <div>Straight windows: ${straightWindowCount(d)} / 5</div>
    <hr>
    <div><b>Future final hand frequency</b></div>
    ${detailCopy}
    ${sameCategoryLegendHtml(compact)}
    <br>
    ${finalCategoryFrequencyHtml("Aggressor", heroFinalFrequency, futureShowdownSplits)}
    <hr>
    ${finalCategoryFrequencyHtml("Caller", villainFinalFrequency, futureShowdownSplits)}
    <hr>
    <div><b>Current range composition</b></div>
    ${currentCopy}
    <br>
    ${categoryBreakdownHtml("Aggressor", heroComposition, currentShowdownSplits, d)}
    <hr>
    ${categoryBreakdownHtml("Caller", villainComposition, currentShowdownSplits, d)}
    ${metricsHtml}`;
}

function positionTooltip(event) {
  const gap = 14;
  const edgePad = 10;
  const boundary = document.querySelector(".plot-wrap").getBoundingClientRect();
  const rect = tooltip.getBoundingClientRect();
  let left = event.clientX + gap;
  let top = event.clientY + gap;
  if (left + rect.width + edgePad > boundary.right) {
    left = event.clientX - rect.width - gap;
  }
  if (top + rect.height + edgePad > boundary.bottom) {
    top = event.clientY - rect.height - gap;
  }
  left = Math.max(boundary.left + edgePad, Math.min(left, boundary.right - rect.width - edgePad));
  top = Math.max(boundary.top + edgePad, Math.min(top, boundary.bottom - rect.height - edgePad));
  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}

function showTooltip(event, d) {
  if (hoveredFlop === d && tooltip.style.display === "block") {
    positionTooltip(event);
    return;
  }
  hoveredFlop = d;
  tooltip.innerHTML = compactTooltipHtml(d);
  tooltip.style.display = "block";
  positionTooltip(event);
  if (!selectedFlop) {
    window.requestAnimationFrame(() => {
      if (hoveredFlop !== d || selectedFlop) return;
      renderRangeMatrices();
      renderFrequencyPanels(d);
      setReadout(`<b>${d.flop_key}</b><br>${d.suit_texture} / ${d.rank_structure} / ${d.pairedness}`);
    });
  }
  loadBoardDetails(d).then(detailRow => {
    if (hoveredFlop !== d || selectedFlop) return;
    tooltip.innerHTML = compactTooltipHtml(detailRow);
    positionTooltip(event);
    renderFrequencyPanels(detailRow);
    setReadout(`<b>${detailRow.flop_key}</b><br>${detailRow.suit_texture} / ${detailRow.rank_structure} / ${detailRow.pairedness}`);
    renderRangeMatrices();
  });
}

function hideTooltip() {
  tooltip.style.display = "none";
  hoveredFlop = null;
  if (!selectedFlop) {
    renderFrequencyPanels(null);
    renderRangeMatrices();
  }
}

function selectFlop(d) {
  const selectedKey = selectedFlop ? rowKey(selectedFlop) : "";
  const targetKey = rowKey(d);
  selectedFlop = selectedKey === targetKey ? null : d;
  if (!selectedFlop) {
    renderFrequencyPanels(hoveredFlop);
    renderRangeMatrices();
    draw();
    return;
  }
  hoveredFlop = d;
  draw();
  renderFrequencyPanels(d);
  renderRangeMatrices();
  setReadout(`<b>${d.flop_key}</b><br>${d.suit_texture} / ${d.rank_structure} / ${d.pairedness}`);
  Promise.all([loadBoardDetails(d), loadCurrentShowdowns(d), loadFutureShowdowns(d)]).then(([detailRow, currentRows, futureRows]) => {
    if (!selectedFlop || rowKey(selectedFlop) !== targetKey) return;
    attachShowdownData(detailRow, currentRows, futureRows);
    selectedFlop = detailRow;
    draw();
    renderFrequencyPanels(detailRow, currentRows, futureRows);
    setReadout(`<b>${detailRow.flop_key}</b><br>${detailRow.suit_texture} / ${detailRow.rank_structure} / ${detailRow.pairedness}`);
    renderRangeMatrices();
  });
}

function refreshHoveredReadout() {
  const d = activeDetailFlop();
  if (!d) return;
  const targetKey = rowKey(d);
  renderFrequencyPanels(d);
  setReadout(`<b>${d.flop_key}</b><br>${d.suit_texture} / ${d.rank_structure} / ${d.pairedness}`);
  if (!selectedFlop) {
    loadBoardDetails(d).then(detailRow => {
      if (hoveredFlop !== d) return;
      renderFrequencyPanels(detailRow);
      setReadout(`<b>${detailRow.flop_key}</b><br>${detailRow.suit_texture} / ${detailRow.rank_structure} / ${detailRow.pairedness}`);
      renderRangeMatrices();
    });
    return;
  }
  Promise.all([loadBoardDetails(d), loadCurrentShowdowns(d), loadFutureShowdowns(d)]).then(([detailRow, currentRows, futureRows]) => {
    attachShowdownData(detailRow, currentRows, futureRows);
    if (rowKey(selectedFlop) !== targetKey) return;
    selectedFlop = detailRow;
    renderFrequencyPanels(detailRow, currentRows, futureRows);
    setReadout(`<b>${detailRow.flop_key}</b><br>${detailRow.suit_texture} / ${detailRow.rank_structure} / ${detailRow.pairedness}`);
    renderRangeMatrices();
  });
}

function togglePin(d) {
  const key = rowKey(d);
  if (pinned.has(key)) {
    pinned.delete(key);
  } else {
    pinned.add(key);
  }
  renderPinnedList();
}

function pinMatchingRows() {
  for (const d of filteredData()) {
    pinned.add(rowKey(d));
  }
  draw();
}

function clearPinnedRows() {
  pinned.clear();
  draw();
}

function renderPinnedList() {
  const target = document.getElementById("pinnedList");
  if (!target) return;
  const pinnedRows = data.filter(d => pinned.has(rowKey(d)));
  if (!pinnedRows.length) {
    target.textContent = "No pinned flops.";
    return;
  }
  target.innerHTML = pinnedRows
    .sort((a, b) => b.range_advantage - a.range_advantage || String(a.flop_key).localeCompare(String(b.flop_key)))
    .map(d => `<div><b>${d.flop_key}</b> ${d.suit_texture}<br>current ${fmt(d.range_advantage || 0, 2)} / nut ${fmt(d.nut_outs_edge || 0, 2)}</div>`)
    .join("<hr>");
}

function setLoadingProgress(percent, message) {
  if (loadingBar) loadingBar.style.width = `${percent}%`;
  if (loadingStatus) loadingStatus.textContent = message;
}

function hideLoading() {
  if (loadingOverlay) loadingOverlay.classList.add("hidden");
}

function isRangePercentControl(control) {
  return control === controls.heroRangePercent || control === controls.villainRangePercent;
}

function isRangePresetControl(control) {
  return control === controls.heroRangePreset || control === controls.villainRangePreset;
}

function isRangeControl(control) {
  return isRangePercentControl(control) || isRangePresetControl(control);
}

function clearRangeDerivedCaches() {
  rangeCacheKey = "";
  rangeFrequencyHtmlCache.clear();
}

function finishRangeControlUpdate({renderEditor = false} = {}) {
  if (rangeUpdateTimer) {
    window.clearTimeout(rangeUpdateTimer);
    rangeUpdateTimer = null;
  }
  clearRangeDerivedCaches();
  renderRangeMatrices();
  if (renderEditor) renderRangeEditor();
  refreshHoveredReadout();
  draw();
}

function scheduleRangeSliderUpdate() {
  clearRangeDerivedCaches();
  renderRangeMatrices();
  refreshHoveredReadout();
  if (rangeUpdateTimer) window.clearTimeout(rangeUpdateTimer);
  rangeUpdateTimer = window.setTimeout(() => {
    rangeUpdateTimer = null;
    draw();
  }, 120);
}

function bindControls() {
  for (const control of Object.values(controls).filter(Boolean)) {
    control.addEventListener("input", () => {
      if (isRangePercentControl(control)) {
        scheduleRangeSliderUpdate();
      } else if (isRangePresetControl(control)) {
        return;
      } else {
        draw();
      }
    });
    control.addEventListener("change", () => {
      if (isRangeControl(control)) {
        if (isRangePresetControl(control)) rangePresetRevision += 1;
        finishRangeControlUpdate({renderEditor: isRangePresetControl(control)});
      } else {
        draw();
      }
    });
  }
  document.getElementById("reset").addEventListener("click", () => {
    setDefaults();
    draw();
  });
  document.getElementById("pinMatching").addEventListener("click", pinMatchingRows);
  document.getElementById("clearPins").addEventListener("click", clearPinnedRows);
  document.querySelectorAll('input[name="drawPressureRole"]').forEach(input => {
    input.addEventListener("change", () => {
      drawPressureRole = input.value === "villain" ? "villain" : "hero";
      rangeCacheKey = "";
      renderPlotTabs();
      refreshHoveredReadout();
      draw();
    });
  });
  for (const role of ["hero", "villain"]) {
    const elements = rangePaintElements(role);
    elements.toggle?.addEventListener("click", () => {
      const expanded = elements.toggle.getAttribute("aria-expanded") === "true";
      elements.toggle.setAttribute("aria-expanded", expanded ? "false" : "true");
      if (elements.panel) elements.panel.hidden = expanded;
      if (!expanded) renderRangeEditor(role);
    });
    document.getElementById(`${role}ApplyRangeEdit`)?.addEventListener("click", () => applyRangeEditorHands(role));
    document.getElementById(`${role}ResetRangeEdit`)?.addEventListener("click", () => resetRangeEditorPreset(role));
    document.getElementById(`${role}PaintRangeAll`)?.addEventListener("click", () => setPaintedRangeHands(role, "all"));
    document.getElementById(`${role}PaintRangeClear`)?.addEventListener("click", () => setPaintedRangeHands(role, "clear"));
    elements.hands?.addEventListener("input", () => stageRangeEditorHands(role));
  }
  document.querySelectorAll(".plot-tab").forEach(button => {
    button.addEventListener("click", () => {
      plotView = button.dataset.view;
      if (button.dataset.yMode) yMode = button.dataset.yMode;
      renderPlotTabs();
      draw();
    });
  });
  document.getElementById("pcaTransform").addEventListener("click", () => {
    transformMode = transformMode === "pca" ? "raw" : "pca";
    document.getElementById("pcaTransform").textContent = transformMode === "pca" ? "Transform: raw" : "Transform: PCA";
    renderPlotTabs();
    draw();
  });
  window.addEventListener("resize", draw);
}

async function bootInfographic() {
  try {
    setLoadingProgress(12, "Requesting flop dataset...");
    const response = await fetch("data.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    setLoadingProgress(42, "Loading data into memory...");
    payload = await response.json();
    data = payload.records || [];
    rangeOrder = payload.range_order || [];
    rangeRank = new Map(rangeOrder.map((key, index) => [key, index + 1]));
    await loadRangePresets();
    setLoadingProgress(45, "Building filters and range matrices...");
    initControls();
    bindControls();
    if (shouldPreloadBoardDetails()) {
      await preloadAllBoardDetails();
    } else {
      setLoadingProgress(68, "Loading compact range plot data...");
      await loadRangePlotData();
    }
    setLoadingProgress(92, "Drawing the range-aware plot...");
    draw();
    setLoadingProgress(100, allBoardDetailsLoaded || rangePlotDataLoaded ? "Ready." : "Ready. Board details load on hover.");
    window.setTimeout(hideLoading, 180);
  } catch (error) {
    setLoadingProgress(100, "Could not load data.json. Start a local web server from this folder, then open the app URL.");
    console.error(error);
  }
}

bootInfographic();
