import {NativeDateAdapter} from "@angular/material/core";
import {GC} from "./GC";
import {RegularJobDialogComponent} from "../dialogs/regular-job-dialog.component";
import {Day, IdObject} from "./interfaces";
import {Injectable} from "@angular/core";
import {Price} from "../classes/Price";

declare global {
  interface Array<T> {
    /**
     * moves an item in an array to a new index.
     * @example [2, 5, 3, 8, 1].move(3, 1) => [2, 8, 5, 3, 1];
     * @param from index of the preferred item to move
     * @param to index new index of the item
     */
    move(from: number, to: number): Array<T>;

    /**
     * will deepcopy an array by using JSON.stringify() and JSON.parse()
     */
    copy(): Array<T>;

    findAndRemove(item: T): boolean;

    fastfind<T extends IdObject>(this: Array<T>, id: string): T;

    findAndReplace(this: Array<IdObject>, item: IdObject): boolean;

    last(): T;

    sum(this: Array<number>): number;

    getIndex(item: any): number;

    perm(): T[][];

    /**
     * returns a new array which contains all object that are present in both arrays
     * the items get compared only by their id property
     * @param array the array to intersect with
     */
    intersect<T extends IdObject>(this: Array<T>, array: T[]): T[];

    /**
     * returns a new array which contains all object that are not present in the provided array
     * the items get compared only by their id property
     * @param array the array to diff from
     */
    diff<T extends IdObject>(this: Array<T>, array: T[]): T[];

    pushArray<T>(this: Array<T>, array: T[]): T[];
  }

  interface Date {
    timestamp(): string;

    dateStampLong(): string;

    dateStampShort(): string;

    /**
     * calculates the full 24h cycles between the two dates
     * @param compareWith
     * @return difference as absolute number
     * @example a.daysDifference(b) is equal to b.daysDifference(a)
     */
    daysDifference(compareWith: Date): number;

    hoursDifference(compareWith: Date): number;

    minutesDifference(compareWith: Date): number;

    /**
     * @param compareWith
     * @return returns true if the calling dates date is the same or earlier than the compared ones.
     */
    beforeOrSameDay(compareWith: Date): boolean;

    /**
     * @param compareDate the date to compare with
     * @return returns true if the calling date is at least 1ms before the compared one
     */
    isBefore(date: Date): boolean;

    /**
     * the calling date will copy date, month and year from the given one
     * @param from the source date, which will stay untouched
     * @return the calling date for chaining calls
     */
    copyDate(from: Date): Date;

    /**
     * the calling date will copy houres, minutes, seconds and milliseconds from the given one
     * @param from the source date, which will stay untouched
     * @return the calling date for chaining calls
     */
    copyTime(from: Date): Date;

    copy(): Date;

    /**
     * sets the calling date to the desired time, without touching date, month or year.
     * if a parameter is set -1 or less it will be left as it is.
     * this can be used for example if only seconds and milliseconds should be set.
     * if a parameter is left out, it will be set to 0
     * @param h hours
     * @param m minutes
     * @param s seconds
     * @param ms milliseconds
     */
    set(h: number, m?: number, s?: number, ms?: number): Date;

    /**
     * parses a string that comes in the format <code>yyyy-mm-dd</code> into a date
     * @param str the string to be parsed (must have the format <code>yyyy-mm-dd</code>)
     * @returns the parsed date
     */
    setDateByString(str: string): Date;

    /**
     * @return a string representing the date in the format yyyymmdd
     * @example 2023-1-31
     */
    yyyymmdd(): string;

    /**
     * @return a number representing the date in the format yyyymmdd
     * @example 20230131
     */
    yyyymmddInt(): number;

    /**
     * modifies the current date to the **closest** quarter of an hour (e.g. *:00, *:15, *:30 or *:45)
     * @return the modified date
     */
    nearestQuarter(): Date;

    /**
     * modifies the current date to the **next** full quarter of an hour (e.g. *:00, *:15, *:30 or *:45)
     * @return the modified date
     */
    nextQuarter(): Date;

    /**
     * modifies the current date to the **last** full quarter of an hour (e.g. *:00, *:15, *:30 or *:45)
     * @return the modified date
     */
    lastQuarter(): Date;

    /**
     * @return true, if the calling date is today
     */
    isToday(): boolean;

    /**
     * @return a new date representing the next working day
     * @example mon -> tue -> wed -> thu -> fri -> mon
     */
    nextWorkingDay(): Date;

    /**
     * @return a copy of the date on which one day has been subtracted
     */
    yesterday(): Date;

    /**
     * @return a copy of the date on which one day has been added
     */
    tomorrow(): Date;

    addOneWeek(): Date;

    subOneWeek(): Date;

    timeAgo(): string;

    datesSet(): Date[];

    isInMonth(month: Date): boolean;

    monthStart(): Date;

    monthEnd(): Date;

    firstDayOfWeek(): Date;

    workingWeek(): Date[];

    nextWorkingWeek(): Date[];

    previousWorkingWeek(): Date[];

    workingWeekNumber(): number;

    getWorkingWeek(year: number, week: number): Date[];

    next(workingDay: Day): Date;

    timeUntil(): number;
  }

  interface Number {
    round(digits: number): number;

    isBetween(firstEnd: number, secondEnd: number): boolean;

    clamp(min: number, max: number): number;

    map(fromLow: number, fromUp: number, toLow: number, toUp: number): number;

    toPrice(): Price;

    abs(): number

    floor(): number
  }

  interface String {
    toHTML(): string;

    editDistance(other: string): number;
  }
}

Array.prototype.move = function (from: number, to: number) {
  return this.splice(to, 0, this.splice(from, 1)[0]);
};
Array.prototype.copy = function () {
  return JSON.parse(JSON.stringify(this));
};
Array.prototype.findAndRemove = function (item) {
  let index = this.findIndex(i => item.id == i.id) || this.findIndex(i => item == i);
  if (index >= 0) {
    this.splice(index, 1);
    return true;
  }
  console.log('index == 0')
  return false;
}
Array.prototype.fastfind = function (id: string) {
  return this.find(i => i.id === id);
}
Array.prototype.findAndReplace = function (this: Array<IdObject>, item: IdObject) {
  let index = this.findIndex(i => item.id === i.id);
  if (index >= 0) {
    this[index] = item;
    return true;
  }
  return false;
}
Array.prototype.last = function () {
  return this[this.length - 1] || null;
}

Array.prototype.sum = function () {
  return this.reduce((a, b) => a + b, 0).round(2);
}

Array.prototype.getIndex = function (item: any) {
  return this.findIndex(i => i === item);
}

Array.prototype.perm = function () {
  const res: any[] = [];
  for (let i = 0; i < this.length; i = i + 1) {
    const rest = (this.slice(0, i).concat(this.slice(i + 1))).perm();

    if (!rest.length) {
      res.push([this[i]]);
    } else {
      rest.forEach(element => {
        res.push([this[i]].concat(element));
      });
    }
  }
  return res;
}

Array.prototype.intersect = function <T extends IdObject>(this: Array<T>, array: T[]) {
  return this.filter(item => array.map(i => i.id).includes(item.id));
}

Array.prototype.diff = function <T extends IdObject>(this: Array<T>, array: T[]) {
  return this.filter(item => !array.map(i => i.id).includes(item.id));
}

Array.prototype.pushArray = function <T>(this: Array<T>, array: T[]) {
  array.forEach(item => {
    this.push(item)
  })
  return this;
}

Date.prototype.timestamp = function () {
  return `${this.getHours().toString().padStart(2, '0')}:${this.getMinutes().toString().padStart(2, '0')}`;
}
Date.prototype.dateStampLong = function () {
  return `${GC.days[this.getDay()]}, ${this.getDate()}.${this.getMonth() + 1}.${this.getFullYear().toString().slice(-2)}`
}
Date.prototype.dateStampShort = function () {
  return `${GC.dayLiterals[this.getDay()]}, ${this.getDate()}.${this.getMonth() + 1}.`
}
Date.prototype.daysDifference = function (compareWith: Date) {
  if (!compareWith) {
    return NaN;
  }
  const MS_PER_DAY = 86400000;
  const utc1 = Date.UTC(this.getFullYear(), this.getMonth(), this.getDate());
  const utc2 = Date.UTC(compareWith.getFullYear(), compareWith.getMonth(), compareWith.getDate());
  return Math.abs(Math.floor((utc2 - utc1) / MS_PER_DAY));
}
Date.prototype.hoursDifference = function (compareWith: Date) {
  if (!compareWith) {
    return NaN;
  }
  let res = compareWith.getHours() - this.getHours();
  res += (compareWith.getMinutes() - this.getMinutes()) / 60;
  res += (compareWith.getSeconds() - this.getSeconds()) / 3600;
  return res;
}
Date.prototype.minutesDifference = function (compareWith: Date) {
  return (this.getTime() - compareWith.getTime()) / 60000
}
Date.prototype.beforeOrSameDay = function (compareWith: Date) {
  if (!compareWith) {
    return true;
  }
  const compareDate = new Date(compareWith);
  // return this.yyyymmddInt() <= new Date(compareDate).yyyymmddInt();
  return (this.getFullYear() < compareDate.getFullYear() || // my year is before yours
    // our years are equal, but my month is before yours.
    (this.getFullYear() === compareDate.getFullYear() && this.getMonth() < compareDate.getMonth()) ||
    // our years and months are equal, but my day is smaller or the same as yours
    (this.getFullYear() === compareDate.getFullYear() && this.getMonth() === compareDate.getMonth() && this.getDate() <= compareDate.getDate()));
}
Date.prototype.isBefore = function (compareDate: Date) {
  return this.getTime() < compareDate.getTime();
}
Date.prototype.copyDate = function (from: Date) {
  this.setFullYear(from.getFullYear());
  this.setMonth(from.getMonth());
  this.setDate(from.getDate());
  return this;
}
Date.prototype.copyTime = function (from: Date) {
  if (!from) {
    return this;
  }
  this.setHours(from.getHours());
  this.setMinutes(from.getMinutes());
  this.setSeconds(from.getSeconds());
  this.setMilliseconds(from.getMilliseconds())
  return this;
}
Date.prototype.copy = function () {
  return new Date(this);
}
Date.prototype.set = function (h: number, m?: number, s?: number, ms?: number) {
  if (!(h < 0)) {
    this.setHours(h);
  }
  if (!(m < 0)) {
    this.setMinutes(m | 0);
  }
  if (!(s < 0)) {
    this.setSeconds(s | 0);
  }
  if (!(ms < 0)) {
    this.setMilliseconds(ms | 0);
  }
  return this;
}
Date.prototype.setDateByString = function (str: string) {
  let i = Math.max(0, str.search('-'));
  const res = [0, 0, 0];
  let counter = 0;
  while (i > 0) {
    res[counter] = parseInt(str.slice(0, i), 10);
    str = str.slice(i + 1);
    i = Math.max(0, str.search('-'));
    counter++;
  }
  if (counter === 2) {
    res[2] = parseInt(str, 10);
  }
  this.setDate(res[2]);
  this.setMonth(res[1] - 1);
  this.setFullYear(res[0])
  return this;
}
Date.prototype.yyyymmdd = function () {
  return `${this.getFullYear()}-${this.getMonth() + 1}-${this.getDate()}`;
}
Date.prototype.yyyymmddInt = function () {
  return parseInt(`${this.getFullYear()}${(this.getMonth() + 1) <= 9 ? '0' + (this.getMonth() + 1) : (this.getMonth() + 1)}${(this.getDate()) <= 9 ? '0' + this.getDate() : this.getDate()}`);
}
Date.prototype.nearestQuarter = function () {
  this.setMinutes((this.getMinutes() / 15).round(0) * 15);
  this.setSeconds(0);
  this.setMilliseconds(0);
  return this;
}
Date.prototype.nextQuarter = function () {
  this.setMinutes(Math.ceil((this.getMinutes() / 15)) * 15);
  this.setSeconds(0);
  this.setMilliseconds(0);
  return this;
}
Date.prototype.lastQuarter = function () {
  this.setMinutes(Math.floor((this.getMinutes() / 15)) * 15);
  this.setSeconds(0);
  this.setMilliseconds(0);
  return this;
}
Date.prototype.isToday = function () {
  return this.toDateString() === new Date().toDateString();
}
Date.prototype.nextWorkingDay = function () {
  const res = this.copy();
  res.setDate(res.getDate() + 1);
  while (res.getDay() % 6 === 0) {
    res.setDate(res.getDate() + 1);
  }
  return res;
}

Date.prototype.yesterday = function () {
  const res = new Date(this);
  res.setDate(res.getDate() - 1)
  return res
}

Date.prototype.tomorrow = function () {
  const res = new Date(this);
  res.setDate(res.getDate() + 1)
  return res
}

Date.prototype.addOneWeek = function () {
  this.setTime(this.getTime() + 604800000)
  return this;
}

Date.prototype.subOneWeek = function () {
  this.setTime(this.getTime() - 604800000)
  return this;
}

Date.prototype.timeAgo = function () {
  const timeFormats = [
    [60, 's', 1], // 60
    [120, 'vor 1m', 'in 1m'], // 60*2
    [7200, 'm', 60], // 60*60, 60
    [7200, 'vor 1h', 'in 1h'], // 60*60*2
    [86400, 'h', 3600], // 60*60*24, 60*60
    [172800, 'gestern', 'Tomorrow'], // 60*60*24*2
    [604800, 't', 86400], // 60*60*24*7, 60*60*24
    [1209600, 'letzte woche', 'nächste woche'], // 60*60*24*7*4*2
    [2419200, 'w', 604800], // 60*60*24*7*4, 60*60*24*7
    [4838400, 'letzter monat', 'nächster monat'], // 60*60*24*7*4*2
    [29030400, 'm', 2419200], // 60*60*24*7*4*12, 60*60*24*7*4
    [58060800, 'letztes jahr', 'nächstes jahr'], // 60*60*24*7*4*12*2
    [2903040000, 'y', 29030400], // 60*60*24*7*4*12*100, 60*60*24*7*4*12
    [5806080000, 'letztes jahrhundert', 'nächstes jahrhundert'], // 60*60*24*7*4*12*100*2
    [58060800000, 'c', 2903040000] // 60*60*24*7*4*12*100*20, 60*60*24*7*4*12*100
  ];
  let seconds = (+new Date() - this.getTime()) / 1000;
  let token = 'vor';
  let listChoice = 1;

  if (seconds === 0) {
    return 'jetzt';
  }
  if (seconds < 60 && seconds > 0) {
    return 'vor <1m';
  }
  if (seconds < 0) {
    seconds = Math.abs(seconds);
    token = 'in';
    listChoice = 2;
  }
  let i = 0;
  let format;
  while (i + 1 < timeFormats.length) {
    format = timeFormats[i++];
    if (seconds < format[0]) {
      if (typeof format[2] === 'string') {
        return format[listChoice].toString();
      } else {
        return token + ' ' + Math.floor(seconds / format[2]) + format[1];
      }
    }
  }
  return 'nicht vorgesehen';
}

Date.prototype.datesSet = function () {
  const start = this.copy().set(8);
  const res: Date[] = [
    this.copy(),
    this.copy(),
    this.copy(),
    this.copy(),
    this.copy()
  ];
  for (let i = 0; i < 5; i++) {
    RegularJobDialogComponent.findnext(i + 1, start, res[i])
  }
  return res;
}

Date.prototype.isInMonth = function (date: Date) {
  return this.isBefore(date.monthEnd()) && date.monthStart().isBefore(this)
}

Date.prototype.monthStart = function (): Date {
  return new Date(this.copy().set(0).setDate(1));
}

Date.prototype.monthEnd = function (): Date {
  let end = new Date(this.copy().setMonth(this.getMonth() + 1));
  return end.monthStart();
}

Date.prototype.firstDayOfWeek = function (): Date {
  return new Date(this.copy().setDate(this.getDate() - (this.getDay() - 1))).set(0);
}

Date.prototype.workingWeek = function (): Date[] {
  let day = new Date(this.copy().setDate(this.getDate() - (this.getDay() - 1))).set(0);
  let res = [day]
  for (let i = 1; i < 5; i++) {
    res[i] = res[i - 1].tomorrow();
  }
  return res;
}

Date.prototype.nextWorkingWeek = function (): Date[] {
  let d = this.copy();
  d.setDate(d.getDate() + 7)
  return d.workingWeek()
}

Date.prototype.previousWorkingWeek = function (): Date[] {
  let d = this.copy();
  d.setDate(d.getDate() - 7)
  return d.workingWeek()
}

Date.prototype.workingWeekNumber = function (): number {
  return Math.ceil(this.tomorrow().daysDifference(
    new Date(this.getFullYear(), 0, 1).next(Day.do).workingWeek()[0]
  ) / 7)
}

Date.prototype.getWorkingWeek = function (year, week) {
  let d = new Date(year, 0, 1);
  // let d = new Date("Jan 01, " + year + " 00:00:00");
  while ([Day.fr, Day.sa, Day.so].includes(d.getDay())) {
    d = d.tomorrow();
  }
  for (let i = 0; i < week - 1; i++) {
    d.addOneWeek();
  }
  return d.workingWeek();
}

Date.prototype.next = function (workingDay): Date {
  while (this.getDay() !== workingDay) {
    this.setTime(this.tomorrow().getTime())
  }
  return this;
}

Date.prototype.timeUntil = function (): number {
  return this.getTime() - new Date().getTime()
}

/**
 * rounds the value to a provided number of digits
 * @param digits the number of digits after comma to round
 * @returns the rounded value
 */
Number.prototype.round = function (digits: number) {
  return Math.round(this.valueOf() * Math.pow(10, digits)) / Math.pow(10, digits);
}

Number.prototype.isBetween = function (firstEnd, secondEnd) {
  return (firstEnd < this && this < secondEnd) || (firstEnd > this && this > secondEnd);
}

Number.prototype.clamp = function (min, max) {
  return this < min ? min : this > max ? max : this as number;
}

Number.prototype.map = function (fromLow, fromUp, toLow, toUp) {
  const mapped = ((this as number - fromLow) * (toUp - toLow)) / (fromUp - fromLow) + toLow;
  return mapped.clamp(toLow, toUp);
}

Number.prototype.toPrice = function () {
  return new Price(this as number);
}
Number.prototype.abs = function () {
  return Math.abs(this as number);
}
Number.prototype.floor = function () {
  return Math.floor(this as number);
}

String.prototype.toHTML = function (): string {
  return this ? this.replace(/\n\r?/g, '<br />') : '';
}

String.prototype.editDistance = function(other: string): number {
  const s1 = this.toLowerCase();
  const s2 = other.toLowerCase();

  var costs = [];
  for (var i = 0; i <= s1.length; i++) {
    var lastValue = i;
    for (var j = 0; j <= s2.length; j++) {
      if (i == 0)
        costs[j] = j;
      else {
        if (j > 0) {
          var newValue = costs[j - 1];
          if (s1.charAt(i - 1) != s2.charAt(j - 1))
            newValue = Math.min(Math.min(newValue, lastValue),
              costs[j]) + 1;
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
    }
    if (i > 0)
      costs[s2.length] = lastValue;
  }
  console.log(costs[s2.length]);
  return costs[s2.length];
}

/** um den material datepicker auf montag als ersten tag der woche umzustellen */
@Injectable()
export class CustomDateAdapter extends NativeDateAdapter {

  // parse the date from input component as it only expect dates in
  // mm-dd-yyyy format
  override parse(value: any): Date | null {
    if ((typeof value === 'string') && (value.indexOf('/') > -1)) {
      const str = value.split('/');

      const year = Number(str[2]);
      const month = Number(str[1]) - 1;
      const date = Number(str[0]);

      return new Date(year, month, date);
    }
    const timestamp = typeof value === 'number' ? value : Date.parse(value);
    return isNaN(timestamp) ? null : new Date(timestamp);
  }

  override getFirstDayOfWeek(): number {
    return 1;
  }
}
