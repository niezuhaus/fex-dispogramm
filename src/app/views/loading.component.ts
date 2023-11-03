import {Component, OnInit} from '@angular/core';
import {GC} from "../common/GC";
import {Location} from "@angular/common";
import {ActivatedRoute} from "@angular/router";
import {ConfigDialogComponent} from "../dialogs/config-dialog.component";

@Component({
  selector: 'app-loading',
  template: `
    <div class="flex flex-column align-items-center justify-content-center w-100"
         style="position: absolute; background: white; z-index: 101; height: 100%">
      <div class="loadingScreen" style="position:relative; bottom: 50px" *ngIf="backendIP() && !cantConnect() && !apiKeysMissing">
        <bike [running]="true"></bike>
        <mat-progress-bar mode="determinate" color="primary" [value]="progess()" class="mt-4 mb-3"
                          style="width: 500px"></mat-progress-bar>
        <div *ngIf="!loadedParts().config" class="flex flex-row">einstellungen laden</div>
        <div *ngIf="loadedParts().config">einstellungen geladen<i class="bi bi-check"></i></div>
        <div *ngIf="!loadedParts().zones" class="flex flex-row">zonen laden</div>
        <div *ngIf="loadedParts().zones">zonen geladen<i class="bi bi-check"></i></div>
        <div *ngIf="!loadedParts().messenger" class="flex flex-row">kurier:innen laden</div>
        <div *ngIf="loadedParts().messenger">kurier:innen geladen<i class="bi bi-check"></i></div>
        <div *ngIf="!loadedParts().dispatcher" class="flex flex-row">disponent:innen laden</div>
        <div *ngIf="loadedParts().dispatcher">disponent:innen geladen<i class="bi bi-check"></i></div>
        <div *ngIf="!loadedParts().regularJobs" class="flex flex-row">festtouren laden</div>
        <div *ngIf="loadedParts().regularJobs">festtouren geladen<i class="bi bi-check"></i></div>
        <div *ngIf="!loadedParts().shifts" class="flex flex-row">schichten laden</div>
        <div *ngIf="loadedParts().shifts">schichten geladen<i class="bi bi-check"></i></div>
        <div *ngIf="!loadedParts().jobsThisMonth" class="flex flex-row">aufträge laden</div>
        <div *ngIf="loadedParts().jobsThisMonth">aufträge geladen<i class="bi bi-check"></i></div>
        <div *ngIf="!loadedParts().clients" class="flex flex-row">kund:innen laden</div>
        <div *ngIf="loadedParts().clients">kund:innen geladen<i class="bi bi-check"></i></div>
        <div *ngIf="!loadedParts().locations" class="flex flex-row">orte laden</div>
        <div *ngIf="loadedParts().locations">orte geladen<i class="bi bi-check"></i></div>
      </div>

      <div style="max-width: 80vw" *ngIf="!backendIP()">
        <span><i class="bi bi-exclamation-triangle big fex-accent"></i></span>
        <h2>keine backendadresse festgelegt!</h2>
        <h2>bitte lege in den <a (click)="openSettings()">einstellungen</a> fest, mit welchem server sich das
          dispogramm
          verbinden soll</h2>
      </div>

      <div style="max-width: 80vw" *ngIf="apiKeysMissing">
        <span><i class="bi bi-exclamation-triangle big fex-accent"></i></span>
        <h2>es fehlen api keys</h2>
        <h4 class="italic">bitte lege diese in den <a (click)="openSettings(3, true)">einstellungen</a> fest</h4>
      </div>

      <div style="max-width: 80vw" *ngIf="cantConnect()">
        <span><i class="bi bi-exclamation-triangle big fex-accent"></i></span>
        <h2>verbindung fehlgeschlagen!</h2>
        <h2>stelle bitte sicher, dass:</h2>
        <ul style="font-size: 20px">
          <li>der weiße raspberrypi mit internet und strom verbunden ist</li>
          <li>die richtige backend-adresse in den <a (click)="openSettings(0, true)">einstellungen</a> festgelegt ist
          </li>
        </ul>
      </div>

      <div class="absolute flex flex-column w-100" style="bottom: 20px; text-align: center">
          <span *ngIf="startedCounting && !timeout && !apiKeysMissing && !cantConnect()" style="color: gray">etwas scheint
            nicht in ordnung zu sein...timeout
            in {{secondCounter}}</span>
        <span style="color: gray; text-align: center">
            <i>v{{version}}</i>
          </span>
      </div>

    </div>

  `,
  styles: [`
    .emoji {
      font-size: 26px;
    }

    .features > p {
      margin: unset;
    }
  `
  ]
})
export class LoadingComponent implements OnInit {
  firstCounter = 10;
  secondCounter = 10;
  startedCounting = false;
  timeout = false;

  get version() {
    return GC.version
  };

  get apiKeysMissing() {
    return GC.apiKeyMissing
  }

  constructor(
    private route: ActivatedRoute,
    private location: Location,
  ) {
    GC.partLoaded.subscribe(() => {
      this.firstCounter = 10;
    })

    if (!GC.fullyLoaded) {
      let count1 = () => {
        if (this.firstCounter > 0) {
          setTimeout(() => {
            this.firstCounter--;
            count1();
          }, 1000)
        } else {
          this.startedCounting = true;
          count2();
        }
      }

      let count2 = () => {
        if (this.secondCounter > 0) {
          setTimeout(() => {
            this.secondCounter--;
            count2();
          }, 1000)
        } else {
          this.timeout = true;
        }
      }

      count1();
    }
  }

  ngOnInit(): void {
    GC.loaded().subscribe(() => {
      if (this.location.path() === '') {
        GC.router.navigate([GC.routes.tourplan]);
      }
    })
  }

  progess = () => {
    return GC.loadingProgress
  };

  backendIP = () => {
    return GC.backendIP
  };

  cantConnect = () => {
    return (GC.cantConnect || this.timeout) && !this.apiKeysMissing;
  };

  loadedParts = () => {
    return GC.loadedParts
  };

  openSettings(index?: number, reload?: boolean): void {
    GC.dialog.open(ConfigDialogComponent, {
      data: {
        pageIndex: index || 0,
        reloadPage: reload
      }
    });
  }
}
