import {Injectable, Component, OnInit, ViewChild, ChangeDetectorRef} from '@angular/core';
import {MatTableDataSource} from '@angular/material/table';
import {MatPaginator, MatPaginatorIntl} from '@angular/material/paginator';
import {MatSort} from '@angular/material/sort';
import {Client} from "../../classes/Client";
import {DateAdapter} from '@angular/material/core';
import {NewClientDialogComponent} from '../../dialogs/new-client-dialog.component';
import {Subject} from "rxjs";
import {GC} from "../../common/GC";
import {ActivatedRoute} from "@angular/router";
import {Location} from "@angular/common";
import {ClientComponent} from "./client/client.component";
import {Price} from "../../classes/Price";
import {TitleComponent} from "../app.component";
import {MatMenuTrigger} from "@angular/material/menu";

@Component({
  selector: 'app-overview',
  template: `
    <div class="flex flex-row">
      <div class="flex p-3 w-100 justify-content-between align-items-center">
<!--        <button (click)="exportClients()" mat-raised-button class="fex-button">-->
<!--          <i class="pr-2 bi bi-plus-circle-fill"></i>-->
<!--          export-->
<!--        </button>-->
        <mat-form-field class="w-50" style="max-width: 400px">
          <mat-label>kund:in suchen</mat-label>
          <input
            matInput
            (ngModelChange)="applyFilter($event)"
            #input
            [(ngModel)]="searchterm">
        </mat-form-field>
      </div>
      <div class="flex p-4 w-100 justify-content-end">
        <button (click)="openDialog()" mat-raised-button class="fex-button">
          <i class="pr-2 bi bi-plus-circle-fill"></i>
          neue kund:in
        </button>
      </div>
    </div>
    <div id="tableholder">
      <table
        mat-table
        [dataSource]="dataSource"
        matSort
        matSortActive="invoiceAmount"
        matSortDirection="desc">
        <ng-container matColumnDef="clientId">
          <th mat-header-cell *matHeaderCellDef mat-sort-header style="width: 80px" class="text-center">#kund:in</th>
          <td mat-cell *matCellDef="let element" class="text-center">{{element.clientId}}</td>
        </ng-container>

        <ng-container matColumnDef="name">
          <th mat-header-cell *matHeaderCellDef mat-sort-header style="width: 33%">name</th>
          <td mat-cell *matCellDef="let element" style="padding-right: 20px"><a
            [routerLink]="['/client/', {id: element.id}]">{{element.name}}</a>
          </td>
        </ng-container>

        <ng-container matColumnDef="street">
          <th mat-header-cell *matHeaderCellDef class="text-center">adresse</th>
          <td mat-cell *matCellDef="let element" style="white-space: nowrap">{{element.street}}</td>
        </ng-container>

        <ng-container matColumnDef="invoiceAmount">
          <th mat-header-cell *matHeaderCellDef mat-sort-header style="width: 100px; text-align: center">umsatz</th>
          <td mat-cell *matCellDef="let element" style="text-align: center">
            <span *ngIf="element.billClient; else brutto">
              {{getInvoiceAmount(element)._netto}}
            </span>
            <ng-template #brutto>
              {{getInvoiceAmount(element)._brutto}}
              brutto
            </ng-template>
          </td>
        </ng-container>

        <ng-container matColumnDef="invoiceThisMonth">
          <th mat-header-cell *matHeaderCellDef class="text-center" style="width: 40px;">aktuelle rechnung</th>
          <td mat-cell *matCellDef="let element">
            <button mat-button (click)="createInvoice(element, dateAdapter.today())" matTooltip="aktuelle rechnung speichern"
               style="color: black !important;">
              <i class="bi bi-download"></i>
            </button>
          </td>
        </ng-container>

        <ng-container matColumnDef="invoiceLastMonth">
          <th mat-header-cell *matHeaderCellDef class="text-center" style="width: 40px;">letzte rechnung</th>
          <td mat-cell *matCellDef="let element">
            <a mat-button (click)="createInvoice(element, lastMonth)" matTooltip="letzte rechnung speichern"
               style="color: black !important;">
              <i class="bi bi-download"></i>
            </a>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns;" (contextmenu)="onRightClick($event, row)"></tr>
      </table>
      <mat-paginator
        [style.visibility]="loaded ? 'unset' : 'hidden'"
        [length]="1000"
        [pageSize]="rows"
        showFirstLastButtons>
      </mat-paginator>
    </div>

    <div class="p-4 position-fixed fex-dark" style="bottom: 0; width: 100vw; color: white">
      <h5>auftragsvolumen diesen monat: {{salesThisMonth.toString()}}</h5>
    </div>

    <div class="container">
      <div style="visibility: hidden; position: fixed"
           [style.left.px]="menuTopLeftPosition.x"
           [style.top.px]="menuTopLeftPosition.y"
           [matMenuTriggerFor]="rightMenu"></div>

      <mat-menu #rightMenu="matMenu">
        <ng-template matMenuContent let-item="item">
          <right-click-menu
            [client]="item">
          </right-click-menu>
        </ng-template>
      </mat-menu>
    </div>
  `,
  styleUrls: ['./client-list.component.scss']
})

export class ClientListComponent extends TitleComponent implements OnInit {

  override title = 'kund:innen';

  loaded = false;
  rows = Math.round((window.innerHeight - 350) / 50);
  searchterm: string;
  lastMonth: Date;

  displayedColumns: string[] = ['clientId', 'name', 'street', 'invoiceAmount'];
  dataSource: MatTableDataSource<Client>;
  menuTopLeftPosition = {x: 0, y: 0}

  get salesThisMonth() {return GC.salesThisMonth};

  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatMenuTrigger) matMenuTrigger: MatMenuTrigger;

  constructor(
    public dateAdapter: DateAdapter<Date>,
    private route: ActivatedRoute,
    private location: Location,
    private cd: ChangeDetectorRef
  ) {
    super();
    this.lastMonth = dateAdapter.today();
    this.lastMonth.setMonth(this.lastMonth.getMonth() - 1);
  }

  ngOnInit(): void {
  }

  ngAfterViewInit(): void {
    GC.loaded().subscribe(() => {
      this.init();
      this.cd.detectChanges();
    })
  }

  init(): void {
    this.dataSource = new MatTableDataSource(GC.clients);
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
    this.dataSource.sortingDataAccessor = (item, property): string | number => {
      switch (property) {
        case 'clientId':
          return item.clientId;
        case 'name':
          return item.name;
        case 'invoiceAmount':
          return this.getInvoiceAmount(item)._netto;
        default:
          return property;
      }
    }
    this.loaded = true;
    this.route.paramMap.subscribe(params => {
      if (params.get('search')) {
        this.searchterm = params.get('search');
        this.applyFilter(this.searchterm);
      }
    });
  }

  openDialog(): void {
    const dialog = GC.dialog.open(NewClientDialogComponent);
    dialog.componentInstance.saved.subscribe(client => {
      this.init();
    })
  }

  exportClients(): void {
    GC.http.exportClients().subscribe(xlsx => {
      const blob = new Blob([xlsx], {type: 'application/xlsx'});
      const link = document.createElement('a');
      link.download = `clients.xlsx`;
      link.href = window.URL.createObjectURL(blob);
      link.click();
    });
  }

  applyFilter(event: string): void {
    if (event !== null) {
      this.location.replaceState(`${GC.routes.clientlist};search=${event}`);
      this.dataSource.filter = event.trim().toLowerCase();
    }
  }

  createInvoice(client: Client, month: Date): void {
    return ClientComponent.createInvoice(GC.http, client, month);
  }

  getInvoiceAmount(client: Client): Price {
    if (GC.clientInvoiceAmounts.has(client.id)) {
      return GC.clientInvoiceAmounts.get(client.id);
    } else {
      return new Price();
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


@Injectable()
export class fexPaginator implements MatPaginatorIntl {
  changes = new Subject<void>();

  // For internationalization, the `$localize` function from
  // the `@angular/localize` package can be used.
  firstPageLabel = $localize`erste seite`;
  itemsPerPageLabel = $localize`zeilen pro seite:`;
  lastPageLabel = $localize`letzte seite`;

  // You can set labels to an arbitrary string too, or dynamically compute
  // it through other third-party internationalization libraries.
  nextPageLabel = 'nächste seite';
  previousPageLabel = 'vorherige seite';

  getRangeLabel(page: number, pageSize: number, length: number): string {
    if (length === 0) {
      return $localize`Page 1 of 1`;
    }
    const amountPages = Math.ceil(length / pageSize);
    return $localize`seite ${page + 1} von ${amountPages}`;
  }
}
