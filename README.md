
[![(https://hacs.xyz)](https://img.shields.io/badge/hacs-default-orange.svg?style=for-the-badge)](https://github.com/hacs/integration)
![GitHub Downloads (all assets, all releases)](https://img.shields.io/github/downloads/xBourner/header-position-card/total?style=for-the-badge)
[![stars - header-position-card](https://img.shields.io/github/stars/xBourner/header-position-card?style=for-the-badge)](https://github.com/xBourner/header-position-card)
[![forks - header-position-card](https://img.shields.io/github/forks/xBourner/header-position-card?style=for-the-badge)](https://github.com/xBourner/header-position-card)
[![GitHub release](https://img.shields.io/github/release/xBourner/header-position-card?style=for-the-badge)](https://github.com/xBourner/header-position-card/releases/)
[![GitHub issues](https://img.shields.io/github/issues/xBourner/header-position-card?style=for-the-badge)](https://github.com/xBourner/header-position-card/issues)

[![Discord](https://img.shields.io/discord/1341456711835455609?style=for-the-badge&logo=discord&logoColor=%237289da&label=Discord&color=%237289da)](https://discord.gg/RfVx7hmZD3)
[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-ffdd00?&logo=buy-me-a-coffee&logoColor=black&style=for-the-badge)](https://www.buymeacoffee.com/bourner)
[![PayPal](https://img.shields.io/badge/PayPal-003087?logo=paypal&logoColor=fff&style=for-the-badge)](https://www.paypal.me/gibgas123)


# Header Position Card
This Card allows you to change the layout of the Header for every dashboard.
Shoutout to https://github.com/javawizard/ha-navbar-position who came up with this idea.
I applied some changes to make it even easier to work with this.

Simply add the header-position-card to onw of your dashboards and choose the mode (mobile, dekstop, wide etc.) to cahnge the position of the header.
There's also a global mode which will change the position of the navbar on all dashboards.

## Features

By default the card isn't shown on your dashboard. Its only visible when the editor is active. Choose the mode and the header will be shown at the bottom on all devices.
You can enable the position to only change the postion on the dashboard its placed or you can change position globally.

<img width="428" height="69" alt="image" src="https://github.com/user-attachments/assets/4d18ce72-8791-4a8a-99b4-b978b5f5afe2" />

<img width="422" height="63" alt="image" src="https://github.com/user-attachments/assets/d1347392-0844-457e-9f36-f177f411e76c" />



Should work on iOS devices with and without a Home Button.


## Settings
Choose the device option to change the location of the navbar for the selected options (like the visibiliy option for cards in HA)
You can select multiple options. If the option is selected the navbar will be at the bottom for the selected option.

<img width="515" height="617" alt="image" src="https://github.com/user-attachments/assets/eaa2125e-48d7-41f4-b198-29ff4e0858c7" />


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




# Feedback

Thank you for using my custom cards. Please leave some feedback or a star.
If you have any problems, suggestions for improvements or want to connect with me you can joing my discord: https://discord.gg/RfVx7hmZD3
