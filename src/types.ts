export interface Dairy {
  _id: string;
  dairyName: string;
  ownerName: string;
  address: string;
  phone: string;
  createdAt: string;
}

export interface Customer {
  _id: string;
  customerId: number;
  name: string;
  phone: string;
  type: 'give' | 'take';
  milkType: 'cow' | 'buffalo';
  createdAt: string;
}

export interface ChartEntry {
  fat: number;
  snf: number;
  pricePerLiter: number;
}

export interface FatSNFChart {
  _id: string;
  animalType: 'cow' | 'buffalo';
  entries: ChartEntry[];
  updatedAt: string;
}

export interface MilkPriceEntry {
  _id: string;
  animalType: 'cow' | 'buffalo';
  pricePerLiter: number;
  updatedAt: string;
}

export interface MilkTransaction {
  _id: string;
  customerId: string;
  date: string;
  shift: 'morning' | 'evening';
  animalType: 'cow' | 'buffalo';
  liters: number;
  fat: number;
  snf: number;
  ratePerLiter: number;
  totalAmount: number;
  createdAt: string;
  customerName?: string;
  customerPhone?: string;
  customerSeqId?: number;
}

export interface MilkSaleTransaction {
  _id: string;
  customerId: string;
  date: string;
  animalType: 'cow' | 'buffalo';
  liters: number;
  ratePerLiter: number;
  totalAmount: number;
  initialAmountPaid?: number;
  amountPaid: number;
  balanceDue: number;
  notes: string;
  createdAt: string;
  customerName?: string;
  customerPhone?: string;
  customerSeqId?: number;
}

export interface BuyerReceipt {
  _id: string;
  customerId: string;
  date: string;
  saleIds: string[];
  openingBalance?: number;
  totalAmount: number;
  amountReceived: number;
  creditUsed?: number;
  creditRemaining?: number;
  allocatedAmount?: number;
  balanceDue: number;
  notes: string;
  createdAt: string;
  customerName?: string;
  customerSeqId?: number;
}

export interface Advance {
  _id: string;
  customerId: string;
  amount: number;
  originalAmount?: number;
  remainingAmount?: number;
  usedAmount?: number;
  date: string;
  notes: string;
  createdAt: string;
  customerName?: string;
  customerSeqId?: number;
}

export interface MilkPayment {
  _id: string;
  customerId: string;
  startDate: string;
  endDate: string;
  collectionIds: string[];
  totalAmount: number;
  openingBalance?: number;
  amountPaid: number;
  advanceUsed?: number;
  advanceCredit?: number;
  advanceCreditRemaining?: number;
  advanceCreditUsed?: number;
  balanceDue: number;
  notes: string;
  createdAt: string;
  customerName?: string;
  customerSeqId?: number;
}

export interface AnalyticsSummary {
  totalMilkCollected: number;
  totalMilkSold: number;
  totalCollectionAmount: number;
  totalSaleAmount: number;
  totalCustomersGiving: number;
  totalCustomersTaking: number;
  pendingDues: number;
  advancesGiven: number;
  advancesUsed?: number;
  advancesRemaining?: number;
  dailyBreakdown: Array<{
    date: string;
    collected: number;
    sold: number;
    collectedAmount: number;
    soldAmount: number;
    amount: number;
  }>;
}
