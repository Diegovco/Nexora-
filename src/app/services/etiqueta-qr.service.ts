import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import QRCode from 'qrcode';

/**
 * Genera la etiqueta QR de un recurso para imprimirla y pegarla.
 * El QR guarda SOLO el código del recurso (por ejemplo "LAB-006"),
 * que es lo mismo que se escribe a mano en la pantalla Escanear.
 */
@Injectable({ providedIn: 'root' })
export class EtiquetaQrService {
  /** Crea una imagen PNG con el QR, el código y el nombre del recurso. */
  async generarEtiqueta(codigo: string, nombre: string): Promise<string> {
    // 1) Imagen del QR
    const qr = await QRCode.toDataURL(codigo, {
      width: 600,
      margin: 2,
      errorCorrectionLevel: 'M',
    });

    // 2) Se dibuja en un lienzo blanco con el texto abajo
    const ancho = 700;
    const alto = 860;
    const lienzo = document.createElement('canvas');
    lienzo.width = ancho;
    lienzo.height = alto;
    const ctx = lienzo.getContext('2d');
    if (!ctx) {
      return qr;
    }

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, ancho, alto);

    const imagenQr = await this.cargarImagen(qr);
    ctx.drawImage(imagenQr, 50, 30, 600, 600);

    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.font = 'bold 64px Arial, sans-serif';
    ctx.fillText(codigo, ancho / 2, 700);

    ctx.font = '34px Arial, sans-serif';
    ctx.fillText(this.recortar(nombre, 32), ancho / 2, 760);

    ctx.fillStyle = '#555555';
    ctx.font = '26px Arial, sans-serif';
    ctx.fillText('NEXORA · UTC', ancho / 2, 820);

    return lienzo.toDataURL('image/png');
  }

  /**
   * En el celular: abre el menú de compartir (guardar en galería, WhatsApp, imprimir...).
   * En la computadora: descarga el archivo PNG.
   */
  async guardarOCompartir(imagen: string, codigo: string): Promise<void> {
    const nombreArchivo = `QR-${codigo}.png`;

    if (Capacitor.isNativePlatform()) {
      const base64 = imagen.split(',')[1];
      const archivo = await Filesystem.writeFile({
        path: nombreArchivo,
        data: base64,
        directory: Directory.Cache,
      });
      await Share.share({
        title: `Etiqueta QR ${codigo}`,
        text: `Etiqueta QR del recurso ${codigo}`,
        files: [archivo.uri],
        dialogTitle: 'Guardar o compartir etiqueta',
      });
      return;
    }

    const enlace = document.createElement('a');
    enlace.href = imagen;
    enlace.download = nombreArchivo;
    enlace.click();
  }

  private cargarImagen(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  private recortar(texto: string, maximo: number): string {
    if (texto.length <= maximo) {
      return texto;
    }
    return texto.substring(0, maximo - 1) + '…';
  }
}
