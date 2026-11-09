import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
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
    private route: ActivatedRoute
  ) {
    addIcons({ chevronBackOutline, qrCodeOutline });
  }

  ngOnInit() {
    // Si viene un código en la URL, estamos editando
    const codigo = this.route.snapshot.queryParamMap.get('codigo');
    if (codigo) {
      const r = this.recursosService.buscarPorCodigo(codigo);
      if (r) {
        this.editando = true;
        this.codigoVista = r.codigo;
        this.nombre = r.nombre;
        this.categoria = r.categoria;
        this.ubicacion = r.ubicacion;
        this.cantidad = r.cantidad;
        this.descripcion = r.descripcion;
        return;
      }
    }
    this.codigoVista = this.recursosService.generarCodigo(this.categoria);
  }

  elegirCategoria(c: string) {
    this.categoria = c;
    this.codigoVista = this.recursosService.generarCodigo(c);
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

    if (this.editando) {
      const r = this.recursosService.buscarPorCodigo(this.codigoVista);
      if (r) {
        r.nombre = this.nombre.trim();
        r.ubicacion = this.ubicacion;
        r.cantidad = this.cantidad;
        r.descripcion = this.descripcion;
      }
      alert('Recurso actualizado');
    } else {
      this.recursosService.agregar({
        codigo: this.codigoVista,
        nombre: this.nombre.trim(),
        categoria: this.categoria,
        ubicacion: this.ubicacion,
        estado: 'Disponible',
        cantidad: this.cantidad,
        descripcion: this.descripcion
      });
      alert('Recurso guardado con el código ' + this.codigoVista);
    }
    this.router.navigateByUrl('/admin-recursos');
  }

  cancelar() {
    this.router.navigateByUrl('/admin-recursos');
  }
}