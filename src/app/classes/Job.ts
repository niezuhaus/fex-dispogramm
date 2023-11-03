import {
  Cargotype,
  IPoint,
  LocType,
  MorningTour,
  PassType,
  SpecialPriceType,
  RoutingMode,
  BranchSet
} from "../common/interfaces";
import {Price} from "./Price";
import {GC} from "../common/GC";
import {Geolocation, Station} from "./Geolocation";
import {RegularJobDialogComponent} from "../dialogs/regular-job-dialog.component";
import {Observable, switchMap, zip} from "rxjs";
import {FexRules, PriceStrategy} from "./PriceStrategies";
import {Cheapest, PrimitRound, Round, RouteStrategy, Star} from "./RouteStrategies";
import {AreYouSureDialogComponent} from "../dialogs/are-you-sure-dialog.component";
import {Messenger} from "./Messenger";
import {Client} from "./Client";
import {Expense} from "./Expense";
import {map} from "rxjs/operators";
import {Zone} from "./Zone";
import {SpecialPrice} from "./SpecialPrice";
import {CalendarRangeDialogComponent} from "../dialogs/calendar-range-dialog/calendar-range-dialog.component";

export abstract class AbstractJob {
  center: Station; // clients position NOT necessarily the center
  pickups: Geolocation[];
  deliveries: Geolocation[];
  client: Client;
  id: string;
  name: string;
  price: Price = new Price();

  get _showPrice() {return this.price}

  traveldist = 0;
  cargoType: Cargotype = Cargotype.none;
  description = '';
  routeMode: RoutingMode = RoutingMode.normal;

  clientInvolved = true;
  morningTour: MorningTour;
  isNote = false;

  constructor(data?: Partial<AbstractJob>) {
    if (data) {
      Object.assign(this, data);
    }
    this.price = this.price ? new Price(this.price) : new Price();
    this.center = this.center ? new Station(this.center) : this.center;

    this.deliveries = this.deliveries?.filter(s => s !== null).map(s => new Station(s));
    this.pickups = this.pickups?.map(s => new Station(s));

    if (!this.clientInvolved) {
      this.pickups.length === 1 ? this.pickups[0].locType = LocType.centerPickup
        : this.deliveries.length === 1 ? this.deliveries[0].locType = LocType.centerDelivery : ''
    }
  }
}

export class Job extends AbstractJob {

  date: Date;
  creationDate: Date;
  creator: Messenger;
  dispatcher: Messenger
  messenger: Messenger;
  billingTour: boolean;
  connection = false;
  distributeNumber = 0;
  colour: string = '#0000';

  set _colour(c: string) {
    this.colour = c;
    this.save('farbe geändert', true).subscribe(() => {
      GC.refreshNeeded.emit(true);
    })
  }

  routeStrategyObj: RouteStrategy = new Cheapest();
  priceStrategyObj: PriceStrategy = new FexRules();
  specialPrice: SpecialPrice = new SpecialPrice();

  public set _priceMode(mode: SpecialPriceType) {
    this._priceStrategy = GC.specialPrices.find(s => s.type === mode).id
  }

  public get _priceStrategy(): string {
    return this.specialPrice?.id || '';
  }

  public set _priceStrategy(id: string) {
    if (!id?.length) {
      this.specialPrice = new SpecialPrice()
    } else {
      const sp = GC.specialPrices.fastfind(id);
      this.specialPrice = sp ? sp : new SpecialPrice();
      if (this.specialPrice?.type === SpecialPriceType.group) {
        this._routeMode = RoutingMode.star;
      }
    }
    this.priceStrategyObj = this.specialPrice?.priceStrategy;
  }

  public set _routeMode(mode: RoutingMode) {
    switch (mode) {
      case RoutingMode.normal:
        this.routeStrategyObj = new Cheapest();
        break;

      case RoutingMode.star:
        this.routeStrategyObj = new Star();
        break;

      case RoutingMode.shortestRound:
        this.routeStrategyObj = new Round();
        break;

      case RoutingMode.primitiveRound:
        this.routeStrategyObj = new PrimitRound();
        break;
    }
    this.routeMode = this.routeStrategyObj.mode;
  }

  regularJob: RegularJob;
  regularJobId: string;

  expenses: Expense[] = [];

  get _expenses() {
    return this.expenses.reduce((a, b) => a + b.price._brutto, 0);
  }

  get expenseSum(): number {
    return this.expenses.map(ex => ex.price._brutto).reduce((a, b) => a + b, 0);
  }

  private waitingMinutes: number;

  set _waitingMinutes(minutes: number) {
    if (isNaN(minutes)) {
      return;
    }
    if (minutes < 0) {
      minutes = 0;
    }
    this.waitingMinutes = minutes;
    this.waitingPrice = new Price().waitingMinutes(minutes);
    this.price = this.priceWithoutWaitingPrice._add(this.waitingPrice);
    this.priceBackup = this.price.copy();
    this.save('warteminuten aktualisiert!', true).subscribe(() => {
    });
  }

  get _waitingMinutes(): number {
    return this.waitingMinutes
  }

  canceled = false;

  set _canceled(value: boolean) {
    this.canceled = value;
    if (value) {
      this.messenger = null;
    }
    this.save(value ? 'tour als abgesagt markiert' : 'tour als nicht abgesagt markiert').subscribe(() => {
      GC.refreshNeeded.emit(true);
    });
  }

  get _canceled(): boolean {
    return this.canceled;
  }

  private falseArrival: boolean;

  set _falseArrival(value: boolean) {
    this.falseArrival = value;
    this.calcPrice();
    this.save(value ? 'fehlanfahrt wurde markiert' : 'fehlanfahrt entfernt').subscribe(() => {
      GC.tourplan.refresh();
    });
  }

  get _falseArrival(): boolean {
    return this.falseArrival
  }

  priceBackup: Price = new Price();
  customPrice = false;
  extraPrice = false;
  waitingPrice = new Price();
  priceWithoutWaitingPrice = new Price();
  groupExtra = new Price();
  searchStr: string;

  finished: boolean;

  set _finished(value: boolean) {
    if (this.date.timeUntil() > 0) {
      GC.openSnackBarLong('fehler: tour liegt in der zukunft')
      return;
    }

    let finish = () => {
      this.finished = value;
      this.init();
      (value ?
        this.save('tour wurde abgeschlossen.') :
        this.save('abgeschlossene tour wurde wieder geöffnet.'))
        .subscribe(() => {
        });
    }

    if (value && !this.messenger) {
      const dialog = GC.dialog.open(AreYouSureDialogComponent, {
        data: {
          headline: 'bitte gib an, wer diese tour gefahren ist, bevor du sie abschließt',
          verbYes: 'keine:n kurier:in festlegen',
          verbNo: 'abbrechen',
          job: this,
          messSearch: true
        }
      })
      dialog.componentInstance.confirm.subscribe(value => {
        if (value instanceof Messenger) {
          this.messenger = value.copy();
        }
        finish();
      })
    } else {
      finish();
    }
  }

  get isPlanned(): boolean {
    return this.date.getTime() > this.creationDate?.getTime()
  }

  set _center(center: Station) {
    center.passType = PassType.center;
    center._job = this;
    this.center = center;
  }

  get _center(): Station {
    let res: Geolocation;
    if (this.clientInvolved) {
      return this.center;
    } else {
      if (this.pickups.length === 1 && !this.pickups[0].hasBacktour) {
        res = this.pickups[0];
        res.locType = LocType.centerPickup;
      } else if (this.deliveries.length === 1) {
        res = this.deliveries[0];
        res.locType = LocType.centerDelivery;
      }
    }
    if (!res) {
      return null;
    }
    res.passType = PassType.center;
    res._job = this;
    return new Station(res);
  }


  edit: boolean;
  index: number;

  hasData = false;
  initiated = false;

  pBacktours: Geolocation[] = [];
  dBacktours: Geolocation[] = [];
  pBranches: BranchSet = {branches: []};
  dBranches: BranchSet = {branches: []};
  pBacktourBranches: BranchSet = {branches: []};
  dBacktourBranches: BranchSet = {branches: []};

  get set(): BranchSet {
    return {
      branches: this.pBranches.branches
        .concat(this.dBacktourBranches.branches)
        .concat(this.dBranches.branches)
        .concat(this.pBacktourBranches.branches)
    }
  };

  get hasClient(): boolean {
    return !!(this.client?.clientId);
  }

  abakus = new Price(5, {brutto: true});

  constructor(data?: Partial<Job>) {
    super(data)
    if (data) {
      Object.assign(this, data);
    }
    this.creator = this.creator ? new Messenger(this.creator).copy() : null;
    this.dispatcher = this.dispatcher ? new Messenger(this.dispatcher).copy() : null;
    this.messenger = this.messenger ? new Messenger(this.messenger).copy() : null;
    this.date = this.date ? new Date(this.date) : new Date();
    this.creationDate = this.creationDate ? new Date(this.creationDate) : new Date();
    this.price = new Price(this.price);
    this.price.expenses = this.expenses;
    this.priceBackup = this.price.copy();
    this.specialPrice = this.specialPrice ? new SpecialPrice(this.specialPrice) : new SpecialPrice();
    if (!(this instanceof RegularJob)) {
      this.regularJob = this.regularJob ? new RegularJob(this.regularJob) : null;
    }

    if (!this.id) {
      this.billingTour = this.client?.billClient;
    } else {
      if (this.waitingMinutes > 0) {
        this.waitingPrice = new Price().waitingMinutes(this.waitingMinutes);
        this.priceWithoutWaitingPrice = this.price._sub(this.waitingPrice);
      } else {
        this.priceWithoutWaitingPrice = this.price.copy();
      }
    }

    const filterBacktours = (arr: Geolocation[], from: Geolocation[]): Geolocation[] => {
      if (!arr || !from) {
        return arr;
      }
      if (arr.length) {
        arr = arr.filter(d => {
          const backtour = from.find(p => {
            if (!p || !d) {
              console.log('no p')
              return false;
            } else {
              return p.id === d.id
            }
          });
          if (backtour) {
            backtour.hasBacktour = true;
            return false;
          } else {
            return true
          }
        })
      }
      return arr;
    }

    this.pickups = filterBacktours(this.pickups, this.deliveries);
    this.deliveries = filterBacktours(this.deliveries, this.pickups);
  }

  public init(options?: { pushPrice?: Price, pushDate?: Date }): Job {
    if (options?.pushDate) {
      this.date = options.pushDate;
    }
    this._priceStrategy = this.specialPrice?.id;
    this._routeMode = this.routeMode;
    if (!this.pickups || !this.deliveries || this.pickups.length + this.deliveries.length === 0) {
      this.pBranches = {branches: []};
      this.dBranches = {branches: []};
      return this;
    }
    this._center = this.center;

    const pickups: Geolocation[] = this.pickups.filter(loc => loc.locType !== LocType.centerPickup).concat(
      this.deliveries.filter(loc => loc.hasBacktour === true).map(l => {
        l = new Geolocation(l);
        l.locType = LocType.pickup;
        return l;
      }));
    const deliveries: Geolocation[] = this.deliveries.filter(loc => loc.locType !== LocType.centerDelivery).concat( // .filter(loc => loc.locType === LocType.delivery)
      this.pickups.filter(loc => loc.hasBacktour === true).map(l => {
        l = new Geolocation(l);
        l.locType = LocType.delivery;
        return l;
      }))
    if (pickups.length > 5 || deliveries.length > 5) {
      // todo: hinweis zum umschalten
      this._priceMode = SpecialPriceType.group;
      this._routeMode = RoutingMode.star
    }
    this.pBranches = pickups.length >= 1 ? this.routeStrategyObj.findBranchSet(this, pickups, this._center, LocType.pickup) : {branches: []};
    deliveries.forEach(loc => loc.locType = LocType.delivery);
    this.dBranches = deliveries.length >= 1 ? this.routeStrategyObj.findBranchSet(this, deliveries, this._center, LocType.delivery) : {branches: []};

    // applying connection discount
    const branches = this.set.branches;
    branches.forEach(b => b.finish());
    if (branches.length > 1) {
      branches.slice(1).forEach(b => b.isConnection = true);
    }

    this.hasData = true;
    let calcedPrice = this.calcPrice();
    if (this.regularJob?.monthlyPrice?._netto > 0) {
      this.regularJob.price = this.regularJob.monthlyPrice.regularJobPrice;
    }
    this.price.set(calcedPrice);
    if (options?.pushPrice && calcedPrice._netto !== options?.pushPrice._netto) {
      this.customPrice = true;
    }
    this.traveldist = this.calcDist().round(2);
    this.initiated = true;
    this.getAllStations().filter(station => station.locType !== LocType.client && station.locType < 5).forEach((station) => {
      station.calcPrice().makePriceLevel().makePopUpContent();
    });
    return this;
  }

  public priceString(): string {
    let res = '';
    res += this.price?.toString(!this.billingTour) || this.price.toString(!this.billingTour);
    res += this.billingTour ? ' netto' : ' brutto'
    res += this._waitingMinutes > GC.config.prices.waitingTimeQuantityIncl ? ` (inkl. ${this.waitingPrice.toString(!this.billingTour)} für ${this.waitingMinutes}min)` : '';
    return res;
  }

  public getAllStations(onlyLocations?: boolean): Station[] {
    if (!this.center) {
      return [];
    }
    let res: Station[] = [];
    if (this.initiated) {
      res.push(this._center);
      this.pBranches.branches.forEach(b => res = res.concat(b.route));
      this.dBranches.branches.forEach(b => res = res.concat(b.route));
      if (!onlyLocations) {
        this.pBacktourBranches.branches.forEach(b => res = res.concat(b.route));
        this.dBacktourBranches.branches.forEach(b => res = res.concat(b.route));
      }
    } else {
      res = this.deliveries.concat(this.pickups).map(l => l as Station);
    }
    return res;
  }

  public getAllPoints(): IPoint[] {
    if (!this.center) {
      return [];
    }
    let res: IPoint[] = [];
    res.push(this.center);
    this.pBranches.branches.forEach(b => res = res.concat(b.routeWithBridges));
    this.dBranches.branches.forEach(b => res = res.concat(b.routeWithBridges));
    return res;
  }

  public calcPrice(): Price {
    if (this instanceof RegularJob) {
      return this.monthlyPrice.regularJobPrice;
    }

    if (this.set.branches.length === 0) {
      this.init();
    }
    let res = new Price();

    if (this.falseArrival) {
      res.add(GC.config.prices.falseArrival);
    } else {
      if (this.pBranches.branches.length + this.dBranches.branches.length === 1 && this.pBranches.branches[0]?.route[0].id === '6220a75227252230a8dec5a3') {
        return this.abakus;
      }
      // checks if hb nord mode needs to be activated
      // todo generative check for all zone dependent specialprices
      if (this.getAllStations().find(s => s.zipCode.slice(0, 2) === '287')) {
        console.log('would activate hb nord')
        // this._priceMode = PriceMode.hbNord;
      }

      // addiert die preise der einzelnen branches
      res.add(this.set.price || this.priceStrategyObj.calcBranchSetPrice(this.set))

      if (this.priceStrategyObj.mode === SpecialPriceType.group || this.specialPrice.type === SpecialPriceType.group) {
        if (this.distributeNumber > this.deliveries.length) {
          this.groupExtra = this.specialPrice.group._mul(this.distributeNumber - this.deliveries.length);
          res.add(this.groupExtra);
        } else {
          this.distributeNumber = this.deliveries.length;
        }
      }
      // adds a potential extra (e.g. cargo bike etc.)
      res.add(GC.config.prices.extras[this.cargoType]);

      // subtracts a manually added connection discount
      if (this.connection) {
        res.sub(GC.config.prices.connectionDiscount);
      }
    }

    res.add(this.waitingPrice);

    // this.priceBackup = res.copy();
    this.price = res;
    return res;
  }

  /**
   * @return the total length of all branches in km
   * */
  public calcDist(): number {
    let res = 0;
    this.pBranches.branches.concat(this.dBranches.branches)
      .forEach(branch => res += branch.distance);
    this.pBacktourBranches.branches.concat(this.dBacktourBranches.branches)
      .forEach(branch => res += branch.distance);
    return res;
  }

  static calcBranchSetDist(set: BranchSet): number {
    let d = 0;
    set.branches.forEach(branch => {
      d += branch.distance;
    });
    return d;
  }

  public changePrice(value: string, isBrutto: boolean): void {
    if (value.trim() === '') {
      this.extraPrice = false;
    } else {
      value = value.replace(',', '.');
      this.extraPrice = parseFloat(value) !== (isBrutto ? this.priceBackup._brutto : this.priceBackup._netto);
    }
    const newPrice = parseFloat(value);
    if (!(newPrice >= 0)) {
      return;
    }
    if (isBrutto) {
      this.price._brutto = newPrice;
    } else {
      this.price._netto = newPrice;
    }
  }

  private getPickups(): Geolocation[] {
    const res: Geolocation[] = [];
    if (this._center?.locType === LocType.centerPickup) {
      res.push(this._center);
    }
    this.pBranches.branches.concat(this.dBacktourBranches.branches).forEach(branch => {
      branch.job = null;
      branch.center._job = null;
      branch.route.forEach(loc => {
        loc._job = null;
        loc.zone = null;
        loc.branch = null;
        res.push(loc);
      });
    });
    return res;
  }

  private getDeliveries(): Geolocation[] {
    const res: Geolocation[] = [];
    if (this._center?.locType === LocType.centerDelivery) {
      res.push(this._center);
    }
    this.dBranches.branches.concat(this.pBacktourBranches.branches).forEach(branch => {
      branch.job = null;
      branch.center._job = null;
      branch.route.forEach(loc => {
        loc._job = null;
        loc.zone = null;
        loc.branch = null;
        res.push(loc);
      });
    });
    return res;
  }

  public getZones(): Zone[] {
    let res: Zone[] = [];
    this.pBranches.branches.concat(this.dBranches.branches).forEach(b => {
      res = res.concat(b.zones)
    })
    return [...new Set(res)]
  }

  public exportData(): Job {
    this.center._job = null;
    this.pickups = this.getPickups();
    this.deliveries = this.getDeliveries();
    this.pickups.forEach(p => p._job = null)
    this.deliveries.forEach(p => p._job = null)
    this.price = this.price._netto > 0 ? this.price : this.priceBackup;
    this.routeMode = this.routeStrategyObj ? this.routeStrategyObj.mode : this.routeMode;
    this.priceStrategyObj = null;
    this.creator = GC.dispatcher().messenger;
    return this;
  }

  public save(msg?: string, short?: boolean): Observable<Job> {
    this.specialPrice = this.specialPrice?.type === SpecialPriceType.fexrules ? null : this.specialPrice;
    let ob: Observable<Job>;
    if (this.id) {
      ob = GC.http.updateJob(this.initiated ? this.exportData() : this)
    } else {
      ob = GC.http.createJob(this.exportData());
    }
    return ob.pipe(
      map(job => {
        if (msg) {
          short ? GC.openSnackBarShort(msg) : GC.openSnackBarLong(msg);
        }
        job.init();
        return job;
      })
    );
  }

  public delete(verb: string, perfectForm: string): void {
    const dialog = GC.dialog.open(AreYouSureDialogComponent, {
      data: {
        headline: `möchtest du diesen auftrag ${verb}?`,
        verbYes: verb,
        verbNo: 'abbrechen',
        job: this,
        highlightNo: true,
        warning: true
      }
    });
    dialog.componentInstance.confirm.subscribe(() => {
      GC.http.deleteJob(this).subscribe(() => {
        GC.openSnackBarLong(`auftrag wurde ${perfectForm}`);
        GC.dialog.closeAll();
        GC.refreshNeeded.emit(true);
      });
    });
  }

  contains(str: string): boolean {
    if (!this.searchStr) {
      let s = '';
      this.pickups.concat(this.deliveries).forEach(l => s += l.name.toLocaleLowerCase());
      this.searchStr = s;
    }
    return this.searchStr.includes(str.toLocaleLowerCase());
  }

  public reset(): void {
    this.id = null;
    this.finished = false;
    this.price = new Price();
    this.cargoType = 0;
    this.date = new Date();
    this.extraPrice = false;
    this.center = null;
    this.pickups = [];
    this.deliveries = [];
    this.pBacktours = [];
    this.dBacktours = [];
    this.pBranches.branches = [];
    this.dBranches.branches = [];
    this.pBacktourBranches.branches = [];
    this.dBacktourBranches.branches = [];
    this.traveldist = 0;
    this.clientInvolved = true;
    this.connection = false;
    this._priceStrategy = null;
    this._routeMode = RoutingMode.normal;
    this.hasData = false;
    this.regularJob = null;
  }

  openEditDialog(): void {
    const rj = GC.regularJobs.find(rj => rj.id === this.regularJobId)
    if (!rj) {
      GC.openSnackBarLong('ERROR: festtour nicht gefunden');
      return;
    }
    GC.dialog.open(RegularJobDialogComponent, {
      data: {
        rj: rj,
      }
    });
  }

  addExpense(expense: Expense): void {
    expense.save().subscribe(ex => {
      this.expenses.push(ex);
      this.price.expenses = this.expenses;
      GC.tourplan.refresh();
    })
  }

  deleteExpense(expense: Expense) {
    // const dialog = GC.dialog.open(AreYouSureDialogComponent, {
    //   data: {
    //     headline: 'möchtest du die auslage löschen?',
    //     verbYes: 'ja',
    //     verbNo: 'abbrechen'
    //   }
    // });
    // dialog.componentInstance.confirm.subscribe(() => {
    //
    // });
    GC.http.deleteExpense(expense).subscribe(() => {
      GC.expenses.findAndRemove(expense);
      this.expenses.findAndRemove(expense)
      GC.openSnackBarLong(`auslage '${expense.description}' wurde gelöscht`)
      GC.tourplan.refresh();
    });
  }

  reverse(): void {
    const temp = this.pickups;
    this.pickups = this.deliveries;
    this.deliveries = temp;
    this.save('tour wurde umgedreht').subscribe(() => {
      this.init();
      GC.refreshNeeded.emit(true);
    });
  }

  acceptSpecialPrice(): void {
    if (!this.client.specialPrices) {
      return;
    }
    this.specialPrice = this.client?.specialPrices[0];
  }

  override toString(): string {
    let res = `${this.center.name}`;
    this.pickups.forEach(l => {
      res += ` ⇦ ${l.name} `
    })
    this.deliveries.forEach(l => {
      res += ` ⇨ ${l.name}  `
    })
    return res;
  }
}

export class RegularJob extends Job {
  monthlyPrice = new Price();
  dates: Date[];
  startDate: Date;
  endDate: Date;

  set _startDate(value: Date) {
    this.startDate.copyDate(value);
  }

  get _startDate(): Date {
    return this.startDate;
  }

  set _morningTour(value: number) {
    this.morningTour = value;
    this.save(`in ${GC.posttours[value - 1]} verschoben`).subscribe(() => {
      GC.dialog.closeAll();
      GC.tourplan.refresh();
    });
  }

  constructor(data?: Partial<RegularJob>) {
    super(data);
    // complete super-call
    if (data) {
      this.monthlyPrice = data.monthlyPrice;
      this.dates = data.dates.map(d => d ? new Date(d) : null);
      this.startDate = data.startDate ? new Date(data.startDate) : null;
      this.endDate = data.endDate ? new Date(data.endDate) : null;
      this.monthlyPrice = new Price(data.monthlyPrice);
    }

    if (!this.startDate) {
      if (this.dates) {
        this.startDate = this.dates.filter(d => !!d).sort((a, b) => b.getTime() - a.getTime())[0];
      } else {
        this.startDate = new Date().set(8);
        this.dates = this.startDate.datesSet();
      }
    } else {
      this.startDate.copyTime(this.dates[0]);
    }
  }

  convert(date?: Date): Observable<Job> {
    return GC.http.convertRegularJob(this, date || this.dates
      .find(d => d?.getDay() === (GC.tourplan.date.getDay()))
      .copy()
      .copyDate(GC.tourplan.date)
    );
  }

  setColor(colour: string): void {
    this.convert().subscribe(job => {
      job._colour = colour;
      // todo not ideal
      setTimeout(() => {GC.tourplan.refresh()}, 200)
    })
  }

  cancel(date?: Date): void {
    this.convert(date).subscribe(j => {
      j._canceled = true;
    })
  }

  cancelSilent(date: Date): Observable<Job> {
    return this.convert(date).pipe(
      switchMap(job => {
        job.canceled = true;
        job.messenger = null;
        return job.save();
      }))
  }

  cancelRange(): void {
    const dialog = GC.dialog.open(CalendarRangeDialogComponent, {
      data: {
        onlyDatePicker: false,
        headline: `${this.name} für einen zeitraum pausieren`,
        regularJob: this
      }
    });
    dialog.componentInstance.rangeSaved.subscribe(range => {
      const dates: Date[] = [this.getDate(range.start)];
      let start = range.start.copy();
      while (start.isBefore(range.end)) {
        dates.push(this.getDate(start.nextWorkingDay()))
        start = start.nextWorkingDay();
      }
      zip(dates.map(d => this.cancelSilent(d))).subscribe(() => {
        GC.openSnackBarLong('jobs gestrichen')
        GC.refreshNeeded.emit(true);
      })
    })
  }

  getDate(date: Date) {
    return this.dates.find(d => d.getDay() === date.getDay()).copyDate(date);
  }

  cancelPermanently(): void {
    const dialog = GC.dialog.open(AreYouSureDialogComponent, {
      data: {
        headline: `diese festtour ab ${GC.tourplan.date.dateStampShort()} streichen?`,
        verbYes: 'streichen',
        verbNo: 'abbrechen',
        highlightNo: true,
        warning: true,
        job: this,
      }
    })
    dialog.componentInstance.confirm.subscribe(() => {
      this.endDate = GC.tourplan.date.yesterday().set(0);
      this.save(`tour wurde ab ${GC.tourplan.isToday ? 'heute' : GC.tourplan.date.dateStampLong()} gestrichen`).subscribe(() => {
        GC.dialog.closeAll();
        GC.tourplan.refresh();
      })
    });
  }

  override openEditDialog(): void {
    GC.dialog.open(RegularJobDialogComponent, {
      data: {
        rj: this,
      }
    });
  }

  override save(msg?: string, short?: boolean): Observable<RegularJob> {
    return GC.http.updateRegularJob(this).pipe(
      map(rj => {
        if (msg) {
          short ? GC.openSnackBarShort(msg) : GC.openSnackBarLong(msg);
        }
        return rj;
      })
    );
  }
}
