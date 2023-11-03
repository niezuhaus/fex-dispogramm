import {Component, EventEmitter, Input, Output} from '@angular/core';
import {DateRange} from "@angular/material/datepicker";

@Component({
  selector: 'app-inline-range-calendar',
  template: `
    <mat-calendar
      [selected]="range"
      (selectedChange)="selectedChange($event)">
    </mat-calendar>
  `,
  styles: [
  ]
})
export class InlineRangeCalendarComponent {
  @Input() range: DateRange<Date> | undefined;
  @Output() rangeChange = new EventEmitter<DateRange<Date>>();
  @Output() dateSelect = new EventEmitter<Date>();

  selectedChange(m: any) {
    this.dateSelect.emit(m as Date);
    if (!this.range?.start || this.range?.end) {
      this.range = new DateRange<Date>(m, null);
    } else {
      const start = this.range.start;
      const end = m;
      if (end < start) {
        this.range = new DateRange<Date>(end, start);
      } else {
        this.range = new DateRange<Date>(start, end);
      }
    }
    this.rangeChange.emit(this.range);
  }

}
