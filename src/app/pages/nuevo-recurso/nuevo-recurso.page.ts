import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonFooter, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { chevronBackOutline, qrCodeOutline } from 'ionicons/icons';
import { RecursosService } from '../../services/recursos.service';

@Component({
  selector: 'app-nuevo-recurso',
  templateUrl: './nuevo-recurso.page.html',
  styleUrls: ['./nuevo-recurso.page.scss'],
  standalone: true,
  imports: [IonContent, IonFooter, IonIcon, FormsModule]
})
export class NuevoRecursoPage implements OnInit {
  private apiUrl = 'http://localhost:5000';
  recursoId = '';
  editando = false;
  codigoVista = '';

  nombre = '';
  categoria = 'Equipo AV';
  ubicacion = 'Almacén AV';
  cantidad = 1;
  descripcion = '';

  categorias = ['Laboratorio', 'Libro', 'Equipo AV'];
  ubicaciones = ['Almacén AV', 'Biblioteca', 'Edificio B', 'Edificio C'];

  constructor(
    private recursosService: RecursosService,
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient
  ) {
    addIcons({ chevronBackOutline, qrCodeOutline });
  }

  ngOnInit() {
    const id = this.route.snapshot.queryParamMap.get('id');
    const codigo = this.route.snapshot.queryParamMap.get('codigo');

    if (id || codigo) {
      this.http.get<any>(`${this.apiUrl}/getRecursos`).subscribe({
        next: (resp) => {
          const lista = Array.isArray(resp) ? resp : (resp?.Respuesta || []);
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
          }
        }
      });
      return;
    }

    this.codigoVista = this.recursosService.generarCodigo(this.categoria);
  }

  elegirCategoria(c: string) {
    this.categoria = c;
    if (!this.editando) {
      this.codigoVista = this.recursosService.generarCodigo(c);
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
      estado: 'Disponible',
      cantidad: this.cantidad,
      descripcion: this.descripcion
    };

    if (this.editando) {
      const identificador = this.recursoId || this.codigoVista;
      this.http.put(`${this.apiUrl}/recursos/${encodeURIComponent(identificador)}`, datosRecurso).subscribe({
        next: () => {
          alert('Recurso actualizado');
          this.router.navigateByUrl('/admin-recursos');
        },
        error: () => {
          alert('Error al actualizar el recurso en la base de datos.');
        }
      });
    } else {
      this.http.post(`${this.apiUrl}/recursos`, datosRecurso).subscribe({
        next: () => {
          alert('Recurso guardado con el código ' + this.codigoVista);
          this.router.navigateByUrl('/admin-recursos');
        },
        error: () => {
          alert('Error al guardar el recurso en la base de datos.');
        }
      });
    }
  }

  cancelar() {
    this.router.navigateByUrl('/admin-recursos');
  }
}