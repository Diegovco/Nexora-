import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';

@Component({
  selector: 'app-detalle-recurso',
  templateUrl: './detalle-recurso.page.html',
  styleUrls: ['./detalle-recurso.page.scss'],
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule],
})
export class DetalleRecursoPage implements OnInit {
  constructor() {}

  ngOnInit() {}
}
