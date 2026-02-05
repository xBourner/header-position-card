class HeaderPosition {
  constructor() {
    this.queryParams = new URLSearchParams(window.location.search);
    this.config = { Style: [] };
    this._observer = null;
    this._usingGlobal = false;
    this._boundApply = this.applyGlobal.bind(this);
  }

  setConfig(config) {
    const newConfig = { ...config };

    if (newConfig.Style === undefined) {
      newConfig.Style = [];
    } else {
      if (Array.isArray(newConfig.Style)) {
        newConfig.Style = newConfig.Style.filter(
          (s) => s && s.toLowerCase() !== "none"
        );
      } else {
        newConfig.Style = newConfig.Style === "None" ? [] : [newConfig.Style];
      }
    }
    this.config = newConfig;
    this.applyChanges();
  }

  applyChanges() {
    const styles = this.config.Style;
    if (!styles || styles.length === 0) {
      this.resetHeader();
      this.deactivateGlobal();
      return;
    }

    const width = window.innerWidth;
    let applyHeader = false;
    let isGlobal = false;

    const checkGlobal = (bp) => {
        return this.config[`global_${bp.toLowerCase()}`] === true;
    };

    for (const bp of styles) {
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
          if (width >= this.config.custom_width) {
              applyHeader = true;
              if (checkGlobal(lowerBp)) isGlobal = true;
          }
        default:
          break;
      }
    }

    if (applyHeader) {
      if (isGlobal) {
        this.activateGlobal();
      } else {
        this.deactivateGlobal();
        this.applyHeaderPositionChanges();
        this.applyPaddingChanges();
      }
    } else {
      this.deactivateGlobal();
      this.resetHeader();
    }
  }

  activateGlobal() {
    if (!this._usingGlobal) {
        this._usingGlobal = true;
        window.addEventListener("location-changed", this._boundApply);
        window.addEventListener("popstate", this._boundApply);
        this.startObserver();
    }
    this.applyGlobal();
  }

  deactivateGlobal() {
    if (this._usingGlobal) {
        this._usingGlobal = false;
        window.removeEventListener("location-changed", this._boundApply);
        window.removeEventListener("popstate", this._boundApply);
        this.stopObserver();
    }
  }

  startObserver() {
    if (this._observer) return;
    
    const target = document.querySelector("home-assistant")?.shadowRoot?.querySelector("home-assistant-main")?.shadowRoot;
    if (!target) return;

    this._observer = new MutationObserver(() => {
        this.applyGlobal();
    });

    this._observer.observe(target, { childList: true, subtree: true });
  }

  stopObserver() {
      if (this._observer) {
          this._observer.disconnect();
          this._observer = null;
      }
  }

  applyGlobal() {
      const haMain = document.querySelector("home-assistant")?.shadowRoot?.querySelector("home-assistant-main")?.shadowRoot;
      if (!haMain) return;

      const lovelace = haMain.querySelector("ha-panel-lovelace");
      if (lovelace) {
          const huiRoot = lovelace.shadowRoot?.querySelector("hui-root");
          if (huiRoot) {
              const header = huiRoot.shadowRoot?.querySelector(".header");
              if (header) this.styleHeader(header);
              this.stylePadding(huiRoot.shadowRoot?.querySelector("#view"));
          }
      }

      const pages = haMain.querySelectorAll("partial-panel-resolver > *");
      pages.forEach(page => {
         if (page.shadowRoot) {
             const header = page.shadowRoot.querySelector("app-header, .header, ha-top-app-bar, ha-top-app-bar-fixed");
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

  styleHeader(element) {
      if (!element) return;
      
      if (element.style.top !== "auto" || element.style.bottom !== "0px") {
          element.style.setProperty("top", "auto", "important");
          element.style.setProperty("bottom", "0px", "important");
          element.style.setProperty("position", "absolute", "important");
          
           if (window.getComputedStyle(element).position === 'static') {
                element.style.setProperty("position", "fixed", "important");
           }

          const ua = navigator.userAgent;
          const isIos = /iPad|iPhone|iPod/.test(ua);
          const isIosWebViewOrStandalone = isIos && (navigator.standalone || /Mobile/.test(ua));
          
          if (isIosWebViewOrStandalone) {
             element.style.setProperty(
              "padding-bottom",
              "calc(env(safe-area-inset-bottom) * 0.25)",
              "important"
            );
          }

          const toolbar = element.querySelector(".toolbar");
          if (toolbar) {
            toolbar.style.setProperty("border-bottom", "none", "important");
            toolbar.style.setProperty("border-top", "1px solid var(--divider-color, rgba(0, 0, 0, 0.12))", "important");
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
  
  stylePadding(element) {
      if (!element) return;
      const topPadding = "env(safe-area-inset-top)";
      const bottomPadding = "calc(var(--header-height) + env(safe-area-inset-bottom))";
      
      if (element.style.paddingBottom !== bottomPadding) {
          element.style.setProperty("padding-top", topPadding);
          element.style.setProperty("padding-bottom", bottomPadding);
      }
  }

  applyHeaderPositionChanges() {
    let appHeader = this.huiRootElement?.querySelector(".header");
    this.styleHeader(appHeader);
  }

  applyPaddingChanges() {
    let contentContainer = this.huiRootElement?.querySelector("#view");
    this.stylePadding(contentContainer);
  }

  resetHeader() {
    let appHeader = this.huiRootElement?.querySelector(".header");
    let contentContainer =
      this.huiRootElement?.querySelector(".toolbar") ||
      this.huiRootElement?.querySelector("#view");
    if (appHeader) {
      appHeader.style.removeProperty("top");
      appHeader.style.removeProperty("bottom");
      appHeader.style.removeProperty("position");
      appHeader.style.removeProperty("padding-bottom");
      appHeader.style.removeProperty("border-bottom");
      appHeader.style.removeProperty("border-top");
      
      const styleEl = appHeader.querySelector("#header-position-card-tab-style");
      if (styleEl) styleEl.remove();

      const toolbar = appHeader.querySelector(".toolbar");
      if (toolbar) {
        toolbar.style.removeProperty("border-bottom");
        toolbar.style.removeProperty("border-top");
      }
    }
    if (contentContainer) {
      contentContainer.style.removeProperty("padding-bottom");
       contentContainer.style.removeProperty("padding-top");
    }
    
    const haMain = document.querySelector("home-assistant")?.shadowRoot?.querySelector("home-assistant-main")?.shadowRoot;
    if (haMain) {
         const pages = haMain.querySelectorAll("partial-panel-resolver > *");
         pages.forEach(page => {
             if (page.shadowRoot) {
                 const header = page.shadowRoot.querySelector("app-header, .header, ha-top-app-bar, ha-top-app-bar-fixed");
                 if (header) {
                      header.style.removeProperty("top");
                      header.style.removeProperty("bottom");
                      header.style.removeProperty("position");
                      header.style.removeProperty("padding-bottom");
                 }
             }
         });
    }
  }
}

window.headerPosition = new HeaderPosition();

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
    return { Style: [] };
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
    
    const styles = Array.isArray(this._config.Style) ? this._config.Style.map(s => s.toLowerCase()) : [];
    const data = { ...this._config };
    ['mobile', 'tablet', 'desktop', 'wide', 'custom'].forEach(bp => {
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

    const breakpoints = ["mobile", "tablet", "desktop", "wide"];
    
    breakpoints.forEach(bp => {
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
    customForm.addEventListener("value-changed", this._configChanged.bind(this));
    
    customSection.appendChild(customForm);
    container.appendChild(customSection);

    this.appendChild(container);
  }

  _configChanged(e) {
    const newData = e.detail.value;
    const config = { ...this._config, ...newData };
    
    const styles = [];
    ['mobile', 'tablet', 'desktop', 'wide', 'custom'].forEach(bp => {
        if (config[`${bp}_enabled`] === true) {
            styles.push(bp);
        }
    });
    config.Style = styles;

    ['mobile', 'tablet', 'desktop', 'wide', 'custom'].forEach(bp => {
       delete config[`${bp}_enabled`];
    });

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
        "ui.panel.lovelace.editor.condition-editor.condition.screen.min"
      )
    );
  }

  return name;
}

customElements.define("header-position-editor", HeaderPositionEditor);
