import {Component, Inject, OnInit, ViewChild} from '@angular/core';
import {Job} from "../classes/Job";
import {MatTableDataSource} from "@angular/material/table";
import {GC} from "../common/GC";
import {MatSort} from "@angular/material/sort";
import {Price} from "../classes/Price";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {MatMenuTrigger} from "@angular/material/menu";
import {Shift} from "../classes/Shift";
import {AreYouSureDialogComponent} from "./are-you-sure-dialog.component";
import {FormControl, Validators} from "@angular/forms";

@Component({
  selector: 'app-checkout-dialog',
  template: `
    <div style="min-width: 600px">
      <div class="flex flex-row justify-content-between">
        <div>
          <h1 mat-dialog-title>
            {{data.shift.messenger.nickname}}s schicht vom {{data.shift.start.dateStampLong()}}
          </h1>
          <p *ngIf="!finished">bitte schließe die touren ab, für die du die belege vorliegen hast</p>
        </div>
        <div class="flex justify-content-around ml-4" style="height: fit-content">
          <div id="times" class="flex px-3 py-3 flex-column align-items-center">
            <div class="flex flex-row justify-around w-100 align-items-center">
              <timepicker [label]="'check-in'" [(time)]="data.shift.start" class="relative-top8px mr-5"
                          [disabled]="finished"></timepicker>
              <timepicker [label]="'check-out'" [(time)]="end" class="relative-top8px" [disabled]="finished"></timepicker>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div style="max-height: 50vh; overflow-y: scroll; overflow-x: clip">
      <p *ngIf="data.jobs.length === 0" class="text-center mt-5"><i>- keine touren vorhanden -</i></p>
      <table
        *ngIf="data.jobs.length > 0"
        id="jobs"
        [style.visibility]="(data.jobs && data.jobs.length > 0) ? 'unset' : 'hidden'"
        mat-table
        [dataSource]="dataSource"
        class="ml-3"
        matSort
        style="max-width: 1400px; min-width: 800px"
        matSortActive="date"
        matSortDirection="desc">
        <ng-container matColumnDef="date">
          <th mat-header-cell *matHeaderCellDef mat-sort-header style="width: 80px"> zeit</th>
          <td mat-cell *matCellDef="let element" class="text-center">
            <span *ngIf="!element.edit">
            {{element.date.timestamp()}}
            </span>
            <timepicker [label]="'zeit'" *ngIf="element.edit" [(time)]="element.date"
                        (keydown)="$event.key === 'Enter' ? element.update('auftrag wurde gespeichert.') : ''"></timepicker>
          </td>
        </ng-container>
        <ng-container matColumnDef="description">
          <th mat-header-cell *matHeaderCellDef mat-sort-header> beschreibung</th>
          <td mat-cell *matCellDef="let element" style="text-align: left" class="mx-2">
            <description [job]="element" class="p-0" [headline]="true"
                         [hideHighlights]="true"></description>
          </td>
        </ng-container>
        <ng-container matColumnDef="creator">
          <th mat-header-cell *matHeaderCellDef style="width: 80px;" class="mx-2"> angelegt von</th>
          <td mat-cell *matCellDef="let element">
            <span *ngIf="element.creator">{{element.creator.nickname}}</span>
          </td>
        </ng-container>
        <ng-container matColumnDef="price">
          <th mat-header-cell *matHeaderCellDef mat-sort-header class="mx-2" style="width: 160px"> preis</th>
          <td mat-cell *matCellDef="let element" style="color: gray;" class="text-center">
            <div *ngIf="!element.edit">
                <span
                  [style.color]="!element.showBrutto ? 'black' : '#BBB'">{{element.price?._netto || element.price._netto}}</span>
              / <span
              [style.color]="element.showBrutto ? 'black' : '#BBB'">{{element.price?._brutto || element.price._brutto}}</span><br>
              {{element._waitingMinutes > 0 ? '(inkl. ' + element.waitingPrice?.netto + ' für ' + element._waitingMinutes + 'min)' : ''}}
            </div>

            <div *ngIf="element.edit" class="flex flex-row align-items-center">
              <mat-form-field>
                <mat-label>netto</mat-label>
                <input
                  #netto
                  matInput
                  (keyup)="changePrice(element.price, netto.value.valueOf(), false)"
                  (keydown)="$event.key === 'Enter' ? element.update('auftrag wurde gespeichert.') : ''"
                  (click)="netto.select()"
                  [value]="element.price?._netto.toString()">
              </mat-form-field>
              <span class="mx-2">/</span>
              <mat-form-field>
                <mat-label>brutto</mat-label>
                <input
                  #brutto
                  matInput
                  (keyup)="changePrice(element.price, brutto.value.valueOf(), true)"
                  (keydown)="$event.key === 'Enter' ? element.update('auftrag wurde gespeichert.') : ''"
                  (click)="brutto.select()"
                  [value]="element.price?._brutto.toString()">
              </mat-form-field>
            </div>
          </td>
        </ng-container>
        <ng-container matColumnDef="waitingMinutes">
          <th mat-header-cell *matHeaderCellDef style="width: 100px;" class="mx-2 text-center">wartezeit</th>
          <td mat-cell *matCellDef="let element" style="color: gray;">
            <div>
              <mat-form-field>
                <mat-label>minuten</mat-label>
                <input type="number" #minutes (click)="minutes.select()"
                       matInput name="waitingMinutes"
                       [(ngModel)]="element._waitingMinutes"
                       (change)="tourplan.calcSales()">
              </mat-form-field>
            </div>
          </td>
        </ng-container>
        <ng-container matColumnDef="finish">
          <th mat-header-cell *matHeaderCellDef style="width: 200px;"></th>
          <td mat-cell *matCellDef="let element">
            <div class="flex flex-row justify-content-around">
              <button *ngIf="!element.finished" mat-raised-button class="fex-button"
                      (click)="element._finished = true; addToSum(element)">
                tour abschließen
              </button>
              <button *ngIf="element.finished" mat-raised-button class="fex-button-abort"
                      (click)="element._finished = false; subFromSum(element)"
                      matTooltip="öffnen"><i class="bi bi-check"></i> tour abgeschlossen
              </button>
            </div>
          </td>
        </ng-container>
        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns;" (contextmenu)="onRightClick($event, row)"></tr>
      </table>
    </div>

    <div id="sum" class="mt-4 fex-dark" style="width: calc(100% + 48px); position: relative; left: -24px">
      <h3 style="margin: unset">
        rechnung: {{finishingBillSum._netto}}, bareinnahmen: {{finishingCashSum._brutto}}
      </h3>
      <p style="margin: unset">die bareinnahmen sind nicht im rechnungsbetrag enthalten.</p>
    </div>

    <div class="mt-4 flex flex-row justify-content-between align-items-end">
      <button *ngIf="!finished" mat-raised-button class="fex-button" (click)="checkout()">
        {{data.shift.messenger.nickname}} für {{end?.timestamp() || data.shift.end.timestamp()}} auschecken
      </button>
      <button *ngIf="finished" mat-raised-button class="fex-button" disabled>
        {{data.shift.messenger.nickname}} wurde ausgecheckt
      </button>

      <button mat-raised-button class="fex-button fex-button-abort" matDialogClose>
        abbrechen
      </button>
    </div>


    <div class="container">
      <div style="visibility: hidden; position: fixed"
           [style.left.px]="menuTopLeftPosition.x"
           [style.top.px]="menuTopLeftPosition.y"
           [matMenuTriggerFor]="rightMenu"></div>
      <mat-menu #rightMenu="matMenu">
        <ng-template matMenuContent let-item="item">
          <right-click-menu [job]="item">
          </right-click-menu>
        </ng-template>
      </mat-menu>
    </div>
  `,
  styles: [
    `
      @import "../../const.scss";

      #sum {
        width: calc(100% + 48px);
        position: relative;
        left: -24px;
        color: white;
        display: flex;
        flex-direction: column;
        text-align: center;
      }

      #times {
        border: $fex-dark 4px solid;
        border-radius: 14px;
      }
    `
  ]
})
export class CheckoutDialogComponent implements OnInit {

  dataSource: MatTableDataSource<Job>;
  displayedColumns: string[] = ['date', 'description', 'price', 'waitingMinutes', 'finish'];
  finishingBillSum = new Price();
  finishingCashSum = new Price();
  end: Date;
  finished = false;
  menuTopLeftPosition = {x: 0, y: 0};
  dialogRef: MatDialogRef<CheckoutDialogComponent>;

  ctrlEndDate = new FormControl('', [Validators.required]);

  get tourplan() {
    return GC.tourplan;
  }

  expenses = 0;

  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatMenuTrigger) matMenuTrigger: MatMenuTrigger;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: {
      shift: Shift,
      end: Date,
      jobs: Job[],
    }
  ) {
    if (data.shift.end) {
      console.log(data.shift)
      this.finished = true;
    }
    this.end = data.end ? data.end : data.shift.endTimeGuess();
    this.expenses = data.jobs.map(j => j.expenseSum).sum();
  }

  ngOnInit(): void {
    this.dataSource = new MatTableDataSource(this.data.jobs);
    this.dataSource.sort = this.sort;
    this.dataSource.sortingDataAccessor = (item, property): string | number => {
      switch (property) {
        case 'date':
          return new Date(item.date).getTime();
        case 'description':
          return item.center.name;
        case 'price':
          return item.price._netto;
        default:
          return property;
      }
    }
    this.data.jobs.filter(j => j.finished).forEach(j => {
      j.billingTour ? this.finishingBillSum.add(j.price) : this.finishingCashSum.add(j.price);
    })
  }

  addToSum(job: Job): void {
    job.billingTour ? this.finishingBillSum.add(job.price) : this.finishingCashSum.add(job.price);
  }

  subFromSum(job: Job): void {
    job.billingTour ? this.finishingBillSum.sub(job.price) : this.finishingCashSum.sub(job.price);
  }

  checkout() {
    const checkout = () => {
      const shift = this.data.shift;
      shift.end = this.end;
      shift.update(`${shift.messenger.nickname} wurde für ${shift.end.timestamp()} ausgecheckt!`, true).subscribe(() => {
        GC.loadShiftsToday(GC.http);
        this.dialogRef.close();
      })
    }

    if (this.data.jobs.map(j => j.finished).includes(false)) {
      const dialog = GC.dialog.open(AreYouSureDialogComponent, {
        data: {
          headline: `es wurden nicht alle touren als abgeschlossen markiert. möchtest du ${this.data.shift.messenger.nickname} dennoch auschecken?`,
          verbYes: 'ja',
          verbNo: 'hups, nee',
          highlightNo: true
        }
      });
      dialog.componentInstance.confirm.subscribe(() => {
        checkout();
      })
    } else {
      checkout();
    }
  }

  onRightClick(event: MouseEvent, item: Job) {
    event.preventDefault();
    this.menuTopLeftPosition.x = event.clientX;
    this.menuTopLeftPosition.y = event.clientY;
    this.matMenuTrigger.menuData = {item: item}
    this.matMenuTrigger.openMenu();
  }


  changePrice(price: Price, value: string, isBrutto: boolean): void {
    value = value.replace(',', '.');
    const newPrice = parseFloat(value);
    if (!(newPrice >= 0)) {
      return;
    }
    if (isBrutto) {
      price._brutto = newPrice;
    } else {
      price._netto = newPrice;
    }
  }
}
