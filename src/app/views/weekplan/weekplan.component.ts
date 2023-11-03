import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  OnInit,
  ViewChild
} from '@angular/core';
import {TitleComponent} from "../app.component";
import {GC} from "../../common/GC";
import {zip} from "rxjs";
import {TourplanItem} from "../../classes/TourplanItem";
import {ActivatedRoute} from "@angular/router";
import {Location} from "@angular/common";
import {MatMenuTrigger} from "@angular/material/menu";
import {Note} from "../../classes/Note";

@Component({
  selector: 'app-weekplan',
  templateUrl: './weekplan.component.html',
  styleUrls: ['./weekplan.component.scss']
})
export class WeekplanComponent extends TitleComponent implements OnInit, AfterViewInit {

  @ViewChild(MatMenuTrigger) matMenuTrigger: MatMenuTrigger;
  @ViewChild('redBar') redBar: HTMLElement;
  dataSource: String[] = [];
  items: TourplanItem[][][] = [];
  displayedColumns = ['time', 'mo', 'di', 'mi', 'do', 'fr', 'time2'];
  days = ['mo', 'di', 'mi', 'do', 'fr'];
  today = new Date().set(0);
  now = new Date();
  get todayTimeIndex() {
    return (new Date().set(8)
      .hoursDifference(this.now) * 60 / 15)
      .abs()
      .floor();
  }
  week = this.today.nextWorkingDay().workingWeek();
  get weekNumber() {return this.week[0].workingWeekNumber()};
  loaded = false;
  menuTopLeftPosition = {x: 0, y: 0};
  newNote: {column: number, row: number} = null;

  get routes() {return GC.routes}

  pxTop = (dayIndex: number, i: number, limit: number, halfsplit: boolean): number => {
    return this.now.minutesDifference(this.dateByColumn(dayIndex, i)).map(0, 15, halfsplit ? limit / -2 : 0, halfsplit ? limit / 2 : limit);
  }

  override title = 'kalenderwoche ' + this.weekNumber;

  constructor(private location: Location, private route: ActivatedRoute) {
    super();
    for (let i = 8; i < 18; i++) {
      this.dataSource = this.dataSource.concat([i + ':00', i + ':15', i + ':30', i + ':45']);
    }
    this.dataSource = this.dataSource.concat(['18:00'])
  }

  ngOnInit(): void {
  }

  ngAfterViewInit(): void {
    GC.loaded().subscribe(() => {
      this.route.paramMap.subscribe(params => {
        if (params.get('year') && params.get('week')) {
          this.week = new Date().getWorkingWeek(parseInt(params.get('year')), parseInt(params.get('week')))
        } else {
          this.location.replaceState(
            `${GC.routes.weekplan};year=${this.week[0].getFullYear()};week=${this.weekNumber}`
          );
        }
        this.loadWeek();
        GC.refreshNeeded.subscribe(() => {
          this.loadWeek();
        })
      });
      if (this.redBar) {
        this.redBar.scrollIntoView();
      }
    })
  }


  loadWeek(): void {
    this.loaded = false;
    this.items = [[], [], [], [], []];
    this.items.forEach(a => {
      for (let i = 0; i < 41; i++) {
        a[i] = [];
      }
    })
    zip(this.week.map(d => GC.http.tourplanItemsForDay(d, {onlyPlanned: true})))
      .subscribe(data => {
        data.forEach((set, i) => {
          set.items.forEach(item => {
            if (!item.regularJob?.morningTour) {
              const timeIndex = (item._date.copy().set(8)
                .hoursDifference(item._date) * 60 / 15)
                .abs()
                .floor();
              if (!this.items[i][timeIndex]) {
                console.log(timeIndex)
              } else {
                this.items[i][timeIndex].push(item)
              }
            }
          });
        });
        this.loaded = true;
        this.location.replaceState(
          `${GC.routes.weekplan};year=${this.week[0].getFullYear()};week=${this.weekNumber}`
        );
        this.title = 'kalenderwoche ' + this.weekNumber
      });
  }

  onRightClick(event: MouseEvent, date: Date, item?: TourplanItem) {
    event.preventDefault();
    this.menuTopLeftPosition.x = event.clientX;
    this.menuTopLeftPosition.y = event.clientY;
    this.matMenuTrigger.menuData = {date: date, item: item};
    this.matMenuTrigger.openMenu();
  }

  dateByColumn(column: number, row: number): Date {
    let res = this.week[column].copy()
    res.set(8 + (row / 4).floor(), 15 * (row % 4).round(0))
    return res;
  }

  columnByDate(date: Date): {column: number, row: number} {
    return {
      column: date.getDay() - 1,
      row: (new Date().set(8)
        .hoursDifference(date) * 60 / 15)
        .abs()
        .floor()
    }
  }

  saveNote(date: Date, msg: string): void {
    const note = new Note({
      date: date,
      text: msg,
      creator: GC.dispatcher().messenger,
    })
    GC.http.saveNote(note).subscribe(() => {
      GC.openSnackBarShort('notiz gespeichert!');
      this.newNote = null;
      this.loadWeek();
    });
  }
}
