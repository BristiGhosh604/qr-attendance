import { ScanLine } from 'lucide-react';

export default function Brand({ light = false, subtitle = 'Smart classroom presence' }) {
  return (
    <span className={`brand${light ? ' brand-light' : ''}`}>
      <span className="brand-mark"><ScanLine /></span>
      <span><strong>QR Attendance</strong><small>{subtitle}</small></span>
    </span>
  );
}
