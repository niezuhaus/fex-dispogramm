import {Component, EventEmitter, Inject, ViewChild, OnDestroy, OnInit, Output} from '@angular/core';
import {LocType} from '../common/interfaces';
import {Job} from "../classes/Job";
import {MAT_DIALOG_DATA} from '@angular/material/dialog';
import {initMap, setMarker} from '../UTIL';
import {MatButtonToggleGroup} from '@angular/material/button-toggle';
import mapboxgl, {LngLat} from "mapbox-gl";
import {GC} from "../common/GC";
import {SearchinputComponent} from "../views/newtour/inputfield/searchinput/searchinput.component";
import {AreYouSureDialogComponent} from "./are-you-sure-dialog.component";
import {MatTableDataSource} from "@angular/material/table";
import {Geolocation, Station} from "../classes/Geolocation";
import {Client} from "../classes/Client";

@Component({
  selector: 'app-edit-location-dialog',
  template: `
    <div style="width: 760px">
      <mat-tab-group dynamicHeight>
        <mat-tab [label]="newLocation ? 'neuen standort erstellen' : 'standort bearbeiten'"
                 class="flex overflow-hidden pr-5 flex-column">
          <div class="flex flex-row justify-content-between">
          </div>

          <div mat-dialog-content class="mt-3 h-100">
            <mat-form-field>
              <mat-label>name</mat-label>
              <input
                #name
                type="text"
                matInput
                [(ngModel)]="data.location.name"
                autofocus>
            </mat-form-field>

            <div class="flex flex-row align-items-baseline justify-content-between">
              <searchinput
                #street
                [(str)]="data.location.street"
                [searchOSM]="true"
                [label]="'straße'"
                (locationSelected)="addressSelected($event)"
                style="width: 350px;"
                class="mr-4">
              </searchinput>
              <mat-form-field class="mr-4" style="width: 100px">
                <mat-label>postleitzahl</mat-label>
                <input
                  type="text"
                  matInput
                  [(ngModel)]="data.location.zipCode">
              </mat-form-field>
              <mat-form-field style="width: 200px">
                <mat-label>stadt</mat-label>
                <input
                  type="text"
                  matInput
                  [(ngModel)]="data.location.city">
              </mat-form-field>
            </div>
            <searchinput
              #searchClient
              [label]="'kund:innenname'"
              [searchClients]="true"
              (clientClientSelected)="clientSelected($event)"
              (resetted)="data.location.clientId = ''"
              class="p-0 col w-100"
              #search>
            </searchinput>
            <mat-form-field class="w-100">
              <mat-label>weitere infos zum auffinden</mat-label>
              <textarea matInput [(ngModel)]="data.location.description"></textarea>
            </mat-form-field>
          </div>

          <div class="mb-1 flex flex-row justify-content-between w-100">
            <button *ngIf="!newLocation" mat-raised-button class="fex-button" (click)="update(data.location)"
                    matDialogClose="true">
              standort aktualisieren
            </button>
            <button *ngIf="newLocation" mat-raised-button class="fex-button" (click)="create(data.location)"
                    matDialogClose="true">
              neuen standort speichern
            </button>

            <button *ngIf="!newLocation" [disabled]="jobs.length > 0" [class.dis]="jobs.length > 0" mat-raised-button
                    class="ml-3 fex-button" (click)="deleteMe()"
                    [matTooltipDisabled]="!(jobs.length > 0)"
                    [matTooltip]="'dieser standort ist in ' + jobs.length + ' aufträgen enthalten und kann nicht gelöscht werden.'">
              standort löschen
            </button>
          </div>
        </mat-tab>

        <mat-tab *ngIf="jobs.length > 0" [label]="'kommt in diesen aufträgen vor (' + jobs.length + ')'"
                 style="max-height: 45vh;">
          <div *ngIf="jobs.length > 0" style="max-height: 45vh; overflow-y: scroll">
            <!--            <h1 mat-dialog-title>kommt in diesen aufträgen vor</h1>-->
            <table
              *ngIf="loaded && jobs.length > 0"
              mat-table
              [dataSource]="dataSource"
              class="mt-3"
              style="width: 95%; margin: auto">
              <ng-container matColumnDef="description">
                <th mat-header-cell *matHeaderCellDef> beschreibung</th>
                <td mat-cell *matCellDef="let element" class="toBottom">
                  <description [job]="element" [moreLocations]="true" [hideHighlights]="true"
                                   [hideToolTips]="true" matDialogClose></description>
                </td>
              </ng-container>
              <ng-container matColumnDef="traveldist">
                <th mat-header-cell *matHeaderCellDef class="text-center" style="width: 100px"> streckenlänge</th>
                <td mat-cell *matCellDef="let element" class="text-center"> {{element.traveldist}} km</td>
              </ng-container>
              <ng-container matColumnDef="price">
                <th mat-header-cell *matHeaderCellDef class="text-center" style="width: 120px">preis</th>
                <td mat-cell *matCellDef="let element" class="text-center">
            <span
              [style.color]="!element.showBrutto ? 'black' : '#BBB'">{{element.priceWithoutWaitingPrice?.netto || element.price.netto}}</span>
                  / <span
                  [style.color]="element.showBrutto ? 'black' : '#BBB'">{{element.priceWithoutWaitingPrice?.brutto || element.price.brutto}}</span><br>
                  <span *ngIf="element.waitingPrice?.netto > 0"> + <span
                    [style.color]="!element.showBrutto ? 'black' : '#BBB'">{{element.waitingPrice.netto}}</span> / <span
                    [style.color]="element.showBrutto ? 'black' : '#BBB'">{{element.waitingPrice.brutto}}</span></span>
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
            </table>
          </div>
        </mat-tab>

      </mat-tab-group>

      <div #mapcontainer id="mapcontainer" style="max-height: 30vh">
        <div #map id="mapEdit"></div>
      </div>


    </div>
  `,
  styles: [`
    * {
      flex-direction: column;
    }

    #mapcontainer {
      position: relative;
      width: calc(100% + 48px);
      left: -24px;
      top: 24px;
    }

    #mapEdit {
      height: 25vh;
    }
  `]
})
export class LocationDialogComponent implements OnInit, OnDestroy {

  client = new Client();
  jobs: Job[] = [];
  newLocation: boolean;

  loaded = false;
  marker: mapboxgl.Marker;
  map: mapboxgl.Map;
  dataSource: MatTableDataSource<Job>;
  displayedColumns: string[] = ['description', 'traveldist', 'price'];

  get routes() {
    return GC.routes
  };

  @Output() created = new EventEmitter<Station>();
  @Output() updated = new EventEmitter<Station>();
  @Output() deleted = new EventEmitter<boolean>();

  @ViewChild('map') mapContainer: HTMLElement;
  @ViewChild('toggle') toggle: MatButtonToggleGroup;
  @ViewChild('street') street: SearchinputComponent;
  @ViewChild('searchClient') searchClient: SearchinputComponent;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: {
      location: Geolocation;
      client: Client;
    }
  ) {
    if (!data.location) {
      data.location = new Geolocation({
        latitude: GC.INIT_MAPCENTER.lat,
        longitude: GC.INIT_MAPCENTER.lng
      });
      this.newLocation = true;
    } else {
      data.location = new Geolocation(data.location);
      this.newLocation = !(data.location.id);
    }
    if (data.client) {
      this.clientSelected(data.client);
    }
  }

  ngOnInit(): void {
    this.initMap();
    this.jobs = GC.http.jobsWithLocation(this.data.location);
    this.dataSource = new MatTableDataSource<Job>(this.jobs);
    this.loaded = true;
    setTimeout(() => {
      if (this.data.location.clientId) {
        GC.http.getClient(this.data.location.clientId).subscribe(client => {
          this.searchClient.searchTerm = client.name;
        });
      }
    })
  }

  ngOnDestroy(): void {
    this.map.remove();
  }

  update(loc: Geolocation): void {
    const s = new Station(loc);
    const branch = s.branch;
    const j = s._job
    s.branch = null;
    s._job = null;
    GC.http.updateLocation(s).subscribe(() => {
      GC.openSnackBarLong(`"${this.data.location.name}" wurde aktualisiert!`);
      this.updated.emit(s);
      s.branch = branch;
      s._job = j;
    });
  }

  create(loc: Geolocation): void {
    const s = new Station(loc);
    const branch = s.branch;
    s.branch = null;
    GC.http.createLocation(s).subscribe(savedLoc => {
      const savedStation = new Station(savedLoc);
      savedStation.locType = s.locType;
      savedStation.branch = branch;
      savedStation.inputfield = s.inputfield;
      this.created.emit(savedStation);
      GC.openSnackBarLong(`${savedStation.name} wurde gespeichert!`);
    });
  }

  deleteMe(): void {
    const d = GC.dialog.open(AreYouSureDialogComponent, {
      data: {
        headline: `möchtest du "${this.data.location.name}" wirklich löschen?`,
        verbYes: 'löschen',
        verbNo: 'abbrechen'
      }
    });
    d.componentInstance.confirm.subscribe(() => {
      GC.http.deleteLocation(this.data.location).subscribe(() => {
        GC.openSnackBarLong(`${this.data.location.name} wurde gelöscht`)
        this.deleted.emit(true);
      });
    });
  }

  clientSelected(c: Client): void {
    this.client = c;
    this.data.location.clientId = c.id;
  }

  addressSelected(loc: Geolocation): void {
    const lnglat = new LngLat(loc.longitude, loc.latitude);
    this.map.setCenter(lnglat);
    this.data.location.setAdress(loc);
    if (this.marker) {
      this.marker.setLngLat(lnglat);
      this.marker.setDraggable(true);
    } else {
      this.marker = setMarker(this.map, this.data.location, true)
    }
  }

  initMap(): void {
    this.map = initMap({
      lnglat: new LngLat(this.data.location.longitude, this.data.location.latitude),
      zoom: 14,
      container: 'mapEdit'
    });
    if (!this.newLocation) {
      this.map.on('load', () => {
        this.marker = setMarker(this.map, this.data.location, true)
      });
    }
    this.map.on('click', (e) => {
      const lngLat = e.lngLat;
      lngLat.lng = lngLat.lng.round(5);
      lngLat.lat = lngLat.lat.round(5);
      GC.http.reverseGeocode(lngLat.lat, lngLat.lng, LocType.client).subscribe((list) => {
        const loc = list[0]
        this.street.searchTerm = loc.street;
        loc.latitude = lngLat.lat;
        loc.longitude = lngLat.lng;
        this.addressSelected(loc);
      });
    });
  }
}
