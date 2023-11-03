import {Component, EventEmitter, Inject, OnInit, ViewChild} from '@angular/core';
import {MAT_DIALOG_DATA} from "@angular/material/dialog";
import {Job} from "../classes/Job";
import {GC} from "../common/GC";
import {Price} from "../classes/Price";
import {MatTable, MatTableDataSource} from "@angular/material/table";
import {AreYouSureDialogComponent} from "./are-you-sure-dialog.component";
import {MatMenuTrigger} from "@angular/material/menu";
import {Shift} from "../classes/Shift";
import {Messenger} from "../classes/Messenger";
import {MatTabGroup} from "@angular/material/tabs";
import {MatInput} from "@angular/material/input";

@Component({
  selector: 'app-edit-messenger-dialog',
  template: `
    <mat-tab-group dynamicHeight [selectedIndex]="data?.selectedIndex || 0" #tabgroup style="color: black" [headerPosition]="">
      <mat-tab [label]="new ? 'neue kurier:in' : messenger.nickname + ' bearbeiten'">
        <div class="flex flex-row">
          <mat-form-field class="mr-4 w-25" style="min-width: 200px">
            <mat-label>vorname</mat-label>
            <input
              type="text"
              #name
              matInput
              (keyup)="nick.value = messenger.nickname = name.value.toLowerCase()"
              [(ngModel)]="messenger.firstName">
          </mat-form-field>
          <mat-form-field class="mr-4 w-25" style="min-width: 200px">
            <mat-label>nachname</mat-label>
            <input
              type="text"
              matInput
              [(ngModel)]="messenger.lastName">
          </mat-form-field>
          <mat-form-field class="w-25" style="min-width: 200px">
            <mat-label>personalnummer</mat-label>
            <input
              type="text"
              matInput
              [(ngModel)]="messenger.messengerId">
          </mat-form-field>
        </div>
        <div class="flex flex-row">
          <mat-form-field class="mr-4 w-25" style="min-width: 200px">
            <mat-label>rufname</mat-label>
            <input
              #nick
              type="text"
              matInput
              (keyup)="nick.value = nick.value.toLowerCase()"
              [(ngModel)]="messenger.nickname">
          </mat-form-field>
          <mat-form-field class="w-25" style="min-width: 200px">
            <mat-label>telefonnummer</mat-label>
            <input
              type="text"
              matInput
              [(ngModel)]="messenger.telNumber">
          </mat-form-field>
        </div>
        <div class="mb-3 flex flex-row">
          <div class="mr-5 ml-3">
            <mat-checkbox [(ngModel)]="messenger.dispatcher">ist disponent:in</mat-checkbox>
          </div>
          <div>
            <mat-checkbox [(ngModel)]="messenger.active">fährt im tagesgeschäft</mat-checkbox>
          </div>
        </div>
      </mat-tab>

      <mat-tab *ngIf="messenger.id" [label]="'schichten (' + shifts.length + ')'">
        <div *ngIf="!new">
          <div class="mb-3 flex flex-row align-items-center justify-content-between">
            <datepicker
              #datepicker
              [(date)]="date"
              [monthly]="true"
              (dateChange)="load()">
            </datepicker>
            <button *ngIf="shifts.length > 0" mat-raised-button class="fex-button"
                    (click)="exportShifts(messenger, date)">
              lohndatei <i class="ml-3 bi bi-download"></i>
            </button>
            <button mat-raised-button class="fex-button" (click)="newShift()" matTooltip="neue schicht hinzufügen">
              schicht hinzufügen <i class="ml-3 bi bi-plus-circle"></i>
            </button>
          </div>

          <div *ngIf="shifts.length > 0" class="mb-4" style="max-height: 50vh; overflow-y: scroll; overflow-x: hidden">
            <table
              #table
              mat-table
              [dataSource]="dataSource"
              style="min-width: 100%;"
              matSort
              matSortActive="date"
              matSortDirection="asc">
              <ng-container matColumnDef="number">
                <th mat-header-cell *matHeaderCellDef class="text-center" style="padding: unset; min-width: 50px">#</th>
                <td mat-cell *matCellDef="let element; let i = index" class="text-center">
                  {{i}}
                </td>
              </ng-container>
              <ng-container matColumnDef="date">
                <th mat-header-cell *matHeaderCellDef class="text-center">datum</th>
                <td mat-cell *matCellDef="let element" style="width: 240px">
                  <div class="flex flex-row justify-content-evenly align-items-end w-100" style="width: fit-content">
                    <a *ngIf="!element.edit" [routerLink]="[routes.tourplan, {date: element.start.yyyymmdd()}]"
                       matDialogClose>
                      <p class="text-center noMargin">
                        {{element.start.dateStampShort()}}, {{shiftLiterals(element.type)}}
                      </p>
                    </a>


                    <mat-form-field *ngIf="element.edit" style="width: 100px" class="relative-top8px">
                      <mat-label>datum</mat-label>
                      <div class="flex flex-row">
                        <input matInput [matDatepicker]="picker" [(ngModel)]="element.start"
                               (keydown)="$event.key === 'Enter' ? updateShift(element) : ''">
                        <i class="bi bi-calendar3" (click)="picker.open()"></i>
                      </div>
                      <mat-datepicker #picker></mat-datepicker>
                    </mat-form-field>

                    <mat-form-field class="ml-3 relative-top8px" *ngIf="element.edit"
                                    style="width: 100px">
                      <mat-label>schichttyp</mat-label>
                      <mat-select
                        tabindex="-1"
                        #type
                        [(ngModel)]="element.type"
                        (selectionChange)="element.startTimeGuess(); element.endTimeGuess()"
                        (keydown)="$event.key === 'Enter' ? updateShift(element) : ''">
                        <mat-option
                          *ngFor="let shiftType of messengerShiftTypes; let i = index"
                          [value]="i">
                          {{shiftType}}
                        </mat-option>
                      </mat-select>
                    </mat-form-field>

                  </div>
                </td>
              </ng-container>
              <ng-container matColumnDef="startend">
                <th mat-header-cell *matHeaderCellDef class="text-center" style="min-width: 80px">arbeitszeit</th>
                <td mat-cell *matCellDef="let element" style="width: 260px; padding: 0 20px !important;">
                  <div *ngIf="element.edit" class="flex flex-row align-items-center justify-content-between">
                    <timepicker
                      [label]="'start'"
                      [(time)]="element.start"
                      (keydown)="$event.key === 'Enter' ? updateShift(element) : ''"
                      class="relative-top8px"></timepicker>
                    <span class="mx-2">-</span>
                    <timepicker
                      [label]="'ende'"
                      [(time)]="element.end" [compareDate]="element.start"
                      (keydown)="$event.key === 'Enter' ? updateShift(element) : ''"
                      class="relative-top8px"></timepicker>
                  </div>
                  <div *ngIf="!element.edit" class="flex flex-row align-items-center justify-content-between">
                    <span>{{element.start.timestamp()}}</span>
                    <span class="mx-2">-</span>
                    <span *ngIf="element.end">{{element.end?.timestamp()}}</span>
                    <a *ngIf="!element.end" class="fex-warn" (click)="element.edit = true">endzeit eintragen</a>
                  </div>

                </td>
              </ng-container>
              <ng-container matColumnDef="money">
                <th mat-header-cell *matHeaderCellDef class="text-center"></th>
                <td mat-cell *matCellDef="let element">
                  <p class="text-center noMargin" *ngIf="element.shiftType <= 4 && !element.edit">
                    {{element.money.netto}}
                  </p>
                  <div *ngIf="element.edit" class="flex justify-content-around">
                    <button mat-button class="align-items-center"
                            (click)="updateShift(element)">
                      <i class="bi bi-check"></i>
                    </button>
                  </div>
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"
                  (contextmenu)="onRightClick($event, row)"></tr>
            </table>
          </div>

          <div *ngIf="shifts.length === 0" class="flex justify-content-center align-items-center" style="height: 20vh">
            <h3>- keine schichten im {{datepicker.months[date.getMonth()]}}   -</h3>
          </div>

          <p *ngIf="messenger.active && shifts.length > 0">umsatz diesen monat: {{salesNettoThisMonth._netto}}
            netto
            / {{salesBruttoThisMonth._brutto}} brutto<br>
            insgesamt {{hours}} stunden
          </p>
        </div>
      </mat-tab>
    </mat-tab-group>

    <div class="flex flex-row justify-content-between align-items-center" style="min-width: 650px">
      <button mat-raised-button
              class="flex fex-button"
              (click)="updateMessenger()"
              matDialogClose>
        {{messenger.id ? 'speichern' : 'hinzufügen'}}
      </button>
      <span class="fex-warn" *ngIf="shiftsWithoutEnd > 0">
        für {{shiftsWithoutEnd === 1 ? 'eine' : shiftsWithoutEnd}}
        schicht{{shiftsWithoutEnd > 1 ? 'en' : ''}} wurde noch keine endzeit eingetragen
      </span>
      <button *ngIf="isDezwo" mat-raised-button
              class="flex fex-button"
              (click)="deleteMessenger()"
              matDialogClose>
        löschen
      </button>
    </div>

    <div class="container">
      <div style="visibility: hidden; position: fixed"
           [style.left.px]="menuTopLeftPosition.x"
           [style.top.px]="menuTopLeftPosition.y"
           [matMenuTriggerFor]="rightMenu"></div>

      <mat-menu #rightMenu="matMenu">
        <ng-template matMenuContent let-item="item">
          <right-click-menu
            [shift]="item">
          </right-click-menu>
        </ng-template>
      </mat-menu>
    </div>
  `,
  styles: []
})
export class MessengerDialogComponent implements OnInit {

  messenger: Messenger = new Messenger();
  jobsThisMonth: Job[] = [];
  hours = 0;
  salesNettoThisMonth = new Price();
  salesBruttoThisMonth = new Price();
  shifts: Shift[];
  shiftsWithoutEnd = 0;

  new = true;
  saved = new EventEmitter<boolean>();
  date = new Date();
  dataSource: MatTableDataSource<Shift>;
  displayedColumns: string[] = ['number', 'date', 'startend', 'money'];
  loaded = 0;
  menuTopLeftPosition = {x: 0, y: 0};

  get isDezwo() {return GC._isDezwo}
  get messengerShiftTypes() {return GC.dispatcherShiftLiterals.concat(GC.messengerShiftLiterals)};
  get routes() {return GC.routes};
  shiftLiterals = (index: number) => {return this.messengerShiftTypes[index];}

  @ViewChild('table') table: MatTable<Job>;
  @ViewChild('tabgroup') tabgroup: MatTabGroup;
  @ViewChild(MatMenuTrigger) matMenuTrigger: MatMenuTrigger;
  @ViewChild('name') nameInput: MatInput;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: {
      messenger: Messenger;
      shifts: Shift[];
      selectedIndex: number;
      createShiftFor: Date;
    },
  ) {
    if (data?.messenger) {
      this.messenger = data.messenger.copy();
      this.new = false;
    }
  }

  ngOnInit(): void {
    if (!this.new) {
      GC.http.jobsThisMonthForMessenger(this.messenger).subscribe(list => {
        this.jobsThisMonth = list;
        list.forEach(j => {
          j.billingTour ? this.salesNettoThisMonth.add(j.price) : this.salesBruttoThisMonth.add(j.price);
        });
        this.loaded++;
        this.init();
        if (this.data.createShiftFor) {
          setTimeout(() => {this.newShift(this.data.createShiftFor)}, 100)
        }
      });
    }
  }

  init(): void {
    if (!this.shifts) {
      this.shifts = this.data.shifts;
    }
    this.hours = 0;
    this.shiftsWithoutEnd = 0;
    this.shifts.forEach(shift => {
      if (shift.end) {
        this.hours += shift.start.hoursDifference(shift.end)
      } else {
        this.shiftsWithoutEnd++;
      }
      shift.money = this.jobsThisMonth.filter(j => j.date.daysDifference(shift.start) === 0).reduce((p, a) => p._add(a.price), new Price())
    })
    this.dataSource = new MatTableDataSource<Shift>(this.shifts);
    this.loaded++;
  }

  load(): void {
    GC.http.getShiftsForMessengerAndMonth(this.messenger, this.date).subscribe(shifts => {
      console.log(shifts)
      this.shifts = shifts;
      this.init()
    })
  }

  updateMessenger(): void {
    if (!this.new) {
      this.shifts.filter(s => s.edit === true).forEach(s => {
        this.updateShift(s);
      });
      GC.http.updateMessenger(this.messenger).subscribe(m => {
        GC.openSnackBarLong(`${m.nickname} wurde aktualisiert.`);
        this.saved.emit(true);
      });
    } else {
      GC.http.createMessenger(this.messenger).subscribe(m => {
        GC.openSnackBarLong(`${m.nickname} wurde hinzugefügt.`);
        this.saved.emit(true);
      });
    }
  }

  deleteMessenger(): void {
    GC.http.deleteMessenger(this.messenger).subscribe(() => {
      GC.openSnackBarLong('kurier:in gelöscht');
    })
  }

  updateShift(shift: Shift): void {
    if (shift.start.hoursDifference(shift.end) < 0) {
      GC.openSnackBarLong('die endzeit der schicht muss vor der startzeit liegen!');
      return;
    }
    shift.edit = false;
    shift.update('schicht wurde aktualisiert.', true).subscribe(() => {
      GC.loadShiftsToday(GC.http);
      this.hours = 0;
      this.shiftsWithoutEnd = 0;
      this.shifts.forEach(shift => {
        if (shift.end) {
          this.hours += shift.start.hoursDifference(shift.end)
        } else {
          this.shiftsWithoutEnd++;
        }
        shift.money = this.jobsThisMonth.filter(j => j.date.daysDifference(shift.start) === 0).reduce((p, a) => p._add(a.price), new Price())
      })
    });
  }

  newShift(date?: Date): void {
    const s = new Shift({messenger: this.messenger, start: date});
    s.startTimeGuess(true);
    s.end = s.endTimeGuess();
    s.edit = true;
    this.dataSource.data.push(s);
    this.table.renderRows();
  }

  onRightClick(event: MouseEvent, item: any) {
    event.preventDefault();
    this.menuTopLeftPosition.x = event.clientX;
    this.menuTopLeftPosition.y = event.clientY;
    this.matMenuTrigger.menuData = {item: item}
    this.matMenuTrigger.openMenu();
  }

  exportShifts(messenger: Messenger, date: Date): void {
    if (this.shiftsWithoutEnd > 0) {
      GC.dialog.open(AreYouSureDialogComponent, {
        data: {
          headline: `bitte erst für ${this.shiftsWithoutEnd} schichten die endzeiten eintragen`,
          verbNo: 'schließen'
        }
      })
    } else {
      GC.http.exportShfitsForMessengerAndMonth(messenger, date).subscribe(xml => {
        const blob = new Blob([xml], {type: 'application/xml'});
        const link = document.createElement('a');
        link.download = `Stundenerfassung_${date.getFullYear()}_${GC.monthLiteralsShort[date.getMonth()]}_${messenger.messengerId}_${messenger.lastName}_${messenger.firstName}.xml`;
        link.href = window.URL.createObjectURL(blob);
        link.click();
      });
    }
  }
}
