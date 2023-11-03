import {Component, Inject, OnInit, ViewChild} from '@angular/core';
import {MatTableDataSource} from "@angular/material/table";
import {MatSort} from "@angular/material/sort";
import {MAT_DIALOG_DATA} from "@angular/material/dialog";
import {GC} from "../common/GC";
import {MatMenuTrigger} from "@angular/material/menu";
import {TourplanItem} from "../classes/TourplanItem";

@Component({
  selector: 'app-edit-posttour-dialog',
  template: `
    <h1 mat-dialog-title>
      {{data.name}}
    </h1>
    <table
      mat-table
      [dataSource]="dataSource"
      matSort
      matSortActive="date"
      matSortDirection="asc"
      class="h-100"
      style="overflow-y: scroll">
      <ng-container matColumnDef="date">
        <th mat-header-cell *matHeaderCellDef mat-sort-header style="width: 155px; text-align: right"> zeit</th>
        <td mat-cell *matCellDef="let element">
          <div class="flex flex-row justify-around align-items-center">
            <div *ngIf="element._job.finished">
              <i class="bi bi-check-circle" matTooltip="beleg vorhanden"></i>
            </div>
            <span
               [matTooltip]="'disponiert von ' + element._job.dispatcher?.nickname">
              {{element._date.timestamp()}}
            </span>
          </div>
      </ng-container>
      <ng-container matColumnDef="description">
        <th mat-header-cell *matHeaderCellDef style="width: 300px"><span class="ml-5">beschreibung</span></th>
        <td mat-cell *matCellDef="let element" class="toBottom">
          <description [item]="element" [hideHighlights]="true" [headline]="true" matDialogClose="true"></description>
        </td>
      </ng-container>
      <ng-container matColumnDef="price">
        <th mat-header-cell *matHeaderCellDef mat-sort-header class="text-center" style="width: 160px">preis</th>
        <td mat-cell *matCellDef="let element" class="text-center">
          <div *ngIf="!element.edit && element._price && element.isAbstractJob">
            <span [style.color]="element._billingTour ? 'black' : '#BBB'">{{element._price._netto}}</span>
            /
            <span [style.color]="!element._billingTour ? 'black' : '#BBB'">{{element._price._brutto}}</span>
          </div>
          {{element._job?._waitingMinutes > 0 ? '(inkl. ' + element._job?.waitingPrice?.netto + ' für ' + element._job._waitingMinutes + 'min)' : ''}}
        </td>
      </ng-container>
      <ng-container matColumnDef="messenger">
        <th mat-header-cell *matHeaderCellDef mat-sort-header style="width: 200px" class="text-center"> gefahren von
        </th>
        <td mat-cell *matCellDef="let element; let i = index" class="text-center"
            [matTooltip]="element._job.dispatcher?.nickname ? 'disponiert von ' + element.dispatcher?.nickname + '. gefahren von  ' + element.messenger?.nickname : ''">
          <messenger-selector
            (messengerSelect)="tourplan?.calcSales()"
            [checkedIn]="tourplan?.checkedIn"
            [earlyShift]="tourplan?.earlyShift"
            [lateShift]="tourplan?.lateShift"
            [item]="element">
          </messenger-selector>
        </td>
      </ng-container>
      <ng-container matColumnDef="traveldist">
        <th mat-header-cell *matHeaderCellDef mat-sort-header class="text-center" style="width: 100px"><span
          class="ml-4">streckenlänge</span></th>
        <td mat-cell *matCellDef="let element" class="text-center"> {{element._job.traveldist}} km</td>
      </ng-container>
      <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
      <tr mat-row *matRowDef="let row; columns: displayedColumns;"
          (contextmenu)="onRightClick($event, row)">
      </tr>
    </table>
    <div class="container">
      <!-- an hidden div is created to set the position of appearance of the menu-->
      <div style="visibility: hidden; position: fixed"
           [style.left.px]="menuTopLeftPosition.x"
           [style.top.px]="menuTopLeftPosition.y"
           [matMenuTriggerFor]="rightMenu"></div>

      <!-- standar material menu -->
      <mat-menu #rightMenu="matMenu">
        <ng-template matMenuContent let-item="item">
          <right-click-menu [item]="item">
          </right-click-menu>
        </ng-template>
      </mat-menu>
    </div>
  `,
  styles: []
})
export class MorningTourDialogComponent implements OnInit {

  menuTopLeftPosition = {x: 0, y: 0}
  dataSource: MatTableDataSource<TourplanItem>;
  displayedColumns: string[] = ['date', 'description', 'price', 'messenger', 'traveldist'];
  get tourplan() {return GC.tourplan}

  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatMenuTrigger) matMenuTrigger: MatMenuTrigger;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: {
      name: string,
      items: TourplanItem[]
    }
  ) {
    this.dataSource = new MatTableDataSource<TourplanItem>(data.items);
  }

  ngOnInit(): void {
  }

  onRightClick(event: MouseEvent, item: any) {
    event.preventDefault();
    this.menuTopLeftPosition.x = event.clientX;
    this.menuTopLeftPosition.y = event.clientY;
    this.matMenuTrigger.menuData = {item: item}
    this.matMenuTrigger.openMenu();
  }
}
