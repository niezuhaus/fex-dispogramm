import {AfterViewInit, ChangeDetectorRef, Component, EventEmitter, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {Job} from "../../classes/Job";
import {MatTable, MatTableDataSource} from '@angular/material/table';
import {MatSort} from '@angular/material/sort';
import {Location} from '@angular/common';
import {DatepickerComponent} from '../datepicker.component';
import {ActivatedRoute} from '@angular/router';
import {GC, ShiftType} from "../../common/GC";
import {MatPaginator} from "@angular/material/paginator";
import {SearchinputComponent} from "../newtour/inputfield/searchinput/searchinput.component";
import {Price} from "../../classes/Price";
import {MatMenuTrigger} from "@angular/material/menu";
import {Shift} from "../../classes/Shift";
import {TitleComponent} from "../app.component";
import {Note} from "../../classes/Note";
import {Messenger} from "../../classes/Messenger";
import {TourplanItem} from "../../classes/TourplanItem";
import {
  FilterAdhocJobs,
  FilterCargoBikeJobs,
  FilterCargoJobs,
  FilterCarlaCargoJobs,
  FilterCashJobs,
  FilterNotes,
  FilterOpenJobs,
  FilterPrePlannedJobs,
  FilterRegularJobs
} from "./FilterStrategies";

@Component({
  selector: 'tourplan',
  templateUrl: './tourplan.component.html',
  styleUrls: ['./tourplan.component.scss']
})

export class TourplanComponent extends TitleComponent implements OnInit, AfterViewInit, OnDestroy {

  override title = 'tourenzettel';

  // model data
  date = new Date();
  note = new Note();
  items: TourplanItem[] = [];
  dataSource: MatTableDataSource<TourplanItem>;

  sumNetto = new Price();
  sumBrutto = new Price();

  // ui constants
  displayedColumns: string[] = ['number', 'date', 'description', 'price', 'messenger', 'traveldist'];

  // state variables
  clicked = false;
  loaded = false;
  hoursInAdvance = 0;
  menuTopLeftPosition = {x: 0, y: 0};
  noteVisible = false;
  editJob: Job;

  // events
  messengerSet = new EventEmitter<boolean>();

  // filter
  filterStrategies = [
    new FilterCashJobs(),
    new FilterPrePlannedJobs(),
    new FilterAdhocJobs(),
    new FilterRegularJobs(),
    new FilterCargoJobs(),
    new FilterCargoBikeJobs(),
    new FilterCarlaCargoJobs(),
    new FilterOpenJobs(),
    new FilterNotes(),
  ];

  get jobs() {return this.isToday ? GC.jobsToday : GC.jobsAnyDay;};
  set jobs(jobs: Job[]) {this.isToday ? GC.jobsToday = jobs : GC.jobsAnyDay = jobs;};

  get shifts() {return this.isToday ? GC.shiftsToday : GC.shiftsAnyDay;}
  set shifts(shifts: Shift[]) {this.isToday ? GC.shiftsToday = shifts : GC.shiftsAnyDay = shifts;}

  get shiftsWithoutEnd(): Shift[] {return this.shifts.filter(s => !s.end);}
  get checkedIn(): Messenger[] {return this.shiftsWithoutEnd.filter(s => GC.tourplanShiftTypes.includes(s.type)).map(s => s.messenger);}
  get messenger(): Messenger[] {return this.shifts.map(s => s.messenger)};
  get dispoEarly(): Messenger[] {return this.shifts.filter(s => {return s.type === ShiftType.dispoEarly}).map(s => s.messenger)}
  get dispoLate(): Messenger[] {return this.shifts.filter(s => {return s.type === ShiftType.dispoLate}).map(s => s.messenger)}
  get earlyShift(): Messenger[] {return this.shifts.filter(s => ([ShiftType.early, ShiftType.zwischi, ShiftType.double, ShiftType.kitaH].includes(s.type))).map(s => s.messenger);}
  get lateShift(): Messenger[] {return this.shifts.filter(s => ([ShiftType.late].includes(s.type))).map(s => s.messenger);}
  get messengerData() {return GC.messengerData(this.date);}

  get isToday() {return this.date.isToday()};
  get config() {return GC.config};
  get globallyLoaded() {return GC.fullyLoaded};
  get dispatcherCheckedIn() {return GC.dispatcherCheckedIn()};
  get shiftLiterals() {return GC.dispatcherShiftLiterals.concat(GC.messengerShiftLiterals)};
  get filterStatus() {return GC.config.tourplan.filterStatus};

  @ViewChild(MatSort) sort: MatSort;
  @ViewChild('datepicker') datepicker: DatepickerComponent;
  @ViewChild('table') table: MatTable<Job>;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild('fastJobInput') jobInput: SearchinputComponent;
  @ViewChild(MatMenuTrigger) matMenuTrigger: MatMenuTrigger;

  constructor(
    private location: Location,
    private route: ActivatedRoute,
    private cd: ChangeDetectorRef,
  ) {
    super();
    GC.tourplan = this;
  }

  ngOnInit(): void {
    GC.messengersChanged.subscribe(() => {
      this.refresh();
    })
  }

  ngAfterViewInit(): void {
    GC.loaded().subscribe(() => {
      this.loaded = true;
      this.route.paramMap.subscribe(params => {
        if (!params.get('date')) {
          this.date = new Date().nextWorkingDay();
          this.location.replaceState(`${GC.routes.tourplan};date=${this.date.yyyymmdd()}`);
        } else {
          this.date.setDateByString(params.get('date'));
          this.note.date.setDateByString(params.get('date'));
        }
        GC.config.tourplan.filterStatus.forEach((bool, i) => {
          this.filterStrategies[i].selected = bool;
        })
        this.refresh();
        this.cd.detectChanges();
        GC.refreshNeeded.subscribe(() => {
          this.refresh();
        })
      });
    });
  }

  ngOnDestroy() {
    GC.tourplanActive = false;
  }

  refresh(): void {
    this.loaded = false;
    this.noteVisible = false;
    this.date.copyTime(new Date());
    this.note.text = '';
    this.note.date.copyDate(this.date);
    GC.shiftsAnyDay = [];

    GC.http.tourplanItemsForDay(this.date).subscribe({
      next: data => {
        this.items = data.items;
        this.jobs = data.jobs;
        this.sumNetto._netto = this.jobs.filter(j => j.messenger && j.billingTour).map(j => j.price._netto).sum();
        this.sumBrutto._netto = this.jobs.filter(j => j.messenger && !j.billingTour).map(j => j.price._netto).sum();

        // filter out all the regularJobs that are too far in the future
        if (this.isToday) {
          this.items = this.items.filter(i => {
            return !(i.isRegularJob && i._date.getHours() > this.date.getHours() + GC.config.tourplan.HOURS_IN_ADVANCE)
          });
        }
        // setting up the table
        if (!this.dataSource) {
          this.dataSource = new MatTableDataSource(this.items);
          this.cd.detectChanges();
        } else {
          this.dataSource.data = this.items;
        }
        this.filterJobsByKeyword();
        this.dataSource.sort = this.sort;
        // with its sorting data accessor
        this.dataSource.sortingDataAccessor = (item, property): string | number => {
          switch (property) {
            case 'date':
              return item._date.getTime();
            case 'description':
              return item._name;
            case 'messenger':
              return item.job?.messenger ? item.job?.messenger.nickname : '';
            case 'traveldist':
              return item.job?.traveldist;
            case 'price':
              return item._price._netto;
            default:
              return property;
          }
        }

        if (!this.date.isToday()) {
          GC.http.getShiftsForDay(this.date).subscribe(shifts => {
            this.shifts = shifts;
            this.calcSales();
            this.loaded = true;
            GC.tourplanActive = true;
          });
        } else {
          this.calcSales();
          this.loaded = true;
          GC.tourplanActive = true;
        }
      },
      error: err => {
        GC.openSnackBarLong('fehler beim laden der aufträge')
        console.error(err);
      }
    });
  }

  createNewJob(job: Job) {
    if (GC._dispatcher === null) {
      GC.openSnackBarLong('bitte erst als disponent:in einchecken!');
      this.jobInput.reset();
      return;
    }
    job.init().exportData();
    job.creationDate = new Date().copyDate(this.date);
    job.date = job.creationDate.copy();
    job.creator = GC._dispatcher.messenger;
    job.finished = false;
    job.description = '';
    job.save('neuer auftrag wurde angelegt!').subscribe(job => {
      if (job) {
        this.jobInput.reset();
        this.refresh();
        GC.dispatcherChanged.subscribe(() => {
          setTimeout(() => {
            this.jobInput.setFormControls()
          }, 0)
        })
      }
    })
  }

  createNote(): void {
    this.note.creator = GC.dispatcher().messenger;
    GC.http.saveNote(this.note).subscribe(() => {
      GC.openSnackBarShort('notiz gespeichert!');
      this.noteVisible = false;
      this.note.text = '';
      this.refresh()
    });
  }

  calcSales(): void {
    this.messengerData.clear();

    this.jobs.filter(i => i.messenger).forEach((job) => {
      if (this.messengerData.has(job.messenger.id)) {
        this.messengerData.get(job.messenger.id).jobs.push(job)
      } else {
        this.messengerData.set(job.messenger.id, {jobs: [job], sales: null, dates: null})
      }
    });
    this.messengerData.forEach(entry => {
      const jobs = entry.jobs.sort((a, b) => b.date.getTime() - a.date.getTime());
      entry.sales = {
        nettoEarly: jobs.filter(j => j.billingTour && j.date.getHours() < 13).map(j => j.price._netto).sum().toPrice(),
        nettoLate: jobs.filter(j => j.billingTour && j.date.getHours() >= 13).map(j => j.price._netto).sum().toPrice(),
        grossEarly: jobs.filter(j => !j.billingTour && j.date.getHours() < 13).map(j => j.price._netto).sum().toPrice(),
        grossLate: jobs.filter(j => !j.billingTour && j.date.getHours() >= 13).map(j => j.price._netto).sum().toPrice(),
      }
      entry.dates = {
        earliestDate: jobs[0].date,
        latestDate: jobs.last().date,
      }
    });
  }

  saveConfigValue(key: string, value: string): void {
    GC.http.saveConfigItem(key, value).subscribe(() => {
    });
  }

  filterJobsByKeyword(): TourplanItem[] {
    let items = this.items;
    this.filterStrategies.filter(s => s.selected).forEach(s => {
      items = items.filter(i => s.passesFilter(i));
    })
    this.dataSource.data = items;
    this.table?.renderRows();
    this.cd.detectChanges();
    return items;
  }

  saveFilterStatus(): void {
    GC.http.saveConfigItem('filterStatus', JSON.stringify(GC.config.tourplan.filterStatus)).subscribe(rc => {
    })
  }

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value.toLowerCase();
    this.dataSource.data = this.filterJobsByKeyword().filter(tpi =>
      tpi._job?.center?.name.toLowerCase().includes(filterValue) ||
      tpi._job?.client?.name.toLowerCase().includes(filterValue) ||
      tpi._name?.toLowerCase().includes(filterValue) ||
      tpi._job?.deliveries?.map(l => l.name).filter(s => s.toLowerCase().includes(filterValue)).length > 0 ||
      tpi._job?.pickups?.map(l => l.name).filter(s => s.toLowerCase().includes(filterValue)).length > 0
    )
    this.cd.detectChanges();
  }

  // events

  dateChanged(date: Date): void {
    this.clicked = true;
    this.date = date;
    this.refresh();
    this.location.replaceState(`${GC.routes.tourplan};date=${date.yyyymmdd()}`);
  }

  onRightClick(event: MouseEvent, item: TourplanItem | Shift) {
    event.preventDefault();
    this.menuTopLeftPosition.x = event.clientX;
    this.menuTopLeftPosition.y = event.clientY;
    this.matMenuTrigger.menuData = item instanceof TourplanItem ? {item: item} : {shift: item};
    this.matMenuTrigger.openMenu();
  }
}
