// Small colored pill for status values (member status, session status, payment
// status, booking status). Maps known statuses to a color variant so statuses
// look consistent everywhere.

const VARIANT = {
  // member
  active: 'success', frozen: 'warning', inactive: 'muted', cancelled: 'danger',
  // session
  scheduled: 'info', completed: 'success',
  // booking
  booked: 'info', attended: 'success', no_show: 'danger',
  // payment
  succeeded: 'success', pending: 'warning', failed: 'danger', refunded: 'muted',
  // generic
  yes: 'success', no: 'muted',
};

// Turn a raw status string into a readable label ("no_show" -> "no show").
function label(status) {
  return String(status || '').replace(/_/g, ' ');
}

export default function StatusBadge({ status }) {
  const variant = VARIANT[status] || 'muted';
  return <span className={`badge badge-${variant}`}>{label(status)}</span>;
}
