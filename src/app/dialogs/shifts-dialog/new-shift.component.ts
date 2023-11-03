import {Component, EventEmitter, Input, OnInit, Output, ViewChild} from '@angular/core';
import {Messenger} from "../../classes/Messenger";
import {TimepickerComponent} from "../../views/timepicker.component";
import {SearchinputComponent} from "../../views/newtour/inputfield/searchinput/searchinput.component";
import {GC} from "../../common/GC";
import {Shift} from "../../classes/Shift";

@Component({
  selector: 'new-shift-input',
  template: `
    <div class="flex flex-row align-items-center">
      <mat-form-field class="mr-3" style="width: 120px;">
        <mat-label>schichttyp</mat-label>
        <mat-select
          [disabled]="disabled"
          tabindex="-1"
          [(ngModel)]="shift.type"
          (valueChange)="shift.startTimeGuess()">
          <mat-option
            *ngFor="let shiftType of dispatcher ? dispatcherShiftTypes : messengerShiftTypes; let i = index"
            [value]="dispatcher ? i : i + 2">
            {{shiftType}}
          </mat-option>
        </mat-select>
      </mat-form-field>
      <timepicker
        [disabled]="disabled"
        #timepicker
        [label]="'check-in ab'"
        [time]="shift.start"
        (timeChange)="shift.start = $event"
        [width]="63"
        class="mr-3">
      </timepicker>
      <searchinput
        [disabled]="disabled"
        #search
        [label]="dispatcher ? 'disponent:in' : 'kurier:in'"
        [searchMessenger]="!dispatcher"
        [searchDispatcher]="dispatcher"
        [ignoredMessenger]="ignoredMessenger"
        (messengerSelected)="dispatcher ? dispatcherSelected($event) : messengerSelected($event)"
        #messengerInput>
      </searchinput>
      <div *ngIf="disabled" class="ml-3 fex-warn">bereits eingecheckt</div>
    </div>
  `,
  styles: []
})
export class NewShiftComponent implements OnInit {

  shift: Shift;
  get dispatcherShiftTypes() {return GC.dispatcherShiftLiterals};
  get messengerShiftTypes() {return GC.messengerShiftLiterals};

  @Input() dispatcher: boolean;
  @Input() ignoredMessenger: Messenger[] = [];
  @Input() disabled: boolean;
  @Output() dispatcherShiftCreated = new EventEmitter<Shift>();
  @Output() messengerShiftCreated = new EventEmitter<Shift>();
  @ViewChild('search') search: SearchinputComponent;
  @ViewChild('timepicker') timepicker: TimepickerComponent;

  constructor() {
  }

  ngOnInit(): void {
    this.initShift()
  }

  initShift(): void {
    this.shift = new Shift(null, this.dispatcher || false);
  }

  dispatcherSelected(messenger: Messenger) {
    this.shift.messenger = messenger;
    this.dispatcherShiftCreated.emit(this.shift);
    this.initShift();
    this.search.reset();
  }

  messengerSelected(messenger: Messenger) {
    this.shift.messenger = messenger;
    this.messengerShiftCreated.emit(this.shift);
    this.initShift();
    this.search.reset();
  }
}
