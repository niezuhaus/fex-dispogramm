import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  ViewContainerRef
} from '@angular/core';
import {HttpService} from '../../http.service';
import {InputFieldComponent} from './inputfield/input-field.component';
import {Client} from "../../classes/Client";
import {Extra, IPoint, LocType} from '../../common/interfaces';
import {Zone} from "../../classes/Zone";
import {zip} from 'rxjs';
import {corners, drawText, feature, initMap} from '../../UTIL';
import {SearchinputComponent} from './inputfield/searchinput/searchinput.component';
import {ActivatedRoute} from '@angular/router';
import {LocationDialogComponent} from '../../dialogs/location-dialog.component';
import {Location} from '@angular/common';
import * as mapboxgl from "mapbox-gl";
import {GeoJSONSource, LngLat, Marker, Popup} from "mapbox-gl";
import {GC} from "../../common/GC";
import {Price} from "../../classes/Price";
import {Job, RegularJob} from "../../classes/Job";
import {RegularJobDialogComponent} from "../../dialogs/regular-job-dialog.component";
import {NewClientDialogComponent} from "../../dialogs/new-client-dialog.component";
import * as MapboxDraw from "@mapbox/mapbox-gl-draw";
import {ZoneDialogComponent} from "../../dialogs/zone-dialog.component";
import {
  Feature,
  lineString,
  polygon,
  Polygon,
  Position,
} from "@turf/turf";
import {Geolocation, Station} from "../../classes/Geolocation";
import {MatDialogRef} from "@angular/material/dialog";
import {CheckInDialog} from "../../dialogs/shifts-dialog/check-in-dialog.component";
import {TitleComponent} from "../app.component";
import {Zones} from "../../common/zones";
import {AreYouSureDialogComponent} from "../../dialogs/are-you-sure-dialog.component";

@Component({
  selector: 'newtour',
  templateUrl: './newtour.component.html',
  styleUrls: ['./newtour.component.scss']
})

export class NewtourComponent extends TitleComponent implements OnInit, AfterViewInit, OnDestroy {

  override title = 'neue tour erstellen';

  // JOB VARIABLES
  job = new Job(null);
  isTemplate: boolean;

// UI VARIABLES
  extras: Extra[] = [];
  locType = LocType;
  pInputs: InputFieldComponent[] = [];
  dInputs: InputFieldComponent[] = [];
  focussedInput: SearchinputComponent = null;

  // MAP VARIABLES
  mapGL: mapboxgl.Map;
  markerGL: Marker[] = [];
  popUpGL: Popup[] = [];
  mapboxDraw: MapboxDraw;
  locationPopUpOpen: boolean;
  polygon: Position[][];
  polygonIds = new Map<string, string>();

  // STATE VARIABLES
  loaded = false;
  timeEdited = false;
  priceSet = false;
  touched = false;
  zoomed = false;
  protectZoomed = false;
  forceZoomReset = false;
  changedLocations: Geolocation[] = [];
  reverseGeocodingActivated = true;
  staticMode = true;
  nameFieldVisible = false;
  noteVisible = false;
  dezwoOptions = false;

  get _noteVisible() {return this.job?.description || this.noteVisible};

  get _nameFieldVisible() {return this.job?.name || this.nameFieldVisible};

  get configPrices() {return GC.config?.prices};

  get dispatcher() {return GC.dispatcherCheckedIn()};

  get routes() {return GC.routes};

  get isDezwo() {return GC._isDezwo};

  get specialPrices() {return GC.specialPrices};

  @ViewChild('map') mapContainer: ElementRef;
  @ViewChild('pickup') pInput: InputFieldComponent;
  @ViewChild('pickup', {read: ViewContainerRef}) pRef: ViewContainerRef;
  @ViewChild('delivery') dInput: InputFieldComponent;
  @ViewChild('delivery', {read: ViewContainerRef}) dRef: ViewContainerRef;
  @ViewChild('clientInput') cInput: SearchinputComponent;
  @ViewChild('name') name: ElementRef;
  @ViewChild('notes') notes: ElementRef;

  constructor(
    private cd: ChangeDetectorRef,
    private route: ActivatedRoute,
    private location: Location,
  ) {
    super();
  }

  ngOnInit(): void {
    if (GC.config) {
      this.extras = [
        {value: 0, viewValue: 'kein zuschlag', price: GC.config.prices.extras[0]},
        {value: 1, viewValue: 'last', price: GC.config.prices.extras[1]},
        {value: 2, viewValue: 'lastenrad', price: GC.config.prices.extras[2]},
        {value: 3, viewValue: 'carla', price: GC.config.prices.extras[3]},
      ]
    }
  }

  ngAfterViewInit(): void {
    GC.loaded().subscribe(() => {
        if (!this.extras.length) {
          this.extras = [
            {value: 0, viewValue: 'kein zuschlag', price: GC.config.prices.extras[0]},
            {value: 1, viewValue: 'last', price: GC.config.prices.extras[1]},
            {value: 2, viewValue: 'lastenrad', price: GC.config.prices.extras[2]},
            {value: 3, viewValue: 'carla', price: GC.config.prices.extras[3]},
          ]
        }
        this.focussedInput = this.cInput;
        this.pInputs.push(this.pInput);
        this.dInputs.push(this.dInput);
        this.initMap();
        setTimeout(() => {
          this.route.paramMap.subscribe(params => {
            const id = params.get('id');
            if (id?.length && id !== 'undefined') {
              if (params.get('rj') === 'true') {
                this.isTemplate = true;
                this.loadRegularJob(id);
              } else {
                this.isTemplate = false;
                this.loadJobById(id);
              }
            } else if (params.get('time')) {
              this.timeEdited = true;
              this.job.date = new Date(params.get('time'));
            }
          });
        }, 100)
      }
    )
  }

  ngOnDestroy(): void {
    this.mapGL.remove();
  }

  /**
   * request a job from the backend and shows it in the map
   * @param id the id of the shown to be shown
   */
  loadJobById(id: string): void {
    GC.http.getJob(id).subscribe(job => {
      this.job = new Job(job).init();
      this.mapGL.on('load', () => {
        this.createUI(this.job);
        this.refresh({zoom: true, pushPrice: job.price});
      });
      if (job.regularJobId) {
        GC.http.getRegularJob(job.regularJobId).subscribe(rj => {
          this.job.regularJob = rj;
        })
      }
    });
  }

  /**
   * requests the template from the backend, converts it locally to a job object that will
   * be shown in the view
   * @param id the id of the template to be shown
   */
  loadRegularJob(id: string): void {
    GC.http.getRegularJob(id).subscribe(rj => {
      this.job = HttpService._convertToJobLocally(rj).init();
      this.mapGL.on('load', () => {
        this.createUI(this.job);
        this.refresh({zoom: true});
      });
    });
  }

  /** runs a complete refreshment cycle */
  refresh(options: { zoom: boolean, pushPrice?: Price }): void {
    this.fetchRoute();
    this.resetMap();
    if (this.job._center) {
      this.job.init(options.pushPrice ? {pushPrice: options.pushPrice} : null);
      this.drawJob(this.job);
    }
    if (options.zoom) {
      this.refreshMapZoom(false);
    }
  }

  /**
   * wrapper for the refresh method
   * @param options usual options just as in the original method
   */
  asyncRefresh(options: { zoom: boolean, pushPrice?: Price }) {
    setTimeout(() => {
      this.refresh(options);
    }, 0)
  }

  /** calculates the necessary map zoom to fit the job bounding box */
  refreshMapZoom(doNotProtect?: boolean, extraZoom?: boolean): void {
    if (!this.mapGL) {
      return;
    }
    if (!doNotProtect) {
      this.protectZoomed = true;
    }
    this.forceZoomReset = true;
    const points = this.job.getAllPoints();
    if (!points.length) {
      this.mapGL.easeTo({
        center: GC.INIT_MAPCENTER,
        zoom: GC.INIT_ZOOM
      });
      return;
    }
    this.mapGL
      .resetNorthPitch({duration: 200})
      .setPitch(0)
      .fitBounds(corners(points), {
        maxZoom: extraZoom ? 16 : 13,
        padding: {left: 200, top: 200, right: 400, bottom: 200},
        speed: 2.5
      });
  }

  // UI

  /**
   * prepares the view to show a job
   * @param job the job to be shown
   */
  createUI(job: Job): void {
    this.resetUI({leaveUrl: true});
    this.touched = true;
    if (!this.cInput.selection) {
      this.cInput.selection = job.center;
      this.cInput.searchTerm = this.cInput.selection.name;
      this.cInput.client = job.client;
    }

    job.deliveries.forEach((d, i) => {
      d.locType = LocType.delivery;
      let dIn = this.dInput;
      if (i >= 1) {
        dIn = this.createInputfield(LocType.delivery);
      }
      dIn.searchinput.setSelection(d);
    });
    job.pickups.forEach((p, i) => {
      p.locType = LocType.pickup;
      let pIn = this.pInput;
      if (i >= 1) {
        pIn = this.createInputfield(LocType.pickup);
      }
      pIn.searchinput.setSelection(p);
    });

    if (job.deliveries.length) {
      this.createInputfield(LocType.delivery);
    }
    if (job.pickups.length) {
      this.createInputfield(LocType.pickup);
    }
    this.cInput.autocomplete.closePanel();
  }

  /** resets the whole view */
  resetUI(options?: { leaveUrl?: boolean, leaveDate?: boolean }): void {
    if (!this.touched && !this.job.hasData) {
      return;
    }
    if (!(options?.leaveUrl)) {
      this.location.replaceState(GC.routes.newTour);
    }
    this.priceSet = false;
    this.cInput.forceReset();
    this.cInput.resetOptions(options?.leaveUrl);
    this.pInput.reset();
    this.dInput.reset();
    this.pInputs = [this.pInput];
    this.dInputs = [this.dInput];
    this.dRef.clear();
    this.pRef.clear();
    this.resetMap();
    this.refreshMapZoom();
    this.touched = false;
    this.noteVisible = false;
    this.nameFieldVisible = false;
  }

  /**
   * creates a new input field in the left sidebar for an extra location to be added to the job
   * @param type weather it should be an inputfield for a PICKUP or a DELIVERY
   */
  createInputfield(type: LocType): InputFieldComponent {
    const inputs = type === LocType.delivery ?
      this.dInputs :
      this.pInputs;
    if (inputs.map(i => !i.searchinput.searchTerm).includes(true)) {
      return null;
    }
    const container = type === LocType.delivery ? this.dRef : this.pRef;
    const field = container.createComponent(InputFieldComponent);
    field.location.nativeElement.style = 'width: 100%';
    const fieldComp = field.instance as InputFieldComponent;
    fieldComp.type = type;
    fieldComp.index = type === LocType.delivery ? this.dInputs.length : this.pInputs.length;
    fieldComp.disabled = this.job.finished;
    fieldComp.clientSelected.subscribe((msg) => this.clientSelected(msg));
    fieldComp.selected.subscribe(() => {
      this.touched = true;
      this.refresh({zoom: true});
    });
    fieldComp.resetted.subscribe(() => this.refresh({zoom: true}));
    fieldComp.backtour.subscribe(() => {
      this.touched = true;
      this.refresh({zoom: true});
    });
    fieldComp.register.subscribe(e => this.register(e));
    fieldComp.startedTyping.subscribe(() => this.createInputfield(type));
    (type === LocType.pickup ? this.pInputs : this.dInputs).push(fieldComp);
    this.cd.detectChanges();
    return fieldComp;
  }

  resolveInputfield(station: Station): SearchinputComponent {
    switch (station.locType) {
      case LocType.client:
        return this.cInput;

      case LocType.delivery:
        return this.dInputs[station.inputfield].searchinput;

      default:
        return this.pInputs[station.inputfield].searchinput;
    }
  }

  // ROUTE
  /** reads the set locations from all searchinput components and builds up the route */
  fetchRoute(): void {
    this.job.center = null;
    this.job.pickups = this.pInputs.filter(input => input.searchinput.selection).map(input => {
      return input.searchinput.selection.copy();
    });
    this.job.deliveries = this.dInputs.filter(input => input.searchinput.selection).map(input => {
      return input.searchinput.selection.copy();
    });
    if (this.cInput.selection) {
      this.job.client = this.cInput.client;
      this.cInput.selection.locType = LocType.client;
      this.job._center = this.cInput.selection;
    }
  }

  // MAP
  /** initializes the map */
  initMap(): void {
    this.mapGL = initMap({
      lnglat: GC.INIT_MAPCENTER,
      zoom: GC.INIT_ZOOM,
      container: 'map'
    });
    if (!this.mapGL) {
      return;
    }
    let modes = MapboxDraw.modes;
    // @ts-ignore
    modes.static = require('@mapbox/mapbox-gl-draw-static-mode');

    this.mapboxDraw = new MapboxDraw({
      displayControlsDefault: false,
      defaultMode: 'draw_polygon'
    });
    this.mapGL.addControl(this.mapboxDraw);
    this.mapGL.on('draw.modechange', (event: { mode: string }) => {
      switch (event.mode) {
        case 'draw_polygon':
          this.reverseGeocodingActivated = false;
          break;

        case 'direct_select':
          this.reverseGeocodingActivated = false;
          break;

        case 'static':
          this.reverseGeocodingActivated = true;
          break;

        default:
          this.reverseGeocodingActivated = true;
          break;
      }
    });
    if (this.staticMode) {
      this.mapboxDraw.changeMode('static')
    }
    this.mapGL.on('draw.create', (event) => this.createPolygons(event));
    this.mapGL.on('draw.delete', (event) => {
    });
    this.mapGL.on('draw.update', (event) => this.updatePolygons(event));

    // show zones
    this.mapGL.on('load', () => {
      this.loaded = true;
      this.mapGL.resize()
      this.setPointWithPopUp([{position: [8.80472, 53.08906], name: 'FEX'}]) // FEX
      if (GC.config.showZonesPermanently) {
        GC.zones.forEach(z => {
          this.toggleZone(z.name);
        })
      }
    });

    // reverse geocode on click
    this.mapGL.on('click', (e) => {
      if (this.reverseGeocodingActivated === false || this.job.finished) {
        return;
      }
      this.touched = true;
      e.lngLat.lng = e.lngLat.lng.round(5);
      e.lngLat.lat = e.lngLat.lat.round(5);
      GC.http.reverseGeocode(e.lngLat.lat, e.lngLat.lng, this.focussedInput.type)
        .subscribe(response => {
          if (this.locationPopUpOpen) {
            this.locationPopUpOpen = false;
            return;
          }
          let res: Geolocation;
          if (response.length) {
            res = response[0];
            res.latitude = e.lngLat.lat
            res.longitude = e.lngLat.lng;
            if (this.focussedInput.type !== 0) {
              res.hasBacktour = this.focussedInput.inputField.hasBacktour;
            }
            this.focussedInput.setSelection(res);
          } else {
            return;
          }
          if (this.focussedInput === this.cInput) {
            this.cInput.setSelection(res);
            const c = new Client(res);
            console.log(c)
            c.billClient = false;
            this.cInput.client = c;
          }
          this.createInputfield(this.focussedInput.type);
          this.refresh({zoom: false})
        });
    });

    // visibility of reset-view-button
    this.mapGL.on('moveend', (() => {
      if (this.protectZoomed) {
        this.protectZoomed = false;
        this.forceZoomReset = false;
        this.zoomed = false;
      } else if (this.forceZoomReset) {
        this.zoomed = false;
        this.forceZoomReset = false;
      } else {
        this.zoomed = true;
      }
    }));
  }

  createPolygons(features: Polygon[]): void {
    const f = features[features.length - 1];
    console.log(this.mapboxDraw.getAll().features)
    const zone = new Zone({id: null, name: '', _coordinates: f.coordinates});
    const dialog = GC.dialog.open(ZoneDialogComponent, {
      data: {
        zone: zone,
      }
    })
    dialog.componentInstance.confirm.subscribe(() => {
      GC.http.createZone(zone).subscribe(() => {
        GC.openSnackBarLong(`zone \'${zone.name}\' gespeichert!`);
      });
    });
  }

  createZone(): void {
    const zone = new Zone({id: null, name: '', _coordinates: this.polygon});
    const dialog = GC.dialog.open(ZoneDialogComponent, {
      data: {
        zone: zone,
      }
    })
    dialog.componentInstance.confirm.subscribe(() => {
      GC.http.createZone(zone).subscribe(() => {
        GC.openSnackBarLong(`zone \'${zone.name}\' gespeichert!`);
      });
    });
  }

  updateZone(): void {
    GC.zones[1]._coordinates = this.polygon;
    const dialog = GC.dialog.open(ZoneDialogComponent, {
      data: {
        zone: GC.zones[1],
      }
    });
    dialog.componentInstance.confirm.subscribe(zone => {
      GC.http.updateZone(zone).subscribe(update => {
        GC.openSnackBarLong(`zone \'${update.name}\' gespeichert!`);
      });
    });
  }

  updatePolygons(features: { features: Feature<Polygon>[] }): void {
    this.polygon = features.features[0].geometry.coordinates;
    console.log(this.polygon)
  }

  toggleWeserPart(south: boolean): void {
    const arm = south ? Zones.weserParts.south : Zones.weserParts.east;
    this.toggleObject(south ? 'werdersee' : 'weser', [arm], true);
  }

  toggleZone(name: string) {
    const zone = GC.zones.find(z => z.name === name);
    if (!zone) {
      return;
    }
    const id = this.polygonIds.get(name);
    if (!id) {
      let coos = [
        [8.81066, 53.08874],
        [8.78625, 53.09249]
      ];
      if (coos[zone.index]) {
        drawText(this.mapGL, name, coos[zone.index])
      }
    }
    this.toggleObject(name, zone._coordinates, false);
  }

  toggleObject(name: string, coordinates: Position[][], line: boolean): void {
    const id = this.polygonIds.get(name);
    if (!id) {
      this.polygonIds.set(name, this.mapboxDraw.add(
        line ?
          lineString(coordinates[0]): // todo ? is it right?
          polygon(coordinates))[0]);
    } else {
      this.mapboxDraw.delete(id);
      this.polygonIds.delete(name);
      if (!line) {
        this.mapGL.removeLayer(name);
        this.mapGL.removeSource(name);
      }
    }
  }

  deleteZones(): void {
    this.polygonIds.forEach((id, name) => {
      this.mapboxDraw.delete(id);
      this.polygonIds.delete(name);
      // this.mapGL.removeLayer(name);
      if (this.mapGL.getSource(name)) {
        this.mapGL.removeSource(name);
      }
    })
  }

  /** draws a continuous line between the points of a given array */
  drawLines(id: string, points: IPoint[]): void {
    const array: Position[] = [];
    points.forEach(p => {
      array.push([p.longitude, p.latitude]);
    });
    this.changeLayer(id, array);
  }

  changeLayer(id: string, coos: Position[]): void {
    // console.log(coos)
    const source: GeoJSONSource = this.mapGL.getSource(id) as GeoJSONSource;
    if (source) {
      source.setData({
        'type': 'Feature',
        'properties': {},
        'geometry': {
          'type': 'LineString',
          'coordinates': coos
        }
      });
    } else {
      this.layer.push(id);
      this.mapGL.addSource(id, {
        'type': 'geojson',
        'data': {
          'type': 'Feature',
          'properties': {},
          'geometry': {
            'type': 'LineString',
            'coordinates': coos
          }
        }
      });
      this.mapGL.addLayer({
        'id': id,
        'type': 'line',
        'source': id,
        'layout': {
          'line-join': 'round',
          'line-cap': 'round'
        },
        'paint': {
          'line-color': '#000',
          'line-width': 4
        }
      });
    }
  }

  drawJob(job: Job): void {
    if (!job._center) {
      return;
    }
    // draw center marker
    if (job.dBranches.branches.length >= 1 && !job.pBranches.branches.length) {
      // blue arrow up
      this.setMarker(job.center, LocType.pickup);
    } else if (job.pBranches.branches.length >= 1 && !job.dBranches.branches.length) {
      // blue arrow down
      this.setMarker(job.center, LocType.delivery);
    } else {
      // blue dot
      this.setMarker(job.center);
    }
    if (!job.pickups.concat(job.deliveries).length) {
      return;
    }
    job.getAllStations(true).slice(1).forEach(station => this.setMarker(station));
    job.pBranches?.branches.forEach((branch, i) => {
      this.drawLines(`p${i}`, branch.routeWithBridges);
    });
    job.dBranches?.branches.forEach((branch, i) => {
      this.drawLines(`d${i}`, branch.routeWithBridges);
    });
    job.pBacktourBranches?.branches.forEach((branch, i) => {
      this.drawLines(`pb${i}`, branch.routeWithBridges);
    });
    job.dBacktourBranches?.branches.forEach((branch, i) => {
      this.drawLines(`db${i}`, branch.routeWithBridges);
    });
    if (!GC.config.showZonesPermanently) {
      job.getZones().forEach(z => {
        this.toggleZone(z.name);
      })
    }
    return;
  }

  /** sets a marker on the map */
  setMarker(station: Station, clientType?: LocType): void {
    if (!(station instanceof Station)) {
      station = new Station(station)
    }
    let i: string;
    const newLocation = !station.id?.length;
    const lnglat = new LngLat(station.longitude, station.latitude);
    if (station.hasBacktour) {
      i = 'm-backtour';
    } else if (!newLocation) {
      switch (station.locType) {
        case LocType.pickup:
          i = 'm-red-up';
          break;
        case LocType.centerPickup:
          i = 'm-red-up';
          break;
        case LocType.delivery:
          i = 'm-green-down';
          break;
        case LocType.centerDelivery:
          i = 'm-green-down';
          break;
        case LocType.client:
          if (clientType) {
            i = clientType === LocType.pickup ?
              i = 'm-blue-up' :
              i = 'm-blue-down';
          } else {
            i = 'm-blue';
          }
          break;
      }
    }
    if (newLocation) {
      if (station.hasBacktour) {
        i = 'm-backtour-add';
      } else {
        switch (station.locType) {
          case LocType.pickup:
          case LocType.centerPickup:
            i = 'm-red-add';
            break;
          case LocType.delivery:
          case LocType.centerDelivery:
            i = 'm-green-add';
            break;
          case LocType.client:
            i = 'm-blue-add';
            break;
        }
      }
    }
    const el = document.createElement('div');
    el.classList.add(...['marker', i]);
    const marker = new Marker({
      element: el,
      draggable: true
    }).setLngLat(lnglat)
      .addTo(this.mapGL);
    const popup = new Popup({
      closeButton: false,
      closeOnClick: false,
      offset: new mapboxgl.Point(0, -41)
    });
    if (station.street && station.zipCode) {
      popup.setLngLat(lnglat).setHTML(
        `<b class="${station.className()}">${station.name ? station.name : station.street}</b><br>${station.name ? station.street + ', ' : ''}${station.zipCode} ${station.city}${station.popUpContent || ''}`);
    } else {
      popup.setLngLat(lnglat).setHTML(
        `<b class="${station.className()}">${station.name}</b>${station.popUpContent || ''}`);
    }
    el.addEventListener('mouseenter', () => {
      popup.addTo(this.mapGL);
    });
    el.addEventListener('mouseout', () => {
      popup.remove();
    });
    el.addEventListener('click', () => {
      this.locationPopUpOpen = true;
      this.openLocationDialog(station, newLocation);
    });
    marker.on('dragend', () => {
      this.touched = true;
      const newPos = marker.getLngLat()
      popup.setLngLat(newPos);
      station.longitude = newPos.lng;
      station.latitude = newPos.lat;

      if (station.locType === LocType.client) {
        this.job.center.latitude = newPos.lat.round(5);
        this.job.center.longitude = newPos.lng.round(5);
      } else if (station.inputfield >= 0) {
        const loc = station.locType === LocType.delivery ?
          this.dInputs[station.inputfield].searchinput.selection :
          this.pInputs[station.inputfield].searchinput.selection;
        loc.latitude = newPos.lat.round(5);
        loc.longitude = newPos.lng.round(5);
      }
      this.changedLocations.push(station);
      this.refresh({zoom: false})
    });

    this.markerGL.push(marker);
    this.popUpGL.push(popup);
  }

  setPointWithPopUp(features: { position: Position, name: string, description?: string }[]): void {
    this.mapGL.addSource('points', {
      'type': 'geojson',
      data: {
        type: "FeatureCollection",
        features: features.map(f => feature({
          position: f.position,
          description: `<strong>${f.name}</strong>${f.description ? '<p>${f.description}</p>' : ''}`
        }))
      }
    })
    this.mapGL.addLayer({
      'id': 'points',
      'type': 'circle',
      'source': 'points',
      'paint': {
        'circle-color': '#5dc3c1',
        'circle-radius': 6,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff'
      }
    });

    const popup = new Popup({
      closeButton: false,
      closeOnClick: false,
    });
    this.mapGL.on('mouseenter', 'points', (e) => {
      this.mapGL.getCanvas().style.cursor = 'pointer';
      this.reverseGeocodingActivated = false;
      // @ts-ignore
      const coordinates = e.features[0].geometry.coordinates.slice();
      // @ts-ignore
      const description = e.features[0].properties.description;
      popup.setLngLat(coordinates).setHTML(description).addTo(this.mapGL)
    });
    this.mapGL.on('mouseleave', 'points', () => {
      this.mapGL.getCanvas().style.cursor = '';
      popup.remove();
      this.reverseGeocodingActivated = true;
    });
  }

  /**
   * removes all objects on the map and clears the location arrays
   */
  resetMap(): void {
    this.markerGL.forEach(marker => {
      marker.remove();
    });
    this.markerGL = [];
    this.popUpGL.forEach(popup => {
      popup.remove();
    });
    this.popUpGL = [];

    this.layer.forEach(id => {
      if (this.mapGL.getLayer(id)) {
        this.mapGL.removeLayer(id);
      }
      if (this.mapGL.getSource(id)) {
        this.mapGL.removeSource(id);
      }
    });
    this.layer = [];

    if (!GC.config.showZonesPermanently) {
      this.deleteZones();
    }
  }

  layer: string[] = [];

  // EVENTS

  openRegularJobOptions(): void {
    const dialog = GC.dialog.open(RegularJobDialogComponent, {
      data: {
        rj: this.job.regularJob,
        locally: true,
      }
    });
    dialog.componentInstance.saved.subscribe(msg => {
      this.touched = true;
      if (this.job) {
        this.job.regularJob = msg;
        this.refresh({zoom: false});
      }
      console.log(this.job.regularJob)
    });
  }

  openCheckinDialog(): void {
    GC.dialog.open(CheckInDialog, {
      data: {
        morning: false
      }
    });
  }

  openClientDialog(location: Geolocation): MatDialogRef<NewClientDialogComponent> {
    const dialog = GC.dialog.open(NewClientDialogComponent, {
      data: {
        location: location,
      }
    });
    dialog.componentInstance.saved.subscribe(client => {
      this.cInput.setSelection(client.l);
      this.cInput.client = client.c;
      this.job.billingTour = client.c.billClient;
      this.refresh({zoom: false})
    });
    return dialog;
  }

  openLocationDialog(loc: Geolocation, newlocation: boolean, input?: InputFieldComponent): void {
    const dialog = GC.dialog.open(LocationDialogComponent, {
      data: {
        location: loc,
        newLocation: newlocation,
      }
    });
    dialog.componentInstance.created.subscribe(station => {
      if (input && input.searchinput.selection) {
        input.searchinput.setSelection(station);
      } else {
        this.resolveInputfield(station).setSelection(station);
      }
      this.refresh({zoom: false})
    });
    dialog.componentInstance.updated.subscribe(station => {
      if (input && input.searchinput.selection) {
        input.searchinput.setSelection(station);
      } else {
        this.resolveInputfield(station).setSelection(station);
      }
      this.refresh({zoom: false})
    });
  }

  saveJob(update?: boolean): void {
    let save = (price?: Price) => {
      const j = this.job.exportData();
      if (price) {
        j.price = price;
      }
      if (update) {
        const updateFn = () => {
          j.save(
            `auftrag
            ${this.changedLocations.length === 1 ? 'und standort wurden' :
              this.changedLocations.length > 1 ? 'und standorte wurden' :
                'wurde'} aktualisiert.`
          ).subscribe({
            next: () => {
              GC.router.navigate([GC.routes.tourplan, {date: j.date.yyyymmdd()}]);
            }, error: (e) => {
              GC.openSnackBarLong(`fehler beim speichern des auftrags`);
              console.log(e)
            }
          });
        }
        if (this.changedLocations.length) {
          zip(this.changedLocations.map(l => GC.http.updateLocation(l))).subscribe(() => {
              updateFn();
            }
          )
        } else {
          updateFn();
        }
      } else {
        j.id = null;
        if (!this.timeEdited) {
          j.creationDate = new Date();
          j.date = j.creationDate.copy();
        }
        const createFn = () => {
          j.save('neuer auftrag wurde gespeichert.').subscribe({
            next: job => {
              GC.router.navigate([GC.routes.tourplan, {date: job.date.yyyymmdd()}]);
            }, error: (error) => {
              console.log(error);
            }
          });
        };
        if (this.changedLocations.length) {
          zip(this.changedLocations.map(l => GC.http.updateLocation(l))).subscribe(() => {
              createFn();
            }
          )
        } else {
          createFn();
        }
      }
    }

    if (this.job.customPrice && this.job.price._netto !== this.job.priceBackup._netto) {
      const dialog = GC.dialog.open(AreYouSureDialogComponent, {
        data: {
          headline: 'der berechnete preis unterscheidet sich von einem vorher festgelegten preis.',
          text: 'welcher preis soll verwendet werden?',
          verbYes: `berechnet preis (${this.job.price.toString(!this.job.billingTour)})`,
          verbNo: `festgelegter preis (${this.job.priceBackup.toString(!this.job.billingTour)})`,
          warning: true,
        }
      })
      dialog.componentInstance.confirm.subscribe(() => {
        save();
      })
      dialog.componentInstance.cancel.subscribe(() => {
        save(this.job.priceBackup);
      })
    } else {
      save();
    }
  }

  saveRegularJob(update?: boolean): void {
    if (!this.job) {
      return;
    }
    const j = this.job.exportData();
    let rj = j as RegularJob;
    rj.creator = null;
    rj.morningTour = this.job.regularJob.morningTour;
    rj.dates = this.job.regularJob.dates;
    rj.monthlyPrice = this.job.regularJob.monthlyPrice;
    rj.id = this.job.regularJob?.id || '';
    rj.name = this.job.regularJob.name;
    rj = new RegularJob(rj);
    if (update) {
      GC.http.updateRegularJob(rj).subscribe(() => {
          GC.openSnackBarLong(`festtour wurde aktualisiert.`);
          this.location.back();
        }
      );
    } else {
      GC.http.createRegularJob(rj).subscribe(() => {
          GC.openSnackBarLong(`neue festtour wurde gespeichert.`);
          this.location.back();
        }
      );
    }
  }

  clientSelected(client: { c: Client, l: Geolocation }): void {
    this.touched = true;
    if (this.focussedInput.type === LocType.client) {
      if (client.c === null) {
        client.c = new Client();
      } else {
        this.job.billingTour = client.c.billClient;
      }
    }
    this.refresh({zoom: true})
  }

  clientResetted(): void {
    this.touched = true;
    this.job.client = null;
    this.resetMap();
    this.refresh({zoom: true});
  }

  register(input: SearchinputComponent): void {
    this.focussedInput.autocomplete.closePanel();
    this.focussedInput = input;
  }

  // methos
  toggleClientInvolved(): void {
    this.touched = true;
    this.job.clientInvolved = !this.job.clientInvolved;
    this.job.center = null;
    this.refresh({zoom: true})
  }

  switchBillingMode(): void {
    if (!this.job.client?.clientId) {
      this.openClientDialog(this.job.center).componentInstance.saved.subscribe(() => {
        this.job.billingTour = !this.job.billingTour;
      });
    } else {
      this.job.billingTour = !this.job.billingTour;
    }
  }

  clientRequired(): boolean {
    return this.cInput.ctrl.hasError('required')
  }

  activateName(): void {
    this.nameFieldVisible = true;
    setTimeout(() => {
      this.name.nativeElement.focus();
    }, 0);
  }

  activateNotes(): void {
    this.noteVisible = true;
    setTimeout(() => {
      this.notes.nativeElement.focus();
    }, 0);
  }
}
