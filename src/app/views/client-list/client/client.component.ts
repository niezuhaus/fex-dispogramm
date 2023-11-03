import {AfterViewInit, Component, EventEmitter, OnInit, ViewChild} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {HttpService} from '../../../http.service';
import {Observable, zip} from 'rxjs';
import {Contact} from "../../../classes/Contact";
import {Job, RegularJob} from "../../../classes/Job";
import {MatTable, MatTableDataSource} from '@angular/material/table';
import {DateAdapter} from '@angular/material/core';
import {MatSort} from "@angular/material/sort";
import {AreYouSureDialogComponent} from "../../../dialogs/are-you-sure-dialog.component";
import {GC} from "../../../common/GC";
import {map} from "rxjs/operators";
import {Price} from "../../../classes/Price";
import {Location} from "@angular/common";
import {MatMenuTrigger} from "@angular/material/menu";
import {Geolocation} from "../../../classes/Geolocation";
import {AsyncTitleComponent} from "../../app.component";
import {Client} from "../../../classes/Client";
import {LexContact, LexInvoice} from "../../../classes/LexInvoice";

@Component({
  selector: 'app-client',
  templateUrl: 'client.component.html',
  styleUrls: ['client.component.scss']
})

export class ClientComponent extends AsyncTitleComponent implements OnInit, AfterViewInit {

  override titleEmitter = new EventEmitter<string>();
  override title = '';

  client: Client;
  lexContact: LexContact;
  clientBackup: Client = null;
  locations: Geolocation[];
  contacts: Contact[] = [];
  jobs: Job[];
  sum = new Price();
  regularJobs: RegularJob[] = [];

  date: Date;
  years: number[] = [];
  dataSource: MatTableDataSource<Job>;
  displayedColumns: string[] = ['date', 'description', 'traveldist', 'price'];
  monthsSelection: number;
  yearSelection: number;
  loading = true;
  loadingTours = false;
  menuTopLeftPosition = {x: 0, y: 0};

  get totalSum() {
    const rjs = this.regularJobs
      .filter(rj => this.date.isBefore(rj.startDate) && (!rj.endDate || this.date.monthStart().isBefore(rj.endDate)))
      .reduce((pv, cv) => pv.add(cv.monthlyPrice), new Price())
    return this.sum._add(rjs)
  };

  get routes() {
    return GC.routes
  };

  get isDezwo() {
    return GC._isDezwo
  };

  get config() {
    return GC.config
  };

  @ViewChild(MatSort) sort: MatSort;
  @ViewChild("table") table: MatTable<Job>;
  @ViewChild(MatMenuTrigger) matMenuTrigger: MatMenuTrigger;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private dateAdapter: DateAdapter<Date>,
    private location: Location,) {
    super();
  }

  ngOnInit(): void {
    this.date = new Date().monthStart();
    for (let i = 2019; i <= this.date.getFullYear(); i++) {
      this.years.push(i);
    }
    this.monthsSelection = this.date.getMonth();
    this.yearSelection = this.date.getFullYear();
  }

  ngAfterViewInit(): void {
    this.route.paramMap
      .subscribe(params => {
        GC.loaded().subscribe(() => {
          GC.http.getClient(params.get('id'))
            .subscribe({
              next: client => {
                if (GC.config.lexofficeActivated) {
                  GC.http.lex_findClient(client).subscribe(c => {
                    this.lexContact = c;
                  })
                }
                this.clientBackup = JSON.parse(JSON.stringify(client));
                this.client = client;
                this.titleEmitter.emit(client.name)
                this.title = client.name
                this.query(this.date);
              },
              error: (error) => {
                console.log(error);
              }
            });
        });
      });
  }

  query(date: Date): void {
    this.date = date;
    this.loadingTours = true;
    GC.http.jobsForClientInMonth(this.client.id, date).subscribe({
      next: jobs => {
        this.getRegularJobs().subscribe(rjs => {
          this.regularJobs = rjs;
        })
        this.jobs = jobs.filter(j => !j.regularJobId);
        this.dataSource = new MatTableDataSource(this.jobs);
        this.dataSource.sort = this.sort;
        this.dataSource.sortingDataAccessor = (item, property): string | number => {
          switch (property) {
            case 'date':
              return new Date(item.date).getTime();
            case 'traveldist':
              return item.traveldist;
            case 'price':
              return item.price._netto;
            default:
              return property;
          }
        }
        this.sum = new Price();
        jobs.filter(j => !j.regularJobId).forEach(j => {
          this.sum.add(j.price);
        })
        this.loadingTours = false;
        this.getLocations();
      },
      error: err => {
        console.log(err)
      }
    })
  }

  getLocations(): void {
    GC.http.getLocationsByClientId(this.client.id).subscribe(locs => {
      this.locations = locs;
      this.loading = false;
    });
  }

  getContacts(): void {
    GC.http.getContactsForClient(this.client).subscribe(contacts => {
      this.contacts = contacts;
    });
  }

  getRegularJobs(): Observable<RegularJob[]> {
    return GC.http.getRegularJobListForClient(this.client.id).pipe(
      map(rjs => {
        this.regularJobs = rjs;
        return rjs;
      })
    );
  }

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.data = this.jobs.filter(j => {
      return j.contains(filterValue)
    })

  }

  streetSelected(loc: Geolocation): void {
    this.client.street = loc.street;
    this.client.zipCode = loc.zipCode;
    this.client.city = loc.city;
  }

  saveClient(): void {
    let calls: Observable<any>[] = [GC.http.updateClient(this.client)];
    if (GC.config.lexofficeActivated) {
      calls.push(GC.http.lex_updateContact(this.lexContact.setClient(this.client)))
    }
    zip(calls).subscribe(() => {
      GC.openSnackBarLong(`${this.client.name} wurde gespeichert!`);
      this.location.back();
    });
  }

  createInvoiceWrapper(): void {
    return ClientComponent.createInvoice(GC.http, this.client, this.date);
  }

  static createInvoice(http: HttpService, client: Client, month: Date): void {
    const start = new Date(month.getFullYear(), month.getMonth(), 1);
    const end = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    end.setHours(23);
    end.setMinutes(59);
    end.setSeconds(59);
    http.createInvoice(client.id, start, end).subscribe(invoice => {
      http.getInvoicePDF(invoice.id).subscribe(pdf => {
        const blob = new Blob([pdf], {type: 'application/pdf'});
        const link = document.createElement('a');
        link.download = `${start.getFullYear()}-${start.getMonth() + 1}-rechnung-${client.name.toLowerCase()}.pdf`;
        link.href = window.URL.createObjectURL(blob);
        link.click();
      });
    })
  }

  deleteJob(job: Job): void {
    const dialog = GC.dialog.open(AreYouSureDialogComponent, {
      data: {
        headline: 'möchtest du diesen auftrag wirklich löschen?',
        verbYes: 'löschen',
        verbNo: 'abbrechen',
        highlightNo: true,
      }
    });
    dialog.componentInstance.confirm.subscribe(() => {
      GC.http.deleteJob(job).subscribe(() => {
        GC.openSnackBarLong('auftrag wurde gelöscht.');
        this.query(this.date);
      });
    });
  }

  deleteClient(): void {
    const dialog = GC.dialog.open(AreYouSureDialogComponent, {
      data: {
        headline: `
            <span style="white-space: nowrap">
                achtung! möchtest du <span class="fex-accent">${this.client.name}</span> wirklich löschen?
            </span>
`,
        verbYes: 'löschen',
        verbNo: 'abbrechen',
        highlightNo: true,
      }
    });
    dialog.componentInstance.confirm.subscribe(() => {
      GC.http.deleteClient(this.client).subscribe(() => {
        GC.openSnackBarLong(`${this.client.name} wurde gelöscht!`);
        this.location.back();
      });
    });
  }

  onRightClick(event: MouseEvent, item: any) {
    event.preventDefault();
    this.menuTopLeftPosition.x = event.clientX;
    this.menuTopLeftPosition.y = event.clientY;
    this.matMenuTrigger.menuData = {item: item}
    this.matMenuTrigger.openMenu();
  }

  lexInvoice(): void {
    GC.http.lex_createInvoice(new LexInvoice({
      date: new Date(),
      client: this.client,
      jobs: this.jobs,
      xRechnung: false,
      lexContact: this.lexContact,
    })).subscribe({
        next: response => {
          GC.openSnackBarLong(`rechnung über einen betrag von ${this.jobs.map(j => j.price._netto).sum()} erstellt.`)
        },
        error: (e) => {
          console.log(e.error.message);
        }
      }
    )
  }

  getInvoices(client: LexContact): void {
    GC.http.lex_getInvoices(client, 0).subscribe(invoices => {
      console.log('now')
      console.log(invoices.content)
    })
  }

  createMe(): void {
    GC.http.lex_createContact(this.client).subscribe(id => {
      console.log(id);
    });
  }
}
