import {GeoCodingMode, LocType, PassType, PriceZone, IdObject} from "../common/interfaces";
import {Job} from "./Job";
import {Price} from "./Price";
import {Branch} from "./Branch";
import {Zone} from "./Zone";
import {GC} from "../common/GC";
import {LocationDialogComponent} from "../dialogs/location-dialog.component";

export class Geolocation implements IdObject{
  name: string = '';
  latitude: number;
  longitude: number;
  passType: PassType;
  /**
   * the position of an item in its branch that is reduced
   * to locations of type SOURCE and ROUTE.
   * it's used as an index in the SECTIONS array of its branch to
   * get the corresponding distance for the section.
   */
  routePointNr: number;
  branch: Branch;
  _job: Job;
  address: string = '';

  id: string = '';
  street: string = '';
  zipCode: string = '';
  quarter: string = '';
  city: string = '';
  clientId: string = '';
  description: string = '';

  locType: LocType;
  hasBacktour: boolean;
  inputfield: number;
  geocoder: GeoCodingMode;
  priceZone: PriceZone;

  constructor(data?: Partial<Geolocation>) {
    if (data) {
      Object.assign(this, data);
    }
    this.getAddress();
  }

  get job(): Job {
    return this._job || this.branch.job;
  }

  public getAddress(): string {
    if (this.street && this.zipCode && this.city) {
      this.address = `${this.street}, ${this.zipCode} ${this.city}`;
      return this.address;
    } else {
      return '';
    }
  }

  setAdress(b: Geolocation): void {
    this.street = b.street;
    this.city = b.city;
    this.zipCode = b.zipCode;
    this.latitude = b.latitude;
    this.longitude = b.longitude;
    if (!(this.name.length > 0)) {
      this.name = this.street;
    }
  }

  copy(): Geolocation {
    return new Geolocation(this);
  }

  openDialog(): void {
    const dialog = GC.dialog.open(LocationDialogComponent, {
      data: {
        location: this,
        newLocation: false,
      }
    });
  }
}

export class Station extends Geolocation {
  backtourBranch: Branch;
  isConnection: boolean;
  private _price: Price;
  private _priceLevel: string;
  private _popUpContent: string;
  zone: Zone;

  constructor(data: Partial<Geolocation>) {
    super(data);
    Object.assign(data, this)
  }

  index(): number {
    return this.branch?.job.getAllStations().findIndex(s => s === this) - 1;
  }

  get price(): Price {
    if (!this._price) {
      this.calcPrice();
    }
    return this._price;
  }

  calcPrice(noZones?: boolean): Station {
    this._price = this.job.priceStrategyObj.calcStationPrice(this, noZones);
    return this;
  }

  get priceLevel(): string {
    if (!this._priceLevel) {
      this.makePriceLevel();
    }
    return this._priceLevel;
  }

  makePriceLevel(): Station {
    this._priceLevel = this.job.priceStrategyObj.priceString(this, false, this.index());
    return this;
  }


  get popUpContent(): string {
    if (!this._popUpContent) {
      this.makePopUpContent();
    }
    return this._popUpContent;
  }

  makePopUpContent(): Station {
    this._popUpContent = this.job.priceStrategyObj.priceString(this, true, this.index());
    return this;
  }

  tail(override?: boolean): string {
    let decision = this.locType === LocType.delivery;
    if (override) {
      decision = override;
    }
    const a = decision ? '<i class="pr-1 bi bi-arrow-right-short" style="font-size: 28px"></i>' : '<i class="pr-1 bi bi-arrow-left-short" style="font-size: 28px"></i>';
    return `${a} ${this.name ? this.name : this.street}`;
  }

  public className(): string {
    switch (true) {
      case this.locType === LocType.pickup || this.locType === LocType.centerPickup:
        return 'pickup-tone';

      case this.locType === LocType.delivery || this.locType === LocType.centerDelivery:
        return 'delivery-tone';

      default:
        return 'client-tone';
    }
  }

  public override copy(): Station {
    // const branch = this.branch
    // this.branch = null;
    // const job = this._job;
    // this._job = null;
    // const res = new Station(this);
    // res.branch = branch;
    // res._job = job;
    // this.branch = branch;
    // this._job = job;
    // return res;
    return new Station(this);
  }
}
