import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { 
  IonContent, 
  IonHeader, 
  IonToolbar, 
  IonButtons,
  IonButton,
  IonFooter, 
  IonIcon 
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { 
  chevronDownOutline,
  searchOutline,
  homeOutline, 
  gridOutline, 
  receiptOutline, 
  personOutline 
} from 'ionicons/icons';
import { RecursosService, Recurso } from '../../services/recursos.service';

@Component({
  selector: 'app-gestion-reservas',
  templateUrl: './gestion-reservas.page.html',
  styleUrls: ['./gestion-reservas.page.scss'],
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    RouterLink,
    RouterLinkActive,
    IonContent, 
    IonHeader, 
    IonToolbar, 
    IonButtons,
    IonButton,
    IonFooter, 
    IonIcon
  ],
})
export class GestionReservasPage implements OnInit {
  recursos: Recurso[] = [];
  texto = '';
  categoria = 'Todos';
  categorias = ['Todos', 'Laboratorio', 'Libro', 'Equipo AV'];

  constructor(private recursosService: RecursosService) {
    addIcons({ 
      'chevron-down-outline': chevronDownOutline,
      'search-outline': searchOutline,
      'home-outline': homeOutline,
      'grid-outline': gridOutline,
      'receipt-outline': receiptOutline,
      'person-outline': personOutline,
    }); 
  }

  ngOnInit() {
    this.filtrar();
  }

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

  claseEstado(estado: string): string {
    return this.recursosService.claseEstado(estado);
  }
}