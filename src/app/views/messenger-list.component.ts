import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {GC} from "../common/GC";
import {MessengerDialogComponent} from "../dialogs/messenger-dialog.component";
import {MatSort} from "@angular/material/sort";
import {TitleComponent} from "./app.component";
import {Messenger} from "../classes/Messenger";
import {MatMenuTrigger} from "@angular/material/menu";

@Component({
  selector: 'app-messenger-list',
  template: `
    <div class="flex p-4 w-100 justify-content-between align-items-center">
      <a (click)="saveConfig()">{{'inaktive kurier:innen ' + (hideInactive ? 'einblenden' : 'ausblenden')}}</a>
      <!--      <mat-checkbox [checked]="hideInactive()" (click)="saveConfig()">inaktive kurier:innen ausblenden</mat-checkbox>-->
      <button mat-raised-button class="fex-button" (click)="openDialog(null)">
        <i class="pr-2 bi bi-plus-circle-fill"></i>
        neue kurier:in
      </button>
    </div>
    <div class="flex flex-row flex-wrap out_container">
      <div (contextmenu)="onRightClick($event, messenger)" (click)="openDialog(messenger)"
           *ngFor="let messenger of messenger()" class="messContainer flex-column"
           [class.half-transparent]="!messenger.active && !messenger.dispatcher">
        <h3>{{messenger.nickname}}</h3>
        <span *ngIf="messenger.active">
        <i class="ml-2 bi bi-bicycle"></i> fahrer:in<br>
        </span>
        <span *ngIf="messenger.dispatcher">
        <i class="ml-2 bi bi-telephone" style="font-size: 15px"></i> disponent:in
        </span>
      </div>
    </div>
    <!-- right click menu -->
    <div class="container">
      <div style="visibility: hidden; position: fixed"
           [style.left.px]="menuTopLeftPosition.x"
           [style.top.px]="menuTopLeftPosition.y"
           [matMenuTriggerFor]="contextMenu"></div>

      <mat-menu #contextMenu="matMenu">
        <ng-template matMenuContent let-item="item">
          <right-click-menu
            [messenger]="item">
          </right-click-menu>
        </ng-template>
      </mat-menu>
    </div>
  `,
  styles: [`
    @import "../../const.scss";

    .out_container {
      margin: auto;
      width: 65vw;
      display: flex;
      justify-content: center;
    }

    .messContainer {
      border: 2px solid $fex-dark;
      background: $fex-dark;
      color: white;
      border-radius: 10px;
      padding: 13px 15px;
      width: fit-content;
      height: fit-content;
      position: relative;
      margin: 10px;
      cursor: pointer;
    }

    .half-transparent {
      opacity: 50%;
    }
  `]
})
export class MessengerListComponent extends TitleComponent implements OnInit {

  override title = 'kurier:innen';

  get hideInactive() {return GC.config?.messenger.hideInactive};

  messenger = () => {
    if (GC.config?.messenger.hideInactive) {
      return GC.messengers.filter(m => m.active || m.dispatcher);
    } else {
      return GC.messengers
    }
  };

  menuTopLeftPosition = {x: 0, y: 0}

  @ViewChild('search') search: ElementRef;
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatMenuTrigger) matMenuTrigger: MatMenuTrigger;

  constructor() {
    super();
  }

  ngOnInit(): void {
  }

  openDialog(messenger: Messenger): void {
    if (messenger) {
      messenger.openDialog();
    } else {
      GC.dialog.open(MessengerDialogComponent);
    }
  }

  saveConfig(): void {
    GC.config.messenger.hideInactive = !GC.config.messenger.hideInactive;
    GC.http.saveConfigItem('hideInactive', GC.config.messenger.hideInactive.toString()).subscribe(() => {});
  }

  onRightClick(event: MouseEvent, messenger: Messenger) {
    event.preventDefault();
    this.menuTopLeftPosition.x = event.clientX;
    this.menuTopLeftPosition.y = event.clientY;
    this.matMenuTrigger.menuData = {item: messenger}
    this.matMenuTrigger.openMenu();
  }
}
