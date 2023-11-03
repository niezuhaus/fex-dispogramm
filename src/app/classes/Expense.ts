import {Price} from "./Price";
import {GC} from "../common/GC";
import {NewExpenseDialogComponent} from "../dialogs/new-expense-dialog.component";
import {Observable, tap} from "rxjs";
import {Job} from "./Job";

export class Expense {
  id: string;
  clientId: string;
  jobId: string;
  date: Date;
  description: string;
  price: Price;
  delete = false;

  constructor(data?: Partial<Expense>) {
    if (data) {
      Object.assign(this, data);
    }
    this.price = this.price ? new Price(this.price) : new Price();
    if (this.date) {
      this.date = new Date(this.date);
    }
  }

  openEdit(job: Job): void {
    GC.dialog.open(NewExpenseDialogComponent, {
      data: {
        job: job,
        expense: this,
      }
    })
  }

  save(msg?: string): Observable<Expense> {
    if (this.id) {
      return GC.http.updateExpense(this).pipe(
        tap(() => {
          GC.openSnackBarLong(msg || `auslage '${this.description}' wurde aktualisiert`)
        }),
      );
    } else {
      return GC.http.createExpense(this).pipe(
        tap(() => {
          GC.openSnackBarLong(msg || `auslage '${this.description}' wurde hinzugefügt`)
        }),
      );
    }
  }
}
