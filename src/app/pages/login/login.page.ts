import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { NavController } from '@ionic/angular';
import {
  IonContent,
  IonItem,
  IonInput,
  IonButton
} from '@ionic/angular';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    IonContent,
    IonItem,
    IonInput,
    IonButton
  ],
})
export class LoginPage {
  private apiUrl = environment.apiUrl;

  email: string = '';
  password: string = '';

  showForgotPassword: boolean = false;
  emailVerified: boolean = false;

  recoveryEmail: string = '';
  recoveryUserId: string = '';
  newPassword: string = '';
  confirmPassword: string = '';

  constructor(private navCtrl: NavController, private http: HttpClient) {}

  onLogin() {
    const cleanedEmail = this.email.trim();
    const enteredPassword = this.password;

    if (!cleanedEmail || !enteredPassword) {
      alert('Por favor ingresa correo y contraseña.');
      return;
    }

    this.http.get<any>(`${this.apiUrl}/users/email/${encodeURIComponent(cleanedEmail)}`).subscribe({
      next: (userFound) => {
        if (userFound && userFound.strcontrasena === enteredPassword) {
          console.log('Inicio de sesión exitoso para:', userFound.strcorreoUsuario);
          localStorage.setItem('nexora_active_user', JSON.stringify(userFound));
          this.navCtrl.navigateRoot('/inicio');
        } else {
          alert('Correo o contraseña incorrectos.');
        }
      },
      error: () => {
        alert('Correo o contraseña incorrectos.');
      }
    });
  }

  toggleForgotPassword(show: boolean) {
    this.showForgotPassword = show;
    this.emailVerified = false;
    this.recoveryEmail = '';
    this.recoveryUserId = '';
    this.newPassword = '';
    this.confirmPassword = '';
  }

  verifyEmail() {
    const cleanedEmail = this.recoveryEmail.trim();

    if (!cleanedEmail) {
      alert('Por favor ingresa un correo.');
      return;
    }

    this.http.get<any>(`${this.apiUrl}/users/email/${encodeURIComponent(cleanedEmail)}`).subscribe({
      next: (user) => {
        this.recoveryUserId = user._id;
        this.emailVerified = true;
      },
      error: () => {
        this.emailVerified = false;
        this.recoveryUserId = '';
        alert(`El correo "${cleanedEmail}" no está registrado.`);
      }
    });
  }

  resetPassword() {
    if (!this.newPassword || !this.confirmPassword) {
      alert('Por favor completa ambos campos.');
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      alert('Las contraseñas no coinciden.');
      return;
    }

    if (this.newPassword.length < 6) {
      alert('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (this.recoveryUserId) {
      this.http.put(`${this.apiUrl}/users/${this.recoveryUserId}`, {
        strcontrasena: this.newPassword
      }).subscribe({
        next: () => {
          alert('¡Contraseña actualizada exitosamente!');
          this.toggleForgotPassword(false);
        },
        error: () => {
          alert('Error al actualizar la contraseña.');
        }
      });
    }
  }
}