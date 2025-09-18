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
      <p><strong>Effective Date: December 18, 2024</strong></p>
      <p><strong>Last Updated: December 18, 2024</strong></p>

      <h2>1. Introduction</h2>
      <p>
        Welcome to Dominauts™ ("we," "us," or "our"). We respect your privacy and are committed to protecting your
        personal data. This Privacy Policy explains how we collect, use, disclose, and safeguard your information
        when you use our game Dominauts™ ("the Game").
      </p>
      <p>
        By using the Game, you consent to the data practices described in this Privacy Policy. If you do not agree
        with this Privacy Policy, please do not use the Game.
      </p>

      <h2>2. Information We Collect</h2>

      <h3>2.1 Information You Provide</h3>
      <ul>
        <li><strong>Account Information:</strong> Username, email address, password (encrypted), date of birth</li>
        <li><strong>Profile Information:</strong> Avatar, display name, game preferences</li>
        <li><strong>Payment Information:</strong> Processed securely through Stripe (we don't store card details)</li>
        <li><strong>Communications:</strong> Support tickets, feedback, chat messages</li>
      </ul>

      <h3>2.2 Information Collected Automatically</h3>
      <ul>
        <li><strong>Device Information:</strong> Device type, operating system, browser type, screen resolution</li>
        <li><strong>Usage Data:</strong> Game statistics, play time, features used, in-game actions</li>
        <li><strong>Network Information:</strong> IP address, approximate location (city/country level)</li>
        <li><strong>Cookies and Tracking:</strong> Session cookies, local storage data, analytics identifiers</li>
      </ul>

      <h3>2.3 Information from Third Parties</h3>
      <ul>
        <li><strong>Social Media:</strong> If you connect via Google, Facebook, or Apple (name, email, profile picture)</li>
        <li><strong>Analytics Providers:</strong> Google Analytics, performance metrics</li>
        <li><strong>Payment Processors:</strong> Transaction confirmation from Stripe</li>
      </ul>

      <h2>3. How We Use Your Information</h2>

      <h3>3.1 To Provide the Game</h3>
      <ul>
        <li>Create and manage your account</li>
        <li>Enable multiplayer gameplay</li>
        <li>Process transactions and virtual currency</li>
        <li>Save your game progress</li>
        <li>Provide customer support</li>
      </ul>

      <h3>3.2 To Improve the Game</h3>
      <ul>
        <li>Analyze gameplay patterns</li>
        <li>Fix bugs and improve performance</li>
        <li>Develop new features</li>
        <li>Balance game difficulty</li>
        <li>Personalize your experience</li>
      </ul>

      <h3>3.3 For Communication</h3>
      <ul>
        <li>Send game updates and announcements</li>
        <li>Notify about tournaments and events</li>
        <li>Respond to support requests</li>
        <li>Send promotional offers (with your consent)</li>
      </ul>

      <h3>3.4 For Safety and Security</h3>
      <ul>
        <li>Detect and prevent cheating</li>
        <li>Investigate violations of Terms of Service</li>
        <li>Protect against fraud and abuse</li>
        <li>Ensure fair gameplay</li>
      </ul>

      <h2>4. How We Share Your Information</h2>

      <h3>4.1 We DO NOT sell your personal information</h3>

      <h3>4.2 We may share information with:</h3>
      <ul>
        <li><strong>Service Providers:</strong> Supabase (database), Stripe (payments), Vercel (hosting)</li>
        <li><strong>Analytics Partners:</strong> Google Analytics (anonymized data)</li>
        <li><strong>Legal Requirements:</strong> If required by law or court order</li>
        <li><strong>Business Transfers:</strong> In case of merger, acquisition, or sale of assets</li>
        <li><strong>With Your Consent:</strong> When you explicitly agree to sharing</li>
      </ul>

      <h3>4.3 Public Information</h3>
      <ul>
        <li>Username and avatar visible to other players</li>
        <li>Leaderboard rankings and statistics</li>
        <li>Tournament participation</li>
      </ul>

      <h2>5. Data Retention</h2>
      <p>We retain your information for as long as necessary to:</p>
      <ul>
        <li>Provide the Game services</li>
        <li>Comply with legal obligations</li>
        <li>Resolve disputes</li>
        <li>Enforce our agreements</li>
      </ul>
      <p>
        Account data is retained for 2 years after last activity. You may request deletion at any time.
      </p>

      <h2>6. Data Security</h2>
      <p>We implement industry-standard security measures:</p>
      <ul>
        <li>Encryption of data in transit (HTTPS/TLS)</li>
        <li>Encryption of sensitive data at rest</li>
        <li>Secure password hashing (bcrypt)</li>
        <li>Regular security audits</li>
        <li>Access controls and authentication</li>
        <li>Rate limiting and DDoS protection</li>
      </ul>
      <p>
        However, no method of transmission over the Internet is 100% secure. We cannot guarantee absolute security.
      </p>

      <h2>7. Your Rights and Choices</h2>

      <h3>7.1 Access and Control</h3>
      <ul>
        <li><strong>Access:</strong> Request a copy of your personal data</li>
        <li><strong>Correction:</strong> Update incorrect information</li>
        <li><strong>Deletion:</strong> Request account deletion</li>
        <li><strong>Portability:</strong> Export your data in a readable format</li>
        <li><strong>Restriction:</strong> Limit how we process your data</li>
        <li><strong>Objection:</strong> Opt-out of certain data uses</li>
      </ul>

      <h3>7.2 Communication Preferences</h3>
      <ul>
        <li>Opt-out of promotional emails via unsubscribe link</li>
        <li>Disable push notifications in game settings</li>
        <li>Control in-game notifications in settings</li>
      </ul>

      <h3>7.3 Cookie Preferences</h3>
      <p>
        You can control cookies through your browser settings. Note that disabling cookies may affect game functionality.
      </p>

      <h2>8. Children's Privacy</h2>
      <p>
        The Game is not intended for children under 13. We do not knowingly collect personal information from
        children under 13. If we discover we have collected data from a child under 13, we will delete it immediately.
      </p>
      <p>
        Users aged 13-18 must have parental consent. Parents may contact us to review, modify, or delete their
        child's information.
      </p>

      <h2>9. International Data Transfers</h2>
      <p>
        Your information may be transferred to and processed in countries other than your own, including the United States.
        These countries may have different data protection laws. By using the Game, you consent to these transfers.
      </p>
      <p>
        For EU users, we ensure appropriate safeguards through Standard Contractual Clauses or other approved mechanisms.
      </p>

      <h2>10. California Privacy Rights (CCPA)</h2>
      <p>California residents have additional rights:</p>
      <ul>
        <li>Right to know what personal information is collected</li>
        <li>Right to know if personal information is sold or disclosed</li>
        <li>Right to opt-out of sale (we don't sell your data)</li>
        <li>Right to non-discrimination for exercising rights</li>
      </ul>
      <p>
        To exercise these rights, contact us at privacy@dominauts.com
      </p>

      <h2>11. European Privacy Rights (GDPR)</h2>
      <p>EU residents have additional rights:</p>
      <ul>
        <li>Legal basis for processing (legitimate interest, consent, contract)</li>
        <li>Right to withdraw consent</li>
        <li>Right to lodge a complaint with supervisory authority</li>
        <li>Information about automated decision-making (not used)</li>
      </ul>

      <h2>12. Third-Party Services</h2>
      <p>The Game may contain links to third-party services. We are not responsible for their privacy practices:</p>
      <ul>
        <li><strong>Stripe:</strong> Payment processing - <a href="https://stripe.com/privacy">Privacy Policy</a></li>
        <li><strong>Google Analytics:</strong> Usage analytics - <a href="https://policies.google.com/privacy">Privacy Policy</a></li>
        <li><strong>Supabase:</strong> Database services - <a href="https://supabase.com/privacy">Privacy Policy</a></li>
      </ul>

      <h2>13. Changes to This Privacy Policy</h2>
      <p>
        We may update this Privacy Policy periodically. We will notify you of material changes via email or in-game
        notification. The "Last Updated" date will be revised.
      </p>
      <p>
        Your continued use of the Game after changes constitutes acceptance of the updated Privacy Policy.
      </p>

      <h2>14. Contact Information</h2>
      <p>For privacy-related questions or to exercise your rights, contact us at:</p>
      <p>
        <strong>Data Protection Officer</strong><br />
        Email: privacy@dominauts.com<br />
        Address: Dominauts Inc.<br />
        123 Game Street<br />
        San Francisco, CA 94102<br />
        United States
      </p>
      <p>
        Response time: We aim to respond to all privacy requests within 30 days.
      </p>

      <h2>15. Data Protection Summary</h2>
      <div style={{ marginTop: '2rem', padding: '1rem', background: '#f0f0f0', borderRadius: '8px' }}>
        <p><strong>Your Privacy at a Glance:</strong></p>
        <ul>
          <li>✅ We NEVER sell your personal data</li>
          <li>✅ You can delete your account anytime</li>
          <li>✅ We use encryption to protect your data</li>
          <li>✅ You control your communication preferences</li>
          <li>✅ We minimize data collection</li>
          <li>✅ You can request your data or ask us to delete it</li>
          <li>✅ We are GDPR and CCPA compliant</li>
        </ul>
      </div>

      <h2>16. Cookie Policy</h2>
      <p>We use the following types of cookies:</p>
      <ul>
        <li><strong>Essential Cookies:</strong> Required for game functionality (session, authentication)</li>
        <li><strong>Performance Cookies:</strong> Help us improve the game (analytics, crash reports)</li>
        <li><strong>Preference Cookies:</strong> Remember your settings (language, sound preferences)</li>
      </ul>
      <p>
        You can manage cookies in your browser settings, but disabling essential cookies may prevent you from playing.
      </p>

      <p style={{ marginTop: '3rem', fontSize: '0.9rem', color: '#666' }}>
        © 2024 Dominauts™. All rights reserved. This Privacy Policy is part of our Terms of Service.
      </p>
    </div>
  );
};