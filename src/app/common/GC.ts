import {HttpService} from '../http.service';
import {
  BaseExtraExtraPrice,
  ConfigDataContract,
  ExtraPriceType,
  GeoCodingStrategy,
  GroupExtraPrice,
  IPoint,
  RawConfig,
} from './interfaces';
import {Job, RegularJob} from "../classes/Job";
import {Price} from "../classes/Price";
import {ChangeDetectorRef, EventEmitter} from "@angular/core";
import {ActivatedRoute, Router} from "@angular/router";
import {catchError, Observable, of, zip} from "rxjs";
import {MatSnackBar} from "@angular/material/snack-bar";
import {MatDialog} from "@angular/material/dialog";
import {LngLat} from "mapbox-gl";
import {map} from "rxjs/operators";
import {
  BingGeocoder,
  CombinedGeocoder,
  OSMGeocoder
} from "../views/newtour/inputfield/searchinput/searchinput.component";
import {getItem, setItem} from "../UTIL";
import {Geolocation} from "../classes/Geolocation";
import {Shift} from "../classes/Shift";
import packageJson from "../../../package.json";
import {TourplanComponent} from "../views/tourplan/tourplan.component";
import {Messenger} from "../classes/Messenger";
import {Client} from "../classes/Client";
import {Expense} from "../classes/Expense";
import {LexContact} from "../classes/LexInvoice";
import {SpecialPrice} from "../classes/SpecialPrice";
import {Zone} from "../classes/Zone";
import {plz} from "../../data/plz";
import {Location} from "@angular/common";
import {config} from "../config.json";

export enum ShiftType {
  dispoEarly,
  dispoLate,
  early,
  zwischi,
  late,
  double,
  kitaH,
  friki
}

export class GC {
  public static readonly version: string = packageJson.version;

  public static config: ConfigDataContract;
  public static readonly fallBackend: string = config.fallBackend;
  public static backendIP = getItem<string>('backendIP') || GC.fallBackend;
  public static authName: string = getItem<string>('apiAuthName') || config.apiAuthName;
  public static authPwd: string = getItem<string>('apiAuthPwd') || config.apiAuthPwd;
  public static recentBackendIPs: string[] = [];
  public static cantConnect = false;
  public static apiKeyMissing = false;

  public static geocoders: GeoCodingStrategy[] = [
    new OSMGeocoder(),
    new BingGeocoder(),
    new CombinedGeocoder(),
  ]

  /**
   * the mapbox map style
   */
  public static readonly MAPBOX_STYLE = 'mapbox://styles/niezuhaus/ckzog53n000kg14l8r2fuhjx3';
  /**
   * @todo use the key to push notifications in browser
   */
  public static readonly VAPID_PUBLIC_KEY = config.VAPID_PUBLIC_KEY;


  /**
   * fallback value for the initialization of some prices that get set up very early
   * when loading the page
   * @todo find a way to get rid of this
   */
  public static readonly VAT = 19;
  /**
   * location of bremen
   * @todo make it a config
   */
  public static readonly INIT_MAPCENTER = new LngLat(8.800386, 53.080839);
  public static readonly INIT_ZOOM = 12;

  /**
   * time in ms after the last keystroke before OSM and BING are queried
   */
  public static readonly DEBOUNCE_TIME = 700;
  /**
   * duration of the snackbar shown by the method <code>GC.openSnackbarLong()</code>
   */
  public static readonly SNACKBAR_DURATION_LONG = 3000;
  /**
   * duration of the snackbar shown by the method <code>GC.openSnackbarShort()</code>
   */
  public static readonly SNACKBAR_DURATION_SHORT = 1500;

  public static plzLeftOfWeser = ['28197', '28259', '28199', '28201', '28277', '28279'];
  public static city = ['28195', '28215'];
  public static bridges: IPoint[][] = [
    [{
      name: 'Stefanibrücke',
      latitude: 53.080037,
      longitude: 8.790483
    }], [{
      name: 'Bürgermeister-Smidt-Brücke',
      latitude: 53.077306,
      longitude: 8.798471
    }], [{
      name: 'Wilhelm-Kaisen-Brücke',
      latitude: 53.072455,
      longitude: 8.804089
    }], [{
      name: 'Erdbeerbrücke Nord',
      latitude: 53.064773,
      longitude: 8.853469
    }, {
      name: 'Erdbeerbrücke Süd',
      latitude: 53.055076,
      longitude: 8.851612
    }], [{
      name: 'Erdbeerbrücke Süd',
      latitude: 53.055076,
      longitude: 8.851612
    }, {
      name: 'Erdbeerbrücke Nord',
      latitude: 53.064773,
      longitude: 8.853469
    }]
  ];

  // color palette
  public static pickupTone = '#c92727';
  public static deliveryTone = '#7bc729';

  // literals
  public static dayLiterals = ['so', 'mo', 'di', 'mi', 'do', 'fr', 'sa'];
  public static numberLiteralsAkkusativ = ['', '', 'beiden', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'elf', 'zwölf']
  public static days = ['sonntag', 'montag', 'dienstag', 'mittwoch', 'donnerstag', 'freitag', 'samstag'];
  public static months = [
    'januar', 'februar', 'märz',
    'april', 'mai', 'juni',
    'juli', 'august', 'september',
    'oktober', 'november', 'dezember'
  ];
  public static monthLiteralsShort = [
    'Jan', 'Feb', 'Mär',
    'Apr', 'Mai', 'Jun',
    'Jul', 'Aug', 'Sep',
    'Okt', 'Nov', 'Dez'
  ];
  public static posttours = ['käferrunde', 'unirunde', 'große runde', 'kleine runde'];
  public static dispatcherShiftLiterals = ['dispo früh', 'dispo spät'];
  public static messengerShiftLiterals = ['früh', 'zwischi', 'spät', 'doppel', 'kita h', 'friki'];
  /**
   * all shift types that are relevant for showing on the messenger selector
   */
  public static tourplanShiftTypes = [
    ShiftType.early,
    ShiftType.zwischi,
    ShiftType.late,
    ShiftType.double,
    ShiftType.kitaH,
  ]
  /**
   *
   */
  public static startTimes: Map<ShiftType, Date>;
  public static endTimes: Map<ShiftType, Date>;

  /**
   * stores a boolean for every data-bank-cached element
   */
  public static loadedParts = {
    config: false,
    clients: false,
    lexClients: false,
    locations: false,
    jobsThisMonth: false,
    jobsLastNinetyDays: false,
    regularJobs: false,
    dispatcher: false,
    messenger: false,
    shifts: false,
    zones: false,
    expenses: false,
    specialPrices: false,
  };
  public static fullyLoaded = false;
  public static partLoaded = new EventEmitter<boolean>();
  private static loadedCompletely = new EventEmitter<boolean>();
  public static refreshNeeded = new EventEmitter<boolean>();
  public static loaded = () => {
    if (GC.fullyLoaded) {
      return of(true);
    } else {
      return GC.loadedCompletely;
    }
  }
  public static loadingProgress = 0;

  // routes
  public static routes = {
    tourplan: '/tourplan',
    weekplan: '/weekplan',
    clientlist: '/clients',
    client: '/client',
    newTour: '/new-tour',
    showTour: '/show-tour',
    locations: '/locations',
    messengers: '/messengers',
    statistics: '/statistics',
  }

  // instances
  public static http: HttpService;
  public static router: Router;
  private static snackbar: MatSnackBar;
  public static dialog: MatDialog;
  public static cd: ChangeDetectorRef;
  public static route: ActivatedRoute;
  public static location: Location;
  public static tourplan: TourplanComponent;
  public static tourplanActive: boolean;

  // ASYNC CACHING
  public static rawConfigsMap: Map<string, string>;
  public static rawConfigs: RawConfig[] = [];
  public static zones: Zone[];
  public static postCodeZones: Zone[];
  public static zoneByNames = new Map<string, Zone>()

  public static clients: Client[] = [];
  public static lexClients: LexContact[];
  public static expenses: Expense[] = [];
  public static specialPrices: SpecialPrice[] = [];
  public static specialPriceClients = new Map<string, SpecialPrice[]>;
  public static cashClientIds: String[] = [];
  public static clientInvoiceAmounts = new Map<string, Price>();
  public static locations: Geolocation[] = [];
  public static locationRatings = new Map<string, number>();
  public static clientLocations: Geolocation[] = [];
  public static salesThisMonth: Price;
  public static jobsThisMonth: Job[] = [];
  public static jobsLastNinetyDays: Job[] = [];
  public static regularJobs: RegularJob[] = [];
  public static messengers: Messenger[] = [];
  public static dispatchers: Messenger[] = [];

  public static jobsToday: Job[] = [];
  public static shiftsToday: Shift[] = [];
  public static messengerData = (date: Date) => {
    return (date.isToday() ? this.messengerDataToday : this.messengerDataAnyDay);
  }
  private static messengerDataToday = new Map<string, {
    jobs: Job[],
    sales: {
      nettoEarly: Price,
      nettoLate: Price,
      grossEarly: Price,
      grossLate: Price,
    },
    dates: {
      earliestDate: Date,
      latestDate: Date,
    }
  }>(); // string represents messenger id
  public static jobsAnyDay: Job[] = [];
  public static shiftsAnyDay: Shift[] = [];
  private static messengerDataAnyDay = new Map<string, {
    jobs: Job[],
    sales: {
      nettoEarly: Price,
      nettoLate: Price,
      grossEarly: Price,
      grossLate: Price,
    },
    dates: {
      earliestDate: Date,
      latestDate: Date,
    }
  }>()

  /**
   * all messengers from today's open shifts that are checked in either as
   * as a tourplan relevant type
   * @see tourplanShiftTypes
   */
  public static get messengerToday() {
    return GC.shiftsToday.filter(s => !s.end && GC.tourplanShiftTypes.includes(s.type as ShiftType)).map(s => s.messenger)
  };

  public static _dispatcher: Shift;
  public static dispatcherChanged = new EventEmitter<boolean>();
  public static messengersChanged = new EventEmitter<boolean>();

  public static get _isDezwo() {
    return GC._dispatcher?.messenger.nickname === 'dezwo';
  }

  public static locationChanged = new EventEmitter<boolean>();
  public static zonesLoaded = new EventEmitter<boolean>();


  constructor(
    private http: HttpService,
    private router: Router,
    private snackbar: MatSnackBar,
    private dialog: MatDialog,
    private cd: ChangeDetectorRef,
    private location: Location,
    private route: ActivatedRoute,
  ) {
    GC.http = http;
    GC.router = router;
    GC.snackbar = snackbar;
    GC.dialog = dialog;
    GC.cd = cd;
    GC.route = route;
    GC.location = location

    if (!GC.backendIP) {
      GC.backendIP = setItem<string>('backendIP', GC.fallBackend);
    }
    GC.recentBackendIPs = getItem<{ IPs: string[] }>('recentBackendIPs')?.IPs || [];

    GC.salesThisMonth = new Price();

    /**
     * @todo make setting
     */
    GC.startTimes = new Map<ShiftType, Date>([
      [ShiftType.dispoEarly, new Date().set(7, 45)],
      [ShiftType.dispoLate, new Date().set(12, 30)],
      [ShiftType.early, new Date().set(8)],
      [ShiftType.zwischi, new Date().set(10, 30)],
      [ShiftType.late, new Date().set(13)],
      [ShiftType.double, new Date().set(8)],
      [ShiftType.kitaH, new Date().set(9)],
    ])

    GC.endTimes = new Map<ShiftType, Date>([
      [ShiftType.dispoEarly, new Date().set(13)],
      [ShiftType.dispoLate, new Date().set(18, 30)],
      [ShiftType.early, new Date().set(13)],
      [ShiftType.zwischi, new Date().set(15)],
      [ShiftType.late, new Date().set(18)],
      [ShiftType.double, new Date().set(18)],
      [ShiftType.kitaH, new Date().set(12)],
    ]);

    // async caching
    GC.loadZones(http);
    GC.zonesLoaded.subscribe({
      next: () => {
        GC.loadConfig(http).subscribe(() => {
          GC.config = GC.readConfig();
          if (!GC.config.api.bing || !GC.config.api.mapbox || !GC.config.api.geoapify) {
            GC.apiKeyMissing = true;
            return;
          }
          http.keys = GC.config.api;

          GC.loadClients(http).subscribe(() => {
              GC.cashClientIds = GC.clients.filter(c => !c.billClient).map(c => c.id);
              GC.loadLexClients(http);
              GC.loadLocations(http);
              GC.loadRecentJobs(http);
              GC.loadRegularJobs(http);
              GC.loadShiftsToday(http);
              GC.loadDispatchers(http);
              GC.loadMessengers(http);
              GC.loadExpenses(http);
              GC.loadSpecialPrices(http);
            }
          )
        });
      },
      error: () => {
        GC.cantConnect = true;
      }
    });
  }

  private static initGC(): void {
    GC.rateClients();
    GC.rateLocations();
    this.tourplan = new TourplanComponent(GC.location, GC.route, GC.cd)
  }

  static loadConfig(http: HttpService): Observable<boolean> {
    return http.getRawConfigItems().pipe(
      map(rcs => {
        GC.rawConfigs = rcs.filter(rc => rc.name);
        GC.rawConfigsMap = new Map<string, string>(rcs.filter(rc => rc.name).map(rc => [rc.name, rc.value]))
        GC.loadedParts.config = true;
        if (!GC.fullyLoaded) {
          GC.fullyLoaded = GC.checkLoaded(); // config
        }
        return true;
      })
    )
  }

  static readConfig(): ConfigDataContract {
    this.readZonePrices();
    return {
      geocoder: GC.geocoders[GC.readNumber('geocoder') || 2],
      prices: {
        city: GC.readPrice('price_city') || new Price(7, {name: 'price_city'}),
        city2: GC.readPrice('price_city2') || new Price(8.5, {name: 'price_city'}),
        list: {
          base: GC.readPrice('price_list_base') || new Price(9.9, {name: 'price_list_base'}),
          quantityIncl: GC.readNumber('price_list_quantityIncl') || 2,
          extra1: GC.readPrice('price_list_extra1') || new Price(1.6, {name: 'price_list_extra1'}),
          threshold: GC.readNumber('price_list_threshold') || 6,
          extra2: GC.readPrice('price_list_extra2') || new Price(3.2, {name: 'price_list_extra2'}),
        },
        nearby: GC.readPrice('price_nearby') || new Price(2.2, {name: 'price_nearby'}),
        stop: GC.readPrice('price_stop') || new Price(5.2, {name: 'price_stop'}),
        connectionDiscount: GC.readPrice('price_connectionDiscount') || new Price(1, {name: 'price_connectionDiscount'}),
        extras: [
          GC.readPrice('price_extra_0') || new Price(0, {name: 'price_extra_0'}),
          GC.readPrice('price_extra_1') || new Price(3.5, {name: 'price_extra_1'}),
          GC.readPrice('price_extra_2') || new Price(8, {name: 'price_extra_2'}),
          GC.readPrice('price_extra_3') || new Price(18, {name: 'price_extra_3'})
        ],
        fiveMinutes: GC.readPrice('price_fiveMinutes') || new Price(3.3, {name: 'price_fiveMinutes'}),
        waitingTimeQuantityIncl: GC.readNumber('price_waitingTimeQuantityIncl') || 3,
        group: GC.readPrice('price_group') || new Price(7.3, {name: 'price_group'}),
        falseArrival: GC.readPrice('falseArrival') || new Price(5, {name: 'falseArrival'}),
        extraPrices: {
          baseExtra: GC.readBaseExtraExtraPrices(),
          groupExtra: GC.readGroupExtraPrices(),
        },
        dierksenHanker: {
          base: GC.readPrice('price_dierksen_hanker_base', true) ||
            new Price(7.5, {name: 'price_dierksen_hanker_base', brutto: true}),
          extra: GC.readPrice('price_dierksen_hanker_extra', true) ||
            new Price(2.5, {name: 'price_dierksen_hanker_extra', brutto: true}),
          quantityIncl: 1,
        },
        niemann: {
          base: GC.readPrice('price_niemann_base') || new Price(8.5, {name: 'price_niemann_base'}),
          extra: GC.readPrice('price_niemann_extra') || new Price(1.6, {name: 'price_niemann_extra'}),
          quantityIncl: 2,
        },
        hbNord: {
          base: GC.readPrice('price_hbNord_base') || new Price(18, {name: 'price_hbNord_base'}),
          extra: GC.readPrice('price_hbNord_extra') || new Price(6, {name: 'price_hbNord_extra'}),
          quantityIncl: 1,
        }
      },
      vat: GC.readNumber('MWST') || 19,
      tourplan: {
        PRE_ORDER_ALARM: GC.readNumber('PRE_ORDER_ALARM') || 20, // 20 minutes before a planned tour will start
        NORMAL_ALARM: GC.readNumber('NORMAL_ALARM') || 30, // 30 minutes after creating the tour
        ALARM_STOP: GC.readNumber('ALARM_STOP') || 8, // 8h after
        HOURS_IN_ADVANCE: GC.readNumber('hoursInAdvance') || 2,
        salesMinimized: GC.readBoolean('salesMinimized'),
        filterStatus: GC.readBooleanArray('filterStatus') || [false, false, false, false, false, false, false, false, false]
      },
      lexofficeActivated: GC.readBoolean('lexofficeActivated') === undefined ? false : GC.readBoolean('lexofficeActivated'),
      messenger: {
        hideInactive: GC.readBoolean('hideInactive') === undefined ? true : GC.readBoolean('hideInactive'),
      },
      api: {
        lex: GC.readString('lexOfficeApiKey') || config.lexOfficeApiKey,
        geoapify: GC.readString('geoapifyApiKey') || config.geoapifyApiKey,
        mapbox: GC.readString('mapboxApiKey') || config.mapboxApiKey,
        bing: GC.readString('bingApiKey') || config.bingApiKey,
      },
      workingDays: GC.readNumber('workingDays') || 21.3,
      nearbyDist: GC.readNumber('nearbyDist') || 150,
      showZonesPermanently: GC.readBoolean(('showZonesPermanently')) || false,
    }
  }

  static readPrice(key: string, brutto?: boolean): Price {
    const rc = GC.rawConfigsMap.get(key);
    if (rc) {
      const res = new Price(parseFloat(rc), {brutto: brutto})
      res.name = key;
      return res;
    }
    return undefined;
  }

  static readBaseExtraExtraPrices(): BaseExtraExtraPrice[] {
    const res: BaseExtraExtraPrice[] = [];
    const data = GC.rawConfigs.filter(rc => {
      return rc.name.slice(-4) === 'base' || rc.name.slice(-5) === 'extra' || rc.name.slice(-12) === 'quantityIncl';
    })
    const baseExtraNames = data.filter(rc => rc.name.includes('base') && !rc.name.includes('list')).map(rc => rc.name.slice(6, -5))
    baseExtraNames.forEach(n => {
      const epData = data.filter(rc => rc.name.includes(n));
      if (epData) {
        res.push({
          name: n,
          clients: [],
          mode: ExtraPriceType.baseExtra,
          base: new Price(parseFloat(epData.find(rc => rc.name.includes('base')).value)),
          extra: new Price(parseFloat(epData.find(rc => rc.name.includes('extra')).value)),
          quantityIncl: parseInt(epData.find(rc => rc.name.includes('quantityIncl')).value)
        });
      }
    })
    return res;
  }

  static readGroupExtraPrices(): GroupExtraPrice[] {
    const res: GroupExtraPrice[] = [];
    const data = GC.rawConfigs.filter(rc => {
      return rc.name.slice(-6) === 'epgroup';
    })
    data.forEach(rc => {
      res.push({
        name: rc.name.slice(6, -6),
        clients: [],
        mode: ExtraPriceType.group,
        price: parseFloat(rc.value).toPrice(),
      });
    })
    return res;
  }

  static readNumber(key: string): number {
    const rc = GC.rawConfigsMap.get(key);
    if (rc) {
      return parseFloat(rc);
    }
    return undefined;
  }

  private static readBoolean(key: string): boolean {
    const rc = GC.rawConfigsMap.get(key);
    if (rc) {
      return rc === 'true';
    }
    return undefined;
  }

  private static readBooleanArray(key: string): boolean[] {
    const rc = GC.rawConfigsMap.get(key);
    if (!rc) {
      return [false, false, false, false, false, false, false, false, false];
    }
    return JSON.parse(rc) as boolean[];
  }

  private static readZonePrices(): void {
    GC.zones.forEach(zone => {
      zone.price = GC.readPrice('price_zone_' + zone.name) || new Price();
    })
    GC.zones.sort((a, b) => {
      return a.price._netto - b.price._netto
    });
    GC.zones.forEach((z, i) => {
      z.index = i;
    })
  }

  private static readString(key: string): string {
    return GC.rawConfigsMap.get(key);
  }

  private static rateClients(): void {
    GC.jobsThisMonth.filter(j => !j.regularJobId).forEach(j => {
      GC.addToClientInvoiceAmounts(j);
    });
    GC.clients = GC.clients.sort((a, b) => {
      return (GC.clientInvoiceAmounts.get(b.id)?._netto | 0) - (GC.clientInvoiceAmounts.get(a.id)?._netto | 0)
    })
  }

  public static addToClientInvoiceAmounts(job: Job): void {
    GC.salesThisMonth.add(job.price)
    if (!job.client) {
      return;
    }
    if (GC.clientInvoiceAmounts.has(job.client.id)) {
      GC.clientInvoiceAmounts.get(job.client.id).add(job.price)
    } else {
      GC.clientInvoiceAmounts.set(job.client.id, new Price(job.price))
    }
  }

  private static rateLocations(): void {
    GC.jobsLastNinetyDays.forEach(job => {
      GC.addToLocationRating(job.center, 3)
      job.pickups.concat(job.deliveries).forEach(loc => GC.addToLocationRating(loc, 1));
    });
    GC.locations.sort((a, b) => {
      const av = GC.locationRatings.get(a.id) ? GC.locationRatings.get(a.id) : 0;
      const bv = GC.locationRatings.get(b.id) ? GC.locationRatings.get(b.id) : 0;
      return bv - av;
    });
    GC.clientLocations.sort((a, b) => {
      const av = GC.locationRatings.get(a.id) ? GC.locationRatings.get(a.id) : 0;
      const bv = GC.locationRatings.get(b.id) ? GC.locationRatings.get(b.id) : 0;
      return bv - av;
    });
  }

  private static addToLocationRating(location: Geolocation, amount: number): void {
    if (location === null) {
      return;
    }
    if (GC.locationRatings.has(location.id)) {
      GC.locationRatings.set(location.id, GC.locationRatings.get(location.id) + amount);
    } else {
      GC.locationRatings.set(location.id, amount);
    }
  }

  private static loadClients(http: HttpService): Observable<boolean> {
    return http.getClientList().pipe(
      map(list => {
        GC.clients = list;

        GC.loadedParts.clients = true;
        if (!GC.fullyLoaded) {
          GC.fullyLoaded = GC.checkLoaded(); // clients
        }
        return true
      })
    );
  }

  private static loadLexClients(http: HttpService): void {
    if (!GC.config.lexofficeActivated) {
      GC.loadedParts.lexClients = true;
      GC.checkLoaded();
      return;
    }
    http.lex_getContacts(0).subscribe({
      next: list => {
        GC.lexClients = list;
        GC.loadedParts.lexClients = true;
        if (!GC.fullyLoaded) {
          GC.fullyLoaded = GC.checkLoaded(); // lex contacts
        }
      }, error: err => {
        catchError(err);
        console.log('keine kontakte bei lexware');
        GC.loadedParts.lexClients = true;
        if (!GC.fullyLoaded) {
          GC.fullyLoaded = GC.checkLoaded(); // lex contacts
        }
      }
    })
  }

  private static test(http: HttpService): void {

  }

  private static loadZones(http: HttpService): void {
    http.getZones().subscribe({
      next: zones => {
        let func = (_zones: Zone[]) => {
          _zones.forEach(z => {
            GC.zoneByNames.set(z.name, z);
          })
          GC.postCodeZones = plz.map(plz => new Zone({
            name: `${plz.properties.postcode} ${plz.properties.name}`,
            coordinates: plz.geometry.coordinates,
          }))
          GC.zones = _zones.sort((z1, z2) => z1.name.localeCompare(z2.name));
          GC.loadedParts.zones = true;
          if (!GC.fullyLoaded) {
            GC.fullyLoaded = GC.checkLoaded(); // zones
          }
          this.zonesLoaded.emit(true);
        }

        if (zones.length === 0) {
          // zip(Zones.standartZonesHB.map(z => GC.http.createZone(new Zone(z)))).subscribe(newZones => {
          //   func(newZones)
          // })
          func(zones);
        } else {
          func(zones);
        }
      },
      error: (e) => {
        GC.cantConnect = true;
        console.error(e)
      }
    });
  }

  private static loadLocations = (http: HttpService) => {
    http.getLocationList().subscribe(locations => {
      locations = HttpService._prepareGeolocations(locations)
      GC.locations = locations;
      GC.clientLocations = locations.filter(l => l.clientId);
      GC.loadedParts.locations = true;
      if (!GC.fullyLoaded) {
        GC.fullyLoaded = GC.checkLoaded(); // locations
      }
    });
  }
  private static loadRecentJobs = (http: HttpService) => {
    http.jobsRecentDays(90).subscribe({
      next: jobs => {
        GC.jobsLastNinetyDays = jobs;
        GC.jobsThisMonth = jobs.filter(j => {
          j.date = new Date(j.date)
          return j.date.getMonth() === new Date().getMonth() &&
            j.date.getFullYear() === new Date().getFullYear()
        })
        GC.loadedParts.jobsLastNinetyDays = true;
        GC.loadedParts.jobsThisMonth = true;
        if (!GC.fullyLoaded) {
          GC.fullyLoaded = GC.checkLoaded(); // recent
        }
      },
      error: msg => {
        GC.openSnackBarLong(msg);
      }
    });
  }
  public static loadRegularJobs = (http: HttpService) => {
    http.getRegularJobList().subscribe(regularJobs => {
      GC.regularJobs = regularJobs;
      GC.loadedParts.regularJobs = true;
      if (!GC.fullyLoaded) {
        GC.fullyLoaded = GC.checkLoaded(); // regularJobs
      }
    })
  }
  public static loadShiftsToday = (http: HttpService) => {
    http.getShiftsForToday().subscribe(list => {
      list.sort((a, b) => a.start.getTime() - b.start.getTime());
      GC.shiftsToday = list;

      // retrieve the set phone numbers from local storage
      GC.messengerToday.forEach(m => {
        const number = getItem<{ number: number, date: Date }>(m.id);
        if (number) {
          number.date = new Date(number.date);
          if (number.date.isToday()) {
            m.fexNumber = number.number;
          }
        }
      })

      GC._dispatcher = list.filter(s => [ShiftType.dispoEarly, ShiftType.dispoLate].includes(s.type)).last();
      GC.dispatcherChanged.emit(!!(GC._dispatcher))
      GC.loadedParts.shifts = true;
      if (!GC.fullyLoaded) {
        GC.fullyLoaded = GC.checkLoaded(); // shifts
      }
    })
  }

  public static loadDispatchers = (http: HttpService) => {
    http.getDispatcherList().subscribe(list => {
      GC.dispatchers = list;
      GC.loadedParts.dispatcher = true;
      if (!GC.fullyLoaded) {
        GC.fullyLoaded = GC.checkLoaded(); // dispatcher
      }
    })
  }
  private static loadMessengers = (http: HttpService) => {
    http.getMessengerList().subscribe(list => {
      GC.messengers = list;
      GC.loadedParts.messenger = true;
      if (!GC.fullyLoaded) {
        GC.fullyLoaded = GC.checkLoaded(); // messenger
      }
    })
  }

  private static loadExpenses = (http: HttpService) => {
    http.getExpenseList().subscribe(list => {
      GC.expenses = list;
      GC.loadedParts.expenses = true;
      if (!GC.fullyLoaded) {
        GC.fullyLoaded = GC.checkLoaded(); // expenses
      }
    })
  }

  public static loadSpecialPrices = (http: HttpService) => {
    http.getSpecialPriceList().subscribe(list => {
      GC.specialPrices = list
      // list.filter(s => s.group._netto === 0 && s.base._netto === 0).map(s => s.delete(true))
      // return;
      let i = 0;
      list.forEach(price => {
        price.clients.forEach(c => {
          const l = this.specialPriceClients.get(c.id);
          this.specialPriceClients.set(c.id, (l?.length ? l.concat(price) : [price]))
        })
      })
      GC.loadedParts.specialPrices = true;
      if (!GC.fullyLoaded) {
        GC.fullyLoaded = GC.checkLoaded(); // specialPrices
      }
    })
  }

  // LOCAL STORAGE

  public static dispatcher = () => {
    return GC._dispatcher;
  };
  public static dispatcherCheckedIn = () => {
    return !!(GC._dispatcher);
  }

  public static setMessengerInShift = (shifts: Shift[]) => {
    return zip(shifts.map(s => GC.http.createShift(s)))
  }
  public static deleteOpenShift = (shift: Shift) => {
    GC.http.deleteShift(shift).subscribe(() => {
      GC.loadShiftsToday(GC.http);
      GC.openSnackBarShort('schicht gelöscht!')
    });
  }

  public static nextClientIds = () => {
    const n = (Math.max.apply(Math, GC.clients.filter(client => parseInt(client.clientId) < 30000).map(client => {
      return parseInt(client.clientId)
    })) + 1);
    const b = (Math.max.apply(Math, GC.clients.filter(c => !isNaN(parseInt(c.clientId))).map(client => {
      return parseInt(client.clientId)
    })) + 1);
    return {
      netto: (isFinite(n) ? n : 10001).toString(),
      brutto: (isFinite(b) ? b : 30001).toString()
    };
  }
  private static checkLoaded = () => {
    GC.loadingProgress += (100 / 11.3);
    if (
      GC.loadedParts.zones && //
      GC.loadedParts.config && //
      GC.loadedParts.messenger && //
      GC.loadedParts.dispatcher && //
      GC.loadedParts.regularJobs && //
      GC.loadedParts.shifts && //
      GC.loadedParts.jobsThisMonth && // recent
      GC.loadedParts.jobsLastNinetyDays && // recent
      GC.loadedParts.clients && //
      GC.loadedParts.lexClients && //
      GC.loadedParts.locations && //
      GC.loadedParts.expenses &&
      GC.loadedParts.specialPrices
    ) {
      GC.initGC();
      GC.loadedCompletely.emit(true);
      return true;
    }
    this.partLoaded.emit(true);
    return false;
  }

  public static openSnackBarLong = (msg: string) => {
    GC.snackbar.open(msg, null, {duration: GC.SNACKBAR_DURATION_LONG});
  }
  public static openSnackBarShort = (msg: string) => {
    GC.snackbar.open(msg, null, {duration: GC.SNACKBAR_DURATION_SHORT});
  }
}
