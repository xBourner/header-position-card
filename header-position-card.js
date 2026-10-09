const CARD_TYPE = "custom:header-position-card";
const BREAKPOINTS = ["mobile", "tablet", "desktop", "wide", "custom"];
const SCOPE_RANK = { page: 1, dashboard: 2, global: 3 };
const PAGE_HEADER_SELECTOR =
  "app-header, .header, ha-top-app-bar, ha-top-app-bar-fixed";
const IOS_INSET = "calc(env(safe-area-inset-bottom) * 0.5)";
const TAB_STYLE_ID = "header-position-card-tab-style";
const MINIMAL_STYLE_ID = "header-position-card-minimal-style";
const TAB_ACTIVE_CSS = `
  ha-tab-group-tab[active] {
      border-block-end: none !important;
      border-block-start: 2px solid var(--ha-tab-indicator-color, var(--primary-color)) !important;
  }
`;
const HEADER_PROPS = [
  "top",
  "bottom",
  "position",
  "padding",
  "padding-top",
  "padding-bottom",
  "border-bottom",
  "border-top",
  "left",
  "right",
  "width",
  "background",
  "border",
  "box-shadow",
  "z-index",
  "margin",
  "color",
];
const TOOLBAR_PROPS = [
  "border-bottom",
  "border-top",
  "background",
  "border-radius",
  "margin",
  "border",
  "box-shadow",
  "color",
  "transition",
  "overflow",
];

function normalizeStyle(style) {
  const list = Array.isArray(style)
    ? style
    : style === undefined || style === null
      ? []
      : [style];
  return list
    .map((s) => String(s).toLowerCase())
    .filter((s) => s && s !== "none");
}

function bpScope(config, bp) {
  if (config?.[`global_${bp}`] === true) return "global";
  if (config?.[`dashboard_${bp}`] === true) return "dashboard";
  if (config?.Style?.includes(bp)) return "page";
  return null;
}

function hasActiveBreakpoint(config) {
  return BREAKPOINTS.some((bp) => bpScope(config, bp) !== null);
}

function bpInRange(bp, width, config) {
  switch (bp) {
    case "mobile":
      return width <= 767;
    case "tablet":
      return width >= 768 && width <= 1023;
    case "desktop":
      return width >= 1024 && width <= 1279;
    case "wide":
      return width >= 1280;
    case "custom":
      return width >= config.custom_width;
    default:
      return false;
  }
}

function isIosWebViewOrStandalone() {
  const ua = navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua);
  return isIos && (navigator.standalone || /Mobile/.test(ua));
}

class HeaderPosition {
  constructor() {
    this.config = { Style: [] };
    this.cardConfig = { Style: [] };
    this.dashboardConfig = null;
    this._dashboardHeader = null;
    this._dashboardState = null;
    this._dashboardTimer = null;
    this._resizeTimer = null;
    this._editTimer = null;
    this._lastEdit = undefined;
    this._panelObserver = null;
    this._observedPanel = null;
    this._rootObserver = null;
    this._observedRoot = null;
    this._observer = null;
    this._usingGlobal = false;
    this._scanCache = new WeakMap();
    this._designs = new WeakMap();
    this._boundChange = this._onChange.bind(this);
    this._boundCheck = this._scheduleDashboardCheck.bind(this);
    this._boundResize = this._onResize.bind(this);
    this._boundEdit = this._onEditCheck.bind(this);
  }

  get _haMainRoot() {
    return document
      .querySelector("home-assistant")
      ?.shadowRoot?.querySelector("home-assistant-main")?.shadowRoot;
  }

  get _lovelacePanel() {
    return this._haMainRoot?.querySelector("ha-panel-lovelace");
  }

  get huiRootElement() {
    return this._lovelacePanel?.shadowRoot?.querySelector("hui-root")
      ?.shadowRoot;
  }

  _pageHeaders() {
    const pages = this._haMainRoot?.querySelectorAll(
      "partial-panel-resolver > *",
    );
    const headers = [];
    pages?.forEach((page) => {
      const header = page.shadowRoot?.querySelector(PAGE_HEADER_SELECTOR);
      if (header) headers.push(header);
    });
    return headers;
  }

  setConfig(config) {
    this.cardConfig = this._normalizeConfig(config);

    if (this._readDashboardConfig()) {
      this._scheduleDashboardCheck();
      return;
    }

    this.config = this.cardConfig;
    this.applyChanges();
  }

  _normalizeConfig(config) {
    const newConfig = { ...config, Style: normalizeStyle(config?.Style) };

    if (!["default", "minimal"].includes(newConfig.Design)) {
      newConfig.Design = "default";
    }

    const customWidth = Number(newConfig.custom_width);
    newConfig.custom_width = Number.isFinite(customWidth) ? customWidth : 0;

    return newConfig;
  }

  applyChanges() {
    const { applyHeader, isGlobal } = this._matchBreakpoints(this.config);

    if (applyHeader) {
      if (isGlobal) {
        this.activateGlobal();
      } else {
        this.deactivateGlobal();
        this.applyHeaderPositionChanges();
      }
    } else {
      this.deactivateGlobal();
      this.resetHeader();
    }
  }

  _matchBreakpoints(config) {
    const width = window.innerWidth;
    let scope = null;

    for (const bp of BREAKPOINTS) {
      const s = bpScope(config, bp);
      if (!s || !bpInRange(bp, width, config)) continue;
      if (!scope || SCOPE_RANK[s] > SCOPE_RANK[scope]) scope = s;
    }

    return {
      applyHeader: scope !== null,
      isGlobal: scope === "global",
      scope,
    };
  }

  activateGlobal() {
    this._usingGlobal = true;
    this.applyGlobal();
  }

  deactivateGlobal() {
    this._usingGlobal = false;
  }

  listen() {
    window.addEventListener("location-changed", this._boundChange);
    window.addEventListener("popstate", this._boundChange);
    window.addEventListener("resize", this._boundResize);
    this.startObserver();
  }

  startObserver(attempt = 0) {
    if (this._observer) return;

    const target = this._haMainRoot;
    if (!target) {
      if (attempt < 50) {
        setTimeout(() => this.startObserver(attempt + 1), 200);
      }
      return;
    }

    this._observer = new MutationObserver(this._boundChange);
    this._observer.observe(target, { childList: true, subtree: true });
    this._scheduleDashboardCheck();
  }

  isEditMode() {
    const edit = this._lovelacePanel?.lovelace?.editMode;
    if (typeof edit === "boolean") return edit;
    return new URLSearchParams(window.location.search).get("edit") === "1";
  }

  _onEditCheck() {
    clearTimeout(this._editTimer);
    this._editTimer = setTimeout(() => {
      const edit = this.isEditMode();
      if (edit === this._lastEdit) return;
      this._lastEdit = edit;

      if (this.dashboardConfig) {
        this._scheduleDashboardCheck();
      } else if (hasActiveBreakpoint(this.config)) {
        this.applyChanges();
      }
    }, 50);
  }

  _onChange() {
    this._onEditCheck();

    if (this._usingGlobal && !this._readDashboardConfig()) {
      this.applyGlobal();
    }
    this._scheduleDashboardCheck();
  }

  _onResize() {
    this._scheduleDashboardCheck();

    clearTimeout(this._resizeTimer);
    this._resizeTimer = setTimeout(() => {
      if (this.dashboardConfig || this._readDashboardConfig()) return;
      if (!hasActiveBreakpoint(this.config)) return;
      this.applyChanges();
    }, 100);
  }

  _readDashboardConfig(panel = this._lovelacePanel) {
    const lovelaceConfig = panel?.lovelace?.config;
    if (!lovelaceConfig) return null;

    if (!this._scanCache.has(lovelaceConfig)) {
      this._scanCache.set(
        lovelaceConfig,
        this._findDashboardCard(lovelaceConfig),
      );
    }

    const card = this._scanCache.get(lovelaceConfig);
    if (!card) return null;

    return this._matchBreakpoints(card).scope === "dashboard" ? card : null;
  }

  _findDashboardCard(node, depth = 0) {
    if (!node || typeof node !== "object" || depth > 12) return null;

    if (!Array.isArray(node) && node.type === CARD_TYPE) {
      const normalized = this._normalizeConfig(node);
      if (BREAKPOINTS.some((bp) => normalized[`dashboard_${bp}`] === true)) {
        return normalized;
      }
    }

    for (const value of Object.values(node)) {
      const found = this._findDashboardCard(value, depth + 1);
      if (found) return found;
    }
    return null;
  }

  _scheduleDashboardCheck() {
    clearTimeout(this._dashboardTimer);
    this._dashboardTimer = setTimeout(() => this._checkDashboard(), 50);
  }

  _checkDashboard(attempt = 0) {
    const panel = this._lovelacePanel;
    this._observePanel(panel);
    this._observeRoot(panel);

    const header = panel?.shadowRoot
      ?.querySelector("hui-root")
      ?.shadowRoot?.querySelector(".header");

    if (panel && (!panel.lovelace?.config || !header)) {
      if (attempt < 20) {
        this._dashboardTimer = setTimeout(
          () => this._checkDashboard(attempt + 1),
          250,
        );
      }
      return;
    }

    const dashboardConfig = panel ? this._readDashboardConfig(panel) : null;
    if (!dashboardConfig) {
      if (this.dashboardConfig) this._leaveDashboard(header);
      return;
    }

    const { applyHeader } = this._matchBreakpoints(dashboardConfig);
    const sidebarWidth =
      dashboardConfig.Design === "minimal" ? this._getSidebarWidth() : 0;
    const state = JSON.stringify([
      dashboardConfig,
      applyHeader,
      sidebarWidth,
      this.isEditMode(),
    ]);
    if (header === this._dashboardHeader && state === this._dashboardState) {
      return;
    }

    if (header === this._dashboardHeader) this.resetHeader();

    this.dashboardConfig = dashboardConfig;
    this._dashboardHeader = header;
    this._dashboardState = state;
    this.config = dashboardConfig;
    this.applyChanges();
  }

  _leaveDashboard(header) {
    const previousHeader = this._dashboardHeader;
    this.dashboardConfig = null;
    this._dashboardHeader = null;
    this._dashboardState = null;
    this.config = this.cardConfig;

    const sameHeader = Boolean(header) && header === previousHeader;

    if (sameHeader) {
      this.resetHeader();
    } else if (this._toolbar && previousHeader?.contains(this._toolbar)) {
      this._toolbar.classList.remove("collapsed", "expanded");
      this._removeScrollCollapse();
    }

    const { applyHeader, scope } = this._matchBreakpoints(this.cardConfig);
    if (
      applyHeader &&
      (scope === "global" || (sameHeader && scope === "page"))
    ) {
      this.applyChanges();
    }
  }

  _observePanel(panel) {
    if (panel === this._observedPanel) return;

    if (this._panelObserver) {
      this._panelObserver.disconnect();
      this._panelObserver = null;
    }
    this._observedPanel = null;
    if (!panel?.shadowRoot) return;

    this._observedPanel = panel;
    this._panelObserver = new MutationObserver(this._boundCheck);
    this._panelObserver.observe(panel.shadowRoot, { childList: true });
  }

  _observeRoot(panel) {
    const root =
      panel?.shadowRoot?.querySelector("hui-root")?.shadowRoot || null;
    if (root === this._observedRoot) return;

    if (this._rootObserver) {
      this._rootObserver.disconnect();
      this._rootObserver = null;
    }
    this._observedRoot = null;
    if (!root) return;

    this._observedRoot = root;
    this._rootObserver = new MutationObserver(this._boundEdit);
    this._rootObserver.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"],
    });
  }

  applyGlobal() {
    const header = this.huiRootElement?.querySelector(".header");
    if (header) this.styleHeader(header);

    this._pageHeaders().forEach((pageHeader) => this.styleHeader(pageHeader));
  }

  _getSidebarWidth() {
    if (window.innerWidth < 768) return 0;

    const sidebar = this._haMainRoot?.querySelector("ha-sidebar");
    if (!sidebar || sidebar.hidden || sidebar.offsetHeight === 0) return 0;

    const rect = sidebar.getBoundingClientRect();
    if (rect.width === 0 || rect.left < 0 || rect.right <= 0) return 0;

    const style = getComputedStyle(sidebar);
    if (
      style.display === "none" ||
      style.visibility === "hidden" ||
      style.opacity === "0"
    )
      return 0;

    if (rect.left >= window.innerWidth) return 0;

    return rect.width;
  }

  styleHeader(element) {
    if (!element) return;

    const design = this.config.Design === "minimal" ? "minimal" : "default";
    const previous = this._designs.get(element);
    if (previous && previous !== design) {
      if (previous === "minimal") this._removeScrollCollapse();
      this._resetHeaderElement(element);
    }
    this._designs.set(element, design);

    if (design === "minimal") {
      this.styleHeaderMinimal(element);
    } else {
      this.styleHeaderDefault(element);
    }
  }

  _updateViewTopPadding() {
    const viewContainer =
      this.huiRootElement?.querySelector("hui-view-container");
    if (viewContainer) {
      viewContainer.style.setProperty(
        "padding-top",
        "calc(max(var(--safe-area-inset-top, 0px), env(safe-area-inset-top, 0px)) + var(--view-container-padding-top, 0px))",
        "important",
      );
    }
  }

  styleHeaderDefault(element) {
    this._updateViewTopPadding();
    if (element.style.top === "auto" && element.style.bottom === "0px") return;

    element.style.setProperty("top", "auto", "important");
    element.style.setProperty("bottom", "0px", "important");
    element.style.setProperty("position", "fixed", "important");
    element.style.setProperty("padding-top", "0px", "important");

    if (isIosWebViewOrStandalone()) {
      element.style.setProperty("padding-bottom", IOS_INSET, "important");
    }

    const toolbar = element.querySelector(".toolbar");
    if (toolbar) {
      toolbar.style.setProperty("border-bottom", "none", "important");
      toolbar.style.setProperty(
        "border-top",
        "1px solid var(--divider-color, rgba(0, 0, 0, 0.12))",
        "important",
      );
    }

    if (element.querySelector("ha-tab-group")) {
      let styleEl = element.querySelector(`#${TAB_STYLE_ID}`);
      if (!styleEl) {
        styleEl = document.createElement("style");
        styleEl.id = TAB_STYLE_ID;
        styleEl.innerHTML = TAB_ACTIVE_CSS;
        element.appendChild(styleEl);
      }
    }
  }

  styleHeaderMinimal(element) {
    this._updateViewTopPadding();
    const bottomInsetHalf = isIosWebViewOrStandalone() ? IOS_INSET : "0px";

    const editMode = this.isEditMode();
    const editBg = "var(--app-header-edit-background-color, #455a64)";
    const editText = "var(--app-header-edit-text-color, white)";
    const headerBg = editMode ? editBg : "transparent";
    const toolbarBg = editMode
      ? "transparent"
      : "var(--app-header-background-color, var(--primary-background-color))";
    const toolbarRadius = editMode ? "0" : "20px";
    const toolbarMargin = editMode
      ? `0 0 ${bottomInsetHalf} 0`
      : `4px 16px calc(4px + ${bottomInsetHalf}) 16px`;
    const toolbarShadow = editMode ? "none" : "0 2px 8px rgba(0, 0, 0, 0.15)";

    element.style.setProperty("top", "auto", "important");
    element.style.setProperty("bottom", "0px", "important");
    element.style.setProperty("position", "fixed", "important");
    element.style.setProperty(
      "left",
      "var(--ha-sidebar-width, var(--mdc-drawer-width, 0px))",
      "important",
    );
    element.style.setProperty("right", "0", "important");
    element.style.setProperty("width", "auto", "important");
    element.style.setProperty("padding", "0", "important");
    element.style.setProperty("margin", "0", "important");
    element.style.setProperty("background", headerBg, "important");
    element.style.setProperty("border", "none", "important");
    element.style.setProperty("box-shadow", "none", "important");
    element.style.setProperty("z-index", "999", "important");
    if (editMode) {
      element.style.setProperty("color", editText, "important");
    } else {
      element.style.removeProperty("color");
    }

    let styleEl = element.querySelector(`#${MINIMAL_STYLE_ID}`);
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = MINIMAL_STYLE_ID;
      element.appendChild(styleEl);
    }
    styleEl.innerHTML = `
          :host {
              background: ${headerBg} !important;
          }
          .toolbar {
              background: ${toolbarBg} !important;
              border-radius: ${toolbarRadius} !important;
              width: auto !important;
              margin: ${toolbarMargin} !important;
              border: none !important;
              box-shadow: ${toolbarShadow} !important;
              transition: all 0.3s ease !important;
              overflow: hidden !important;
          }
          .toolbar > * {
              transition: all 0.3s ease !important;
          }
          .toolbar.collapsed {
              border-radius: 50% !important;
              width: 48px !important;
              height: 48px !important;
              margin: 4px 16px calc(4px + ${bottomInsetHalf}) auto !important;
              display: flex !important;
              align-items: center !important;
              justify-content: center !important;
          }
          .toolbar.collapsed > *:not(:first-child) {
              display: none !important;
          }
          .toolbar.collapsed > :first-child {
              margin: 0 !important;
              padding: 0 !important;
          }
          .toolbar.expanded {
              border-radius: 20px !important;
              width: auto !important;
              height: auto !important;
          }
          ha-tab-group {
              --ha-tab-group-border-radius: ${toolbarRadius} !important;
          }
          ${TAB_ACTIVE_CSS}
      `;

    const toolbar = element.querySelector(".toolbar");
    if (toolbar) {
      toolbar.style.setProperty("background", toolbarBg, "important");
      toolbar.style.setProperty("border-radius", toolbarRadius, "important");
      toolbar.style.setProperty("margin", toolbarMargin, "important");
      toolbar.style.setProperty("border", "none", "important");
      toolbar.style.setProperty("box-shadow", toolbarShadow, "important");
      toolbar.style.setProperty("transition", "all 0.3s ease", "important");
      toolbar.style.setProperty("overflow", "hidden", "important");

      if (editMode) {
        toolbar.style.setProperty("color", editText, "important");
        this._removeScrollCollapse();
        toolbar.classList.remove("collapsed", "expanded");
      } else {
        toolbar.style.removeProperty("color");
        this._setupScrollCollapse(toolbar);
      }
    }
  }

  _setupScrollCollapse(toolbar) {
    if (this._scrollListener) {
      window.removeEventListener("scroll", this._scrollListener);
    }
    if (this._clickHandler) {
      toolbar.removeEventListener("click", this._clickHandler, true);
    }

    this._scrollCollapsed = false;
    this._scrollExpanded = false;
    this._toolbar = toolbar;
    this._lastScrollY = 0;

    this._scrollListener = () => {
      if (window.innerWidth >= 768) return;

      const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
      const maxScroll =
        document.documentElement.scrollHeight -
        document.documentElement.clientHeight;
      const atTop = scrollY <= 0;
      const atBottom = scrollY >= maxScroll;
      const scrollingDown = scrollY > this._lastScrollY;
      this._lastScrollY = scrollY;

      if (this._scrollExpanded) return;

      if (atTop || atBottom) return;

      if (scrollingDown && !this._scrollCollapsed) {
        this._scrollCollapsed = true;
        toolbar.classList.add("collapsed");
      } else if (!scrollingDown && this._scrollCollapsed) {
        this._scrollCollapsed = false;
        toolbar.classList.remove("collapsed");
      }
    };

    this._clickHandler = (e) => {
      if (!this._scrollCollapsed) return;

      if (!this._scrollExpanded) {
        e.stopImmediatePropagation();
        e.preventDefault();
        this._scrollExpanded = true;
        toolbar.classList.remove("collapsed");
        toolbar.classList.add("expanded");
      } else {
        this._scrollExpanded = false;
        this._scrollCollapsed = false;
        toolbar.classList.remove("collapsed");
        toolbar.classList.remove("expanded");
      }
    };

    toolbar.addEventListener("click", this._clickHandler, true);

    window.addEventListener("scroll", this._scrollListener, { passive: true });
  }

  applyHeaderPositionChanges() {
    this.styleHeader(this.huiRootElement?.querySelector(".header"));
  }

  _removeScrollCollapse() {
    if (this._scrollListener) {
      window.removeEventListener("scroll", this._scrollListener);
      this._scrollListener = null;
    }
    if (this._clickHandler && this._toolbar) {
      this._toolbar.removeEventListener("click", this._clickHandler, true);
      this._clickHandler = null;
      this._toolbar = null;
    }
  }

  _resetHeaderElement(header) {
    this._designs.delete(header);
    HEADER_PROPS.forEach((prop) => header.style.removeProperty(prop));

    header.querySelector(`#${TAB_STYLE_ID}`)?.remove();
    header.querySelector(`#${MINIMAL_STYLE_ID}`)?.remove();

    const toolbar = header.querySelector(".toolbar");
    if (toolbar) {
      toolbar.classList.remove("collapsed", "expanded");
      TOOLBAR_PROPS.forEach((prop) => toolbar.style.removeProperty(prop));
    }
  }

  resetHeader() {
    this._removeScrollCollapse();

    this.huiRootElement
      ?.querySelector("hui-view-container")
      ?.style.removeProperty("padding-top");

    const appHeader = this.huiRootElement?.querySelector(".header");
    if (appHeader) this._resetHeaderElement(appHeader);

    this._pageHeaders().forEach((header) => this._resetHeaderElement(header));
  }
}

if (!window.headerPosition) {
  window.headerPosition = new HeaderPosition();
  window.headerPosition.listen();
}

class HeaderPositionCard extends HTMLElement {
  setConfig(config) {
    window.headerPosition.setConfig(config);
  }

  set hass(hass) {
    if (!window.headerPosition.isEditMode()) {
      this.style.display = "none";
      return;
    }

    this.style.display = "";
    if (!this._rendered) {
      this._rendered = true;
      this.innerHTML =
        "<ha-card><div class='card-content'>Header Position Card</div></ha-card>";
    }
  }

  static getConfigElement() {
    return document.createElement("header-position-editor");
  }

  static getStubConfig() {
    return { Style: [], Design: "default" };
  }
}

class HeaderPositionEditor extends HTMLElement {
  constructor() {
    super();
    this._config = {};
    this._hass = null;
  }

  set hass(hass) {
    this._hass = hass;
    this._updateForm();
  }

  setConfig(config) {
    this._config = config || {};
    this._updateForm();
  }

  _getSchemaForBreakpoint(bp) {
    return [
      {
        name: `mode_${bp}`,
        selector: {
          select: {
            mode: "dropdown",
            options: [
              { value: "off", label: "Off" },
              { value: "page", label: "Page" },
              { value: "dashboard", label: "Dashboard" },
              { value: "global", label: "Global" },
            ],
          },
        },
        label: "Apply to",
      },
    ];
  }

  _getCustomSchema(data) {
    const schema = this._getSchemaForBreakpoint("custom");

    if (data.mode_custom && data.mode_custom !== "off") {
      schema.push({
        name: "custom_width",
        selector: {
          number: {
            min: 0,
            max: 10000,
            unit_of_measurement: "px",
            mode: "box",
          },
        },
        label: "Min Width",
      });
    }

    return schema;
  }

  _updateForm() {
    if (!this._hass || !this._config) return;
    if (!this._built) this._build();
    this._sync();
  }

  _build() {
    this._built = true;
    this._forms = {};
    this._last = {};
    this.innerHTML = "";

    const container = document.createElement("div");
    container.style.display = "flex";
    container.style.flexDirection = "column";

    const mainTitle = document.createElement("h3");
    mainTitle.textContent = "Header Position Card Configuration";
    mainTitle.style.margin = "0 0 16px 0";
    container.appendChild(mainTitle);

    const addSection = (key, title) => {
      const section = document.createElement("div");
      section.style.borderBottom = "1px solid var(--divider-color)";
      section.style.paddingBottom = "12px";
      section.style.marginBottom = "12px";

      const h = document.createElement("h4");
      h.textContent = title;
      h.style.margin = "0 0 8px 0";
      h.style.opacity = "0.8";
      section.appendChild(h);

      const form = document.createElement("ha-form");
      form.computeLabel = (sch) => sch.label;
      form.addEventListener("value-changed", this._configChanged.bind(this));
      section.appendChild(form);

      container.appendChild(section);
      this._forms[key] = form;
    };

    addSection("design", "Design");
    BREAKPOINTS.forEach((bp) =>
      addSection(bp, bp.charAt(0).toUpperCase() + bp.slice(1)),
    );

    this.appendChild(container);
  }

  _sync() {
    const base = { ...this._config, Style: normalizeStyle(this._config.Style) };

    const defs = {
      design: {
        data: { Design: base.Design || "default" },
        schema: [
          {
            name: "Design",
            selector: {
              select: {
                options: [
                  { value: "default", label: "Default" },
                  { value: "minimal", label: "Minimal (Floating)" },
                ],
              },
            },
            label: "Design Style",
          },
        ],
      },
    };

    BREAKPOINTS.forEach((bp) => {
      const data = { [`mode_${bp}`]: bpScope(base, bp) || "off" };
      if (bp === "custom" && data.mode_custom !== "off") {
        const width = Number(base.custom_width);
        data.custom_width = Number.isFinite(width) ? width : 0;
      }
      defs[bp] = {
        data,
        schema:
          bp === "custom"
            ? this._getCustomSchema(data)
            : this._getSchemaForBreakpoint(bp),
      };
    });

    Object.entries(defs).forEach(([key, def]) => {
      const form = this._forms[key];
      const last = (this._last[key] = this._last[key] || {});

      if (form.hass !== this._hass) form.hass = this._hass;

      const schemaJson = JSON.stringify(def.schema);
      if (last.schema !== schemaJson) {
        last.schema = schemaJson;
        form.schema = def.schema;
      }

      const dataJson = JSON.stringify(def.data);
      if (last.data !== dataJson) {
        last.data = dataJson;
        form.data = def.data;
      }
    });
  }

  _configChanged(e) {
    const config = { ...this._config, ...e.detail.value };
    let style = normalizeStyle(config.Style);

    BREAKPOINTS.forEach((bp) => {
      const mode = config[`mode_${bp}`];
      delete config[`mode_${bp}`];
      if (mode === undefined) return;

      style = style.filter((s) => s !== bp);
      if (mode === "page") style.push(bp);

      if (mode === "dashboard") config[`dashboard_${bp}`] = true;
      else delete config[`dashboard_${bp}`];

      if (mode === "global") config[`global_${bp}`] = true;
      else delete config[`global_${bp}`];
    });
    config.Style = style;

    if (!["default", "minimal"].includes(config.Design)) {
      config.Design = "default";
    }

    if (JSON.stringify(config) === JSON.stringify(this._config)) return;

    this._config = config;

    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config },
        bubbles: true,
        composed: true,
      }),
    );
  }
}

if (!customElements.get("header-position-card")) {
  customElements.define("header-position-card", HeaderPositionCard);
  customElements.define("header-position-editor", HeaderPositionEditor);

  window.customCards = window.customCards || [];
  window.customCards.push({
    type: "header-position-card",
    name: "Header Position Card",
    description:
      "Moves the dashboard header to the bottom, per page, per dashboard or globally",
  });
}
