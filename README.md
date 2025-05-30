![Static Badge](https://img.shields.io/badge/version-v1.0.0_beta-brightgreen)

# Zone Smart Irrigation card


![Preview](images/screen.jpg)

Custom integration for Home Assistant to manager a Zone Smart Irrigation System.

> ⚠️ **Nota importante:**  
> This card working with a Zone Smart Irrigation integration
> https://github.com/marcorm69/zone-smart-irrigation


> This guide is still incomplete.  
> The code still has some shortcomings.  
> This work is part of my spare time, I can't give any indication when it will be completed.  


## Disclaimer

This project is distributed in the hope that it will be useful,  
but WITHOUT ANY WARRANTY; without even the implied warranty of  
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  

The author shall not be held liable for any damage or loss caused by the use of this software.  
Use at your own risk.


## License

This project is licensed under the Apache License 2.0.

See the LICENSE file for details.


## Installation

### Manual

1. Copy the folder `smart-irrigation-card` in `/config/www/`
```
<config directory>/
|-- www/
|   |-- smart-irrigation-card/
|       |-- smart-irrigation-card.js
|       |-- smart-irrigation-card-editor.js
|       |-- smart-irrigation-zone-card.manifest.json
```

2. Import the module

Go to to UI **Settings > Integration > Resource (three dots)** and add resource 
URL: <config directory>/www/smart-irrigation-card/smart-irrigation-card.js
Type: module

## Configuration

1. Go to your dashboard\view
2. Click Edit 
3. Click "Add card"
4. Search "Smart Irrigation Card"

In configuration window choose the area you want to display among those configured with the integration.

Enjoy

