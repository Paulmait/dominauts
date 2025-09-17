import React from 'react';
import './LegalPages.css';

export const EULA: React.FC = () => {
  return (
    <div className="legal-container">
      <div className="legal-content">
        <h1>End User License Agreement (EULA)</h1>

        <div className="legal-header">
          <p><strong>Effective Date:</strong> September 17, 2025</p>
          <p><strong>Last Updated:</strong> September 17, 2025</p>
        </div>

        <p className="legal-intro">
          This End User License Agreement ("Agreement") is a legal agreement between you ("User")
          and Cien Rios LLC, doing business as Universal Domino™, governing your use of the
          Universal Domino™ software and related services ("Game"). By downloading, installing,
          or using the Game, you agree to be bound by this Agreement.
        </p>

        <section className="legal-section">
          <h2>1. License Grant</h2>
          <p>
            Cien Rios LLC grants you a revocable, non-exclusive, non-transferable, limited license
            to use the Game solely for your personal, non-commercial use, strictly in accordance
            with this Agreement.
          </p>
        </section>

        <section className="legal-section">
          <h2>2. Restrictions</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Reverse engineer, decompile, or disassemble the Game</li>
            <li>Modify, translate, or create derivative works</li>
            <li>Rent, lease, or sublicense the Game</li>
            <li>Use the Game for any unlawful purpose</li>
            <li>Remove, alter, or obscure any proprietary notice on the Game</li>
            <li>Use cheats, automation software, bots, or any unauthorized third-party software</li>
            <li>Exploit bugs, glitches, or errors in the Game</li>
            <li>Engage in any activity that disrupts or interferes with the Game</li>
            <li>Attempt to gain unauthorized access to any portion of the Game</li>
            <li>Use the Game for commercial purposes without written permission</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>3. Ownership</h2>
          <p>
            The Game is licensed, not sold. Cien Rios LLC retains all right, title, and interest
            in and to the Game, including all copyrights, trademarks, and other intellectual
            property rights. Universal Domino™ is a trademark of Cien Rios LLC.
          </p>
          <p>
            All content, features, and functionality of the Game, including but not limited to
            text, graphics, logos, icons, images, audio clips, video clips, data compilations,
            and software, are the exclusive property of Cien Rios LLC.
          </p>
        </section>

        <section className="legal-section">
          <h2>4. Updates and Modifications</h2>
          <p>
            Cien Rios LLC may provide updates or modifications to the Game at any time. Such
            updates may be required for continued use. Updates may modify or delete certain
            features and functionality. You agree that Cien Rios LLC has no obligation to provide
            any updates or to continue to provide particular features or functionality.
          </p>
          <p>
            By continuing to use the Game after any updates, you accept and agree to the updates
            and any associated changes to this Agreement.
          </p>
        </section>

        <section className="legal-section">
          <h2>5. User Content</h2>
          <p>
            If you create, submit, or share any content within the Game ("User Content"), you:
          </p>
          <ul>
            <li>Grant Cien Rios LLC a worldwide, non-exclusive, royalty-free license to use,
                reproduce, modify, and distribute your User Content</li>
            <li>Represent that you have all necessary rights to grant this license</li>
            <li>Agree that your User Content does not violate any third-party rights</li>
            <li>Acknowledge that Cien Rios LLC is not obligated to use or display your User Content</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>6. Privacy</h2>
          <p>
            Your use of the Game is also governed by our Privacy Policy, which is incorporated
            into this Agreement by reference. By using the Game, you consent to the collection
            and use of your information as described in the Privacy Policy.
          </p>
        </section>

        <section className="legal-section">
          <h2>7. In-App Purchases</h2>
          <p>
            The Game may offer in-app purchases. All purchases are final and non-refundable,
            except as required by applicable law. Virtual items have no monetary value and cannot
            be exchanged for cash. Cien Rios LLC may modify or discontinue virtual items at any time.
          </p>
        </section>

        <section className="legal-section">
          <h2>8. Termination</h2>
          <p>
            This license is effective until terminated. It will terminate automatically without
            notice if you fail to comply with any provision. Upon termination, you must stop using
            and delete all copies of the Game.
          </p>
          <p>
            Cien Rios LLC reserves the right to terminate this Agreement and your access to the
            Game at any time, for any reason, with or without notice. Sections 3, 6, 7, 9, 10,
            and 11 shall survive any termination of this Agreement.
          </p>
        </section>

        <section className="legal-section">
          <h2>9. Disclaimer of Warranties</h2>
          <p>
            THE GAME IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND.
            CIEN RIOS LLC DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED
            TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE,
            NON-INFRINGEMENT, AND THOSE ARISING FROM COURSE OF DEALING OR USAGE OF TRADE.
          </p>
          <p>
            Cien Rios LLC does not warrant that the Game will be uninterrupted, error-free,
            secure, or free of viruses or other harmful components. You assume all risk and
            responsibility for your use of the Game.
          </p>
        </section>

        <section className="legal-section">
          <h2>10. Limitation of Liability</h2>
          <p>
            IN NO EVENT SHALL CIEN RIOS LLC BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
            CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR FOR ANY LOSS OF PROFITS, REVENUE, DATA, OR
            USE, ARISING FROM YOUR USE OF THE GAME, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
          </p>
          <p>
            CIEN RIOS LLC'S TOTAL LIABILITY TO YOU FOR ALL DAMAGES SHALL NOT EXCEED THE AMOUNT
            YOU PAID TO CIEN RIOS LLC FOR THE GAME IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM,
            OR ONE HUNDRED DOLLARS ($100), WHICHEVER IS LESS.
          </p>
        </section>

        <section className="legal-section">
          <h2>11. Indemnification</h2>
          <p>
            You agree to indemnify, defend, and hold harmless Cien Rios LLC, its officers,
            directors, employees, agents, and affiliates from any claims, damages, losses,
            liabilities, costs, and expenses (including reasonable attorneys' fees) arising from:
          </p>
          <ul>
            <li>Your use or misuse of the Game</li>
            <li>Your violation of this Agreement</li>
            <li>Your violation of any third-party rights</li>
            <li>Your User Content</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>12. Governing Law</h2>
          <p>
            This Agreement shall be governed by the laws of the State of Florida, without regard
            to conflict of laws principles. Any disputes arising under this Agreement shall be
            resolved in the state or federal courts located in Miami-Dade County, Florida, and
            you consent to the personal jurisdiction of such courts.
          </p>
        </section>

        <section className="legal-section">
          <h2>13. Dispute Resolution</h2>
          <p>
            Any dispute arising out of or relating to this Agreement shall be resolved through
            binding arbitration in accordance with the rules of JAMS. The arbitration shall be
            conducted in Miami, Florida. You waive any right to a jury trial and any right to
            pursue claims on a class action basis.
          </p>
        </section>

        <section className="legal-section">
          <h2>14. General Provisions</h2>
          <ul>
            <li><strong>Entire Agreement:</strong> This Agreement constitutes the entire agreement
                between you and Cien Rios LLC regarding the Game</li>
            <li><strong>Severability:</strong> If any provision is found invalid or unenforceable,
                the remaining provisions shall continue in full force</li>
            <li><strong>Waiver:</strong> No waiver of any provision shall be deemed a further or
                continuing waiver of such provision</li>
            <li><strong>Assignment:</strong> You may not assign or transfer this Agreement.
                Cien Rios LLC may freely assign this Agreement</li>
            <li><strong>Force Majeure:</strong> Cien Rios LLC shall not be liable for any delay
                or failure to perform due to causes beyond its reasonable control</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>15. Contact Information</h2>
          <div className="contact-info">
            <p>If you have any questions about this Agreement, please contact us at:</p>
            <ul>
              <li><strong>Company:</strong> Cien Rios LLC</li>
              <li><strong>DBA:</strong> Universal Domino™</li>
              <li>📬 Address: 1631 NE 115th St, Miami, FL 33181</li>
              <li>📬 Suite Address: 3350 SW 148th Ave, Suite 110, Miramar, FL 33027</li>
              <li>📧 Email: <a href="mailto:support@cienrios.com">support@cienrios.com</a></li>
              <li>📞 Phone: +1 (786) 305-3045</li>
              <li>📞 Alternate: +1 (305) 814-1252</li>
              <li>🌐 Website: <a href="https://www.cienrios.com" target="_blank" rel="noopener noreferrer">www.cienrios.com</a></li>
            </ul>
          </div>
        </section>

        <section className="legal-section">
          <h2>16. Acknowledgment</h2>
          <p>
            BY DOWNLOADING, INSTALLING, OR USING THE GAME, YOU ACKNOWLEDGE THAT YOU HAVE READ
            THIS AGREEMENT, UNDERSTAND IT, AND AGREE TO BE BOUND BY ITS TERMS AND CONDITIONS.
          </p>
        </section>

        <div className="legal-footer">
          <p>&copy; 2025 Cien Rios LLC. All rights reserved.</p>
          <p>Universal Domino™ is a trademark of Cien Rios LLC.</p>
          <p>Effective Date: September 17, 2025</p>
        </div>
      </div>
    </div>
  );
};