import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IonButton, IonContent, IonInput, IonItem, NavController } from '@ionic/angular';

import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-crear-cuenta',
  templateUrl: './crear-cuenta.page.html',
  // Usa los mismos estilos que la pantalla de inicio de sesión
  styleUrls: ['../login/login.page.scss', './crear-cuenta.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, IonContent, IonItem, IonInput, IonButton],
})
export class CrearCuentaPage {
  private apiUrl = environment.apiUrl;

  nombre = '';
  apellido = '';
  correo = '';
  matricula = '';
  password = '';
  confirmarPassword = '';
  claveAdmin = ''; // Opcional: solo para cuentas de administrador

  correoValido = false;
  guardando = false;

  // Cualquier correo con la forma: algo@algo.algo
  private readonly regexCorreo = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

  constructor(
    private http: HttpClient,
    private navCtrl: NavController,
  ) {}

  // Se ejecuta cada vez que se escribe en el campo de correo
  validarCorreo(): void {
    this.correoValido = this.regexCorreo.test(this.correo.trim());
  }

  registrar(): void {
    if (this.guardando) {
      return;
    }

    const nombre = this.nombre.trim();
    const apellido = this.apellido.trim();
    const correo = this.correo.trim().toLowerCase();
    const matricula = this.matricula.trim();

    if (!nombre || !apellido || !correo || !matricula || !this.password || !this.confirmarPassword) {
      alert('Por favor completa todos los campos.');
      return;
    }

    this.validarCorreo();
    if (!this.correoValido) {
      alert('Escribe un correo válido, por ejemplo: nombre@gmail.com');
      return;
    }

    if (this.password.length < 6) {
      alert('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (this.password !== this.confirmarPassword) {
      alert('Las contraseñas no coinciden.');
      return;
    }

    const nuevoUsuario = {
      strnombreUsuario: nombre,
      strapellidoUsuario: apellido,
      strmatricula: matricula,
      strcorreoUsuario: correo,
      strwebsite: '',
      strcontrasena: this.password,
      // La API revisa esta clave y decide el rol (Estudiante o Administrativo)
      strclaveAdmin: this.claveAdmin.trim(),
    };

    this.guardando = true;

    this.http.post<any>(`${this.apiUrl}/users`, nuevoUsuario).subscribe({
      next: (respuesta) => {
        this.guardando = false;
        let rol = 'Estudiante';
        if (respuesta && respuesta.strrol === 'Administrativo') {
          rol = 'Administrador';
        }
        alert(`¡Cuenta de ${rol} creada con éxito! Ahora inicia sesión.`);
        this.navCtrl.navigateRoot('/login');
      },
      error: (err) => {
        this.guardando = false;
        if (err.status === 403) {
          alert('Clave de administrador incorrecta. Si eres estudiante, deja ese campo vacío.');
        } else if (err.status === 409) {
          alert('Ese correo ya está registrado. Inicia sesión.');
        } else if (err.status === 400 && err.error && err.error.error) {
          alert(err.error.error);
        } else {
          alert('No se pudo conectar con el servidor.');
        }
      },
    });
  }
}
