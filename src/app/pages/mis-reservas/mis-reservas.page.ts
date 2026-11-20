import { ChangeDetectorRef, Component, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IonHeader, IonToolbar, IonContent, IonFooter, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { homeOutline, gridOutline, receiptOutline, personOutline, searchOutline } from 'ionicons/icons';

@Component({
  selector: 'app-mis-reservas',
  templateUrl: './mis-reservas.page.html',
  styleUrls: ['./mis-reservas.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    RouterLinkActive,
    IonHeader,
    IonToolbar,
    IonContent,
    IonFooter,
    IonIcon
  ]
})
export class MisReservasPage {
  private apiUrl = 'http://localhost:5000';
  matricula = '';
  reservas: any[] = [];
  busquedaRealizada = false;
  cargando = false;

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {
    addIcons({ homeOutline, gridOutline, receiptOutline, personOutline, searchOutline });
  }

  ionViewWillEnter() {
    if (this.matricula.trim()) {
      this.buscarPorMatricula();
    }
  }

  buscarPorMatricula() {
    const mat = this.matricula.trim();
    if (!mat) {
      alert('Ingresa tu matrícula para consultar tus reservas.');
      return;
    }

    this.cargando = true;
    this.busquedaRealizada = true;

    this.http.get<any>(`${this.apiUrl}/getReservas/matricula/${encodeURIComponent(mat)}`).subscribe({
      next: (resp) => {
        this.zone.run(() => {
          const lista = Array.isArray(resp) ? resp : (resp?.Respuesta || []);
          this.reservas = lista;
          this.cargando = false;
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        console.error('Error al consultar reservas por matrícula:', err);
        this.zone.run(() => {
          this.reservas = [];
          this.cargando = false;
          this.cdr.detectChanges();
        });
      }
    });
  }

  cambiarEstado(r: any, estado: string) {
    this.http.put(`${this.apiUrl}/reservas/${r._id}`, { estado }).subscribe({
      next: () => this.buscarPorMatricula(),
      error: () => alert('No se pudo actualizar el estado de la reserva.')
    });
  }
}