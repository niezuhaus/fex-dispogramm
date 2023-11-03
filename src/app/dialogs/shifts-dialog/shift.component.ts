import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {Shift} from "../../classes/Shift";
import {GC, ShiftType} from "../../common/GC";
import {CheckoutDialogComponent} from "../checkout-dialog.component";
import {Messenger} from "../../classes/Messenger";
import {removeItem} from "../../UTIL";
import {debounceTime, distinctUntilChanged} from "rxjs/operators";

@Component({
  selector: 'shift',
  template: `
    <div class="mr-3 flex-row" style="width: 150px">
      <button
        mat-button class="mr-2"
        (click)="new ? deleteFromCheckIn.emit(shift) : deleteShift(shift)"
        [class.invisible]="!new && (shift.messenger.jobs(shift.start)?.length || ended || !isDezwo)"
        tabindex="-1">
        <i class="bi bi-trash bi-x-transparent"></i>
      </button>
      <span style="margin: auto">
        {{shift.messenger.nickname}}
      </span>
    </div>
    <mat-form-field
      [class.invisible]="shift.type < 2 || ended"
      style="width: 50px"
      class="mr-3">
      <mat-label>#</mat-label>
      <input
        matInput
        type="number"
        placeholder="1, 2.."
        #numberBottom
        [value]="shift.messenger.fexNumber?.toString()"
        (click)="numberBottom.select()"
        (keyup)="$event.code !== 'Tab' ? numberChanged.emit({messenger: shift.messenger, number: numberBottom.valueAsNumber}) : ''"
        (change)="numberChanged.emit({messenger: shift.messenger, number: numberBottom.valueAsNumber})">
    </mat-form-field>
    <timepicker
      class="mr-3"
      [label]="'check-in'"
      [(time)]="shift.start"
      (timeChangeDebounce)="!new ? shift.update('startzeit geändert', true) : ''"
      [disabled]="ended"></timepicker>
    <timepicker
      class="mr-4"
      [class.invisible]="new"
      #checkoutPicker
      [label]="'check-out'"
      [time]="endTime(shift.type)"
      (timeChange)="shift.tmpEnd = $event"
      [disabled]="ended"></timepicker>
    <mat-form-field class="mr-3" style="width: 120px">
      <mat-label>schichttyp</mat-label>
      <mat-select
        tabindex="-1"
        [(ngModel)]="shift.type"
        [disabled]="ended"
        (ngModelChange)="!new ? asyncUpdate('schichttyp geändert') : shift.start = startTime(shift.type)">
        <mat-option
          style="flex-direction: unset"
          *ngFor="let shiftType of shift.type <= 1 ? dispatcherShiftTypes : messengerShiftTypes; let i = index"
          [value]="shift.type <= 1 ? i : i + 2">
          {{shiftType}}
        </mat-option>
      </mat-select>
    </mat-form-field>
    <button
      mat-raised-button
      class="fex-button"
      (click)="checkout(shift, shift.tmpEnd || checkoutPicker.time)"
      [matTooltip]="shift.messenger.nickname + ' auschecken'"
      [class.invisible]="new"
      [disabled]="ended"
      tabindex="-1">
      <div *ngIf="!ended" class="flex flex-row align-items-center">
        auschecken <i class="ml-2 bi bi-arrow-right-square"></i>
      </div>
      <div *ngIf="ended">
        ausgecheckt
      </div>
    </button>
  `,
  styles: [
  ]
})
export class ShiftComponent implements OnInit {

  numberChanged = new EventEmitter<{ messenger: Messenger; number: number }>();

  startTime = (type: ShiftType) => {return new Date(GC.startTimes.get(type));}
  endTime = (type: ShiftType) => {return new Date(GC.endTimes.get(type));}
  get dispatcherShiftTypes() {return GC.dispatcherShiftLiterals};
  get messengerShiftTypes() {return GC.messengerShiftLiterals};
  get new() {return !(this.shift.id)}
  get ended() {return !!(this.shift.end)}
  get isDezwo() {return GC._isDezwo}

  @Input() shift: Shift;
  @Output() deleteFromCheckIn = new EventEmitter<Shift>();

  constructor() { }

  ngOnInit(): void {
    this.numberChanged.pipe(
      distinctUntilChanged(),
      debounceTime(20),
    ).subscribe(data => {
      data.messenger._fexNumber = data.number;
    });
  }

  deleteShift(shift: Shift): void {
    GC.deleteOpenShift(shift);
    GC.messengersChanged.emit(true);
    removeItem(shift.messenger.id);
  }

  checkout(shift: Shift, end: Date): void {
    if (shift.type >= 5) {
      shift.update(`${shift.messenger.nickname} wurde ausgecheckt`, true).subscribe(() => {
        GC.loadShiftsToday(GC.http);
      })
    } else {
      const dialog = GC.dialog.open(CheckoutDialogComponent, {
        data: {
          shift: shift,
          end: end,
          jobs: GC.jobsToday.filter(j => j.messenger?.id === shift.messenger.id),
        }
      });
      dialog.componentInstance.dialogRef = dialog;
    }
  }

  asyncUpdate(msg: string): void {
    this.shift.update(msg, true)
  }
}
