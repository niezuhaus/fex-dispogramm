import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {Job} from "../classes/Job";
import {Messenger} from "../classes/Messenger";
import {GC} from "../common/GC";
import {NewClientDialogComponent} from "../dialogs/new-client-dialog.component";
import {Station} from "../classes/Geolocation";
import {AreYouSureDialogComponent} from "../dialogs/are-you-sure-dialog.component";
import {Client} from "../classes/Client";
import {Shift} from "../classes/Shift";
import {NewExpenseDialogComponent} from "../dialogs/new-expense-dialog.component";
import {SpecialPrice} from "../classes/SpecialPrice";
import {CheckInDialog} from "../dialogs/shifts-dialog/check-in-dialog.component";
import {TourplanItem} from "../classes/TourplanItem";
import {Zone} from "../classes/Zone";

@Component({
  selector: 'right-click-menu',
  template: `
    <button *ngIf="!dispatcher && !price" mat-menu-item>
      <i
        class="whitespace-pre-wrap"
        style="line-height: 19px"
        (click)="openChangeUserDialog()">
        bitte als disponent:in einchecken um optionen freizuschalten
      </i>
    </button>

    <button mat-menu-item *ngIf="date && dispatcher && weekplan" (click)="newTour(date)">
      <i class="p-1 bi bi-plus-circle bi-context"></i>
      <span>
        neue tour
      </span>
    </button>
    <button mat-menu-item *ngIf="date && dispatcher && weekplan" (click)="newNote.emit(date)">
      <i class="p-1 bi bi-sticky bi-context"></i>
      <span>
        neue notiz
      </span>
    </button>

    <!-- job -->
    <div *ngIf="item?.job">
      <button mat-menu-item>
        <div class="flex flex-row justify-around w-100">
          <div
            class="colour"
            *ngFor="let c of colours"
            [style.background]="c.showColour"
            (click)="item._colour = c.showColour"
            [class.selected-colour]="c.showColour === item?.job?.colour">
          </div>
        </div>
      </button>
      <button *ngIf="!item.edit && !item.job.finished" mat-menu-item [disabled]="!dispatcher"
              (click)="item.edit = true; editJob.emit(item.job)">
        <i class="p-1 bi bi-pencil bi-context"></i>bearbeiten
      </button>
      <button *ngIf="item.edit" mat-menu-item (click)="item.edit = false; editJob.emit(undefined)">
        <i class="p-1 bi bi-x-circle bi-context"></i>bearbeitung abbrechen
      </button>
      <button *ngIf="item.job.regularJobId" mat-menu-item (click)="item.job.openEditDialog()">
        <i class="p-1 bi bi-journal-check bi-context"></i>festtour bearbeiten
      </button>
      <button *ngIf="item.job.hasClient; else newClient" mat-menu-item
              [routerLink]="[routes.client, {id: item.job.client.id}]" (click)="closeDialogs()">
        <i class="p-1 bi bi-person bi-context"></i>kund:innenseite öffnen
      </button>
      <ng-template #newClient>
        <button mat-menu-item *ngIf="!item.job.client?.clientId" (click)="openNewClientDialog()">
          <i class="p-1 bi bi-person-plus bi-context"></i>kund:in hinzufügen
        </button>
      </ng-template>
      <button *ngIf="tourplanActive && !item.job.finished" mat-menu-item [matMenuTriggerFor]="messengerMenu"
              [disabled]="!dispatcher">
        <i class="p-1 bi bi-bicycle bi-context"></i>kurier:in zuweisen
      </button>
      <mat-menu #messengerMenu="matMenu">
        <button *ngFor="let messenger of messengerToday; let i = index"
                mat-menu-item
                (click)="''">
          <span *ngIf="messenger.fexNumber"
                class="mr-2 phoneNumber">
            {{messenger.fexNumber}}
          </span>
          {{messenger.nickname}}
        </button>
      </mat-menu>
      <button mat-menu-item (click)="$event.stopPropagation()" [disabled]="!dispatcher">
        <div class="flex justify-content-between">
          <i class="p-1 bi bi-hourglass-split bi-context"></i>wartezeit eintragen
          <mat-form-field class="ml-3">
            <input
              [disabled]="!dispatcher"
              #minutes
              matInput
              type="number"
              style="width: 50px"
              [(ngModel)]="item.job._waitingMinutes"
              (change)="waitingMinutes.emit(item.job)"
              (click)="minutes.select()">
          </mat-form-field>
        </div>
      </button>
      <button mat-menu-item *ngIf="!item.job.finished" (click)="openNewExpenseDialog()" [disabled]="!dispatcher">
        <i class="p-1 bi bi-cash-coin bi-context"></i>auslage hinzufügen
      </button>
      <button mat-menu-item
              *ngIf="!item.job.finished"
              (click)="item.job._falseArrival = !item.job._falseArrival; falseArrival.emit(item.job)"
              [disabled]="!dispatcher">
        <i [class.bi-x-square]="!item.job._falseArrival"
           [class.bi-check-square]="item.job._falseArrival"
           class="p-1 bi bi-context"></i>
        {{item.job._falseArrival ? 'nicht als fehlanfahrt markieren' : 'als fehlanfahrt markieren'}}
      </button>
      <button mat-menu-item *ngIf="item.job.regularJobId && item.job._canceled && !item.job.finished"
              (click)="item.job._canceled = false" [disabled]="!dispatcher">
        <i class="p-1 bi bi-calendar-check bi-context"></i>festtour doch nicht absagen
      </button>
      <button mat-menu-item *ngIf="item.job.regularJobId && !item.job._canceled && !item.job.finished"
              (click)="item.job._canceled = true" [disabled]="!dispatcher">
        <i class="p-1 bi bi-calendar-check bi-context"></i>festtour heute absagen
      </button>
      <button mat-menu-item (click)="item.job.reverse()" *ngIf="!item.job.finished && !item.isConverted" [disabled]="!dispatcher">
        <i class="p-1 bi bi-arrow-repeat bi-context"></i>tour umdrehen
      </button>
      <button *ngIf="!item.job.finished" mat-menu-item
              (click)="item.job._finished = true" [disabled]="!dispatcher">
        <i class="p-1 bi bi-lock bi-context"></i>tour abschließen
      </button>
      <button *ngIf="item.job.finished" mat-menu-item [disabled]="!dispatcher"
              (click)="item.job._finished = false">
        <i class="p-1 bi bi-unlock bi-context"></i>abgeschlossene tour öffnen
      </button>
      <button mat-menu-item *ngIf="!item.job.finished && !item.isRegularJob"
              (click)="item.job.delete('löschen', 'gelöscht')">
        <i class="p-1 bi bi-trash bi-context"></i>tour löschen
      </button>
      <button mat-menu-item *ngIf="!item.job.finished && item.isRegularJob"
              (click)="item.job.delete('zurücksetzen', 'zurückgesetzt')">
        <i class="p-1 bi bi-trash bi-context"></i>tour zurücksetzen
      </button>
    </div>

    <!-- regularJob -->
    <div *ngIf="item?.isTemplate">
      <button mat-menu-item>
        <div class="flex flex-row justify-around w-100">
          <div
            class="colour"
            *ngFor="let c of colours"
            [style.background]="c.showColour"
            (click)="item.regularJob.setColor(c.showColour)"
            [class.selected-colour]="c.showColour === item?.job?.colour">
          </div>
        </div>
      </button>
      <button *ngIf="item._job.client?.id?.length > 0" mat-menu-item
              [routerLink]="[routes.client, {id: item._job.client.id}]" (click)="closeDialogs()">
        <i class="p-1 bi bi-person bi-context"></i>kund:innenseite öffnen
      </button>
      <button mat-menu-item (click)="item.regularJob.openEditDialog()" [disabled]="!dispatcher">
        <i class="p-1 bi bi-journal-check bi-context"></i>festtour bearbeiten
      </button>
      <button mat-menu-item #trigger="matMenuTrigger" [matMenuTriggerFor]="morningTourMenu">
        <i class="p-1 bi bi-signpost-split bi-context"></i>in morgenrunde verschieben
      </button>
      <mat-menu #morningTourMenu="matMenu">
        <button mat-menu-item (click)="item.regularJob._morningTour = 0"><i>- keine -</i></button>
        <button *ngFor="let morningTour of morningTours; let i = index"
                mat-menu-item
                (click)="item.regularJob._morningTour = i + 1">
          {{morningTour}}
        </button>
      </mat-menu>
      <button mat-menu-item (click)="item.regularJob.cancel()" [disabled]="!dispatcher">
        <i class="p-1 bi bi-calendar-x bi-context"></i>festtour heute absagen
      </button>
      <button mat-menu-item (click)="item.regularJob.cancelRange()" [disabled]="!dispatcher">
        <i class="p-1 bi bi-calendar-range bi-context"></i>festtour für mehrere tage absagen
      </button>
      <button mat-menu-item (click)="item.regularJob.cancelPermanently()" [disabled]="!dispatcher">
        <i class="p-1 bi bi-x-circle bi-context"></i>festtour permanent streichen
      </button>
    </div>

    <!-- morningtour -->
    <div *ngIf="item?.isMorningTour">
      <button mat-menu-item style="width: 250px">
        <div class="flex flex-row justify-around w-100">
          <div
            class="colour"
            *ngFor="let c of colours"
            [style.background]="c.showColour"
            (click)="item._colour = c.showColour"
            [class.selected-colour]="c.showColour === item?._colour">
          </div>
        </div>
      </button>
    </div>

    <!-- note -->
    <div *ngIf="item?.note">
      <button *ngIf="!item.edit" mat-menu-item (click)="item.edit = true;">
        <i class="p-1 bi bi-pencil bi-context"></i>bearbeiten
      </button>
      <button mat-menu-item (click)="item.note.delete()">
        <i class="p-1 bi bi-trash bi-context"></i>notiz löschen
      </button>
    </div>

    <!-- client -->
    <div *ngIf="client">
      <button mat-menu-item
              [routerLink]="[routes.client, {id: client.id}]">
        <i class="p-1 bi bi-person bi-context"></i>kund:innenseite öffnen
      </button>
      <button mat-menu-item *ngIf="isDezwo" (click)="client.delete()">
        <i class="p-1 bi bi-trash bi-context"></i>kund:in löschen
      </button>
    </div>

    <!-- shift -->
    <div *ngIf="shift">
      <button mat-menu-item (click)="shift.openDialog()"><i class="p-1 bi bi-search bi-context"></i>
        ansehen
      </button>
      <button *ngIf="!shift.edit" mat-menu-item (click)="shift.edit = true">
        <i class="p-1 bi bi-pencil bi-context"></i>bearbeiten
      </button>
      <button *ngIf="shift.edit" mat-menu-item (click)="shift.edit = false">
        <i class="p-1 bi bi-x-circle bi-context"></i>bearbeitung abbrechen
      </button>
      <button mat-menu-item (click)="shift.delete()">
        <i class="p-1 bi bi-trash bi-context"></i>schicht löschen
      </button>
    </div>

    <!-- specialprice -->
    <div *ngIf="price">
      <button mat-menu-item (click)="price.delete()">
        <i class="p-1 bi bi-trash bi-context"></i>sonderpreis löschen
      </button>
      <button mat-menu-item (click)="price.print()">
        <i class="p-1 bi bi-trash bi-context"></i>sonderpreis drucken
      </button>
    </div>

    <!-- zone -->
    <div *ngIf="zone">
      <button mat-menu-item (click)="zone.delete()">
        <i class="p-1 bi bi-trash bi-context"></i>zone löschen
      </button>
    </div>

    <!-- messenger -->
    <div *ngIf="messenger">
      <button mat-menu-item (click)="messenger.delete()"><i class="p-1 bi bi-trash bi-context"></i>löschen</button>
    </div>

    <button mat-menu-item *ngIf="item && isDezwo" (click)="print()">
      <i class="p-1 bi bi-printer bi-context"></i>auf konsole ausgeben
    </button>

    <button
      *ngIf="!date && !messenger && !item?.isJob && !item?.isTemplate && !item?.isNote && !client && !shift && !price && !zone"
      mat-menu-item>
      <i>- keine optionen verfügbar -</i>
    </button>
  `,
  styles: [`
    @import "/src/const.scss";

    .colour {
      width: 30px;
      height: 30px;
      border-radius: 15px;
      border: 2px solid white;
      outline: 2px solid $gray;
    }

    .selected-colour {
      border: 2px solid white;
      outline: 3px solid #494949;
    }
  `]
})
export class RightClickMenuComponent implements OnInit {

  @Input() messenger: Messenger;
  @Input() item: TourplanItem;
  @Input() job: Job;
  @Input() client: Client;
  @Input() shift: Shift;
  @Input() price: SpecialPrice;
  @Input() zone: Zone;
  @Input() weekplan: Boolean;
  @Input() date: Date;

  @Output() itemDeleted = new EventEmitter<boolean>()
  @Output() editJob = new EventEmitter<Job>();
  @Output() newNote = new EventEmitter<Date>();
  @Output() falseArrival = new EventEmitter<Job>();
  @Output() waitingMinutes = new EventEmitter<Job>();

  colours: { showColour: string, code: string, selected: boolean }[] = [
    {showColour: '#ffffff00', code: '#ffffff00', selected: false},
    {showColour: '#FF6FB5', code: '#f5e6e0', selected: false},
    {showColour: '#FCF69C', code: '#b2e3c5', selected: false},
    {showColour: '#55D8C1', code: '#f3ebd2', selected: false},
    {showColour: '#AB46D2', code: '#f1cbcb', selected: false},
  ]

  get routes() {return GC.routes};
  get tourplan() {return GC.tourplan};
  get tourplanActive() {return GC.tourplanActive};
  get isDezwo() {return GC._isDezwo};
  get morningTours() {return GC.posttours};
  get dispatcher() {return GC.dispatcherCheckedIn()};
  get messengerToday() {return GC.messengerToday};
  get shiftLiterals() {return GC.dispatcherShiftLiterals.concat(GC.messengerShiftLiterals)}

  constructor() {
  }

  ngOnInit() {
    if (!this.item) {
      if (this.job) {
        this.item = new TourplanItem({job: this.job});
      }
    } else {
    }
  }

  newTour(date: Date): void {
    GC.router.navigate([GC.routes.newTour, {time: date.toISOString()}])
  }

  print(): void {
    console.log(this.item);
  }

  closeDialogs(): void {
    GC.dialog.closeAll();
  }

  openNewClientDialog(): void {
    const dialog = GC.dialog.open(NewClientDialogComponent, {
      data: {
        location: this.item._job.center
      }
    });
    dialog.componentInstance.saved.subscribe(client => {
      const newDialog = GC.dialog.open(AreYouSureDialogComponent, {
        data: {
          headline: 'soll die aktuelle tour als rechnungstour markiert werden?',
          verbYes: 'ja',
          verbNo: 'nein'
        }
      })
      newDialog.componentInstance.confirm.subscribe(() => {
        this.item._job.client = client.c;
        this.item._job.center = client.l as Station;
        this.item._job.billingTour = true;
        this.item._job.init().save('kund:in wurde hinzugefügt').subscribe(() => {
          GC.tourplan.refresh();
        })
      })
    })
  }

  openNewExpenseDialog(): void {
    GC.dialog.open(NewExpenseDialogComponent, {
      data: {
        job: this.item.job
      }
    });
  }

  openChangeUserDialog(): void {
    GC.dialog.open(CheckInDialog);
  }
}
