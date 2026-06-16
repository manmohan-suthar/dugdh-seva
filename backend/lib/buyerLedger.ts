import { db } from '../db';

function toNumber(value: unknown) {
  const parsed = typeof value === 'number' ? value : parseFloat(String(value || 0));
  return Number.isFinite(parsed) ? parsed : 0;
}

function sortByDate(a: { date?: string; createdAt?: string }, b: { date?: string; createdAt?: string }) {
  const left = new Date(a.date || a.createdAt || 0).getTime();
  const right = new Date(b.date || b.createdAt || 0).getTime();
  return left - right;
}

export function rebuildBuyerLedgerForCustomer(customerId: string, dairyId: string) {
  const customerSales = db.sales
    .filter((sale) => sale.customerId === customerId && sale.dairyId === dairyId)
    .sort(sortByDate);

  const customerReceipts = db.receipts
    .filter((receipt) => receipt.customerId === customerId && receipt.dairyId === dairyId)
    .sort(sortByDate);

  for (const sale of customerSales) {
    const baseAmountPaid = toNumber(sale.initialAmountPaid ?? sale.amountPaid ?? 0);
    sale.initialAmountPaid = parseFloat(baseAmountPaid.toFixed(2));
    sale.amountPaid = parseFloat(baseAmountPaid.toFixed(2));
    sale.balanceDue = parseFloat(Math.max(0, toNumber(sale.totalAmount) - baseAmountPaid).toFixed(2));
  }

  for (const receipt of customerReceipts) {
    const selectedSales = customerSales
      .filter((sale) => (receipt.saleIds || []).includes(sale._id))
      .sort(sortByDate);

    let available = toNumber(receipt.amountReceived) + toNumber(receipt.creditUsed);
    const appliedSaleIds: string[] = [];
    let allocatedAmount = 0;

    for (const sale of selectedSales) {
      if (available <= 0) break;
      const due = Math.max(0, toNumber(sale.balanceDue));
      if (due <= 0) continue;

      const applied = Math.min(due, available);
      sale.amountPaid = parseFloat((toNumber(sale.amountPaid) + applied).toFixed(2));
      sale.balanceDue = parseFloat(Math.max(0, toNumber(sale.totalAmount) - toNumber(sale.amountPaid)).toFixed(2));
      available = parseFloat((available - applied).toFixed(2));
      allocatedAmount = parseFloat((allocatedAmount + applied).toFixed(2));
      appliedSaleIds.push(sale._id);
    }

    receipt.appliedSaleIds = Array.from(new Set(appliedSaleIds));
    const totalPaid = toNumber(receipt.amountReceived) + toNumber(receipt.creditUsed);
    receipt.balanceDue = parseFloat(Math.max(0, toNumber(receipt.totalAmount) - totalPaid).toFixed(2));
    receipt.creditRemaining = parseFloat(Math.max(0, available).toFixed(2));
    receipt.creditUsed = parseFloat(toNumber(receipt.creditUsed).toFixed(2));
    receipt.amountReceived = parseFloat(toNumber(receipt.amountReceived).toFixed(2));
    receipt.allocatedAmount = parseFloat(allocatedAmount.toFixed(2));
  }
}

export function getBuyerCreditRemaining(customerId: string, dairyId: string) {
  return db.receipts
    .filter((receipt) => receipt.customerId === customerId && receipt.dairyId === dairyId)
    .reduce((sum, receipt) => sum + toNumber(receipt.creditRemaining), 0);
}
