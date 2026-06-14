export function orderStatusLabel(s: string): string {
  const m: Record<string, string> = {
    PENDING: 'En attente', CONFIRMED: 'Confirmée',
    SHIPPED: 'Expédiée', DELIVERED: 'Livrée', CANCELLED: 'Annulée',
  };
  return m[s] ?? s;
}

export function orderStatusClass(s: string): string {
  const m: Record<string, string> = {
    PENDING:   'bg-yellow-500/15 text-yellow-400 border border-yellow-500/25',
    CONFIRMED: 'bg-blue-500/15   text-blue-400   border border-blue-500/25',
    SHIPPED:   'bg-amber-500/15 text-amber-600 border border-amber-500/25',
    DELIVERED: 'bg-green-500/15  text-green-400  border border-green-500/25',
    CANCELLED: 'bg-red-500/15    text-red-400    border border-red-500/25',
  };
  return m[s] ?? 'bg-black/[.06] text-gray-500 border border-black/[.10]';
}

export function deliveryStatusLabel(s: string): string {
  const m: Record<string, string> = {
    PREPARING: 'En préparation', OUT_FOR_DELIVERY: 'En livraison',
    DELIVERED: 'Livré', FAILED: 'Échec',
  };
  return m[s] ?? s;
}

export function deliveryStatusClass(s: string): string {
  const m: Record<string, string> = {
    PREPARING:        'bg-blue-500/15   text-blue-400   border border-blue-500/25',
    OUT_FOR_DELIVERY: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/25',
    DELIVERED:        'bg-green-500/15  text-green-400  border border-green-500/25',
    FAILED:           'bg-red-500/15    text-red-400    border border-red-500/25',
  };
  return m[s] ?? 'bg-black/[.06] text-gray-500 border border-black/[.10]';
}

export function returnStatusLabel(s: string): string {
  const m: Record<string, string> = { PENDING: 'En attente', APPROVED: 'Accepté', REJECTED: 'Refusé', COMPLETED: 'Traité' };
  return m[s] ?? s;
}

export function returnStatusClass(s: string): string {
  const m: Record<string, string> = {
    PENDING:   'bg-yellow-500/15 text-yellow-400 border border-yellow-500/25',
    APPROVED:  'bg-green-500/15  text-green-400  border border-green-500/25',
    REJECTED:  'bg-red-500/15    text-red-400    border border-red-500/25',
    COMPLETED: 'bg-blue-500/15   text-blue-400   border border-blue-500/25',
  };
  return m[s] ?? 'bg-black/[.06] text-gray-500 border border-black/[.10]';
}

export function formatAmount(val: number | null | undefined): string {
  return `${Number(val ?? 0).toLocaleString('fr-FR')} FCFA`;
}

export function timeAgo(dateStr: string): string {
  if (!dateStr) return '';
  const diff  = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 1)  return "à l'instant";
  if (mins  < 60) return `il y a ${mins} min`;
  if (hours < 24) return `il y a ${hours}h`;
  if (days  < 7)  return `il y a ${days}j`;
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

export function stockClass(stock: number): string {
  if (stock === 0) return 'text-red-400';
  if (stock <= 3)  return 'text-orange-400';
  return 'text-green-400';
}
