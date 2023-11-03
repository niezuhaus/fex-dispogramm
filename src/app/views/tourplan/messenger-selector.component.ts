import {Component, EventEmitter, Input, OnInit, Output, ViewChild} from '@angular/core';
import {GC} from "../../common/GC";
import {MorningTour} from "../../common/interfaces";
import {Messenger} from "../../classes/Messenger";
import {CheckInDialog} from "../../dialogs/shifts-dialog/check-in-dialog.component";
import {zip} from "rxjs";
import {MatButtonToggleGroup} from "@angular/material/button-toggle";
import {SearchinputComponent} from "../newtour/inputfield/searchinput/searchinput.component";
import {TourplanItem} from "../../classes/TourplanItem";

@Component({
  selector: 'messenger-selector',
  template: `
    <div class="flex flex-row justify-around align-items-center">
      <button *ngIf="messengersNotCheckedIn() && !item._messenger" mat-button (click)="openCheckInDialog()">
        kurier:innen einchecken
      </button>

      <!-- searchbar -->
      <searchinput
        #messSearch *ngIf="!showToggle()"
        [searchMessenger]="true"
        [label]="'kurier:in...'"
        [disabled]="dispatcherNotCheckedIn()"
        (messengerSelected)="messengerSelected($event.id)"
        class="mx-3"
        [matTooltip]="dispatcherNotCheckedIn() ? 'bitte erst einchecken!' : ''"></searchinput>

      <!-- selector -->
      <div *ngIf="!!(item._messenger) || (!messengersNotCheckedIn() && showToggle())"
           class="flex flex-row align-items-center w-100"
           style="justify-content: unset"
           [matTooltip]="item._job?.dispatcher?.nickname ? 'disponiert von ' + item._job?.dispatcher.nickname : ''">
        <mat-button-toggle-group
          #toggle
          name="messenger" [value]="item._messenger?.id || ''"
          (change)="messengerSelected($event.value)"
          [disabled]="item._job?.finished || dispatcherNotCheckedIn()">
          <mat-button-toggle
            *ngFor="let messenger of messList"
            [value]="messenger.id">
            <div class="flex flex-row align-items-center">
              <div class="flex flex-column">
              <span style="line-height: 14px">
                {{messenger.nickname}}
              </span>
                <span style="font-size: 11px; line-height: 18px">
                {{shiftLiterals[messenger.shift?.type]}}
              </span>
              </div>
              <span
                *ngIf="messenger.fexNumber"
                [class.active]="!item._messenger"
                [class.inactive]="item._messenger"
                class="ml-2 phoneNumber">
                  {{messenger.fexNumber}}
                </span>
            </div>
          </mat-button-toggle>
        </mat-button-toggle-group>
      </div>
      <button mat-button (click)="resetMessenger()" [disabled]="dispatcherNotCheckedIn()" matTooltip="zurücksetzen"
              style="min-width: 40px !important; margin-left: 10px" *ngIf="item._messenger && !item._job?.finished">
        <i class="bi bi-arrow-counterclockwise"></i>
      </button>
    </div>
  `,
  styles: [`
    @import "../../../const.scss";

    .active {
      background: #8363b5;
    }

    .inactive {
      border: 1px solid $gray;
      background: white;
      color: $gray;
    }
  `]
})
export class MessengerSelectorComponent implements OnInit {

  edit = false;
  early: boolean;
  isIncluded = (array: Messenger[], mes: Messenger) => {
    return !mes || array.map(m => m.nickname).includes(mes.nickname);
  }

  get today() {
    return GC.tourplan.isToday
  };

  get messList() {
    let res = this.early ? this.earlyShift : this.lateShift;
    if (!this.item._messenger) {
      res = this.checkedIn;
    } else {
      if (!res.map(m => m.nickname).includes(this.item._messenger.nickname)) {
        res = res.concat(this.item._messenger)
      }
    }
    return res;
  }

  get shiftLiterals() {return GC.dispatcherShiftLiterals.concat(GC.messengerShiftLiterals)};

  @Input() item: TourplanItem;
  @Input() checkedIn: Messenger[];
  @Input() earlyShift: Messenger[];
  @Input() lateShift: Messenger[];
  @Output() messengerSelect = new EventEmitter<Messenger>();
  @Output() posttourSelect = new EventEmitter<MorningTour>();
  @ViewChild('toggle') toggle: MatButtonToggleGroup;
  @ViewChild('messSearch') messSearch: SearchinputComponent;

  constructor() {
  }

  ngOnInit(): void {
    GC.dispatcherChanged.subscribe(() => {
      setTimeout(() => {
        this.setControls()
      }, 0)
    })
    GC.tourplan.messengerSet.subscribe(() => {
      this.early = this.isEarly;
    });
    this.early = this.isEarly;
  }

  setControls(): void {
    if (this.messSearch) {
      this.messSearch.setFormControls();
    }
  }

  get isEarly(): boolean {
    if (this.lateShift.map(m => m.id).includes(this.item._messenger?.id) && this.item._date.getHours() >= 13) {
      return false;
    } else if (this.earlyShift.map(m => m.id).includes(this.item._messenger?.id) && this.item._date.getHours() < 13) {
      return true;
    } else {
      if (this.item._messenger) {
        return this.earlyShift.map(m => m.id).includes(this.item._messenger?.id);
      } else {
        return this.item._date.getHours() < 13;
      }
    }
  }


  messengerSelected(id: string): void {
    if (id === null) {
      return;
    }
    const messenger = GC.messengers.filter(m => m.id === id)[0]

    const func = (reload: boolean) => {
      this.item._job.messenger = messenger;
      this.item._job.dispatcher = GC.dispatcher().messenger;
      setTimeout(() => {
        this.item._job
          .save(new Date().hoursDifference(this.item._date) < 2 ?
              `${messenger.nickname} fährt diese tour` :
              `${messenger.nickname} ist diese tour gefahren`,
            true
          ).subscribe({
          next: () => {
            if (reload) {
              GC.tourplan.refresh();
            } else {
              GC.tourplan.messengerSet.emit(true);
              GC.tourplan.calcSales();
            }
          },
          error: e => {
            GC.openSnackBarLong('fehler beim zuweisen (siehe konsole)');
            console.log(e);
          }
        });
      }, 100);
    }

    if (this.item.isTemplate) {
      this.item.regularJob.convert().subscribe(converted => {
        converted.creator = GC.dispatcher().messenger;
        converted.dispatcher = GC.dispatcher().messenger;
        this.item.job = converted;
        func(true);
      })
    } else if (this.item.regularJobs.length > 0) {
      this.convertMorningTour(messenger)
    } else if (this.item.convertedJobs.length > 0) {
      this.updateMorningTour(messenger);
    } else {
      func(false);
    }
  }

  updateMorningTour(messenger: Messenger): void {
    // update already-converted jobs
    zip(this.item.convertedJobs.map(j => {
      j.messenger = messenger
      j.dispatcher = GC.dispatcher().messenger;
      return j.save();
    })).subscribe(() => {
      GC.tourplan.refresh();
      GC.openSnackBarLong(`${messenger ? messenger.nickname : 'niemand'} fährt die ${GC.posttours[this.item.morningTour - 1]}`);
    })
  }

  convertMorningTour(messenger: Messenger): void {
    // convert all regularJobs of a morning tour
    zip(this.item.regularJobs.map(rj => rj.convert())).subscribe(convertedJobs => {
      // now set the selected messenger and update them once again
      zip(convertedJobs.map(j => {
        j.messenger = messenger
        j.creator = GC.dispatcher().messenger;
        j.dispatcher = GC.dispatcher().messenger;
        j.morningTour = this.item.morningTour;
        return j.save();
      })).subscribe(() => {
        // finally re-init the tourplan
        GC.openSnackBarLong(`${messenger.nickname} fährt die ${GC.posttours[this.item.morningTour - 1]}`)
        GC.tourplan.refresh();
      })
    })
  }

  resetMessenger(): void {
    if (this.item.convertedJobs.length > 0) {
      this.updateMorningTour(null);
    }
    if (this.item.isMorningTour) {
      this.item.convertedJobs.map(j => j.messenger = null)
      zip(this.item.convertedJobs.map(j => j.save())).subscribe(() => {
        GC.tourplan.calcSales();
      })
    } else {
      this.item._job.messenger = null;
      this.item._job.dispatcher = null;
      this.item._job.save('niemand fährt diese tour.').subscribe(() => {
        GC.tourplan.calcSales();
      })
    }
  }

  showToggle(): boolean {
    return this.today || !!(this.item._messenger);
  }

  messengersNotCheckedIn(): boolean {
    return this.today && this.messList.length === 0;
  }

  dispatcherNotCheckedIn(): boolean {
    return !GC.dispatcherCheckedIn();
  }

  openCheckInDialog(): void {
    GC.dialog.open(CheckInDialog, {
      data: {
        morning: false
      }
    });
  }
}
