import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';

import { NuevaReservaPage } from './nueva-reserva.page';

describe('NuevaReservaPage', () => {
  let component: NuevaReservaPage;
  let fixture: ComponentFixture<NuevaReservaPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(NuevaReservaPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
