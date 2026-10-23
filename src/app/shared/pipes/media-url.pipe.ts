import { Pipe, PipeTransform } from '@angular/core';
import { environment } from '../../../environments/environment';

const MEDIA_BASE = environment.apiUrl.replace(/\/api$/, '');
const CLOUDINARY_PATTERN = /res\.cloudinary\.com/;

@Pipe({ name: 'mediaUrl', standalone: true })
export class MediaUrlPipe implements PipeTransform {
  transform(url: string | null | undefined, w?: number | string, fallback = ''): string {
    if (!url) return fallback;

    if (url.startsWith('http://') || url.startsWith('https://')) {
      if (!CLOUDINARY_PATTERN.test(url)) {
        return url;
      }

      const uploadToken = '/image/upload/';
      const idx = url.indexOf(uploadToken);
      if (idx === -1) return url;

      const base = url.substring(0, idx + uploadToken.length);
      const after = url.substring(idx + uploadToken.length);

      // Vérifier si le 1er segment contient des paramètres de transformation Cloudinary (ex: w_400, c_fill, f_auto, etc.)
      const parts = after.split('/');
      let rest = after;
      if (parts.length > 1 && parts[0].includes('_') && !/^v\d+$/.test(parts[0])) {
        rest = parts.slice(1).join('/');
      }

      // Résolution par défaut de 800px pour un piqué net sur écrans Retina (DPR 2x/3x)
      const targetW = w ?? 800;
      return `${base}w_${targetW},c_limit,q_auto:good,f_auto/${rest}`;
    }

    return MEDIA_BASE + url;
  }
}

