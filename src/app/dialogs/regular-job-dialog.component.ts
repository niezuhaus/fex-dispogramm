import {Component, EventEmitter, Inject, OnInit} from '@angular/core';
import {Day} from "../common/interfaces";
import {MAT_DIALOG_DATA} from "@angular/material/dialog";
import {GC} from "../common/GC";
import {AreYouSureDialogComponent} from "./are-you-sure-dialog.component";
import {FormControl, Validators} from "@angular/forms";
import {RegularJob} from "../classes/Job";

@Component({
  selector: 'app-regular-job-options-dialog',
  template: `
    <h3 class="mb-3">festtour optionen</h3>
    <div class="flex flex-column">
      <mat-form-field>
        <mat-label>name</mat-label>
        <input matInput type="text" [(ngModel)]="regularJob.name" [formControl]="ctrlName" required>
        <mat-error *ngIf="ctrlName.invalid">bitte einen namen eingeben</mat-error>
      </mat-form-field>

      <div class="flex flex-row justify-content-between">
        <mat-form-field style="width: 200px">
          <mat-label>starten ab</mat-label>
          <input matInput [(ngModel)]="regularJob._startDate" [matDatepicker]="pickerStart" (click)="pickerStart.open()"
                 [formControl]="ctrlStartDate" (dateChange)="dateChange($event.value)">
          <mat-datepicker #pickerStart></mat-datepicker>
          <mat-error *ngIf="ctrlStartDate.invalid">bitte ein datum eingeben</mat-error>
        </mat-form-field>
        <mat-form-field style="width: 200px">
          <mat-label>läuft bis</mat-label>
          <input matInput [(ngModel)]="regularJob.endDate" [matDatepicker]="pickerEnd" (click)="pickerEnd.open()">
          <mat-datepicker #pickerEnd></mat-datepicker>
        </mat-form-field>
      </div>

      <div class="flex flex-row">
        <div class="flex flex-column align-items-center day">
          <mat-checkbox name="check_mo" [(ngModel)]="datesChecked[0]" [checked]="true" class="position-relative"
                        style="left: -7px"
                        (change)="regularJob.dates[0] = $event.checked ? regularJob.startDate.datesSet()[0] : null">
            mo
          </mat-checkbox>
          <timepicker [(time)]="regularJob.dates[0]" (timeChange)="timeSync($event)"
                      [disabled]="!datesChecked[0]" [disableAutoReplace]="true"></timepicker>
          {{regularJob.dates[0]?.dateStampShort()}}
        </div>
        <div class="flex flex-column align-items-center day">
          <mat-checkbox name="check_di" [(ngModel)]="datesChecked[1]" [disabled]="sync" class="position-relative"
                        style="left: -7px"
                        (change)="regularJob.dates[1] = $event.checked ? regularJob.startDate.datesSet()[1] : null">
            di
          </mat-checkbox>
          <timepicker [(time)]="regularJob.dates[1]" [disabled]="sync || !datesChecked[1]"
                      [disableAutoReplace]="true"></timepicker>
          {{regularJob.dates[1]?.dateStampShort()}}
        </div>
        <div class="flex flex-column align-items-center day">
          <mat-checkbox name="check_mi" [(ngModel)]="datesChecked[2]" [disabled]="sync" class="position-relative"
                        style="left: -7px"
                        (change)="regularJob.dates[2] = $event.checked ? regularJob.startDate.datesSet()[2] : null">
            mi
          </mat-checkbox>
          <timepicker [(time)]="regularJob.dates[2]" [disabled]="sync || !datesChecked[2]"
                      [disableAutoReplace]="true"></timepicker>
          {{regularJob.dates[2]?.dateStampShort()}}
        </div>
        <div class="flex flex-column align-items-center day">
          <mat-checkbox name="check_do" color="accent" [(ngModel)]="datesChecked[3]" [disabled]="sync"
                        class="position-relative"
                        style="left: -7px"
                        (change)="regularJob.dates[3] = $event.checked ? regularJob.startDate.datesSet()[3] : null">
            do
          </mat-checkbox>
          <timepicker [(time)]="regularJob.dates[3]" [disabled]="sync || !datesChecked[3]"
                      [disableAutoReplace]="true"></timepicker>
          {{regularJob.dates[3]?.dateStampShort()}}
        </div>
        <div id="fr" class="flex flex-column align-items-center day">
          <mat-checkbox name="check_fr" [(ngModel)]="datesChecked[4]" [disabled]="sync" class="position-relative"
                        style="left: -7px"
                        (change)="regularJob.dates[4] = $event.checked ? regularJob.startDate.datesSet()[4] : null">
            fr
          </mat-checkbox>
          <timepicker [(time)]="regularJob.dates[4]" [disabled]="sync || !datesChecked[4]"
                      [disableAutoReplace]="true"></timepicker>
          {{regularJob.dates[4]?.dateStampShort()}}
        </div>
      </div>
      <mat-checkbox [(ngModel)]="sync" [checked]="true" (change)="$event.checked ? timeSync(regularJob.dates[0]) : {}">
        tage synchronisieren
      </mat-checkbox>
      <div class="mt-3 flex flex-row">
        <mat-form-field style="width: 200px">
          <mat-label>pauschalbetrag</mat-label>
          <input matInput type="number" [(ngModel)]="regularJob.monthlyPrice._netto" [formControl]="ctrlMonthlyPrice"
                 required>
          <mat-error *ngIf="ctrlMonthlyPrice.invalid">bitte einen pauschalbetrag eingeben</mat-error>
        </mat-form-field>
        <mat-form-field style="width: 200px" class="ml-4">
          <mat-label>postrunde</mat-label>
          <mat-select [(value)]="regularJob.morningTour" tabindex="-1">
            <mat-option [value]="0"><i>- keine -</i></mat-option>
            <mat-option *ngFor="let extra of posttours; let i = index" [value]="i + 1">
              {{extra}}
            </mat-option>
          </mat-select>
        </mat-form-field>
      </div>
      <div class="flex flex-row justify-content-between">
        <button
          (click)="save(data.locally)"
          mat-raised-button class="mt-3 fex-button"
          [disabled]="required()">
          speichern
        </button>
        <button *ngIf="regularJob.id && tourplan" (click)="delete()" mat-button class="mt-3 fex-button-warn">
          ab {{tourplan.date.dateStampShort()}} streichen
        </button>
      </div>
    </div>
  `,
  styles: [`
    @import "../../const.scss";

    h3 {
      color: $fex-dark;
      font-size: 18px;
    }

    .day:not(#fr) {
      border-right: 1px solid lightgray;
    }

    .day {
      padding: 0 10px;
      min-width: 90px;
    }
  `]
})
export class RegularJobDialogComponent implements OnInit {
  regularJob: RegularJob;
  saved = new EventEmitter<RegularJob>();
  today = new Date();
  datesChecked = [false, false, false, false, false];
  sync = true;

  ctrlName = new FormControl('', [Validators.required]);
  ctrlMonthlyPrice = new FormControl('', [Validators.required]);
  ctrlStartDate = new FormControl('', [Validators.required]);

  get posttours() {return GC.posttours};

  get tourplan() {return GC.tourplan};

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: {
      rj: RegularJob;
      locally: boolean;
    },
  ) {
    this.today.nearestQuarter();
    this.regularJob = data.rj || new RegularJob();

    this.datesChecked = this.regularJob.dates.map(d => !!d);
    const dates = this.regularJob.dates.filter(d => !!d).map(d => d.set(-1, -1, 0, 0));
    this.sync = dates.length === 5 && this.areTimesEqual(dates);
  }

  dateChange(date: Date | any): void {
    this.regularJob.startDate.copyDate(date);
    this.regularJob.startDate.datesSet()
      .forEach((d, i) => {
        this.regularJob.dates[i]?.copyDate(d);
      });
  }

  ngOnInit(): void {
    this.timeSync(this.regularJob.dates[0]);
  }

  required(): boolean {
    return this.ctrlName.hasError('required') || this.ctrlMonthlyPrice.hasError('required')
  }

  delete(): void {
    const dialog = GC.dialog.open(AreYouSureDialogComponent, {
      data: {
        headline: `diese festtour ab ${this.tourplan.date.dateStampShort()} streichen?`,
        verbYes: 'ja',
        verbNo: 'abbrechen',
        highlightNo: true,
        warning: true
      }
    })
    dialog.componentInstance.confirm.subscribe(() => {
      this.regularJob.endDate = this.tourplan.date.yesterday().set(0);
      this.regularJob.save().subscribe(() => {
        GC.openSnackBarShort('tour wurde ab heute gestrichen')
        GC.dialog.closeAll();
        GC.tourplan.refresh();
      });
    });
  }

  // checks if sync must be activated because all dates have the same time
  areTimesEqual(dates: Date[]): boolean {
    let res = true;
    dates.slice(1).forEach(d => {
      if (d.getHours() !== dates[0].getHours() || d.getMinutes() !== dates[0].getMinutes()) {
        res = false;
      }
    });
    return res;
  }

  timeSync(date: Date) {
    this.regularJob.startDate.copyTime(date);
    if (this.sync) {
      this.datesChecked = [true, true, true, true, true];
      for (let i = 1; i < this.regularJob.dates.length; ++i) {
        this.regularJob.dates[i]?.copyTime(date);
      }
    }
  }

  save(locally?: boolean): void {
    this.regularJob.dates = this.datesChecked.map((b, i) => b ? this.regularJob.dates[i] : null)
    this.regularJob.price = this.regularJob.monthlyPrice.regularJobPrice
    if (!locally) {
      this.regularJob.save('festtour gespeichert').subscribe(rj => {
        this.saved.emit(rj);
        GC.dialog.closeAll();
        GC.refreshNeeded.emit(true);
      })
    } else {
      this.saved.emit(this.regularJob)
      GC.dialog.closeAll();
    }
  }

  /**
   * finds the next date that has the specified day
   * @param day
   * @param from
   * @param obj
   * @private
   */
  public static

  findnext(day: Day, from: Date, obj: Date):
    Date {
    obj.copyDate(from);
    while (obj.getDay() !== day) {
      obj.setDate(obj.getDate() + 1);
    }
    return obj;
  }
}
