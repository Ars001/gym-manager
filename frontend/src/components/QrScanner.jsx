// Camera QR scanner using the popular html5-qrcode library.
// WHY: staff can scan a member's booking QR (which encodes the booking id) to
// check them in. Camera access needs https or localhost, so a manual code entry
// is always offered alongside this (see CheckIn.jsx).

import { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

export default function QrScanner({ onScan }) {
  const startedRef = useRef(false);

  useEffect(() => {
    const elementId = 'qr-reader';
    const scanner = new Html5Qrcode(elementId);
    startedRef.current = false;

    scanner
      .start(
        { facingMode: 'environment' }, // prefer the rear camera
        { fps: 10, qrbox: 250 },
        (decodedText) => onScan(decodedText),
        () => {} // ignore per-frame decode errors (noisy)
      )
      .then(() => { startedRef.current = true; })
      .catch(() => { /* camera unavailable — manual entry still works */ });

    // Stop the camera when the component unmounts.
    return () => {
      if (startedRef.current) {
        scanner.stop().then(() => scanner.clear()).catch(() => {});
      }
    };
  }, [onScan]);

  return <div id="qr-reader" style={{ width: 300 }} />;
}
