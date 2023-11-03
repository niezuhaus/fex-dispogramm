import {Component, Input} from '@angular/core';
import {Messenger} from "../../../classes/Messenger";
import {GC} from "../../../common/GC";

@Component({
  selector: 'app-messenger-view',
  template: `
    <div>
      <div *ngFor="let messenger of list" class="grid-container">
        <div class="mr-2 flex flex-row">
          <a *ngIf="!messenger.shift" class="fex-warn" matTooltip="es wurde keine schicht gefunden">
            <i class="mr-2 bi bi-person-add"></i>{{messenger.nickname}}
          </a>
          <a (click)="messenger.checkout(date)" *ngIf="messenger.shift && !messenger.shift?.end">
            <i class="mr-2 bi bi-person-dash"></i>{{messenger.nickname}}
          </a>
          <a (click)="messenger.checkout(date)" *ngIf="messenger.shift?.end">
            <i class="mr-1 bi bi-check-lg"></i>{{messenger.nickname}}
          </a>
          <span *ngIf="messenger.shift">({{shiftLiterals[messenger.shift.type]}})</span>
        </div>
        <div style="min-width: 50px">
          {{messenger.sales(date)?.nettoEarly || 0}}
        </div>
        <div style="min-width: 90px" [class.invisible]="!messenger.sales(date)?.grossEarly?._netto">
          +{{messenger.sales(date)?.grossEarly || 0}} bar
        </div>
      </div>
    </div>
  `,
  styles: [
  ]
})
export class MessengerViewComponent {

  @Input() list: Messenger[];
  @Input() date: Date;

  get shiftLiterals(): string[] {
    return GC.dispatcherShiftLiterals.concat(GC.dispatcherShiftLiterals);
  }
}
