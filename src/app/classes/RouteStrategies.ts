import {BranchSet, LocType, PassType, RoutingMode} from "../common/interfaces";
import {Geolocation, Station} from "./Geolocation";
import {GC} from "../common/GC";
import {Job} from "./Job";
import {Branch} from "./Branch";
import {Routing} from "../common/Routing";
import {Price} from "./Price";

export interface RouteStrategy {
  mode: RoutingMode;

  findBranchSet(job: Job, locs: Geolocation[], center: Station, type: LocType): BranchSet;
}

export class Cheapest implements RouteStrategy {
  mode = RoutingMode.normal;

  /**
   *
   * @param job
   * @param locs
   * @param center
   * @param type
   */
  findBranchSet(job: Job, locs: Geolocation[], center: Station, type: LocType): BranchSet {
    if (!locs || locs.length === 0) {
      return {branches: []};
    }
    const perms: Geolocation[][] = locs.perm();
    const branchSets = perms.map(perm => this.makeBranchesWrapper(job, perm, center, type));
    return Cheapest.cheapestAndShortestBranchSet(job, branchSets);
  }

  /**
   *
   * @param job
   * @param branchSets
   */
  public static cheapestAndShortestBranchSet(job: Job, branchSets: BranchSet[]): BranchSet {
    const setsAndPrices = new Map<Price, BranchSet[]>;
    branchSets.forEach(set => {
      const price = job.priceStrategyObj.calcBranchSetPrice(set, true);
      setsAndPrices.set(price, !setsAndPrices.get(price) ? [set] : setsAndPrices.get(price).concat(set));
    })
    const sets = [...setsAndPrices.entries()]

    const cheapestPrice = Math.min(...[...setsAndPrices.keys()].map(price => price._netto));
    const cheapestBranchSets = [...setsAndPrices.get([...setsAndPrices.keys()].find(key => key._netto === cheapestPrice))];
    const distances = cheapestBranchSets.map(set => Job.calcBranchSetDist(set));

    const shortestDistance = Math.min(...distances);
    const shortestAndCheapestSets = cheapestBranchSets.filter(branches => Job.calcBranchSetDist(branches) === shortestDistance);
    return shortestAndCheapestSets[0];
  }

  /**
  * wrapper to start a recursive search for the cheapest branchset
   * @param job reference of the job object. will be used to link it in the branches
   * @param route the locations to be processed
   * @param center the center location. usually the client
   * @param type will be either pickup or delivery
   * @return the cheapest (1st priority) and shortest (2nd priority) branchset possible
  * */
  private makeBranchesWrapper(job: Job, route: Geolocation[], center: Station, type: LocType): BranchSet {
    const set: Branch[] = [];
    this.makeBranches(job, route.map(s => new Geolocation(s)), set, center, type);
    set.forEach(branch => {
      branch.findSections();
    });
    return {branches: set};
  }

  /** brings the given pickups or deliveries in order
   * and creates the branches putting all stations in one of four categories:
   *    0 source the furthest away point
   *    1 nearby a point less than .2km away from anther point
   *             see NEARBY_DIST
   *    2 onway  a point existing close to the airline between two points
   *             airline(a,c) + .4km > airline(a,b) + airline(b,c)
   *             see ONWAY_DIST
   *    3 route  @todo think about route mode!
   *    4 center the client most of the time or any other set center
   *             every branch is either ending or starting here
   */
  private makeBranches(job: Job, route: Geolocation[], branchSet: Branch[], center: Station, type: LocType): void {
    if (route.length < 1) {
      return;
    }
    const station = (new Station(route.splice(0, 1)[0]));
    station.passType = PassType.source;
    const branch = new Branch(job, [station], center, type);
    station.branch = branch;
    branchSet.push(branch);
    branchSet.filter(b => !b.closed).forEach(openBranch => {
      let i = 0;
      let oldI = -1;
      while (openBranch.route.filter(l => l.passType !== PassType.nearby)[i] && i !== oldI) {
        oldI = i;
        const dels: number[] = [];
        for (let j = 0; j < route.length; ++j) {
          const openBranchLoc = openBranch.route.filter(l => l.passType !== PassType.nearby)[i];
          const location = route[j];
          let newS: Station;
          // NEARBY
          if (Routing.dist(openBranchLoc, location) <= GC.config.nearbyDist / 1000) {
            newS = (new Station(route[j]));
            dels.push(j);
            newS.passType = PassType.nearby;
            newS.locType = type;
            openBranch.route.splice(i + 1, 0, newS);
          }  // ONWAY
          else if (Routing.distPrice(
            Routing.priceDist(openBranch.route.filter(l => l.passType !== PassType.nearby).concat([new Station(location), center])))
              ._add(GC.config.prices.stop)._netto <
            Routing.distPrice(Routing.priceDist(openBranch.route.filter(l => l.passType !== PassType.nearby).concat([center])))
              ._add(Routing.distPrice(Routing.priceDist([location, center])))
              ._sub(GC.config.prices.connectionDiscount)._netto) {
            newS = (new Station(route[j]));
            dels.push(j);
            newS.passType = PassType.stop;
            newS.locType = type;
            openBranch.route.splice(j + 1, 0, newS);
            ++i;
          } // ROUTE
          else if (
            Routing.distPrice(Routing.priceDist([openBranchLoc, location]))._add(
              Routing.distPrice(Routing.priceDist([location, center]))
            )._netto <
            Routing.distPrice(Routing.priceDist([openBranchLoc, center]))._add(
              Routing.distPrice(Routing.priceDist([location, center])))._netto) {
            newS = (new Station(route[j]));
            dels.push(j);
            newS.passType = PassType.route;
            openBranch.route.splice(j + 1, 0, newS);
            ++i;
          }
          if (newS) {
            // if (GC.city.includes(newS.zipCode) && GC.city.includes(center.zipCode)) {
            //   newS.isCity = true;
            // }
            newS.branch = openBranch;
          }
        }
        dels.sort((a, b) => b - a).forEach(n => route.splice(n, 1));
      }
    });
    return this.makeBranches(job, route, branchSet, center, type);
  }
}

export class Star implements RouteStrategy {
  mode = RoutingMode.star;

  findBranchSet(job: Job, locs: Geolocation[], center: Station, type: LocType): BranchSet {
    return {branches: locs.map(loc => {
        const station = new Station(loc);
        station.passType = PassType.source;
        const branch = new Branch(job, [station], center, type);
        station.branch = branch;
        return branch;
      })};
  }
}

export class Round implements RouteStrategy {
  mode = RoutingMode.shortestRound;

  findBranchSet(job: Job, locs: Geolocation[], center: Station, type: LocType): BranchSet {
    if (type === LocType.delivery) {
      locs.reverse();
    }
    const perms: Geolocation[][] = locs.perm();
    const branches = perms.map(p => {
      const route = p.copy().map(loc => {
        const s = new Station(loc);
        s.passType = PassType.stop;
        return s;
      });
      route[0].passType = PassType.source;
      const b = new Branch(job, route, center, type);
      // b.calcPrice();
      route.forEach(s => s.branch = b);
      // b.price();
      return {branches: [b]};
    });
    return Cheapest.cheapestAndShortestBranchSet(job, branches);
  }
}

export class PrimitRound implements RouteStrategy {
  mode = RoutingMode.primitiveRound;

  findBranchSet(job: Job, locs: Geolocation[], center: Station, type: LocType): BranchSet {
    if (type === LocType.delivery) {
      locs.reverse();
    }
    const route = locs.map((loc) => {
      const s = new Station(loc);
      s.passType = PassType.stop;
      return s;
    });
    route[0].passType = PassType.source;
    const b = new Branch(job, route, center, type);
    route.forEach(s => s.branch = b);
    return {branches: [b]};
  }
}
