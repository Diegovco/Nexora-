import { ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  IonPopover,
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
  notificationsOutline,
  personOutline,
  logOutOutline,
  ellipsisVertical,
  searchOutline,
  homeOutline,
  gridOutline,
  receiptOutline,
  alertCircleOutline
} from 'ionicons/icons';
import { RecursosService } from '../../services/recursos.service';

/** Forma del recurso que devuelve la API de la carpeta API/ (Flask). */
interface RecursoBase {
  codigo: string;
  nombre: string;
  categoria: string;
  ubicacion: string;
  estado: string;
  cantidad: number;
  descripcion: string;
}

export interface RecursoCatalogo extends RecursoBase {
  _id?: string;
}

@Component({
  selector: 'app-catalogo',
  templateUrl: './catalogo.page.html',
  styleUrls: ['./catalogo.page.scss'],
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
    IonIcon,
    IonPopover
  ]
})
export class CatalogoPage implements OnInit {
  private apiUrl = 'http://localhost:5000';
  todosLosRecursos: RecursoCatalogo[] = [];
  recursos: RecursoCatalogo[] = [];
  texto = '';
  categoria = 'Todos';
  categorias = ['Todos', 'Laboratorio', 'Libro', 'Equipo AV'];

  constructor(
    private recursosService: RecursosService,
    private http: HttpClient,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {
    addIcons({
      notificationsOutline,
      personOutline,
      logOutOutline,
      ellipsisVertical,
      searchOutline,
      homeOutline,
      gridOutline,
      receiptOutline,
      alertCircleOutline
    });
  }

  ngOnInit() {
    this.cargarDesdeBD();
  }

  ionViewWillEnter() {
    this.cargarDesdeBD();
  }

  private extraerId(rawId: any): string {
    if (!rawId) return '';
    if (typeof rawId === 'object' && rawId.$oid) return String(rawId.$oid).trim();
    return String(rawId).trim();
  }

  private normalizarCategoria(rawCat: string, codigo: string): string {
    const c = (rawCat || '').toLowerCase().trim();
    const cod = (codigo || '').toUpperCase().trim();

    if (c.includes('lab') || cod.startsWith('LAB')) return 'Laboratorio';
    if (c.includes('libro') || cod.startsWith('LIB')) return 'Libro';
    if (c.includes('equipo') || c.includes('av') || c.includes('audio') || cod.startsWith('AV') || cod.startsWith('EQ')) {
      return 'Equipo AV';
    }
    return rawCat.trim();
  }

  cargarDesdeBD() {
    forkJoin({
      recursosResp: this.http.get<any>(`${this.apiUrl}/getRecursos?t=${Date.now()}`).pipe(
        catchError(() => of({ Respuesta: [] }))
      ),
      reservasResp: this.http.get<any>(`${this.apiUrl}/getReservas?t=${Date.now()}`).pipe(
        catchError(() => of({ Respuesta: [] }))
      )
    }).subscribe(({ recursosResp, reservasResp }) => {
      this.zone.run(() => {
        const lista = Array.isArray(recursosResp) ? recursosResp : (recursosResp?.Respuesta || []);
        const reservasCrudas: any[] = Array.isArray(reservasResp) ? reservasResp : (reservasResp?.Respuesta || []);

        const reservasActivas = reservasCrudas.filter((r: any) => {
          const est = String(r.estado || r.strestado || '').trim().toLowerCase();
          return est === 'pendiente' || est === 'aprobada';
        });

        this.todosLosRecursos = lista.map((item: any) => {
          const id = this.extraerId(item._id);
          const codigo = String(item.codigo || item.strcodigo || '').trim();
          const rawCantidad = item.cantidad ?? item.intcantidad;
          const cantidadTotal = rawCantidad !== undefined && rawCantidad !== null ? Number(rawCantidad) : 1;

          const vecesReservado = reservasActivas.filter((r: any) => {
            const codRes = String(r.codigoRecurso || r.codigo || r.strcodigo || '').trim().toLowerCase();
            const idRes = this.extraerId(r.recursoId || r.recurso_id);
            return (
              (codigo !== '' && codRes === codigo.toLowerCase()) ||
              (id !== '' && idRes === id)
            );
          }).length;

          const disponiblesReales = Math.max(0, cantidadTotal - vecesReservado);
          const estadoRaw = String(item.estado || item.strestado || '').trim().toLowerCase();

          let estado = 'Disponible';
          if (estadoRaw === 'mantenimiento') {
            estado = 'Mantenimiento';
          } else if (disponiblesReales <= 0) {
            estado = 'Ocupado';
          } else {
            estado = 'Disponible';
          }

          return {
            _id: id,
            codigo,
            nombre: String(item.nombre || item.strnombre || 'Recurso sin nombre').trim(),
            categoria: this.normalizarCategoria(String(item.categoria || item.strcategoria || ''), codigo),
            ubicacion: String(item.ubicacion || item.strubicacion || 'Campus UTC').trim(),
            estado,
            cantidad: disponiblesReales,
            descripcion: String(item.descripcion || item.strdescripcion || '').trim()
          };
        });

        this.filtrar();
        this.cdr.detectChanges();
      });
    });
  }

  filtrar() {
    const buscado = this.texto.trim().toLowerCase();
    this.recursos = this.todosLosRecursos.filter((r) => {
      const coincideTexto =
        !buscado ||
        r.nombre.toLowerCase().includes(buscado) ||
        r.codigo.toLowerCase().includes(buscado) ||
        r.ubicacion.toLowerCase().includes(buscado);

      const coincideCategoria =
        this.categoria === 'Todos' ||
        r.categoria.toLowerCase() === this.categoria.toLowerCase();

      return coincideTexto && coincideCategoria;
    });
  }

  elegirCategoria(c: string) {
    this.categoria = c;
    this.filtrar();
  }

  claseEstado(estado: string): string {
    return this.recursosService.claseEstado(estado);
  }

  reservar(r: RecursoCatalogo) {
    this.router.navigate(['/nueva-reserva'], {
      queryParams: {
        id: r._id || '',
        codigo: r.codigo
      }
    });
  }

  cerrarSesion() {
    localStorage.removeItem('nexora_active_user');
    localStorage.removeItem('usuarioNexora');
    this.router.navigateByUrl('/login');
  }
}