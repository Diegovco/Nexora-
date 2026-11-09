import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IonContent, IonFooter, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { addOutline, cubeOutline, peopleOutline, barChartOutline, logOutOutline } from 'ionicons/icons';
import { RecursosService, Recurso } from '../../services/recursos.service';

@Component({
  selector: 'app-admin-recursos',
  templateUrl: './admin-recursos.page.html',
  styleUrls: ['./admin-recursos.page.scss'],
  standalone: true,
  imports: [IonContent, IonFooter, IonIcon, FormsModule, RouterLink]
})
export class AdminRecursosPage {
  recursos: Recurso[] = [];
  texto = '';
  categoria = 'Todos';
  categorias = ['Todos', 'Laboratorio', 'Libro', 'Equipo AV'];

  constructor(private recursosService: RecursosService, private router: Router) {
    addIcons({ addOutline, cubeOutline, peopleOutline, barChartOutline, logOutOutline });
  }

  // Se ejecuta cada vez que entras a la pantalla (también al regresar de "Nuevo recurso")
  ionViewWillEnter() {
    this.filtrar();
  }

  filtrar() {
    const todos = this.recursosService.obtenerTodos();
    const buscado = this.texto.toLowerCase();
    const resultado: Recurso[] = [];

    for (let i = 0; i < todos.length; i++) {
      const r = todos[i];
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

  editar(r: Recurso) {
    this.router.navigate(['/nuevo-recurso'], { queryParams: { codigo: r.codigo } });
  }

  eliminar(r: Recurso) {
    if (r.estado === 'Prestado') { return; }
    if (confirm('¿Seguro que quieres eliminar "' + r.nombre + '"?')) {
      this.recursosService.eliminar(r.codigo);
      this.filtrar();
    }
  }

  claseEstado(estado: string): string {
    return this.recursosService.claseEstado(estado);
  }
}