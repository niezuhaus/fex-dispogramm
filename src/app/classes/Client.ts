import {GC} from "../common/GC";
import {AreYouSureDialogComponent} from "../dialogs/are-you-sure-dialog.component";
import {SpecialPrice} from "./SpecialPrice";

export class Client {
  id: string = ''; // dbid
  clientId: string = ''; // fex-id
  name: string = '';
  street: string = '';
  zipCode: string = '';
  city: string = '';
  info: string = '';
  billClient: boolean;

  get specialPrices(): SpecialPrice[] {
    return GC.specialPriceClients.get(this.id) || [];
  }

  constructor(data?: Partial<Client>) {
    if (data) {
      Object.assign(this, data);
    }
  }

  openPage(): void {
    GC.router.navigate([GC.routes.client, {id: this.id}])
  }

  delete(): void {
    const dialog = GC.dialog.open(AreYouSureDialogComponent, {
      data: {
        headline: `möchtest du ${this.name} wirklich löschen?`,
        verbYes: 'löschen',
        verbNo: 'abbrechen',
        highlightNo: true,
        warning: true
      }
    })
    dialog.componentInstance.confirm.subscribe(() => {
      GC.http.deleteClient(this).subscribe(() => {
        GC.openSnackBarLong(`${this.name} wurde gelöscht`)
      })
    })
  }
}
