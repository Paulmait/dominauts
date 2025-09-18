import React from 'react';

export const PrivacyPolicy: React.FC = () => {
  return (
    <div style={{
      maxWidth: '800px',
      margin: '0 auto',
      padding: '2rem',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      lineHeight: '1.6',
      color: '#333'
    }}>
      <h1>Privacy Policy</h1>
      <p><strong>Effective Date: September 17, 2025</strong></p>
      <p><strong>Last Updated: September 17, 2025</strong></p>

      <p>
        Cien Rios LLC ("we", "us", or "our") operates this domino game app ("the App"), under the DBA: Dominauts™.
        We respect your privacy and are committed to protecting your personal data. This Privacy Policy explains how we
        collect, use, and disclose personal data through the App.
      </p>

      <h2>1. Information We Collect</h2>
      <ul>
        <li><strong>Device Information:</strong> IP address, OS version, device ID</li>
        <li><strong>Gameplay Data:</strong> Scores, game mode, session length</li>
        <li><strong>Location (if allowed):</strong> Used to auto-detect default game mode</li>
        <li><strong>Optional:</strong> Email address or login credentials if account creation is used</li>
      </ul>

      <h2>2. How We Use Your Data</h2>
      <ul>
        <li>To personalize gameplay experience</li>
        <li>To enable saving progress and achievements</li>
        <li>To improve game balance and functionality</li>
        <li>To comply with legal requirements</li>
      </ul>

      <h2>3. Legal Basis for Processing (GDPR)</h2>
      <ul>
        <li>Consent (e.g., for location services or marketing)</li>
        <li>Legitimate interests (e.g., game analytics)</li>
        <li>Compliance with law</li>
      </ul>

      <h2>4. COPPA Disclosure</h2>
      <p>
        Our app is not directed toward children under 13. We do not knowingly collect personal data from children.
        If we discover that a child has provided us data, we delete it immediately.
      </p>

      <h2>5. Data Sharing & Retention</h2>
      <ul>
        <li>We do not sell or share data with third parties.</li>
        <li>Game-related data is stored for gameplay continuity and analytics only.</li>
        <li>Data is retained only as long as needed for game functionality.</li>
      </ul>

      <h2>6. Your Rights (GDPR / CCPA)</h2>
      <p>You may request to:</p>
      <ul>
        <li>Access or delete your data</li>
        <li>Withdraw consent</li>
        <li>File a complaint with your data protection authority</li>
      </ul>

      <h2>7. Security</h2>
      <p>We use encryption and access controls to protect your data.</p>

      <h2>8. Contact</h2>
      <p>
        <strong>Cien Rios LLC</strong><br />
        Email: support@cienrios.com<br />
        Address: 3350 SW 148th Ave, Suite 110<br />
        Miramar, FL 33027<br />
        Phone: +1 (305) 814-1252
      </p>

      <p style={{ marginTop: '3rem', fontSize: '0.9rem', color: '#666' }}>
        © 2025 Dominauts™ by Cien Rios LLC. All rights reserved.
      </p>
    </div>
  );
};