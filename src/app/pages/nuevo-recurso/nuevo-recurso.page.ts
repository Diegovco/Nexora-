import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonFooter, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  cameraOutline,
  chevronBackOutline,
  closeOutline,
  downloadOutline,
  imagesOutline,
  qrCodeOutline,
} from 'ionicons/icons';
import { EtiquetaQrService } from '../../services/etiqueta-qr.service';
import { FotoService } from '../../services/foto.service';
import { RecursosService } from '../../services/recursos.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-nuevo-recurso',
  templateUrl: './nuevo-recurso.page.html',
  styleUrls: ['./nuevo-recurso.page.scss'],
  standalone: true,
  imports: [IonContent, IonFooter, IonIcon, FormsModule]
})
export class NuevoRecursoPage implements OnInit {
  private apiUrl = environment.apiUrl;
  recursoId = '';
  editando = false;
  codigoVista = '';

  nombre = '';
  categoria = 'Equipo AV';
  ubicacion = 'Almacén AV';
  cantidad = 1;
  descripcion = '';
  // Al editar se conserva el estado actual (Prestado, Mantenimiento...)
  estado = 'Disponible';

  foto = '';         // Foto del recurso (texto base64), vacía si no tiene
  etiquetaQr = '';   // Imagen de la etiqueta QR para imprimir
  guardado = false;  // true cuando ya se guardó y se muestra el QR
  guardando = false;

  // Recursos que ya existen en la base de datos (para no repetir códigos)
  recursosBD: any[] = [];

  categorias = ['Laboratorio', 'Libro', 'Equipo AV'];
  ubicaciones = ['Almacén AV', 'Biblioteca', 'Edificio B', 'Edificio C'];

  constructor(
    private recursosService: RecursosService,
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient,
    // La app no usa zone.js: hay que avisar a Angular cuando llegan datos de la API.
    private cdr: ChangeDetectorRef,
    private etiquetaQrService: EtiquetaQrService,
    private fotoService: FotoService
  ) {
    addIcons({ cameraOutline, chevronBackOutline, closeOutline, downloadOutline, imagesOutline, qrCodeOutline });
  }

  ngOnInit() {
    const id = this.route.snapshot.queryParamMap.get('id');
    const codigo = this.route.snapshot.queryParamMap.get('codigo');

    this.http.get<any>(`${this.apiUrl}/getRecursos`).subscribe({
      next: (resp) => {
        const lista = Array.isArray(resp) ? resp : (resp?.Respuesta || []);
        this.recursosBD = lista;

        if (id || codigo) {
          const r = lista.find((item: any) =>
            (id && item._id === id) || (codigo && item.codigo === codigo)
          );
          if (r) {
            this.editando = true;
            this.recursoId = r._id || '';
            this.codigoVista = r.codigo;
            this.nombre = r.nombre;
            this.categoria = r.categoria;
            this.ubicacion = r.ubicacion;
            this.cantidad = r.cantidad || 1;
            this.descripcion = r.descripcion || '';
            this.estado = r.estado || 'Disponible';
            this.foto = r.foto || '';
            this.cdr.detectChanges();
            // Al editar se muestra su QR para poder reimprimirlo
            this.mostrarQr();
            return;
          }
        }

        // Recurso nuevo: el código sigue al mayor que ya existe en la base de datos
        this.codigoVista = this.recursosService.generarCodigo(this.categoria, this.recursosBD);
        this.cdr.detectChanges();
      },
      error: () => {
        this.codigoVista = this.recursosService.generarCodigo(this.categoria);
        this.cdr.detectChanges();
      }
    });
  }

  elegirCategoria(c: string) {
    this.categoria = c;
    if (!this.editando) {
      this.codigoVista = this.recursosService.generarCodigo(c, this.recursosBD);
    }
  }

  guardar() {
    if (this.nombre.trim() === '') {
      alert('Escribe el nombre del recurso');
      return;
    }
    if (this.cantidad < 1) {
      alert('La cantidad debe ser al menos 1');
      return;
    }

    const datosRecurso = {
      codigo: this.codigoVista,
      nombre: this.nombre.trim(),
      categoria: this.categoria,
      ubicacion: this.ubicacion,
      estado: this.estado,
      cantidad: this.cantidad,
      descripcion: this.descripcion,
      foto: this.foto
    };

    this.guardando = true;

    if (this.editando) {
      const identificador = this.recursoId || this.codigoVista;
      this.http.put(`${this.apiUrl}/recursos/${encodeURIComponent(identificador)}`, datosRecurso).subscribe({
        next: () => {
          this.guardando = false;
          alert('Recurso actualizado');
          this.router.navigateByUrl('/admin-recursos');
        },
        error: () => {
          this.guardando = false;
          this.cdr.detectChanges();
          alert('Error al actualizar el recurso en la base de datos.');
        }
      });
    } else {
      this.http.post(`${this.apiUrl}/recursos`, datosRecurso).subscribe({
        next: () => {
          // Ya se guardó: se muestra su etiqueta QR para imprimirla
          this.guardando = false;
          this.guardado = true;
          this.mostrarQr();
        },
        error: () => {
          this.guardando = false;
          this.cdr.detectChanges();
          alert('Error al guardar el recurso en la base de datos.');
        }
      });
    }
  }

  cancelar() {
    this.router.navigateByUrl('/admin-recursos');
  }

  // ---------- Foto ----------
  async tomarFoto() {
    const nueva = await this.fotoService.tomarFoto();
    if (nueva) {
      this.foto = nueva;
      this.cdr.detectChanges();
    }
  }

  async elegirFoto() {
    const nueva = await this.fotoService.elegirDeGaleria();
    if (nueva) {
      this.foto = nueva;
      this.cdr.detectChanges();
    }
  }

  quitarFoto() {
    this.foto = '';
  }

  // ---------- Etiqueta QR ----------
  async mostrarQr() {
    this.etiquetaQr = await this.etiquetaQrService.generarEtiqueta(this.codigoVista, this.nombre.trim());
    this.cdr.detectChanges();
    if (this.guardado) {
      // Baja la pantalla hasta la etiqueta para que se vea al guardar
      setTimeout(() => {
        const etiqueta = document.querySelector('.nx-tarjeta.etiqueta');
        if (etiqueta) {
          etiqueta.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  }

  async descargarQr() {
    try {
      await this.etiquetaQrService.guardarOCompartir(this.etiquetaQr, this.codigoVista);
    } catch {
      alert('No se pudo guardar la etiqueta QR.');
    }
  }

  // Limpia el formulario para registrar otro recurso
  nuevoOtro() {
    this.recursosBD.push({ codigo: this.codigoVista });
    this.guardado = false;
    this.etiquetaQr = '';
    this.nombre = '';
    this.cantidad = 1;
    this.descripcion = '';
    this.foto = '';
    this.codigoVista = this.recursosService.generarCodigo(this.categoria, this.recursosBD);
  }
}