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

Simply add the header-position-card to onw of your dashboards and choose the mode (none, all devices or mobile only) to cahnge the position of the header.

## Features

By default the card isn't shown on your dashboard. Its only visible when the editor is active. Choose the mode and the header will be shown at the bottom on all devices.

![image](https://github.com/user-attachments/assets/d47ad28b-4520-4c54-b8ab-1881b72c8f32)


Should work on iOS devices with and without a Home Button.


## Settings
Choose the device option to change the location of the navbar for the selected options (like the visibiliy option for cards in HA)
You can select multiple options. If the option is selected the navbar will be at the bottom for the selected option.

![image](https://github.com/user-attachments/assets/b9345779-673a-49be-8885-b088b95e2ea7)


```yaml
type: custom:header-position-card
Style:
  - mobile
  - tablet
  - desktop
  - wide
```




# Feedback

Thank you for using my custom cards. Please leave some feedback or a star.
If you have any problems, suggestions for improvements or want to connect with me you can joing my discord: https://discord.gg/RfVx7hmZD3
