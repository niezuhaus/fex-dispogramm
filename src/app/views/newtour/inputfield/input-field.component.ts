import {Component, OnInit, Input, ViewChild, Output, EventEmitter} from '@angular/core';
import {SearchinputComponent} from './searchinput/searchinput.component';
import {LocType} from '../../../common/interfaces';
import {Client} from "../../../classes/Client";
import {MatSelect} from '@angular/material/select';
import {MatOption} from '@angular/material/core';
import {GC} from "../../../common/GC";
import {Geolocation} from "../../../classes/Geolocation";

@Component({
  selector: 'app-inputfield',
  templateUrl: './input-field.component.html',
  styles: [`
    @import "../../../../const.scss";

    .blue {
      color: $fex-dark;
    }
  `]
})

export class InputFieldComponent implements OnInit {
  @Input() type: LocType;
  @Input() readonly: boolean;
  @Input() focussed: boolean;
  @Input() index: number;
  @Input() disabled: boolean
  @Output() selected = new EventEmitter<boolean>();
  @Output() clientSelected = new EventEmitter<{c: Client, l: Geolocation}>();
  @Output() resetted = new EventEmitter<boolean>();
  @Output() backtour = new EventEmitter<boolean>();
  @Output() startedTyping = new EventEmitter<boolean>();
  @Output() register = new EventEmitter<SearchinputComponent>();
  @Output() openClientDialog = new EventEmitter<{loc: Geolocation, input: InputFieldComponent}>();
  @Output() openLocationDialog = new EventEmitter<{loc: Geolocation, input: InputFieldComponent}>();
  @ViewChild('searchinput') searchinput: SearchinputComponent;
  @ViewChild('list') list: MatSelect;
  selection: MatOption[] = [];
  hasBacktour = false;
  circleColor: string;

  constructor() {
  }

  ngOnInit(): void {
    this.circleColor = this.type === LocType.delivery ? GC.deliveryTone : GC.pickupTone;
  }

  doNothing(): void {
  }

  selectedParent(location: Geolocation): void {
    location.hasBacktour = this.hasBacktour;
    this.selected.emit(true);
  }

  clientSelectedParent(client: {c: Client, l: Geolocation}): void {
    client.l.hasBacktour = this.hasBacktour;
    this.clientSelected.emit(client);
  }

  reset(): void {
    this.searchinput.forceReset();
    this.hasBacktour = false;
  }

  backtourToggle(): void {
    this.hasBacktour = !this.hasBacktour;
    this.searchinput.selection.hasBacktour = this.hasBacktour;
    this.backtour.emit(true);
  }
}
