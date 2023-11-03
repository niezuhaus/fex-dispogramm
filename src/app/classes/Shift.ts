import {GC, ShiftType} from "../common/GC";
import {Price} from "./Price";
import {Messenger} from "./Messenger";
import {AreYouSureDialogComponent} from "../dialogs/are-you-sure-dialog.component";
import {tap} from "rxjs/operators";
import {Observable} from "rxjs";
import {Job} from "./Job";
import {IdObject} from "../common/interfaces";
import {CheckoutDialogComponent} from "../dialogs/checkout-dialog.component";

export class Shift implements IdObject {
  id: string;
  messenger: Messenger;
  start: Date = new Date();
  end: Date;
  tmpEnd: Date;
  type: ShiftType = 0;
  jobs: Job[]; // only for statistical purposes. jobs appear when shift has an end
  money: Price;
  edit: boolean;

  constructor(data?: Partial<Shift>, dispatcher?: boolean) {
    if (data) {
      Object.assign(this, data);
      this.start = new Date(this.start);
      this.end = this.end ? new Date(this.end) : null;
      this.messenger = new Messenger(this.messenger);
      this.jobs = this.jobs.map(j => new Job(j));
    } else if (dispatcher !== undefined) {
      this.type = this.shiftTypeGuess(dispatcher);
      this.start = this.startTimeGuess();
    } else {
      this.start = new Date().set(8);
      this.edit = true;
    }
    if (!this.messenger) {
      this.messenger = new Messenger();
    }
    this.messenger.shift = this;
  }

  private shiftTypeGuess(dispatcher: boolean): ShiftType {
    const h = this.start?.getHours();
    if (dispatcher) {
      if (h < 12) {
        return ShiftType.dispoEarly;
      } else {
        return ShiftType.dispoLate;
      }
    }
    if (h < 9) {
      return ShiftType.early;
    } else if (h < 10) {
      return ShiftType.kitaH;
    } else if (h < 11) {
      return ShiftType.zwischi;
    } else {
      return ShiftType.late;
    }
  }

  startTimeGuess(byDate?: boolean): Date {
    if (byDate) {
      let counter = 0;
      while (GC.startTimes.get(counter).getHours() < this.start.getHours()) {
        counter++;
      }
      return this.start.copyTime(GC.startTimes.get(counter));
    }
    return this.start.copyTime(GC.startTimes.get(this.type));
  }

  endTimeGuess(): Date {
    return this.start.copy().copyTime(GC.endTimes.get(this.type));
  }

  delete(): void {
    const dialog = GC.dialog.open(AreYouSureDialogComponent, {
      data: {
        headline: 'möchtest du diese schicht löschen?',
        verbYes: 'löschen',
        verbNo: 'abbrechen',
        highlightNo: true,
        warning: true
      }
    })
    dialog.componentInstance.confirm.subscribe(() => {
      GC.http.deleteShift(this).subscribe(() => {
        GC.openSnackBarLong('schicht wurde gelöscht.');
        GC.loadShiftsToday(GC.http);
      });
    })
  }

  openDialog(): void {
    GC.dialog.open(CheckoutDialogComponent, {
      data: {
        shift: this,
        end: this.end,
        jobs: this.jobs,
      }
    })
  }

  update(msg?: string, subscribe?: boolean): Observable<Shift> {
    const res = GC.http.updateShift(this).pipe(
      tap(() => {
        if (msg) {
          GC.openSnackBarLong(msg);
        }
      })
    )
    if (subscribe) {
      res.subscribe(() => {
        GC.loadShiftsToday(GC.http)
      })
    }
    return res;
  }
}
