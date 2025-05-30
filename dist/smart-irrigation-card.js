import "https://unpkg.com/wired-card@0.8.1/wired-card.js?module";
import "https://unpkg.com/wired-toggle@0.8.0/wired-toggle.js?module";
import {
  LitElement,
  html,
  css,
} from "https://unpkg.com/lit-element@2.0.1/lit-element.js?module";

function loadCSS(url) {
  const link = document.createElement("link");
  link.type = "text/css";
  link.rel = "stylesheet";
  link.href = url;
  document.head.appendChild(link);
}

loadCSS("https://fonts.googleapis.com/css?family=Gloria+Hallelujah");


class SmartIrrigationZoneCard extends HTMLElement {

  static async getConfigElement() {
    await import("./smart-irrigation-card-editor.js");
    return document.createElement("smart-irrigation-card-editor");
  }


  //static getConfigElement() {
//    return document.createElement("smart-irrigation-card-editor");
//  }

  static getStubConfig() {
    return {
      zone_name: "",
      physical_switch_entity: "",
    };
  }


  setConfig(config) {
    if (!config.zone_name) {
      throw new Error("You need to define zone_name");
    }
    if (!config.physical_switch_entity) {
      throw new Error("You need to define physical_switch_entity for manual control");
    }
  

    this.config = {
      ...config,
      zone_title: config.zone_name.toUpperCase(),
      zone_name: config.zone_name.toLowerCase(), // Assicurati che zone_name sia sempre minuscolo
      manual_duration_entity: `number.${config.zone_name.toLowerCase()}_manual_duration`,
    };

    if (!this.shadowRoot) {
      this.attachShadow({
        mode: 'open'
      });
      this._createStyles();
      this._createDom();
    }
  }

  set hass(hass) {
    this._hass = hass;

    const zoneName = this.config.zone_name;
    const entityIdOnOff = `switch.${zoneName}_on_off`;
    const stateObjOnOff = hass.states[entityIdOnOff];
    const isOn = stateObjOnOff ? stateObjOnOff.state === "on" : false;

    this._updateZoneSwitch(isOn);
    this._updateManualControl(hass);
    this._updateConditionalSections(hass, isOn);
    this._updateTimeSlots(hass, isOn);
  }

  _createStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .card-container {
        border-radius: 5px;
        background: rgba(100, 100, 100, 0.4);
        padding: 5px;
        font-family: Oswald, sans-serif;
        display: flex;
        flex-direction: column;
        gap: 5px;
      }

      .ha-card-imitation {
        font-weight: 100;
        background-color: transparent;
        font-family: Oswald, sans-serif;
        font-size: 18px;
        height: 100%;
        display: flex;
        align-items: center;
        padding: 10px;
        cursor: pointer;
      }

      .zone-switch-card {
        display: grid;
        grid-template-areas: "i n";
        grid-template-columns: 10% 1fr;
        grid-template-rows: 100%;
        align-items: center;
        padding: 0px;
        cursor: pointer;
        border-top: 1px solid var(--zone-border-color, gray);
        border-bottom: 1px solid var(--zone-border-color, gray);
        border-left: 3px solid var(--zone-border-color, gray);
        border-radius: 5px;
      }
      .zone-switch-card .icon {
        width: 30px;
        color: var(--zone-icon-color, gray);
        width: 100%;
      }
      .zone-switch-card .name {
        font-size: 20px;
        justify-self: start;
        color: var(--zone-name-color, gray);
      }
      .zone-switch-card.on {
        --zone-border-color: rgb(80, 200, 120);
        --zone-icon-color: orange;
        --zone-name-color: orange;
      }
      .zone-switch-card.off {
        --zone-border-color: gray;
        --zone-icon-color: gray;
        --zone-name-color: gray;
      }

      .manual-watering-section {
        display: grid;
        grid-template-areas: "n time start";
        grid-template-columns: 30% 60% 10%;
        grid-template-rows: 100%;
        align-items: center;
        font-weight: 300;
        padding: 0px;
        background-color: transparent;
        border-top: 1px solid rgb(151, 207, 202);
        border-bottom: 1px solid rgb(151, 207, 202);
      }
      .manual-watering-section .label {
        justify-self: left;
        margin: 5px;
      }

      .manual-time-input-container {
        display: inline-block;
        align-items: center;
        justify-content: space-between;
        background: transparent;
        padding: 0px !important;
        font-family: "Oswald";
        font-size: 20px !important;
        margin-left: 30px;
        margin-right: 30px;
        --control-height: 16px;
        --control-border-radius: 5px;
      }
      .manual-time-input-container input[type="number"] {
        width: 60px;
        text-align: center;
        background: none;
        border: none;
        color: inherit;
        font-family: inherit;
        font-size: inherit;
        outline: none;
        padding: 0;
        appearance: textfield;
      }
      .manual-time-input-container input[type="number"]::-webkit-inner-spin-button,
      .manual-time-input-container input[type="number"]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
      }
      .manual-time-input-container .unit-label {
        font-family: Oswald !important;
        font-size: 20px !important;
        margin-left: 5px;
      }
      .manual-time-input-container .number-controls {
          display: flex;
          flex-direction: column;
      }
      .manual-time-input-container .number-controls button {
          background: none;
          border: 1px solid orange;
          color: orange;
          cursor: pointer;
          font-size: 1.2em;
          width: 20px;
          height: 12px;
          line-height: 0;
          padding: 0;
          margin: 0;
          border-radius: 3px;
          display: flex;
          align-items: center;
          justify-content: center;
      }
      .manual-time-input-container .number-controls button:first-child {
          margin-bottom: 2px;
      }

      .manual-go-button {
        padding: 0px;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        background-color: transparent;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        z-index: 9999 !important;
        position: relative !important;
      }
      .manual-go-button ha-icon {
        width: 100%;
        height: 100%;
        color: var(--manual-go-icon-color, grey);
      }
      .manual-go-button.on {
        --manual-go-icon-color: rgb(80, 200, 120);
      }
      .manual-go-button.off {
        --manual-go-icon-color: rgb(203, 50, 53);
      }
      .manual-go-button.unavailable {
        --manual-go-icon-color: grey;
        pointer-events: none;
      }

      .conditional-section {
        display: none;
      }
      .conditional-section.show {
        display: block;
      }

      .horizontal-stack {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
          justify-content: space-around;
      }

      .day-button {
          border-radius: 5px;
          font-weight: 300;
          font-family: Oswald, sans-serif;
          padding: 5px 10px;
          background-color: transparent;
          cursor: pointer;
          border: 1px solid transparent;
          pointer-events: auto !important;
          flex-grow: 1; /* Occupa tutto lo spazio disponibile */
          text-align: center;
          margin: 2px;
      }

      /* Stile per il pulsante "Ogni giorno" */
      .day-button.every-day {
          width: 100%; /* Occupa tutta la larghezza */
          margin-bottom: 8px; /* Spazio aggiuntivo sotto */
      }

      .day-button.on {
          border-style: solid;
          border-width: 1px;
          border-color: rgb(80, 200, 120);
          height: 100%;
          color: white;
      }
      .day-button.off {
          border-color: rgba(128, 128, 128, 0.5);
          color: gray;
      }

      .stop-irrigation-button {
          display: block;
          text-align: center;
          padding: 5px;
          border-radius: 5px;
          font-weight: 300;
          background-color: transparent;
          border: 1px solid #000000;
          cursor: pointer;
          margin-top: 10px;
      }
      .stop-irrigation-button.off,
      .stop-irrigation-button.unavailable {
          pointer-events: none;
          color: grey;
      }

      /* Stili per le Time Slots */
      .time-slot-card {
        display: grid;
        grid-template-columns: 10% 30% 35% 25%; /* Icona Fascia, Testo Fascia, Orario, Durata */
        grid-template-rows: auto;
        align-items: center;
        gap: 5px;
        padding: 5px;
        border: 1px solid rgba(151, 207, 202, 0.5);
        border-left: 3px solid var(--slot-border-color, gray);
        border-radius: 5px;
        background-color: var(--slot-background-color, transparent);
        font-family: Oswald, sans-serif;
        font-weight: 300;
      }

      /* Fascia 1 - Stili specifici (sempre attiva visivamente e non cliccabile per il toggle) */
      .time-slot-card.slot1 {
        --slot-border-color: rgb(80, 200, 120); /* Bordo sempre verde per Fascia 1 */
        --slot-background-color: rgba(80, 200, 120, 0.2); /* Sfondo sempre attivo per Fascia 1 */
        cursor: default; /* Fascia 1 non è cliccabile sull'intera riga per il toggle */
        pointer-events: auto; /* Deve essere attiva ma non togglabile dalla riga */
      }
      .time-slot-card.slot1 .slot-icon {
        color: orange; /* Icona sempre arancione per Fascia 1 */
      }
      
      /* Fasce 2-4: La riga intera è sempre cliccabile per il toggle */
      .time-slot-card:not(.slot1) {
        cursor: pointer !important; /* Indica che è cliccabile */
        pointer-events: auto !important; /* Permette il click sulla riga per togglare */
      }


      /* Stili generali per ON/OFF della card */
      .time-slot-card.on {
        --slot-border-color: rgb(80, 200, 120);
        --slot-background-color: rgba(80, 200, 120, 0.2);
      }
      .time-slot-card.off {
        --slot-border-color: gray;
        --slot-background-color: transparent;
      }
      .time-slot-card .slot-icon {
        justify-self: center;
        color: var(--slot-icon-color, gray);
      }
      .time-slot-card.on .slot-icon {
        color: orange;
      }
      .time-slot-card.off .slot-icon {
        color: gray;
        opacity: 0.5;
      }


      /* Stili per il contenitore del testo "Fascia X" */
      .slot-text-container {
        display: flex;
        align-items: center;
        font-size: 18px;
        gap: 5px;
        color: var(--slot-text-color, gray);
        pointer-events: none; /* Rimuove la cliccabilità dal testo stesso */
        cursor: default; /* Non deve mostrare il puntatore sul testo */
      }
      .time-slot-card.on .slot-text-container {
        color: orange;
        opacity: 1;
      }
      .time-slot-card.off .slot-text-container {
        color: gray; /* Testo Fascia X diventa grigio quando la fascia è OFF */
        opacity: 0.5; /* Opacità per il testo Fascia X quando OFF */
      }


      .slot-time-duration-container {
        display: inline-block;
        align-items: center;
        justify-content: space-between;
        gap: 5px;
        font-size: 20px;
        flex-wrap: nowrap; /* Assicura che non vadano a capo */
      }

      .manual-duration-icon {
          color: rgb(80, 200, 120); 
          width: 24px; /* Dimensione fissa per le icone */
          height: 24px;
          flex-shrink: 0; /* Impedisce all'icona di rimpicciolirsi */
      }

      /* Nuovi stili per le icone all'interno del container di orario/durata */
      .slot-time-icon, .slot-duration-icon {
          width: 24px; /* Dimensione fissa per le icone */
          height: 24px;
          flex-shrink: 0; /* Impedisce all'icona di rimpicciolirsi */
          color: var(--time-duration-icon-color, gray); /* Colore base delle icone */
      }
      .time-slot-card.on .slot-time-icon,
      .time-slot-card.on .slot-duration-icon {
          color: rgb(80, 200, 120); /* Icone verdi quando la fascia è ON */
      }
      .time-slot-card.off .slot-time-icon,
      .time-slot-card.off .slot-duration-icon {
          color: gray;
          opacity: 0.5;
      }

      .slot-time-input.hours, .slot-time-input.minutes {
        width: 30px; /* Larghezza più piccola per ore/minuti separati */
        text-align: center;
        background: none;
        border: none;
        color: inherit;
        font-family: inherit;
        font-size: inherit;
        outline: none;
        padding: 0;
        appearance: textfield; /* Per nascondere le frecce su Chrome */
        -moz-appearance: textfield; /* Per nascondere le frecce su Firefox */
        border-bottom: 1px dotted rgba(255,255,255,0.5);
      }
      /* Nasconde le frecce per gli input di tipo number in WebKit (Chrome, Safari) */
      .slot-time-input.hours::-webkit-inner-spin-button,
      .slot-time-input.hours::-webkit-outer-spin-button,
      .slot-time-input.minutes::-webkit-inner-spin-button,
      .slot-time-input.minutes::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
      }
      .slot-duration-input {
        width: 40px;
        text-align: center;
        background: none;
        border: none;
        color: inherit;
        font-family: inherit;
        font-size: inherit;
        outline: none;
        padding: 0;
        appearance: textfield;
        -moz-appearance: textfield;
        border-bottom: 1px dotted rgba(255,255,255,0.5);
      }
      .slot-duration-input::-webkit-inner-spin-button,
      .slot-duration-input::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
      }

      .slot-time-input.hours:focus,
      .slot-time-input.minutes:focus,
      .slot-duration-input:focus {
        border-bottom-color: orange;
      }

      .time-separator {
          font-size: 20px;
          margin: 0 2px;
          flex-shrink: 0;
      }

      /* Stili per gli input e le unità quando la fascia è OFF */
      .time-slot-card.off .slot-time-input,
      .time-slot-card.off .slot-duration-input,
      .time-slot-card.off .time-separator {
        color: gray; /* Testo input diventa grigio quando la fascia è OFF */
        opacity: 0.5; /* Opacità per gli input quando OFF */
        pointer-events: none; /* Gli input non sono cliccabili quando la fascia è OFF */
        cursor: default; /* Non deve mostrare il puntatore */
      }
      /* Stili per gli input e le unità quando la fascia è ON */
      .time-slot-card.on .slot-time-input,
      .time-slot-card.on .slot-duration-input,
      .time-slot-card.on .time-separator {
        color: white; /* Testo input diventa bianco quando la fascia è ON */
        opacity: 1; /* Opacità normale per gli input quando ON */
        pointer-events: auto; /* Gli input sono cliccabili quando la fascia è ON */
        cursor: text; /* Mostra il puntatore per indicare che è modificabile */
      }


      /* Animazione blink per gli slot attivi */
      @keyframes blink {
        0%, 100% { background-color: rgba(80, 200, 120, 0.4); }
        50% { background-color: transparent; }
      }
    `;
    this.shadowRoot.appendChild(style);
  }

  _createDom() {
    const container = document.createElement('div');
    container.className = 'card-container';

    // Section#1: ON/OFF Zone
    const zoneSwitch = document.createElement('div');
    zoneSwitch.className = 'zone-switch-card';
    zoneSwitch.addEventListener('click', () => this._toggleZone());
    const icon = document.createElement('ha-icon');
    icon.className = 'icon';
    zoneSwitch.appendChild(icon);
    const name = document.createElement('span');
    name.className = 'name';
    zoneSwitch.appendChild(name);
    this._zoneSwitchEl = zoneSwitch;
    this._zoneSwitchIconEl = icon;
    this._zoneSwitchNameEl = name;
    container.appendChild(zoneSwitch);

    // Section#2: Manual watering
    const manualSection = document.createElement('div');
    manualSection.className = 'manual-watering-section';
    const manualLabel = document.createElement('span');
    manualLabel.className = 'label';
    manualLabel.textContent = "MANUALE";
    manualSection.appendChild(manualLabel);


    const manualTimeContainer = document.createElement('div');
    manualTimeContainer.className = 'manual-time-input-container';
    // *** Crono Icon  ***
    const durationIcon = document.createElement('ha-icon');
    durationIcon.className = 'manual-duration-icon';
    durationIcon.setAttribute('icon', 'mdi:timer-outline'); // Icona cronometro
    manualTimeContainer.appendChild(durationIcon);

    // *** Input manual duration  ***
    const numberInput = document.createElement('input');
    numberInput.type = 'number';
    numberInput.className = 'slot-duration-input';
    numberInput.min = 0;
    numberInput.step = 1;
    numberInput.addEventListener('change', (e) => { // Usiamo 'change' per quando perde il focus
      e.stopPropagation(); 
      this._handleManualDurationInput(e);
  });

    
    manualTimeContainer.appendChild(numberInput);

    manualTimeContainer.appendChild(numberInput);
    this._manualDurationInput = numberInput;
    manualSection.appendChild(manualTimeContainer);

    // *** Call start irrigation service
    /*
    const manualGoButton = document.createElement('div');
    manualGoButton.className = 'manual-go-button';
    manualGoButton.addEventListener('click', () => this._callManualIrrigationScript());
    const goIcon = document.createElement('ha-icon');
    manualGoButton.appendChild(goIcon);
    this._manualGoIconEl = goIcon;
    manualSection.appendChild(manualGoButton);
    container.appendChild(manualSection);
*/

    // *** Call start irrigation service
    const manualGoButton = document.createElement('div');
    manualGoButton.className = 'manual-go-button';

    const goIcon = document.createElement('ha-icon');
    goIcon.icon = 'mdi:play';
    goIcon.style.pointerEvents = 'none'; // IMPORTANTE: L'icona non deve intercettare i click

    manualGoButton.appendChild(goIcon);
    this._manualGoIconEl = goIcon;

    // Aggiungi DOPO aver aggiunto l'icona
    manualGoButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('Click intercettato!');
      console.log('this._hass disponibile?', !!this._hass); // Debug con underscore
      this._callManualIrrigationScript();
  });

    manualSection.appendChild(manualGoButton);
    container.appendChild(manualSection);

    // Sezione 3: Start Weekday (Condizionale)
    const weekdaySection = document.createElement('div');
    weekdaySection.className = 'conditional-section weekday-section';
    const weekdayStack = document.createElement('div');
    weekdayStack.className = 'horizontal-stack weekday-buttons';
    weekdaySection.appendChild(weekdayStack);
    this._weekdaySectionEl = weekdaySection;
    this._weekdayButtonsContainer = weekdayStack;
    container.appendChild(weekdaySection);

    // Section#4: Time Slot (Conditional)
    const timeSlotSection = document.createElement('div');
    timeSlotSection.className = 'conditional-section time-slot-section';
    const timeSlotStack = document.createElement('div');
    timeSlotStack.className = 'vertical-stack time-slot-cards';
    timeSlotSection.appendChild(timeSlotStack);
    this._timeSlotSectionEl = timeSlotSection;
    this._timeSlotCardsContainer = timeSlotStack;
    container.appendChild(timeSlotSection);

    // Creazione dinamica degli slot orari
    this._timeSlotElements = {}; // Per salvare i riferimenti agli elementi degli slot
    for (let i = 1; i <= 4; i++) {
      const slotCard = this._createTimeSlotCard(i);
      this._timeSlotCardsContainer.appendChild(slotCard);
      this._timeSlotElements[`slot${i}`] = slotCard; // Salva il riferimento alla card dello slot
    }

    // Stop Irrigazione (alla fine della sezione Time Slot)
    const stopButton = document.createElement('div');
    stopButton.className = 'stop-irrigation-button';
    stopButton.textContent = "STOP IRRIGAZIONE ATTIVA";
    stopButton.addEventListener('click', () => this._stopIrrigation());
    this._stopButtonEl = stopButton;
    this._timeSlotCardsContainer.appendChild(stopButton);


    this.shadowRoot.appendChild(container);
  }

  _updateZoneSwitch(isOn) {
    this._zoneSwitchNameEl.textContent = this.config.zone_title;
    this._zoneSwitchIconEl.setAttribute('icon', isOn ? 'mdi:checkbox-marked-outline' : 'mdi:checkbox-blank-outline');
    this._zoneSwitchEl.classList.toggle('on', isOn);
    this._zoneSwitchEl.classList.toggle('off', !isOn);
  }

  _updateManualControl(hass) {
    const physicalSwitchState = hass.states[this.config.physical_switch_entity]?.state;
    this._manualGoIconEl.setAttribute('icon', physicalSwitchState === 'on' ? 'mdi:stop-circle-outline' : 'mdi:play-circle-outline');
    this._manualGoIconEl.parentNode.classList.toggle('on', physicalSwitchState === 'on');
    this._manualGoIconEl.parentNode.classList.toggle('off', physicalSwitchState === 'off');
    this._manualGoIconEl.parentNode.classList.toggle('unavailable', physicalSwitchState === 'unavailable' || !physicalSwitchState);

    // Verifica se l'entity esiste e ha un valore valido
    const manualDurationState = hass.states[this.config.manual_duration_entity];
    if (manualDurationState && manualDurationState.state !== undefined && 
        manualDurationState.state !== null && this._manualDurationInput !== document.activeElement) {
        this._manualDurationInput.value = parseFloat(manualDurationState.state);
    } else if (!manualDurationState) {
        console.warn(`Manual duration entity ${this.config.manual_duration_entity} not found`);
    }

    this._stopButtonEl.classList.toggle('on', physicalSwitchState === 'on');
    this._stopButtonEl.classList.toggle('off', physicalSwitchState === 'off');
    this._stopButtonEl.classList.toggle('unavailable', physicalSwitchState === 'unavailable' || !physicalSwitchState);
}

_updateConditionalSections(hass, isZoneOn) {
  // La sezione dei giorni della settimana sarà sempre visibile se la zona principale è ON
  this._weekdaySectionEl.classList.toggle('show', isZoneOn);

  if (isZoneOn) {
    const zoneName = this.config.zone_name;
    const allWeekEntityId = `switch.${zoneName}_all_week`;
    const allWeekState = hass.states[allWeekEntityId]?.state;

    this._weekdayButtonsContainer.innerHTML = ''; // Pulisci prima di ricreare

    // Bottone "Ogni giorno"
    const everyDayButton = this._createDayButton(allWeekEntityId, "Ogni giorno");
    everyDayButton.classList.toggle('on', allWeekState === 'on');
    everyDayButton.classList.toggle('off', allWeekState === 'off');
    this._weekdayButtonsContainer.appendChild(everyDayButton);

    // Giorni individuali: li creiamo SEMPRE e applichiamo lo stile
    const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
    const dayNames = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

    days.forEach((day, index) => {      
      const dayEntityId = `switch.${zoneName}_${day}`;
      const dayButton = this._createDayButton(dayEntityId, dayNames[index]);
      const dayState = hass.states[dayEntityId]?.state;

      dayButton.classList.toggle('on', dayState === 'on');
      dayButton.classList.toggle('off', dayState === 'off');
      this._weekdayButtonsContainer.appendChild(dayButton);
    });
  }
}

  _updateTimeSlots(hass, isZoneOn) {
    // Sezione Fasce Orarie (visibile solo se la zona principale è ON)
    this._timeSlotSectionEl.classList.toggle('show', isZoneOn);

    if (isZoneOn) {
      for (let i = 1; i <= 4; i++) {
        const slotOnOffEntityId = `switch.${this.config.zone_name}_slot${i}_on_off`;
        const slotCard = this._timeSlotElements[`slot${i}`];
        let slotOnOffState = hass.states[slotOnOffEntityId]?.state;

        // Fascia 1 è sempre considerata 'on' per visualizzazione e interazione input
        const isSlotOn = (i === 1) ? true : (slotOnOffState === 'on');

        // Aggiorna classi per lo stile generale dello slot
        slotCard.classList.toggle('on', isSlotOn);
        slotCard.classList.toggle('off', !isSlotOn);
        
        // Forza la Fascia 1 a essere sempre 'on' a livello visuale
        if (i === 1) {
            slotCard.classList.add('on');
            slotCard.classList.remove('off'); // Assicurati che non abbia la classe 'off'
        }

        // Recupera gli input e le icone per aggiornarne i valori e i colori
        const hoursInput = slotCard.querySelector('.slot-time-input.hours');
        const minutesInput = slotCard.querySelector('.slot-time-input.minutes');
        const durationInput = slotCard.querySelector('.slot-duration-input');
        const timeIcon = slotCard.querySelector('.slot-time-icon');
        const durationIcon = slotCard.querySelector('.slot-duration-icon');
        
        // Aggiorna valori di orario e durata
        const startTimeHoursEntity = `number.${this.config.zone_name}_slot${i}_starttime_hour`;
        const startTimeMinutesEntity = `number.${this.config.zone_name}_slot${i}_starttime_minute`;
        const durationEntity = `number.${this.config.zone_name}_slot${i}_duration`;

        const hours = hass.states[startTimeHoursEntity]?.state;
        const minutes = hass.states[startTimeMinutesEntity]?.state;
        const duration = hass.states[durationEntity]?.state;

        // Assicurati che i valori siano formattati con due cifre, anche se HA restituisce un singolo numero
        hoursInput.value = hours !== undefined ? String(Math.floor(hours)).padStart(2, '0') : '00';
        minutesInput.value = minutes !== undefined ? String(Math.floor(minutes)).padStart(2, '0') : '00';
        durationInput.value = duration !== undefined ? parseFloat(duration) : 1;

        // Aggiorna il colore delle nuove icone in base allo stato della fascia
        if (timeIcon) timeIcon.style.color = isSlotOn ? 'rgb(80, 200, 120)' : 'gray';
        if (durationIcon) durationIcon.style.color = isSlotOn ? 'rgb(80, 200, 120)' : 'gray';


        // Gestione animazione e background per slot attivi (come da template originale)
        const zoneRunningEntity = `input_boolean.zone${i}_time${i}_running`; // Assumendo che il nome sia zoneX_timeX_running
        const zoneRunningState = hass.states[zoneRunningEntity]?.state;
        const isZoneRunning = zoneRunningState === 'on';

        slotCard.style.backgroundColor = isZoneRunning ? 'rgba(80, 200, 120, 0.4)' : 'transparent';
        slotCard.style.animation = isZoneRunning ? 'blink 2s ease infinite' : 'none';

      }
      // Assicurati che il pulsante STOP sia sempre l'ultimo elemento dopo gli slot.
      if (!this._timeSlotCardsContainer.contains(this._stopButtonEl)) {
        this._timeSlotCardsContainer.appendChild(this._stopButtonEl);
      }
    }
  }


  _createTimeSlotCard(slotNr) {
    const slotOnOffEntityId = `switch.${this.config.zone_name}_slot${slotNr}_on_off`;
    const slotCard = document.createElement('div');
    slotCard.className = `time-slot-card slot${slotNr}`;

    // Aggiungi l'event listener per il click sull'intera riga della card (tranne Fascia 1)
    if (slotNr !== 1) {
        slotCard.addEventListener('click', (event) => {
            // Impedisci al click di togglare la fascia se l'evento proviene dagli input o icone
            if (event.target.closest('.slot-time-input') || event.target.closest('.slot-duration-input') ||
                event.target.closest('.slot-time-icon') || event.target.closest('.slot-duration-icon')) {
                event.stopPropagation(); // Impedisci la propagazione se cliccato su input o icone
                return;
            }
            // Se clicco su qualsiasi altra parte della card, togglo la fascia
            this._toggleSwitch(slotOnOffEntityId);
        });
    }

    // Icona del numero slot
    const slotIcon = document.createElement('ha-icon');
    slotIcon.className = 'slot-icon';
    slotIcon.setAttribute('icon', `mdi:numeric-${slotNr}-box-outline`);
    slotCard.appendChild(slotIcon);

    // Contenitore per il testo "Fascia X"
    const slotTextContainer = document.createElement('div');
    slotTextContainer.className = 'slot-text-container';
    const slotText = document.createElement('span');
    slotText.className = 'name';
    slotText.textContent = `Fascia`;
    slotTextContainer.appendChild(slotText);
    
    slotCard.appendChild(slotTextContainer);

    // Contenitore per Orario e Durata
    const timeDurationContainer = document.createElement('div');
    timeDurationContainer.className = 'slot-time-duration-container';

    // *** Icona Orologio (PRIMA del campo Orario) ***
    const timeIcon = document.createElement('ha-icon');
    timeIcon.className = 'slot-time-icon';
    timeIcon.setAttribute('icon', 'mdi:clock-outline'); // Icona orologio
    timeDurationContainer.appendChild(timeIcon);

    // Input Ore (tipo number)
    const hoursInput = document.createElement('input');
    hoursInput.type = 'number';
    hoursInput.className = 'slot-time-input hours';
    hoursInput.min = 0;
    hoursInput.max = 23;
    hoursInput.maxLength = 2; // Per limitare visivamente
    hoursInput.placeholder = 'HH';
    hoursInput.addEventListener('change', (e) => this._handleTimeInput(e, slotNr, 'hours'));
    timeDurationContainer.appendChild(hoursInput);

    // Separatore (:)
    const timeSeparator = document.createElement('span');
    timeSeparator.className = 'time-separator';
    timeSeparator.textContent = ':';
    timeDurationContainer.appendChild(timeSeparator);

    // Input Minuti (tipo number)
    const minutesInput = document.createElement('input');
    minutesInput.type = 'number';
    minutesInput.className = 'slot-time-input minutes';
    minutesInput.min = 0;
    minutesInput.max = 59;
    minutesInput.maxLength = 2; // Per limitare visivamente
    minutesInput.placeholder = 'MM';
    minutesInput.addEventListener('change', (e) => this._handleTimeInput(e, slotNr, 'minutes'));
    timeDurationContainer.appendChild(minutesInput);

    slotCard.appendChild(timeDurationContainer);

    const durationContainer = document.createElement('div');
    durationContainer.className = 'slot-time-duration-container';

    // *** Icona Cronometro (PRIMA del campo Durata) ***
    const durationIcon = document.createElement('ha-icon');
    durationIcon.className = 'slot-duration-icon';
    durationIcon.setAttribute('icon', 'mdi:timer-outline'); // Icona cronometro
    durationContainer.appendChild(durationIcon);

    // Durata Input (tipo number)
    const durationInput = document.createElement('input');
    durationInput.type = 'number';
    durationInput.className = 'slot-duration-input';
    durationInput.min = 0;
    durationInput.step = 1;
    durationInput.addEventListener('change', (e) => { // Usiamo 'change' per quando perde il focus
        e.stopPropagation(); // Impedisci il toggle della fascia se modifichi l'input
        this._handleDurationInput(e, slotNr);
    });
    durationContainer.appendChild(durationInput);

    slotCard.appendChild(durationContainer);

    return slotCard;
  }

  // FUNZIONE AGGIORNATA PER GESTIRE I DUE INPUT DI ORA E MINUTI
  _handleTimeInput(e, slotNr, type) {
    const slotCard = this._timeSlotElements[`slot${slotNr}`];
    // Se la card ha la classe 'off' (e non è Fascia 1), ignora l'input
    if (slotCard.classList.contains('off') && slotNr !== 1) {
        // Ripristina il valore corrente
        const currentHours = this._hass.states[`number.${this.config.zone_name}_slot${slotNr}_starttime_hour`]?.state || '00';
        const currentMinutes = this._hass.states[`number.${this.config.zone_name}_slot${slotNr}_starttime_minute`]?.state || '00';
        slotCard.querySelector('.slot-time-input.hours').value = String(Math.floor(currentHours)).padStart(2, '0');
        slotCard.querySelector('.slot-time-input.minutes').value = String(Math.floor(currentMinutes)).padStart(2, '0');
        return;
    }

    let newValue = parseInt(e.target.value, 10);
    // Se l'input è vuoto o non un numero, consideralo 0 per la validazione
    if (isNaN(newValue) || e.target.value === '') {
        newValue = 0;
    }

    let isValid = true;
    let entityToUpdate;
    let currentValueHA;

    if (type === 'hours') {
        if (newValue < 0 || newValue > 23) {
            isValid = false;
            alert("Le ore devono essere comprese tra 00 e 23.");
        }
        entityToUpdate = `number.${this.config.zone_name}_slot${slotNr}_starttime_hour`;
        currentValueHA = this._hass.states[entityToUpdate]?.state || '00';
    } else if (type === 'minutes') {
        if (newValue < 0 || newValue > 59) {
            isValid = false;
            alert("I minuti devono essere compresi tra 00 e 59.");
        }
        entityToUpdate = `number.${this.config.zone_name}_slot${slotNr}_starttime_minute`;
        currentValueHA = this._hass.states[entityToUpdate]?.state || '00';
    }

    if (isValid) {
        // Formatta il valore con padStart per visualizzazione anche se il numero è singolo
        e.target.value = String(newValue).padStart(2, '0');
        this._hass.callService("number", "set_value", {
            entity_id: entityToUpdate,
            value: newValue,
        });
    } else {
        // Ripristina il valore precedente dal Home Assistant e formatta
        e.target.value = String(Math.floor(currentValueHA)).padStart(2, '0');
    }
  }


  _handleDurationInput(e, slotNr) {
    console.log(`Manual duration input changed to: ${e.target.value}`);
    console.log(`Updating entity: ${this.config.manual_duration_entity}`);

    const slotCard = this._timeSlotElements[`slot${slotNr}`];
    if (slotCard.classList.contains('off') && slotNr !== 1) {
        e.target.value = this._hass.states[`number.${this.config.zone_name}_slot${slotNr}_duration`]?.state || '1';
        return;
    }

    const newValue = parseFloat(e.target.value);
    // Aggiungi qui una validazione se la durata ha un range specifico
    if (isNaN(newValue) || newValue < 0) { // Esempio: durata non può essere negativa
        alert("La durata deve essere un numero non negativo.");
        e.target.value = this._hass.states[`number.${this.config.zone_name}_slot${slotNr}_duration`]?.state || '1';
        return;
    }

    this._hass.callService("number", "set_value", {
      entity_id: `number.${this.config.zone_name}_slot${slotNr}_duration`,
      value: newValue,
    });
  }


  _handleManualDurationInput(e) {
    //const slotCard = this._timeSlotElements[`slot${slotNr}`];
    //if (slotCard.classList.contains('off') && slotNr !== 1) {
        //e.target.value = this._hass.states[`number.${this.config.zone_name}_slot${slotNr}_duration`]?.state || '0';
        //return;
    //}
    console.log(`Manual duration input changed to: ${e.target.value}`);
    console.log(`Updating entity: ${this.config.manual_duration_entity}`);

    const newValue = parseFloat(e.target.value);
    // Aggiungi qui una validazione se la durata ha un range specifico
    if (isNaN(newValue) || newValue < 0) { // Esempio: durata non può essere negativa
        alert("La durata deve essere un numero non negativo.");
        e.target.value = this._hass.states[`number.${this.config.zone_name}_manual_duration`]?.state || '0';
        return;
    }

    this._hass.callService("number", "set_value", {
      entity_id: `number.${this.config.zone_name}_manual_duration`,
      value: newValue,
    });
  }

  _toggleZone() {
    if (!this._hass) return;
    const entityId = `switch.${this.config.zone_name}_on_off`;
    const stateObj = this._hass.states[entityId];
    if (!stateObj) return;
    const service = stateObj.state === "on" ? "turn_off" : "turn_on";
    this._hass.callService("switch", service, {
      entity_id: entityId
    });

      // Se stiamo accendendo il primo switch, accendi anche il slot1
    if (service === "turn_on") {
      const slot1EntityId = `switch.${this.config.zone_name}_slot1_on_off`;
      this._hass.callService("switch", "turn_on", {
        entity_id: slot1EntityId
      });
    }

    
    // ---
    // Recupera lo stato attuale dell'entità number.zone_name_slot1_duration
    const slot1DurationEntityId = `number.${this.config.zone_name}_slot1_duration`;
    const slot1DurationStateObj = this._hass.states[slot1DurationEntityId];
    console.log(parseFloat(slot1DurationStateObj.state));
    // Controlla se lo stato esiste e se il valore attuale è diverso da 0
    if (slot1DurationStateObj && parseFloat(slot1DurationStateObj.state) === 0) {
      this._hass.callService("number", "set_value", {
        entity_id: slot1DurationEntityId,
        value: 1
      });
    }

  }


  _changeManualDuration(delta) {
    let currentValue = parseFloat(this._manualDurationInput.value);
    let newValue = currentValue + delta;
    if (newValue < 0) newValue = 0;
    this._hass.callService("number", "set_value", {
      entity_id: this.config.manual_duration_entity,
      value: newValue,
    });
  }

  _callManualIrrigationScript() {
    console.log('=== INIZIO FUNZIONE ===');
    
    // Usa this._hass invece di this.hass
    if (!this._hass) {
        console.error('Hass non disponibile');
        return;
    }
    console.log('✓ Hass disponibile');
    
    const switchEntity = this.config.physical_switch_entity;
    console.log('Switch entity:', switchEntity);
    
    if (!switchEntity) {
        console.error('Switch entity non configurato');
        return;
    }
    console.log('✓ Switch entity OK');
    
    const zoneName = this.config.zone_name.toLowerCase().replace(' ', '_');
    const durationEntityId = `number.${zoneName}_manual_duration`;
    console.log('Cerco duration entity:', durationEntityId);
    
    // Usa this._hass invece di this.hass
    const durationState = this._hass.states[durationEntityId];
    console.log('Duration state:', durationState);
    
    if (!durationState) {
        console.error(`Entità durata non trovata: ${durationEntityId}`);
        return;
    }
    
    const duration = parseFloat(durationState.state);
    console.log('Duration value:', duration);
    
    if (isNaN(duration) || duration <= 0) {
        console.error(`Valore durata non valido: ${durationState.state}`);
        return;
    }
    
    console.log('=== CHIAMATA SERVIZIO ===');
    
    // Usa this._hass invece di this.hass
    this._hass.callService(
        'zone_smart_irrigation',
        'irrigation_control',
        {
            action: 'start',
            switch_entity: switchEntity,
            duration: duration
        }
    ).then(() => {
        console.log('✓ SERVIZIO CHIAMATO CON SUCCESSO!');
    }).catch((error) => {
        console.error('✗ ERRORE nella chiamata del servizio:', error);
    });
}

  _createDayButton(entityId, name) {
    const button = document.createElement('button');
    button.className = 'day-button';
    if (name === "Ogni giorno") {
        button.classList.add('every-day');
    }
    button.textContent = name;
    button.addEventListener('click', () => this._toggleSwitch(entityId));

    const stateObj = this._hass.states[entityId];
    // Imposta "Ogni giorno" come attivo di default se lo stato non è definito
    const isOn = stateObj ? stateObj.state === "on" : (name === "Ogni giorno");
    button.classList.toggle('on', isOn);
    button.classList.toggle('off', !isOn);

    return button;
  }

_toggleSwitch(entityId) {
    const zoneName = this.config.zone_name;
    const allWeekEntityId = `switch.${zoneName}_all_week`;
    const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
    
    const currentStateOfClickedEntity = this._hass.states[entityId]?.state;
    const currentAllWeekState = this._hass.states[allWeekEntityId]?.state;

    // --- Caso 1: L'utente clicca su "Ogni giorno" (allWeekEntityId) ---
    if (entityId === allWeekEntityId) {
        // Se l'utente clicca su "Ogni giorno" e vuole ATTIVARLO (da OFF a ON)
        if (currentAllWeekState === 'off') {
            this._hass.callService('homeassistant', 'turn_on', { entity_id: allWeekEntityId });
            // E disattiva TUTTI i giorni individuali.
            // Questa logica era già presente, ma la ribadisco come punto cruciale.
            days.forEach(day => {
                const dayEntityId = `switch.${zoneName}_${day}`;
                if (this._hass.states[dayEntityId]?.state === 'on') {
                    this._hass.callService('homeassistant', 'turn_off', { entity_id: dayEntityId });
                }
            });
        } 
        // Se l'utente clicca su "Ogni giorno" e vuole DISATTIVARLO (da ON a OFF)
        // BLOCCHIAMO QUEST'AZIONE: "Ogni Giorno" non si disattiva manualmente.
        else { // currentAllWeekState === 'on'
            console.warn("Il pulsante 'Ogni giorno' non può essere disattivato direttamente. Si disattiva automaticamente selezionando un giorno specifico.");
            return; // Blocca l'esecuzione.
        }
    }
    // --- Caso 2: L'utente clicca su un giorno individuale ---
    else if (entityId.startsWith(`switch.${zoneName}_`) && days.some(day => entityId.endsWith(`_${day}`))) {
        // Regola 1: Se "Ogni giorno" è ON, disattivalo automaticamente.
        if (currentAllWeekState === 'on') {
            this._hass.callService('homeassistant', 'turn_off', { entity_id: allWeekEntityId });
        }

        // Toggla lo stato del giorno individuale cliccato.
        this._hass.callService('homeassistant', 'toggle', { entity_id: entityId });

        setTimeout(() => {
            let activeDaysCount = 0;
            days.forEach(day => {
                const dayEntityId = `switch.${zoneName}_${day}`;
                if (this._hass.states[dayEntityId]?.state === 'on') {
                    activeDaysCount++;
                }
            });

            const totalDays = days.length;
            const latestAllWeekState = this._hass.states[allWeekEntityId]?.state;

            // Condizione 1: Tutti i giorni individuali sono OFF
            if (activeDaysCount === 0) {
                if (latestAllWeekState === 'off') {
                    console.log("Tutti i giorni disattivati. Attivo 'Ogni giorno'.");
                    this._hass.callService('homeassistant', 'turn_on', { entity_id: allWeekEntityId });
                    // ******* AGGIUNTA QUI: Spegni i giorni individuali quando 'Ogni giorno' si attiva ********
                    days.forEach(day => {
                        const dayEntityId = `switch.${zoneName}_${day}`;
                        if (this._hass.states[dayEntityId]?.state === 'on') {
                            this._hass.callService('homeassistant', 'turn_off', { entity_id: dayEntityId });
                        }
                    });
                }
            }
            // Condizione 2: Tutti i giorni individuali sono ON
            else if (activeDaysCount === totalDays) {
                if (latestAllWeekState === 'off') {
                    console.log("Tutti i giorni attivati. Attivo 'Ogni giorno'.");
                    this._hass.callService('homeassistant', 'turn_on', { entity_id: allWeekEntityId });
                    // ******* AGGIUNTA QUI: Spegni i giorni individuali quando 'Ogni giorno' si attiva ********
                    days.forEach(day => {
                        const dayEntityId = `switch.${zoneName}_${day}`;
                        if (this._hass.states[dayEntityId]?.state === 'on') {
                            this._hass.callService('homeassistant', 'turn_off', { entity_id: dayEntityId });
                        }
                    });
                }
            }
            // Condizione 3: Selezione mista
            else {
                if (latestAllWeekState === 'on') {
                    console.log("Selezione mista di giorni. Disattivo 'Ogni giorno'.");
                    this._hass.callService('homeassistant', 'turn_off', { entity_id: allWeekEntityId });
                }
            }
        }, 150);
    }
    // --- Caso 3: Altri switch ---
    else {
        this._hass.callService('homeassistant', 'toggle', { entity_id: entityId });
    }
}

  _stopIrrigation() {
    if (!this._hass) return;
    const physicalSwitchState = this.config.physical_switch_entity;
    if (this._hass.states[physicalSwitchState]?.state === 'on') {
      this._hass.callService("switch", "turn_off", {
        entity_id: physicalSwitchState
      });
    }
  }

  getCardSize() {
    return 1;
  }
 
}

customElements.define("smart-irrigation-card", SmartIrrigationZoneCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "smart-irrigation-card",
  name: "Smart Irrigation Card",
  preview: true,
  description: "Card per il controllo delle zone di irrigazione smart",
  configurable: true,  // Abilita la GUI di configurazione
});