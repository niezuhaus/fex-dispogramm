import {Feature, MultiPolygon, Polygon, Position} from "@turf/turf";
import {Price} from "./Price";
import {area, polygon} from "@turf/turf";
import {IdObject} from "../common/interfaces";
import {GC} from "../common/GC";
import {AreYouSureDialogComponent} from "../dialogs/are-you-sure-dialog.component";
import {ZoneDialogComponent} from "../dialogs/zone-dialog.component";

export class Zone implements IdObject {
  id: string;
  name: string;
  coordinates: Position[][] = [];

  set _coordinates(coos: Position[][]) {
    this.coordinates = coos;
    this.polygon = polygon(this.coordinates);
    this._area = this.polygon ? (area(this.polygon) / 1000000).round(2) : 0;
  }

  get _coordinates() {
    return this.coordinates
  }

  price = new Price();

  set _polygon(polygon: Feature<Polygon | MultiPolygon>) {
    if (!polygon) {
      this.polygon = null;
      this.coordinates = [];
      return;
    }
    this.polygon = polygon;
    if (polygon.geometry.coordinates.length > 1) {
      this.coordinates = (polygon.geometry.coordinates as unknown as Position[][][]).map(a => a[0]);
    } else {
      this.coordinates = polygon.geometry.coordinates as Position[][];
    }
  }

  polygon: Feature<Polygon | MultiPolygon>;
  index?: number;
  private _area: number;
  /**
   * area in km2
   */
  get area(): number {return this._area};

  get nrOfPoints(): number {return this.coordinates?.map(a => a.length).sum() || 0}

  constructor(data?: Partial<Zone>) {
    if (data) {
      Object.assign(this, data);
      this.price = new Price(this.price);
    }
    this.polygon = polygon(this.coordinates);
    this._area = this.polygon ? (area(this.polygon) / 1000000).round(2) : 0;
  }

  delete(): void {
    const dialog = GC.dialog.open(AreYouSureDialogComponent, {
      data: {
        headline: 'möchtest du diese zone löschen?',
        verbYes: 'löschen',
        verbNo: 'abbrechen',
        zone: this,
        highlightNo: true,
        warning: true
      }
    });
    dialog.componentInstance.confirm.subscribe(() => {
      GC.http.deleteZone(this).subscribe(() => {
        GC.openSnackBarLong('zone wurde gelöscht.');
        GC.dialog.closeAll();
        GC.refreshNeeded.emit(true);
      });
    });
  }

  openDialog(): void {
    GC.dialog.open(ZoneDialogComponent, {
      data: {
        zone: this
      }
    })
  }
}
