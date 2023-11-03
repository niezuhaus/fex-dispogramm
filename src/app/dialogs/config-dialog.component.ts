import {Component, Inject, ViewChild} from '@angular/core';
import {Price} from "../classes/Price";
import {GC} from "../common/GC";
import {Observable} from "rxjs";
import {RawConfig} from "../common/interfaces";
import {zip} from "rxjs";
import {setItem} from "../UTIL";
import {SpecialPrice} from "../classes/SpecialPrice";
import {MatMenuTrigger} from "@angular/material/menu";
import {Zone} from "../classes/Zone";
import {MAT_DIALOG_DATA} from "@angular/material/dialog";

@Component({
  selector: 'app-config-dialog',
  template: `
    <h1 mat-dialog-title>einstellungen</h1>
    <div *ngIf="config" class="flex flex-column" style="overflow-y: scroll; overflow-x: hidden; min-width: 500px">
      <mat-tab-group dynamicHeight selectedIndex="{{data?.pageIndex || 0}}">
        <mat-tab [label]="'preise'">
          <div style="max-height:50vh; overflow-y: scroll;" class="flex flex-row">
            <div style="width: 33%">
              <div class="option w8020 small">
                <label>
                  grundpreis bis
                  <mat-form-field style="width: 40px" class="mx-2 relative-top4px">
                    <input
                      matInput
                      type="number"
                      #quantityIncl
                      [(ngModel)]="config.prices.list.quantityIncl"
                      (change)="changedNumbers.set('price_list_quantityIncl', quantityIncl.valueAsNumber)"
                      (keyup)="changedNumbers.set('price_list_quantityIncl', quantityIncl.valueAsNumber)">
                  </mat-form-field>
                  km
                </label>
                <div>
                  <app-price-input
                    [(price)]="config.prices.list.base"
                    (touched)="changedPrices.set(config.prices.list.base.name, config.prices.list.base)"
                    [type]="0"></app-price-input>
                </div>
              </div>
              <hr>
              <div class="option w8020">
                <label>
                  preis pro km
                </label>
                <div>
                  <app-price-input
                    [(price)]="config.prices.list.extra1"
                    (touched)="changedPrices.set(config.prices.list.extra1.name, config.prices.list.extra1)"
                    [type]="0"></app-price-input>
                </div>
              </div>
              <hr>
              <div class="option w8020 small">
                <label>
                  ab
                  <mat-form-field style="width: 40px" class="mx-2 relative-top4px">
                    <input
                      matInput
                      type="number"
                      #threshold
                      [(ngModel)]="config.prices.list.threshold"
                      (change)="changedNumbers.set('price_list_threshold', threshold.valueAsNumber)"
                      (keyup)="changedNumbers.set('price_list_threshold', threshold.valueAsNumber)">
                  </mat-form-field>
                  km
                </label>
                <div>
                  <app-price-input
                    [(price)]="config.prices.list.extra2"
                    (touched)="changedPrices.set(config.prices.list.extra2.name, config.prices.list.extra2)"
                    [type]="0"></app-price-input>
                </div>
              </div>
              <hr>
              <div class="option w8020">
                <label>zwischenstop</label>
                <div>
                  <app-price-input
                    [(price)]="config.prices.stop"
                    (touched)="changedPrices.set(config.prices.stop.name, config.prices.stop)"
                    [type]="0"></app-price-input>
                </div>
              </div>
            </div>
            <div style="width: 33%">
              <div class="option w8020">
                <label>um's eck</label>
                <div>
                  <app-price-input
                    [(price)]="config.prices.nearby"
                    (touched)="changedPrices.set(config.prices.nearby.name, config.prices.nearby)"
                    [type]="0"></app-price-input>
                </div>
              </div>
              <hr>
              <div class="option w8020">
                <label>innenstadt</label>
                <div>
                  <app-price-input
                    [(price)]="config.prices.city"
                    (touched)="changedPrices.set(config.prices.city.name, config.prices.city)"
                    [type]="0"></app-price-input>
                </div>
              </div>
              <hr>
              <div class="option w8020">
                <label>fünf minuten wartezeit</label>
                <div>
                  <app-price-input
                    [(price)]="config.prices.fiveMinutes"
                    (touched)="changedPrices.set(config.prices.fiveMinutes.name, config.prices.fiveMinutes)"
                    [type]="0"></app-price-input>
                </div>
              </div>
              <hr>
              <div class="option w8020">
                <label>fehlanfahrt</label>
                <div>
                  <app-price-input
                    [(price)]="config.prices.falseArrival"
                    (touched)="changedPrices.set(config.prices.falseArrival.name, config.prices.falseArrival)"
                    [type]="0"></app-price-input>
                </div>
              </div>
            </div>
            <div style="width: 33%">
              <div class="option w8020">
                <label>
                  lastzuschlag
                </label>
                <div>
                  <app-price-input
                    [(price)]="config.prices.extras[1]"
                    (touched)="changedPrices.set(config.prices.extras[1].name, config.prices.extras[1])"
                    [type]="0"></app-price-input>
                </div>
              </div>
              <hr>
              <div class="option w8020">
                <label>
                  lastenradzuschlag
                </label>
                <div>
                  <app-price-input
                    [(price)]="config.prices.extras[2]"
                    (touched)="changedPrices.set(config.prices.extras[2].name, config.prices.extras[2])"
                    [type]="0"></app-price-input>
                </div>
              </div>
              <hr>
              <div class="option w8020">
                <label>
                  e-lastenrad + gespann
                </label>
                <div>
                  <app-price-input
                    [(price)]="config.prices.extras[3]"
                    (touched)="changedPrices.set(config.prices.extras[3].name, config.prices.extras[3])"
                    [type]="0"></app-price-input>
                </div>
              </div>
              <hr>
            </div>
          </div>
        </mat-tab>

        <mat-tab [label]="'sonderpreise & zonen'">
          <div class="flex flex-row flex-wrap" style="max-width: 800px">
            <app-container
              style="overflow: scroll"
              *ngFor="let price of specialPrices"
              [price]="price"
              [type]="'specialPrice'"
              class="mr-4 mb-4"
              (contextmenu)="onRightClick($event, price)">
            </app-container>
            <app-container
              class="mr-4"
              [type]="'specialPrice'">
            </app-container>
            <app-container
              *ngFor="let zone of zones"
              [zone]="zone"
              [type]="'zone'"
              class="mr-4 mb-4"
              (contextmenu)="onRightClick($event, zone)">
            </app-container>
            <app-container
              [type]="'zone'">
            </app-container>
          </div>
        </mat-tab>

        <mat-tab [label]="'zusätzliche einstellungen'">
          <div style="max-height:50vh; overflow-y: scroll;" class="pt-2">
            <div class="option w4060">
              <label>
                datenquelle für kartendaten
              </label>
              <div>
                <mat-button-toggle-group [value]="config.geocoder.type" (change)="changeGeocoder($event.value)">
                  <mat-button-toggle [value]="0">
                    openstreetmap <img src="../../assets/osm.png" alt="osm" style="height: 30px">
                  </mat-button-toggle>
                  <mat-button-toggle [value]="1">
                    bing maps <img src="../../assets/bing.png" alt="bing" style="height: 30px">
                  </mat-button-toggle>
                  <mat-button-toggle [value]="2">
                    beide kombiniert
                  </mat-button-toggle>
                </mat-button-toggle-group>
              </div>
            </div>
            <hr>
            <div class="option w4060">
              <label>
                mehrwertsteuersatz
              </label>
              <div>
                <mat-form-field class="mx-2 price" style="width: 40px">
                  <input
                    #MWST
                    matInput
                    type="number"
                    class="pr-2"
                    [(ngModel)]="config.vat"
                    (focus)="MWST.select()"
                    (change)="changedNumbers.set('MWST', MWST.valueAsNumber)"
                    (keyup)="changedNumbers.set('MWST', MWST.valueAsNumber)">
                </mat-form-field>
                %
              </div>
            </div>
            <hr>
            <div class="option w4060">
              <label>festtouren</label>
              <div>
                <mat-form-field style="width: 40px">
                  <input
                    matInput
                    type="number"
                    #hours
                    [(ngModel)]="config.tourplan.HOURS_IN_ADVANCE"
                    (change)="changedNumbers.set('hoursInAdvance', hours.valueAsNumber)"
                    (keyup)="changedNumbers.set('hoursInAdvance', hours.valueAsNumber)">
                </mat-form-field>
                stunden im vorraus anzeigen
              </div>
            </div>
            <hr>
            <div class="option w4060">
              <label>werktage pro monat</label>
              <div class="flex flex-column">
                <mat-form-field style="width: 60px">
                  <input
                    matInput
                    type="number"
                    #workingDays
                    [(ngModel)]="config.workingDays"
                    (change)="changedNumbers.set('workingDays', workingDays.valueAsNumber)"
                    (keyup)="changedNumbers.set('workingDays', workingDays.valueAsNumber)">
                </mat-form-field>
                <small class="relative-bot8px">für die berechnung von festtourpreisen</small>
              </div>
            </div>
            <hr>
            <div class="option w4060">
              <label>zonen</label>
              <div>
                <mat-slide-toggle [(ngModel)]="config.showZonesPermanently" #showZonesPermanently
                                  (change)="changedBooleans.set('showZonesPermanently', $event.checked)">
                  permanent auf der karte anzeigen
                </mat-slide-toggle>
              </div>
            </div>
            <hr>
            <div class="option w4060">
              <label>"um's eck"-tarif anwenden</label>
              <div>
                im umkreis von
                <mat-form-field style="width: 60px">
                  <input
                    matInput
                    type="number"
                    #nearbyDist
                    [(ngModel)]="config.nearbyDist"
                    (change)="changedNumbers.set('nearbyDist', nearbyDist.valueAsNumber)"
                    (keyup)="changedNumbers.set('nearbyDist', nearbyDist.valueAsNumber)">
                </mat-form-field>
                m um andere ziele
              </div>
            </div>
            <hr>
            <div class="option w4060">
              <label>warnzeichen anzeigen</label>
              <div>
                <div>
                  <mat-form-field style="width: 60px">
                    <input
                      matInput
                      type="number"
                      #pre_order_alarm
                      [(ngModel)]="config.tourplan.PRE_ORDER_ALARM"
                      (change)="changedNumbers.set('PRE_ORDER_ALARM', pre_order_alarm.valueAsNumber)"
                      (keyup)="changedNumbers.set('PRE_ORDER_ALARM', pre_order_alarm.valueAsNumber)">
                  </mat-form-field>
                  min davor (bei geplanten aufträgen)
                </div>
                <div>
                  <mat-form-field style="width: 60px">
                    <input
                      matInput
                      type="number"
                      #normal_alarm
                      [(ngModel)]="config.tourplan.NORMAL_ALARM"
                      (change)="changedNumbers.set('NORMAL_ALARM', normal_alarm.valueAsNumber)"
                      (keyup)="changedNumbers.set('NORMAL_ALARM', normal_alarm.valueAsNumber)">
                  </mat-form-field>
                  min danach (bei ad-hoc aufträgen)
                </div>
              </div>
            </div>
            <hr>
            <div class="option w4060">
              <label>warnzeichen stoppen</label>
              <div>
                <mat-form-field style="width: 60px">
                  <input
                    matInput
                    type="number"
                    #alarm_stop
                    [(ngModel)]="config.tourplan.ALARM_STOP"
                    (change)="changedNumbers.set('ALARM_STOP', alarm_stop.valueAsNumber)"
                    (keyup)="changedNumbers.set('ALARM_STOP', alarm_stop.valueAsNumber)">
                </mat-form-field>
                h nach dem auftrag
              </div>
            </div>
            <hr>
            <div class="option w4060">
              <label class="flex align-items-center">
                <img
                  src="../../assets/lex.png"
                  class="mr-2"
                  style="height: 17px;
                  display: inline;"
                  alt="lexoffice">
                lexoffice unterstützung
              </label>
              <div>
                <mat-slide-toggle
                  #lexofficeActivated
                  [(ngModel)]="config.lexofficeActivated"
                  (change)="changedBooleans.set('lexofficeActivated', $event.checked)">
                </mat-slide-toggle>
              </div>
            </div>
          </div>
        </mat-tab>

        <mat-tab [label]="'api keys'">
          <div class="option w4060">
            <label>
              lexoffice
            </label>
            <div>
              <mat-form-field style="width: 450px">
                <input
                  matInput
                  [type]="isDezwo ? 'text' : 'password'"
                  #lexOfficeApiKey
                  (focusin)="lexOfficeApiKey.select()"
                  [(ngModel)]="config.api.lex"
                  (change)="changedStrings.set('lexOfficeApiKey', lexOfficeApiKey.value); reloadPage = true"
                  (keyup)="changedStrings.set('lexOfficeApiKey', lexOfficeApiKey.value)">
              </mat-form-field>
            </div>
          </div>
          <div class="option w4060">
            <label>
              geoapify
            </label>
            <div>
              <mat-form-field style="width: 450px">
                <input
                  matInput
                  [type]="isDezwo ? 'text' : 'password'"
                  #geoapifyApiKey
                  (focusin)="geoapifyApiKey.select()"
                  [(ngModel)]="config.api.geoapify"
                  (change)="changedStrings.set('geoapifyApiKey', geoapifyApiKey.value); reloadPage = true"
                  (keyup)="changedStrings.set('geoapifyApiKey', geoapifyApiKey.value)">
              </mat-form-field>
            </div>
          </div>
          <div class="option w4060">
            <label>
              mapbox
            </label>
            <div>
              <mat-form-field style="width: 450px">
                <input
                  matInput
                  [type]="isDezwo ? 'text' : 'password'"
                  #mapboxApiKey
                  (focusin)="mapboxApiKey.select()"
                  [(ngModel)]="config.api.mapbox"
                  (change)="changedStrings.set('mapboxApiKey', mapboxApiKey.value); reloadPage = true"
                  (keyup)="changedStrings.set('mapboxApiKey', mapboxApiKey.value)">
              </mat-form-field>
            </div>
          </div>
          <div class="option w4060">
            <label>
              bing
            </label>
            <div>
              <mat-form-field style="width: 450px">
                <input
                  matInput
                  [type]="isDezwo ? 'text' : 'password'"
                  #bingApiKey
                  (focusin)="bingApiKey.select()"
                  [(ngModel)]="config.api.bing"
                  (change)="changedStrings.set('bingApiKey', bingApiKey.value); reloadPage = true"
                  (keyup)="changedStrings.set('bingApiKey', bingApiKey.value)">
              </mat-form-field>
            </div>
          </div>
        </mat-tab>

        <mat-tab [label]="'information'">
          <div class="flex flex-row justify-content-between align-items-end">
            <div>
              <div class="flex flex-row align-items-baseline">
                <h1>dispogramm </h1>
                <span style="color: gray; font-family: monospace"><i>v{{version}}</i></span>
              </div>
              <p>entwickelt 2020 - {{year}} <br>vom fahrrad express kurier:innenkollektiv</p>
              <p>frontend: daniel</p>
              <p>backend: jan</p>
            </div>
            <img src="../../assets/logo/fex-logo.png" style="width: 200px" alt="fex logo">
          </div>
        </mat-tab>

        <mat-tab *ngIf="isDezwo" [label]="'extras'">
          <div class="flex w-100 column align-items-center">
            <button mat-raised-button class="mx-2 fex-button" (click)="getProfile()">
              profil abrufen
            </button>
            <button mat-raised-button class="mx-2 fex-button" (click)="recreateBlueprints()">
              blueprints neu speichern
            </button>
          </div>
        </mat-tab>
      </mat-tab-group>

      <hr>
    </div>
    <div class="option w4060" style="min-width: 700px">
      <label>
        server-ip vom backend
      </label>
      <div style="white-space: nowrap">
        <mat-form-field style="width: 350px">
          <input
            matInput
            #trigger="matAutocompleteTrigger"
            [matAutocomplete]="auto"
            type="text"
            #backendIP
            [value]="backend"
            (change)="changedBackendIP = backendIP.value"
            (keyup)="changedBackendIP = backendIP.value"
            (selectionchange)="changedBackendIP = backendIP.value">
          <mat-autocomplete
            autoActiveFirstOption
            #auto="matAutocomplete"
            [panelWidth]="'unset'">
            <mat-option *ngFor="let ip of recentBackendIPs" [value]="ip">
              <div class="flex flex-row justify-between">
                {{ip}}
                <a (click)="$event.stopPropagation(); deleteFromRecent(ip)"><i class="ml-2 bi bi-x-circle"></i></a>
              </div>
            </mat-option>
          </mat-autocomplete>
        </mat-form-field>
        <button mat-button (click)="settings = !settings" class="ml-3"><i class="bi bi-gear"></i></button>
      </div>
    </div>
    <div *ngIf="settings">
      <div class="option w4060">
        <label>
          nutzer:innenname (optional)
        </label>
        <div>
          <mat-form-field style="width: 350px">
            <input
              matInput
              type="text"
              #authNameInput
              [value]="authName"
              (change)="changedAuthName = authNameInput.value"
              (keyup)="changedAuthName = authNameInput.value"
              (selectionchange)="changedAuthName = authNameInput.value">
          </mat-form-field>
        </div>
      </div>
      <div class="option w4060">
        <label>
          passwort
        </label>
        <div>
          <mat-form-field style="width: 350px">
            <input
              matInput
              type="password"
              #authPwdInput
              [value]="authPwd"
              (change)="changedAuthPwd = authPwdInput.value"
              (keyup)="changedAuthPwd = authPwdInput.value"
              (selectionchange)="changedAuthPwd = authPwdInput.value">
          </mat-form-field>
        </div>
      </div>
    </div>
    <div class="mt-4">
      <button mat-raised-button class="fex-button" matDialogClose (click)="save()">speichern</button>
    </div>

    <div class="container">
      <div style="visibility: hidden; position: fixed"
           [style.left.px]="menuTopLeftPosition.x"
           [style.top.px]="menuTopLeftPosition.y"
           [matMenuTriggerFor]="rightMenu"></div>

      <mat-menu #rightMenu="matMenu">
        <ng-template matMenuContent let-price="price" let-zone="zone">
          <right-click-menu
            [zone]="zone"
            [price]="price">
          </right-click-menu>
        </ng-template>
      </mat-menu>
    </div>
  `,
  styles: [`
    .option {
      display: flex;
      flex-direction: row;
      align-items: center;
    }

    .option > label {
      align-self: baseline;
      font-weight: bold;
      min-width: fit-content;
      display: flex;
      justify-content: flex-end;
      align-items: center;
    }

    .option:not(.small) > label {
      margin: 17px 10px 17px 0;
    }

    .option.small > label {
      margin: 4px 10px 4px 0;
    }

    .option.w4060 > label {
      width: 40%;
    }

    .option.w8020 > label {
      width: 80%;
    }

    .option.w4060 > div {
      width: 60%;
    }

    .option.w8020 > div {
      width: 20%;
    }

    td {
      text-align: right;
    }

    .priceDes {
      border-right: none !important;
    }

    .priceDes + td {
      border-left: none !important;
    }
  `]
})
export class ConfigDialogComponent {
  config = GC.config;
  year: string = Math.max(new Date().getFullYear(), 2023).toString();
  changedPrices: Map<string, Price> = new Map<string, Price>();
  changedNumbers: Map<string, number> = new Map<string, number>();
  changedBooleans: Map<string, boolean> = new Map<string, boolean>();
  changedStrings: Map<string, string> = new Map<string, string>();
  changedBackendIP: string;
  changedAuthName: string;
  changedAuthPwd: string;
  menuTopLeftPosition = {x: 0, y: 0};
  reloadPage = false;
  settings = false;

  get version() {
    return GC.version
  };

  get recentBackendIPs() {
    return GC.recentBackendIPs
  };

  get zones() {
    return GC.zones
  };

  get backend() {
    return GC.backendIP
  };

  get authName() {
    return GC.authName
  };

  get authPwd() {
    return GC.authPwd
  };

  get isDezwo(): boolean {
    return GC._isDezwo;
  }

  get specialPrices(): SpecialPrice[] {
    return GC.specialPrices;
  }

  @ViewChild(MatMenuTrigger) matMenuTrigger: MatMenuTrigger;

  constructor(@Inject(MAT_DIALOG_DATA) public data: {
    pageIndex: number,
    reloadPage: boolean,
  }) {
    this.reloadPage = data?.reloadPage;
  }

  getProfile(): void {
    GC.http.lex_getProfileInfo().subscribe(i => {
      console.log(i.companyName)
    });
  }

  changeGeocoder(mode: number) {
    GC.config.geocoder = GC.geocoders[mode];
    this.saveConfigValue('geocoder', mode.toString()).subscribe(msg => {
      GC.openSnackBarLong(`du suchst adressen jetzt mit ${parseInt(msg.value) === 0 ? 'openstreetmap' : parseInt(msg.value) === 1 ? 'bing maps' : 'beiden geocodern zugleich'}!`)
    });
  }

  save(): void {
    zip(Array.from(this.changedPrices.entries()).map(p => {
      return this.saveConfigValue(p[0], p[1].toString());
    }).concat(Array.from(this.changedNumbers.entries()).map((n) => {
      return this.saveConfigValue(n[0], n[1].toString())
    })).concat(Array.from(this.changedBooleans.entries()).map(b => {
      return this.saveConfigValue(b[0], b[1] ? 'true' : 'false')
    })).concat(Array.from(this.changedStrings.entries()).map(s => {
      return this.saveConfigValue(s[0], s[1])
    }))).subscribe(() => {
      if (this.reloadPage) {
        location.reload();
        return;
      }
      GC.config = this.config;
      GC.loadConfig(GC.http).subscribe(() => {});
      GC.openSnackBarLong('einstellungen gespeichert');
      GC.refreshNeeded.emit(true)
    });
    if (this.changedBackendIP || this.changedAuthName || this.changedAuthPwd) {
      if (this.changedBackendIP) {
        setItem<string>('backendIP', this.changedBackendIP);
        const m = [...new Set(GC.recentBackendIPs.concat(this.changedBackendIP))];
        setItem<{ IPs: string[] }>('recentBackendIPs', {IPs: m});
      }
      if (this.changedAuthName) {
        setItem<string>('apiAuthName', this.changedAuthName);
      }
      if (this.changedAuthPwd) {
        setItem<string>('apiAuthPwd', this.changedAuthPwd);
      }
      location.reload()
    }
  }

  deleteFromRecent(ip: string) {
    GC.recentBackendIPs.findAndRemove(ip);
    setItem<{ IPs: string[] }>('recentBackendIPs', {IPs: GC.recentBackendIPs});
  }

  recreateBlueprints(): void {
    GC.http.recreateBlueprints();
  }

  saveConfigValue(key: string, value: string): Observable<RawConfig> {
    return GC.http.saveConfigItem(key, value);
  }

  onRightClick(event: MouseEvent, item: SpecialPrice | Zone) {
    event.preventDefault();
    this.menuTopLeftPosition.x = event.clientX;
    this.menuTopLeftPosition.y = event.clientY;
    if (item instanceof SpecialPrice) {
      this.matMenuTrigger.menuData = {price: item};
    } else {
      this.matMenuTrigger.menuData = {zone: item};
    }
    this.matMenuTrigger.openMenu();
  }
}
