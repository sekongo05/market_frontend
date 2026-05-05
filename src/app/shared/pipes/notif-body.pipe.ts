import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({ name: 'notifBody', standalone: true })
export class NotifBodyPipe implements PipeTransform {

  constructor(private sanitizer: DomSanitizer) {}

  transform(html: string | null | undefined): SafeHtml {
    if (!html) return '';

    const doc = new DOMParser().parseFromString(html, 'text/html');

    // Si le HTML est un email complet (avec scaffold), on extrait le contenu utile.
    const contentTd = this.findEmailContentTd(doc);
    const source = contentTd
      ? new DOMParser().parseFromString(contentTd.innerHTML, 'text/html')
      : doc;

    // Tables → enlever les styles hérités de l'email, ajouter la classe CSS theme.
    source.querySelectorAll<HTMLTableElement>('table').forEach(table => {
      table.removeAttribute('style');
      table.removeAttribute('width');
      table.removeAttribute('cellpadding');
      table.removeAttribute('cellspacing');
      table.classList.add('notif-table');
    });

    // Cellules → garder uniquement font-weight, ajouter notif-td.
    source.querySelectorAll<HTMLTableCellElement>('td').forEach(td => {
      const fw = td.style.fontWeight;
      td.removeAttribute('style');
      if (fw) td.style.fontWeight = fw;
      td.classList.add('notif-td');
    });

    // Première colonne de chaque ligne → notif-td-label (fond gris, texte atténué).
    source.querySelectorAll<HTMLTableRowElement>('tr').forEach(tr => {
      const cells = tr.querySelectorAll('td');
      if (cells.length >= 2) cells[0].classList.add('notif-td-label');
    });

    // Paragraphes → convertir color:#6b7280 en classe, préserver font-weight.
    source.querySelectorAll<HTMLParagraphElement>('p').forEach(p => {
      const fw = p.style.fontWeight;
      const hasMutedColor = p.style.color === '#6b7280' || p.style.color === 'rgb(107, 114, 128)';
      p.removeAttribute('style');
      if (hasMutedColor) p.classList.add('notif-p-muted');
      if (fw) p.style.fontWeight = fw;
    });

    // Les badges <span style="background:…"> gardent leurs couleurs sémantiques.

    return this.sanitizer.bypassSecurityTrustHtml(source.body.innerHTML);
  }

  private findEmailContentTd(doc: Document): Element | null {
    for (const td of Array.from(doc.querySelectorAll('td'))) {
      const style = td.getAttribute('style') ?? '';
      if (style.includes('28px') && style.includes('#374151')) return td;
    }
    return null;
  }
}
