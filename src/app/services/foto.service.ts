import { Injectable } from '@angular/core';
import { Camera } from '@capacitor/camera';

/**
 * Toma o elige la foto de un recurso y la deja lista para guardarse
 * en la base de datos (imagen JPG pequeña en texto base64).
 */
@Injectable({ providedIn: 'root' })
export class FotoService {
  // Tamaño máximo de la foto guardada (en píxeles) y calidad del JPG.
  // Fotos pequeñas = la app carga rápido aunque haya muchos recursos.
  private readonly anchoMaximo = 800;
  private readonly calidad = 0.6;

  /** Abre la cámara. Regresa la foto o null si el usuario canceló. */
  async tomarFoto(): Promise<string | null> {
    try {
      const resultado = await Camera.takePhoto({
        quality: 70,
        targetWidth: this.anchoMaximo,
        correctOrientation: true,
        webUseInput: true, // en la computadora abre el selector de archivos
      });
      if (!resultado.webPath) {
        return null;
      }
      return await this.reducir(resultado.webPath);
    } catch {
      return null; // canceló o no dio permiso
    }
  }

  /** Abre la galería para elegir una foto ya tomada. */
  async elegirDeGaleria(): Promise<string | null> {
    try {
      const resultado = await Camera.chooseFromGallery({
        quality: 70,
        targetWidth: this.anchoMaximo,
      });
      if (resultado.results.length === 0 || !resultado.results[0].webPath) {
        return null;
      }
      return await this.reducir(resultado.results[0].webPath as string);
    } catch {
      return null;
    }
  }

  /** Reduce la foto y la convierte a texto base64 (data:image/jpeg;base64,...) */
  reducir(ruta: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        let ancho = img.width;
        let alto = img.height;
        if (ancho > this.anchoMaximo) {
          alto = Math.round((alto * this.anchoMaximo) / ancho);
          ancho = this.anchoMaximo;
        }
        const lienzo = document.createElement('canvas');
        lienzo.width = ancho;
        lienzo.height = alto;
        const ctx = lienzo.getContext('2d');
        if (!ctx) {
          reject(new Error('Sin canvas'));
          return;
        }
        ctx.drawImage(img, 0, 0, ancho, alto);
        resolve(lienzo.toDataURL('image/jpeg', this.calidad));
      };
      img.onerror = reject;
      img.src = ruta;
    });
  }
}
