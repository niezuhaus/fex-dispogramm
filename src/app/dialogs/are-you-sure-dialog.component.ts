import {Component, EventEmitter, Inject, ViewChild} from '@angular/core';
import {MAT_DIALOG_DATA} from "@angular/material/dialog";
import {MatButton} from "@angular/material/button";
import {Job} from "../classes/Job";
import {Messenger} from "../classes/Messenger";

@Component({
  selector: 'app-are-you-sure-dialog',
  template: `
    <div class="flex flex-row">
      <div *ngIf="data.warning" class="mr-3 flex fex-warn">
        <i class="bi bi-exclamation-triangle" style="font-size: 30px"></i>
      </div>
      <div>
        <h1 mat-dialog-title [innerHTML]="data.headline" style="max-width: 450px"></h1>
        <h6>{{data.text}}</h6>
      </div>
    </div>
    <description
      class="mb-2 ml-3"
      *ngIf="data.job"
      [hideTimeAlarms]="true"
      [job]="data.job"
      [headline]="true"
      [hideToolTips]="true"
      [hideHighlights]="true"
      matDialogClose
      [hideHints]="true"></description>
    <searchinput
      *ngIf="data.messSearch"
      (resetted)="messenger = null"
      [keepMessName]="true"
      [searchMessenger]="true"
      (messengerSelected)="messenger = $event"
      [label]="'kurier:in'"
      class="mt-4"
    ></searchinput>
    <div class="mt-4 justify-content-around">
      <div class="flex flex-row justify-content-around">
        <div class="flex flex-row justify-content-between" style="width: 100%;">
          <button
            #yes
            mat-raised-button
            class="fex-button"
            [class.fex-button-try]="!data.highlightNo && !data.warning"
            [class.fex-button-warn]="data.warning"
            [class.fex-button-abort]="data.highlightNo && !data.warning"
            [class.transparent]="!data.verbYes"
            (click)="confirm.emit(messenger || true);"
            matDialogClose>
            {{data.verbYes ? messenger ? messenger?.nickname + ' festlegen' : data.verbYes : 'ja'}}
          </button>
          <button
            #no
            mat-raised-button
            [autofocus]="data.highlightNo"
            class="fex-button"
            [class.fex-button-try]="data.highlightNo"
            [class.fex-button-abort]="!data.highlightNo"
            [class.transparent]="!data.verbNo"
            (click)="cancel.emit(true)"
            matDialogClose
            [type]="'submit'"
          >
            {{data.verbNo ? data.verbNo : 'abbrechen'}}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    * {
      display: flex;
      flex-direction: column;
    }
  `]
})
export class AreYouSureDialogComponent {

  confirm = new EventEmitter<boolean | Messenger>();
  cancel = new EventEmitter<boolean>();
  messenger: Messenger;

  @ViewChild('yes') yes: MatButton;
  @ViewChild('no') no: MatButton;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: {
      headline: string,
      text: string,
      verbYes: string,
      verbNo: string,
      highlightNo: boolean,
      job: Job,
      messSearch: boolean,
      warning: boolean,
    }) {
  }
}
