import { ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { IonContent, IonFooter, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  addOutline,
  homeOutline,
  addCircleOutline,
  documentTextOutline,
  checkmarkDoneOutline,
  cubeOutline,
  scanOutline,
  qrCodeOutline,
  imageOutline
} from 'ionicons/icons';
import { EtiquetaQrService } from '../../services/etiqueta-qr.service';
import { RecursosService, Recurso } from '../../services/recursos.service';
import { environment } from '../../../environments/environment';

export interface RecursoMongo extends Recurso {
  _id?: string;
  foto?: string;
}

@Component({
  selector: 'app-admin-recursos',
  templateUrl: './admin-recursos.page.html',
  styleUrls: ['./admin-recursos.page.scss'],
  standalone: true,
  imports: [IonContent, IonFooter, IonIcon, FormsModule, RouterLink, RouterLinkActive]
})
export class AdminRecursosPage {
  private apiUrl = environment.apiUrl;
  todosLosRecursos: RecursoMongo[] = [];
  recursos: RecursoMongo[] = [];
  texto = '';
  categoria = 'Todos';
  categorias = ['Todos', 'Laboratorio', 'Libro', 'Equipo AV'];

  constructor(
    private recursosService: RecursosService,
    private router: Router,
    private http: HttpClient,
    // La app no usa zone.js: hay que avisar a Angular cuando llegan datos de la API.
    private cdr: ChangeDetectorRef,
    private etiquetaQrService: EtiquetaQrService
  ) {
    addIcons({
      addOutline,
      homeOutline,
      addCircleOutline,
      documentTextOutline,
      checkmarkDoneOutline,
      cubeOutline,
      scanOutline,
      qrCodeOutline,
      imageOutline
    });
  }

  // Se ejecuta cada vez que entras a la pantalla (también al regresar de "Nuevo recurso")
  ionViewWillEnter() {
    this.cargarDesdeBD();
  }

  cargarDesdeBD() {
    this.http.get<any>(`${this.apiUrl}/getRecursos`).subscribe({
      next: (resp) => {
        const lista = Array.isArray(resp) ? resp : (resp?.Respuesta || []);
        this.todosLosRecursos = lista.map((item: any) => ({
          _id: item._id,
          codigo: item.codigo || item.strcodigo || '',
          nombre: item.nombre || item.strnombre || '',
          categoria: item.categoria || item.strcategoria || '',
          ubicacion: item.ubicacion || item.strubicacion || '',
          estado: item.estado || item.strestado || 'Disponible',
          cantidad: Number(item.cantidad) || 1,
          foto: item.foto || '',
          descripcion: item.descripcion || item.strdescripcion || ''
        }));
        this.filtrar();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al consultar recursos en MongoDB:', err);
        this.todosLosRecursos = [];
        this.recursos = [];
        this.cdr.detectChanges();
      }
    });
  }

  filtrar() {
    const buscado = this.texto.toLowerCase();
    const resultado: RecursoMongo[] = [];

    for (let i = 0; i < this.todosLosRecursos.length; i++) {
      const r = this.todosLosRecursos[i];
      const coincideTexto = r.nombre.toLowerCase().includes(buscado) || r.codigo.toLowerCase().includes(buscado);
      const coincideCategoria = this.categoria === 'Todos' || r.categoria === this.categoria;
      if (coincideTexto && coincideCategoria) {
        resultado.push(r);
      }
    }
    this.recursos = resultado;
  }

  elegirCategoria(c: string) {
    this.categoria = c;
    this.filtrar();
  }

  editar(r: RecursoMongo) {
    this.router.navigate(['/nuevo-recurso'], {
      queryParams: {
        id: r._id || '',
        codigo: r.codigo
      }
    });
  }

  eliminar(r: RecursoMongo) {
    if (r.estado === 'Prestado') { return; }
    if (confirm('¿Seguro que quieres eliminar "' + r.nombre + '"?')) {
      const identificador = r._id || r.codigo;
      this.http.delete(`${this.apiUrl}/recursos/${encodeURIComponent(identificador)}`).subscribe({
        next: () => {
          this.cargarDesdeBD();
        },
        error: () => {
          alert('Error al eliminar el recurso en la base de datos.');
        }
      });
    }
  }

  // Genera de nuevo la etiqueta QR del recurso para imprimirla otra vez
  async descargarQr(r: RecursoMongo) {
    try {
      const etiqueta = await this.etiquetaQrService.generarEtiqueta(r.codigo, r.nombre);
      await this.etiquetaQrService.guardarOCompartir(etiqueta, r.codigo);
    } catch {
      alert('No se pudo generar la etiqueta QR.');
    }
  }

  claseEstado(estado: string): string {
    return this.recursosService.claseEstado(estado);
  }
}