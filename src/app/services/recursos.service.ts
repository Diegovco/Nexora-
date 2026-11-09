import { Injectable } from '@angular/core';

export interface Recurso {
  codigo: string;
  nombre: string;
  categoria: string;   // 'Laboratorio', 'Libro' o 'Equipo AV'
  ubicacion: string;
  estado: string;      // 'Disponible', 'Prestado' o 'Mantenimiento'
  cantidad: number;
  descripcion: string;
}

@Injectable({ providedIn: 'root' })
export class RecursosService {

  // Datos de ejemplo (después vendrán de la API)
  private recursos: Recurso[] = [
    { codigo: 'LAB-002', nombre: 'Laboratorio de Cómputo 2', categoria: 'Laboratorio', ubicacion: 'Edificio B', estado: 'Disponible', cantidad: 1, descripcion: '30 equipos' },
    { codigo: 'AV-0041', nombre: 'Proyector Epson X41', categoria: 'Equipo AV', ubicacion: 'Almacén AV', estado: 'Prestado', cantidad: 1, descripcion: 'Incluye cable HDMI' },
    { codigo: 'LIB-1187', nombre: 'Estructuras de datos en Java', categoria: 'Libro', ubicacion: 'Biblioteca', estado: 'Disponible', cantidad: 3, descripcion: '' },
    { codigo: 'LAB-005', nombre: 'Laboratorio de Redes', categoria: 'Laboratorio', ubicacion: 'Edificio C', estado: 'Mantenimiento', cantidad: 1, descripcion: '' }
  ];

  obtenerTodos(): Recurso[] {
    return this.recursos;
  }

  buscarPorCodigo(codigo: string): Recurso | null {
    for (let i = 0; i < this.recursos.length; i++) {
      if (this.recursos[i].codigo === codigo) {
        return this.recursos[i];
      }
    }
    return null;
  }

  agregar(recurso: Recurso) {
    this.recursos.push(recurso);
  }

  eliminar(codigo: string) {
    for (let i = 0; i < this.recursos.length; i++) {
      if (this.recursos[i].codigo === codigo) {
        this.recursos.splice(i, 1);
        return;
      }
    }
  }

  // Crea el siguiente código según la categoría: LAB-006, LIB-1188, AV-0042...
  generarCodigo(categoria: string): string {
    let prefijo = 'AV';
    if (categoria === 'Laboratorio') { prefijo = 'LAB'; }
    if (categoria === 'Libro') { prefijo = 'LIB'; }

    let mayor = 0;
    for (let i = 0; i < this.recursos.length; i++) {
      const partes = this.recursos[i].codigo.split('-');
      if (partes[0] === prefijo) {
        const numero = Number(partes[1]);
        if (numero > mayor) { mayor = numero; }
      }
    }

    let siguiente = String(mayor + 1);
    while (siguiente.length < 3) {
      siguiente = '0' + siguiente;
    }
    return prefijo + '-' + siguiente;
  }

  // Devuelve la clase de color según el estado
  claseEstado(estado: string): string {
    if (estado === 'Disponible') { return 'disponible'; }
    if (estado === 'Prestado') { return 'prestado'; }
    return 'mantenimiento';
  }
}