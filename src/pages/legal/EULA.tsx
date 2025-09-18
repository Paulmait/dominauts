import React from 'react';

export const EULA: React.FC = () => {
  return (
    <div style={{
      maxWidth: '800px',
      margin: '0 auto',
      padding: '2rem',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      lineHeight: '1.6',
      color: '#333'
    }}>
      <h1>End User License Agreement (EULA)</h1>
      <p><strong>Effective Date: September 17, 2025</strong></p>

      <p>
        This End User License Agreement ("Agreement") is a legal agreement between you ("User") and Cien Rios LLC,
        doing business as Dominauts™, governing your use of the Dominauts™ software and related
        services ("Game"). By downloading, installing, or using the Game, you agree to be bound by this Agreement.
      </p>

      <h2>1. License Grant</h2>
      <p>
        Cien Rios LLC grants you a revocable, non-exclusive, non-transferable, limited license to use the Game
        solely for your personal, non-commercial use, strictly in accordance with this Agreement.
      </p>

      <h2>2. Restrictions</h2>
      <p>You agree not to:</p>
      <ul>
        <li>(a) reverse engineer, decompile, or disassemble the Game;</li>
        <li>(b) modify, translate, or create derivative works;</li>
        <li>(c) rent, lease, or sublicense the Game; or</li>
        <li>(d) use the Game for any unlawful purpose.</li>
      </ul>

      <h2>3. Ownership</h2>
      <p>
        The Game is licensed, not sold. Cien Rios LLC retains all right, title, and interest in and to the Game,
        including all copyrights, trademarks, and other intellectual property rights.
      </p>

      <h2>4. Updates and Modifications</h2>
      <p>
        Cien Rios LLC may provide updates or modifications to the Game at any time. Such updates may be required
        for continued use.
      </p>

      <h2>5. Termination</h2>
      <p>
        This license is effective until terminated. It will terminate automatically without notice if you fail to
        comply with any provision. Upon termination, you must stop using and delete all copies of the Game.
      </p>

      <h2>6. Disclaimer of Warranties</h2>
      <p>
        The Game is provided "AS IS" and "AS AVAILABLE" without warranties of any kind. Cien Rios LLC disclaims
        all warranties, express or implied, including merchantability and fitness for a particular purpose.
      </p>

      <h2>7. Limitation of Liability</h2>
      <p>
        In no event shall Cien Rios LLC be liable for any indirect, incidental, special, or consequential damages,
        or for any loss of profits or data arising from your use of the Game.
      </p>

      <h2>8. Governing Law</h2>
      <p>
        This Agreement shall be governed by the laws of the State of Florida, without regard to conflict of laws
        principles.
      </p>

      <h2>9. Contact Information</h2>
      <p>
        If you have any questions about this Agreement, please contact us at:
      </p>
      <p>
        <strong>Cien Rios LLC</strong><br />
        <strong>Dominauts™</strong><br />
        1631 NE 115th St<br />
        Miami, FL 33181<br />
        Email: support@cienrios.com<br />
        Phone: +1 (786) 305-3045
      </p>

      <p style={{ marginTop: '3rem', fontSize: '0.9rem', color: '#666' }}>
        © 2025 Dominauts™ by Cien Rios LLC. All rights reserved.
      </p>
    </div>
  );
};