import { Pipe, PipeTransform } from '@angular/core';
import { environment } from '../../../environments/environment';

const MEDIA_BASE = environment.apiUrl.replace(/\/api$/, '');

/**
 * Transforms relative media URLs returned by the backend (e.g. /uploads/products/xxx.jpg)
 * into absolute URLs pointing to the backend server.
 * External URLs (http/https) are returned as-is.
 */
@Pipe({ name: 'mediaUrl', standalone: true })
export class MediaUrlPipe implements PipeTransform {
  transform(url: string | null | undefined, fallback = ''): string {
    if (!url) return fallback;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return MEDIA_BASE + url;
  }
}
