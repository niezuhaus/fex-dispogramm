import {Geolocation} from "../classes/Geolocation";
import {IPoint} from "./interfaces";
import {GC} from "./GC";
import {lineString, Position} from "@turf/turf";
import booleanIntersects from "@turf/boolean-intersects";
import {Zones} from "./zones";
import {Price} from "../classes/Price";


export class Routing {

  static findRoute(points: Geolocation[]): IPoint[] {
    if (points.length === 1) {
      return points;
    }
    let result: IPoint[] = [];
    points.forEach((location, i, array) => {
      result.push(location);
      if (i !== array.length - 1) {
        result = result.concat(Routing.findBridge(location, array[i + 1]))
      }
    });
    result.push(points[points.length - 1]);
    result = this.checkOnRiverCrossings(result);
    return result;
  }

  static findBridgesArray(array: Geolocation[]): IPoint[] {
    if (array.length < 2) {
      return array;
    }
    let res: IPoint[] = [];
    array.forEach((loc, i, a) => {
      if (i !== a.length - 1) {
        res.push(loc);
        res = res.concat(this.findBridge(loc, a[i + 1]));
      }
    });
    res.push(array[array.length - 1]);
    return res;
  }

  public static findBridge(first: Geolocation, second: Geolocation): IPoint[] {
    if (GC.plzLeftOfWeser.includes(first.zipCode) === GC.plzLeftOfWeser.includes(second.zipCode)) {
      return [];
    }
    let dists = [
      this.dist(first, GC.bridges[0][0]) + this.dist(GC.bridges[0][0], second),
      this.dist(first, GC.bridges[1][0]) + this.dist(GC.bridges[1][0], second),
      this.dist(first, GC.bridges[2][0]) + this.dist(GC.bridges[2][0], second),
    ]

    if (!GC.plzLeftOfWeser.includes(first.zipCode)) {
      dists.push(this.dist(first, GC.bridges[3][0]) + this.dist(GC.bridges[3][0], GC.bridges[3][1]) + this.dist(GC.bridges[3][1], second),)
      dists.push(100);
    } else {
      dists.push(100);
      dists.push(this.dist(first, GC.bridges[4][0]) + this.dist(GC.bridges[4][0], GC.bridges[4][1]) + this.dist(GC.bridges[4][1], second))
    }
    return GC.bridges[dists.indexOf(Math.min(dists[0], dists[1], dists[2], dists[3], dists[4]))];
  }

  private static checkOnRiverCrossings(array: IPoint[]): IPoint[] {
    for (let i = 0; i < array.length - 1; i++) {
      const first = [array[i + 1].longitude, array[i + 1].latitude];
      const second = [array[i].longitude, array[i].latitude];
      const line = lineString([first, second])
      let func = (pp: Position) => {
        // this.toggleObject('path', [first, pp, second], true)
        array.splice(i + 1, 0, {longitude: pp[0], latitude: pp[1]});
        i++;
      }
      // wedersee
      if (booleanIntersects(line, lineString(Zones.weserParts.east))) {
        // note: turf.shortestPath really doesn't work so well.
        // it works grid based and places unnecessary points in between
        // let options = {obstacles: polygon([Zones.weserParts.south.concat(Zones.weserParts.south[0])])}
        // path = shortestPath(point(first), point(second), options).geometry.coordinates;
        func(Zones.extraPoints.east);
      }
      //weser
      else if (booleanIntersects(line, lineString(Zones.weserParts.south))) {
        func(Zones.extraPoints.south);
      }
    }
    return array;
  }

  /**
   * gibt den preis per liste für eine gegebene strecke zurück
   * @param km strecke in km
   * @returns preis per liste
   */
  static distPrice(km: number): Price {
    let list = GC.config.prices.list;
    km = Math.ceil(km);
    const result = list.base.copy();
    result.add(list.extra1._mul((km - list.quantityIncl).clamp(0, list.threshold - list.quantityIncl)))
    if (km > list.threshold) {
      result.add(list.extra2._mul(km - list.threshold));
    }
    return result;
  }

  /**
   * calculates the priceable km between two points taking bridges and river crossing into account.
   * @param route the route two calculate the distance from
   * @return distance in km
   */
  static priceDist(route: Geolocation[]): number {
    return Routing.arrayDist(this.findRoute(route));
  }

  /**
   * berechnet die luftlinie einer liste von punkten in angegebener reihenfolge
   * @param liste von punkten
   * @return strecke in km
   */
  static arrayDist(arr: IPoint[]): number {
    let result = 0;
    arr.forEach((p, i, a) => {
      if (a[i + 1]) {
        result += Routing.dist(p, a[i + 1]);
      }
    });
    return result.round(2);
  }

  /**
   * calculates the distance between two points in km
   * @param first first point
   * @param second second point
   * @return distance in km
   */
  static dist(first: IPoint, second: IPoint): number {
    if (!first || !second) {
      return 0;
    }
    const R = 6371;
    const dLat = this.degToRad(second.latitude - first.latitude); // degToRad below
    const dLon = this.degToRad(second.longitude - first.longitude);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.degToRad(first.latitude)) * Math.cos(this.degToRad(second.latitude)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private static degToRad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
