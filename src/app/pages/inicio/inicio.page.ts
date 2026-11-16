import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { 
  IonHeader, 
  IonToolbar, 
  IonTitle, 
  IonContent, 
  IonButtons, 
  IonButton, 
  IonIcon,
  IonFooter 
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { 
  notificationsOutline, 
  homeOutline, 
  gridOutline, 
  receiptOutline, 
  personOutline 
} from 'ionicons/icons';

@Component({
  selector: 'app-inicio',
  templateUrl: './inicio.page.html',
  styleUrls: ['./inicio.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    IonHeader, 
    IonToolbar, 
    IonTitle, 
    IonContent, 
    IonButtons, 
    IonButton, 
    IonIcon,
    IonFooter
  ],
})
export class InicioPage {
  constructor() {
    addIcons({ 
      'notifications-outline': notificationsOutline,
      'home-outline': homeOutline,
      'grid-outline': gridOutline,
      'receipt-outline': receiptOutline,
      'person-outline': personOutline,
    });
  }
}