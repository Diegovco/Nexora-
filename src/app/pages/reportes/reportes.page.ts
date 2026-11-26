import { ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IonHeader, IonToolbar, IonContent, IonFooter, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { homeOutline, gridOutline, scanCircleOutline, scanOutline, alertCircleOutline, addCircleOutline, documentTextOutline, folderOpenOutline, checkmarkDoneOutline, sendOutline, refreshOutline, cubeOutline, receiptOutline } from 'ionicons/icons';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-reportes',
  templateUrl: './reportes.page.html',
  styleUrls: ['./reportes.page.scss'],
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
export class ReportesPage implements OnInit {
  private apiUrl = environment.apiUrl;

  esAdmin = false;
  usuarioNombre = '';
  usuarioCorreo = '';
  usuarioMatricula = '';

  // Campos del formulario para usuario
  tipoEquipo = 'Equipo AV';
  nombreEquipo = '';
  descripcion = '';
  enviando = false;

  // Listado para administrativo
  todosLosReportes: any[] = [];
  reportesFiltrados: any[] = [];
  filtroTexto = '';
  cargando = false;

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {
    addIcons({ homeOutline, gridOutline, scanCircleOutline, scanOutline, alertCircleOutline, addCircleOutline, documentTextOutline, folderOpenOutline, checkmarkDoneOutline, sendOutline, refreshOutline, cubeOutline, receiptOutline });
  }

  ngOnInit() {
    this.detectarUsuario();
  }

  ionViewWillEnter() {
    this.detectarUsuario();
  }

  detectarUsuario() {
    const raw = localStorage.getItem('nexora_active_user') || localStorage.getItem('usuarioNexora');
    if (raw) {
      try {
        const datos = JSON.parse(raw);
        this.usuarioNombre = String(datos.strnombre || datos.nombre || '').trim();
        this.usuarioCorreo = String(datos.strcorreoUsuario || datos.correo || datos.email || '').trim();
        this.usuarioMatricula = String(datos.strmatricula || datos.matricula || '').trim();
        const rol = String(datos.strrol || datos.rol || '').trim();

        this.esAdmin = rol === 'Administrativo';
      } catch {}
    }

    if (this.esAdmin) {
      this.cargarReportes();
    }
  }

  private extraerId(rawId: any): string {
    if (!rawId) return '';
    if (typeof rawId === 'object' && rawId.$oid) return String(rawId.$oid).trim();
    return String(rawId).trim();
  }

  enviarReporte() {
    if (!this.nombreEquipo.trim()) {
      alert('Escribe el nombre del equipo.');
      return;
    }
    if (!this.descripcion.trim()) {
      alert('Escribe una descripción del caso.');
      return;
    }

    const ahora = new Date();
    const fechaFormateada = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')} ${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;

    const payload = {
      tipoEquipo: this.tipoEquipo,
      nombreEquipo: this.nombreEquipo.trim(),
      descripcion: this.descripcion.trim(),
      usuario: this.usuarioNombre || this.usuarioCorreo || 'Usuario',
      correo: this.usuarioCorreo,
      matricula: this.usuarioMatricula,
      fecha: fechaFormateada,
      estado: 'Pendiente'
    };

    this.enviando = true;
    this.http.post(`${this.apiUrl}/reportes`, payload).subscribe({
      next: () => {
        this.zone.run(() => {
          alert('Reporte enviado correctamente.');
          this.tipoEquipo = 'Equipo AV';
          this.nombreEquipo = '';
          this.descripcion = '';
          this.enviando = false;
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        console.error('Error al enviar reporte:', err);
        this.zone.run(() => {
          this.enviando = false;
          alert('No se pudo enviar el reporte en este momento.');
          this.cdr.detectChanges();
        });
      }
    });
  }

  cargarReportes() {
    this.cargando = true;
    this.http.get<any>(`${this.apiUrl}/getReportes?t=${Date.now()}`).subscribe({
      next: (resp) => {
        this.zone.run(() => {
          const crudas: any[] = Array.isArray(resp) ? resp : (resp?.Respuesta || []);

          const normalizados = crudas.map((r: any, idx: number) => ({
            _id: this.extraerId(r._id),
            tipoEquipo: String(r.tipoEquipo || r.categoria || 'Equipo').trim(),
            nombreEquipo: String(r.nombreEquipo || r.nombre || 'Sin nombre').trim(),
            descripcion: String(r.descripcion || '').trim(),
            usuario: String(r.usuario || r.correo || 'Usuario').trim(),
            matricula: String(r.matricula || '').trim(),
            fecha: String(r.fecha || '').trim(),
            estado: String(r.estado || 'Pendiente').trim(),
            ordenOriginal: idx
          }));

          // Mostrar primero los pendientes y del más reciente al más antiguo
          normalizados.sort((a, b) => {
            const pendA = a.estado.toLowerCase() === 'pendiente' ? 0 : 1;
            const pendB = b.estado.toLowerCase() === 'pendiente' ? 0 : 1;
            if (pendA !== pendB) return pendA - pendB;
            const cmpFecha = b.fecha.localeCompare(a.fecha);
            return cmpFecha !== 0 ? cmpFecha : b.ordenOriginal - a.ordenOriginal;
          });

          this.todosLosReportes = normalizados;
          this.aplicarFiltro();
          this.cargando = false;
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        console.error('Error al cargar reportes:', err);
        this.zone.run(() => {
          this.todosLosReportes = [];
          this.reportesFiltrados = [];
          this.cargando = false;
          this.cdr.detectChanges();
        });
      }
    });
  }

  aplicarFiltro() {
    const q = this.filtroTexto.trim().toLowerCase();
    if (!q) {
      this.reportesFiltrados = [...this.todosLosReportes];
      return;
    }

    this.reportesFiltrados = this.todosLosReportes.filter((rep) =>
      rep.tipoEquipo.toLowerCase().includes(q) ||
      rep.nombreEquipo.toLowerCase().includes(q) ||
      rep.descripcion.toLowerCase().includes(q) ||
      rep.usuario.toLowerCase().includes(q) ||
      rep.matricula.toLowerCase().includes(q) ||
      rep.estado.toLowerCase().includes(q)
    );
  }

  marcarResuelto(rep: any) {
    const idReal = this.extraerId(rep._id);
    if (!idReal) return;

    this.http.put(`${this.apiUrl}/reportes/${encodeURIComponent(idReal)}`, { estado: 'Resuelto' }).subscribe({
      next: () => {
        this.zone.run(() => {
          rep.estado = 'Resuelto';
          this.aplicarFiltro();
          this.cdr.detectChanges();
        });
      },
      error: () => alert('No se pudo actualizar el estado del reporte.')
    });
  }
}