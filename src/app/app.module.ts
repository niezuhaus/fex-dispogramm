import {BrowserModule} from '@angular/platform-browser';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {NgModule} from '@angular/core';
import {HttpClientModule} from '@angular/common/http';
import {AppRoutingModule, routingComponents} from './app-routing.module';
import {AppComponent} from './views/app.component';
import {InputFieldComponent} from './views/newtour/inputfield/input-field.component';
import {SearchinputComponent} from './views/newtour/inputfield/searchinput/searchinput.component';
import {HttpService} from './http.service';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatSliderModule} from '@angular/material/slider';
import {MatDatepickerModule} from '@angular/material/datepicker';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {DateAdapter, MatNativeDateModule, MatOptionModule, MatRippleModule} from '@angular/material/core';
import {MatSelectModule} from '@angular/material/select';
import {MatButtonModule} from '@angular/material/button';
import {MatAutocompleteModule} from '@angular/material/autocomplete';
import {MatSlideToggleModule} from '@angular/material/slide-toggle';
import {MatButtonToggleModule} from '@angular/material/button-toggle';
import {MatIconModule} from '@angular/material/icon';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {DragDropModule} from '@angular/cdk/drag-drop';
import {MatSortModule} from '@angular/material/sort';
import {MatTableModule} from '@angular/material/table';
import {MatDialogModule} from '@angular/material/dialog';
import {MatSnackBarModule} from '@angular/material/snack-bar';
import {MatTooltipModule} from '@angular/material/tooltip';
import {MatPaginatorModule} from '@angular/material/paginator';
import {LocationDialogComponent} from './dialogs/location-dialog.component';
import {NewClientDialogComponent} from './dialogs/new-client-dialog.component';
import {DescriptionComponent} from './views/tourplan/description/description.component';
import {DatepickerComponent} from './views/datepicker.component';
import {ContainerComponent} from './views/container.component';
import {AreYouSureDialogComponent} from './dialogs/are-you-sure-dialog.component';
import {CheckInDialog} from "./dialogs/shifts-dialog/check-in-dialog.component";
import {MatPaginatorIntl} from "@angular/material/paginator";
import {ClientListComponent, fexPaginator} from "./views/client-list/client-list.component";
import {MessengerSelectorComponent} from './views/tourplan/messenger-selector.component';
import {MatTabsModule} from "@angular/material/tabs";
import {TimepickerComponent} from './views/timepicker.component';
import {NewShiftComponent} from './dialogs/shifts-dialog/new-shift.component';
import {MessengerListComponent} from './views/messenger-list.component';
import {MessengerDialogComponent} from './dialogs/messenger-dialog.component';
import {RegularJobDialogComponent} from './dialogs/regular-job-dialog.component';
import {LoadingComponent} from './views/loading.component';
import {MatProgressBarModule} from "@angular/material/progress-bar";
import {BikeComponent} from './views/bike.component';
import {ConfigDialogComponent} from './dialogs/config-dialog.component';
import {PriceInputComponent} from './views/price-input.component';
import {ZoneDialogComponent} from './dialogs/zone-dialog.component';
import {MatMenuModule} from "@angular/material/menu";
import {CheckoutDialogComponent} from './dialogs/checkout-dialog.component';
import {CustomDateAdapter} from "./common/prototypes";
import {initializeApp, provideFirebaseApp} from '@angular/fire/app';
import {environment} from '../environments/environment';
import {provideAuth, getAuth} from '@angular/fire/auth';
import {MorningTourDialogComponent} from './dialogs/morning-tour-dialog.component';
import {ShiftsWithoutEndDialogComponent} from './dialogs/shifts-without-end-dialog.component';
import {MatExpansionModule} from "@angular/material/expansion";
import {ContactDialogComponent} from './dialogs/contact-dialog.component';
import {WeekplanComponent} from './views/weekplan/weekplan.component';
import {MatDividerModule} from "@angular/material/divider";
import {RightClickMenuComponent} from './views/right-click-menu.component';
import {NgbModule} from '@ng-bootstrap/ng-bootstrap';
import {NewExpenseDialogComponent} from './dialogs/new-expense-dialog.component';
import {StatisticsComponent} from './views/statistics.component';
import {MatChipsModule} from "@angular/material/chips";
import {SpecialPriceDialogComponent} from './dialogs/special-price-dialog.component';
import {ShiftComponent} from './dialogs/shifts-dialog/shift.component';
import {CalendarRangeDialogComponent} from './dialogs/calendar-range-dialog/calendar-range-dialog.component';
import {MatCardModule} from "@angular/material/card";
import {
  InlineRangeCalendarComponent
} from './dialogs/calendar-range-dialog/inline-range-calendar/inline-range-calendar.component';
import {MessengerViewComponent} from './views/tourplan/messenger-view/messenger-view.component';
import {MatSidenavModule} from "@angular/material/sidenav";

@NgModule({
  declarations: [
    AppComponent,
    InputFieldComponent,
    SearchinputComponent,
    ClientListComponent,
    routingComponents,
    LocationDialogComponent,
    NewClientDialogComponent,
    DescriptionComponent,
    DatepickerComponent,
    ContainerComponent,
    AreYouSureDialogComponent,
    CheckInDialog,
    MessengerSelectorComponent,
    TimepickerComponent,
    NewShiftComponent,
    MessengerListComponent,
    MessengerDialogComponent,
    RegularJobDialogComponent,
    LoadingComponent,
    BikeComponent,
    ConfigDialogComponent,
    PriceInputComponent,
    ZoneDialogComponent,
    CheckoutDialogComponent,
    MorningTourDialogComponent,
    ShiftsWithoutEndDialogComponent,
    ContactDialogComponent,
    WeekplanComponent,
    RightClickMenuComponent,
    NewExpenseDialogComponent,
    StatisticsComponent,
    SpecialPriceDialogComponent,
    ShiftComponent,
    CalendarRangeDialogComponent,
    InlineRangeCalendarComponent,
    MessengerViewComponent,
  ],
  imports: [
    BrowserModule,
    FormsModule,
    ReactiveFormsModule,
    AppRoutingModule,
    HttpClientModule,
    BrowserAnimationsModule,
    MatCheckboxModule,
    MatSliderModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatOptionModule,
    MatSelectModule,
    MatButtonModule,
    MatAutocompleteModule,
    MatSlideToggleModule,
    MatButtonToggleModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatRippleModule,
    DragDropModule,
    MatSortModule,
    MatTableModule,
    MatDialogModule,
    MatSnackBarModule,
    MatNativeDateModule,
    MatPaginatorModule,
    MatTooltipModule,
    MatTabsModule,
    MatProgressBarModule,
    MatMenuModule,
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideAuth(() => getAuth()),
    MatExpansionModule,
    MatDividerModule,
    NgbModule,
    MatChipsModule,
    MatCardModule,
    MatSidenavModule,
  ],
  providers: [HttpService,
    {provide: MatPaginatorIntl, useClass: fexPaginator},
    {provide: DateAdapter, useClass: CustomDateAdapter}],
  bootstrap: [AppComponent]
})
export class AppModule {
}
