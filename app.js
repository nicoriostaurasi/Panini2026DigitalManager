(function () {
  const STORAGE_KEY = "digital-panini-2026-progress-v1";
  const base = window.CROMOS_BASE || {};
  const imageMap = window.CROMOS_IMAGES || {};
  const state = {
    group: "all",
    filter: "all",
    query: { text: "", compact: "", tokens: [] },
    quantities: loadProgress(),
    friendQuantities: null,
  };

  const els = {
    exportBtn: document.querySelector("#exportBtn"),
    importFile: document.querySelector("#importFile"),
    compareFile: document.querySelector("#compareFile"),
    compareSummary: document.querySelector("#compareSummary"),
    clearCompareBtn: document.querySelector("#clearCompareBtn"),
    friendCanGiveBlock: document.querySelector("#friendCanGiveBlock"),
    youCanGiveBlock: document.querySelector("#youCanGiveBlock"),
    friendCanGive: document.querySelector("#friendCanGive"),
    youCanGive: document.querySelector("#youCanGive"),
    clearBtn: document.querySelector("#clearBtn"),
    workspace: document.querySelector(".workspace"),
    sidebar: document.querySelector(".sidebar"),
    tradePanel: document.querySelector(".trade-panel"),
    searchInput: document.querySelector("#searchInput"),
    groupSearchInput: document.querySelector("#groupSearchInput"),
    groupList: document.querySelector("#groupList"),
    cardsGrid: document.querySelector("#cardsGrid"),
    content: document.querySelector(".content"),
    cardTemplate: document.querySelector("#cardTemplate"),
    emptyState: document.querySelector("#emptyState"),
    currentGroup: document.querySelector("#currentGroup"),
    currentSummary: document.querySelector("#currentSummary"),
    statProgress: document.querySelector("#statProgress"),
    statMissing: document.querySelector("#statMissing"),
    statRepeated: document.querySelector("#statRepeated"),
    statExtras: document.querySelector("#statExtras"),
    progressBar: document.querySelector("#progressBar"),
    bulkPanel: document.querySelector("#bulkPanel"),
    toggleBulkBtn: document.querySelector("#toggleBulkBtn"),
    bulkInput: document.querySelector("#bulkInput"),
    bulkAddBtn: document.querySelector("#bulkAddBtn"),
    bulkRepeatedBtn: document.querySelector("#bulkRepeatedBtn"),
    repeatedList: document.querySelector("#repeatedList"),
    missingList: document.querySelector("#missingList"),
  };

  const groups = Object.keys(base);
  const cards = groups.flatMap((group) =>
    (base[group].items || []).map((item) => ({
      group,
      groupLabel: readable(group),
      codigo: item.codigo,
      nombre: item.nombre,
      label: readable(item.nombre),
      image: imageMap[item.codigo] || "",
      codeCompact: compact(item.codigo),
      searchText: normalize(`${group} ${item.codigo} ${item.nombre}`),
      searchCompact: compact(`${item.codigo} ${group} ${item.nombre}`),
    }))
  );
  const cardByCode = new Map(cards.map((card) => [normalizeCode(card.codigo), card]));
  const exactCodeCompacts = new Set(cards.map((card) => card.codeCompact));
  const teamGroups = buildTeamGroups();

  render();
  bindEvents();

  function bindEvents() {
    els.searchInput.addEventListener("input", (event) => {
      state.query = buildQuery(event.target.value);
      renderCards();
    });

    els.groupSearchInput.addEventListener("input", () => {
      renderGroups();
    });

    document.querySelectorAll("[data-filter]").forEach((button) => {
      button.addEventListener("click", () => {
        state.filter = button.dataset.filter;
        document.querySelectorAll("[data-filter]").forEach((b) => b.classList.toggle("active", b === button));
        renderCards();
      });
    });

    els.toggleBulkBtn.addEventListener("click", () => {
      els.bulkPanel.classList.toggle("hidden");
      if (!els.bulkPanel.classList.contains("hidden")) els.bulkInput.focus();
    });

    els.bulkAddBtn.addEventListener("click", () => applyBulk(1));
    els.bulkRepeatedBtn.addEventListener("click", () => applyBulk(2));
    els.exportBtn.addEventListener("click", exportProgress);
    els.importFile.addEventListener("change", importProgress);
    els.compareFile.addEventListener("change", importFriendProgress);
    els.clearCompareBtn.addEventListener("click", clearFriendProgress);
    els.clearBtn.addEventListener("click", clearProgress);

    els.content.addEventListener("click", (event) => {
      if (!event.target.closest("button, input, textarea, label")) {
        els.workspace.classList.add("sidebars-collapsed");
      }
    });
    els.sidebar.addEventListener("click", () => els.workspace.classList.remove("sidebars-collapsed"));
    els.tradePanel.addEventListener("click", () => els.workspace.classList.remove("sidebars-collapsed"));
  }

  function render() {
    renderGroups();
    renderCards();
  }

  function renderGroups() {
    const groupQuery = normalize(els.groupSearchInput.value);
    const visibleGroups = groups.filter((group) => {
      if (!groupQuery) return true;
      const groupCode = codeForGroup(group);
      return normalize(`${group} ${groupCode}`).includes(groupQuery);
    });
    const allButton = groupButton("all", "Todas", cards.length);
    els.groupList.replaceChildren(allButton, ...visibleGroups.map((group) => {
      const total = base[group].items.length;
      const owned = base[group].items.filter((item) => qty(item.codigo) > 0).length;
      return groupButton(group, readable(group), `${owned}/${total}`);
    }));
  }

  function groupButton(group, label, count) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = state.group === group ? "active" : "";
    button.innerHTML = `<span>${escapeHtml(label)}</span><small>${escapeHtml(String(count))}</small>`;
    button.addEventListener("click", () => {
      state.group = group;
      render();
    });
    return button;
  }

  function renderCards() {
    const visible = filteredCards();
    const allMode = state.group === "all";
    const albumMode = !allMode;
    const stickerGridMode = allMode || albumMode;
    const introMode = state.group === "Intro";
    const hostMode = state.group === "Host City";
    const spreadMode = isTeamAlbum(state.group);
    els.content.classList.toggle("album-mode", albumMode);
    els.content.classList.toggle("album-spread-mode", spreadMode);
    els.content.classList.toggle("intro-spread-mode", introMode);
    els.content.classList.toggle("host-spread-mode", hostMode);
    els.cardsGrid.classList.toggle("album-grid", stickerGridMode);
    els.cardsGrid.classList.toggle("album-spread", spreadMode);
    els.cardsGrid.classList.toggle("intro-spread", introMode);
    els.cardsGrid.classList.toggle("host-spread", hostMode);
    els.currentGroup.textContent = state.group === "all" ? "Todas las figuritas" : `WE ARE ${readable(state.group).toUpperCase()}`;
    els.currentSummary.textContent = summaryText(visible);

    const nodes = visible.map((card) => cardNode(card));
    els.cardsGrid.replaceChildren(...(hostMode ? hostSpreadNodes(nodes) : introMode ? introSpreadNodes(nodes) : spreadMode ? albumSpreadNodes(state.group, nodes) : nodes));
    els.emptyState.classList.toggle("hidden", nodes.length > 0);

    renderStats();
    renderTradePanel();
    renderComparePanel();
  }

  function cardNode(card) {
    const node = els.cardTemplate.content.firstElementChild.cloneNode(true);
    const count = qty(card.codigo);
    const slot = card.group === "Intro" ? getIntroSlot(card.codigo) : card.group === "Host City" ? getHostSlot(card.codigo) : getStickerSlot(card.codigo);
    if (slot !== null) node.dataset.slot = String(slot);
    node.classList.add(count === 0 ? "missing" : count > 1 ? "repeated" : "owned");
    if (card.label.toUpperCase() === "ESCUDO") node.classList.add("emblem");
    if (card.image && count > 0) node.classList.add("has-image");
    const image = node.querySelector(".sticker-art");
    if (card.image && count > 0) {
      image.src = card.image;
      image.alt = `${card.codigo} ${card.label}`;
    }
    node.querySelector(".code").textContent = card.codigo;
    node.querySelector(".name").textContent = card.label;
    node.querySelector(".group").textContent = card.groupLabel;
    node.querySelector(".qty-value").textContent = count;
    node.querySelector(".minus").addEventListener("click", () => setQty(card.codigo, Math.max(0, count - 1)));
    node.querySelector(".plus").addEventListener("click", () => setQty(card.codigo, count + 1));
    return node;
  }

  function albumSpreadNodes(group, cardNodes) {
    const bySlot = new Map(cardNodes.map((node) => [Number(node.dataset.slot), node]));

    const leftPage = document.createElement("section");
    leftPage.className = "album-page album-page-left";
    const pageTitle = document.createElement("div");
    pageTitle.className = "album-page-title";
    pageTitle.textContent = readable(group);

    const info = document.createElement("section");
    info.className = "album-team-info";
    info.innerHTML = `
      <p>WE ARE</p>
      <h2>${escapeHtml(readable(group).toUpperCase())}</h2>
      <div class="team-association">${escapeHtml(teamAssociationLabel(group))}</div>
    `;
    leftPage.append(pageTitle, ...[0, 1, 2, 3, 4].map((slot) => bySlot.get(slot)).filter(Boolean));

    const rightPage = document.createElement("section");
    rightPage.className = "album-page album-page-right";
    const groupBox = document.createElement("section");
    groupBox.className = "album-group-box";
    const members = teamGroups.find((chunk) => chunk.includes(group)) || [group];
    groupBox.innerHTML = `
      <h3>${escapeHtml(groupLabelFor(group))}</h3>
      <div class="album-group-teams">
        ${members.map((member) => `<span class="${member === group ? "active" : ""}"><i>${escapeHtml(codeForGroup(member))}</i><b>${escapeHtml(readable(member))}</b></span>`).join("")}
      </div>
    `;
    rightPage.append(...[5, 6, 7, 8, 9, 10, 11].map((slot) => bySlot.get(slot)).filter(Boolean));

    return [leftPage, rightPage];
  }

  function introSpreadNodes(cardNodes) {
    const bySlot = new Map(cardNodes.map((node) => [node.dataset.slot, node]));

    const leftPage = document.createElement("section");
    leftPage.className = "album-page intro-page intro-page-left";
    const introTitle = document.createElement("section");
    introTitle.className = "intro-title";
    introTitle.innerHTML = "<strong>FIFA WORLD CUP 2026</strong><span>Official Sticker Collection</span>";
    leftPage.append(introTitle, ...["00", "1", "2", "3", "4", "5"].map((slot) => bySlot.get(slot)).filter(Boolean));

    const rightPage = document.createElement("section");
    rightPage.className = "album-page intro-page intro-page-right";
    rightPage.append(...["6", "7", "8"].map((slot) => bySlot.get(slot)).filter(Boolean));

    return [leftPage, rightPage];
  }

  function hostSpreadNodes(cardNodes) {
    const nodes = cardNodes.map((node, index) => {
      node.dataset.slot = String(index);
      return node;
    });

    const title = document.createElement("section");
    title.className = "host-title";
    title.innerHTML = "<strong>WE ARE 26</strong><span>HOST CITIES</span>";

    const note = document.createElement("section");
    note.className = "host-note";
    note.textContent = "POSTERS INSIDE DELUXE PACKS";

    const labels = document.createElement("section");
    labels.className = "host-labels";
    labels.innerHTML = nodes.map((node) => {
      const name = node.querySelector(".name")?.textContent || "";
      return `<span>${escapeHtml(name)}</span>`;
    }).join("");

    return [title, note, ...nodes, labels];
  }

  function buildTeamGroups() {
    const teams = groups.filter((group) => group !== "Intro" && group !== "Host City");
    const chunks = [];
    for (let i = 0; i < teams.length; i += 4) chunks.push(teams.slice(i, i + 4));
    return chunks;
  }

  function isTeamAlbum(group) {
    if (group === "all" || group === "Intro" || group === "Host City" || !base[group]) return false;
    const slots = new Set((base[group].items || []).map((item) => getStickerSlot(item.codigo)).filter((slot) => slot !== null));
    return slots.size >= 10 && slots.has(0) && slots.has(11);
  }

  function getStickerSlot(code) {
    const match = String(code).match(/\s(\d+)$/);
    return match ? Number(match[1]) : null;
  }

  function getIntroSlot(code) {
    if (code === "INTRO 00") return "00";
    const match = String(code).match(/FWC(\d+)$/);
    return match ? match[1] : null;
  }

  function getHostSlot(code) {
    const all = base["Host City"]?.items || [];
    const index = all.findIndex((item) => item.codigo === code);
    return index >= 0 ? index : null;
  }

  function codeForGroup(group) {
    const first = (base[group]?.items || []).find((item) => /\s0$/.test(item.codigo));
    return first ? first.codigo.split(" ")[0] : readable(group).slice(0, 3).toUpperCase();
  }

  function groupLabelFor(group) {
    const index = teamGroups.findIndex((chunk) => chunk.includes(group));
    return index >= 0 ? `GROUP ${String.fromCharCode(65 + index)}` : "GROUP";
  }

  function teamAssociationLabel(group) {
    const label = readable(group);
    const custom = {
      "USA": "United States Soccer Federation",
      "Catar": "Qatar Football Association",
      "Iran": "Football Federation Islamic Republic of Iran",
      "Holanda": "Royal Dutch Football Association",
    };
    return custom[label] || `${label} Football Association`;
  }

  function filteredCards() {
    return cards.filter((card) => {
      const count = qty(card.codigo);
      if (state.group !== "all" && card.group !== state.group) return false;
      if (!matchesSearch(card)) return false;
      if (state.filter === "missing" && count !== 0) return false;
      if (state.filter === "owned" && count === 0) return false;
      if (state.filter === "repeated" && count < 2) return false;
      return true;
    });
  }

  function matchesSearch(card) {
    const query = state.query;
    if (!query.text) return true;
    if (query.exactCode) return card.codeCompact === query.compact;
    if (card.searchCompact.includes(query.compact)) return true;
    return query.tokens.every((token) => card.searchText.includes(token));
  }

  function renderStats() {
    const total = cards.length;
    const owned = cards.filter((card) => qty(card.codigo) > 0).length;
    const missing = total - owned;
    const repeated = cards.filter((card) => qty(card.codigo) > 1).length;
    const extras = cards.reduce((sum, card) => sum + Math.max(0, qty(card.codigo) - 1), 0);
    const progress = total ? Math.round((owned / total) * 100) : 0;

    els.statProgress.textContent = `${progress}%`;
    els.statMissing.textContent = missing;
    els.statRepeated.textContent = repeated;
    els.statExtras.textContent = extras;
    els.progressBar.style.width = `${progress}%`;
  }

  function renderTradePanel() {
    const repeated = cards.filter((card) => qty(card.codigo) > 1).slice(0, 80);
    const missing = cards.filter((card) => qty(card.codigo) === 0).slice(0, 80);
    els.repeatedList.replaceChildren(...listNodes(repeated, (card) => `x${qty(card.codigo) - 1}`));
    els.missingList.replaceChildren(...listNodes(missing, () => "falta"));
  }

  function renderComparePanel() {
    const friend = state.friendQuantities;
    const hasFriend = Boolean(friend);
    els.clearCompareBtn.classList.toggle("hidden", !hasFriend);
    els.friendCanGiveBlock.classList.toggle("hidden", !hasFriend);
    els.youCanGiveBlock.classList.toggle("hidden", !hasFriend);

    if (!hasFriend) {
      els.compareSummary.textContent = "Importá el progreso exportado por otra persona para ver cambios posibles.";
      els.friendCanGive.replaceChildren();
      els.youCanGive.replaceChildren();
      return;
    }

    const friendCanGive = cards.filter((card) => qty(card.codigo) === 0 && qtyFrom(friend, card.codigo) > 1);
    const youCanGive = cards.filter((card) => qty(card.codigo) > 1 && qtyFrom(friend, card.codigo) === 0);
    const swaps = Math.min(friendCanGive.length, youCanGive.length);

    els.compareSummary.textContent = `${friendCanGive.length} te sirven · ${youCanGive.length} le sirven · ${swaps} cambios posibles`;
    els.friendCanGive.replaceChildren(...listNodes(friendCanGive.slice(0, 80), (card) => `amigo x${qtyFrom(friend, card.codigo) - 1}`));
    els.youCanGive.replaceChildren(...listNodes(youCanGive.slice(0, 80), (card) => `vos x${qty(card.codigo) - 1}`));
  }

  function listNodes(list, suffix) {
    if (!list.length) {
      const empty = document.createElement("p");
      empty.className = "empty";
      empty.textContent = "Nada por acá.";
      return [empty];
    }

    return list.map((card) => {
      const item = document.createElement("div");
      item.className = "mini-item";
      item.innerHTML = `<strong>${escapeHtml(card.codigo)} · ${escapeHtml(card.label)}</strong><span>${escapeHtml(card.groupLabel)} · ${escapeHtml(suffix(card))}</span>`;
      return item;
    });
  }

  function summaryText(list) {
    const missing = list.filter((card) => qty(card.codigo) === 0).length;
    const repeated = list.filter((card) => qty(card.codigo) > 1).length;
    return `${list.length} cromos visibles · ${missing} faltan · ${repeated} repetidas`;
  }

  function applyBulk(mode) {
    const codes = parseCodes(els.bulkInput.value);
    if (!codes.length) return;

    let applied = 0;
    for (const code of codes) {
      const card = cardByCode.get(normalizeCode(code));
      if (!card) continue;
      const next = mode === 2 ? Math.max(2, qty(card.codigo)) : qty(card.codigo) + 1;
      state.quantities[card.codigo] = next;
      applied++;
    }

    saveProgress();
    els.bulkInput.value = "";
    render();
    els.currentSummary.textContent = `${applied} códigos cargados. ${els.currentSummary.textContent}`;
  }

  function parseCodes(text) {
    const normalized = text.replace(/[,;\n\r\t]+/g, " ").trim();
    if (!normalized) return [];
    const knownCodes = [...cardByCode.keys()].sort((a, b) => b.length - a.length);
    const found = [];
    let remaining = ` ${normalizeCode(normalized)} `;

    for (const code of knownCodes) {
      const needle = ` ${code} `;
      while (remaining.includes(needle)) {
        found.push(code);
        remaining = remaining.replace(needle, " ");
      }
    }

    return found;
  }

  function setQty(code, count) {
    if (count <= 0) delete state.quantities[code];
    else state.quantities[code] = count;
    saveProgress();
    render();
  }

  function qty(code) {
    return Number(state.quantities[code] || 0);
  }

  function qtyFrom(quantities, code) {
    return Number((quantities && quantities[code]) || 0);
  }

  function loadProgress() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch {
      return {};
    }
  }

  function saveProgress() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.quantities));
  }

  function exportProgress() {
    const payload = {
      app: "digital-panini-2026-manager",
      exportedAt: new Date().toISOString(),
      quantities: state.quantities,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "digital-panini-2026-progreso.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  function importProgress(event) {
    const [file] = event.target.files;
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const payload = JSON.parse(reader.result);
        state.quantities = quantitiesFromPayload(payload);
        saveProgress();
        render();
      } catch {
        alert("No pude leer ese archivo de progreso.");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  function importFriendProgress(event) {
    const [file] = event.target.files;
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const payload = JSON.parse(reader.result);
        state.friendQuantities = quantitiesFromPayload(payload);
        renderComparePanel();
      } catch {
        alert("No pude leer ese archivo de progreso.");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  function clearFriendProgress() {
    state.friendQuantities = null;
    renderComparePanel();
  }

  function quantitiesFromPayload(payload) {
    const raw = payload.quantities || payload || {};
    return Object.fromEntries(Object.entries(raw).filter(([, value]) => Number(value) > 0));
  }

  function clearProgress() {
    if (!confirm("¿Reiniciar cantidades del álbum?")) return;
    state.quantities = {};
    saveProgress();
    render();
  }

  function readable(text) {
    return repairMojibake(String(text));
  }

  function repairMojibake(text) {
    const hasMojibakePair = /(?:Ã[\u0080-\u00bf\u0192\u201a-\u2026\u2030\u0160\u0152\u017D\u2018-\u201D\u2022\u2122]|\u00c2[\u0080-\u00bf]|\u00e2[\u0080-\u00bf\u201a-\u2026\u2030\u0160\u0152\u017D\u2018-\u201D\u2022\u2122])/.test(text);
    if (!hasMojibakePair) return text;
    try {
      const bytes = Uint8Array.from([...text].map((char) => char.charCodeAt(0) & 255));
      return new TextDecoder("utf-8").decode(bytes).replace(/\u00e2\u20ac\u2122/g, "’");
    } catch {
      return text;
    }
  }

  function buildQuery(value) {
    const text = normalize(value);
    const compactQuery = compact(value);
    return {
      text,
      compact: compactQuery,
      exactCode: exactCodeCompacts.has(compactQuery),
      tokens: text.split(" ").filter(Boolean),
    };
  }

  function normalize(value) {
    return readable(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\p{L}\p{N}/]+/gu, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase();
  }

  function compact(value) {
    return normalize(value).replace(/[^A-Z0-9]/g, "");
  }

  function normalizeCode(value) {
    return normalize(value).replace(/\s+/g, " ").trim();
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
})();
