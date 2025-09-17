import React from 'react';
import './LegalPages.css';

export const PrivacyPolicy: React.FC = () => {
  return (
    <div className="legal-container">
      <div className="legal-content">
        <h1>Privacy Policy</h1>

        <div className="legal-header">
          <p><strong>Effective Date:</strong> September 17, 2025</p>
          <p><strong>Last Updated:</strong> September 17, 2025</p>
        </div>

        <p className="legal-intro">
          Cien Rios LLC ("we", "us", or "our") operates this domino game app ("the App"),
          under the DBA: Universal Domino™. We respect your privacy and are committed to
          protecting your personal data. This Privacy Policy explains how we collect, use,
          and disclose personal data through the App.
        </p>

        <section className="legal-section">
          <h2>1. Information We Collect</h2>
          <ul>
            <li><strong>Device Information:</strong> IP address, OS version, device ID, browser type, screen resolution, hardware specifications</li>
            <li><strong>Gameplay Data:</strong> Scores, game mode, session length, moves, achievements, progression</li>
            <li><strong>Location (if allowed):</strong> Used to auto-detect default game mode and provide localized content</li>
            <li><strong>Optional:</strong> Email address or login credentials if account creation is used</li>
            <li><strong>Analytics Data:</strong> App usage patterns, feature interactions, performance metrics</li>
            <li><strong>Payment Information:</strong> Transaction history (payment details processed by third-party providers)</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>2. How We Use Your Data</h2>
          <ul>
            <li>To personalize gameplay experience</li>
            <li>To enable saving progress and achievements</li>
            <li>To improve game balance and functionality</li>
            <li>To detect and prevent fraud or cheating</li>
            <li>To provide customer support</li>
            <li>To send game updates and notifications (with consent)</li>
            <li>To comply with legal requirements</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>3. Legal Basis for Processing (GDPR)</h2>
          <ul>
            <li><strong>Consent:</strong> For location services, marketing communications, and analytics</li>
            <li><strong>Legitimate interests:</strong> For game analytics, fraud prevention, and improving services</li>
            <li><strong>Contract performance:</strong> To provide game services you requested</li>
            <li><strong>Compliance with law:</strong> When required by legal obligations</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>4. COPPA Disclosure</h2>
          <p>
            Our app is not directed toward children under 13. We do not knowingly collect
            personal data from children. If we discover that a child has provided us data,
            we delete it immediately. Parents who believe their child has provided personal
            information should contact us at support@cienrios.com.
          </p>
        </section>

        <section className="legal-section">
          <h2>5. Data Sharing & Retention</h2>
          <ul>
            <li>We do not sell or share personal data with third parties for their marketing purposes</li>
            <li>We may share data with service providers who help operate our app (under strict confidentiality)</li>
            <li>Game-related data is stored for gameplay continuity and analytics only</li>
            <li>Data is retained only as long as needed for game functionality or legal requirements</li>
            <li>Account data is retained until account deletion is requested</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>6. Your Rights (GDPR / CCPA)</h2>
          <p>You have the right to:</p>
          <ul>
            <li>Access your personal data</li>
            <li>Correct inaccurate data</li>
            <li>Delete your data ("right to be forgotten")</li>
            <li>Restrict or object to processing</li>
            <li>Data portability</li>
            <li>Withdraw consent at any time</li>
            <li>File a complaint with your data protection authority</li>
            <li>Opt-out of sale of personal information (we do not sell data)</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>7. Security</h2>
          <p>
            We implement appropriate technical and organizational measures to protect your data:
          </p>
          <ul>
            <li>Encryption of data in transit and at rest</li>
            <li>Access controls and authentication</li>
            <li>Regular security audits and updates</li>
            <li>Secure data centers with physical security</li>
            <li>Employee training on data protection</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>8. Cookies and Tracking</h2>
          <p>
            We use cookies and similar technologies to:
          </p>
          <ul>
            <li>Remember your preferences and settings</li>
            <li>Analyze app usage and performance</li>
            <li>Provide personalized content</li>
            <li>Prevent fraud and enhance security</li>
          </ul>
          <p>You can control cookies through your browser settings.</p>
        </section>

        <section className="legal-section">
          <h2>9. International Data Transfers</h2>
          <p>
            Your data may be transferred to servers located outside your country. We ensure
            appropriate safeguards are in place for such transfers in compliance with applicable laws.
          </p>
        </section>

        <section className="legal-section">
          <h2>10. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy periodically. We will notify you of significant
            changes via the app or email. Your continued use after changes constitutes acceptance.
          </p>
        </section>

        <section className="legal-section">
          <h2>11. Contact Information</h2>
          <div className="contact-info">
            <p>If you have questions or concerns about this Privacy Policy, contact us at:</p>
            <ul>
              <li>📧 Email: <a href="mailto:support@cienrios.com">support@cienrios.com</a></li>
              <li>📬 Address: 3350 SW 148th Ave, Suite 110, Miramar, FL 33027</li>
              <li>📞 Phone: +1 (305) 814-1252</li>
              <li>🌐 Website: <a href="https://www.cienrios.com" target="_blank" rel="noopener noreferrer">www.cienrios.com</a></li>
            </ul>
          </div>
        </section>

        <div className="legal-footer">
          <p>&copy; 2025 Cien Rios LLC. All rights reserved.</p>
          <p>Universal Domino™ is a trademark of Cien Rios LLC.</p>
        </div>
      </div>
    </div>
  );
};