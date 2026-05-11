(function () {
  const STORAGE_KEY = "digital-panini-2026-progress-v1";
  const USER_KEY = "digital-panini-2026-user-v1";
  const EXCHANGE_KEY = "digital-panini-2026-exchanges-v1";
  const BACKEND_URL_KEY = "digital-panini-2026-sync-backend-url";
  const DEFAULT_BACKEND_URL = "https://panini2026digitalbackend.onrender.com";
  const OWN_PROFILE_KEY = "digital-panini-2026-own-profile-id";
  const AUTH_KEY = "digital-panini-2026-sync-auth";
  const base = window.CROMOS_BASE || {};
  const imageMap = window.CROMOS_IMAGES || {};
  const state = {
    group: "all",
    filter: "all",
    query: { text: "", compact: "", tokens: [] },
    username: loadUsername(),
    quantities: loadProgress(),
    exchanges: loadExchanges(),
    exchangeDraft: { give: [], receive: [] },
    friendQuantities: null,
    friendLabel: "",
    backendUrl: loadBackendUrl(),
    onlineProfiles: [],
    selectedOnlineProfileId: "",
    ownProfileId: localStorage.getItem(OWN_PROFILE_KEY) || "",
    auth: loadAuth(),
  };

  const els = {
    authLanding: document.querySelector("#authLanding"),
    shell: document.querySelector(".shell"),
    landingBackendUrlInput: document.querySelector("#landingBackendUrlInput"),
    landingSyncUserInput: document.querySelector("#landingSyncUserInput"),
    landingSyncPasswordInput: document.querySelector("#landingSyncPasswordInput"),
    landingLoginBtn: document.querySelector("#landingLoginBtn"),
    landingRegisterBtn: document.querySelector("#landingRegisterBtn"),
    landingAuthStatus: document.querySelector("#landingAuthStatus"),
    usernameInput: document.querySelector("#usernameInput"),
    exportQrBtn: document.querySelector("#exportQrBtn"),
    exportBtn: document.querySelector("#exportBtn"),
    importFile: document.querySelector("#importFile"),
    compareFile: document.querySelector("#compareFile"),
    compareSummary: document.querySelector("#compareSummary"),
    clearCompareBtn: document.querySelector("#clearCompareBtn"),
    backendUrlInput: document.querySelector("#backendUrlInput"),
    loadFriendsBtn: document.querySelector("#loadFriendsBtn"),
    syncManagerBtn: document.querySelector("#syncManagerBtn"),
    onlineStatus: document.querySelector("#onlineStatus"),
    onlineFriendsList: document.querySelector("#onlineFriendsList"),
    friendSearchInput: document.querySelector("#friendSearchInput"),
    friendSearchResults: document.querySelector("#friendSearchResults"),
    syncAccountLabel: document.querySelector("#syncAccountLabel"),
    logoutManagerBtn: document.querySelector("#logoutManagerBtn"),
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
    repeatedList: document.querySelector("#repeatedList"),
    missingList: document.querySelector("#missingList"),
    openExchangeBtn: document.querySelector("#openExchangeBtn"),
    manageExchangeBtn: document.querySelector("#manageExchangeBtn"),
    exchangeSummary: document.querySelector("#exchangeSummary"),
    exchangePreview: document.querySelector("#exchangePreview"),
    exchangeModal: document.querySelector("#exchangeModal"),
    closeExchangeBtn: document.querySelector("#closeExchangeBtn"),
    exchangeForm: document.querySelector("#exchangeForm"),
    exchangeName: document.querySelector("#exchangeName"),
    exchangeGiveSearch: document.querySelector("#exchangeGiveSearch"),
    exchangeReceiveSearch: document.querySelector("#exchangeReceiveSearch"),
    exchangeGiveSelected: document.querySelector("#exchangeGiveSelected"),
    exchangeReceiveSelected: document.querySelector("#exchangeReceiveSelected"),
    exchangeGiveResults: document.querySelector("#exchangeGiveResults"),
    exchangeReceiveResults: document.querySelector("#exchangeReceiveResults"),
    exchangeAllowRepeated: document.querySelector("#exchangeAllowRepeated"),
    exchangeValidation: document.querySelector("#exchangeValidation"),
    resetExchangeFormBtn: document.querySelector("#resetExchangeFormBtn"),
    exchangeList: document.querySelector("#exchangeList"),
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
  syncFromBackendOnLoad();

  function bindEvents() {
    els.usernameInput.value = state.username;
    els.backendUrlInput.value = state.backendUrl;
    els.landingBackendUrlInput.value = state.backendUrl;
    renderAuth();
    els.usernameInput.addEventListener("input", (event) => {
      state.username = event.target.value.trim();
      saveUsername();
    });
    els.backendUrlInput.addEventListener("input", (event) => {
      state.backendUrl = event.target.value.trim();
      saveBackendUrl();
      els.landingBackendUrlInput.value = state.backendUrl;
    });
    els.landingBackendUrlInput.addEventListener("input", (event) => {
      state.backendUrl = event.target.value.trim();
      saveBackendUrl();
      els.backendUrlInput.value = state.backendUrl;
    });

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

    els.exportBtn.addEventListener("click", exportProgress);
    els.exportQrBtn.addEventListener("click", exportQrProgress);
    els.importFile.addEventListener("change", importProgress);
    els.compareFile.addEventListener("change", importFriendProgress);
    els.clearCompareBtn.addEventListener("click", clearFriendProgress);
    els.loadFriendsBtn.addEventListener("click", () => syncFromBackend({ applyOwn: true, manual: true }));
    els.syncManagerBtn.addEventListener("click", syncManagerStatus);
    els.friendSearchInput.addEventListener("input", debounce(searchFriends, 250));
    els.logoutManagerBtn.addEventListener("click", logoutManager);
    els.landingLoginBtn.addEventListener("click", () => loginManager("login"));
    els.landingRegisterBtn.addEventListener("click", () => loginManager("register"));
    els.clearBtn.addEventListener("click", clearProgress);
    els.openExchangeBtn.addEventListener("click", openExchangeModal);
    els.manageExchangeBtn.addEventListener("click", openExchangeModal);
    els.closeExchangeBtn.addEventListener("click", closeExchangeModal);
    els.exchangeModal.addEventListener("click", (event) => {
      if (event.target === els.exchangeModal) closeExchangeModal();
    });
    els.exchangeForm.addEventListener("submit", saveExchangeFromForm);
    els.resetExchangeFormBtn.addEventListener("click", resetExchangeForm);
    els.exchangeGiveSearch.addEventListener("input", renderExchangePickers);
    els.exchangeReceiveSearch.addEventListener("input", renderExchangePickers);
    els.exchangeAllowRepeated.addEventListener("change", renderExchangePickers);

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
    renderOnlineFriends();
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
    renderExchangeSummary();
  }

  function renderExchangeSummary() {
    const pending = state.exchanges.length;
    els.exchangeSummary.textContent = pending
      ? `${pending} cambio${pending === 1 ? "" : "s"} pendiente${pending === 1 ? "" : "s"} guardado${pending === 1 ? "" : "s"} solo en este navegador.`
      : "Todavia no hay cambios pendientes.";
    const nodes = state.exchanges.slice(0, 3).map((exchange) => {
      const item = document.createElement("div");
      item.className = "mini-item";
      item.innerHTML = `<strong>${escapeHtml(exchange.title)}</strong><span>${escapeHtml(exchange.give.join(", "))} -> ${escapeHtml(exchange.receive.join(", "))}</span><div class="exchange-mini-preview">${exchangePreviewList([...exchange.give, ...exchange.receive].slice(0, 4))}</div>`;
      return item;
    });
    els.exchangePreview.replaceChildren(...nodes);
    renderExchangeModalList();
  }

  function openExchangeModal() {
    els.workspace.classList.remove("sidebars-collapsed");
    els.exchangeModal.classList.remove("hidden");
    renderExchangeModalList();
    renderExchangePickers();
    setTimeout(() => els.exchangeGiveSearch.focus(), 0);
  }

  function closeExchangeModal() {
    els.exchangeModal.classList.add("hidden");
  }

  function resetExchangeForm() {
    els.exchangeForm.reset();
    state.exchangeDraft = { give: [], receive: [] };
    els.exchangeValidation.textContent = "";
    els.exchangeValidation.classList.remove("ok");
    renderExchangePickers();
    els.exchangeGiveSearch.focus();
  }

  function saveExchangeFromForm(event) {
    event.preventDefault();
    const draft = exchangeDraftFromForm();
    const validation = validateExchange(draft);
    if (!validation.ok) {
      showExchangeValidation(validation.message, false);
      return;
    }

    state.exchanges.unshift({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      createdAt: new Date().toISOString(),
      title: draft.title || defaultExchangeTitle(draft),
      give: draft.give,
      receive: draft.receive,
      allowRepeated: draft.allowRepeated,
    });
    saveExchanges();
    resetExchangeForm();
    render();
    showExchangeValidation("Cambio guardado.", true);
  }

  function exchangeDraftFromForm() {
    return {
      title: els.exchangeName.value.trim(),
      give: [...state.exchangeDraft.give],
      receive: [...state.exchangeDraft.receive],
      allowRepeated: els.exchangeAllowRepeated.checked,
    };
  }

  function renderExchangePickers() {
    renderSelectedExchangeCards("give");
    renderSelectedExchangeCards("receive");
    renderPickerResults("give");
    renderPickerResults("receive");
    const draft = exchangeDraftFromForm();
    if (!draft.give.length && !draft.receive.length) {
      showExchangeValidation("", false);
      return;
    }
    const validation = validateExchange(draft);
    showExchangeValidation(validation.message, validation.ok);
  }

  function renderSelectedExchangeCards(kind) {
    const target = kind === "give" ? els.exchangeGiveSelected : els.exchangeReceiveSelected;
    const codes = state.exchangeDraft[kind];
    if (!codes.length) {
      const empty = document.createElement("p");
      empty.className = "selected-empty";
      empty.textContent = kind === "give" ? "Todavia no elegiste que entregas." : "Todavia no elegiste que recibis.";
      target.replaceChildren(empty);
      return;
    }

    const chips = codes.map((code, index) => {
      const card = cardByCode.get(normalizeCode(code));
      const chip = document.createElement("button");
      chip.className = "selected-chip";
      chip.type = "button";
      chip.innerHTML = `${stickerThumb(card)}<strong>${escapeHtml(code)}</strong><span>${escapeHtml(card?.label || "")}</span><i aria-hidden="true">x</i>`;
      chip.title = "Quitar";
      chip.addEventListener("click", () => {
        state.exchangeDraft[kind].splice(index, 1);
        renderExchangePickers();
      });
      return chip;
    });
    target.replaceChildren(...chips);
  }

  function renderPickerResults(kind) {
    const input = kind === "give" ? els.exchangeGiveSearch : els.exchangeReceiveSearch;
    const target = kind === "give" ? els.exchangeGiveResults : els.exchangeReceiveResults;
    const query = buildQuery(input.value);
    const selected = countCodes(state.exchangeDraft[kind]);
    let resultCards = cards.filter((card) => {
      const matches = !query.text || matchesExchangeQuery(card, query);
      if (!matches) return false;
      if (kind === "give" && state.friendQuantities && qtyFrom(state.friendQuantities, card.codigo) > 0) return false;
      if (kind === "receive" && state.friendQuantities && qtyFrom(state.friendQuantities, card.codigo) <= (selected.get(card.codigo) || 0) + 1) return false;
      if (!query.text && kind === "give") return qty(card.codigo) > (selected.get(card.codigo) || 0) + 1;
      if (!query.text && kind === "receive" && !els.exchangeAllowRepeated.checked) return qty(card.codigo) === 0;
      return true;
    });

    resultCards = resultCards
      .sort((a, b) => exchangeSortScore(kind, b, selected) - exchangeSortScore(kind, a, selected))
      .slice(0, 10);

    if (!resultCards.length) {
      const empty = document.createElement("p");
      empty.className = "selected-empty";
      empty.textContent = "Sin resultados.";
      target.replaceChildren(empty);
      return;
    }

    const nodes = resultCards.map((card) => {
      const selectedCount = selected.get(card.codigo) || 0;
      const available = qty(card.codigo) - selectedCount;
      const cannotGive = kind === "give" && available <= 1;
      const cannotReceive = kind === "receive" && !els.exchangeAllowRepeated.checked && qty(card.codigo) > 0;
      const friendCannotGive = kind === "receive" && state.friendQuantities && qtyFrom(state.friendQuantities, card.codigo) <= selectedCount + 1;
      const friendDoesNotNeed = kind === "give" && state.friendQuantities && qtyFrom(state.friendQuantities, card.codigo) > 0;
      const button = document.createElement("button");
      button.className = "picker-result";
      button.type = "button";
      button.disabled = cannotGive || cannotReceive || friendCannotGive || friendDoesNotNeed;
      button.innerHTML = `
        ${stickerThumb(card)}
        <span><strong>${escapeHtml(card.codigo)}</strong>${escapeHtml(card.label)}</span>
        <small>${escapeHtml(card.groupLabel)} · ${exchangeCardStatus(card, kind, selectedCount)}</small>
      `;
      button.addEventListener("click", () => addExchangeCard(kind, card.codigo));
      return button;
    });
    target.replaceChildren(...nodes);
  }

  function matchesExchangeQuery(card, query) {
    if (query.exactCode) return card.codeCompact === query.compact;
    if (card.searchCompact.includes(query.compact)) return true;
    return query.tokens.every((token) => card.searchText.includes(token));
  }

  function exchangeSortScore(kind, card, selected) {
    const selectedCount = selected.get(card.codigo) || 0;
    if (kind === "give") {
      const friendBoost = state.friendQuantities && qtyFrom(state.friendQuantities, card.codigo) === 0 ? 8 : 0;
      return friendBoost + Math.max(0, qty(card.codigo) - selectedCount - 1);
    }
    const friendAvailable = state.friendQuantities ? Math.max(0, qtyFrom(state.friendQuantities, card.codigo) - selectedCount - 1) : 0;
    if (qty(card.codigo) === 0) return 3;
    return friendAvailable * 5 + (els.exchangeAllowRepeated.checked ? 1 : 0);
  }

  function exchangeCardStatus(card, kind, selectedCount) {
    const current = qty(card.codigo);
    if (kind === "give") {
      const available = Math.max(0, current - selectedCount - 1);
      const friendText = state.friendQuantities
        ? qtyFrom(state.friendQuantities, card.codigo) === 0 ? " · le falta" : " · ya la tiene"
        : "";
      return available ? `repetidas x${available}${friendText}` : current ? `sin repetida libre${friendText}` : "no la tenes";
    }
    if (state.friendQuantities) {
      const friendExtras = Math.max(0, qtyFrom(state.friendQuantities, card.codigo) - selectedCount - 1);
      if (!friendExtras) return current > 0 ? `ya tenes x${current} · amigo sin repetida` : "amigo sin repetida";
      return current > 0 ? `ya tenes x${current} · amigo x${friendExtras}` : `te falta · amigo x${friendExtras}`;
    }
    if (current > 0) return `ya tenes x${current}`;
    return "te falta";
  }

  function addExchangeCard(kind, code) {
    state.exchangeDraft[kind].push(code);
    const input = kind === "give" ? els.exchangeGiveSearch : els.exchangeReceiveSearch;
    input.value = "";
    renderExchangePickers();
    input.focus();
  }

  function showExchangeValidation(message, ok) {
    els.exchangeValidation.textContent = message;
    els.exchangeValidation.classList.toggle("ok", Boolean(ok && message));
  }

  function validateExchange(exchange) {
    if (!exchange.give.length) return { ok: false, message: "Agrega al menos una figurita para entregar." };
    if (!exchange.receive.length) return { ok: false, message: "Agrega al menos una figurita para recibir." };

    const giveCounts = countCodes(exchange.give);
    for (const [code, amount] of giveCounts) {
      const current = qty(code);
      if (current <= 0) return { ok: false, message: `No podes ofrecer ${code} porque no la tenes.` };
      if (current - amount < 1) return { ok: false, message: `${code} tiene que quedar en tu album; solo podes ofrecer repetidas.` };
      if (state.friendQuantities && qtyFrom(state.friendQuantities, code) > 0) return { ok: false, message: `${code} no le sirve a tu amigo porque ya la tiene.` };
    }

    if (state.friendQuantities) {
      const receiveCounts = countCodes(exchange.receive);
      for (const [code, amount] of receiveCounts) {
        if (qtyFrom(state.friendQuantities, code) - amount < 1) return { ok: false, message: `Tu amigo no tiene repetida libre de ${code}.` };
      }
    }

    if (!exchange.allowRepeated) {
      const repeatedReceive = exchange.receive.find((code) => qty(code) > 0);
      if (repeatedReceive) return { ok: false, message: `Ya tenes ${repeatedReceive}. Marca "Aceptar repetidas" para recibirla igual.` };
    }

    return { ok: true, message: "El cambio esta listo para guardar." };
  }

  function countCodes(codes) {
    const counts = new Map();
    for (const code of codes) counts.set(code, (counts.get(code) || 0) + 1);
    return counts;
  }

  function resolveCode(code) {
    return cardByCode.get(normalizeCode(code))?.codigo || "";
  }

  function defaultExchangeTitle(exchange) {
    return `${exchange.give.length} x ${exchange.receive.length}`;
  }

  function stickerThumb(card) {
    if (card?.image) return `<img class="exchange-thumb" src="${escapeHtml(card.image)}" alt="">`;
    return `<span class="exchange-thumb thumb-fallback">${escapeHtml(card?.codigo || "?")}</span>`;
  }

  function exchangeCardPreview(code) {
    const card = cardByCode.get(normalizeCode(code));
    return `
      <span class="exchange-card-preview">
        ${stickerThumb(card)}
        <span><strong>${escapeHtml(code)}</strong>${escapeHtml(card?.label || "")}</span>
      </span>
    `;
  }

  function exchangePreviewList(codes) {
    return codes.map(exchangeCardPreview).join("");
  }

  function renderExchangeModalList() {
    if (!els.exchangeList) return;
    if (!state.exchanges.length) {
      const empty = document.createElement("p");
      empty.className = "empty";
      empty.textContent = "No hay cambios pendientes.";
      els.exchangeList.replaceChildren(empty);
      return;
    }

    const nodes = state.exchanges.map((exchange) => {
      const item = document.createElement("article");
      item.className = "exchange-item";
      item.innerHTML = `
        <div>
          <strong>${escapeHtml(exchange.title)}</strong>
          <small>${escapeHtml(dateLabel(exchange.createdAt))}</small>
        </div>
        <div class="exchange-codes">
          <span><b>Entrego</b>${exchangePreviewList(exchange.give)}</span>
          <span><b>Recibo</b>${exchangePreviewList(exchange.receive)}</span>
        </div>
        <div class="exchange-actions">
          <button class="primary" type="button" data-complete="${escapeHtml(exchange.id)}">OK</button>
          <button class="ghost danger" type="button" data-delete="${escapeHtml(exchange.id)}">Borrar</button>
        </div>
      `;
      item.querySelector("[data-complete]").addEventListener("click", () => completeExchange(exchange.id));
      item.querySelector("[data-delete]").addEventListener("click", () => deleteExchange(exchange.id));
      return item;
    });
    els.exchangeList.replaceChildren(...nodes);
  }

  function completeExchange(id) {
    const exchange = state.exchanges.find((item) => item.id === id);
    if (!exchange) return;
    const validation = validateExchange(exchange);
    if (!validation.ok) {
      showExchangeValidation(validation.message, false);
      return;
    }

    for (const [code, amount] of countCodes(exchange.give)) state.quantities[code] = qty(code) - amount;
    for (const [code, amount] of countCodes(exchange.receive)) state.quantities[code] = qty(code) + amount;
    state.exchanges = state.exchanges.filter((item) => item.id !== id);
    saveProgress();
    saveExchanges();
    render();
    showExchangeValidation("Cambio completado y cantidades actualizadas.", true);
  }

  function deleteExchange(id) {
    state.exchanges = state.exchanges.filter((item) => item.id !== id);
    saveExchanges();
    render();
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

    const friendName = state.friendLabel ? `${state.friendLabel}: ` : "";
    els.compareSummary.textContent = `${friendName}${friendCanGive.length} te sirven · ${youCanGive.length} le sirven · ${swaps} cambios posibles`;
    els.friendCanGive.replaceChildren(...listNodes(friendCanGive.slice(0, 80), (card) => `amigo x${qtyFrom(friend, card.codigo) - 1}`));
    els.youCanGive.replaceChildren(...listNodes(youCanGive.slice(0, 80), (card) => `vos x${qty(card.codigo) - 1}`));
  }

  function syncFromBackendOnLoad() {
    if (!state.backendUrl) return;
    if (!state.auth?.token) return;
    syncFromBackend({ applyOwn: true, manual: false });
  }

  async function syncFromBackend({ applyOwn = true, manual = false } = {}) {
    const backendUrl = normalizedBackendUrl();
    if (!backendUrl) {
      if (manual) {
        setOnlineStatus("Configura la URL del backend.", false);
        els.backendUrlInput.focus();
      }
      return;
    }

    setOnlineBusy(true);
    setOnlineStatus(manual ? "Sincronizando con backend..." : "Actualizando desde backend...", true);
    try {
      if (applyOwn && state.auth?.token) {
        const ownResponse = await fetch(`${backendUrl}/api/me/profile`, { headers: authHeaders(false) });
        const ownData = await ownResponse.json().catch(() => ({}));
      if (!ownResponse.ok) throw new Error(ownData.message || ownData.error || `Backend respondio ${ownResponse.status}.`);
        if (ownData.profile) {
          applyProfileToManager(ownData.profile);
          setOnlineStatus(`Status actualizado desde tu cuenta: ${ownData.profile.user || "Sin usuario"}.`, true);
        } else if (manual) {
          setOnlineStatus("Tu cuenta todavia no tiene status sincronizado desde el plugin.", false);
        }
      }

      const response = await fetch(`${backendUrl}/api/profiles`, { headers: authHeaders(false) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || data.error || `Backend respondio ${response.status}.`);
      state.onlineProfiles = Array.isArray(data.profiles) ? data.profiles : [];

      const ownProfile = applyOwn && !state.auth?.token ? findOwnProfile(state.onlineProfiles) : null;
      if (ownProfile) {
        applyProfileToManager(ownProfile);
        setOnlineStatus(`Status actualizado desde backend: ${ownProfile.user || "Sin usuario"}.`, true);
      } else {
        setOnlineStatus(`${state.onlineProfiles.length} perfil${state.onlineProfiles.length === 1 ? "" : "es"} sincronizado${state.onlineProfiles.length === 1 ? "" : "s"}.`, true);
      }
      renderOnlineFriends();
    } catch (error) {
      if (manual) setOnlineStatus(error.message || "No pude sincronizar con el backend.", false);
      else setOnlineStatus("No pude actualizar desde backend. Uso el progreso local.", false);
    } finally {
      setOnlineBusy(false);
    }
  }

  async function loadOnlineFriends() {
    return syncFromBackend({ applyOwn: false, manual: true });
  }

  async function syncManagerStatus() {
    const backendUrl = normalizedBackendUrl();
    if (!backendUrl) {
      setOnlineStatus("Configura la URL del backend.", false);
      els.backendUrlInput.focus();
      return;
    }
    if (!state.username) {
      const name = prompt("Nombre para sincronizar tu Manager:");
      if (name === null) return;
      state.username = name.trim() || "Sin usuario";
      els.usernameInput.value = state.username;
      saveUsername();
    }

    setOnlineBusy(true);
    setOnlineStatus("Sincronizando este Manager...", true);
    try {
      const response = await fetch(`${backendUrl}/api/profiles`, {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({
          ...progressPayload(),
          id: managerProfileId(),
          source: "manager"
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || data.error || `Backend respondio ${response.status}.`);
      if (data.profile?.id) {
        state.ownProfileId = data.profile.id;
        localStorage.setItem(OWN_PROFILE_KEY, state.ownProfileId);
      }
      setOnlineStatus(`Manager sincronizado como ${data.profile?.user || state.username}.`, true);
      await syncFromBackend({ applyOwn: true, manual: false });
    } catch (error) {
      setOnlineStatus(error.message || "No pude sincronizar este Manager.", false);
      setOnlineBusy(false);
    }
  }

  function findOwnProfile(profiles) {
    if (!profiles.length) return null;
    const byId = state.ownProfileId && profiles.find((profile) => profile.id === state.ownProfileId);
    if (byId) return byId;

    const managerId = managerProfileId();
    const byManagerId = profiles.find((profile) => profile.id === managerId);
    if (byManagerId) return byManagerId;

    const currentUser = normalize(state.username);
    if (currentUser) {
      const byUser = profiles.find((profile) => normalize(profile.user) === currentUser);
      if (byUser) return byUser;
    }

    const latestPluginProfile = profiles.find((profile) => profile.source === "plugin");
    if (latestPluginProfile) return latestPluginProfile;

    const hasLocalProgress = Object.keys(state.quantities).length > 0;
    if (!hasLocalProgress && profiles.length === 1) return profiles[0];
    return null;
  }

  async function loginManager(mode) {
    const backendUrl = normalizedBackendUrl();
    const username = els.landingSyncUserInput.value.trim();
    const password = els.landingSyncPasswordInput.value;
    if (!backendUrl || !username || !password) {
      setOnlineStatus("Completa backend, usuario y clave.", false);
      setLandingAuthStatus("Completa backend, usuario y clave.", false);
      return;
    }

    setOnlineBusy(true);
    setOnlineStatus(mode === "register" ? "Creando usuario..." : "Entrando...", true);
    try {
      const response = await fetch(`${backendUrl}/api/auth/${mode}`, {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({ username, password, displayName: username })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || data.error || `Backend respondio ${response.status}.`);
      state.auth = data;
      localStorage.setItem(AUTH_KEY, JSON.stringify(data));
      els.landingSyncPasswordInput.value = "";
      if (!state.username) {
        state.username = data.user?.displayName || username;
        els.usernameInput.value = state.username;
        saveUsername();
      }
      renderAuth();
      setOnlineStatus(`Logueado como ${data.user?.displayName || username}.`, true);
      setLandingAuthStatus("", true);
      await syncFromBackend({ applyOwn: true, manual: false });
    } catch (error) {
      setOnlineStatus(error.message || "No pude iniciar sesion.", false);
      setLandingAuthStatus(error.message || "No pude iniciar sesion.", false);
    } finally {
      setOnlineBusy(false);
    }
  }

  function logoutManager() {
    state.auth = null;
    state.friendQuantities = null;
    state.friendLabel = "";
    state.onlineProfiles = [];
    state.selectedOnlineProfileId = "";
    state.ownProfileId = "";
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(OWN_PROFILE_KEY);
    els.landingSyncPasswordInput.value = "";
    renderAuth();
    clearFriendProgress();
    renderOnlineFriends();
    setOnlineStatus("Sesion cerrada.", true);
    setLandingAuthStatus("Sesion cerrada.", true);
  }

  function renderAuth() {
    const logged = Boolean(state.auth?.token);
    els.authLanding.classList.toggle("hidden", logged);
    els.shell.classList.toggle("hidden", !logged);
    if (logged) {
      const username = state.auth.user?.username || state.auth.user?.displayName || "";
      els.landingSyncUserInput.value = username;
      els.syncAccountLabel.textContent = `Cuenta: ${state.auth.user?.displayName || username}`;
    } else {
      els.syncAccountLabel.textContent = "Sin cuenta activa";
    }
  }

  function setLandingAuthStatus(message, ok) {
    els.landingAuthStatus.textContent = message;
    els.landingAuthStatus.classList.toggle("ok", Boolean(ok));
  }

  function applyProfileToManager(profile) {
    state.quantities = quantitiesFromPayload(profile);
    if (profile.user && !state.username) {
      state.username = String(profile.user).trim();
      els.usernameInput.value = state.username;
      saveUsername();
    }
    if (profile.id) {
      state.ownProfileId = profile.id;
      localStorage.setItem(OWN_PROFILE_KEY, profile.id);
    }
    saveProgress();
    render();
  }

  function renderOnlineFriends() {
    if (!els.onlineFriendsList) return;
    if (!state.onlineProfiles.length) {
      const empty = document.createElement("p");
      empty.className = "empty";
      empty.textContent = "No hay amigos cargados todavia.";
      els.onlineFriendsList.replaceChildren(empty);
      return;
    }

    const nodes = state.onlineProfiles.map((profile) => {
      const trade = onlineTradeSummary(profile.quantities || {});
      const button = document.createElement("button");
      button.type = "button";
      button.className = profile.id === state.selectedOnlineProfileId ? "online-friend active" : "online-friend";
      button.innerHTML = `
        <strong>${escapeHtml(profile.user || "Sin usuario")}</strong>
        <span>${escapeHtml(trade.friendCanGive)} te sirven - ${escapeHtml(trade.youCanGive)} le sirven</span>
        <small>${escapeHtml(profile.source || "sync")} - ${escapeHtml(dateLabel(profile.updatedAt || profile.exportedAt))}</small>
      `;
      button.addEventListener("click", () => selectOnlineFriend(profile));
      return button;
    });
    els.onlineFriendsList.replaceChildren(...nodes);
  }

  function selectOnlineFriend(profile) {
    state.selectedOnlineProfileId = profile.id || "";
    state.friendQuantities = quantitiesFromPayload(profile);
    state.friendLabel = profile.user || "";
    renderComparePanel();
    renderExchangePickers();
    renderOnlineFriends();
  }

  async function searchFriends() {
    const backendUrl = normalizedBackendUrl();
    const query = els.friendSearchInput.value.trim();
    if (!backendUrl || query.length < 2) {
      els.friendSearchResults.replaceChildren();
      return;
    }

    try {
      const response = await fetch(`${backendUrl}/api/users?q=${encodeURIComponent(query)}`, { headers: authHeaders(false) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || data.error || `Backend respondio ${response.status}.`);
      renderFriendSearchResults(Array.isArray(data.users) ? data.users : []);
    } catch (error) {
      const item = document.createElement("p");
      item.className = "empty";
      item.textContent = error.message || "No pude buscar usuarios.";
      els.friendSearchResults.replaceChildren(item);
    }
  }

  function renderFriendSearchResults(users) {
    if (!users.length) {
      const empty = document.createElement("p");
      empty.className = "empty";
      empty.textContent = "Sin usuarios encontrados.";
      els.friendSearchResults.replaceChildren(empty);
      return;
    }

    const nodes = users.map((user) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "online-friend";
      button.disabled = !user.hasProfile;
      button.innerHTML = `
        <strong>${escapeHtml(user.displayName || user.username)}</strong>
        <span>@${escapeHtml(user.username)} - ${user.hasProfile ? "status disponible" : "sin status sincronizado"}</span>
        <small>${escapeHtml(user.updatedAt ? dateLabel(user.updatedAt) : "Esperando plugin")}</small>
      `;
      button.addEventListener("click", () => selectFriendUser(user));
      return button;
    });
    els.friendSearchResults.replaceChildren(...nodes);
  }

  async function selectFriendUser(user) {
    const backendUrl = normalizedBackendUrl();
    setOnlineStatus(`Cargando status de ${user.displayName || user.username}...`, true);
    try {
      const response = await fetch(`${backendUrl}/api/users/${encodeURIComponent(user.username)}/profile`, { headers: authHeaders(false) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || data.error || `Backend respondio ${response.status}.`);
      selectOnlineFriend(data.profile);
      setOnlineStatus(`Comparando con ${data.profile.user || user.username}.`, true);
    } catch (error) {
      setOnlineStatus(error.message || "No pude cargar ese usuario.", false);
    }
  }

  function onlineTradeSummary(friendQuantities) {
    const friendCanGive = cards.filter((card) => qty(card.codigo) === 0 && qtyFrom(friendQuantities, card.codigo) > 1).length;
    const youCanGive = cards.filter((card) => qty(card.codigo) > 1 && qtyFrom(friendQuantities, card.codigo) === 0).length;
    return { friendCanGive, youCanGive };
  }

  function normalizedBackendUrl() {
    state.backendUrl = els.backendUrlInput.value.trim().replace(/\/+$/, "");
    saveBackendUrl();
    return state.backendUrl;
  }

  function setOnlineBusy(busy) {
    els.loadFriendsBtn.disabled = busy;
    els.syncManagerBtn.disabled = busy;
  }

  function setOnlineStatus(message, ok) {
    els.onlineStatus.textContent = message;
    els.onlineStatus.classList.toggle("ok", Boolean(ok));
  }

  function debounce(fn, delay) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn(...args), delay);
    };
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

  function loadUsername() {
    return (localStorage.getItem(USER_KEY) || "").trim();
  }

  function saveUsername() {
    localStorage.setItem(USER_KEY, state.username);
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

  function loadExchanges() {
    try {
      const value = JSON.parse(localStorage.getItem(EXCHANGE_KEY)) || [];
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  function saveExchanges() {
    localStorage.setItem(EXCHANGE_KEY, JSON.stringify(state.exchanges));
  }

  function loadBackendUrl() {
    return localStorage.getItem(BACKEND_URL_KEY) || DEFAULT_BACKEND_URL;
  }

  function saveBackendUrl() {
    localStorage.setItem(BACKEND_URL_KEY, state.backendUrl);
  }

  function loadAuth() {
    try {
      return JSON.parse(localStorage.getItem(AUTH_KEY));
    } catch {
      return null;
    }
  }

  function authHeaders(withJson) {
    const headers = {
      "ngrok-skip-browser-warning": "true",
      ...(withJson ? { "Content-Type": "application/json" } : {})
    };
    if (state.auth?.token) headers.Authorization = `Bearer ${state.auth.token}`;
    return headers;
  }

  function managerProfileId() {
    return `manager-${fileSafeName(state.username || "local") || "local"}`;
  }

  function progressPayload() {
    return {
      app: "digital-panini-2026-manager",
      user: state.username || "Sin usuario",
      exportedAt: new Date().toISOString(),
      quantities: state.quantities,
    };
  }

  function exportProgress() {
    const payload = progressPayload();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${timestampForFile(payload.exportedAt)}-${fileSafeName(payload.user)}-panini-2026-progreso.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function exportQrProgress() {
    if (!state.username) {
      const name = prompt("Nombre de usuario para identificar este progreso:");
      if (name === null) return;
      state.username = name.trim() || "Sin usuario";
      els.usernameInput.value = state.username;
      saveUsername();
    }

    try {
      const payload = progressPayload();
      const qrText = await qrPayloadText(payload);
      const imageUrl = await qrImageUrl(qrText, payload);
      const link = document.createElement("a");
      link.href = imageUrl;
      link.download = `${timestampForFile(payload.exportedAt)}-${fileSafeName(payload.user)}-panini-2026-qr.png`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(imageUrl), 1000);
    } catch (error) {
      alert(error.message || "No pude generar el QR de progreso.");
    }
  }

  async function qrPayloadText(payload) {
    const compactPayload = {
      a: "dp26",
      v: 1,
      u: payload.user,
      t: payload.exportedAt,
      q: payload.quantities,
    };
    const json = JSON.stringify(compactPayload);
    const bytes = new TextEncoder().encode(json);
    if ("CompressionStream" in window) {
      const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("gzip"));
      const compressed = new Uint8Array(await new Response(stream).arrayBuffer());
      return `DP26GZ:${base64Url(compressed)}`;
    }
    return `DP26JSON:${base64Url(bytes)}`;
  }

  async function qrImageUrl(text, payload) {
    if (typeof qrcode !== "function") {
      throw new Error("No está disponible el generador QR.");
    }

    const qr = qrcode(0, "L");
    qr.addData(text);
    qr.make();

    const modules = qr.getModuleCount();
    const scale = 8;
    const quiet = 4;
    const qrSize = (modules + quiet * 2) * scale;
    const header = 108;
    const footer = 62;
    const canvas = document.createElement("canvas");
    canvas.width = qrSize;
    canvas.height = qrSize + header + footer;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#f8faf3";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#07110d";
    ctx.fillRect(0, 0, canvas.width, header);
    ctx.fillStyle = "#31c58a";
    ctx.font = "800 18px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Digital Panini 2026", canvas.width / 2, 32);
    ctx.fillStyle = "#f8faf3";
    ctx.font = "900 28px system-ui, sans-serif";
    ctx.fillText(payload.user || "Sin usuario", canvas.width / 2, 68);
    ctx.fillStyle = "#9fb0a8";
    ctx.font = "700 13px system-ui, sans-serif";
    ctx.fillText(`${Object.keys(payload.quantities).length} códigos con progreso`, canvas.width / 2, 92);

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, header, canvas.width, qrSize);
    ctx.fillStyle = "#050505";
    for (let row = 0; row < modules; row += 1) {
      for (let col = 0; col < modules; col += 1) {
        if (qr.isDark(row, col)) {
          ctx.fillRect((col + quiet) * scale, header + (row + quiet) * scale, scale, scale);
        }
      }
    }

    ctx.fillStyle = "#07110d";
    ctx.fillRect(0, header + qrSize, canvas.width, footer);
    ctx.fillStyle = "#f8faf3";
    ctx.font = "800 14px system-ui, sans-serif";
    ctx.fillText("Progreso exportado como QR", canvas.width / 2, header + qrSize + 26);
    ctx.fillStyle = "#9fb0a8";
    ctx.font = "700 11px system-ui, sans-serif";
    ctx.fillText(new Date(payload.exportedAt).toLocaleString(), canvas.width / 2, header + qrSize + 46);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("No pude generar la imagen PNG del QR.");
    return URL.createObjectURL(blob);
  }

  function base64Url(bytes) {
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  function base64UrlToBytes(value) {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  function timestampForFile(value) {
    const date = value ? new Date(value) : new Date();
    const parts = [
      date.getFullYear() % 100,
      date.getMonth() + 1,
      date.getDate(),
      date.getHours(),
      date.getMinutes(),
      date.getSeconds(),
    ];
    return parts.map((part) => String(part).padStart(2, "0")).join("");
  }

  function fileSafeName(value) {
    return normalize(value || "usuario").replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "usuario";
  }

  function importProgress(event) {
    const [file] = event.target.files;
    if (!file) return;
    parseProgressFile(file)
      .then((payload) => {
        state.quantities = quantitiesFromPayload(payload);
        if (payload.user && !state.username) {
          state.username = String(payload.user).trim();
          els.usernameInput.value = state.username;
          saveUsername();
        }
        saveProgress();
        render();
      })
      .catch((error) => alert(error.message || "No pude leer ese archivo de progreso."));
    event.target.value = "";
  }

  function importFriendProgress(event) {
    const [file] = event.target.files;
    if (!file) return;
    parseProgressFile(file)
      .then((payload) => {
        state.friendQuantities = quantitiesFromPayload(payload);
        state.friendLabel = payload.user || "";
        state.selectedOnlineProfileId = "";
        renderComparePanel();
        renderOnlineFriends();
      })
      .catch((error) => alert(error.message || "No pude leer ese archivo de progreso."));
    event.target.value = "";
  }

  async function parseProgressFile(file) {
    if (file.type.startsWith("image/")) {
      const qrText = await readQrFromImage(file);
      return payloadFromQrText(qrText);
    }
    const text = await file.text();
    return JSON.parse(text);
  }

  async function readQrFromImage(file) {
    if (typeof jsQR !== "function") throw new Error("No está disponible el lector QR.");
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close?.();
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const result = jsQR(imageData.data, imageData.width, imageData.height);
    if (!result?.data) throw new Error("No encontré un QR válido en esa imagen.");
    return result.data;
  }

  async function payloadFromQrText(text) {
    if (text.startsWith("DP26GZ:")) {
      const bytes = base64UrlToBytes(text.slice(7));
      let jsonText;
      if ("DecompressionStream" in window) {
        const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
        jsonText = await new Response(stream).text();
      } else {
        throw new Error("Este navegador no puede descomprimir el QR.");
      }
      return expandCompactPayload(JSON.parse(jsonText));
    }
    if (text.startsWith("DP26JSON:")) {
      const bytes = base64UrlToBytes(text.slice(9));
      return expandCompactPayload(JSON.parse(new TextDecoder().decode(bytes)));
    }
    throw new Error("Ese QR no parece ser de Digital Panini 2026.");
  }

  function expandCompactPayload(payload) {
    if (payload?.a === "dp26") {
      return {
        app: "digital-panini-2026-manager",
        user: payload.u || "",
        exportedAt: payload.t || "",
        quantities: payload.q || {},
      };
    }
    return payload;
  }

  function clearFriendProgress() {
    state.friendQuantities = null;
    state.friendLabel = "";
    state.selectedOnlineProfileId = "";
    renderComparePanel();
    renderOnlineFriends();
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

  function dateLabel(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
})();
