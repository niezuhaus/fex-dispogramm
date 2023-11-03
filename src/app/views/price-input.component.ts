import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {PriceType} from "../common/interfaces";
import {Price} from "../classes/Price";

@Component({
  selector: 'app-price-input',
  template: `
    <mat-form-field class="price" [style.width.px]="width || 30">
      <mat-label>{{label}}</mat-label>
      <input
        #input
        matInput
        type="text"
        class="pr-2"
        [placeholder]="placeholder"
        [value]="value()"
        (click)="input.select()"
        (keyup)="touched.emit(true); price.setByString(input.value, false)">
    </mat-form-field>
  `,
  styles: []
})

export class PriceInputComponent implements OnInit {
  @Input() type: PriceType; // 0 = netto, 1 = brutto, 2 = paypal
  @Input() price: Price;
  @Input() width: number;
  @Input() label: string;
  @Output() touched = new EventEmitter<boolean>();
  @Output() priceChange = new EventEmitter<Price>();

  value = () => {
    return this.type === PriceType.netto ? this.price._netto.toString() : this.price._brutto.toString();
  };
  placeholder = '';

  constructor() {
    if (!this.price) {
      this.price = new Price();
    }
  }

  ngOnInit(): void {
    this.placeholder = this.value();
    if (!this.label) {
      this.label = this.type === PriceType.netto ? 'netto' : 'brutto';
    }
  }
}
