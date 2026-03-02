<h1 id="top" align="center">Header Position Card</h1>

<p align="center">
  <a href="https://github.com/hacs/integration">
    <img src="https://img.shields.io/badge/hacs-default-orange.svg?style=for-the-badge" alt="HACS">
  </a>
  <a href="https://github.com/xBourner/header-position-card/releases">
    <img src="https://img.shields.io/github/downloads/xBourner/header-position-card/total?style=for-the-badge" alt="GitHub Downloads">
  </a>
  <a href="https://github.com/xBourner/header-position-card/releases/">
    <img src="https://img.shields.io/github/release/xBourner/header-position-card?style=for-the-badge" alt="GitHub release">
  </a>
  <a href="https://github.com/xBourner/header-position-card">
    <img src="https://img.shields.io/github/stars/xBourner/header-position-card?style=for-the-badge" alt="Stars">
  </a>
  <a href="https://github.com/xBourner/header-position-card/network/members">
    <img src="https://img.shields.io/github/forks/xBourner/header-position-card?style=for-the-badge" alt="Forks">
  </a>
  <a href="https://github.com/xBourner/header-position-card/issues">
    <img src="https://img.shields.io/github/issues/xBourner/header-position-card?style=for-the-badge" alt="Issues">
  </a>
</p>

## Overview

**Header Position Card** is a custom utility card for Home Assistant that allows you to cleanly change the position of the header navigation bar on your dashboards.

By default, Home Assistant locks the navigation header to the top of the screen. With this card, you can easily move it to the bottom, optimizing reachability on mobile devices and improving the overall dashboard experience.

*(Shoutout to [javawizard](https://github.com/javawizard/ha-navbar-position) who came up with the original idea. I applied several modifications and a GUI Editor to make it significantly easier and more robust to work with.)*

<p align="center">
  <img alt="Bottom Navigation Bar" src="https://github.com/user-attachments/assets/4d18ce72-8791-4a8a-99b4-b978b5f5afe2">
</p>

<p align="center">
  <img alt="Navbar Alignment" src="https://github.com/user-attachments/assets/d1347392-0844-457e-9f36-f177f411e76c">
</p>

## ✨ Features

- 📱 **Device-Specific Positioning** - Move the header to the bottom only on specific devices (e.g., Mobile only, Tablet only, or Desktop).
- 🌍 **Global Mode** - Apply the custom header position to *all* dashboards at once, rather than on a per-dashboard basis.
- 🍏 **iOS Compatible** - Carefully optimized to look native and respect safe areas on iOS devices (both with and without a Home Button).
- 👻 **Invisible Helper** - This card does not display anything on your actual dashboard; it only runs in the background. It is solely visible when you open the Edit mode.
- 🧠 **100% GUI Editor Ready** - Effortlessly configure the entire card through the visual editor without needing to write YAML.

## 📥 Installation

### Method 1: HACS (Recommended)

The easiest way to install and keep **Header Position Card** updated is via HACS.

[![Open in HACS](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=xBourner&repository=header-position-card&category=plugin)

1. Ensure [HACS](https://hacs.xyz) is installed.
2. Open HACS in Home Assistant.
3. Search for **Header Position Card**, or add this repository (`https://github.com/xBourner/header-position-card`) as a Custom Repository under the Dashboard category.
4. Download and Install.
5. **Clear your browser cache** and refresh (F5) the page.

### Method 2: Manual Install

1. Download the **header-position-card.js** file from the latest release.
2. Put the **header-position-card.js** file into your `config/www` folder.
3. Add a reference to **header-position-card.js** in your Dashboard. There are two ways to do that:
   - **Using UI:** Settings → Dashboards → More Options icon → Resources → Add Resource → Set Url as `/local/header-position-card.js` → Set Resource type as JavaScript Module. *(Note: If you do not see the Resources menu, you will need to enable Advanced Mode in your User Profile)*
   - **Using YAML:** Add the following code to your lovelace section:
     ```yaml
      resources:
      - url: /local/header-position-card.js
        type: module
     ```

## ⚙️ Configuration & Usage

Once installed, simply edit your dashboard, click **Add Card**, and search for **Header Position Card**.

By default, the card isn't shown on your dashboard layout—it is a purely functional background card that is only visible when the dashboard editor is active!

### Settings

Choose the device viewports where you want the navbar location to change (similar to the native visibility options in Home Assistant). You can select multiple options, and the header will snap to the bottom on all selected breakpoints.

<p align="center">
  <img width="515" alt="Visual Editor GUI" src="https://github.com/user-attachments/assets/eaa2125e-48d7-41f4-b198-29ff4e0858c7">
</p>

### YAML Example
If you prefer YAML over the Visual Editor, here is an example configuration:
```yaml
type: custom:header-position-card
Style:
  - mobile
  - tablet
  - desktop
  - wide
global_mobile: true
global_wide: false
```

## ❤️ Support My Work

Developing and maintaining custom cards takes a lot of time and coffee. If you enjoy using Header Position Card and want to support its ongoing development, I would greatly appreciate it!

<p align="center">
  <a href="https://discord.gg/RfVx7hmZD3">
    <img src="https://img.shields.io/discord/1341456711835455609?style=for-the-badge&logo=discord&logoColor=%237289da&label=Discord&color=%237289da" alt="Discord">
  </a>
  <a href="https://www.buymeacoffee.com/bourner">
    <img src="https://img.shields.io/badge/Buy%20Me%20a%20Coffee-ffdd00?&logo=buy-me-a-coffee&logoColor=black&style=for-the-badge" alt="Buy Me A Coffee">
  </a>
  <a href="https://github.com/sponsors/xBourner">
    <img src="https://img.shields.io/badge/Sponsor%20on%20GitHub-30363d?style=for-the-badge&logo=github&logoColor=white" alt="GitHub Sponsors">
  </a>
  <a href="https://www.paypal.me/gibgas123">
    <img src="https://img.shields.io/badge/PayPal-003087?logo=paypal&logoColor=fff&style=for-the-badge" alt="PayPal">
  </a>
</p>

Join the <a href="https://discord.gg/RfVx7hmZD3">**community Discord server**</a> to leave feedback, request features, or get help with your configuration.

---

[🔝 Back to top](#top)
