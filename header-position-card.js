class HeaderPosition {
  constructor() {
    this.queryParams = new URLSearchParams(window.location.search);
    this.config = { Style: [] };
  }

  setConfig(config) {
    const newConfig = { ...config };

    if (newConfig.Style === undefined) {
      newConfig.Style = [];
    } else {
      if (Array.isArray(newConfig.Style)) {
        newConfig.Style = newConfig.Style.filter(
          s => s && s.toLowerCase() !== "none"
        );
      } else {
        newConfig.Style = newConfig.Style === "None" ? [] : [newConfig.Style];
      }
    }
    // Falls ein Hintergrundfarbwert übergeben wurde, speichern wir ihn in config.color:
    // (Ansonsten bleibt er undefined.)
    this.config = newConfig;
    this.applyChanges();
  }
  
  applyChanges() {
    const styles = this.config.Style;
    if (!styles || styles.length === 0) {
      this.resetHeader();
      return;
    }

    const width = window.innerWidth;
    let applyHeader = false;
    for (const bp of styles) {
      switch(bp.toLowerCase()) {
        case "mobile":
          if (width <= 767) applyHeader = true;
          break;
        case "tablet":
          if (width >= 768 && width <= 1023) applyHeader = true;
          break;
        case "desktop":
          if (width >= 1024 && width <= 1279) applyHeader = true;
          break;
        case "wide":
          if (width >= 1280) applyHeader = true;
          break;
        default:
          break;
      }
    }

    if (applyHeader) {
      this.applyHeaderPositionChanges();
      this.applyPaddingChanges();
    } else {
      this.resetHeader();
    }
  }

  get huiRootElement() {
    return document
      .querySelector("home-assistant")?.shadowRoot
      ?.querySelector("home-assistant-main")?.shadowRoot
      ?.querySelector("ha-panel-lovelace")?.shadowRoot
      ?.querySelector("hui-root")?.shadowRoot;
  }

  applyHeaderPositionChanges() {
    let appHeader = this.huiRootElement?.querySelector(".header");

    if (appHeader && (appHeader.style.top !== 'auto' || appHeader.style.bottom !== '0px')) {
      appHeader.style.setProperty('top', 'auto', 'important');
      appHeader.style.setProperty('bottom', '0px', 'important');

      const ua = navigator.userAgent;
      const isIos = /iPad|iPhone|iPod/.test(ua);
      const isIosWebViewOrStandalone =
        isIos && (navigator.standalone || /Mobile/.test(ua));
      if (isIosWebViewOrStandalone) {
        // Hier wird das Padding dynamisch über den Safe Area inset gesetzt:
        appHeader.style.setProperty("padding-bottom", "calc(env(safe-area-inset-bottom) * 0.5)", "important");
      }

      const haTabs = appHeader?.querySelector(".toolbar > ha-tabs");
      if (!haTabs) return;  // Falls ha-tabs nicht existiert, beenden

      // Überschreibe die Farbe der Ink Bar (z. B. weiß)
      haTabs.style.setProperty("--paper-tabs-selection-bar-color", "white");

      // Greife in den Shadow-DOM des ha-tabs-Elements und passe die Position der Ink Bar an:
      const selectionBar = haTabs.shadowRoot?.querySelector("#tabsContainer > #tabsContent > #selectionBar");
      if (selectionBar) {
        selectionBar.style.setProperty("top", "0");
      }
    }
  }

  applyPaddingChanges() {
    let contentContainer = this.huiRootElement?.querySelector("#view");

    const topPadding = 'env(safe-area-inset-top)';
    const bottomPadding = 'calc(var(--header-height) + env(safe-area-inset-bottom))';

    if (contentContainer) {
      if (
        contentContainer.style.top !== topPadding ||
        contentContainer.style.paddingBottom !== bottomPadding
      ) {
        contentContainer.style.setProperty('padding-top', topPadding);
        contentContainer.style.setProperty('padding-bottom', bottomPadding);
      }
    }
  }
 

  resetHeader() {
    let appHeader = this.huiRootElement?.querySelector(".header");
    let contentContainer = this.huiRootElement?.querySelector(".toolbar") || this.huiRootElement?.querySelector("#view");
    if (appHeader) {
      appHeader.style.removeProperty("top");
      appHeader.style.removeProperty("bottom");
      appHeader.style.removeProperty("background-color");
    }
    if (contentContainer) {
      contentContainer.style.removeProperty("padding-bottom");
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
    const isEditMode = new URLSearchParams(window.location.search).get("edit") === "1";
    if (!isEditMode) {
      this.style.display = "none";
      return;
    }
    
    this.style.display = "";
    if (!this.content) {
      this.innerHTML = "<ha-card><div class='card-content'>Header Position Card</div></ha-card>";
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
  description: "A card that allows toggling the dashboard header position (per view)",
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

_schema() {
  const breakpoints = ["mobile", "tablet", "desktop", "wide"];
  const options = breakpoints.map(bp => ({
    value: bp,
    label: computeLabel({ name: bp }, this._hass)
  }));

  return [
    {
      name: "Style",
      selector: {
        select: {
          multiple: true,
          options: options
        }
      }
    }     
  ];
}

  _updateForm() {
    if (!this._hass || !this._config) return;
    let form = this.querySelector("ha-form");
    if (form) {
      form.hass = this._hass;
      form.data = this._config;
      form.schema = this._schema();
    } else {
      form = document.createElement("ha-form");
      form.hass = this._hass;
      form.data = this._config;
      form.schema = this._schema();
      form.addEventListener("value-changed", this._configChanged.bind(this));
      this.innerHTML = "";
      this.appendChild(form);
    }
  }

  _configChanged(e) {
    const event = new CustomEvent("config-changed", { detail: { config: e.detail.value }, bubbles: true, composed: true });
    this.dispatchEvent(event);
  }
}

function computeLabel(schema, hass) {
  const validBreakpoints = ["mobile", "tablet", "desktop", "wide"];

  if (validBreakpoints.includes(schema.name)) {
    const baseKey = "ui.panel.lovelace.editor.condition-editor.condition.screen.breakpoints_list";
    const label = hass.localize(`${baseKey}.${schema.name}`);
    
    let breakpointInfo = "";
    switch (schema.name) {
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
  
  return schema.name;
}


customElements.define("header-position-editor", HeaderPositionEditor);
