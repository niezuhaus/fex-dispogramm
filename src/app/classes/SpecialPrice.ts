import {Client} from "./Client";
import {Price} from "./Price";
import {GC} from "../common/GC";
import {AreYouSureDialogComponent} from "../dialogs/are-you-sure-dialog.component";
import {IdObject, SpecialPriceType} from "../common/interfaces";
import {BaseExtra, FexRules, Group, PriceStrategy} from "./PriceStrategies";
import {Zone} from "./Zone";

export class SpecialPrice implements IdObject {

  id: string;
  name: string;
  clients: Client[] = [];
  base: Price = new Price();
  extra: Price = new Price();
  group: Price = new Price();
  quantityIncluded: number = 1;
  type: SpecialPriceType = SpecialPriceType.fexrules;
  grossPrice = false;
  priceStrategy: PriceStrategy;
  zones: Zone[] = [];
  zipCodes: string[] = [];

  get typeString() {
    switch (this.type) {
      case SpecialPriceType.none:
        return 'none';

      case SpecialPriceType.group:
        return 'gruppentarif';

      case SpecialPriceType.baseExtra:
        return 'grundpreis + extra';

      case SpecialPriceType.fexrules:
        return 'fex regeln'
    }
  }

   get deletebool() {
     return this.group._netto === 0 && this.base._netto === 0;
   }

  constructor(data?: Partial<SpecialPrice>) {
    if (data) {
      Object.assign(this, data);
      this.clients = this.clients ? this.clients.map(c => new Client(c)) : null;
      this.base = this.base ? new Price(this.base) : null;
      this.extra = this.extra ? new Price(this.extra) : null;
      this.group = this.group ? new Price(this.group) : null;
      this.type = this.base?._netto > 0 ? SpecialPriceType.baseExtra : this.group._netto > 0 ? SpecialPriceType.group : SpecialPriceType.fexrules;
    }
    this.priceStrategy = this.makePriceStrategy()
  }

  save(): void {
    if (this.type === SpecialPriceType.group) {
      this.base._netto = 0;
      this.extra._netto = 0;
    } else {
      this.group._netto = 0;
    }
    if (this.grossPrice) {
      this.base._brutto = this.base._netto;
      this.extra._brutto = this.extra._netto;
      this.group._brutto = this.group._netto;
    }
    let ob = this.id ? GC.http.updateSpecialPrice(this) : GC.http.createSpecialPrice(this);
    ob.subscribe(price => {
      GC.openSnackBarLong('sonderpreis wurde gespeichert');
    });
  }

  delete(force?: boolean): void {
    if (force) {
      GC.http.deleteSpecialPrice(this).subscribe(() => {
        console.log('gelöscht')
      })
      return;
    }

    const dialog = GC.dialog.open(AreYouSureDialogComponent, {
      data: {
        headline: 'möchtest du diesen sonderpreis löschen?',
        verbYes: 'ja',
        verbNo: 'abbrechen',
        highlightNo: true,
        warning: true
      }
    });
    dialog.componentInstance.confirm.subscribe(() => {
      GC.http.deleteSpecialPrice(this).subscribe(() => {
        GC.openSnackBarLong('sonderpreis wurde gelöscht.')
      })
    })
  }

  print(): void {
    console.log(this)
  }

  makePriceStrategy(): PriceStrategy {
    switch (this.type) {
      case SpecialPriceType.group:
        return new Group(this.group, this.name);

      case SpecialPriceType.baseExtra:
        return new BaseExtra(
          SpecialPriceType.baseExtra,
          {base: this.base, extra: this.extra, quantityIncl: this.quantityIncluded},
          this.name);

      case SpecialPriceType.none:
        return null;

      default:
        return new FexRules();
    }
  }
}
