import {EventEmitter, Injectable} from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {Observable, of, switchMap, take, tap, zip} from 'rxjs';
import {map} from 'rxjs/operators';
import {
  BingMapsResponse,
  BingResource,
  DayStatistic,
  GeoCodingMode,
  Invoice,
  IOSMFeature,
  IOSMResponse,
  IPoint, LexProfile,
  LocType,
  PriceZone,
  RawConfig, TimeframeStatistic, WeekStatistic,
} from './common/interfaces';
import {Contact} from "./classes/Contact";
import {Zone} from "./classes/Zone";
import {Job, RegularJob} from "./classes/Job";
import {DateAdapter} from '@angular/material/core';
import {GC} from "./common/GC";
import {Price} from "./classes/Price";
import {Geolocation} from "./classes/Geolocation";
import {Shift} from "./classes/Shift";
import {Note} from './classes/Note';
import {Messenger} from "./classes/Messenger";
import {Expense} from "./classes/Expense";
import {Client} from "./classes/Client";
import {Routing} from "./common/Routing";
import {
  LexContact,
  LexContactsListPage,
  LexInvoice,
  LexInvoiceListPage,
  LexCreateResponse
} from "./classes/LexInvoice";
import {SpecialPrice} from "./classes/SpecialPrice";
import {TourplanItem} from "./classes/TourplanItem";
import {Position} from "@turf/turf";

// CONNECTION CONFIG
const BACKEND_IP = GC.backendIP;


// OSM SEARCH CONFIG
const MIN_CONF = 0.25;
const RANGE = 20000;
const CIRCLE_LAT = 8.753171;
const CIRCLE_LON = 53.10876;
const PLZ_EXTRA = [28865, 28816]; // lilienthal, stuhr
const CENTER: IPoint = {latitude: 53.077135, longitude: 8.821483};


@Injectable({
  providedIn: 'root'
})

export class HttpService {
  LEX_API_PROXY: string;

  private lexAuthHeader: HttpHeaders;
  private backendAuthHeader: HttpHeaders;
  private GEOAPIFY_API_KEY: string;
  private MAPBOX_API_KEY: string;
  private BING_API_KEY: string;

  constructor(
    private http: HttpClient,
    private dateAdapter: DateAdapter<Date>) {
    try {
      let url = new URL(BACKEND_IP);
      this.LEX_API_PROXY = url.protocol + '//' + url.hostname + ':8010/proxy/v1'
    } catch (e) {
      console.error(e)
    }

    this.backendAuthHeader = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': 'Basic ' + btoa(`${GC.authName}:${GC.authPwd}`)
    })
  }

  set keys(keys: {
    lex: string,
    geoapify: string,
    mapbox: string,
    bing: string,
  }) {
    this.lexAuthHeader = new HttpHeaders({
      Authorization: `Bearer ${keys.lex}`,
    })
    this.GEOAPIFY_API_KEY = keys.geoapify;
    this.MAPBOX_API_KEY = keys.mapbox;
    this.BING_API_KEY = keys.bing;
  }

  public static _filterLocationsByAny(list: Geolocation[], value: string): Geolocation[] {
    return list.filter(option => {
      return option.name.toLowerCase().includes(value.toLowerCase())
        || option.street.includes(value.toLowerCase());
    });
  }

  static _prepareClients(clients: Client[]): Client[] {
    return clients.map(c => {
      return this._prepareClient(c);
    })
  }
  static _prepareClient(c: Client): Client {
    return new Client(c);
  }
  static _prepareGeolocations(locs: Geolocation[]): Geolocation[] {
    return locs.map(loc => {
      return this._prepareGeolocation(loc);
    })
  }
  static _prepareGeolocation(l: Geolocation): Geolocation {
    const loc = new Geolocation(l);
    loc.priceZone = this.findPriceZone(loc.zipCode);
    return loc;
  }
  private static _prepareJobs(jobs: Job[]): Job[] {
    return jobs.map(job => {
      return this._prepareJob(job);
    })
  }
  private static _prepareJob(job: Job): Job {
    return new Job(job);
  }
  static _prepareRegularJobs(rjs: RegularJob[]): RegularJob[] {
    return rjs.map(rj => {
      return this._prepareRegularJob(rj);
    })
  }
  static _prepareRegularJob(rj: RegularJob): RegularJob {
    return new RegularJob(rj);
  }
  private static _prepareShifts(shifts: Shift[]): Shift[] {
    return shifts.map(s => this._prepareShift(s))
  }
  private static _prepareShift(shift: Shift): Shift {
    return new Shift(shift);
  }
  private static _prepareExpenses(expenses: Expense[]) {
    return expenses.map(s => this._prepareExpense(s))
  }
  private static _prepareExpense(expense: Expense) {
    return new Expense(expense);
  }
  private static _prepareSpecialPrices(specialPrices: SpecialPrice[]) {
    return specialPrices.map(s => this._prepareSpecialPrice(s));
  }
  private static _prepareSpecialPrice(specialPrice: SpecialPrice) {
    return new SpecialPrice(specialPrice);
  }
  private static _prepareZone(zone: Zone) {
    return new Zone(zone);
  }

  public static _convertToJobLocally(rj: RegularJob): Job {
    const res = rj;
    res.regularJob = rj;
    res.billingTour = true;
    return res;
  }

  searchBoth(searchStr: string, type: LocType): Observable<Geolocation[]> {
    return zip(this.searchOSM(searchStr, type), this.searchBing(searchStr, type)).pipe(
      take(1),
      map(data => {
        return data[0].concat(data[1]);
      })
    )
  }
  searchOSM(searchStr: string, type: LocType): Observable<Geolocation[]> {
    return this.http.get<IOSMResponse>(`https://api.geoapify.com/v1/geocode/autocomplete?text=${searchStr}&filter=circle:${CIRCLE_LAT},${CIRCLE_LON},${RANGE}&apiKey=${this.GEOAPIFY_API_KEY}`)
      .pipe(
        take(1),
        map((response: IOSMResponse) => {
          let filteredFeatures = response.features.filter(feature => feature.properties.rank.confidence >= MIN_CONF);
          filteredFeatures = filteredFeatures.filter(feature => {
            const postcode = parseInt(feature.properties.postcode)
            return (
              postcode && feature.properties.housenumber &&
              (postcode <= 28779 &&
                postcode >= 28195 ||
                PLZ_EXTRA.includes(postcode)
                // && feature.properties.name.toLowerCase().includes(feature.properties.street.toLowerCase())
              )
            );
          });
          const locations = filteredFeatures.map(f => HttpService.mapOSMFeature(f, type))
          const set = [...new Set(locations.map(f => f.street))]
          const res: Geolocation[] = [];

          locations.forEach(l => {
            if (set.includes(l.street)) {
              res.push(l)
              set.findAndRemove(l.street)
            }
          })

          return res.sort((a, b) => {
            let res = Routing.dist(b, CENTER) - Routing.dist(a, CENTER);
            if (parseInt(a.zipCode) > 28779 || parseInt(a.zipCode) < 28195) {
              res += 10;
            } else {
              res -= 10;
            }
            if (parseInt(b.zipCode) > 28779 || parseInt(b.zipCode) < 28195) {
              res -= 10;
            } else {
              res += 10;
            }
            return res;
          })
        })
      );
  }
  searchBing(searchStr: string, type: LocType): Observable<Geolocation[]> {
    return this.http.get<BingMapsResponse>(`https://dev.virtualearth.net/REST/v1/Locations/DE/${searchStr} bremen?maxResults=10&key=${this.BING_API_KEY}`).pipe(
      take(1),
      map(list => {
        return list.resourceSets[0].resources
          .filter(source => source.address.addressLine)
          .filter(source => {
            const postcode = parseInt(source.address.postalCode);
            return postcode && (postcode <= 28779 && postcode >= 28195 ||
              PLZ_EXTRA.includes(postcode)
            )
          })
          .map(set => {
            return HttpService.mapBingFeature(set, type);
          })
      })
    )
  }

  reverseGeocode(lat: number, lng: number, type: LocType): Observable<Geolocation[]> {
    return this.http.get<IOSMResponse>(`https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lng}&limit=1&apiKey=${this.GEOAPIFY_API_KEY}`)
      .pipe(
        take(1),
        map((response: IOSMResponse) => {
          return response.features.map(f => HttpService.mapOSMFeature(f, type));
        })
      );
  }

  static mapOSMFeature(f: IOSMFeature, type: LocType): Geolocation {
    const feature = f.properties;
    feature.housenumber = feature.housenumber ? feature.housenumber.replace('; ', '-') : '';
    while (feature.housenumber.includes(';')) {
      feature.housenumber = feature.housenumber ? feature.housenumber.replace(';', ', ') : '';
    }
    const res: Geolocation = new Geolocation({
      street: `${feature.street}${feature.housenumber ? ' ' + feature.housenumber : ''}`,
      zipCode: feature.postcode,
      quarter: `${feature.suburb != null ? feature.suburb : ''}`,
      city: feature.city,
      latitude: feature.lat.round(5),
      longitude: feature.lon.round(5),
      locType: type,
      priceZone: this.findPriceZone(feature.postcode),
    });
    res.geocoder = GeoCodingMode.osm;
    res.name = res.street;
    return res;
  }
  static mapBingFeature(set: BingResource, type: LocType): Geolocation {
    set.address.addressLine = set.address.addressLine.replace('str ', 'straße ');
    if (set.address.addressLine.slice(-3) === 'str') {
      set.address.addressLine = set.address.addressLine.replace('str', 'straße');
    }
    const res: Geolocation = new Geolocation({
      name: set.address.addressLine,
      street: set.address.addressLine,
      zipCode: set.address.postalCode,
      city: set.address.locality,
      latitude: set.point.coordinates["0"],
      longitude: set.point.coordinates["1"],
      locType: type,
      priceZone: this.findPriceZone(set.address.postalCode),
    })
    res.geocoder = GeoCodingMode.bing;
    return res;
  }

  static findPriceZone(plzString: string): PriceZone {
    const plz = parseInt(plzString);
    return plz === PLZ_EXTRA[0] ? PriceZone.lilienthal :
      plz === PLZ_EXTRA[1] ? PriceZone.stuhr :
        plz >= 28717 && plz <= 28779 ? PriceZone.hbNord :
          plz >= 28195 && plz <= 28359 ? PriceZone.hb :
            PriceZone.unknown;
  }

  createClient(client: Client): Observable<Client> {
    return this.http.post<Client>(`${BACKEND_IP}/clients/create`, client, {headers: this.backendAuthHeader}).pipe(
      take(1),
      map(c => {
        GC.clients.push(c);
        if (!client.billClient) {
          GC.cashClientIds.push(client.id)
        }
        return c;
      })
    );
  }
  updateClient(client: Client): Observable<Client> {
    return this.http.post<Client>(`${BACKEND_IP}/clients/update`, client, {headers: this.backendAuthHeader}).pipe(
      take(1),
    );
  }
  getClient(id: string): Observable<Client> {
    return of(GC.clients.filter(c => c.id === id)[0]);
    // return this.http.post<Client>(`${BACKEND_IP}/clients/find/`, {id});
  }
  getClientList(): Observable<Client[]> {
    return this.http.get<Client[]>(`${BACKEND_IP}/clients/all`, {headers: this.backendAuthHeader}).pipe(
      take(1),
      map(list => {
        list = list.filter(c => c.clientId);
        list = HttpService._prepareClients(list)
        return list.sort((a, b) => (a.name || '').localeCompare((b.name || '')));
      })
    );
  }
  searchClientList(searchStr: string): Observable<Client[]> {
    const res = new EventEmitter<Client[]>();
    setTimeout(() => {
      res.emit(GC.clients
        .filter(option => (option.name + option.clientId).toLowerCase()
          .includes(searchStr.toLowerCase())));
    }, 0);
    return res;
  }
  deleteClient(client: Client): Observable<any> {
    GC.clients.splice(GC.clients.indexOf(client), 1);
    return this.http.post<any>(`${BACKEND_IP}/clients/delete`, {id: client.id}, {headers: this.backendAuthHeader}).pipe(
      take(1),
    );
  }

  createLocation(location: Geolocation): Observable<Geolocation> {
    location.id = null;
    const _job = location._job
    location._job = null;
    return this.http.post<Geolocation>(`${BACKEND_IP}/locations/create`, location, {headers: this.backendAuthHeader}).pipe(
      take(1),
      map(loc => {
        loc = HttpService._prepareGeolocation(loc);
        location._job = _job;
        GC.locations.push(loc);
        return loc;
      })
    );
  }
  updateLocation(location: Geolocation): Observable<Geolocation> {
    location = new Geolocation(location);
    location.branch = null;
    location._job = null;
    GC.locations.findAndReplace(location);
    if (location.clientId) {
      GC.clientLocations[
        GC.clientLocations.indexOf(
          GC.clientLocations.filter(loc => loc.id === location.id)[0])] = location;
    }
    return this.http.post<Geolocation>(`${BACKEND_IP}/locations/update`, location, {headers: this.backendAuthHeader}).pipe(
      take(1),
      map(loc => {
        GC.locationChanged.emit(true);
        return HttpService._prepareGeolocation(loc);
      })
    );
  }
  getLocation(id: string): Observable<Geolocation> {
    return this.http.post<Geolocation>(`${BACKEND_IP}/locations/find`, {id}, {headers: this.backendAuthHeader}).pipe(
      take(1),
      map(loc => {
        return HttpService._prepareGeolocation(loc);
      })
    );
  }
  getLocationList(): Observable<Geolocation[]> {
    return this.http.get<Geolocation[]>(`${BACKEND_IP}/locations/all`, {headers: this.backendAuthHeader}).pipe(
      take(1),
      map(list => {
        return HttpService._prepareGeolocations(list)
      })
    );
  }
  getLocationsByClientId(id: string): Observable<Geolocation[]> {
    return this.http.post<Geolocation[]>(`${BACKEND_IP}/locations/find/by/clientId`, {id}, {headers: this.backendAuthHeader}).pipe(
      take(1),
      map(list => {
        return HttpService._prepareGeolocations(list)
      })
    );
  }
  searchLocationList(searchStr: string): Observable<Geolocation[]> {
    const res = new EventEmitter<Geolocation[]>();
    setTimeout(() => {
      res.emit(HttpService._filterLocationsByAny(GC.locations, searchStr));
    }, 0);
    return res;
  }
  mergeLocations(locs: Geolocation[]): Observable<any> {
    return this.http.post<any>(`${BACKEND_IP}/locations/merge`, locs.map(l => {
      return {id: l.id}
    }), {headers: this.backendAuthHeader}).pipe(
      take(1),
    );
  }
  deleteLocation(loc: Geolocation): Observable<any> {
    GC.locations.findAndRemove(loc);
    return this.http.post<any>(`${BACKEND_IP}/locations/delete`, {id: loc.id}, {headers: this.backendAuthHeader}).pipe(
      take(1),
    );
  }

  createContact(contact: Contact): Observable<Contact> {
    contact.id = null;
    return this.http.post<Contact>(`${BACKEND_IP}/contacts/create`, contact, {headers: this.backendAuthHeader}).pipe(
      take(1)
    );
  }
  updateContact(contact: Contact): Observable<Contact> {
    return this.http.post<Contact>(`${BACKEND_IP}/contacts/update`, contact, {headers: this.backendAuthHeader}).pipe(
      take(1)
    );
  }
  getContactsForLocation(location: Geolocation): Observable<Contact[]> {
    return this.http.post<Contact[]>(`${BACKEND_IP}/contacts/all/location`, location.id, {headers: this.backendAuthHeader}).pipe(
      take(1)
    );
  }
  getContactsForClient(client: Client): Observable<Contact[]> {
    return this.http.post<Contact[]>(`${BACKEND_IP}/contacts/all/client`, client.id, {headers: this.backendAuthHeader}).pipe(
      take(1)
    );
  }
  deleteContact(contact: Contact): Observable<any> {
    contact.id = null;
    return this.http.post<Contact>(`${BACKEND_IP}/contacts/delete`, contact, {headers: this.backendAuthHeader}).pipe(
      take(1)
    );
  }

  createJob(job: Job): Observable<Job> {
    if (!job.creator) {
      GC.openSnackBarLong('bitte erst als disponent:in einchecken!')
      return of(null);
    } else {
      job.creator = job.creator.copy();
    }
    job.routeStrategyObj = null;
    return this.http.post<Job>(`${BACKEND_IP}/jobs/create`, job, {headers: this.backendAuthHeader}).pipe(
      take(1),
      map(j => {
        j = HttpService._prepareJob(j);
        GC.jobsThisMonth.push(j);
        GC.jobsLastNinetyDays.push(j);
        if (j.client?.id.length > 0) {
          GC.addToClientInvoiceAmounts(j);
        }
        return j;
      })
    );
  }
  updateJob(job: Job): Observable<Job> {
    job.creator = job.creator ? job.creator.copy() : null;
    job.dispatcher = job.dispatcher ? job.dispatcher.copy() : null;
    job.messenger = job.messenger ? job.messenger.copy() : null;
    return this.http.post<Job>(`${BACKEND_IP}/jobs/update`, job, {headers: this.backendAuthHeader}).pipe(
      take(1),
      map(updatedJob => {
        return HttpService._prepareJob(updatedJob);
      })
    );
  }
  getJob(id: string): Observable<Job> {
    return this.http.post<Job>(`${BACKEND_IP}/jobs/find`, {id}, {headers: this.backendAuthHeader}).pipe(
      take(1),
      map(job => {
        return HttpService._prepareJob(job);
      })
    );
  }
  getJobList(): Observable<Job[]> {
    return this.http.get<Job[]>(`${BACKEND_IP}/jobs/all`, {headers: this.backendAuthHeader}).pipe(
      take(1),
      map(list => {
        HttpService._prepareJobs(list);
        return list;
      })
    );
  }
  distinctsJobs(): Observable<Job[]> {
    return this.http.get<Job[]>(`${BACKEND_IP}/jobs/all/distinct`, {headers: this.backendAuthHeader}).pipe(
      take(1),
      map(list => {
        return HttpService._prepareJobs(list);
      })
    );
  }
  distinctsJobsForClient(id: string): Observable<Job[]> {
    return this.http.post<Job[]>(`${BACKEND_IP}/jobs/client/distinct`, {id}, {headers: this.backendAuthHeader}).pipe(
      take(1),
      map(list => {
        list = list.filter(j => j.deliveries?.length + j.pickups?.length > 0);
        return HttpService._prepareJobs(list);
      })
    );
  }
  tourplanItemsForDay(date: Date, options?: {onlyPlanned?: boolean, excludeNotes?: boolean}): Observable<{items: TourplanItem[], jobs: Job[], notes?: Note[]}> {
    // all regularJob templates for this day
    let rjs = GC.regularJobs.filter(rj => {
      return rj.dates.filter(d => !!d).map(d => {
        return d.beforeOrSameDay(date) && d.getDay() === date.getDay(); // past limit
      }).includes(true) && date.beforeOrSameDay(rj.endDate); // future limit
    })
    rjs = rjs.map(rj => new RegularJob(rj));
    rjs.forEach(rj => rj.date = rj.dates.find(d => !!d && d.getDay() === date.getDay()).copy().copyDate(date))
    // the posttours converted to tourplan items
    const posttourTPIs = GC.posttours.map((str, i) => {
      const rjsInTour = rjs.filter(rj => rj.morningTour === i + 1);
      return new TourplanItem({
        _date: date.copy().set(8),
        _price: rjsInTour.map(rj => rj.price).reduce((a, b) => a.add(b), new Price()),
        morningTour: i + 1,
        _name: str,
        regularJobs: rjsInTour,
      });
    });

    return this.getNotes(date).pipe(
      switchMap(notes => {
        return this.http.post<Job[]>(`${BACKEND_IP}/jobs/all/date`, {date: date}, {headers: this.backendAuthHeader}).pipe(
          take(1),
          map(jobsForDay => {
            jobsForDay = HttpService._prepareJobs(jobsForDay);
            // the jobs in the list, that are converted regularJobs
            const convertedJobs = jobsForDay.filter(j => j.regularJobId)
            // next filter out the corresponding regularJobs in the list
            // but keep their morningTour value to store it in the converted jobs
            // and also push them to the corresponding posttour tourplanItem
            rjs = rjs.filter(rj => {
              const convertedInstance = convertedJobs.find(j => j.regularJobId === rj.id)
              if (convertedInstance) {
                convertedInstance.morningTour = rj.morningTour;
                if (rj.morningTour > 0) {
                  posttourTPIs[rj.morningTour - 1].convertedJobs.push(convertedInstance);
                  posttourTPIs[rj.morningTour - 1].regularJobs.findAndRemove(rj)
                }
                return false; // filter this one out, because it's already converted
              }
              return true; // keep that one in
            })

            // now bundle all TPIs for the day
            const TPIsForDay =
              // jobs that are not included in a morning tour
              jobsForDay.filter(j => !(j.morningTour > 0) && (!options?.onlyPlanned || j.isPlanned || j.regularJobId)).map(j => new TourplanItem({job: j}))
                // regularJobs that are not included in a morning tour
                .concat(rjs.filter(rj => !(rj.morningTour > 0) || options?.onlyPlanned).map(rj => {
                  return new TourplanItem({
                    regularJob: rj,
                    _date: rj.dates.find(d => !!d && d.getDay() === date.getDay()).copy().copyDate(date),
                  })
                }))
                // all notes
                .concat(options?.excludeNotes ? [] : notes.map(n => new TourplanItem({note: n})))
                // the morning tours that include at least one job for the day
                .concat(posttourTPIs.filter(p => (p.regularJobs?.length) + (p.convertedJobs?.length) > 0));

            jobsForDay.forEach(j => {
              j.expenses = GC.expenses.filter(e => e.jobId === j.id)
            });
            // lastly sort all the shown objects in the table by their date
            TPIsForDay.forEach(tpi => tpi._date.setDate(date.getDate()))
            TPIsForDay.sort((a, b) => b._date.getTime() - a._date.getTime())
            // give every TPI an index
            TPIsForDay.filter(tpi => !tpi.isNote).forEach((j, i, array) => {
              j.index = array.length - i;
            });

            return {items: TPIsForDay, jobs: jobsForDay, notes: notes};
          })
        );
      })
    );
  }
  jobsForClientInMonth(id: string, date: Date): Observable<Job[]> {
    const start = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
    return this.http.post<Job[]>(`${BACKEND_IP}/jobs/find/by/clientanddates`, {id: id, start: start, end: end}, {headers: this.backendAuthHeader}).pipe(
      take(1),
      map(list => {
        if (!list) {
          return [];
        }
        list = list.filter(j => j.client && j.client.id === id);
        return HttpService._prepareJobs(list);
      })
    );
  }
  jobsThisMonth(): Observable<Job[]> {
    return this.jobsInMonth(this.dateAdapter.today());
  }
  jobsInWeek(date: Date): Observable<Job[][]> {
    return zip(date.workingWeek().map(d => {

      return of()
    }))
  }
  jobsInMonth(date: Date): Observable<Job[]> {
    return this.http.post<Job[]>(`${BACKEND_IP}/jobs/all/month`, {date}, {headers: this.backendAuthHeader}).pipe(
      take(1),
      map(list => {
        return HttpService._prepareJobs(list);
      })
    );
    // return this.getJobList(, {headers: this.backendAuthHeader}).pipe(
    //   map(list => {
    //     return list.filter(job => job.creationDate.getMonth() === month);
    //   })
    // );
  }
  jobsThisMonthForMessenger(messenger: Messenger): Observable<Job[]> {
    return of(GC.jobsThisMonth.filter(j => j.messenger?.nickname === messenger.nickname));
  }
  jobsRecentDays(days: number, id?: string): Observable<Job[]> {
    return this.http.post<Job[]>(`${BACKEND_IP}/jobs/all/recent`, {amount: days}, {headers: this.backendAuthHeader}).pipe(
      take(1),
      map(list => {
        if (id) {
          list = list.filter(j => j.client.id === id);
        }
        return HttpService._prepareJobs(list);
      })
    );
  }
  jobsWithLocation(location: Geolocation): Job[] {
    return GC.jobsLastNinetyDays.filter(j => {
      return j.deliveries.concat(j.pickups).concat(j.center).map(l => l.id).includes(location.id)
    });
  }
  searchJobs(list: Job[], searchStr: string): Job[] {
    return list.filter(job =>
      job.description.toLowerCase()
        .includes(searchStr.toLowerCase()) ||
      job.client.name.toLowerCase().includes(searchStr.toLowerCase()));
  }
  deleteJob(job: Job): Observable<boolean> {
    if (job.client?.id.length > 0 && GC.clientInvoiceAmounts.get(job.client.id)) {
      GC.clientInvoiceAmounts.get(job.client.id).sub(job.price);
    }
    return this.http.post<boolean>(`${BACKEND_IP}/jobs/delete`, {id: job.id});
  }

  createRegularJob(job: RegularJob): Observable<RegularJob> {
    return this.http.post<RegularJob>(`${BACKEND_IP}/regularjobs/create`, job, {headers: this.backendAuthHeader}).pipe(
      take(1),
      map(rj => {
        rj.dates = rj.dates.map(d => new Date(d));
        GC.regularJobs.push(rj);
        return rj;
      })
    );
  }
  updateRegularJob(job: RegularJob): Observable<RegularJob> {
    job.regularJob = null;
    GC.regularJobs[
      GC.regularJobs.indexOf(
        GC.regularJobs.filter(j => j.id === job.id)[0])] = job;
    return this.http.post<RegularJob>(`${BACKEND_IP}/regularjobs/update`, job, {headers: this.backendAuthHeader}).pipe(
      take(1),
    );
  }
  getRegularJob(id: string): Observable<RegularJob> {
    return this.http.post<RegularJob>(`${BACKEND_IP}/regularjobs/find`, {id}, {headers: this.backendAuthHeader}).pipe(
      take(1),
      map(rj => {
        return HttpService._prepareRegularJob(rj)
      })
    );
  }
  convertRegularJob(rj: RegularJob, date: Date): Observable<Job> {
    return this.http.post<Job>(`${BACKEND_IP}/regularjobs/convert`, {id: rj.id, date: date}, {headers: this.backendAuthHeader}).pipe(
      take(1),
      map(j => {
        j.creator = GC.dispatcher().messenger;
        j.date = date; // @todo jan backend? (added 1h auf das datum, immer noch)
        j.creationDate = new Date();
        j.billingTour = true;
        return j;
      }),
      switchMap(j => new Job(j).save()),
      map(j => HttpService._prepareJob(j))
    );
  }
  convertRegularJobs(date: Date): Observable<RegularJob[]> {
    return this.http.post<RegularJob[]>(`${BACKEND_IP}/regularjobs/all/date`, {date}, {headers: this.backendAuthHeader}).pipe(
      take(1),
      map(list => {
        return HttpService._prepareRegularJobs(list);
      })
    );
  }
  getRegularJobList(forceLoad?: boolean): Observable<RegularJob[]> {
    if (GC.regularJobs.length > 0 && !forceLoad) {
      return of(GC.regularJobs);
    }
    return this.http.get<RegularJob[]>(`${BACKEND_IP}/regularjobs/all`, {headers: this.backendAuthHeader}).pipe(
      take(1),
      map(list => {
        return HttpService._prepareRegularJobs(list);
      })
    );
  }
  getRegularJobListForClient(clientId: string): Observable<RegularJob[]> {
    const res = new EventEmitter<RegularJob[]>();
    setTimeout(() => {
      res.emit(GC.regularJobs.filter(rj => rj.client?.id === clientId));
    }, 0);
    return res;
  }
  deleteRegularJob(job: RegularJob): Observable<boolean> {
    GC.regularJobs.splice(
      GC.regularJobs.indexOf(GC.regularJobs.filter(j => j.id === job.id)[0]), 1);
    return this.http.post<boolean>(`${BACKEND_IP}/regularjobs/delete`, {id: job.id}, {headers: this.backendAuthHeader}).pipe(
      take(1),
    );
  }

  createMessenger(messenger: Messenger): Observable<Messenger> {
    return this.http.post<Messenger>(`${BACKEND_IP}/messengers/create`, messenger, {headers: this.backendAuthHeader}).pipe(
      take(1),
      map(m => {
        m = new Messenger(m);
        GC.messengers.push(m);
        GC.messengers.sort((a, b) => a.nickname.localeCompare(b.nickname))
        return m;
      })
    );
  }
  updateMessenger(messenger: Messenger): Observable<Messenger> {
    GC.messengers.findAndReplace(messenger)
    return this.http.post<Messenger>(`${BACKEND_IP}/messengers/update`, messenger, {headers: this.backendAuthHeader}).pipe(
      take(1),
      map(m => {
        m = new Messenger(m);
        GC.messengers.sort((a, b) => a.nickname.localeCompare(b.nickname))
        return m;
      })
    );
  }
  getMessenger(id: string): Observable<Messenger> {
    return this.http.post<Messenger>(`${BACKEND_IP}/messengers/find`, {id}, {headers: this.backendAuthHeader}).pipe(
      take(1),
      map(m => new Messenger(m))
    );
  }
  getMessengerList(): Observable<Messenger[]> {
    return this.http.get<Messenger[]>(`${BACKEND_IP}/messengers/all`, {headers: this.backendAuthHeader}).pipe(
      take(1),
      map(list => {
        list = list.map(m => new Messenger(m));
        list.sort((a, b) => {
          if (!a.nickname) {
            console.log('messenger without nickname found!')
            console.log(a)
            return 0;
          }
          return a.nickname.localeCompare(b.nickname);
        });
        return list;
      })
    );
  }
  getDispatcherList(): Observable<Messenger[]> {
    return this.getMessengerList().pipe(
      take(1),
      map(list => {
        return list.filter(m => m.dispatcher);
      })
    );
  }
  searchMessenger(searchStr: string, dispatcher?: boolean): Observable<Messenger[]> {
    return this.getMessengerList().pipe(
      take(1),
      map(list => {
        return list
          .filter(m =>
            ((searchStr.length > 3 && m.nickname?.replace('î', 'i').editDistance(searchStr) < 4) ||
            m.nickname?.replace('î', 'i').includes(searchStr))
            && m.active
            && (!dispatcher || m.dispatcher)
          );
      })
    );
  }
  deleteMessenger(messenger: Messenger): Observable<boolean> {
    GC.messengers.splice(
      GC.messengers.indexOf(GC.messengers.filter(m => m.id === messenger.id)[0]), 1);
    if (messenger.dispatcher) {
      GC.loadDispatchers(this);
    }
    return this.http.post<boolean>(`${BACKEND_IP}/messengers/delete`, {id: messenger.id}, {headers: this.backendAuthHeader}).pipe(
      take(1),
    );
  }

  createShift(shift: Shift): Observable<Shift> {
    return this.http.post<Shift>(`${BACKEND_IP}/shifts/create`, shift, {headers: this.backendAuthHeader}).pipe(
      take(1),
      map(s => {
        s.messenger.shift = s;
        return HttpService._prepareShift(s);
      })
    );
  }
  updateShift(shift: Shift): Observable<Shift> {
    let m = shift.messenger;
    shift.messenger = new Messenger(shift.messenger).copy();
    return this.http.post<Shift>(`${BACKEND_IP}/shifts/update`, shift, {headers: this.backendAuthHeader}).pipe(
      take(1),
      map(s => {
        s.messenger = m;
        return HttpService._prepareShift(s);
      })
    );
  }
  getShift(id: string): Observable<Shift> {
    return this.http.post<Shift>(`${BACKEND_IP}/shifts/find`, id, {headers: this.backendAuthHeader}).pipe(
      take(1),
      map(s => {
        return HttpService._prepareShift(s);
      })
    );
  }
  getShiftsForDay(date: Date): Observable<Shift[]> {
    return this.http.post<Shift[]>(`${BACKEND_IP}/shifts/all/date`, {date: date}, {headers: this.backendAuthHeader}).pipe(
      take(1),
      map(list => {
        return HttpService._prepareShifts(list);
      })
    );
  }
  getShiftsForToday(): Observable<Shift[]> {
    return this.http.get<Shift[]>(`${BACKEND_IP}/shifts/all/today`, {headers: this.backendAuthHeader}).pipe(
      take(1),
      map(list => {
        return HttpService._prepareShifts(list);
      })
    );
  }
  getOpenShiftsForToday(): Observable<Shift[]> {
    return this.http.get<Shift[]>(`${BACKEND_IP}/shifts/all/today`, {headers: this.backendAuthHeader}).pipe(
      take(1),
      map(list => {
        return HttpService._prepareShifts(list.filter(s => !s.end));
      })
    );
  }
  getShiftsForMessengerAndMonth(messenger: Messenger, month?: Date): Observable<Shift[]> {
    return this.http.post<Shift[]>(`${BACKEND_IP}/shifts/all/month/messenger`, {
      id: messenger.id,
      date: month || new Date(),
    }, {headers: this.backendAuthHeader}).pipe(
      take(1),
      map(list => {
        return HttpService._prepareShifts(list);
      })
    );
  }
  exportShfitsForMessengerAndMonth(messenger: Messenger, month: Date): Observable<any> {
    let headers = new HttpHeaders({Accept: 'application/xml'});
    headers = headers.set('Accept', 'application/xml');
    return this.http.post<Shift[]>(`${BACKEND_IP}/shifts/export/month/messenger`, {
      id: messenger.id,
      date: month
    }, {
      headers: this.backendAuthHeader,
      responseType: 'blob' as 'json'
    }).pipe(
      take(1)
    );
  }
  getShiftList(): Observable<Shift[]> {
    return this.http.get<Shift[]>(`${BACKEND_IP}/shifts/all`, {headers: this.backendAuthHeader}).pipe(
      take(1),
      map(list => {
        return list;
      })
    );
  }
  deleteShift(shift: Shift): Observable<boolean> {
    // GC.shifts.splice(GC.shifts.indexOf(shift), 1);
    return this.http.post<boolean>(`${BACKEND_IP}/shifts/delete`, {id: shift.id}, {headers: this.backendAuthHeader}).pipe(
      take(1),
    );
  }

  getExpenseList(): Observable<Expense[]> {
    return this.http.get<Expense[]>(`${BACKEND_IP}/expenses/all`, {headers: this.backendAuthHeader}).pipe(
      take(1),
      map(list => {
        return HttpService._prepareExpenses(list);
      })
    );
  }
  createExpense(expense: Expense): Observable<Expense> {
    return this.http.post<Expense>(`${BACKEND_IP}/expenses/create`, expense, {headers: this.backendAuthHeader}).pipe(
      take(1),
      map(ex => {
        ex = HttpService._prepareExpense(ex);
        GC.expenses.push(ex)
        return ex
      })
    );
  }
  updateExpense(expense: Expense): Observable<Expense> {
    return this.http.post<Expense>(`${BACKEND_IP}/expenses/update`, expense, {headers: this.backendAuthHeader}).pipe(
      take(1),
      map(s => {
        return HttpService._prepareExpense(s);
      })
    );
  }
  getExpense(id: string): Observable<Expense> {
    return this.http.post<Expense>(`${BACKEND_IP}/expenses/find`, id, {headers: this.backendAuthHeader}).pipe(
      take(1),
      map(s => {
        return HttpService._prepareExpense(s);
      })
    );
  }
  getExpensesForClientAndMonth(client: Client, month?: Date): Observable<Expense[]> {
    return this.http.post<Expense[]>(`${BACKEND_IP}/expenses/client/month`, {
      id: client.id,
      date: month || new Date(),
    }, {headers: this.backendAuthHeader}).pipe(
      take(1),
      map(list => {
        return HttpService._prepareExpenses(list);
      })
    );
  }
  deleteExpense(expense: Expense): Observable<boolean> {
    return this.http.post<boolean>(`${BACKEND_IP}/expenses/delete`, {id: expense.id}, {headers: this.backendAuthHeader}).pipe(
      take(1),
    );
  }

  getSpecialPriceList(): Observable<SpecialPrice[]> {
    return this.http.get<SpecialPrice[]>(`${BACKEND_IP}/prices/all`, {headers: this.backendAuthHeader}).pipe(
      take(1),
      map(list => {
        return HttpService._prepareSpecialPrices(list);
      })
    );
  }
  createSpecialPrice(price: SpecialPrice): Observable<SpecialPrice> {
    return this.http.post<SpecialPrice>(`${BACKEND_IP}/prices/create`, price, {headers: this.backendAuthHeader}).pipe(
      take(1),
      map(price => {
        price = HttpService._prepareSpecialPrice(price);
        GC.specialPrices.push(price);
        return price;
      })
    );
  }
  updateSpecialPrice(price: SpecialPrice): Observable<SpecialPrice> {
    return this.http.post<SpecialPrice>(`${BACKEND_IP}/prices/update`, price, {headers: this.backendAuthHeader}).pipe(
      take(1),
      map(price => {
        price = HttpService._prepareSpecialPrice(price);
        GC.specialPrices.findAndReplace(price);
        return price;
      })
    );
  }
  getSpecialPrice(id: string): Observable<SpecialPrice> {
    return this.http.post<SpecialPrice>(`${BACKEND_IP}/prices/find`, id, {headers: this.backendAuthHeader}).pipe(
      take(1),
      map(price => {
        return HttpService._prepareSpecialPrice(price);
      })
    );
  }
  deleteSpecialPrice(price: SpecialPrice): Observable<boolean> {
    return this.http.post<boolean>(`${BACKEND_IP}/prices/delete`, {id: price.id}, {headers: this.backendAuthHeader}).pipe(
      take(1),
      tap(() => {
        GC.specialPrices.findAndRemove(price);
      }),
    );
  }

  saveNote(note: Note): Observable<Note> {
    note.creator = note.creator.copy();
    note.text = note.text.trim();
    if (note.id) {
      return this.http.post<Note>(`${BACKEND_IP}/notes/update`, note, {headers: this.backendAuthHeader}).pipe(
        take(1)
      );
    } else {
      return this.http.post<Note>(`${BACKEND_IP}/notes/create`, note, {headers: this.backendAuthHeader}).pipe(
        take(1)
      );
    }
  }
  getNotes(date: Date): Observable<Note[]> {
    return this.http.post<Note[]>(`${BACKEND_IP}/notes/find/date`, {date}, {headers: this.backendAuthHeader}).pipe(
      take(1),
      map(notes => {
        return notes.map(n => new Note(n));
      })
    );
  }
  deleteNote(note: Note): Observable<boolean> {
    return this.http.post<Note>(`${BACKEND_IP}/notes/delete`, note, {headers: this.backendAuthHeader}).pipe(
      take(1),
      map(() => {
        return true;
      })
    );
  }

  getWeekStatistic(): Observable<DayStatistic[]> {
    return this.http.get<WeekStatistic>(`${BACKEND_IP}/statistics/week`, {headers: this.backendAuthHeader}).pipe(
      take(1),
      map(stat => {
        let res: DayStatistic[] = [];
        let days = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag']
        days.forEach(day => {
          res.push(stat.statistics.find(item => item.day === day));
        })
        return res;
      })
    );
  }
  getDetailedWeekStatistic(): Observable<DayStatistic> {
    return this.http.get<DayStatistic>(`${BACKEND_IP}/statistics/week/detailed`, {headers: this.backendAuthHeader}).pipe(
      take(1)
    );
  }
  getDayStatistic(): Observable<TimeframeStatistic[]> {
    return this.http.get<TimeframeStatistic[]>(`${BACKEND_IP}/statistics/day`, {headers: this.backendAuthHeader}).pipe(
      take(1),
    );
  }

  getRawConfigItems(): Observable<RawConfig[]> {
    return this.http.get<RawConfig[]>(`${BACKEND_IP}/configs/all`, {headers: this.backendAuthHeader}).pipe(
      take(1),
    );
  }
  saveConfigItem(key: string, value: string): Observable<RawConfig> {
    return this.http.post<RawConfig>(`${BACKEND_IP}/configs/save`, {name: key, value: value}, {headers: this.backendAuthHeader}).pipe(
      take(1),
    );
  }

  createZone(zone: Zone): Observable<Zone> {
    return this.http.post<Zone>(`${BACKEND_IP}/zones/create`, zone, {headers: this.backendAuthHeader}).pipe(
      take(1),
      map(zone => {
        zone = HttpService._prepareZone(zone);
        GC.zones.push(zone);
        return zone;
      })
    );
  }
  updateZone(zone: Zone): Observable<Zone> {
    GC.zones.findAndReplace(zone);
    return this.http.post<Zone>(`${BACKEND_IP}/zones/update`, zone, {headers: this.backendAuthHeader}).pipe(
      take(1),
    );
  }
  deleteZone(zone: Zone): Observable<Zone> {
    GC.zones.findAndRemove(zone);
    return this.http.post<Zone>(`${BACKEND_IP}/zones/delete`, zone, {headers: this.backendAuthHeader}).pipe(
      take(1),
    );
  }
  getZones(): Observable<Zone[]> {
    return this.http.get<Zone[]>(`${BACKEND_IP}/zones/all`, {headers: this.backendAuthHeader}).pipe(
      take(1),
      map(list => {
        return list.map(z => {
          z.coordinates = [z.coordinates as unknown as Position[]]
          return new Zone(z);
        })
      })
    );
  }
  searchZones(value: string): Observable<Zone[]> {
    return of(GC.zones).pipe(
      take(1),
      map(list => {
        return list.filter(option => {
          return option.name.toLowerCase().includes(value.toLowerCase())
        });
      })
    );
  }

  searchPostCodeZones(value: string): Observable<Zone[]> {
    return of(GC.postCodeZones).pipe(
      take(1),
      map(list => {
        return list.filter(option => {
          return option.name.toLowerCase().includes(value.toLowerCase())
        });
      })
    );
  }

  createInvoice(clientId: string, startDate: Date, endDate: Date): Observable<Invoice> {
    return this.http.post<Invoice>(`${BACKEND_IP}/invoices/create`, {
      clientId: clientId,
      accountingPeriodStart: startDate,
      accountingPeriodEnd: endDate
    }, {headers: this.backendAuthHeader}).pipe(
      take(1),
    );
  }
  getInvoicePDF(id: string): Observable<any> {
    let headers = new HttpHeaders({Accept: 'application/pdf'});
    return this.http.post<any>(`${BACKEND_IP}/invoices/get/pdf`, {id}, {
      headers: this.backendAuthHeader,
      responseType: 'blob' as 'json'
    }).pipe(
      take(1),
    );
  }

  exportClients(): Observable<any> {
    let headers = new HttpHeaders({Accept: 'application/xlsx'});
    return this.http.post<any>(`${BACKEND_IP}/clients/all/xlsx`, {columns: ['clientId', 'name', 'street', 'zipCode', 'city', 'info']}, {
      headers: this.backendAuthHeader,
      responseType: 'blob' as 'json'
    }).pipe(
      take(1),
    );
  }

  recreateBlueprints(): void {
    this.http.get<null>(`${BACKEND_IP}/jobs/recreate/blueprints`).subscribe(() => {
      GC.openSnackBarLong('blueprints neu erstellt')
    });
  }

  lex_getProfileInfo(): Observable<LexProfile> {
    return this.http.get<LexProfile>(`${this.LEX_API_PROXY}/profile`, {headers: this.lexAuthHeader}).pipe(
      take(1),
    );
  }
  lex_createInvoice(invoice: LexInvoice): Observable<LexCreateResponse> {
    console.log(invoice)
    return this.http.post<LexCreateResponse>(`${this.LEX_API_PROXY}/invoices`, invoice, {headers: this.lexAuthHeader}).pipe(
      take(1),
    );
  }
  lex_getContacts(page: number): Observable<LexContact[]> {
    return this.http.get<LexContactsListPage>(`${this.LEX_API_PROXY}/contacts/?page=${page || 0}&size=100`, {headers: this.lexAuthHeader}).pipe(
      take(1),
      map(response => {
        return response.content;
      })
    );
  }
  lex_getInvoices(client: LexContact, page?: number): Observable<LexInvoiceListPage> {
    return this.http.post<LexInvoiceListPage>(`${this.LEX_API_PROXY}/voucherlist?voucherType=invoice&voucherStatus=open,draft,paid,paidoff,voided&contactId=${client.id}&page=${page || 0}`, {headers: this.lexAuthHeader}).pipe(
      take(1),
    );
  }
  lex_findClient(client: Client): Observable<LexContact> {
    return this.http.get<LexContactsListPage>(`${this.LEX_API_PROXY}/contacts/?customer=true&name=${client.name}`, {headers: this.lexAuthHeader}).pipe(
      take(1),
      map(response => response.content?.length > 0 ? new LexContact(response.content[0]) : null)
    );
  }
  lex_createContact(client: Client): Observable<string> {
    let c = new LexContact({}, client);
    return this.http.post<LexCreateResponse>(`${this.LEX_API_PROXY}/contacts`, c, {headers: this.lexAuthHeader}).pipe(
      take(1),
      map(response => response.id)
    );
  }

  lex_updateContact(contact: LexContact): Observable<boolean> {
    return this.http.put<LexCreateResponse>(`${this.LEX_API_PROXY}/contacts/${contact.id}`, contact, {headers: this.lexAuthHeader}).pipe(
      take(1),
      map(() => true)
    );
  }
}
