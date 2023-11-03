import {Component, Inject, ViewChild} from '@angular/core';
import {SpecialPrice} from "../classes/SpecialPrice";
import {MAT_DIALOG_DATA} from "@angular/material/dialog";
import {SearchinputComponent} from "../views/newtour/inputfield/searchinput/searchinput.component";

@Component({
  selector: 'app-special-price-dialog',
  template: `
    <h1 mat-dialog-title>{{new ? 'neuen sonderpreis erstellen' : 'sonderpreis bearbeiten'}}</h1>

    <div #newExtraPrice class="flex flex-column">
      <mat-form-field style="width: 250px">
        <mat-label>name</mat-label>
        <input matInput type="text" [(ngModel)]="specialPrice.name">
      </mat-form-field>

      <div class="flex flex-column">
        <mat-form-field style="width: 250px">
          <mat-label>art des sonderpreises</mat-label>
          <mat-select #mode [(ngModel)]="specialPrice.type">
            <mat-option [value]="0">keine auswahl</mat-option>
            <mat-option [value]="2">gruppentarif</mat-option>
            <mat-option [value]="3">grundpreis + inkludierte stops</mat-option>
          </mat-select>
        </mat-form-field>

        <div *ngIf="mode.value === 2">
          <app-price-input
            [width]="45"
            [(price)]="specialPrice.group"
            [type]="0">
          </app-price-input>
          <span class="ml-2">€ pro stop</span>
        </div>

        <div *ngIf="mode.value === 3">
          <app-price-input
            class="inline"
            [width]="45"
            [(price)]="specialPrice.base"
            [type]="0">
          </app-price-input>
          <span class="mx-3 whitespace-nowrap inline">€ für</span>
          <mat-form-field class="mr-3 inline" style="width: 45px">
            <input #number [(ngModel)]="specialPrice.quantityIncluded" matInput type="number">
          </mat-form-field>
          <span class="mr-3 whitespace-nowrap inline">stop{{number.valueAsNumber > 1 ? 's' : ''}}</span>
          <br>
          <app-price-input
            [width]="45"
            [(price)]="specialPrice.extra"
            [type]="0">
          </app-price-input>
          <span class="mx-3 whitespace-nowrap inline">für jeden weiteren</span>
        </div>
        <mat-checkbox [(ngModel)]="specialPrice.grossPrice" class="mb-4">
          preise sind barpreise
        </mat-checkbox>
      </div>

      <hr>
      <p>kund:innen</p>

      <mat-chip-list *ngIf="specialPrice.clients.length" selectable multiple class="mb-4">
        <mat-chip
          *ngFor="let client of specialPrice.clients"
          (removed)="specialPrice.clients.findAndRemove(client)">
          {{client.name}}
          <button matChipRemove>
            <mat-icon>cancel</mat-icon>
          </button>
        </mat-chip>
      </mat-chip-list>

      <searchinput
        #searchbar
        [width]="'250px'"
        [placeholder]="'name, kund:innennummer'"
        [label]="'kund:innen hinzufügen'"
        [searchClients]="true"
        (clientClientSelected)="specialPrice.clients.push($event); searchbar.reset()">
      </searchinput>


      <hr>
      <p>zonen</p>

      <mat-chip-list *ngIf="specialPrice.zones.length" selectable multiple class="mb-4">
        <mat-chip
          *ngFor="let zone of specialPrice.zones"
          (removed)="specialPrice.zones.findAndRemove(zone)">
          {{zone.name}}
          <button matChipRemove>
            <mat-icon>cancel</mat-icon>
          </button>
        </mat-chip>
      </mat-chip-list>

      <searchinput
        #zoneSearchbar
        [width]="'250px'"
        [label]="'zone hinzufügen'"
        [searchPostCodeZones]="true"
        [searchZones]="true"
        (zoneSelected)="specialPrice.zones.push($event); zoneSearchbar.reset()">
      </searchinput>
    </div>
    <button mat-raised-button class="fex-button" mat-dialog-close (click)="specialPrice.save()">
      sonderpreis speichern
    </button>
  `,
  styles: [
  ]
})
export class SpecialPriceDialogComponent {

  specialPrice = new SpecialPrice();
  new = true;
  @ViewChild('searchbar') searchbar: SearchinputComponent;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: {
      specialPrice: SpecialPrice
    }
  ) {
    if (data.specialPrice) {
      this.new = false;
      this.specialPrice = new SpecialPrice(data.specialPrice);
      console.log(data.specialPrice.id)
    }
  }
}
