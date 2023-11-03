import {GC} from "../common/GC";
import {Expense} from "./Expense";

/**
 * implements a class to be used wherever prices occur in this software.
 * comes with basic calculation and parsing functionality.
 * a price will normally be instantiated by just a number.
 *
 */
export class Price {
  private netto = 0;
  set _netto(netto: number) {
    netto = netto || 0;
    this.netto = netto.round(1);
    this.brutto = this.calcBrutto(netto);
    this.paypal = this.calcPayPal(this.brutto);
  }
  get _netto(): number {
    return this.netto;
  }
  private brutto = 0;
  set _brutto(brutto: number) {
    brutto = brutto || 0;
    this.brutto = brutto.round(1);
    this.netto = this.calcNetto(brutto);
    this.paypal = this.calcPayPal(this.brutto);
  }
  get _brutto(): number {
    return this.brutto;
  }
  private paypal = 0;
  get _paypal(): number {
    return this.paypal;
  }
  name?: string;
  vat: number; // MWSt
  isBrutto: boolean;
  expenses: Expense[] = [];

  bruttoOnCent = () => {return (this.netto * (this.vat / 100 + 1)).round(2)}
  mwst = () => {return (this.netto * this.vat / 100).round(2)}

  /**
   *
   * @param price a number or another price to instantiate the new price from
   * @param options optional vat value differing from the global set one
   */
  constructor(price?: number | Price, options?: {vat?: number,  brutto?: boolean, name?: string}) {
    this.vat = options?.vat || GC.config?.vat || GC.VAT;
    this.name = options?.name || this.name;
    if (!price) {
      price = 0;
    }
    if (price instanceof Object) {
      this.netto = price.netto;
      this.brutto = price.brutto;
      this.paypal = this.calcPayPal(this.brutto);
    } else {
      if (options?.brutto) {
        this.isBrutto = true;
        this.brutto = price;
        this.netto = this.calcNetto(price);
        this.paypal = this.calcPayPal(price);
      } else {
        this.netto = price;
        this.brutto = this.calcBrutto(price);
        this.paypal = this.calcPayPal(this.brutto);
      }
    }
  }

  private calcBrutto = (netto: number) => {
    return (netto + netto * this.vat / 100).round(1);
  }
  private calcNetto = (brutto: number) => {
    return (brutto / (100 + this.vat) * 100).round(1);
  }
  /**
   * implemented paypal fee policy, as described <a href="https://www.paypal.com/de/webapps/mpp/merchant-fees">here</a>
   * @param brutto
   */
  private calcPayPal = (brutto: number) => {
    return brutto === 0 ? 0 : (1.0249 * brutto + 0.35).round(2);
  }

  /**
   * rounds the price to one digit and returns it
   * @returns the rounded price
   */
  private round(): Price {
    this.netto = this.netto.round(1);
    this.brutto = this.calcBrutto(this.netto);
    this.paypal = this.calcPayPal(this.brutto);
    return this;
  }

  /**
   * @param price price to be added
   * @returns the calling price with the provided one added
   */
  add(price: Price): Price {
    this.netto += price.netto;
    this.brutto = this.calcBrutto(this.netto);
    this.paypal = this.calcPayPal(this.brutto);
    return this.round();
  }
  /**
   * @param price price to be added
   * @returns a copy of the calling price with the provided one added
   */
  _add(price: Price): Price {
    return new Price(this.netto + price.netto).round();
  }
  /**
   * @param price price to be subtracted
   * @returns the calling price with the provided one subtracted
   */
  sub(price: Price): Price {
    this.netto -= price.netto;
    this.brutto = this.calcBrutto(this.netto);
    this.paypal = this.calcPayPal(this.brutto);
    return this.round();
  }
  /**
   * @param price price to be subtracted
   * @returns a copy of the calling price with the provided one subtracted
   */
  _sub(price: Price): Price {
    return new Price(this.netto - price.netto).round();
  }
  /**
   * @param scalar scalar to be multiplied
   * @returns the calling price multiplied by the provided scalar
   */
  mul(scalar: number): Price {
    this.netto *= scalar;
    this.brutto = this.calcBrutto(this.netto);
    this.paypal = this.calcPayPal(this.brutto);
    return this.round();
  }
  /**
   * @param scalar scalar to be multiplied
   * @returns a copy of the calling price multiplied by the provided scalar
   */
  _mul(scalar: number): Price {
    return new Price(this.netto * scalar).round();
  }
  /**
   * @param scalar scalar to be divided by
   * @returns the calling price divided by the provided scalar
   */
  div(scalar: number): Price {
    this.netto /= scalar;
    this.brutto = this.calcBrutto(this.netto);
    this.paypal = this.calcPayPal(this.brutto);
    return this.round();
  }
  /**
   * @param scalar scalar to be divided by
   * @returns a copy of the calling price divided by the provided scalar
   */
  _div(scalar: number): Price {
    return new Price(this.netto / scalar).round();
  }

  set(price: Price): Price {
    this._netto = price.netto;
    return this;
  }

  /**
   * parses any value (e.g. from an input field) and assigns it to the calling price
   * if the string is invalid, the price will remain unchanged and returned as that
   * @param value a string to be parsed
   * @param isBrutto if the parsed value is a brutto value
   * @returns the new price
   */
  setByString(value: string, isBrutto: boolean): Price {
    if (value === '') {
      return this;
    }
    value = value.trim().replace(',', '.');
    const newPrice = parseFloat(value);
    if (!(newPrice >= 0)) {
      return this;
    }
    if (isBrutto) {
      this._brutto = newPrice;
    } else {
      this._netto = newPrice;
    }
    return this;
  }

  /**
   * @returns a copy of the calling price
   */
  copy(): Price {
    return new Price(this);
  }

  /**
   * returns the netto or brutto value as a string
   * @param brutto is brutto price should be returned
   * @return the value as string
   */
  toString(brutto?: boolean): string {
    return brutto ? this.brutto.toString() : this.netto.toString();
  }

  /**
   * returns the price as string (e.g. either '8.9' or '10.6 bar')
   * @param brutto if the price will be served as a brutto value
   * @return the price as string for use in html
   */
  print(brutto?: boolean): string {
    return brutto ? this.brutto.toString() + ' bar' : this.netto.toString();
  }

  /**
   * returns the price in format 'netto/brutto' (e.g. '8.9/10.6')
   */
  toStringBoth(): string {
    return `${this.netto}/${this.brutto}`;
  }

  /**
   * calculates the price for a given number of minutes
   * @param minutes number of minutes
   * @returns the price
   */
  waitingMinutes(minutes: number): Price {
    this.set(GC.config.prices.fiveMinutes._mul(Math.ceil(Math.max((minutes - GC.config.prices.waitingTimeQuantityIncl), 0) / 5)))
    return this;
  }

  /**
   * calculates the price of a regular job to be shown on the tourplan
   * the calling price must be monthly price
   * @return the monthly price divided by the average number of working days in a month.
   */
  get regularJobPrice(): Price {
    return this._div(GC.config.workingDays);
  }

  withExpenses(expense: Expense): Price {
    let result = this.copy();
    this.expenses.forEach(e => {
      result.isBrutto ?
        result._brutto += expense.price.brutto :
        result._netto += expense.price.brutto;
    })
    return result;
  }
}
