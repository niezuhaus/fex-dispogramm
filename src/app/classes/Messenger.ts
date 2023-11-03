import {removeItem, setItem} from "../UTIL";
import {GC, ShiftType} from "../common/GC";
import {Shift} from "./Shift";
import {CheckoutDialogComponent} from "../dialogs/checkout-dialog.component";
import {AreYouSureDialogComponent} from "../dialogs/are-you-sure-dialog.component";
import {IdObject} from "../common/interfaces";
import {MessengerDialogComponent} from "../dialogs/messenger-dialog.component";

export class Messenger implements IdObject {

  id: string; // dbid
  messengerId: string; // fexid
  nickname: string;
  firstName: string;
  lastName: string;
  dispatcher = false;
  active = true;
  telNumber: string;
  sales = (date: Date) => {return GC.messengerData(date).get(this.id)?.sales};
  shift: Shift;
  jobs = (date: Date) => {return GC.messengerData(date).get(this.id)?.jobs};

  fexNumber: number;

  constructor(data?: Partial<Messenger>) {
    if (data) {
      Object.assign(this, data)
    }
  }

  set _fexNumber(number: number) {
    if (!number) {
      removeItem(this.id);
      this.fexNumber = null;
      GC.openSnackBarShort(`nummer von ${this.nickname} gelöscht`);
      return;
    }
    if (this.fexNumber === number) {
      return;
    }
    this.fexNumber = number;
    setItem<{number: number, date: Date}>(this.id, {number: number, date: new Date()})
    GC.openSnackBarShort(`${this.nickname} hat die ${number}`);
  }

  checkout(end: Date): void {
    if (!this.shift || !end) {
      return;
    }
    if ([ShiftType.dispoEarly, ShiftType.dispoLate].includes(15)) {
      this.shift.update(`${this.shift.messenger.nickname} wurde ausgecheckt`, true).subscribe(() => {
        GC.loadShiftsToday(GC.http);
      })
    } else {
      const dialog = GC.dialog.open(CheckoutDialogComponent, {
        data: {
          shift: this.shift,
          jobs: this.jobs(this.shift.start) || [],
        }
      })
      dialog.componentInstance.dialogRef = dialog;
    }
  }

  copy(): Messenger {
    const m = new Messenger(this);
    m.shift = null;
    return m;
  }

  delete(): void {
    const dialog = GC.dialog.open(AreYouSureDialogComponent, {
      data: {
        headline: 'möchtest du diese kurier:in wirklich löschen?',
        verbYes: 'ja',
        verbNo: 'nein',
        highlightNo: true,
        warning: true
      }
    });
    dialog.componentInstance.confirm.subscribe(() => {
      GC.http.deleteMessenger(this).subscribe(() => {
        GC.openSnackBarLong('kurier:in gelöscht');
      })
    })
  }

  openDialog(): void {
    GC.http.getShiftsForMessengerAndMonth(this, new Date()).subscribe(shifts => {
      GC.dialog.open(MessengerDialogComponent, {
        data: {
          messenger: this,
          shifts: shifts
        }
      });
    })
  }
}
