import {Price} from "../classes/Price";
import {Job} from "../classes/Job";
import {Observable} from "rxjs";
import {Geolocation} from "../classes/Geolocation";
import {Client} from "../classes/Client";
import {Branch} from "../classes/Branch";

export interface BranchSet {
  branches: Branch[];
  price?: Price;
}

export interface IdObject {
  id: string;
}

/**
 * location types are set on stations in jobs, to determine the kind
 * of station they represent in the job
 * 0 client, 1 pickup, 2 delivery, 3 none, 4 both, 5 centerpickup, 6 centerdelivery
 */
export enum LocType {
  /**  */
  client,
  /**  */
  pickup,
  /**  */
  delivery,
  /**  */
  none,
  /**  */
  both,
  /**  */
  centerPickup,
  /**  */
  centerDelivery
}

/**
 * pass types are set by the method @findBranchSet
 * in the route strategy
 * 0 source, 1 nearby, 2 stop, 3 route, 4 center
 */
export enum PassType {
  /** a location from where the routing will have its route origin to the center */
  source,
  /** a location that costs a fixed price bcause it's very close to another */
  nearby,
  /** a location that costs a fixed price because it's on the way */
  stop,
  /** a location to which a distance price will be calculated */
  route,
  /** a location that is the end of all branches */
  center,
}

/**
 * 0 none, 1 cargo, 2 cargobike, 3 carlacargo
 */
export enum Cargotype {
  none,
  cargo,
  cargoBike,
  carlaCargo
}

/**
 * 0 kaefer, 1 uni, 2 gross, 3 klein
 */
export enum MorningTour {
  none,
  kaefer,
  uni,
  gross,
  klein
}

/**
 * begins on sunday (so, mo, di, mi, do, fr, sa)
 */
export enum Day {
  so,
  mo,
  di,
  mi,
  do,
  fr,
  sa
}

/**
 * 0 untouched, 1 unsaved, 2 saved
 */
export enum SaveSate {
  untouched,
  unsaved,
  saved
}

// data contracts
/**
 * response data format to expect from the openstreetmap api
 */
export interface IOSMResponse {
  type: string;
  features: IOSMFeature[];
  results: IOSMFeature[];
}

/**
 * data format of a single openstreetmap feature (e.g. one search result)
 */
export interface IOSMFeature {
  type: string;
  properties: {
    name: string;
    street: string;
    housenumber: string;
    neighbourhood: string;
    suburb: string;
    district: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
    lon: number;
    lat: number;
    formatted: string;
    address_line1: string;
    address_line2: string;
    result_type: string;
    rank: {
      confidence: number;
    };
    description: string;
  };
}

/* entspricht dem datenformat einer antwort der bing-api */
export interface BingMapsResponse {
  resourceSets: { resources: BingResource[] }[],
}

/* entspricht dem datenformat eines einzelnen bing-datensatzes in der antwort der bing-api */
export interface BingResource {
  point: {
    type: string,
    coordinates: {
      0: number, // lng
      1: number  // lat
    }
  };
  address: {
    addressLine: string,
    adminDistrict: string,
    adminDistrict2: string,
    countryRegion: string,
    formattedAddress: string,
    locality: string,
    postalCode: string,
  }
  confidence: string,
  entityType: string
}

export interface IPoint {
  name?: string;
  latitude: number;
  longitude: number;
  passType?: PassType;
  routePointNr?: number; // index of section which it will be priced for
}

/* entspricht der teilmenge eines branches zwischen und inklusive zweier geolocations
* mit dem passtype SOURCE, ROUTE oder CENTER */
export interface Section {
  points: IPoint[];
  traveldist: number;
  price: Price;
}

export interface Invoice {
  id: string;
  invoiceId: string;
  clientId: string;
  date: Date;
  accountingPeriodStart: Date;
  accountingPeriodEnd: Date;
  jobs: Job[];
}

/**
 * defines the structure of the configuration data-set
 * well be used by the @readConfig function
 */
export interface ConfigDataContract {
  backendIP?: string,
  geocoder: GeoCodingStrategy,
  prices: {
    stop: Price,
    city: Price,
    city2: Price,
    extras: Price[],
    list: {
      base: Price // minimum price by km calculation
      quantityIncl: number, // km included in base
      extra1: Price, // price per km until n-th kilometer
      threshold: number // n
      extra2: Price, // price per km after the n-th kilometer
    },
    nearby: Price,
    connectionDiscount: Price,
    fiveMinutes: Price,
    waitingTimeQuantityIncl: number,
    group: Price,
    falseArrival: Price,
    extraPrices: {
      baseExtra: BaseExtraExtraPrice[],
      groupExtra: GroupExtraPrice[],
    },
    dierksenHanker: {
      base: Price,
      extra: Price,
      quantityIncl: 1
    },
    niemann: {
      base: Price,
      extra: Price,
      quantityIncl: 2,
    },
    hbNord: {
      base: Price,
      extra: Price,
      quantityIncl: 1,
    }
  }
  vat: number,
  tourplan: {
    PRE_ORDER_ALARM: number,
    NORMAL_ALARM: number,
    ALARM_STOP: number,
    HOURS_IN_ADVANCE: number,
    salesMinimized: boolean,
    filterStatus: boolean[],
  },
  messenger: {
    hideInactive: boolean;
  }
  lexofficeActivated: boolean;
  api: {
    lex: string,
    /**
     * the API key for openstreetmaps.
     * see usage <a href="https://myprojects.geoapify.com/">here</a>
     */
    geoapify: string,
    /**
     * token to access mapbox map-data
     * to generate a new token click <a href="https://account.mapbox.com/access-tokens/">here</a>
     */
    mapbox: string,
    /**
     * the API key for bing maps.
     * see usage <a href="https://www.bingmapsportal.com/Application">here</a>
     */
    bing: string,
  }
  workingDays: number;
  nearbyDist: number;
  showZonesPermanently: boolean;
}

export interface Extraprice {
  name: string,
  clients: Client[],
  mode: ExtraPriceType,
}

export interface BaseExtraExtraPrice extends Extraprice{
  base: Price,
  extra: Price,
  quantityIncl: number,
}

export interface GroupExtraPrice extends  Extraprice {
  price: Price,
}

export enum ExtraPriceType {
  baseExtra,
  group,
}

export interface TimeframeStatistic {
  timeframe: string,
  amount: number,
  distance: number,
  turnover: number,
}

export interface DayStatistic {
  day: string,
  statistics: TimeframeStatistic[]
}

export interface WeekStatistic {
  statistics: DayStatistic[],
}

export interface RawConfig {
  name: string;
  value: string;
}

export interface Config<E> {
  name: string;
  value: E;
}

/**
 * 0 normal, 1 star, 2 shortest ound, 3 primitive round
 */
export enum RoutingMode {
  normal,
  star,
  shortestRound,
  primitiveRound
}

export enum SpecialPriceType {
  none,
  fexrules,
  group,
  baseExtra
}

export enum PriceType {
  netto,
  brutto,
  paypal
}

export interface GeoCodingStrategy {
  type: number;

  geocode(searchStr: string, type: LocType): Observable<Geolocation[]>;
}

/**
 * 0 osm, 1 bing, 2 both
 */
export enum GeoCodingMode {
  osm,
  bing,
  both,
}

/**
 * 0 hb, 1 hbnord, 2 lilienthal, 3 stuhr, 4 unknown
 */
export enum PriceZone {
  hb,
  hbNord,
  lilienthal,
  stuhr,
  unknown
}

export interface Extra {
  value: number;
  viewValue: string;
  price: Price;
}

export interface LexProfile {
  organizationId: string // "aa93e8a8-2aa3-470b-b914-caad8a255dd8",
  companyName: string // "Testfirma GmbH",
  created: {
    userId: string // "1aea5501-3f3e-403d-8492-2dad03016289",
    userName: string // "Frau Erika Musterfrau",
    userEmail: string // "erika.musterfrau@testfirma.de",
    date: string // "2017-01-03T13:15:45.000+01:00"
  },
  connectionId: string // "3dea098a-fae5-4458-a85c-f97965966c25",
  features: string[] // ["cashbox"],
  businessFeatures: string[] // ["INVOICING", "INVOICING_PRO", "BOOKKEEPING"],
  subscriptionStatus: string // "active",
  taxType: string // "net",
  smallBusiness: boolean // false
}
