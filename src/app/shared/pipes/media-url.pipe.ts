import { Pipe, PipeTransform } from '@angular/core';
import { environment } from '../../../environments/environment';

const MEDIA_BASE = (environment.apiUrl || '').replace(/\/api$/, '');
const CLOUDINARY_PATTERN = /res\.cloudinary\.com/;
// Segments Cloudinary de transformation reconnus (ex: w_800, c_limit, q_auto, f_auto, etc.)
const CLOUDINARY_TRANSFORM_SEGMENT = /^(?:[a-z]{1,4}_[a-zA-Z0-9.:_-]+,?)+$/;

@Pipe({ name: 'mediaUrl', standalone: true })
export class MediaUrlPipe implements PipeTransform {
  transform(url: string | null | undefined, w?: number | string, fallback = ''): string {
    if (!url) return fallback;

<<<<<<< HEAD
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
=======
    // Laisser intacts les aperçus locaux (Blob, Base64 Data URL)
    if (url.startsWith('data:') || url.startsWith('blob:')) {
      return url;
    }

    if (url.startsWith('http://') || url.startsWith('https://')) {
      if (!CLOUDINARY_PATTERN.test(url)) {
        return url;
      }

      const uploadToken = '/image/upload/';
      const idx = url.indexOf(uploadToken);
      if (idx === -1) return url;

      const base = url.substring(0, idx + uploadToken.length);
      const after = url.substring(idx + uploadToken.length);
      const parts = after.split('/');

      // Conserver le reste du chemin en nettoyant uniquement un premier segment de transformation Cloudinary existant
      let rest = after;
      if (parts.length > 1 && CLOUDINARY_TRANSFORM_SEGMENT.test(parts[0])) {
        rest = parts.slice(1).join('/');
      }

      // Par défaut 800px si aucun w n'est spécifié, avec c_limit (ne rogne jamais le produit !)
      const targetW = w ?? 800;
      return `${base}w_${targetW},c_limit,q_auto:good,f_auto/${rest}`;
    }

    // Gestion propre des URLs relatives
    const cleanBase = MEDIA_BASE.endsWith('/') ? MEDIA_BASE.slice(0, -1) : MEDIA_BASE;
    const cleanUrl = url.startsWith('/') ? url : `/${url}`;
    return `${cleanBase}${cleanUrl}`;
>>>>>>> develop
  }
}

