import {Component, Inject, ViewChild} from '@angular/core';
import {removeItem, setItem} from "../../UTIL";
import {GC, ShiftType} from "../../common/GC";
import {MAT_DIALOG_DATA} from "@angular/material/dialog";
import {TimepickerComponent} from "../../views/timepicker.component";
import {MatSelect} from "@angular/material/select";
import {Shift} from "../../classes/Shift";

@Component({
  selector: 'change-user-dialog',
  template: `
    <h1 *ngIf="data?.morning" mat-dialog-title style="max-width: 400px;">guten morgen! wer ist heute am start?</h1>
    <h1 *ngIf="!data?.morning" mat-dialog-title style="max-width: 400px;">wer ist in der schicht?</h1>
    <div id="change-user-content" class="mt-2 justify-content-around" style="min-width: 400px">
      <div class="flex flex-column justify-content-around">
        <new-shift-input
          [disabled]="!!dispatcher"
          [dispatcher]="true"
          (dispatcherShiftCreated)="dispatcherShift = $event">
        </new-shift-input>

        <new-shift-input (messengerShiftCreated)="messengerShifts.push($event)" #messengerInput [ignoredMessenger]="messengerToday">
        </new-shift-input>
        <div class="overflow-y-scroll" style="max-height: 60vh">
          <div *ngIf="dispatcherShift !== null || messengerShifts.length"
               class="mb-3 border-top border-bottom shiftBlock" >
            <h3 class="my-3">ausgewählte kurier:innen zum einchecken</h3>
            <shift
              *ngFor="let shift of (dispatcherShift ? [dispatcherShift] : []).concat(messengerShifts)"
              class="flex flex-row pt-3 align-items-center justify-content-between w-100 border-bottom"
              [shift]="shift"
              (deleteFromCheckIn)="deleteFromCheckin($event)">
            </shift>

            <button mat-raised-button class="my-4 fex-button"
                    (click)="checkIn()" matDialogClose>
              jetzt einchecken
            </button>
          </div>

          <div *ngIf="openShiftsToday.length" class="mb-3 border-top border-bottom shiftBlock">
            <h3 class="my-3">eingecheckte kurier:innen</h3>
            <div style="min-height: 100px">
              <shift
                *ngFor="let shift of openShiftsToday"
                class="flex flex-row pt-3 align-items-center justify-content-between w-100 border-bottom"
                [shift]="shift">
              </shift>
            </div>
          </div>

          <div *ngIf="closedShiftsToday.length" class="border-top border-bottom shiftBlock">
            <h3 class="my-3">beendete schichten</h3>
            <div style="min-height: 100px">
              <shift
                *ngFor="let shift of closedShiftsToday"
                class="flex flex-row pt-3 align-items-center justify-content-between w-100 border-bottom"
                [shift]="shift">
              </shift>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @import "../../../const.scss";

    * {
      display: flex;
      flex-direction: column;
    }

    #change-user-content {
      min-width: 300px;
    }

    h3 {
      color: $fex-dark;
      font-size: 18px;
    }

    .shiftBlock {
      background-color: #efefef;
      padding: 0 20px;
    }

    .svg {
      background-color: $fex-light !important;
    }
  `]
})
export class CheckInDialog {

  dispatcherShift: Shift = null;
  messengerShifts: Shift[] = [];
  nextCheckout: Date;

  get messengerToday() {return this.openShiftsToday.concat(this.messengerShifts).map(s => s.messenger)}
  get openShiftsToday() {return GC.shiftsToday.filter(s => !s.end)};
  get closedShiftsToday() {return GC.shiftsToday.filter(s => s.end)};
  get dispatcher() {return GC.dispatcher()}

  @ViewChild('type') shiftType: MatSelect;
  @ViewChild('timepicker') timepicker: TimepickerComponent;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: {
      morning: boolean;
    },
  ) {
    this.nextCheckout = new Date().nextQuarter();
  }

  ngOnInit(): void {
    GC.loadShiftsToday(GC.http);
  }

  checkIn(): void {
    if (this.dispatcherShift)
    GC.setMessengerInShift(this.messengerShifts.concat(this.dispatcherShift ? this.dispatcherShift : [] )).subscribe(() => {
      GC.openSnackBarLong("kurier:innen eingecheckt!");
      setItem<Date>('date', new Date());
      GC.loadShiftsToday(GC.http);
      GC.messengersChanged.emit(true);
    })
  }

  deleteFromCheckin(shift: Shift) {
    if ([ShiftType.dispoEarly, ShiftType.dispoLate].includes(shift.type)) {
      this.dispatcherShift = null;
    } else {
      this.messengerShifts.splice(this.messengerShifts.indexOf(shift), 1);
      removeItem(shift.messenger.id);
    }
  }
}
