import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DetalleRecursoPage } from './detalle-recurso.page';

describe('DetalleRecursoPage', () => {
  let component: DetalleRecursoPage;
  let fixture: ComponentFixture<DetalleRecursoPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(DetalleRecursoPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
