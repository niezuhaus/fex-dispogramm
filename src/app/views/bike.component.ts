import {Component, Input, OnInit} from '@angular/core';

@Component({
  selector: 'bike',
  template: `
    <div class="bike" [class.running]="running" style="z-index: 2" (click)="running = !running">
      <div class="wheel wheel__left" [class.running]="running">
        <div class="spoke spoke__left--1"></div>
        <div class="spoke spoke__left--2"></div>
        <div class="hub"></div>
      </div>
      <div class="wheel wheel__right" [class.running]="running">
        <div class="spoke spoke__right--1"></div>
        <div class="spoke spoke__right--2"></div>
        <div class="hub"></div>
      </div>
      <div class="fork"></div>
      <div class="chainring"></div>
      <div class="down-tube"></div>
      <div class="top-tube"></div>
      <div class="seat-tube"></div>
      <div class="seat-stay"></div>
      <div class="chain-stay"></div>
      <div class="chain__upper"></div>
      <div class="chain__bottom"></div>
      <div class="saddle"></div>
      <div class="handlebars"></div>
    </div>
  `,
  styles: [
  ]
})
export class BikeComponent implements OnInit {

  @Input() running: boolean

  constructor() { }

  ngOnInit(): void {
  }

}
