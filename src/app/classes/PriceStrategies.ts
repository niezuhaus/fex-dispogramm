import {BranchSet, LocType, PassType, SpecialPriceType} from "../common/interfaces";
import {Price} from "./Price";
import {Station} from "./Geolocation";
import {GC} from "../common/GC";
import {Branch} from "./Branch";
import {Routing} from "../common/Routing";

export interface PriceStrategy {
  mode: SpecialPriceType;

  calcStationPrice(station: Station, noZones?: boolean): Price;
  calcBranchPrice(branch: Branch, noZones?: boolean): Price;
  calcBranchSetPrice(set: BranchSet, noZones?: boolean): Price;
  priceString(station: Station, popUp: boolean, index?: number): string;
}

export class FexRules implements PriceStrategy {
  mode = SpecialPriceType.fexrules

  calcBranchSetPrice(set: BranchSet, noZones: boolean): Price {
    const res = new Price();
    set.branches.forEach(b => res.add(this.calcBranchPrice(b, noZones)))
    set.price = res;
    return res;
  }

  calcBranchPrice(branch: Branch, noZones?: boolean): Price {
    const res = new Price();
    if (!branch.route) {
      return res;
    }
    branch.route.forEach(station => {
      res.add(this.calcStationPrice(station, noZones))
    })
    if (branch.isConnection) {
      res.sub(GC.config.prices.connectionDiscount);
    }
    return res;
  }

  calcStationPrice(station: Station, noZones?: boolean): Price {
    const res = new Price();
    switch (true) {
      case station.passType === PassType.stop:
        res.add(GC.config.prices.stop);
        break;

      case station.passType === PassType.nearby:
        res.add(GC.config.prices.nearby);
        break;

      case !noZones && !!(station.zone):
        res.add(station.zone.price);
        break;

      case station.passType === PassType.route:
        res.add(station.branch.sections[station.routePointNr].price);
        break;

      case station.passType === PassType.source:
        if (station.branch.sections?.length > 0) {
          res.add(station.branch.sections[0].price)
        } else {
          res.add(Routing.distPrice(station.branch.distance));
        }
        break;
    }
    if (station.isConnection) {
      res.sub(GC.config.prices.connectionDiscount);
    }
    return res;
  }

  priceString(station: Station, popUp: boolean): string {
    let res = '<br>';
    switch (true) {
      case station.passType === PassType.stop:
        res += popUp ? `zwischenstopp <b>+${GC.config.prices.stop.toStringBoth()}</b>` : `+${GC.config.prices.stop.toStringBoth()}`;
        break;

      case station.passType === PassType.nearby:
        res += popUp ? `anschluss ums eck' <b>${GC.config.prices.nearby}</b>` : `+${GC.config.prices.nearby.toStringBoth()}`;
        break;

      case !!(station.zone):
        res += popUp ? `${station.zone.name}-tarif <b>+${station.zone.price.toStringBoth()}</b>` : `+${GC.config.prices.city.toStringBoth()}`;
        break;

      case station.passType === PassType.source:
        const branchprice = Routing.distPrice(station.branch.distance);
        if (station.branch.sections) { // if source is not directly connected to center
          const sourceSection = station.branch.sections[0];
          if (!popUp) {
            return `+${sourceSection.price.toStringBoth()}${station.isConnection ? ' (-' + GC.config.prices.connectionDiscount.toStringBoth() + ')' : ''}`;
          }
          const n1 = station.branch.nextDistPoint(station);
          res += `${sourceSection.traveldist}km bis <b class="${n1.className()}">${n1.name || n1.address}</b> <b>+${sourceSection.price.toStringBoth()}</b> `;
        } else { // measure to next dist point (aka #route-points)
          if (!popUp) {
            return `+${branchprice.toStringBoth()}${station.isConnection ? ' (-' + GC.config.prices.connectionDiscount.toStringBoth() + ')' : ''}`;
          }
          const n2 = station.branch.nextDistPoint(station);
          res += `${station.branch.distance}km bis <b class="${n2.className()}">${n2.name || n2.address}</b> <b>+${branchprice.toStringBoth()}</b>`;
        }
        if (station.branch.isConnection) {
          res += `<br>anschlusstarif <b>-${GC.config.prices.connectionDiscount.toStringBoth()}</b>`;
        }
        break;

      case station.passType === PassType.route:
        const routeSection = station.branch.sections[station.routePointNr];
        if (!popUp) {
          return `+${routeSection.price.toStringBoth()}${station.isConnection ? ' (-' + GC.config.prices.connectionDiscount.toStringBoth() + ')' : ''}`;
        }
        const n3 = station.branch.nextDistPoint(station);
        res +=
          `${routeSection.traveldist}km bis <b class="${n3.className()}">${n3.name || n3.address}</b> <b>+${routeSection.price.toStringBoth()}</b>`;
        break;

      case station.locType === LocType.client:
        if (popUp) {
          if (!GC.cashClientIds.includes(station.clientId)) {
            res += `<span style="color: #84d002">rechnungskund*in</span>`;
          } else {
            res += `<span style="color: #84d002">barkund*in</span>`;
          }
        }
        break;
    }
    return res;
  }
}

export class Group implements PriceStrategy {
  mode = SpecialPriceType.group

  constructor(private altPrice?: Price, public name?: string) {
  }

  price(): Price {
    return this.altPrice ? this.altPrice : GC.config.prices.group;
  }

  calcStationPrice(station: Station): Price {
    return this.price().copy();
  }

  calcBranchPrice(branch: Branch): Price {
    return this.price()._mul(branch.route.length);
  }

  calcBranchSetPrice(set: BranchSet): Price {
    const res = new Price();
    set.branches.forEach(b => res.add(this.calcBranchPrice(b)));
    return res;
  }

  priceString(station: Station, popUp: boolean): string {
    // station.price = GC.config.prices.group.copy();
    let res = '';
    if (popUp) {
      res += '<br> gruppentarif: ';
    }
    res += popUp ? `<b>+${this.price().toStringBoth()}</b>` : `+${this.price().toStringBoth()}`;
    return res;
  }
}

export class BaseExtra implements PriceStrategy {
  constructor(
    public mode: SpecialPriceType,
    public template: {base: Price, extra: Price, quantityIncl: number},
    public name: string
  ) {
  }

  calcStationPrice(station: Station): Price {
    let index = station.index();
    switch (true) {
      case index === 0:
        return this.template.base.copy();

      case index < this.template.quantityIncl:
        return new Price();

      default:
        return this.template.extra.copy();
    }
  }

  calcBranchPrice(branch: Branch): Price {
    const res = new Price();
    branch.route.forEach(s => res.add(this.calcStationPrice(s)))
    return res;
  }

  calcBranchSetPrice(set: BranchSet): Price {
    const res = new Price();
    set.branches.forEach(b => res.add(this.calcBranchPrice(b)));
    return res;
  }

  priceString(station: Station, popUp: boolean, index: number): string {
    let res = '';
    // station.price = index === 0 ? this.template.base.copy() : index >= this.template.quantityIncl ? this.template.extra.copy() : new Price();
    if (popUp) {
      res += `<br> ${this.name} `;
    }
    res += popUp ?
      `<b>+${index + 1 <= this.template.quantityIncl ? this.template.base.toStringBoth() : this.template.extra.toStringBoth()}</b>` :
      `+${index + 1 <= this.template.quantityIncl ? this.template.base.toStringBoth() : this.template.extra.toStringBoth()}`
    return res;
  }
}
