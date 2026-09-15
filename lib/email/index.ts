/**
 * @file lib/email/index.ts
 * @description Email dispatch service utilizing Resend REST API.
 * Provides transactional email delivery for recurring financial summaries.
 */

import { generateFinancialSummaryHtml } from './template';
import { SummaryEmailReportData } from '@/types';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export interface SendEmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

/**
 * Sends an email using the Resend REST API.
 * If RESEND_API_KEY is not configured (e.g. during local testing), logs to console and returns simulated success.
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromAddress =
    options.from ||
    process.env.EMAIL_FROM ||
    'FinanceDealer <onboarding@resend.dev>';

  if (!apiKey) {
    console.warn(
      '[Email Service] RESEND_API_KEY is not configured. Email logged to console (Simulation mode):',
      {
        to: options.to,
        from: fromAddress,
        subject: options.subject,
      }
    );
    return {
      success: true,
      id: `simulated-${Date.now()}`,
    };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Email Service] Resend API error response:', data);
      return {
        success: false,
        error: data.message || data.error || `HTTP ${response.status}: Failed to send email`,
      };
    }

    return {
      success: true,
      id: data.id,
    };
  } catch (err: any) {
    console.error('[Email Service] Unexpected error sending email via Resend:', err);
    return {
      success: false,
      error: err.message || 'Internal network failure while communicating with email provider.',
    };
  }
}

/**
 * Convenience helper to render and dispatch a financial summary email.
 */
export async function sendFinancialSummaryEmail(
  reportData: SummaryEmailReportData
): Promise<SendEmailResult> {
  const frequencyLabel = reportData.frequency === 'weekly' ? 'Weekly' : 'Monthly';
  const subject = `Your ${frequencyLabel} Finance & NEPSE Portfolio Summary (${reportData.reportDate})`;
  const html = generateFinancialSummaryHtml(reportData);

  // Fallback plain text summary
  const text = `
FinanceDealer - ${frequencyLabel} Financial Summary
Date: ${reportData.reportDate}

CASH FLOW & SAVINGS:
- Monthly Income: Rs. ${reportData.monthlyIncome}
- Monthly Expenses: Rs. ${reportData.monthlyExpenses}
- Net Savings: Rs. ${reportData.netSavings}
- Savings Rate: ${reportData.savingsRate.toFixed(1)}%

NEPSE PORTFOLIO:
- Cost Basis (Invested): Rs. ${reportData.totalInvested}
- Current Portfolio Value: Rs. ${reportData.totalPortfolioValue}
- Unrealized Profit/Loss: Rs. ${reportData.totalProfitLoss} (${reportData.totalProfitLossPercentage.toFixed(2)}%)

View your full dashboard: ${reportData.appUrl}
Manage your notification settings: ${reportData.appUrl}/settings
  `.trim();

  return sendEmail({
    to: reportData.userEmail,
    subject,
    html,
    text,
  });
}
