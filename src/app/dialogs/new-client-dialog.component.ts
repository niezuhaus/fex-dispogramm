import {Component, EventEmitter, Inject} from '@angular/core';
import {GC} from "../common/GC";
import {MAT_DIALOG_DATA} from "@angular/material/dialog";
import {Geolocation} from "../classes/Geolocation";
import {Client} from "../classes/Client";

@Component({
  selector: 'app-new-client-dialog',
  template: `
    <div style="min-width: 400px">
      <h1 mat-dialog-title>neue kund:in erstellen</h1>
      <div class="m-auto" style="width: fit-content;">
        <mat-button-toggle-group [value]="client.c.billClient" style="margin-bottom: 10px" class="flex flex-row">
          <mat-button-toggle [value]="true" (click)="billClientChange(true)">rechnungskund:in</mat-button-toggle>
          <mat-button-toggle [value]="false" (click)="billClientChange(false)">barkund:in</mat-button-toggle>
        </mat-button-toggle-group>
      </div>
      <div mat-dialog-content>
        <mat-form-field>
          <mat-label>name</mat-label>
          <input
            #name
            type="text"
            matInput
            [(ngModel)]="client.c.name"
            (keyup)="client.l.name = name.value"
            autofocus>
        </mat-form-field>
        <mat-form-field>
          <mat-label>rufname</mat-label>
          <input
            #nick
            type="text"
            matInput
            [value]="client.c.name"
            [(ngModel)]="client.l.name"
            (focus)="nick.select()"
            autofocus>
        </mat-form-field>
        <searchinput
          [label]="'straße'"
          [searchOSM]="true"
          (locationSelected)="addressSelected($event)"
          (keyup)="client.c.street = search.searchTerm"
          [(str)]="client.c.street"
          class="w-100"
          (resetted)="client.c.zipCode = ''; client.c.city = ''"
          #search>
        </searchinput>
        <mat-form-field>
          <mat-label>postleitzahl</mat-label>
          <input
            type="text"
            matInput
            [(ngModel)]="client.c.zipCode">
        </mat-form-field>
        <mat-form-field>
          <mat-label>stadt</mat-label>
          <input
            type="text"
            matInput
            [(ngModel)]="client.c.city">
        </mat-form-field>
        <mat-form-field>
          <mat-label>fred kund:innennummer</mat-label>
          <input
            type="text"
            matInput
            [(ngModel)]="client.c.clientId">
        </mat-form-field>
        <button mat-raised-button class="ml-3 fex-button" (click)="this.save()" matDialogClose="true">
          speichern
        </button>
      </div>
    </div>
  `,
  styles: [`
    * {
      display: flex;
      flex-direction: column;
    }
  `]
})
export class NewClientDialogComponent {
  saved = new EventEmitter<{ c: Client; l: Geolocation }>();
  client: { c: Client; l: Geolocation } = {c: new Client(), l: new Geolocation()};
  nextClientIds: { netto: string, brutto: string };

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: {
      location: Geolocation;
    }
  ) {
    this.client.c.billClient = true;
    if (data?.location) {
      this.client.l = data.location;
      this.client.c.street = data.location.street;
      this.client.c.zipCode = data.location.zipCode;
      this.client.c.city = data.location.city;
    }
    this.nextClientIds = GC.nextClientIds();
    this.client.c.clientId = this.nextClientIds.netto;
  }

  save(): void {
    GC.http.createClient(this.client.c).subscribe(client => {
      this.client.c = client;
      if (Math.abs(this.client.l.latitude) > 0) {
        this.client.l.clientId = client.id;
        if (!this.client.l.id) {
          GC.http.createLocation(this.client.l).subscribe(l => {
            GC.openSnackBarLong(`kund:in und standort ${client.name} wurden gespeichert!`);
            this.client.l = l;
            this.saved.emit(this.client);
          });
        } else {
          console.log(this.client.l)
          GC.http.updateLocation(this.client.l).subscribe(l => {
            GC.openSnackBarLong(`kund:in und standort ${client.name} wurden gespeichert!`);
            this.client.l = l;
            this.saved.emit(this.client);
          })
        }
      } else {
        GC.openSnackBarLong(`kund:in ${client.name} wurde gespeichert!`);
        this.saved.emit(this.client);
      }
    });
  }

  billClientChange(isBillClient: boolean): void {
    this.client.c.billClient = isBillClient;
    this.client.c.clientId = isBillClient ? this.nextClientIds.netto : this.nextClientIds.brutto;
  }

  addressSelected(loc: Geolocation): void {
    loc.name = this.client.l.name;
    this.client.l = loc;
    this.client.c.street = loc.street;
    this.client.c.zipCode = loc.zipCode;
    this.client.c.city = loc.city;
  }
}
