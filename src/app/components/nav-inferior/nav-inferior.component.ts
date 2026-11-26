import { Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  addCircleOutline,
  albumsOutline,
  calendarOutline,
  cubeOutline,
  listOutline,
  notificationsOutline,
} from 'ionicons/icons';

@Component({
  selector: 'app-nav-inferior',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, IonIcon],
  template: `
    <nav class="nx-barra" aria-label="Navegación principal">
      @if (tipo() === 'estudiante') {
        <a routerLink="/recursos" routerLinkActive="activa">
          <ion-icon name="cube-outline"></ion-icon>
          Catálogo
        </a>
        <a routerLink="/nueva-reserva" routerLinkActive="activa">
          <ion-icon name="add-circle-outline"></ion-icon>
          Reservar
        </a>
        <a routerLink="/mis-reservas" routerLinkActive="activa">
          <ion-icon name="calendar-outline"></ion-icon>
          Reservas
        </a>
        <a routerLink="/avisos" routerLinkActive="activa">
          <ion-icon name="notifications-outline"></ion-icon>
          Avisos
        </a>
      } @else {
        <a routerLink="/gestion-reservas" routerLinkActive="activa">
          <ion-icon name="list-outline"></ion-icon>
          Solicitudes
        </a>
        <a routerLink="/admin-recursos" routerLinkActive="activa">
          <ion-icon name="albums-outline"></ion-icon>
          Inventario
        </a>
        <a routerLink="/avisos" routerLinkActive="activa">
          <ion-icon name="notifications-outline"></ion-icon>
          Avisos
        </a>
        <a routerLink="/recursos" routerLinkActive="activa">
          <ion-icon name="cube-outline"></ion-icon>
          Catálogo
        </a>
      }
    </nav>
  `,
})
export class NavInferiorComponent {
  readonly tipo = input<'estudiante' | 'admin'>('estudiante');

  constructor() {
    addIcons({
      addCircleOutline,
      albumsOutline,
      calendarOutline,
      cubeOutline,
      listOutline,
      notificationsOutline,
    });
  }
}
