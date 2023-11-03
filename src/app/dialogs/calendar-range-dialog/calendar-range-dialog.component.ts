import {Component, EventEmitter, Inject} from '@angular/core';
import {MAT_DIALOG_DATA} from "@angular/material/dialog";
import {RegularJob} from "../../classes/Job";
import {DateRange} from "@angular/material/datepicker";

@Component({
  selector: 'app-calendar-range-dialog',
  template: `
    <h1 mat-dialog-title>{{data.headline}}</h1>
    <div style="width: 400px">
      <app-inline-range-calendar [(range)]="range" (dateSelect)="dateSelected.emit($event)"></app-inline-range-calendar>
    </div>
    <button
      *ngIf="range?.start && range?.end"
      (click)="save()"
      mat-raised-button
      class="fex-button"
      mat-dialog-close>tour von {{range.start.dateStampShort()}} bis {{range.end.dateStampShort()}} pausieren</button>
  `,
  styles: [
  ]
})
export class CalendarRangeDialogComponent {
  range: DateRange<Date>;
  regularJob: RegularJob;
  rangeSaved = new EventEmitter<DateRange<Date>>();
  dateSelected = new EventEmitter<Date>;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: {
      headline: string,
      onlyDatePicker: boolean;
      regularJob: RegularJob
    }) {
    this.regularJob = data.regularJob;
  }

  save(): void {
    this.rangeSaved.emit(this.range);
  }
}
