import { ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IonHeader, IonToolbar, IonButtons, IonButton, IonContent, IonFooter, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  notificationsOutline,
  searchOutline,
  homeOutline,
  gridOutline,
  scanCircleOutline,
  alertCircleOutline
} from 'ionicons/icons';
import { RecursosService, Recurso } from '../../services/recursos.service';

export interface RecursoCatalogo extends Recurso {
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
    IonIcon
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
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {
    addIcons({
      notificationsOutline,
      searchOutline,
      homeOutline,
      gridOutline,
      scanCircleOutline,
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
    this.http.get<any>(`${this.apiUrl}/getRecursos`).subscribe({
      next: (resp) => {
        this.zone.run(() => {
          const lista = Array.isArray(resp) ? resp : (resp?.Respuesta || []);

          this.todosLosRecursos = lista.map((item: any) => {
            const codigo = String(item.codigo || item.strcodigo || '').trim();
            const rawCantidad = item.cantidad ?? item.intcantidad;
            const cantidad = rawCantidad !== undefined && rawCantidad !== null ? Number(rawCantidad) : 1;

            const estadoRaw = String(item.estado || item.strestado || '').trim();
            const estado = estadoRaw || (cantidad > 0 ? 'Disponible' : 'No disponible');

            return {
              _id: this.extraerId(item._id),
              codigo,
              nombre: String(item.nombre || item.strnombre || 'Recurso sin nombre').trim(),
              categoria: this.normalizarCategoria(String(item.categoria || item.strcategoria || ''), codigo),
              ubicacion: String(item.ubicacion || item.strubicacion || 'Campus UTC').trim(),
              estado,
              cantidad,
              descripcion: String(item.descripcion || item.strdescripcion || '').trim()
            };
          });

          this.filtrar();
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        console.error('Error al cargar catálogo desde MongoDB:', err);
        this.zone.run(() => {
          this.todosLosRecursos = [];
          this.recursos = [];
          this.cdr.detectChanges();
        });
      }
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
}