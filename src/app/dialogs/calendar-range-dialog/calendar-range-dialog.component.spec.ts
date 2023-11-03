import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CalendarRangeDialogComponent } from './calendar-range-dialog.component';

describe('CalendarRangeDialogComponent', () => {
  let component: CalendarRangeDialogComponent;
  let fixture: ComponentFixture<CalendarRangeDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CalendarRangeDialogComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CalendarRangeDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
