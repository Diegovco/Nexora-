import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { NavController } from '@ionic/angular';
import {
  IonContent,
  IonItem,
  IonInput,
  IonButton
} from '@ionic/angular';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonItem,
    IonInput,
    IonButton
  ],
})
export class LoginPage {
  private apiUrl = 'http://localhost:5000';

  email: string = '';
  password: string = '';

  showForgotPassword: boolean = false;
  showRegister: boolean = false;
  emailVerified: boolean = false;

  recoveryEmail: string = '';
  recoveryUserId: string = '';
  newPassword: string = '';
  confirmPassword: string = '';

  // Campos de Registro
  registerNombre: string = '';
  registerApellido: string = '';
  registerMatricula: string = '';
  registerEmail: string = '';
  registerPassword: string = '';
  registerConfirmPassword: string = '';

  correoValido: boolean = false;
  rolDetectado: string = '';

  // Solo acepta 'A' o 'E' MAYÚSCULA al inicio (1 sola letra), seguida solo de números antes de @utcalvillo.edu.mx
  private readonly regexCorreoInstitucional = /^[AE][0-9]+@utcalvillo\.edu\.mx$/;

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
    this.showRegister = false;
    this.emailVerified = false;
    this.recoveryEmail = '';
    this.recoveryUserId = '';
    this.newPassword = '';
    this.confirmPassword = '';
  }

  toggleRegister(show: boolean) {
    this.showRegister = show;
    this.showForgotPassword = false;
    this.registerNombre = '';
    this.registerApellido = '';
    this.registerMatricula = '';
    this.registerEmail = '';
    this.registerPassword = '';
    this.registerConfirmPassword = '';
    this.correoValido = false;
    this.rolDetectado = '';
  }

  validarCorreoRegistro(): boolean {
    const correo = this.registerEmail.trim();
    if (!this.regexCorreoInstitucional.test(correo)) {
      this.correoValido = false;
      this.rolDetectado = '';
      return false;
    }

    this.correoValido = true;
    this.rolDetectado = correo.startsWith('A') ? 'Administrativo' : 'Estudiante';
    return true;
  }

  onRegister() {
    const nombre = this.registerNombre.trim();
    const apellido = this.registerApellido.trim();
    const matricula = this.registerMatricula.trim();
    const rawEmail = this.registerEmail.trim(); // Sin .toLowerCase() para respetar A y E mayúsculas

    if (!nombre || !apellido || !matricula || !rawEmail || !this.registerPassword || !this.registerConfirmPassword) {
      alert('Por favor completa todos los campos.');
      return;
    }

    if (!this.validarCorreoRegistro()) {
      alert(
        'Correo institucional inválido.\n' +
        '• Debe iniciar con A (Administrativo) o E (Estudiante) en MAYÚSCULA.\n' +
        '• Solo debe llevar una letra al inicio y números antes de @utcalvillo.edu.mx.'
      );
      return;
    }

    if (this.registerPassword !== this.registerConfirmPassword) {
      alert('Las contraseñas no coinciden.');
      return;
    }

    if (this.registerPassword.length < 6) {
      alert('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    this.http.get<any>(`${this.apiUrl}/users/email/${encodeURIComponent(rawEmail)}`).subscribe({
      next: () => {
        alert('El correo ya se encuentra registrado.');
      },
      error: (err) => {
        if (err.status === 404) {
          this.http.post(`${this.apiUrl}/users`, {
            strnombreUsuario: nombre,
            strapellidoUsuario: apellido,
            strmatricula: matricula,
            strcorreoUsuario: rawEmail,
            strrol: this.rolDetectado,
            strwebsite: '',
            strcontrasena: this.registerPassword
          }).subscribe({
            next: () => {
              alert(`¡Cuenta de ${this.rolDetectado} creada con éxito! Ahora puedes iniciar sesión.`);
              this.toggleRegister(false);
            },
            error: () => {
              alert('Error al guardar la cuenta en la base de datos.');
            }
          });
        } else {
          alert('Error al conectar con el servidor.');
        }
      }
    });
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