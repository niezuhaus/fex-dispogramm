import {Price} from "./Price";
import {Job, RegularJob} from "./Job";
import {Note} from "./Note";
import {MorningTour} from "../common/interfaces";
import {Messenger} from "./Messenger";
import {GC} from "../common/GC";
import {MorningTourDialogComponent} from "../dialogs/morning-tour-dialog.component";
import {zip} from "rxjs";

export class TourplanItem {
  private date: Date;
  private price: Price;
  private name: string;
  job: Job;
  regularJob: RegularJob;
  note: Note;
  index: number;
  morningTour: MorningTour = NaN;
  regularJobs: RegularJob[] = [];
  convertedJobs: Job[] = [];
  edit: boolean

  get _date(): Date {
    return this.date || this.job?.date || this.regularJob?.date || this.note?.date;
  }

  set _date(date: Date) {
    this.date = date;
    if (this.job) {
      this.job.date = date;
    }
    if (this.note) {
      this.note.date = date;
    }
    if (this.regularJob) {
      this.regularJob.date = date;
    }
  }

  get _price(): Price {
    return this.price || this.job?.price || this.regularJob?.price || undefined;
  }

  set _price(price: Price) {
    this.price = price;
  }

  get _name(): string {
    return this.name || this._job?.name || this._job?.center?.name || this._job?.center?.address || this.note?.text;
  }

  get print(): string {
    return this._job?.toString();
  }

  set _name(name: string) {
    this.name = name;
  }

  set _colour(colour: string) {
    if (this.isMorningTour) {
      if (this.regularJobs.length) {
        zip(this.regularJobs.map(rj => rj.convert(this.date))).subscribe(list => {
          this.convertedJobs.pushArray(list);
          this.convertedJobs.forEach(j => j._colour = colour)
        })
      } else {
        this.convertedJobs.forEach(j => j._colour = colour)
      }
    } else {
      this.job._colour = colour;
    }
  }

  get _colour() {
    return this.isMorningTour ? this.convertedJobs[0]?.colour || '0000' : this._job?.colour || '0000'
  }

  get _description(): string {
    return this._job?.description || this.note?.text;
  }

  set _description(value: string) {
    this._job ? this._job.description = value : this.note.text = value;
  }

  get _job(): Job {
    return this.job || this.regularJob || null;
  }

  get _messenger(): Messenger {
    return this.job?.messenger || this.convertedJobs.map(j => j.messenger)[0]
  }

  get _creator(): Messenger {return this.job?.creator || this.note?.creator || null}

  get _billingTour(): boolean {return this._job?.billingTour || this.isRegularJob || this.morningTour > 0}

  get isJob(): boolean {return !!(this.job);}

  get isPrePlanned(): boolean {return !this.isRegularJob && this._job?.date.getTime() > this._job?.creationDate.getTime()}

  get isAbstractJob(): boolean {return !!(this._job);}

  /**
   * returns true, if the tpi contains a regular job object
   * OR a converted regular job object
   */
  get isRegularJob(): boolean {
    return !!(this.regularJob || this.job?.regularJobId);
  }

  get isTemplate(): boolean {
    return !!(this.regularJob);
  }

  get isConverted(): boolean {
    return !!(this.job?.regularJobId);
  }

  get isNote(): boolean {
    return !!(this.note);
  }

  get isMorningTour(): boolean {
    return !isNaN(this.morningTour);
  }

  get morningJobs(): number {
    return this.convertedJobs?.length || this.regularJobs.length
  }

  constructor(data: Partial<TourplanItem>) {
    if (data) {
      Object.assign(this, data);
    }

    if (this.isTemplate) {
      this.price = this.regularJob.monthlyPrice.regularJobPrice;
    }
  }

  openMorningTour(): void {
    GC.dialog.open(MorningTourDialogComponent, {
      data: {
        name: GC.posttours[this.morningTour],
        items:
          this.convertedJobs.map(j => new TourplanItem({job: j}))
            .concat(this.regularJobs.map(rj => new TourplanItem({regularJob: rj}))),
      }
    });
  }

  /**
   * returns true, if a tourplan item:
   * - has no assigned messenger
   * - && (
   * @param job the tourplan item to calculate the alarm state for
   */
  get isAlarm(): boolean {
    return !(this._messenger) && (
      // tour is planned and
      (this._job?.isPlanned
        &&
        this.timeUntil.isBetween(
          GC.config.tourplan.ALARM_STOP * -3600000, // ms of an hour
          GC.config.tourplan.PRE_ORDER_ALARM * 60000) // ms of a minute
      ) || (
        this.timeUntil.isBetween(
          GC.config.tourplan.ALARM_STOP * -3600000,
          GC.config.tourplan.NORMAL_ALARM * -60000
        )
      )
    );
  }

  /**
   * @return the amount of time, the date of this job is in the future.
   *  returns a negative value, if the date is in the past
   */
  get timeUntil(): number {return this._date.getTime() - new Date().getTime()}

  save(): void {
    if (this.isNote) {
      GC.http.saveNote(this.note).subscribe(() => {
        GC.openSnackBarLong('notiz wurde gespeichert')
      })
    } else {
      this._job.save('änderungen wurden gespeichert').subscribe(() => {
        this.edit = false;
      })
    }
  }
}
