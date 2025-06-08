// smart-irrigation-card-editor.js - VERSIONE CORRETTA

import {
    LitElement,
    html,
    css,
  } from "https://unpkg.com/lit-element@2.0.1/lit-element.js?module";
  
  const SENSOR_ENTITY_ID = "sensor.zone_smart_irrigation_config"; // Il tuo sensore
  const CARD_TRANSLATION_DOMAIN = "smart_irrigation_card";
  
  class SmartIrrigationCardEditor extends LitElement {
      static get properties() {
          return {
              _config: { type: Object },
              _hass: { type: Object },
              _zoneOptions: { type: Array },
              _zonesData: { type: Object }, // Conterrà zones e switches
              _translationsLoaded: { type: Boolean }
          };
      }
  
      constructor() {
          super();
          this._config = {};
          this._hass = null;
          this._zoneOptions = [];
          this._zonesData = { zones: [], switches: [] };
          this._translationsLoaded = false;
          console.log("DEBUG Editor: Constructor eseguito");
      }
  
      setConfig(config) {
          this._config = config || {};
          console.log("DEBUG Editor: setConfig chiamato:", this._config);
          this.requestUpdate();
      }
  
      set hass(hass) {
          this._hass = hass;
          console.log("DEBUG Editor: set hass chiamato");
          this._loadSensorData();
      }
  
      /**
       * QUESTA È LA FUNZIONE CHIAVE - Legge dal sensore invece che dalle config entries
       */
      _loadSensorData() {
          if (!this._hass || !this._hass.states) {
              console.log("DEBUG Editor: hass non disponibile");
              return;
          }
  
          // Leggi direttamente dal sensore
          const sensorState = this._hass.states[SENSOR_ENTITY_ID];
          
          if (!sensorState) {
              console.error("DEBUG Editor: Sensore non trovato:", SENSOR_ENTITY_ID);
              this._zoneOptions = [];
              return;
          }
  
          console.log("DEBUG Editor: Dati sensore trovati:", sensorState);
  
          try {
              // I dati sono negli attributi del sensore
              const zones = sensorState.attributes.zones || [];
              const switches = sensorState.attributes.switches || [];
  
              this._zonesData = { zones, switches };
  
              // Crea le opzioni per la combobox
              this._zoneOptions = zones.map(zone => ({
                  label: zone,
                  value: zone
              }));
  
              console.log("DEBUG Editor: Zone caricate:", zones);
              console.log("DEBUG Editor: Switch disponibili:", switches);
              console.log("DEBUG Editor: Opzioni combobox:", this._zoneOptions);
  
          } catch (error) {
              console.error("DEBUG Editor: Errore nel parsing dei dati del sensore:", error);
              this._zoneOptions = [];
          }
  
          this.requestUpdate();
      }
  
      /**
       * Quando l'utente seleziona una zona, trova automaticamente lo switch associato
       */
      _updateZoneName(zoneName) {
          console.log("DEBUG Editor: Zona selezionata:", zoneName);
  
          // Trova lo switch associato alla zona (stesso indice)
          const zoneIndex = this._zonesData.zones.indexOf(zoneName);
          const associatedSwitch = zoneIndex >= 0 && zoneIndex < this._zonesData.switches.length 
              ? this._zonesData.switches[zoneIndex] 
              : null;
  
          console.log("DEBUG Editor: Indice zona:", zoneIndex);
          console.log("DEBUG Editor: Switch associato:", associatedSwitch);
  
          // Aggiorna la config con zona e switch associato
          this._config = {
              ...this._config,
              zone_name: zoneName,
              physical_switch_entity: associatedSwitch
          };
  
          // Rimuovi eventuali proprietà non necessarie
          delete this._config.available_switches;
  
          // Dispatch dell'evento per salvare la config
          this.dispatchEvent(new CustomEvent('config-changed', {
              bubbles: true,
              composed: true,
              detail: { config: this._config }
          }));
  
          console.log("DEBUG Editor: Nuova config:", this._config);
      }

      /**
       * Gestisce i cambiamenti dei colori
       */
      _colorChanged(e) {
          const configKey = e.target.dataset.configKey;
          const value = e.target.value;
          
          console.log("DEBUG Editor: Colore cambiato:", configKey, value);
          
          this._config = {
              ...this._config,
              [configKey]: value
          };
          
          this.dispatchEvent(new CustomEvent('config-changed', {
              bubbles: true,
              composed: true,
              detail: { config: this._config }
          }));
      }

      /**
       * Reset ai colori di default
       */
      _resetColorsToDefault() {
          console.log("DEBUG Editor: Reset colori ai default");
          
          const defaultColors = {
              border_color: '#50c878',
              background_color: '#64646466',
          };
          
          this._config = {
              ...this._config,
              ...defaultColors
          };
          
          this.dispatchEvent(new CustomEvent('config-changed', {
              bubbles: true,
              composed: true,
              detail: { config: this._config }
          }));
          
          // Forza il re-render per aggiornare i color picker
          this.requestUpdate();
      }
  
      /**
       * Funzione helper per ottenere gli switch disponibili per la zona corrente
       */
      _getAvailableSwitches() {
          return this._zonesData.switches || [];
      }
  
      render() {
          console.log("DEBUG Editor: Render - zoneOptions:", this._zoneOptions);
          console.log("DEBUG Editor: Render - config corrente:", this._config);
  
          const selectZoneLabel = "Seleziona Zona di Irrigazione";
  
          return html`
              <div class="container">
                  <!-- Sezione selezione zona -->
                  <div class="form-group">
                      <ha-combo-box
                          .hass="${this._hass}"
                          .items="${this._zoneOptions}"
                          .value="${this._config.zone_name || ''}"
                          @value-changed="${e => this._updateZoneName(e.detail.value)}"
                          label="${selectZoneLabel}">
                      </ha-combo-box>
                      
                      ${this._zoneOptions.length === 0 ? html`
                          <div class="info">
                              ⚠️ Nessuna zona trovata. Verifica che l'integrazione sia configurata.
                          </div>
                      ` : html`
                          <div class="info">
                              Zone disponibili: ${this._zonesData.zones.length} | 
                              Switch disponibili: ${this._zonesData.switches.length}
                          </div>
                      `}
                  </div>
  
                  ${this._config.zone_name ? html`
                      <div class="form-group">
                          <div class="info">
                              <strong>Zona selezionata:</strong> ${this._config.zone_name}<br>
                              <strong>Switch associato:</strong> ${this._config.physical_switch_entity || 'Nessuno trovato'}
                          </div>
                      </div>
                  ` : ''}

                  <!-- Sezione personalizzazione colori -->
                  <div class="form-group">
                      <div class="color-header">
                          <h3>Personalizzazione Colori</h3>
                          <button 
                              class="reset-button"
                              @click=${this._resetColorsToDefault}
                              title="Ripristina colori di default">
                              🔄 Reset
                          </button>
                      </div>
                      
                      
                      <div class="color-option">
                          <label>Colore bordo:</label>
                          <input
                              type="color"
                              .value=${this._config.border_color || '#888888'}
                              @change=${this._colorChanged}
                              data-config-key="border_color"
                          />
                          <span class="color-value">${this._config.border_color || '#888888'}</span>
                      </div>

                      <div class="color-option">
                          <label>Colore sfondo:</label>
                          <input
                              type="color"
                              .value=${this._config.background_color || '#1f1f1f'}
                              @change=${this._colorChanged}
                              data-config-key="background_color"
                          />
                          <span class="color-value">${this._config.background_color || '#1f1f1f'}</span>
                      </div>

                  </div>
              </div>
          `;
      }
  
      static get styles() {
          return css`
              .container {
                  padding: 16px;
                  background-color: var(--card-background-color, white);
                  border-radius: var(--ha-card-border-radius, 12px);
                  box-shadow: var(--ha-card-box-shadow, 0px 2px 4px 0px rgba(0,0,0,0.16));
              }
              
              .form-group {
                  margin-bottom: 24px;
              }
              
              .form-group h3 {
                  margin: 0 0 12px 0;
                  color: var(--primary-text-color);
                  font-size: 16px;
                  font-weight: 500;
              }
              
              .color-header {
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  margin-bottom: 12px;
              }
              
              .reset-button {
                  background: var(--primary-color);
                  color: var(--text-primary-color, white);
                  border: none;
                  padding: 6px 12px;
                  border-radius: 4px;
                  cursor: pointer;
                  font-size: 12px;
                  font-weight: 500;
                  transition: all 0.2s ease;
              }
              
              .reset-button:hover {
                  background: var(--primary-color);
                  opacity: 0.8;
                  transform: translateY(-1px);
              }
              
              .reset-button:active {
                  transform: translateY(0);
              }
              
              .info {
                  font-size: 12px;
                  color: var(--secondary-text-color);
                  margin-top: 8px;
                  padding: 8px;
                  background: var(--divider-color);
                  border-radius: 4px;
              }
              
              .color-option {
                  display: flex;
                  align-items: center;
                  margin-bottom: 12px;
                  gap: 12px;
              }
              
              .color-option label {
                  min-width: 120px;
                  font-size: 14px;
                  color: var(--primary-text-color);
              }
              
              .color-option input[type="color"] {
                  width: 40px;
                  height: 32px;
                  border: none;
                  border-radius: 4px;
                  cursor: pointer;
                  background: none;
              }
              
              .color-option input[type="color"]::-webkit-color-swatch-wrapper {
                  padding: 0;
                  border-radius: 4px;
              }
              
              .color-option input[type="color"]::-webkit-color-swatch {
                  border: 1px solid var(--divider-color);
                  border-radius: 4px;
              }
              
              .color-value {
                  font-family: monospace;
                  font-size: 12px;
                  color: var(--secondary-text-color);
                  background: var(--code-editor-background-color, #f0f0f0);
                  padding: 2px 6px;
                  border-radius: 3px;
              }
              
              ha-combo-box {
                  display: block;
                  width: 100%;
              }
          `;
      }
  }
  
  // Registra l'editor
  if (!customElements.get('smart-irrigation-card-editor')) {
      customElements.define('smart-irrigation-card-editor', SmartIrrigationCardEditor);
  }
  
  export {};