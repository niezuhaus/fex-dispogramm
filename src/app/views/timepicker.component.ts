import {Component, EventEmitter, Input, OnInit, Output, ViewChild} from '@angular/core';
import {DateAdapter} from "@angular/material/core";
import {MatInput} from "@angular/material/input";
import {debounceTime} from "rxjs/operators";

@Component({
  selector: 'timepicker',
  template: `
    <div class="align-items-center">
      <mat-form-field class="time">
        <mat-label>{{this.label}}</mat-label>
        <input
          type="time"
          matInput
          [disabled]="disabled"
          [value]="timestamp(time)"
          (change)="setTime(input.value, 'change')"
          (reset)="setTime('', 'reset')"
          (keyup)="keys = keys + 1"
          [style.width.px]="width"
          tabindex="-1"
          #input>
      </mat-form-field>
    </div>
  `,
  styles: [
    `
      .time {
        width: 105%;
      }
    `
  ]
})
export class TimepickerComponent implements OnInit {

  @ViewChild('time') timePicker: MatInput;
  @Input() time: Date;
  @Input() label: String;
  @Input() disabled: boolean;
  @Input() noDate: boolean;
  @Input() disableAutoReplace: boolean;
  @Input() compareDate: Date;
  @Input() width: number;
  @Output() timeChange = new EventEmitter<Date>();
  @Output() timeChangeDebounce = new EventEmitter<Date>();
  today = this.dateAdapter.today();
  keys = 0;

  constructor(
    private dateAdapter: DateAdapter<Date>,
  ) {
  }

  ngOnInit(): void {
    this.timeChange.pipe(
      debounceTime(1000)
    ).subscribe(date => this.timeChangeDebounce.emit(date));
  }

  setTime(s: string, action: string): void {
    if (!s || s === '') {
      if (!this.disableAutoReplace) {
        this.timeChange.emit(this.time);
        return;
      }
      this.time.setHours(this.today.getHours());
      this.time.setMinutes(this.today.getMinutes());
    } else {
      const h = s.slice(0, 2);
      const m = s.slice(3, 5);
      this.time = new Date(this.time);
      this.time.setHours(parseInt(h));
      this.time.setMinutes(parseInt(m));
    }
    this.timeChange.emit(this.time);
  }

  timestamp(date: Date): string {
    return TimepickerComponent.timestampStatic(date);
  }

  static timestampStatic(date: Date): string {
    if (date === null) {
      return '--:--';
    }
    date = new Date(date);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  }
}
