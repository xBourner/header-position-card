[![stars - header-position-card](https://img.shields.io/github/stars/xBourner/header-position-card?style=for-the-badge)](https://github.com/xBourner/header-position-card)
[![forks - header-position-card](https://img.shields.io/github/forks/xBourner/header-position-card?style=for-the-badge)](https://github.com/xBourner/header-position-card)
[![GitHub release](https://img.shields.io/github/release/xBourner/header-position-card?style=for-the-badge)](https://github.com/xBourner/header-position-card/releases/)
[![GitHub issues](https://img.shields.io/github/issues/xBourner/header-position-card?style=for-the-badge)](https://github.com/xBourner/header-position-card/issues)

<a href="https://www.buymeacoffee.com/bourner"><img src="https://img.buymeacoffee.com/button-api/?text=Buy me a coffee&emoji=☕&slug=bourner&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff" /></a>

# Header Position Card
This Card allows you to change the layout of the Header for every dashboard.
Shoutout to https://github.com/javawizard/ha-navbar-position who came up with this idea.
I applied some changes to make it even easier to work with this.

Simply add the header-position-card to onw of your dashboards and choose the mode (none, all devices or mobile only) to cahnge the position of the header.

## Features

By default the card isn't shown on your dashboard. Its only visible when the editor is active. Choose the mode and the header will be shown at the bottom on all devices.

![image](https://github.com/user-attachments/assets/516b1723-a7c3-487b-8c86-761e27504d8b)


## Settings

All settings are optional. The card should work without setting any parameters in yaml or via GUI. 

```yaml
type: custom:header-position-card
Style: None | All Devices | Mobile Only
```

None = Navbar stays on top <br>
All Devices = Navbar shown at bottom on every device <br>
Mobile Only = Navbar shown at bottom only on mobile devices (smartphones) <br>

