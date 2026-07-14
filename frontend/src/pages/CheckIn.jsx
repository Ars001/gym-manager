// Check-in. Placeholder for the staff check-in screen. The MVP plan: pick a
// session, see its roster, and mark members present (POST /api/bookings/:id/check-in).
// A QR flow can later just hit the same check-in endpoint with a booking id.

export default function CheckIn() {
  return (
    <div>
      <h1>Check-in</h1>
      <div className="card">
        <p className="muted">
          Select a session to view its roster and mark members present. QR-code
          check-in will call the same endpoint with a booking id. (Coming next.)
        </p>
      </div>
    </div>
  );
}
