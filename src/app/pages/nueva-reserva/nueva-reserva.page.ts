import { ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonButton,
  IonContent,
  IonFooter,
  IonIcon
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  chevronBackOutline,
  homeOutline,
  gridOutline,
  receiptOutline,
  personOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-nueva-reserva',
  templateUrl: './nueva-reserva.page.html',
  styleUrls: ['./nueva-reserva.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    RouterLinkActive,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonButton,
    IonContent,
    IonFooter,
    IonIcon
  ]
})
export class NuevaReservaPage implements OnInit {
  private apiUrl = 'http://localhost:5000';

  recurso: any = {
    _id: '',
    codigo: '',
    nombre: '',
    categoria: '',
    ubicacion: '',
    estado: 'Disponible'
  };

  solicitante = '';
  fecha = '';
  horaInicio = '';
  horaFin = '';
  motivo = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {
    addIcons({
      chevronBackOutline,
      homeOutline,
      gridOutline,
      receiptOutline,
      personOutline
    });
  }

  ngOnInit() {
    this.route.queryParamMap.subscribe((params) => {
      const id = params.get('id');
      const codigo = params.get('codigo');
      if (id || codigo) {
        this.cargarRecurso(id, codigo);
      }
    });
  }

  cargarRecurso(id: string | null, codigo: string | null) {
    this.http.get<any>(`${this.apiUrl}/getRecursos`).subscribe({
      next: (resp) => {
        this.zone.run(() => {
          const lista = Array.isArray(resp) ? resp : (resp?.Respuesta || []);
          const encontrado = lista.find((item: any) =>
            (id && String(item._id) === String(id)) ||
            (codigo && String(item.codigo || item.strcodigo) === String(codigo))
          );

          if (encontrado) {
            this.recurso = {
              _id: encontrado._id || '',
              codigo: encontrado.codigo || encontrado.strcodigo || '',
              nombre: encontrado.nombre || encontrado.strnombre || '',
              categoria: encontrado.categoria || encontrado.strcategoria || '',
              ubicacion: encontrado.ubicacion || encontrado.strubicacion || '',
              estado: encontrado.estado || encontrado.strestado || 'Disponible'
            };
          }
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        console.error('Error al cargar el recurso:', err);
      }
    });
  }

  confirmarReserva() {
    if (!this.solicitante.trim() || !this.fecha || !this.horaInicio || !this.horaFin) {
      alert('Completa solicitante, fecha y horario de la reserva.');
      return;
    }

    const nuevaReserva = {
      recursoId: this.recurso._id,
      codigoRecurso: this.recurso.codigo,
      nombreRecurso: this.recurso.nombre,
      ubicacion: this.recurso.ubicacion,
      solicitante: this.solicitante.trim(),
      fecha: this.fecha,
      horaInicio: this.horaInicio,
      horaFin: this.horaFin,
      motivo: this.motivo.trim(),
      estado: 'Pendiente'
    };

    this.http.post(`${this.apiUrl}/reservas`, nuevaReserva).subscribe({
      next: () => {
        alert('Solicitud de reserva enviada para ' + this.recurso.nombre);
        this.router.navigateByUrl('/mis-reservas');
      },
      error: () => {
        alert('Error al registrar la reserva. Verifica que el endpoint POST /reservas exista en Flask.');
      }
    });
  }

  cancelar() {
    this.router.navigateByUrl('/inicio');
  }
}