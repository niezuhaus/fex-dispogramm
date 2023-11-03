import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WeekplanComponent } from './weekplan.component';

describe('WeekplanComponent', () => {
  let component: WeekplanComponent;
  let fixture: ComponentFixture<WeekplanComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ WeekplanComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WeekplanComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
