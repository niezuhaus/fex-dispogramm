import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {LocType} from '../../../common/interfaces';
import {Note} from "../../../classes/Note";
import {Job, RegularJob} from "../../../classes/Job";
import {GC} from "../../../common/GC";
import {Geolocation} from "../../../classes/Geolocation";
import {AreYouSureDialogComponent} from "../../../dialogs/are-you-sure-dialog.component";
import {TourplanItem} from "../../../classes/TourplanItem";

@Component({
  selector: 'description',
  templateUrl: './description.component.html',
  styleUrls: ['./description.component.scss']
})

export class DescriptionComponent implements OnInit {

  @Input() item: TourplanItem;
  @Input() job: Job;
  @Input() hideTimeAlarms: boolean;
  @Input() hideHints: boolean;
  @Input() note: Note;
  @Input() headline: boolean;
  @Input() hideHighlights: boolean;
  @Input() hideToolTips: boolean;
  @Input() moreLocations: boolean;  // the client has several locations, so that jobs must be distiguished.
  @Input() weekplan: boolean;
  @Input() clientView: boolean;
  @Input() purpleRegularJobs: boolean;
  @Input() showPrices: boolean;
  @Output() showJobsForPosttour = new EventEmitter<number>()

  pre: boolean;
  deliveries: Geolocation[];
  center: Geolocation;

  get routes() {
    return GC.routes
  };

  get morningTours() {
    return GC.posttours
  };

  get gray() {
    return this.item?._messenger || (!this.headline && !this.weekplan) || this.item?.job?._canceled;
  }

  constructor() {
  }

  ngOnInit(): void {
    if (!this.item) {
      this.item = new TourplanItem({
        job: (this.job instanceof RegularJob) ? null : this.job,
        regularJob: (this.job instanceof RegularJob) ? this.job as RegularJob : null,
        note: this.note
      })
    } else {
      this.job = this.item._job;
      this.note = this.item.note;
    }
    if (this.job) {
      this.pre = this.job.date.getTime() > this.job.creationDate?.getTime();
      if (!this.job.clientInvolved) {
        if (this.job.pickups?.length === 1) {
          this.center = this.job.pickups[0];
          this.center.locType = LocType.centerPickup;
        } else if (this.job.pickups?.length === 1) {
          this.center = this.job.deliveries[0];
          this.center.locType = LocType.centerDelivery;
        }
      }
      this.deliveries = this.job.deliveries?.copy().reverse();
    }
  }

  editQuestion(): void {
    const dialog = GC.dialog.open(AreYouSureDialogComponent, {
      data: {
        headline: `möchtest du die tour nur für ${GC.tourplan.date.isToday() ? 'heute' : GC.tourplan.date.dateStampLong()} oder für die zukunft bearbeiten?`,
        verbYes: `nur ${GC.tourplan.date.isToday() ? 'heute' : GC.tourplan.date.dateStampLong()}`,
        verbNo: 'für die zukunft',
        warning: true
      }
    })
    dialog.componentInstance.confirm.subscribe(() => {
      if (this.item.isConverted) {
        this.goTo();
      } else {
        this.item.regularJob.convert().subscribe(job => {
          GC.router.navigate([GC.routes.newTour, {id: job.id, rj: false}])
        })
      }
    })
    dialog.componentInstance.cancel.subscribe(() => {
      if (this.item.isConverted) {
        GC.router.navigate([GC.routes.newTour, {id: this.item.job.regularJobId, rj: true}])
      } else {
        GC.router.navigate([GC.routes.newTour, {id: this.item.regularJob.id, rj: true}])
      }
    })
  }

  goTo(): void {
    GC.router.navigate([GC.routes.newTour, {id: this.job.id, rj: false}])
  }
}
