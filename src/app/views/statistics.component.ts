import {AfterViewInit, Component, OnInit, ViewChild} from '@angular/core';
import * as d3 from "d3";
import {GC} from "../common/GC";
import {TitleComponent} from "./app.component";

@Component({
  selector: 'app-statistics',
  template: `
    <h2 class="mt-3 ml-3">
      Wochenstatistik
    </h2>
    <div>
      <svg id="week" style="width: 100%; height: 500px"></svg>
    </div>
    <div>
      <svg id="day" style="width: 100%; height: 500px"></svg>
    </div>
  `,
  styles: []
})
export class StatisticsComponent extends TitleComponent implements OnInit, AfterViewInit {

  override title: 'statistiken';

  private weekStats: { name: string, turnover: number}[] = [];
  private dayStats: {name: string, turnover: number}[] = [];
  private svg: any;
  private margin = 50;
  private width = 750 - (this.margin * 2);
  private height = 400 - (this.margin * 2);
  private charts: Map<string, any> = new Map<string, any>()

  constructor() {
    super();
  }

  ngOnInit(): void {

    GC.http.getWeekStatistic().subscribe((response) => {
      response.forEach(stat => {
        this.weekStats.push({name: stat.day.slice(0, 2) + ' früh', turnover: stat.statistics[0].turnover});
      })
      response.forEach(stat => {
        this.weekStats.push({name: stat.day.slice(0, 2) + ' spät', turnover: stat.statistics[1].turnover});
      })
      this.createSvg('svg#week');
      this.drawBars('svg#week', this.weekStats);
    })
    GC.http.getDayStatistic().subscribe(response => {
      console.log(response)
      response.forEach(stat => {
        this.dayStats.push({name: stat.timeframe.slice(0, 2) + 'h - ' + stat.timeframe.slice(2, 4) + 'h', turnover: stat.turnover});
      })
      // this.createSvg('svg#day');
      // this.drawBars('svg#day', this.dayStats);
    })
  }

  ngAfterViewInit(): void {
  }

  private createSvg(name: string): void {
    this.charts.set(name, d3.select(name)
      .append("svg")
      .attr("width", this.width + (this.margin * 2))
      .attr("height", this.height + (this.margin * 2))
      .append("g")
      .attr("transform", "translate(" + this.margin + "," + this.margin + ")")
    );
  }

  private drawBars(name: string, data: any[]): void {
    const svg = this.charts.get(name);
    // Create the X-axis band scale
    const x = d3.scaleBand()
      .range([0, this.width])
      .domain(data.map(d => d.name))
      .padding(0.2);

    // Draw the X-axis on the DOM
    svg.append("g")
      .attr("transform", "translate(0," + this.height + ")")
      .call(d3.axisBottom(x))
      .selectAll("text")
      .attr("transform", "translate(-10,0)rotate(-45)")
      .style("text-anchor", "end");

    // Create the Y-axis band scale
    const y = d3.scaleLinear()
      .domain([0, Math.max(...data.map(d => d.money as number))*1.2])
      .range([this.height, 0]);

    // Draw the Y-axis on the DOM
    svg.append("g")
      .call(d3.axisLeft(y));

    // Create and fill the bars
    svg.selectAll("bars")
      .data(data)
      .enter()
      .append("rect")
      .attr("x", (d: any) => x(d.name))
      .attr("y", (d: any) => y(d.turnover))
      .attr("width", x.bandwidth())
      .attr("height", (d: any) => this.height - y(d.turnover))
      .attr("fill", "#8061af");
  }
}
