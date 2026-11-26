import type { OnInit} from '@angular/core';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonFooter, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { chevronBackOutline, qrCodeOutline } from 'ionicons/icons';

import type { CategoriaRecurso, Horario } from '../../models/computo.model';
import { mensajeDeError } from '../../services/api-errores';
import { RecursosService } from '../../services/recursos.service';

const HORARIO_PREDETERMINADO: Horario = { inicio: '07:00', fin: '20:00', duracionBloque: 60 };

@Component({
  selector: 'app-nuevo-recurso',
  templateUrl: './nuevo-recurso.page.html',
  styleUrls: ['./nuevo-recurso.page.scss'],
  standalone: true,
  imports: [IonContent, IonFooter, IonIcon, FormsModule],
})
export class NuevoRecursoPage implements OnInit {
  editando = false;
  guardando = false;
  codigoVista = '';

  nombre = '';
  categoria: CategoriaRecurso = 'Equipo AV';
  ubicacion = 'Almacén AV';
  cantidad = 1;
  descripcion = '';

  categorias: CategoriaRecurso[] = ['Laboratorio', 'Libro', 'Equipo AV'];
  ubicaciones = ['Almacén AV', 'Biblioteca', 'Edificio B', 'Edificio C'];

  private readonly recursosService = inject(RecursosService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  constructor() {
    addIcons({ chevronBackOutline, qrCodeOutline });
  }

  ngOnInit(): void {
    const codigo = this.route.snapshot.queryParamMap.get('codigo');

    this.recursosService.listar().subscribe({
      next: (lista) => {
        if (codigo) {
          const encontrado = lista.find((recurso) => recurso.codigo === codigo);
          if (encontrado) {
            this.editando = true;
            this.codigoVista = encontrado.codigo;
            this.nombre = encontrado.nombre;
            this.categoria = encontrado.categoria;
            this.ubicacion = encontrado.ubicacion;
            this.cantidad = encontrado.equipos;
            this.descripcion = encontrado.descripcion;
            return;
          }
        }
        this.codigoVista = this.recursosService.generarCodigo(this.categoria, lista);
      },
      error: (error) => alert(mensajeDeError(error)),
    });
  }

  elegirCategoria(categoria: CategoriaRecurso): void {
    this.categoria = categoria;
    if (!this.editando) {
      this.codigoVista = this.recursosService.generarCodigo(categoria);
    }
  }

  guardar(): void {
    if (this.nombre.trim() === '') {
      alert('Escribe el nombre del recurso');
      return;
    }
    if (this.cantidad < 1) {
      alert('La cantidad debe ser al menos 1');
      return;
    }
    if (this.guardando) {
      return;
    }

    this.guardando = true;

    if (this.editando) {
      this.recursosService
        .actualizar(this.codigoVista, {
          nombre: this.nombre.trim(),
          ubicacion: this.ubicacion,
          equipos: this.cantidad,
          descripcion: this.descripcion,
        })
        .subscribe({
          next: () => {
            this.guardando = false;
            alert('Recurso actualizado');
            this.router.navigateByUrl('/admin-recursos');
          },
          error: (error) => {
            this.guardando = false;
            alert(mensajeDeError(error));
          },
        });
      return;
    }

    this.recursosService
      .crear({
        codigo: this.codigoVista || undefined,
        nombre: this.nombre.trim(),
        categoria: this.categoria,
        ubicacion: this.ubicacion,
        estado: 'Disponible',
        equipos: this.cantidad,
        horario: { ...HORARIO_PREDETERMINADO },
        descripcion: this.descripcion,
      })
      .subscribe({
        next: () => {
          this.guardando = false;
          alert('Recurso guardado con el código ' + this.codigoVista);
          this.router.navigateByUrl('/admin-recursos');
        },
        error: (error) => {
          this.guardando = false;
          alert(mensajeDeError(error));
        },
      });
  }

  cancelar(): void {
    this.router.navigateByUrl('/admin-recursos');
  }
}
