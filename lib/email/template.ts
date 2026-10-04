/**
 * @file lib/email/template.ts
 * @description Generates clean, accessible, and responsive HTML email templates
 * for Finance-Dealer recurring financial summaries.
 */

import { SummaryEmailReportData } from '@/types';
import { formatNepaliCurrency } from '@/lib/calculations/finance';

/**
 * Escapes HTML special characters to prevent HTML injection in emails.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Builds a complete responsive HTML string for the financial summary email.
 */
export function generateFinancialSummaryHtml(data: SummaryEmailReportData): string {
  const isWeekly = data.frequency === 'weekly';
  const frequencyTitle = isWeekly ? 'Weekly Financial Digest' : 'Monthly Financial Summary';
  const isPositiveSavings = data.netSavings >= 0;
  const isPortfolioProfit = data.totalProfitLoss >= 0;

  const appUrl = data.appUrl.replace(/\/+$/, '');
  const dashboardUrl = `${appUrl}/`;
  const expensesUrl = `${appUrl}/expenses`;
  const portfolioUrl = `${appUrl}/portfolio`;
  const settingsUrl = `${appUrl}/settings`;

  // Build Top Expense Categories snippet
  let topCategoriesHtml = '';
  if (data.topExpenseCategories && data.topExpenseCategories.length > 0) {
    const categoryRows = data.topExpenseCategories
      .slice(0, 5)
      .map(
        (cat) => `
        <tr>
          <td style="padding: 8px 12px; font-size: 13px; color: #374151; border-bottom: 1px solid #f3f4f6;">
            <strong>${escapeHtml(cat.category)}</strong>
          </td>
          <td style="padding: 8px 12px; font-size: 13px; color: #111827; text-align: right; font-family: monospace; border-bottom: 1px solid #f3f4f6;">
            ${formatNepaliCurrency(cat.amount)}
          </td>
          <td style="padding: 8px 12px; font-size: 12px; color: #6b7280; text-align: right; border-bottom: 1px solid #f3f4f6;">
            ${cat.percentage.toFixed(1)}%
          </td>
        </tr>
      `
      )
      .join('');

    topCategoriesHtml = `
      <div style="margin-top: 24px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px;">
        <h3 style="margin: 0 0 12px 0; font-size: 15px; font-weight: 700; color: #111827;">
          Top Expense Categories
        </h3>
        <table style="width: 100%; border-collapse: collapse; text-align: left;">
          <thead>
            <tr style="background-color: #f9fafb; font-size: 11px; text-transform: uppercase; color: #6b7280; letter-spacing: 0.05em;">
              <th style="padding: 8px 12px;">Category</th>
              <th style="padding: 8px 12px; text-align: right;">Amount</th>
              <th style="padding: 8px 12px; text-align: right;">% of Total</th>
            </tr>
          </thead>
          <tbody>
            ${categoryRows}
          </tbody>
        </table>
      </div>
    `;
  }

  // Build NEPSE Holdings table snippet
  let holdingsHtml = '';
  if (data.holdings && data.holdings.length > 0) {
    const holdingRows = data.holdings
      .map((h) => {
        const isPos = h.profitLoss >= 0;
        const plColor = isPos ? '#059669' : '#dc2626';
        const plSign = isPos ? '+' : '';

        return `
          <tr>
            <td style="padding: 8px 12px; font-size: 13px; border-bottom: 1px solid #f3f4f6;">
              <span style="display: inline-block; background-color: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-weight: 700; color: #111827; font-size: 12px;">
                ${escapeHtml(h.symbol)}
              </span>
              <div style="font-size: 11px; color: #6b7280; margin-top: 2px;">${escapeHtml(h.companyName)}</div>
            </td>
            <td style="padding: 8px 12px; font-size: 13px; color: #374151; text-align: right; font-family: monospace; border-bottom: 1px solid #f3f4f6;">
              ${new Intl.NumberFormat('en-NP').format(h.shares)}
            </td>
            <td style="padding: 8px 12px; font-size: 13px; color: #374151; text-align: right; font-family: monospace; border-bottom: 1px solid #f3f4f6;">
              ${formatNepaliCurrency(h.currentPrice)}
            </td>
            <td style="padding: 8px 12px; font-size: 13px; font-weight: 600; color: #111827; text-align: right; font-family: monospace; border-bottom: 1px solid #f3f4f6;">
              ${formatNepaliCurrency(h.currentValue)}
            </td>
            <td style="padding: 8px 12px; font-size: 13px; font-weight: 700; color: ${plColor}; text-align: right; font-family: monospace; border-bottom: 1px solid #f3f4f6;">
              ${plSign}${formatNepaliCurrency(h.profitLoss)} (${plSign}${h.profitLossPercentage.toFixed(2)}%)
            </td>
          </tr>
        `;
      })
      .join('');

    holdingsHtml = `
      <div style="margin-top: 24px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h3 style="margin: 0; font-size: 15px; font-weight: 700; color: #111827;">
            NEPSE Holdings Breakdown
          </h3>
          <span style="font-size: 12px; color: #6b7280;">${data.holdings.length} ${data.holdings.length === 1 ? 'position' : 'positions'}</span>
        </div>
        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; text-align: left;">
            <thead>
              <tr style="background-color: #f9fafb; font-size: 11px; text-transform: uppercase; color: #6b7280; letter-spacing: 0.05em;">
                <th style="padding: 8px 12px;">Symbol</th>
                <th style="padding: 8px 12px; text-align: right;">Shares</th>
                <th style="padding: 8px 12px; text-align: right;">Price</th>
                <th style="padding: 8px 12px; text-align: right;">Value</th>
                <th style="padding: 8px 12px; text-align: right;">Profit / Loss</th>
              </tr>
            </thead>
            <tbody>
              ${holdingRows}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // Encouraging empty state if user has no entries yet
  let emptyStateHtml = '';
  if (!data.hasActivity) {
    emptyStateHtml = `
      <div style="margin-top: 24px; background-color: #f0fdf4; border: 1px dashed #86efac; border-radius: 12px; padding: 24px; text-align: center;">
        <div style="font-size: 32px; margin-bottom: 8px;">📊</div>
        <h3 style="margin: 0 0 6px 0; font-size: 16px; font-weight: 700; color: #166534;">
          No Financial Activity Logged Yet
        </h3>
        <p style="margin: 0 0 16px 0; font-size: 13px; color: #15803d; line-height: 1.5; max-width: 480px; margin-left: auto; margin-right: auto;">
          Start tracking your salary, daily expenses, and NEPSE stock portfolio to see your automated net worth and savings insights here.
        </p>
        <div style="display: inline-block;">
          <a href="${expensesUrl}" style="display: inline-block; background-color: #059669; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 600; padding: 10px 18px; border-radius: 8px; margin: 4px;">
            + Log Income / Expense
          </a>
          <a href="${portfolioUrl}" style="display: inline-block; background-color: #ffffff; color: #059669; border: 1px solid #059669; text-decoration: none; font-size: 13px; font-weight: 600; padding: 10px 18px; border-radius: 8px; margin: 4px;">
            + Add NEPSE Stock
          </a>
        </div>
      </div>
    `;
  }

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${frequencyTitle}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #18181b;">
  <div style="max-width: 640px; margin: 0 auto; padding: 24px 16px;">
    
    <!-- Top Brand Header -->
    <div style="background-color: #059669; border-radius: 16px 16px 0 0; padding: 28px 24px; text-align: center; color: #ffffff;">
      <div style="display: inline-flex; align-items: center; justify-content: center; width: 44px; height: 44px; background-color: rgba(255, 255, 255, 0.2); border-radius: 10px; font-weight: 900; font-size: 18px; margin-bottom: 12px;">
        FD
      </div>
      <h1 style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.02em;">FinanceDealer</h1>
      <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.9; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600;">
        Nepali Personal Finance &amp; NEPSE OS
      </p>
    </div>

    <!-- Main Content Container -->
    <div style="background-color: #fafafa; border: 1px solid #e4e4e7; border-top: none; border-radius: 0 0 16px 16px; padding: 24px; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);">
      
      <!-- Greeting & Header Banner -->
      <div style="border-bottom: 1px solid #e5e7eb; padding-bottom: 16px; margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
          <div>
            <span style="display: inline-block; background-color: #d1fae5; color: #065f46; font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">
              ${frequencyTitle}
            </span>
            <h2 style="margin: 0; font-size: 18px; font-weight: 700; color: #111827;">
              Hello, ${escapeHtml(data.userEmail.split('@')[0])}
            </h2>
          </div>
          <div style="font-size: 12px; color: #6b7280; font-weight: 500;">
            ${escapeHtml(data.reportDate)}
          </div>
        </div>
        <p style="margin: 8px 0 0 0; font-size: 13px; color: #4b5563; line-height: 1.4;">
          Here is your automated financial overview covering recent cash flow, net savings rate, and NEPSE portfolio performance.
        </p>
      </div>

      <!-- Key Cash Flow Cards (2x2 Grid) -->
      <div style="margin-bottom: 20px;">
        <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 700; color: #374151; text-transform: uppercase; letter-spacing: 0.05em;">
          💵 Cash Flow &amp; Savings
        </h3>
        <table style="width: 100%; border-collapse: separate; border-spacing: 8px; margin-left: -8px; margin-right: -8px;">
          <tr>
            <td style="width: 50%; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px; vertical-align: top;">
              <div style="font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; margin-bottom: 4px;">
                Total Income
              </div>
              <div style="font-size: 18px; font-weight: 800; color: #059669; font-family: monospace;">
                ${formatNepaliCurrency(data.monthlyIncome)}
              </div>
            </td>
            <td style="width: 50%; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px; vertical-align: top;">
              <div style="font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; margin-bottom: 4px;">
                Total Expenses
              </div>
              <div style="font-size: 18px; font-weight: 800; color: #dc2626; font-family: monospace;">
                ${formatNepaliCurrency(data.monthlyExpenses)}
              </div>
            </td>
          </tr>
          <tr>
            <td style="width: 50%; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px; vertical-align: top;">
              <div style="font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; margin-bottom: 4px;">
                Net Savings
              </div>
              <div style="font-size: 18px; font-weight: 800; color: ${isPositiveSavings ? '#059669' : '#dc2626'}; font-family: monospace;">
                ${formatNepaliCurrency(data.netSavings)}
              </div>
            </td>
            <td style="width: 50%; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px; vertical-align: top;">
              <div style="font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; margin-bottom: 4px;">
                Savings Rate
              </div>
              <div style="font-size: 18px; font-weight: 800; color: #111827; font-family: monospace;">
                ${data.savingsRate.toFixed(1)}%
              </div>
            </td>
          </tr>
        </table>
      </div>

      <!-- Key Portfolio Cards (2x2 Grid) -->
      <div style="margin-bottom: 20px;">
        <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 700; color: #374151; text-transform: uppercase; letter-spacing: 0.05em;">
          📈 NEPSE Portfolio
        </h3>
        <table style="width: 100%; border-collapse: separate; border-spacing: 8px; margin-left: -8px; margin-right: -8px;">
          <tr>
            <td style="width: 50%; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px; vertical-align: top;">
              <div style="font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; margin-bottom: 4px;">
                Cost Basis (Invested)
              </div>
              <div style="font-size: 18px; font-weight: 800; color: #374151; font-family: monospace;">
                ${formatNepaliCurrency(data.totalInvested)}
              </div>
            </td>
            <td style="width: 50%; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px; vertical-align: top;">
              <div style="font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; margin-bottom: 4px;">
                Current Portfolio Value
              </div>
              <div style="font-size: 18px; font-weight: 800; color: #111827; font-family: monospace;">
                ${formatNepaliCurrency(data.totalPortfolioValue)}
              </div>
            </td>
          </tr>
          <tr>
            <td style="width: 50%; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px; vertical-align: top;">
              <div style="font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; margin-bottom: 4px;">
                Unrealized Profit / Loss
              </div>
              <div style="font-size: 18px; font-weight: 800; color: ${isPortfolioProfit ? '#059669' : '#dc2626'}; font-family: monospace;">
                ${isPortfolioProfit ? '+' : ''}${formatNepaliCurrency(data.totalProfitLoss)}
              </div>
            </td>
            <td style="width: 50%; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px; vertical-align: top;">
              <div style="font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; margin-bottom: 4px;">
                Overall Return %
              </div>
              <div style="font-size: 18px; font-weight: 800; color: ${isPortfolioProfit ? '#059669' : '#dc2626'}; font-family: monospace;">
                ${data.totalProfitLossPercentage >= 0 ? '+' : ''}${data.totalProfitLossPercentage.toFixed(2)}%
              </div>
            </td>
          </tr>
        </table>
      </div>

      <!-- Top Expense Categories Breakdown -->
      ${topCategoriesHtml}

      <!-- NEPSE Stock Holdings Table -->
      ${holdingsHtml}

      <!-- Empty State if no activity -->
      ${emptyStateHtml}

      <!-- Quick Action Button -->
      <div style="margin-top: 28px; text-align: center;">
        <a href="${dashboardUrl}" style="display: inline-block; background-color: #059669; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; padding: 12px 28px; border-radius: 10px; box-shadow: 0 2px 4px rgba(5, 150, 105, 0.2);">
          Open FinanceDealer Dashboard &rarr;
        </a>
      </div>

      <!-- Footer Info & Unsubscribe -->
      <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #6b7280; line-height: 1.6;">
        <p style="margin: 0 0 6px 0;">
          You are receiving this automated email because you opted in to recurring financial summaries.
        </p>
        <p style="margin: 0;">
          To change your email frequency or opt out anytime, manage your
          <a href="${settingsUrl}" style="color: #059669; font-weight: 600; text-decoration: underline;">
            Notification Preferences
          </a>.
        </p>
      </div>

    </div>
  </div>
</body>
</html>
  `.trim();
}
