class HeaderPosition {
  constructor() {
    this.queryParams = new URLSearchParams(window.location.search);
    this.config = { Style: [] };
    this.cardConfig = { Style: [] };
    this.dashboardConfig = null;
    this._dashboardHeader = null;
    this._dashboardState = null;
    this._dashboardTimer = null;
    this._panelObserver = null;
    this._observedPanel = null;
    this._observer = null;
    this._usingGlobal = false;
    this._boundChange = this._onChange.bind(this);
    this._boundCheck = this._scheduleDashboardCheck.bind(this);
  }

  setConfig(config) {
    this.cardConfig = this._normalizeConfig(config);

    // A dashboard with header_position ignores card configs.
    if (this._readDashboardConfig()) return;

    this.config = this.cardConfig;
    this.applyChanges();
  }

  _normalizeConfig(config) {
    const newConfig = { ...config };

    if (newConfig.Style === undefined) {
      newConfig.Style = [];
    } else {
      if (Array.isArray(newConfig.Style)) {
        newConfig.Style = newConfig.Style.filter(
          (s) => s && s.toLowerCase() !== "none",
        );
      } else {
        newConfig.Style = newConfig.Style === "None" ? [] : [newConfig.Style];
      }
    }

    if (
      !newConfig.Design ||
      !["default", "minimal"].includes(newConfig.Design)
    ) {
      newConfig.Design = "default";
    }

    return newConfig;
  }

  applyChanges() {
    const styles = this.config.Style;
    if (!styles || styles.length === 0) {
      this.resetHeader();
      this.deactivateGlobal();
      return;
    }

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
    let applyHeader = false;
    let isGlobal = false;

    const checkGlobal = (bp) => {
      return config[`global_${bp.toLowerCase()}`] === true;
    };

    for (const bp of config.Style) {
      const lowerBp = bp.toLowerCase();
      switch (lowerBp) {
        case "mobile":
          if (width <= 767) {
            applyHeader = true;
            if (checkGlobal(lowerBp)) isGlobal = true;
          }
          break;
        case "tablet":
          if (width >= 768 && width <= 1023) {
            applyHeader = true;
            if (checkGlobal(lowerBp)) isGlobal = true;
          }
          break;
        case "desktop":
          if (width >= 1024 && width <= 1279) {
            applyHeader = true;
            if (checkGlobal(lowerBp)) isGlobal = true;
          }
          break;
        case "wide":
          if (width >= 1280) {
            applyHeader = true;
            if (checkGlobal(lowerBp)) isGlobal = true;
          }
          break;
        case "custom":
          if (width >= config.custom_width) {
            applyHeader = true;
            if (checkGlobal(lowerBp)) isGlobal = true;
          }
        default:
          break;
      }
    }

    return { applyHeader, isGlobal };
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
    window.addEventListener("resize", this._boundCheck);
    this.startObserver();
  }

  startObserver(attempt = 0) {
    if (this._observer) return;

    const target = document
      .querySelector("home-assistant")
      ?.shadowRoot?.querySelector("home-assistant-main")?.shadowRoot;
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

  _onChange() {
    if (this._usingGlobal && !this._readDashboardConfig()) {
      this.applyGlobal();
    }
    this._scheduleDashboardCheck();
  }

  get _lovelacePanel() {
    return document
      .querySelector("home-assistant")
      ?.shadowRoot?.querySelector("home-assistant-main")
      ?.shadowRoot?.querySelector("ha-panel-lovelace");
  }

  // Reads header_position from the root of the current dashboard config.
  _readDashboardConfig(panel = this._lovelacePanel) {
    const value = panel?.lovelace?.config?.header_position;
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return null;
    }

    return this._normalizeConfig({
      Style: value.style,
      Design: value.design,
      custom_width: value.custom_width,
    });
  }

  _scheduleDashboardCheck() {
    clearTimeout(this._dashboardTimer);
    this._dashboardTimer = setTimeout(() => this._checkDashboard(), 50);
  }

  _checkDashboard(attempt = 0) {
    const panel = this._lovelacePanel;
    this._observePanel(panel);

    const header = panel?.shadowRoot
      ?.querySelector("hui-root")
      ?.shadowRoot?.querySelector(".header");

    // Dashboard still loading, or the raw configuration editor is open.
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
    const state = JSON.stringify([dashboardConfig, applyHeader, sidebarWidth]);
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

    if (header && header === previousHeader) {
      // header_position was removed from this dashboard.
      this.resetHeader();
    } else if (this._toolbar && previousHeader?.contains(this._toolbar)) {
      this._toolbar.classList.remove("collapsed", "expanded");
      this._removeScrollCollapse();
    }

    // Bring back a global card config that the dashboard config overruled.
    if (this._matchBreakpoints(this.cardConfig).isGlobal) {
      this.applyChanges();
    }
  }

  // The panel renders hui-root in its own shadow root, which the main
  // observer cannot see (loading, closing the raw configuration editor).
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

  applyGlobal() {
    const haMain = document
      .querySelector("home-assistant")
      ?.shadowRoot?.querySelector("home-assistant-main")?.shadowRoot;
    if (!haMain) return;

    const lovelace = haMain.querySelector("ha-panel-lovelace");
    if (lovelace) {
      const huiRoot = lovelace.shadowRoot?.querySelector("hui-root");
      if (huiRoot) {
        const header = huiRoot.shadowRoot?.querySelector(".header");
        if (header) this.styleHeader(header);
      }
    }

    const pages = haMain.querySelectorAll("partial-panel-resolver > *");
    pages.forEach((page) => {
      if (page.shadowRoot) {
        const header = page.shadowRoot.querySelector(
          "app-header, .header, ha-top-app-bar, ha-top-app-bar-fixed",
        );
        if (header) this.styleHeader(header);
      }
    });
  }

  get huiRootElement() {
    return document
      .querySelector("home-assistant")
      ?.shadowRoot?.querySelector("home-assistant-main")
      ?.shadowRoot?.querySelector("ha-panel-lovelace")
      ?.shadowRoot?.querySelector("hui-root")?.shadowRoot;
  }

  _getSidebarWidth() {
    if (window.innerWidth < 768) return 0;

    const haMain = document
      .querySelector("home-assistant")
      ?.shadowRoot?.querySelector("home-assistant-main")?.shadowRoot;
    if (!haMain) return 0;

    const sidebar = haMain.querySelector("ha-sidebar");
    if (!sidebar || sidebar.hidden || sidebar.offsetHeight === 0) return 0;

    const rect = sidebar.getBoundingClientRect();
    if (rect.width === 0 || rect.left < 0 || rect.right <= 0) return 0;

    const style = getComputedStyle(sidebar);
    if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return 0;

    if (rect.left >= window.innerWidth) return 0;

    return rect.width;
  }

  styleHeader(element) {
    if (!element) return;

    if (this.config.Design === "minimal") {
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
    if (element.style.top !== "auto" || element.style.bottom !== "0px") {
      element.style.setProperty("top", "auto", "important");
      element.style.setProperty("bottom", "0px", "important");
      element.style.setProperty("position", "fixed", "important");
      element.style.setProperty("padding-top", "0px", "important");

      const ua = navigator.userAgent;
      const isIos = /iPad|iPhone|iPod/.test(ua);
      const isIosWebViewOrStandalone =
        isIos && (navigator.standalone || /Mobile/.test(ua));

      if (isIosWebViewOrStandalone) {
        element.style.setProperty(
          "padding-bottom",
          "calc(env(safe-area-inset-bottom) * 0.5)",
          "important",
        );
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

      const haTabGroup = element.querySelector("ha-tab-group");
      if (haTabGroup) {
        const styleId = "header-position-card-tab-style";
        let styleEl = element.querySelector(`#${styleId}`);
        if (!styleEl) {
          styleEl = document.createElement("style");
          styleEl.id = styleId;
          styleEl.innerHTML = `
                      ha-tab-group-tab[active] {
                          border-block-end: none !important;
                          border-block-start: 2px solid var(--ha-tab-indicator-color, var(--primary-color)) !important;
                      }
                  `;
          element.appendChild(styleEl);
        }
      }
    }
  }

  styleHeaderMinimal(element) {
    this._updateViewTopPadding();
    const ua = navigator.userAgent;
    const isIos = /iPad|iPhone|iPod/.test(ua);
    const isIosWebViewOrStandalone =
      isIos && (navigator.standalone || /Mobile/.test(ua));
    const bottomInsetHalf = isIosWebViewOrStandalone
      ? "calc(env(safe-area-inset-bottom) * 0.5)"
      : "0px";

    element.style.setProperty("top", "auto", "important");
    element.style.setProperty("bottom", "0px", "important");
    element.style.setProperty("position", "fixed", "important");
    // Follows the sidebar when it is collapsed, expanded or hidden.
    element.style.setProperty(
      "left",
      "var(--ha-sidebar-width, var(--mdc-drawer-width, 0px))",
      "important",
    );
    element.style.setProperty("right", "0", "important");
    element.style.setProperty("width", "auto", "important");
    element.style.setProperty("padding", "0", "important");
    element.style.setProperty("margin", "0", "important");
    element.style.setProperty("background", "transparent", "important");
    element.style.setProperty("border", "none", "important");
    element.style.setProperty("box-shadow", "none", "important");
    element.style.setProperty("z-index", "999", "important");

    const styleId = "header-position-card-minimal-style";
    let styleEl = element.querySelector(`#${styleId}`);
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = styleId;
      element.appendChild(styleEl);
    }
    styleEl.innerHTML = `
          :host {
              background: transparent !important;
          }
          .toolbar {
              background: var(--app-header-background-color, var(--primary-background-color)) !important;
              border-radius: 20px !important;
              width: auto !important;
              margin: 4px 16px calc(4px + ${bottomInsetHalf}) 16px !important;
              border: none !important;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15) !important;
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
              --ha-tab-group-border-radius: 20px !important;
          }
          ha-tab-group-tab[active] {
              border-block-end: none !important;
              border-block-start: 2px solid var(--ha-tab-indicator-color, var(--primary-color)) !important;
          }
      `;

    const toolbar = element.querySelector(".toolbar");
    if (toolbar) {
      toolbar.style.setProperty(
        "background",
        "var(--app-header-background-color, var(--primary-background-color))",
        "important",
      );
      toolbar.style.setProperty("border-radius", "20px", "important");
      toolbar.style.setProperty(
        "margin",
        `4px 16px calc(4px + ${bottomInsetHalf}) 16px`,
        "important",
      );
      toolbar.style.setProperty("border", "none", "important");
      toolbar.style.setProperty(
        "box-shadow",
        "0 2px 8px rgba(0, 0, 0, 0.15)",
        "important",
      );
      toolbar.style.setProperty("transition", "all 0.3s ease", "important");
      toolbar.style.setProperty("overflow", "hidden", "important");

      this._setupScrollCollapse(toolbar);
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
      const maxScroll = document.documentElement.scrollHeight - document.documentElement.clientHeight;
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
    let appHeader = this.huiRootElement?.querySelector(".header");
    this.styleHeader(appHeader);
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

  resetHeader() {
    this._removeScrollCollapse();

    const viewContainer =
      this.huiRootElement?.querySelector("hui-view-container");
    if (viewContainer) {
      viewContainer.style.removeProperty("padding-top");
    }

    let appHeader = this.huiRootElement?.querySelector(".header");
    if (appHeader) {
      appHeader.style.removeProperty("top");
      appHeader.style.removeProperty("bottom");
      appHeader.style.removeProperty("position");
      appHeader.style.removeProperty("padding");
      appHeader.style.removeProperty("padding-top");
      appHeader.style.removeProperty("padding-bottom");
      appHeader.style.removeProperty("border-bottom");
      appHeader.style.removeProperty("border-top");
      appHeader.style.removeProperty("left");
      appHeader.style.removeProperty("right");
      appHeader.style.removeProperty("width");
      appHeader.style.removeProperty("background");
      appHeader.style.removeProperty("border");
      appHeader.style.removeProperty("box-shadow");
      appHeader.style.removeProperty("z-index");
      appHeader.style.removeProperty("margin");

      const tabStyleEl = appHeader.querySelector(
        "#header-position-card-tab-style",
      );
      if (tabStyleEl) tabStyleEl.remove();

      const minimalStyleEl = appHeader.querySelector(
        "#header-position-card-minimal-style",
      );
      if (minimalStyleEl) minimalStyleEl.remove();

      const toolbar = appHeader.querySelector(".toolbar");
      if (toolbar) {
        toolbar.classList.remove("collapsed");
        toolbar.classList.remove("expanded");
        toolbar.style.removeProperty("border-bottom");
        toolbar.style.removeProperty("border-top");
        toolbar.style.removeProperty("background");
        toolbar.style.removeProperty("border-radius");
        toolbar.style.removeProperty("margin");
        toolbar.style.removeProperty("border");
        toolbar.style.removeProperty("box-shadow");
      }
    }

    const haMain = document
      .querySelector("home-assistant")
      ?.shadowRoot?.querySelector("home-assistant-main")?.shadowRoot;
    if (haMain) {
      const pages = haMain.querySelectorAll("partial-panel-resolver > *");
      pages.forEach((page) => {
        if (page.shadowRoot) {
          const header = page.shadowRoot.querySelector(
            "app-header, .header, ha-top-app-bar, ha-top-app-bar-fixed",
          );
          if (header) {
            header.style.removeProperty("top");
            header.style.removeProperty("bottom");
            header.style.removeProperty("position");
            header.style.removeProperty("padding-top");
            header.style.removeProperty("padding-bottom");
          }
        }
      });
    }
  }
}

window.headerPosition = new HeaderPosition();
window.headerPosition.listen();

class HeaderPositionCard extends HTMLElement {
  setConfig(config) {
    this.config = config;
    window.headerPosition.setConfig(config);
  }

  set hass(hass) {
    const isEditMode =
      new URLSearchParams(window.location.search).get("edit") === "1";
    if (!isEditMode) {
      this.style.display = "none";
      return;
    }

    this.style.display = "";
    if (!this.content) {
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

customElements.define("header-position-card", HeaderPositionCard);
window.customCards = window.customCards || [];
window.customCards.push({
  type: "header-position-card",
  name: "Header Position Card",
  description:
    "A card that allows toggling the dashboard header position (per view)",
});

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
    this._config = config || { Style: "None" };
    this._updateForm();
  }

  _getSchemaForBreakpoint(bp) {
    const enableLabel = this._hass.localize("ui.common.enable") || "Enable";
    return [
      {
        type: "grid",
        name: "",
        schema: [
          {
            name: `${bp}_enabled`,
            selector: { boolean: {} },
            label: enableLabel,
          },
          {
            name: `global_${bp}`,
            selector: { boolean: {} },
            label: "Global " + enableLabel,
          },
        ],
      },
    ];
  }

  _getCustomSchema(data) {
    const enableLabel = this._hass.localize("ui.common.enable") || "Enable";
    const schema = [
      {
        type: "grid",
        name: "",
        schema: [
          {
            name: `custom_enabled`,
            selector: { boolean: {} },
            label: enableLabel,
          },
          {
            name: `global_custom`,
            selector: { boolean: {} },
            label: "Global " + enableLabel,
          },
        ],
      },
    ];

    if (data.custom_enabled) {
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

    const styles = Array.isArray(this._config.Style)
      ? this._config.Style.map((s) => s.toLowerCase())
      : [];
    const data = { ...this._config };
    ["mobile", "tablet", "desktop", "wide", "custom"].forEach((bp) => {
      data[`${bp}_enabled`] = styles.includes(bp);
    });

    this.innerHTML = "";

    const container = document.createElement("div");
    container.style.display = "flex";
    container.style.flexDirection = "column";

    const mainTitle = document.createElement("h3");
    mainTitle.textContent = "Header Position Card Configuration";
    mainTitle.style.margin = "0 0 16px 0";
    container.appendChild(mainTitle);

    const designSection = document.createElement("div");
    designSection.style.borderBottom = "1px solid var(--divider-color)";
    designSection.style.paddingBottom = "12px";
    designSection.style.marginBottom = "12px";

    const designTitle = document.createElement("h4");
    designTitle.textContent = "Design";
    designTitle.style.margin = "0 0 8px 0";
    designTitle.style.opacity = "0.8";
    designSection.appendChild(designTitle);

    const designForm = document.createElement("ha-form");
    designForm.hass = this._hass;
    designForm.data = { Design: data.Design || "default" };
    designForm.schema = [
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
    ];
    designForm.computeLabel = (s) => s.label;
    designForm.addEventListener(
      "value-changed",
      this._configChanged.bind(this),
    );

    designSection.appendChild(designForm);
    container.appendChild(designSection);

    const breakpoints = ["mobile", "tablet", "desktop", "wide"];

    breakpoints.forEach((bp) => {
      const section = document.createElement("div");
      section.style.borderBottom = "1px solid var(--divider-color)";
      section.style.paddingBottom = "12px";
      section.style.marginBottom = "12px";

      const title = document.createElement("h4");
      title.textContent = bp.charAt(0).toUpperCase() + bp.slice(1);
      title.style.margin = "0 0 8px 0";
      title.style.opacity = "0.8";
      section.appendChild(title);

      const form = document.createElement("ha-form");
      form.hass = this._hass;
      form.data = data;
      form.schema = this._getSchemaForBreakpoint(bp);
      form.computeLabel = (s) => s.label;
      form.addEventListener("value-changed", this._configChanged.bind(this));

      section.appendChild(form);
      container.appendChild(section);
    });

    const customSection = document.createElement("div");
    customSection.style.borderBottom = "1px solid var(--divider-color)";
    customSection.style.paddingBottom = "12px";
    customSection.style.marginBottom = "12px";

    const customTitle = document.createElement("h4");
    customTitle.textContent = "Custom";
    customTitle.style.margin = "0 0 8px 0";
    customTitle.style.opacity = "0.8";
    customSection.appendChild(customTitle);

    const customForm = document.createElement("ha-form");
    customForm.hass = this._hass;
    customForm.data = data;
    customForm.schema = this._getCustomSchema(data);
    customForm.computeLabel = (s) => s.label;
    customForm.addEventListener(
      "value-changed",
      this._configChanged.bind(this),
    );

    customSection.appendChild(customForm);
    container.appendChild(customSection);

    this.appendChild(container);
  }

  _configChanged(e) {
    const newData = e.detail.value;
    const config = { ...this._config, ...newData };

    const hasBreakpointToggle = [
      "mobile",
      "tablet",
      "desktop",
      "wide",
      "custom",
    ].some((bp) => `${bp}_enabled` in newData);

    if (hasBreakpointToggle) {
      const styles = [];
      ["mobile", "tablet", "desktop", "wide", "custom"].forEach((bp) => {
        if (config[`${bp}_enabled`] === true) {
          styles.push(bp);
        }
      });
      config.Style = styles;
      ["mobile", "tablet", "desktop", "wide", "custom"].forEach((bp) => {
        delete config[`${bp}_enabled`];
      });
    }

    if (!config.Design || !["default", "minimal"].includes(config.Design)) {
      config.Design = "default";
    }

    this._config = config;

    const event = new CustomEvent("config-changed", {
      detail: { config: config },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }
}

function computeLabel(name, hass) {
  const validBreakpoints = ["mobile", "tablet", "desktop", "wide"];

  if (validBreakpoints.includes(name)) {
    const baseKey =
      "ui.panel.lovelace.editor.condition-editor.condition.screen.breakpoints_list";
    const label = hass.localize(`${baseKey}.${name}`);

    let breakpointInfo = "";
    switch (name) {
      case "tablet":
        breakpointInfo = " (min: 768px)";
        break;
      case "desktop":
        breakpointInfo = " (min: 1024px)";
        break;
      case "wide":
        breakpointInfo = " (min: 1280px)";
        break;
      default:
        break;
    }
    return label + breakpointInfo;
  }

  if (name === "custom") {
    return "Custom";
  }

  if (name === "custom_width") {
    return (
      "Custom" +
      " " +
      hass.localize(
        "ui.panel.lovelace.editor.condition-editor.condition.screen.min",
      )
    );
  }

  return name;
}

customElements.define("header-position-editor", HeaderPositionEditor);
