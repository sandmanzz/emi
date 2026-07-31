export function formatIDR(n) {
  return 'Rp' + Number(n || 0).toLocaleString('id-ID');
}

export function customerStatusBadge(status) {
  if (status === 'active') return 'green';
  if (status === 'trial') return 'blue';
  if (status === 'suspended') return 'orange';
  return 'red';
}

export function paymentStatusBadge(status) {
  if (status === 'paid') return 'green';
  if (status === 'pending') return 'orange';
  if (status === 'refunded') return 'purple';
  return 'red';
}
