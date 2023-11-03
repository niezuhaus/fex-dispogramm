import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ComponentRef,
  EventEmitter,
  HostListener,
  ViewChild
} from '@angular/core';
import {GC} from '../common/GC';
import {HttpService} from '../http.service';
import {MatDialog} from "@angular/material/dialog";
import {CheckInDialog} from "../dialogs/shifts-dialog/check-in-dialog.component";
import {MatSnackBar} from "@angular/material/snack-bar";
import {ActivatedRoute, Router} from "@angular/router";
import {getItem} from "../UTIL";
import {ConfigDialogComponent} from "../dialogs/config-dialog.component";
import {Location} from "@angular/common";
import {DatepickerComponent} from "./datepicker.component";
import {CalendarRangeDialogComponent} from "../dialogs/calendar-range-dialog/calendar-range-dialog.component";
import {SearchinputComponent} from "./newtour/inputfield/searchinput/searchinput.component";
import {Zone} from "../classes/Zone";

export abstract class TitleComponent {
  title: string;
}

export abstract class AsyncTitleComponent extends TitleComponent {
  titleEmitter: EventEmitter<string>;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements AfterViewInit {

  get title() {return this.componentRef?.title || ''};

  gc: GC;
  componentRef: TitleComponent;
  ref: ComponentRef<any>;
  date = new Date;
  loaded = false;
  search = false;
  showFiller = false;

  get dispatcherCheckedIn() {
    return GC.dispatcherCheckedIn();
  }

  routes = () => {
    return GC.routes
  }
  dispatcher = () => {
    return GC._dispatcher;
  }
  backendIP = () => {
    return GC.backendIP;
  }

  constructor(
    private http: HttpService,
    private dialog: MatDialog,
    private snackbar: MatSnackBar,
    private router: Router,
    private cd: ChangeDetectorRef,
    private route: ActivatedRoute,
    private location: Location,
  ) {
    this.gc = new GC(http, router, snackbar, dialog, cd, location, route);
  }

  ngOnInit(): void {
    GC.loaded().subscribe(() => {
      this.loaded = true;
    })
  }

  ngAfterViewInit(): void {
    GC.loaded().subscribe(() => {
      if (getItem<string>('date') !== new Date().toDateString()) {
        if (!GC.dispatcher()) {
          this.openChangeUserDialog(this.date.getHours() < 10);
        }
      }
    });
  }

  dateString(): string {
    const date = new Date();
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  }

  onActivate(componentRef: any): void {
    this.ref = componentRef as ComponentRef<any>;
    if (componentRef instanceof TitleComponent) {
      this.componentRef = componentRef
    }
    if (componentRef instanceof AsyncTitleComponent) {
      this.componentRef = componentRef
      componentRef.titleEmitter.subscribe((msg: string) => {
        GC.cd.detectChanges();
      });
    }
  }

  openConfigDialog(): void {
    this.dialog.open(ConfigDialogComponent);
  }

  openChangeUserDialog(morning?: boolean): void {
    GC.dialog.open(CheckInDialog, {
      data: {
        morning: morning
      }
    });
  }

  openDateDialog(): void {
    const dialog = GC.dialog.open(CalendarRangeDialogComponent, {
      data: {
        headline: 'datum für die voranmeldung auswählen',
        onlyDatePicker: true,
        regularJob: null,
      }
    });
    dialog.componentInstance.dateSelected.subscribe(date => {
      GC.router.navigate([GC.routes.newTour, {time: date.yyyymmdd()}]);
      dialog.close();
    })
  }

  @ViewChild('input') input: SearchinputComponent;
  @HostListener('window:keydown', ['$event']) onKeyDown(event: KeyboardEvent) {
    switch (true) {
      case event.ctrlKey:
        if (event.key.toLowerCase() === 'f') {
          this.search = !this.search;
          if (this.search) {
            setTimeout(() => {
              this.input.inputRef.nativeElement.select();
            }, 0)
          }
        }
        break;

      case event.key === 'Escape':
        this.search = false;
    }
  }

  print(any: any) {
    console.log(any)
  }

  zoneSelected(zone: Zone): void {
    new Zone(zone).openDialog()
  }
}
