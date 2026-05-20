export type ExpenseCategory = 'LOYER' | 'SALAIRE' | 'MARKETING' | 'TRANSPORT' | 'EMBALLAGE' | 'AUTRE';
export type PaymentMethod   = 'ESPECES' | 'WAVE' | 'BANQUE' | 'AUTRE';

export interface ExpenseResponse {
  id: number;
  expenseDate: string;
  amount: number;
  description: string;
  category: ExpenseCategory;
  paymentMethod: PaymentMethod;
  reference?: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseRequest {
  expenseDate: string;
  amount: number;
  description: string;
  category: ExpenseCategory;
  paymentMethod?: PaymentMethod;
  reference?: string;
}

export interface ExpenseCategoryStat {
  category: ExpenseCategory;
  total: number;
  percent: number;
}

export interface CashFlowMonthItem {
  year: number;
  month: number;
  monthLabel: string;
  revenue: number;
  expenses: number;
  stockPurchases: number;
  netCashFlow: number;
}

export interface CashFlowResponse {
  periodDays: number;
  totalRevenue: number;
  totalExpenses: number;
  totalStockPurchases: number;
  netCashFlow: number;
  monthly: CashFlowMonthItem[];
}
