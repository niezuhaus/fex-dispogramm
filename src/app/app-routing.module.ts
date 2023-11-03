import {NgModule} from '@angular/core';
import {Routes, RouterModule} from '@angular/router';
import {NewtourComponent} from './views/newtour/newtour.component';
import {ClientListComponent} from './views/client-list/client-list.component';
import {TourplanComponent} from './views/tourplan/tourplan.component';
import {ClientComponent} from './views/client-list/client/client.component';
import {LocationListComponent} from './views/location-list.component';
import {GC} from "./common/GC";
import {MessengerListComponent} from "./views/messenger-list.component";
import {WeekplanComponent} from "./views/weekplan/weekplan.component";
import {StatisticsComponent} from "./views/statistics.component";

const routes: Routes = [
  {path: GC.routes.tourplan.slice(1), component: TourplanComponent},
  {path: GC.routes.weekplan.slice(1), component: WeekplanComponent},
  {path: GC.routes.clientlist.slice(1), component: ClientListComponent},
  {path: GC.routes.client.slice(1), component: ClientComponent},
  {path: GC.routes.newTour.slice(1), component: NewtourComponent},
  {path: GC.routes.showTour.slice(1), component: NewtourComponent},
  {path: GC.routes.locations.slice(1), component: LocationListComponent},
  {path: GC.routes.messengers.slice(1), component: MessengerListComponent},
  {path: GC.routes.statistics.slice(1), component: StatisticsComponent},
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {
}

export const routingComponents = [
  NewtourComponent,
  ClientListComponent,
  ClientComponent,
  TourplanComponent,
  LocationListComponent,
  WeekplanComponent,
];
