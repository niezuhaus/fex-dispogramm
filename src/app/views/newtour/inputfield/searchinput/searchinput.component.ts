import {Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild} from '@angular/core';
import {Observable, of} from 'rxjs';
import {debounceTime, distinctUntilChanged, filter, map, switchMap, tap} from 'rxjs/operators';
import {Client} from "../../../../classes/Client";
import {GeoCodingStrategy, LocType, SpecialPriceType,} from '../../../../common/interfaces';
import {Messenger} from "../../../../classes/Messenger";
import {Job} from "../../../../classes/Job";
import {MatAutocompleteTrigger} from '@angular/material/autocomplete';
import {InputFieldComponent} from "../input-field.component";
import {GC} from "../../../../common/GC";
import {HttpService} from "../../../../http.service";
import {Geolocation, Station} from "../../../../classes/Geolocation";
import {FormControl, Validators} from "@angular/forms";
import {Zone} from "../../../../classes/Zone";

@Component({
  selector: 'searchinput',
  templateUrl: './searchinput.component.html',
  styleUrls: ['./searchinput.component.scss']
})

export class SearchinputComponent implements OnInit {

  constructor() {
  }

  // customization
  @Input() label: string;
  @Input() icon: string;
  @Input() placeholder: string;
  @Input() ignoredMessenger: Messenger[] = [];

  // search modes
  @Input() searchLocations: boolean; // white
  @Input() searchOSM: boolean; // white
  @Input() searchClients: boolean; // black
  @Input() searchClientLocations: boolean; // red
  @Input() searchJobs: boolean; // green
  @Input() searchMessenger: boolean; // purple
  @Input() searchDispatcher: boolean; // purple
  @Input() searchZones: boolean; // orange?
  @Input() searchPostCodeZones: boolean; // orange?

  @Input() type: LocType;
  @Input() index: number;
  @Input() content: string;
  @Input() str: string;
  @Input() inputField: InputFieldComponent;
  @Input() disabled: boolean;
  @Input() width: string;
  @Input() required: boolean;
  @Input() hideGroupJobs: boolean;
  @Input() keepMessName: boolean;
  // @Input() autocompleteOffsetY: number;

  // events
  @Output() locationSelected = new EventEmitter<Geolocation>();
  @Output() OSMselected = new EventEmitter<Geolocation>();
  @Output() clientSelected = new EventEmitter<{ c: Client, l: Geolocation }>();
  @Output() clientClientSelected = new EventEmitter<Client>();
  @Output() jobSelected = new EventEmitter<Job>();
  @Output() messengerSelected = new EventEmitter<Messenger>();
  @Output() dispatcherSelected = new EventEmitter<Messenger>();
  @Output() zoneSelected = new EventEmitter<Zone>();
  // todo: festtouren und sonderpreise suchbar machen

  @Output() strChange = new EventEmitter<string>();
  @Output() startedTyping = new EventEmitter<boolean>();
  @Output() resetted = new EventEmitter<boolean>();
  @Output() register = new EventEmitter<SearchinputComponent>();

  @ViewChild('input') inputRef: ElementRef;
  @ViewChild('input') input: HTMLInputElement;
  @ViewChild('trigger') autocomplete: MatAutocompleteTrigger;

  selection: Station = null;
  dispatcherSelection: Messenger;
  messengerSelection: Messenger;
  searchTerm = '';
  client: Client;

  locationOptions: Geolocation[] = [];
  osmOptions: Geolocation[] = [];
  clientOptions: Geolocation[] = [];
  clientclientOptions: Client[] = [];
  messengerOptions: Messenger[] = [];
  dispatcherOptions: Messenger[] = [];
  zoneOptions: Zone[] = [];

  jobOptions: Job[];
  searching = 0;
  loadMode = false;
  jobMode = false;
  hasStartedTyping = false;
  change = new EventEmitter<string>();
  geocoder: GeoCodingStrategy;
  ctrl: FormControl;
  ctrlVoid: FormControl;

  private static _filterLocationsNoClientId(list: Geolocation[]): Geolocation[] {
    return list.filter(option => {
      return !(parseInt(option.clientId, 10) > 0);
    });
  }

  ngOnInit(): void {
    this.setFormControls();
    this.searchTerm = this.content ? this.content : '';
    this.searchTerm = this.str ? this.str : '';
    this.setListeners();
    this.change.subscribe(str => {
      if (str) {
        this.strChange.emit(str);
        if (!this.hasStartedTyping) {
          setTimeout(() => {
            this.hasStartedTyping = true;
            this.startedTyping.emit(true);
          }, 100);
        }
      }
    });

    this.locationSelected.pipe(
      debounceTime(100)
    ).subscribe(() => {
      if (!this.searchJobs) {
        this.resetOptions();
      }
    });
  }

  setFormControls(): void {
    this.ctrl = new FormControl({value: '', disabled: this.disabled}, [Validators.required]);
    this.ctrlVoid = new FormControl({value: '', disabled: this.disabled}, [])
  }

  // Events

  setListeners(): void {
    // the red ones, locations with clientId
    if (this.searchClientLocations) {
      this.change.pipe(
        distinctUntilChanged(),
        filter(term => term?.length >= 1),
      ).subscribe(searchStr => {
        if (this.loadMode || this.jobMode) {
          this.loadMode = false;
        }
        if (!this.jobMode) {
          this.clientOptions = HttpService._filterLocationsByAny(GC.clientLocations, searchStr)
        }
      });
    }

    // the blue ones, locations without clientId
    if (this.searchLocations) {
      this.change.pipe(
        distinctUntilChanged(),
        filter(term => term?.length >= 1),
        switchMap(term => {
            if (this.loadMode || this.jobMode) {
              this.loadMode = false;
              return new Observable<Geolocation[]>();
            } else {
              return GC.http.searchLocationList(term);
            }
          }
        ),
        map(list => {
          list.forEach(loc => {
            loc.inputfield = this.index;
          });
          return SearchinputComponent._filterLocationsNoClientId(list);
        })
      ).subscribe(locations => {
        if (!this.jobMode) {
          this.locationOptions = locations;
        }
      });
    }

    // the white ones, plain address search-results
    if (this.searchOSM) {
      this.change.pipe(
        filter(() => {
          return !this.jobMode
        }),
        tap(term => {
          if (term.length <= 2) {
            this.searching = 0;
          } else {
            this.searching++;
          }
        }),
        distinctUntilChanged(),
        debounceTime(GC.DEBOUNCE_TIME),
        filter(term => term?.length > 1),
        switchMap(term => {
          if (this.loadMode || this.jobMode || term.length <= 2) {
            this.loadMode = false;
            return of([]);
          } else {
            return GC.config.geocoder.geocode(this.searchTerm, this.type);
          }
        }),
        map(list => {
          list.forEach(loc => {
            loc.inputfield = this.index;
          });
          return list;
        })
      ).subscribe(osmOptions => {
        this.osmOptions = osmOptions;
        this.searching = 0;
      });
    }

    // the green ones, jobs
    if (this.searchJobs) {
      this.clientSelected.pipe(
        filter(c => c.c.id !== '0'),
        tap(() => {
          this.jobMode = true;
          this.searching++;
        })
      ).subscribe(c => {
        setTimeout(() => {
          this.autocomplete.openPanel();
        }, 0)
        setTimeout(() => {
          if (this.loadMode || !this.selection) {
            this.loadMode = false;
            this.searching = 0;
            this.jobOptions = [];
          } else {
            GC.http.distinctsJobsForClient(c.c.id)
              .subscribe(jobOptions => {
                jobOptions = jobOptions.filter(j => j.center.id === this.selection.id)
                if (this.hideGroupJobs) {
                  jobOptions = jobOptions.filter(j => j.specialPrice?.type !== SpecialPriceType.group)
                }
                this.searching = 0;
                this.jobOptions = jobOptions;
                this.resetOptions(true)
              });
          }

        }, 0)
      })
    }

    // the black ones, clients
    if (this.searchClients) {
      this.change.pipe(
        distinctUntilChanged(),
        filter(term => term.length >= 1),
        switchMap(term => {
            if (this.loadMode || this.jobMode) {
              this.loadMode = false;
              return new Observable<Client[]>()
            } else {
              return GC.http.searchClientList(term);
            }
          }
        )
      ).subscribe(clients => {
        this.clientclientOptions = clients;
      });
    }

    // the purple ones, messengers
    if (this.searchMessenger) {
      this.change.pipe(
        distinctUntilChanged(),
        filter(term => !!(term)),
        filter(term => term.length >= 1),
        switchMap(term => {
          return GC.http.searchMessenger(term);
        })
      ).subscribe(messenger => {
        this.messengerOptions = messenger.filter(mess => !this.ignoredMessenger?.map(m => m.id).includes(mess.id));
      });
    }

    if (this.searchDispatcher) {
      this.change.pipe(
        distinctUntilChanged(),
        filter(term => !!(term)),
        filter(term => term.length >= 1),
        switchMap(term => {
          return GC.http.searchMessenger(term, true);
        })
      ).subscribe(dispatcher => {
        this.dispatcherOptions = dispatcher;
      });
    }

    if (this.searchZones) {
      this.change.pipe(
        distinctUntilChanged(),
        filter(term => !!(term)),
        filter(term => term.length >= 1),
      ).subscribe(term => {
        let list: Zone[] = [];
        if (this.searchZones) {
          list = GC.zones.copy();
          if (this.searchPostCodeZones)
            list.pushArray(GC.postCodeZones);
        } else if (this.searchPostCodeZones) {
          list = GC.postCodeZones;
        }
        this.zoneOptions = list.filter(zone => zone.name.toLowerCase().includes(term.toLowerCase()));
      });
    }
  }

  keyup(e: KeyboardEvent): void {
    let search = () => {
      this.jobMode = false;
      this.jobOptions = [];
      this.change.emit(this.searchTerm);
    }

    switch (true) {
      case e.key === 'Backspace':
        if (this.searchTerm === '') {
          this.reset();
          this.resetted.emit(true)
        } else {
          if (this.selection) {
            this.selection = null;
            this.resetted.emit(true)
          }
          search();
        }
        break;

      case e.key === 'Escape':
        break;

      case e.key === 'Tab':
        this.autocomplete.closePanel();
        break;

      case e.key.length === 1:
        if (this.selection) {
          this.selection = null;
          this.jobOptions = [];
          this.resetted.emit(true)
        }
        search();
        break;

      case e.key === 'Enter':
        break;

      default:
        if (!this.autocomplete.panelOpen) {
          this.autocomplete.openPanel();
        }
    }
  }

  //white (plain address search result)
  _osmSelected(loc: Geolocation): void {
    loc.locType = this.type;
    this.selection = new Station(loc);
    this.OSMselected.emit(this.selection);
    this.locationSelected.emit(this.selection);
  }

  // red (location with clientID)
  _clientSelected(loc: Geolocation): void {
    GC.http.getClient(loc.clientId).subscribe(selectedClient => {
      this.client = selectedClient;
      loc.locType = this.type;
      this.selection = new Station(loc);
      this.clientSelected.emit({c: selectedClient, l: loc});
      this.clientOptions = [];
    })
  }

  // blue (location without clientID)
  _locationSelected(loc: Geolocation): void {
    if (loc.clientId) {
      loc.locType = this.type;
      this.selection = new Station(loc);
      this.locationSelected.emit(loc);
      this.clientOptions = [];
    } else {
      loc.locType = this.type;
      this._osmSelected(loc);
    }
  }

  // black (client)
  _clientClientSelected(client: Client): void {
    this.client = client;
    this.clientClientSelected.emit(client);
    this.clientclientOptions = [];
  }

  // purple (messenger)
  _messengerSelected(messenger: Messenger): void {
    if (messenger.dispatcher) {
      this.dispatcherSelection = messenger;
      this.dispatcherSelected.emit(messenger);
      this.dispatcherOptions = [];
    }
    this.messengerSelection = messenger;
    this.messengerSelected.emit(messenger);
    this.messengerOptions = [];
    if (this.keepMessName) {
      this.searchTerm = messenger.nickname
    }
  }

  // green (green)
  _jobSelected(job: Job): void {
    job = new Job(job);
    job.client = this.client;
    job.id = null;
    job.creator = GC._dispatcher?.messenger;
    job.finished = false;
    job.description = '';
    job.billingTour = job.client.billClient;
    this.resetOptions();
    this.jobSelected.emit(job);
  }

  _zoneSelected(zone: Zone): void {
    this.reset()
    this.zoneSelected.emit(zone);
  }

  // UI

  registerMe(): void {
    this.inputRef.nativeElement.select();
    // if (this.type > 0) {
    this.register.emit(this);
    // }
  }

  forceReset(options?: boolean): void {
    this.searchTerm = '';
    this.jobMode = false;
    this.loadMode = false;
    this.selection = null;
    this.client = null;
    this.messengerSelection = null;
    this.dispatcherSelection = null;
    if (options) {
      this.resetOptions();
    }
    this.autocomplete.closePanel();
    this.hasStartedTyping = false;
  }

  resetOptions(leavejobs?: boolean): void {
    this.clientOptions = [];
    this.locationOptions = [];
    this.osmOptions = [];
    this.jobOptions = leavejobs ? this.jobOptions : [];
    this.messengerOptions = [];
    this.zoneOptions = [];
  }

  reset(options?: boolean): void {
    this.forceReset(options);
    this.resetted.emit(true);
  }

  setSelection(loc: Geolocation): void {
    this.loadMode = true;
    loc.inputfield = this.index;
    this.selection = new Station(loc);
    this.searchTerm = loc.name ? loc.name : loc.address;
    this.type !== LocType.client ? this.inputField.hasBacktour = loc.hasBacktour : '';
  }

  isEmpty(): boolean {
    return this.searchTerm === '';
  }
}

export class OSMGeocoder implements GeoCodingStrategy {
  type = 0;

  geocode(searchStr: string, type: LocType): Observable<Geolocation[]> {
    return GC.http.searchOSM(searchStr, type);
  }
}

export class BingGeocoder implements GeoCodingStrategy {
  type = 1;

  geocode(searchStr: string, type: LocType): Observable<Geolocation[]> {
    return GC.http.searchBing(searchStr, type);
  }
}

export class CombinedGeocoder implements GeoCodingStrategy {
  type = 2;

  geocode(searchStr: string, type: LocType): Observable<Geolocation[]> {
    return GC.http.searchBoth(searchStr, type);
  }
}
