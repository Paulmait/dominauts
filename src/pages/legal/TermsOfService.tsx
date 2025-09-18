import React from 'react';

export const TermsOfService: React.FC = () => {
  return (
    <div style={{
      maxWidth: '800px',
      margin: '0 auto',
      padding: '2rem',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      lineHeight: '1.6',
      color: '#333'
    }}>
      <h1>Terms of Service</h1>
      <p><strong>Effective Date: September 17, 2025</strong></p>

      <p>
        Welcome to Dominauts™, owned and operated by Cien Rios LLC ("we," "us," "our").
        By accessing or using the App, you agree to these Terms of Service.
      </p>

      <h2>1. Use of the App</h2>
      <ul>
        <li>You must be 13 years or older to use the App.</li>
        <li>The App is for entertainment and educational use only.</li>
      </ul>

      <h2>2. Account & Access</h2>
      <ul>
        <li>Some features may require login or social sign-in.</li>
        <li>You are responsible for safeguarding your credentials.</li>
      </ul>

      <h2>3. In-App Purchases</h2>
      <ul>
        <li>Virtual items are non-refundable and hold no real-world monetary value.</li>
        <li>All purchases are final unless otherwise required by law.</li>
      </ul>

      <h2>4. User Conduct</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Use bots or cheat software</li>
        <li>Reverse-engineer or exploit the App</li>
        <li>Violate laws or intellectual property</li>
      </ul>

      <h2>5. Content Ownership</h2>
      <ul>
        <li>All code, graphics, and branding are property of Cien Rios LLC</li>
        <li>"Dominauts™" is a pending trademark of Cien Rios LLC</li>
      </ul>

      <h2>6. Limitation of Liability</h2>
      <p>
        The App is provided "as is." We are not liable for any damages, including loss of data or device issues,
        arising from use of the App.
      </p>

      <h2>7. Termination</h2>
      <p>
        We reserve the right to terminate accounts or restrict access for any reason, including violation of these terms.
      </p>

      <h2>8. Updates & Modifications</h2>
      <p>
        We may update these terms at any time. Continued use of the App after updates constitutes acceptance.
      </p>

      <h2>9. Governing Law</h2>
      <p>
        These Terms are governed by the laws of the State of Florida, USA.
      </p>

      <h2>10. Contact</h2>
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