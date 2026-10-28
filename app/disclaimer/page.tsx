/**
 * @file app/disclaimer/page.tsx
 * @description Financial, Investment, and Tax Disclaimer.
 * Provides explicit legal disclaimers regarding NEPSE market volatility, absence of fiduciary duty,
 * and informational nature of financial calculations and insights.
 */

import React from 'react';
import type { Metadata } from 'next';
import { DocPage, DocSection } from '@/components/DocPage';

export const metadata: Metadata = {
  title: 'Financial Disclaimer | FinanceDealer',
  description: 'Financial, tax, and investment disclaimers for FinanceDealer.',
};

const SECTIONS: DocSection[] = [
  {
    id: 'no-fiduciary',
    title: 'No fiduciary relationship or advisory status',
    body: (
      <p>
        Your use of FinanceDealer does not create any fiduciary, advisory, broker-dealer, or client relationship between you and FinanceDealer or its developers. We do not provide personalized financial planning or portfolio management services.
      </p>
    ),
  },
  {
    id: 'market-risk',
    title: 'NEPSE equity market volatility & risks',
    body: (
      <>
        <p>
          Investments in equity shares, debentures, mutual funds, and other instruments listed on the Nepal Stock Exchange (NEPSE) carry inherent market risk, including the possible loss of principal capital:
        </p>
        <ul>
          <li>Past historical stock performance is not an indicator of future returns or dividend payouts.</li>
          <li>Calculations regarding unrealized profit/loss, portfolio returns, or projected annual savings are mathematical estimates based strictly on user inputs and recent price snapshots.</li>
          <li>You should conduct independent due diligence or consult a SEBON-licensed investment advisor before executing trades.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'insights',
    title: 'Rule-based insights engine disclaimer',
    body: (
      <>
        <p>
          The automated observations surfaced within the platform (such as spending surge notifications, savings rate observations, or portfolio weight warnings) are rule-based mathematical evaluations of user-entered numbers against standard numerical thresholds.
        </p>
        <p>
          These observations do not represent AI predictions, market sentiment forecasts, or purchase/sell triggers. They are intended solely to help you observe trends in your own records.
        </p>
      </>
    ),
  },
  {
    id: 'tax',
    title: 'Nepal income tax estimates',
    body: (
      <p>
        Any tax calculators, bracket summaries, or salary deductions provided on the platform are simplified educational models based on general provisions of the Nepal Income Tax Act, 2058. Actual tax liabilities may differ based on individual allowances, marital status, medical tax credits, social security fund (SSF) contributions, and annual Finance Act amendments. Always verify your tax filings with a licensed Chartered Accountant (CA) or tax practitioner.
      </p>
    ),
  },
  {
    id: 'input-accuracy',
    title: 'User input accuracy',
    body: (
      <p>
        The accuracy of outputs, charts, savings summaries, and portfolio valuations depends entirely on the precision and timeliness of the financial figures entered by the user. FinanceDealer does not independently audit or verify transactions or holding quantities entered into the system.
      </p>
    ),
  },
];

export default function DisclaimerPage() {
  return (
    <DocPage
      title="Financial & investment disclaimer"
      note="FinanceDealer does arithmetic on your own numbers. It does not give advice."
      updated="September 17, 2026"
      summary={{
        title: 'In short',
        body: (
          <p>
            FinanceDealer is a calculation, ledger, and analytical software application. All calculations, performance metrics, projections, and automated observations are provided strictly for informational and personal budgeting purposes. <strong className="text-ink">Nothing on this website constitutes investment advice, stock trading recommendations, or tax counseling.</strong>
          </p>
        ),
      }}
      sections={SECTIONS}
    />
  );
}
