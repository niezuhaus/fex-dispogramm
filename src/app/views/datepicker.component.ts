import {Component, EventEmitter, Input, OnInit, Output, ViewChild} from '@angular/core';
import {DateAdapter} from '@angular/material/core';
import {GC} from "../common/GC";
import {MatDatepicker} from "@angular/material/datepicker";

@Component({
  selector: 'datepicker',
  template: `
    <div class="flex py-2 align-items-center">
      <button mat-button class="flex justify-content-around align-items-center" [class.mr-3]="headline"
              (click)="monthly ? previousMonth() : previousDay()" [disabled]="disabled">
        <i class="bi bi-chevron-left"></i>
      </button>
      <div [style.width]="headline ? '400px' : 'unset'" class="flex justify-content-center">
        <h1 *ngIf="headline" (click)="setToNow()" matTooltip="auf heute setzen"
            style="cursor: pointer; white-space: nowrap; margin: 0">{{days[date.getDay()]}}, {{date.toLocaleDateString()}}</h1>
      </div>
      <button
        [disabled]="disabled"
        *ngIf="!(headline)"
        mat-raised-button (click)="setToNow()"
        class="fex-button justify-content-center"
        style="min-width: 155px"
        matTooltip="datum zurücksetzen">
        <span *ngIf="monthly">{{months[date.getMonth()]}} {{date.getFullYear()}}</span>
        <span *ngIf="!monthly && date.toDateString() === today.toDateString()">heute</span>
        <span *ngIf="!monthly && date.toDateString() === yesterday.toDateString()">gestern</span>
        <span *ngIf="!monthly && date.toDateString() === tomorrow.toDateString()">morgen</span>
        <span *ngIf="!monthly && daysDifference > 1">
          {{dayLiterals[date.getDay()]}}, {{date.toLocaleDateString()}}
            </span>
      </button>
      <button mat-button class="flex justify-content-around align-items-center" [class.ml-3]="headline"
              (click)="monthly ? nextMonth() : nextDay()" [disabled]="disabled">
        <i class="bi bi-chevron-right"></i>
      </button>
      <div *ngIf="headline || calendar">
        <button mat-button (click)="openPicker($event)" matTooltip="datum auswählen" class="mr-3">
          <i class="bi bi-calendar3"></i>
        </button>
        <input
          matInput
          [matDatepicker]="picker"
          [(ngModel)]="date"
          (dateChange)="calendarSelect($event.value)"
          style="visibility: hidden; position: fixed;"
          [style.left.px]="datepickerTopLeftPosition.x"
          [style.top.px]="datepickerTopLeftPosition.y">
        <mat-datepicker #picker></mat-datepicker>
      </div>
    </div>
  `,
  styles: []
})
export class DatepickerComponent implements OnInit {

  today = this.dateAdapter.today();
  tomorrow = this.dateAdapter.today();
  yesterday = this.dateAdapter.today();
  datepickerTopLeftPosition = {x: 0, y: 0};

  @Input() headline: boolean;
  @Input() calendar: boolean;
  @Input() date: Date;
  @Input() monthly: boolean;
  @Input() disabled: boolean
  @Output() dateChange = new EventEmitter<Date>();
  @Output() touched = new EventEmitter<boolean>();

  @ViewChild('picker') picker: MatDatepicker<Date>;

  get dayLiterals() {return GC.dayLiterals};
  get months() {return GC.months};
  get days() {return GC.days};
  get daysDifference() {return this.date.daysDifference(this.today)};

  constructor(
    private dateAdapter: DateAdapter<Date>
  ) {
    this.dateAdapter.setLocale('de');
  }

  ngOnInit(): void {
    this.yesterday.setDate(this.yesterday.getDate() - 1);
    this.tomorrow.setDate(this.tomorrow.getDate() + 1);
    if (!(this.date)) {
      this.date = this.dateAdapter.today();
    }
  }

  previousDay(): void {
    this.touched.emit(true);
    if (this.date.getDay() === 1) {
      this.addDays(-3);
    } else {
      this.addDays(-1);
    }
    this.dateChange.emit(this.date);
  }

  nextDay(): void {
    this.touched.emit(true);
    if (this.date.getDay() === 5) {
      this.addDays(3);
    } else {
      this.addDays(1);
    }
    this.dateChange.emit(this.date);
  }

  openPicker(event: MouseEvent): void {
    this.datepickerTopLeftPosition.x = event.clientX;
    this.datepickerTopLeftPosition.y = event.clientY;
    this.picker.open()
  }

  calendarSelect(date: Date | any): void {
    this.setDate(date);
    this.dateChange.emit(date);
  }

  previousMonth(): void {
    this.date.setMonth(this.date.getMonth() - 1);
    this.dateChange.emit(this.date);
  }

  nextMonth(): void {
    this.date.setMonth(this.date.getMonth() + 1);
    this.dateChange.emit(this.date);
  }

  setToNow(): void {
    this.date = this.dateAdapter.today();
    this.dateChange.emit(this.date);
  }

  addDays(days: number): void {
    const nd = new Date(this.date.getTime());
    nd.setDate(this.date.getDate() + days);
    this.setDate(nd);
  }

  setDate(d: Date, time?: boolean): void {
    d = new Date(d);
    if (time) {
      this.date.setTime(d.getTime());
    } else {
      this.date.setTime(d.getTime());
    }
  }
}
