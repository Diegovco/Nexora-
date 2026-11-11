import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoginPage } from './login.page';
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavController } from '@ionic/angular'; // Importante: usar NavController
import {
  IonContent,
  IonItem,
  IonInput,
  IonButton
} from '@ionic/angular';

interface User {
  email: string;
  password: string;
}

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
  email: string = '';
  password: string = '';

  showForgotPassword: boolean = false;
  showRegister: boolean = false;
  emailVerified: boolean = false;

  recoveryEmail: string = '';
  newPassword: string = '';
  confirmPassword: string = '';

  registerEmail: string = '';
  registerPassword: string = '';
  registerConfirmPassword: string = '';

  usersDB: User[] = [
    { email: 'usuario@utcalvillo.edu.mx', password: '123' },
    { email: 'alumno@utcalvillo.edu.mx', password: 'password123' },
    { email: 'admin@utcalvillo.edu.mx', password: 'admin' }
    
  ];

  // Inyectamos NavController en lugar de Router
  constructor(private navCtrl: NavController) {}

  onLogin() {
    const cleanedEmail = this.email.trim().toLowerCase();
    const enteredPassword = this.password;

    if (!cleanedEmail || !enteredPassword) {
      alert('Por favor ingresa correo y contraseña.');
      return;
    }

    const userFound = this.usersDB.find(
      (user) => user.email === cleanedEmail && user.password === enteredPassword
    );

    if (userFound) {
      console.log('Inicio de sesión exitoso para:', userFound.email);
      // Reemplaza la pila de navegación hacia la ruta de tabs
      this.navCtrl.navigateRoot('/tabs/inicio');
    } else {
      alert('Correo o contraseña incorrectos.');
    }
  }

  toggleForgotPassword(show: boolean) {
    this.showForgotPassword = show;
    this.showRegister = false;
    this.emailVerified = false;
    this.recoveryEmail = '';
    this.newPassword = '';
    this.confirmPassword = '';
  }

  toggleRegister(show: boolean) {
    this.showRegister = show;
    this.showForgotPassword = false;
    this.registerEmail = '';
    this.registerPassword = '';
    this.registerConfirmPassword = '';
  }

  onRegister() {
    const cleanedEmail = this.registerEmail.trim().toLowerCase();

    if (!cleanedEmail || !this.registerPassword || !this.registerConfirmPassword) {
      alert('Por favor completa todos los campos.');
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

    const exists = this.usersDB.some((user) => user.email === cleanedEmail);

    if (exists) {
      alert('El correo ya se encuentra registrado.');
      return;
    }

    this.usersDB.push({
      email: cleanedEmail,
      password: this.registerPassword
    });

    alert('¡Cuenta creada con éxito! Ahora puedes iniciar sesión.');
    this.toggleRegister(false);
  }

  verifyEmail() {
    const cleanedEmail = this.recoveryEmail.trim().toLowerCase();

    if (!cleanedEmail) {
      alert('Por favor ingresa un correo.');
      return;
    }

    const exists = this.usersDB.some((user) => user.email === cleanedEmail);

    if (exists) {
      this.emailVerified = true;
    } else {
      this.emailVerified = false;
      alert(`El correo "${cleanedEmail}" no está registrado.`);
    }
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

    const cleanedEmail = this.recoveryEmail.trim().toLowerCase();
    const userIndex = this.usersDB.findIndex((user) => user.email === cleanedEmail);

    if (userIndex !== -1) {
      this.usersDB[userIndex].password = this.newPassword;
      alert('¡Contraseña actualizada exitosamente!');
      this.toggleForgotPassword(false);
    }
  }
}

describe('LoginPage', () => {
  let component: LoginPage;
  let fixture: ComponentFixture<LoginPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(LoginPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
