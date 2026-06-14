import { Pipe, PipeTransform } from '@angular/core';
import { environment } from '../../../environments/environment';

const MEDIA_BASE = environment.apiUrl.replace(/\/api$/, '');
const CLOUDINARY_PATTERN = /res\.cloudinary\.com/;

@Pipe({ name: 'mediaUrl', standalone: true })
export class MediaUrlPipe implements PipeTransform {
  transform(url: string | null | undefined, w?: number | string, fallback = ''): string {
    if (!url) return fallback;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      if (w && CLOUDINARY_PATTERN.test(url)) {
        return url.replace('/image/upload/', `/image/upload/w_${w},c_fill,q_auto,f_auto/`);
      }
      return url;
    }
    return MEDIA_BASE + url;
  }
}
