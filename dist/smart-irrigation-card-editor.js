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
              <style>
                  .container { padding: 16px; }
                  .form-group { margin-bottom: 16px; }
                  ha-combo-box { display: block; width: 100%; }
                  .info { 
                      font-size: 12px; 
                      color: var(--secondary-text-color); 
                      margin-top: 4px; 
                  }
              </style>
              
              <div class="container">
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
                  margin-bottom: 16px;
              }
              .info {
                  font-size: 12px;
                  color: var(--secondary-text-color);
                  margin-top: 4px;
                  padding: 8px;
                  background: var(--divider-color);
                  border-radius: 4px;
              }
          `;
      }
  }
  
  // Registra l'editor
  if (!customElements.get('smart-irrigation-card-editor')) {
      customElements.define('smart-irrigation-card-editor', SmartIrrigationCardEditor);
  }
  
  export {};