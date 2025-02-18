class HeaderPosition {
  constructor() {
    this.queryParams = new URLSearchParams(window.location.search);
    this.config = { Style: "None" }; // Standardmäßig deaktiviert
  }

  setConfig(config) {
    this.config = config || { Style: "None" };
    this.applyChanges();
  }

  applyChanges() {
    if (this.config.Style === "None") {
      this.resetHeader();
      return;
    }
    if (this.config.Style === "All Devices" || (this.config.Style === "Mobile Only" && window.innerWidth <= 700)) {
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
        appHeader.style.setProperty("padding-bottom", "25px", "important");

        // set nav icons size ratio to 1, for a more iOS style feeling
        const appHeaderTabs = appHeader.querySelectorAll("paper-tab");
        if (appHeaderTabs && appHeaderTabs.length) {
          appHeaderTabs.forEach((tab) =>
            tab.style.setProperty("padding", "0 16px", "important")
          );
        }
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
      this.style.display = "None";
      return;
    }
    
    this.style.display = ""; // Sicherstellen, dass die Karte sichtbar ist, falls `edit=1` vorhanden ist
    if (!this.content) {
      this.innerHTML = "<ha-card><div class='card-content'>Header Position Card</div></ha-card>";
    }
  }
  

  static getConfigElement() {
    return document.createElement("header-position-editor");
  }

  static getStubConfig() {
    return { Style: "None" };
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
    return [
      { name: "Style", selector: { select: { options: ["None", "All Devices", "Mobile Only"] } } }
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

customElements.define("header-position-editor", HeaderPositionEditor);
