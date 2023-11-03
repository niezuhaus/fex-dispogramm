import {ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {MatTable, MatTableDataSource} from '@angular/material/table';
import {MatSort} from '@angular/material/sort';
import {LocationDialogComponent} from "../dialogs/location-dialog.component";
import {AreYouSureDialogComponent} from "../dialogs/are-you-sure-dialog.component";
import {MatPaginator} from "@angular/material/paginator";
import {Location} from "@angular/common";
import {ActivatedRoute} from "@angular/router";
import {GC} from "../common/GC";
import {MatMenuTrigger} from "@angular/material/menu";
import {Geolocation} from "../classes/Geolocation";
import {TitleComponent} from "./app.component";

export interface LocationFilterStrategy {
  filter(locs: Geolocation[]): Geolocation[];
}

export class FilterLocationsWithoutClient implements LocationFilterStrategy {
  filter(locs: Geolocation[]): Geolocation[] {
    return locs.filter(l => !l.clientId);
  }
}

export class FilterLocationsWithClient implements LocationFilterStrategy {
  filter(locs: Geolocation[]): Geolocation[] {
    return locs.filter(l => l.clientId);
  }
}


@Component({
  selector: 'app-location-list',
  template: `
    <div class="flex flex-row justify-content-between">
      <div class="flex flex-row p-3 w-100">
        <mat-form-field class="w-50" style="max-width: 200px">
          <mat-label>ort suchen</mat-label>
          <input
            matInput type="text"
            (ngModelChange)="applyFilter($event)"
            #input
            [(ngModel)]="searchterm">
        </mat-form-field>

        <mat-form-field #filterJobs style="width: 200px" class="ml-5">
          <mat-label>standort filtern</mat-label>
          <mat-select (valueChange)="filter(filterStrategies[$event])" [value]="-1">
            <mat-option [value]="-1">alle standorte</mat-option>
            <mat-option [value]="0">kund:innen</mat-option>
            <mat-option [value]="1">weitere standorte</mat-option>
          </mat-select>
        </mat-form-field>

        <button (click)="mergeLocations(checkedLocations)" *ngIf="checkedLocations.length > 1 && isD2"
                mat-raised-button class="ml-5 fex-button">
          ausgewählte standorte zusammenführen
        </button>
      </div>
      <div class="flex p-4 w-100 justify-content-end">
        <button (click)="openDialog()" mat-raised-button class="fex-button">
          <i class="pr-2 bi bi-plus-circle-fill"></i>
          neuer standort
        </button>
      </div>
    </div>
    <div id="tableholder">
      <table
        #table
        mat-table
        [dataSource]="dataSource"
        matSort
        [class.hidden]="!loaded">

        <ng-container matColumnDef="checked">
          <th mat-header-cell *matHeaderCellDef style="width: 40px"></th>
          <td mat-cell *matCellDef="let element">
            <mat-checkbox (change)="checkedLocations.push(element)"></mat-checkbox>
          </td>
        </ng-container>

        <ng-container matColumnDef="clientId">
          <th mat-header-cell *matHeaderCellDef mat-sort-header style="width: 80px">art</th>
          <td mat-cell *matCellDef="let element"
              [matTooltip]="element.clientId > 0 ? 'kundenseite anzeigen' : ''"
              class="text-center">
            <a *ngIf="element.clientId.length > 2" [routerLink]="['/client/', {id: element.clientId}]">
              kunde </a>
            <span *ngIf="element.clientId.length <= 2" class="mr-4">ort</span>
          </td>
        </ng-container>

        <ng-container matColumnDef="name">
          <th mat-header-cell *matHeaderCellDef style="width: 33%" mat-sort-header>name</th>
          <td mat-cell *matCellDef="let element">
            <a (click)="openDialog(element)" matTooltip="ort bearbeiten">
              <div class="w-100 h-100">
                {{element.name}}
              </div>
            </a>
          </td>
        </ng-container>

        <ng-container matColumnDef="address">
          <th mat-header-cell *matHeaderCellDef mat-sort-header>adresse</th>
          <td mat-cell *matCellDef="let element" style="white-space: nowrap"> {{element.address}} </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns;" (contextmenu)="onRightClick($event, row)"></tr>

      </table>
      <mat-paginator
        [class.hidden]="!loaded"
        [length]="1000"
        [pageSize]="rows"
        showFirstLastButtons>
      </mat-paginator>
    </div>

    <div class="container">
      <!-- an hidden div is created to set the position of appearance of the menu-->
      <div style="visibility: hidden; position: fixed"
           [style.left.px]="menuTopLeftPosition.x"
           [style.top.px]="menuTopLeftPosition.y"
           [matMenuTriggerFor]="rightMenu"></div>

      <!-- standar material menu -->
      <mat-menu #rightMenu="matMenu">
        <ng-template matMenuContent let-item="item">
          <button mat-menu-item (click)="openDialog(item)"><i
            class="p-1 bi bi-pencil bi-context"></i>bearbeiten
          </button>
          <button *ngIf="item.clientId" mat-menu-item [routerLink]="[routes.client, {id: item.clientId}]">
            <i class="p-1 bi bi-person bi-context"></i>kund:innenseite öffnen
          </button>
          <button mat-menu-item [disabled]="jobsWithLocation(item).length > 0" (click)="deleteMe(item)"><i
            class="p-1 bi bi-trash bi-context"></i>standort löschen
          </button>
        </ng-template>
      </mat-menu>
    </div>
  `,
  styles: [`
  `]
})

export class LocationListComponent extends TitleComponent implements OnInit {

  override title = 'standorte';

  loaded = false;
  rows = Math.round((window.innerHeight - 300) / 50);
  searchterm: string;

  displayedColumns: string[] = ['checked', 'clientId', 'name', 'address'];
  dataSource: MatTableDataSource<Geolocation>;
  jobsWithLocation = (loc: Geolocation) => {return GC.http.jobsWithLocation(loc)}

  filterStrategies = [new FilterLocationsWithClient(), new FilterLocationsWithoutClient()];
  checkedLocations: Geolocation[] = [];
  menuTopLeftPosition = {x: 0, y: 0}

  @ViewChild('search') search: ElementRef;
  @ViewChild('table') table: MatTable<Geolocation>;
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatMenuTrigger) matMenuTrigger: MatMenuTrigger;

  get routes() {
    return GC.routes
  }
  get isD2() {
    return GC._isDezwo
  }

  constructor(
    private cd: ChangeDetectorRef,
    private route: ActivatedRoute,
    private location: Location) {
    super();
  }

  ngOnInit(): void {
  }

  ngAfterViewInit(): void {
    GC.loaded().subscribe(() => {
      this.init()
    });
    this.cd.detectChanges();
  }

  init(): void {
    this.dataSource = new MatTableDataSource(GC.locations);
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
    this.dataSource.sortingDataAccessor = (item, property): string | number => {
      switch (property) {
        case 'clientId':
          return item.clientId ? 1 : 0;
        case 'name':
          return item.name;
        case 'address':
          return item.address;
        default:
          return property;
      }
    }
    this.route.paramMap.subscribe(params => {
      if (params.get('search')) {
        this.applyFilter(params.get('search'));
      }
    });
    this.loaded = true;

    GC.locationChanged.subscribe(() => {
      this.dataSource.data = GC.locations;
    })
  }

  filter(filter: LocationFilterStrategy) {
    if (filter === null) {
      this.dataSource.data = GC.locations;
    } else {
      this.dataSource.data = filter.filter(GC.locations);
    }
  }

  openDialog(loc?: Location): void {
    const dialog = GC.dialog.open(LocationDialogComponent, {
      data: {
        location: loc || null
      }
    });
    dialog.componentInstance.deleted.subscribe(() => {
      this.dataSource.data = GC.locations;
      dialog.close();
    })
  }

  mergeLocations(locs: Geolocation[]): void {
    const dialog = GC.dialog.open(AreYouSureDialogComponent, {
      data: {
        headline: `diese ${GC.numberLiteralsAkkusativ[locs.length]} standort zusammenfügen?`,
        verbYes: 'zusammenführen',
      }
    });

    dialog.componentInstance.confirm.subscribe(() => {
      GC.http.mergeLocations(locs).subscribe({
        next: () => {
          GC.http.getLocationList().subscribe(list => {
            GC.locations = list;
            this.init();
          });
        },
        error: msg => {
          console.log('error: ' + msg)
          GC.http.getLocationList().subscribe(list => {
            GC.locations = list;
            this.init();
          });
        }
      })
    })
  }

  deleteMe(loc: Geolocation): void {
    const dialog = GC.dialog.open(AreYouSureDialogComponent, {
      data: {
        headline: `standort "${loc.name}" löschen?`,
        verbYes: 'löschen',
        verbNo: 'abbrechen'
      }
    });
    dialog.componentInstance.confirm.subscribe(() => {
      GC.http.deleteLocation(loc).subscribe(() => {
        GC.openSnackBarLong(`"${loc.name}" wurde gelöscht.`);
        this.dataSource.data = GC.locations;
        this.dataSource.sort = this.sort;
      });
      this.checkedLocations = [];
    });
  }

  applyFilter(event?: string): void {
    if (event) {
      this.searchterm = event;
      this.location.replaceState(`${GC.routes.locations};search=${event}`);
      this.dataSource.filter = event.trim().toLowerCase();
    }
  }

  onRightClick(event: MouseEvent, item: any) {
    event.preventDefault();
    this.menuTopLeftPosition.x = event.clientX;
    this.menuTopLeftPosition.y = event.clientY;
    this.matMenuTrigger.menuData = {item: item}
    this.matMenuTrigger.openMenu();
  }
}
