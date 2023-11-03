import {Messenger} from "./Messenger";
import {GC} from "../common/GC";
import {AreYouSureDialogComponent} from "../dialogs/are-you-sure-dialog.component";

export class Note {
  id: string;
  creator: Messenger;
  date = new Date();
  text = '';

  constructor(data?: Partial<Note>) {
    if (data) {
      Object.assign(this, data);
    }
    this.creator = new Messenger(this.creator)
    this.date = this.date ? new Date(this.date) : this.date;
  }

  delete(): void {
    const dialog = GC.dialog.open(AreYouSureDialogComponent, {
      data: {
        headline: 'möchtest du diese notiz löschen?',
        verbYes: 'löschen',
        verbNo: 'abbrechen',
        highlightNo: true,
        warning: true
      }
    });
    dialog.componentInstance.confirm.subscribe(() => {
      GC.http.deleteNote(this).subscribe(() => {
        GC.openSnackBarLong('notiz wurde gelöscht.');
        GC.refreshNeeded.emit(true);
      });
    });
  }

  update(): void {
    GC.http.saveNote(this).subscribe(() => {
      GC.openSnackBarLong('notiz wurde gespeichert.');
    });
  }
}
