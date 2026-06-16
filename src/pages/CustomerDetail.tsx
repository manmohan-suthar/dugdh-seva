import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Phone, BadgeAlert, Plus, Trash2, Calendar, 
  MapPin, Coins, TrendingDown, TrendingUp, AlertCircle, Wallet, X, Pencil, CreditCard, List, CheckCircle2
} from 'lucide-react';
import api from '../api/client';
import { Customer, MilkTransaction, MilkSaleTransaction, Advance, MilkPayment, BuyerReceipt } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast, { ToastMessage } from '../components/Toast';
import { formatCurrency, formatLiters, formatDate } from '../lib/formatters';

export const CustomerDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [collections, setCollections] = useState<MilkTransaction[]>([]);
  const [sales, setSales] = useState<MilkSaleTransaction[]>([]);
  const [receipts, setReceipts] = useState<BuyerReceipt[]>([]);
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [payments, setPayments] = useState<MilkPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [activeHistoryTab, setActiveHistoryTab] = useState<'milk' | 'payments' | 'sales' | 'receipts'>('milk');

  // Modal Action States
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [advanceNotes, setAdvanceNotes] = useState('');
  const [isSavingAdvance, setIsSavingAdvance] = useState(false);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentStartDate, setPaymentStartDate] = useState('');
  const [paymentEndDate, setPaymentEndDate] = useState('');
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<string[]>([]);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [openingBalance, setOpeningBalance] = useState(0);
  const [advanceUseAmount, setAdvanceUseAmount] = useState('0');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isSavingPayment, setIsSavingPayment] = useState(false);
  const [showPaymentEditModal, setShowPaymentEditModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState<MilkPayment | null>(null);
  const [editPaymentAmount, setEditPaymentAmount] = useState('');
  const [editPaymentNotes, setEditPaymentNotes] = useState('');
  const [isSavingPaymentEdit, setIsSavingPaymentEdit] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptStartDate, setReceiptStartDate] = useState('');
  const [receiptEndDate, setReceiptEndDate] = useState('');
  const [selectedSaleIds, setSelectedSaleIds] = useState<string[]>([]);
  const [receiptAmount, setReceiptAmount] = useState('');
  const [openingSaleBalance, setOpeningSaleBalance] = useState(0);
  const [creditUseAmount, setCreditUseAmount] = useState('0');
  const [receiptNotes, setReceiptNotes] = useState('');
  const [isSavingReceipt, setIsSavingReceipt] = useState(false);
  const [showReceiptEditModal, setShowReceiptEditModal] = useState(false);
  const [editingReceipt, setEditingReceipt] = useState<BuyerReceipt | null>(null);
  const [editReceiptAmount, setEditReceiptAmount] = useState('');
  const [editCreditUseAmount, setEditCreditUseAmount] = useState('0');
  const [editReceiptNotes, setEditReceiptNotes] = useState('');
  const [isSavingReceiptEdit, setIsSavingReceiptEdit] = useState(false);
  const [showSaleEditModal, setShowSaleEditModal] = useState(false);
  const [editingSale, setEditingSale] = useState<MilkSaleTransaction | null>(null);
  const [editSaleLiters, setEditSaleLiters] = useState('');
  const [editSaleAmountPaid, setEditSaleAmountPaid] = useState('');
  const [editSaleDate, setEditSaleDate] = useState('');
  const [editSaleAnimalType, setEditSaleAnimalType] = useState<'cow' | 'buffalo'>('cow');
  const [editSaleNotes, setEditSaleNotes] = useState('');
  const [isSavingSaleEdit, setIsSavingSaleEdit] = useState(false);

  // Selected Entry Options Sheet
  const [selectedEntry, setSelectedEntry] = useState<{ id: string, type: 'collection' | 'sale' | 'payment' | 'receipt' } | null>(null);
  const [isDeletingEntry, setIsDeletingEntry] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCollection, setEditingCollection] = useState<MilkTransaction | null>(null);
  const [editLiters, setEditLiters] = useState('');
  const [editFat, setEditFat] = useState('');
  const [editSnf, setEditSnf] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editShift, setEditShift] = useState<'morning' | 'evening'>('morning');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  useEffect(() => {
    loadCustomerData();
  }, [id]);

  const loadCustomerData = async () => {
    setIsLoading(true);
    try {
      // 1. Load single customer details
      const custRes = await api.get(`/customers/${id}`);
      setCustomer(custRes.data);

      const targetType = custRes.data.type; // give or take
      setActiveHistoryTab(targetType === 'give' ? 'milk' : 'sales');

      if (targetType === 'give') {
        setSales([]);
        setReceipts([]);
        const collRes = await api.get('/collection', { params: { customerId: id } });
        setCollections(Array.isArray(collRes.data) ? collRes.data : []);
        const advRes = await api.get('/advances', { params: { customerId: id } });
        setAdvances(Array.isArray(advRes.data) ? advRes.data : []);
        const payRes = await api.get('/payments', { params: { customerId: id } });
        setPayments(Array.isArray(payRes.data) ? payRes.data : []);
      } else {
        setCollections([]);
        setAdvances([]);
        setPayments([]);
        const saleRes = await api.get('/sales', { params: { customerId: id } });
        setSales(Array.isArray(saleRes.data) ? saleRes.data : []);
        const receiptRes = await api.get('/receipts', { params: { customerId: id } });
        setReceipts(Array.isArray(receiptRes.data) ? receiptRes.data : []);
      }
    } catch (err: any) {
      console.error('Failed to load customer profile details:', err);
      setToast({ id: 'err', type: 'error', text: 'Grahak details load nahi ho sake.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer || !advanceAmount) return;

    setIsSavingAdvance(true);
    try {
      await api.post('/advances', {
        customerId: customer._id,
        amount: advanceAmount,
        notes: advanceNotes,
        date: new Date().toISOString()
      });

      setToast({ id: `adv-suc-${Date.now()}`, type: 'success', text: 'Advance register ho gya!' });
      setShowAdvanceModal(false);
      setAdvanceAmount('');
      setAdvanceNotes('');
      loadCustomerData(); // Reload
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to save advance.';
      setToast({ id: `adv-err-${Date.now()}`, type: 'error', text: msg });
    } finally {
      setIsSavingAdvance(false);
    }
  };

  const safePayments = useMemo(() => (Array.isArray(payments) ? payments : []), [payments]);
  const safeReceipts = useMemo(() => (Array.isArray(receipts) ? receipts : []), [receipts]);

  const paidCollectionIds = useMemo(() => {
    const ids = new Set<string>();
    safePayments.forEach((payment) => {
      (payment.collectionIds || []).forEach((collectionId) => ids.add(collectionId));
    });
    return ids;
  }, [safePayments]);

  const unpaidCollections = useMemo(() => (
    collections.filter((tx) => !paidCollectionIds.has(tx._id))
  ), [collections, paidCollectionIds]);

  const openPaymentModal = () => {
    const sortedCollections = [...unpaidCollections].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const firstCollectionDate = sortedCollections[0]?.date?.split('T')[0] || new Date().toISOString().split('T')[0];
    const initialStart = firstCollectionDate;
    const initialEnd = sortedCollections[sortedCollections.length - 1]?.date?.split('T')[0] || initialStart;

    setPaymentStartDate(initialStart);
    setPaymentEndDate(initialEnd);
    setPaymentNotes('');
    setShowPaymentModal(true);
  };

  const availableCollections = useMemo(() => {
    if (!customer || customer.type !== 'give') return [];
    const start = paymentStartDate ? new Date(paymentStartDate).getTime() : Number.NEGATIVE_INFINITY;
    const end = paymentEndDate ? new Date(paymentEndDate).getTime() + 86399999 : Number.POSITIVE_INFINITY;

    return [...unpaidCollections]
      .filter((tx) => {
        const time = new Date(tx.date).getTime();
        return time >= start && time <= end;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [unpaidCollections, paymentStartDate, paymentEndDate, customer]);

  const unpaidSales = useMemo(() => (
    sales.filter((sale) => (sale.balanceDue || 0) > 0)
  ), [sales]);

  const availableReceiptCredit = useMemo(() => (
    Math.max(
      0,
      safeReceipts.reduce((sum, receipt) => sum + (receipt.creditRemaining || 0), 0) -
      safeReceipts.reduce((sum, receipt) => sum + (receipt.creditUsed || 0), 0)
    )
  ), [safeReceipts]);

  const selectedSalesTotal = useMemo(() => (
    selectedSaleIds.reduce((sum, saleId) => {
      const sale = sales.find((item) => item._id === saleId);
      return sum + (sale?.balanceDue || 0);
    }, 0)
  ), [selectedSaleIds, sales]);

  const receiptTotalToSettle = openingSaleBalance + selectedSalesTotal;
  const receiptAdvanceValue = Math.max(0, parseFloat(creditUseAmount) || 0);
  const receiptBalancePreview = Math.max(0, receiptTotalToSettle - (parseFloat(receiptAmount) || 0) - receiptAdvanceValue);
  const receiptOverpayCredit = Math.max(0, (parseFloat(receiptAmount) || 0) + receiptAdvanceValue - receiptTotalToSettle);
  const autoReceiptPayNow = Math.max(0, receiptTotalToSettle - receiptAdvanceValue);

  const carryForwardBalance = useMemo(() => (
    safePayments.reduce((sum, payment) => sum + Math.max(payment.balanceDue || 0, 0), 0)
  ), [safePayments]);

  const totalAdvanceGiven = useMemo(() => (
    advances.reduce((sum, advance) => sum + (advance.amount || 0), 0)
  ), [advances]);

  const totalAdvanceUsed = useMemo(() => (
    advances.reduce((sum, advance) => sum + (advance.usedAmount || 0), 0) +
    safePayments.reduce((sum, payment) => sum + (payment.advanceCreditUsed || 0), 0)
  ), [advances, safePayments]);

  const paymentAdvanceCredit = useMemo(() => (
    safePayments.reduce((sum, payment) => sum + (payment.advanceCreditRemaining ?? payment.advanceCredit ?? 0), 0)
  ), [safePayments]);

  const totalAdvanceRemaining = Math.max(
    0,
    advances.reduce((sum, advance) => sum + (advance.remainingAmount ?? advance.amount ?? 0), 0) + paymentAdvanceCredit
  );

  useEffect(() => {
    if (!showPaymentModal) return;
    setSelectedCollectionIds(availableCollections.map((tx) => tx._id));
    const selectedTotal = availableCollections.reduce((sum, tx) => sum + (tx.totalAmount || 0), 0);
    setOpeningBalance(carryForwardBalance);
    setPaymentAmount((selectedTotal + carryForwardBalance) ? (selectedTotal + carryForwardBalance).toFixed(2) : '');
    setAdvanceUseAmount('0');
  }, [availableCollections, showPaymentModal, carryForwardBalance]);

  const selectedPaymentTotal = selectedCollectionIds.reduce((sum, id) => {
    const tx = collections.find((item) => item._id === id);
    return sum + (tx?.totalAmount || 0);
  }, 0);

  const advanceUseValue = Math.max(0, parseFloat(advanceUseAmount) || 0);
  const totalToSettle = openingBalance + selectedPaymentTotal;
  const paymentBalancePreview = Math.max(0, totalToSettle - (parseFloat(paymentAmount) || 0) - advanceUseValue);
  const paymentOverpayCredit = Math.max(0, (parseFloat(paymentAmount) || 0) + advanceUseValue - totalToSettle);
  const autoPayNowAmount = Math.max(0, totalToSettle - advanceUseValue);

  const handleAdvanceUseChange = (value: string) => {
    const parsed = Math.max(0, Math.min(totalAdvanceRemaining, parseFloat(value) || 0));
    setAdvanceUseAmount(String(parsed));
    const nextPayNow = Math.max(0, totalToSettle - parsed);
    setPaymentAmount(nextPayNow ? nextPayNow.toFixed(2) : '');
  };

  const toggleCollectionSelection = (collectionId: string) => {
    setSelectedCollectionIds((current) => (
      current.includes(collectionId)
        ? current.filter((id) => id !== collectionId)
        : [...current, collectionId]
    ));
  };

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer || selectedCollectionIds.length === 0) {
      setToast({ id: 'err-pay-empty', type: 'error', text: 'Kam se kam ek milk entry select karein.' });
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (Number.isNaN(amount) || amount < 0) {
      setToast({ id: 'err-pay-amount', type: 'error', text: 'Payment amount sahi number hona chahiye.' });
      return;
    }

    setIsSavingPayment(true);
    try {
      await api.post('/payments', {
        customerId: customer._id,
        startDate: paymentStartDate,
        endDate: paymentEndDate,
        collectionIds: selectedCollectionIds,
        openingBalance,
        amountPaid: amount,
        advanceUsed: advanceUseValue,
        notes: paymentNotes
      });

      setToast({ id: `pay-suc-${Date.now()}`, type: 'success', text: 'Payment history save ho gayi.' });
      setShowPaymentModal(false);
      setSelectedCollectionIds([]);
      setPaymentAmount('');
      setOpeningBalance(0);
      setAdvanceUseAmount('0');
      setPaymentNotes('');
      loadCustomerData();
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Payment save nahi ho payi.';
      setToast({ id: `pay-err-${Date.now()}`, type: 'error', text: msg });
    } finally {
      setIsSavingPayment(false);
    }
  };

  const openReceiptModal = () => {
    const sortedSales = [...unpaidSales].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const firstSaleDate = sortedSales[0]?.date?.split('T')[0] || new Date().toISOString().split('T')[0];
    const initialStart = firstSaleDate;
    const initialEnd = sortedSales[sortedSales.length - 1]?.date?.split('T')[0] || initialStart;

    setReceiptStartDate(initialStart);
    setReceiptEndDate(initialEnd);
    setSelectedSaleIds(sortedSales.map((tx) => tx._id));
    setOpeningSaleBalance(0);
    const selectedTotal = sortedSales.reduce((sum, tx) => sum + (tx.balanceDue || 0), 0);
    setReceiptAmount((selectedTotal || 0).toFixed(2));
    setCreditUseAmount('0');
    setReceiptNotes('');
    setShowReceiptModal(true);
  };

  const toggleSaleSelection = (saleId: string) => {
    setSelectedSaleIds((current) => (
      current.includes(saleId)
        ? current.filter((id) => id !== saleId)
        : [...current, saleId]
    ));
  };

  const handleCreditUseChange = (value: string) => {
    const parsed = Math.max(0, Math.min(availableReceiptCredit, parseFloat(value) || 0));
    setCreditUseAmount(String(parsed));
    const nextPayNow = Math.max(0, receiptTotalToSettle - parsed);
    setReceiptAmount(nextPayNow ? nextPayNow.toFixed(2) : '');
  };

  useEffect(() => {
    if (!showReceiptModal) return;

    const start = receiptStartDate ? new Date(receiptStartDate).getTime() : Number.NEGATIVE_INFINITY;
    const end = receiptEndDate ? new Date(receiptEndDate).getTime() + 86399999 : Number.POSITIVE_INFINITY;
    const filteredSales = sales
      .filter((sale) => (sale.balanceDue || 0) > 0)
      .filter((sale) => {
        const time = new Date(sale.date).getTime();
        return time >= start && time <= end;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    setSelectedSaleIds(filteredSales.map((tx) => tx._id));
    setOpeningSaleBalance(0);
    const selectedTotal = filteredSales.reduce((sum, tx) => sum + (tx.balanceDue || 0), 0);
    setReceiptAmount((selectedTotal || 0).toFixed(2));
    setCreditUseAmount('0');
  }, [sales, showReceiptModal, receiptStartDate, receiptEndDate]);

  const handleCreateReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer || selectedSaleIds.length === 0) {
      setToast({ id: 'err-receipt-empty', type: 'error', text: 'Kam se kam ek sale select karein.' });
      return;
    }

    const amount = parseFloat(receiptAmount);
    if (Number.isNaN(amount) || amount < 0) {
      setToast({ id: 'err-receipt-amount', type: 'error', text: 'Payment amount sahi number hona chahiye.' });
      return;
    }

    setIsSavingReceipt(true);
    try {
      await api.post('/receipts', {
        customerId: customer._id,
        date: receiptStartDate,
        saleIds: selectedSaleIds,
        openingBalance: openingSaleBalance,
        amountReceived: amount,
        creditUsed: receiptAdvanceValue,
        notes: receiptNotes
      });

      setToast({ id: `receipt-suc-${Date.now()}`, type: 'success', text: 'Payment history save ho gayi.' });
      setShowReceiptModal(false);
      setSelectedSaleIds([]);
      setReceiptAmount('');
      setOpeningSaleBalance(0);
      setCreditUseAmount('0');
      setReceiptNotes('');
      loadCustomerData();
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Payment save nahi ho payi.';
      setToast({ id: `receipt-err-${Date.now()}`, type: 'error', text: msg });
    } finally {
      setIsSavingReceipt(false);
    }
  };

  const openEditReceipt = () => {
    if (!selectedEntry || selectedEntry.type !== 'receipt') return;
    const current = safeReceipts.find((receipt) => receipt._id === selectedEntry.id);
    if (!current) return;

    setEditingReceipt(current);
    setEditReceiptAmount(String(current.amountReceived));
    setEditCreditUseAmount(String(current.creditUsed || 0));
    setEditReceiptNotes(current.notes || '');
    setShowReceiptEditModal(true);
    setSelectedEntry(null);
  };

  const handleSaveReceiptEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReceipt) return;

    const amount = parseFloat(editReceiptAmount);
    if (Number.isNaN(amount) || amount < 0) {
      setToast({ id: 'err-edit-receipt-amount', type: 'error', text: 'Payment amount sahi number hona chahiye.' });
      return;
    }

    setIsSavingReceiptEdit(true);
    try {
      await api.put(`/receipts/${editingReceipt._id}`, {
        amountReceived: amount,
        creditUsed: parseFloat(editCreditUseAmount) || 0,
        notes: editReceiptNotes
      });
      setToast({ id: `receipt-edit-suc-${Date.now()}`, type: 'success', text: 'Payment update ho gayi.' });
      setShowReceiptEditModal(false);
      setEditingReceipt(null);
      loadCustomerData();
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Payment edit save nahi ho paya.';
      setToast({ id: `receipt-edit-err-${Date.now()}`, type: 'error', text: msg });
    } finally {
      setIsSavingReceiptEdit(false);
    }
  };

  const openEditSale = () => {
    if (!selectedEntry || selectedEntry.type !== 'sale') return;
    const current = sales.find((sale) => sale._id === selectedEntry.id);
    if (!current) return;

    setEditingSale(current);
    setEditSaleLiters(String(current.liters));
    setEditSaleAmountPaid(String(current.amountPaid));
    setEditSaleDate(current.date.split('T')[0]);
    setEditSaleAnimalType(current.animalType || 'cow');
    setEditSaleNotes(current.notes || '');
    setShowSaleEditModal(true);
    setSelectedEntry(null);
  };

  const handleSaveSaleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSale) return;

    const liters = parseFloat(editSaleLiters);
    const amountPaidValue = parseFloat(editSaleAmountPaid);
    if (Number.isNaN(liters) || liters < 0 || Number.isNaN(amountPaidValue) || amountPaidValue < 0) {
      setToast({ id: 'err-edit-sale', type: 'error', text: 'Sale values sahi number hone chahiye.' });
      return;
    }

    setIsSavingSaleEdit(true);
    try {
      await api.put(`/sales/${editingSale._id}`, {
        liters,
        amountPaid: amountPaidValue,
        animalType: editSaleAnimalType,
        date: editSaleDate,
        notes: editSaleNotes
      });
      setToast({ id: `sale-edit-suc-${Date.now()}`, type: 'success', text: 'Sale update ho gayi.' });
      setShowSaleEditModal(false);
      setEditingSale(null);
      loadCustomerData();
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Sale edit save nahi ho paya.';
      setToast({ id: `sale-edit-err-${Date.now()}`, type: 'error', text: msg });
    } finally {
      setIsSavingSaleEdit(false);
    }
  };

  const openEditPayment = () => {
    if (!selectedEntry || selectedEntry.type !== 'payment') return;
    const current = safePayments.find((payment) => payment._id === selectedEntry.id);
    if (!current) return;

    setEditingPayment(current);
    setEditPaymentAmount(String(current.amountPaid));
    setEditPaymentNotes(current.notes || '');
    setShowPaymentEditModal(true);
    setSelectedEntry(null);
  };

  const handleSavePaymentEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayment) return;

    const amount = parseFloat(editPaymentAmount);
    if (Number.isNaN(amount) || amount < 0) {
      setToast({ id: 'err-edit-pay-amount', type: 'error', text: 'Payment amount sahi number hona chahiye.' });
      return;
    }

    setIsSavingPaymentEdit(true);
    try {
      await api.put(`/payments/${editingPayment._id}`, {
        amountPaid: amount,
        openingBalance: editingPayment.openingBalance || 0,
        advanceUsed: editingPayment.advanceUsed || 0,
        notes: editPaymentNotes
      });
      setToast({ id: `pay-edit-suc-${Date.now()}`, type: 'success', text: 'Payment update ho gayi.' });
      setShowPaymentEditModal(false);
      setEditingPayment(null);
      loadCustomerData();
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Payment edit save nahi ho paya.';
      setToast({ id: `pay-edit-err-${Date.now()}`, type: 'error', text: msg });
    } finally {
      setIsSavingPaymentEdit(false);
    }
  };

  const openEditCollection = () => {
    if (!selectedEntry || selectedEntry.type !== 'collection') return;
    const current = collections.find((tx) => tx._id === selectedEntry.id);
    if (!current) return;

    setEditingCollection(current);
    setEditLiters(String(current.liters));
    setEditFat(String(current.fat));
    setEditSnf(String(current.snf));
    setEditDate(current.date.split('T')[0]);
    setEditShift(current.shift || 'morning');
    setShowEditModal(true);
    setSelectedEntry(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCollection) return;

    setIsSavingEdit(true);
    try {
      await api.put(`/collection/${editingCollection._id}`, {
        liters: editLiters,
        fat: editFat,
        snf: editSnf,
        date: editDate,
        shift: editShift
      });
      setToast({ id: `edit-suc-${Date.now()}`, type: 'success', text: 'Collection update ho gayi.' });
      setShowEditModal(false);
      setEditingCollection(null);
      loadCustomerData();
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Edit save nahi ho saka.';
      setToast({ id: `edit-err-${Date.now()}`, type: 'error', text: msg });
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!customer) return;
    if (!window.confirm('Kya aap sachme is grahak ko delete karna chahte hain? Unka sara transaction history delete ho jayega.')) return;

    try {
      await api.delete(`/customers/${customer._id}`);
      alert('Grahak successfully delete ho gya.');
      navigate('/customers');
    } catch (err) {
      console.error(err);
      setToast({ id: 'err-del', type: 'error', text: 'Delete failed.' });
    }
  };

  const handleDeleteTransaction = async () => {
    if (!selectedEntry) return;

    const confirm = window.confirm('Kya aap is entry ko delete karna chahte hain?');
    if (!confirm) return;

    setIsDeletingEntry(true);
    try {
      const endpoint = selectedEntry.type === 'collection'
        ? `/collection/${selectedEntry.id}`
        : selectedEntry.type === 'payment'
          ? `/payments/${selectedEntry.id}`
          : selectedEntry.type === 'receipt'
            ? `/receipts/${selectedEntry.id}`
            : `/sales/${selectedEntry.id}`;
      await api.delete(endpoint);
      setToast({
        id: 'tx-del-suc',
        type: 'success',
        text: selectedEntry.type === 'payment' || selectedEntry.type === 'receipt'
          ? 'Payment delete ho gayi. Ledger update ho gaya.'
          : 'Entry delete ho gayi!'
      });
      setSelectedEntry(null);
      loadCustomerData(); // Reload
    } catch (err: any) {
      console.error(err);
      setToast({ id: 'tx-del-err', type: 'error', text: 'Delete failed.' });
    } finally {
      setIsDeletingEntry(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-dairy-bg">
        <LoadingSpinner message="Grahak ka khata taiyar ho raha hai..." />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex-1 p-6 text-center text-text-primary bg-dairy-bg">
        <p className="font-semibold">Grahak details nahi mile.</p>
        <button onClick={() => navigate('/customers')} className="mt-4 px-4 py-2 bg-primary text-white text-xs font-semibold rounded-xl">
          Back to Grahak Register
        </button>
      </div>
    );
  }

  const isDeneWala = customer.type === 'give';

  // Compute stats metrics
  let totalLiters = 0;
  let totalAmount = 0;
  let amountPaid = 0;
  let balanceDue = 0;
  let totalAdvances = 0;
  let totalPayments = 0;
  let totalAdvanceUsedOverall = 0;
  let pendingLiters = 0;
  let pendingMilkAmount = 0;
  let buyerCreditAvailable = 0;

  if (isDeneWala) {
    totalLiters = collections.reduce((acc, curr) => acc + curr.liters, 0);
    totalAmount = collections.reduce((acc, curr) => acc + curr.totalAmount, 0);
    totalAdvances = advances.reduce((acc, curr) => acc + (curr.originalAmount ?? curr.amount ?? 0), 0);
    totalPayments = safePayments.reduce((acc, curr) => acc + curr.amountPaid, 0);
    totalAdvanceUsedOverall = advances.reduce((acc, curr) => acc + (curr.usedAmount || 0), 0) +
      safePayments.reduce((acc, curr) => acc + (curr.advanceCreditUsed || 0), 0);
    pendingLiters = unpaidCollections.reduce((acc, curr) => acc + curr.liters, 0);
    pendingMilkAmount = unpaidCollections.reduce((acc, curr) => acc + curr.totalAmount, 0);
    balanceDue = parseFloat((totalAmount - totalPayments).toFixed(2));
  } else {
    totalLiters = sales.reduce((acc, curr) => acc + curr.liters, 0);
    totalAmount = sales.reduce((acc, curr) => acc + curr.totalAmount, 0);
    amountPaid = sales.reduce((acc, curr) => acc + curr.amountPaid, 0);
    balanceDue = sales.reduce((acc, curr) => acc + curr.balanceDue, 0);
    buyerCreditAvailable = Math.max(
      0,
      receipts.reduce((acc, curr) => acc + (curr.creditRemaining || 0), 0) -
      receipts.reduce((acc, curr) => acc + (curr.creditUsed || 0), 0)
    );
  }

  const netAmountAfterAdvance = isDeneWala
    ? parseFloat((balanceDue - totalAdvanceRemaining).toFixed(2))
    : parseFloat((balanceDue - buyerCreditAvailable).toFixed(2));
  const amountToPayNow = isDeneWala ? Math.max(0, netAmountAfterAdvance) : totalAmount;
  const amountToCollectNow = isDeneWala ? amountToPayNow : Math.max(0, netAmountAfterAdvance);
  const buyerAmountReceived = safeReceipts.reduce((sum, receipt) => sum + (receipt.amountReceived || 0), 0);
  const buyerTotalGiven = buyerAmountReceived;

  return (
    <div className="flex flex-col flex-1 px-4 pt-6 pb-24 relative animate-fade-in-up">
      {/* Toast notifications */}
      {toast && (
        <Toast 
          message={toast.text} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}

      {/* Top navbar */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/customers')} className="p-2 -ml-2 hover:bg-border-dairy rounded-full tap-feedback text-text-primary">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="font-display font-extrabold text-lg text-text-primary">
            {customer.name}
          </h2>
        </div>
        <button 
          onClick={handleDeleteCustomer}
          className="p-2.5 bg-red-50 hover:bg-red-100 text-danger-dairy rounded-full transition-colors tap-feedback"
          aria-label="Delete Customer Profile"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Profile Section Box */}
      <div className="p-4 bg-white border border-border-dairy rounded-2xl shadow-xs relative overflow-hidden mb-4">
        <div className="absolute right-3.5 top-3.5">
          <span className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-mono font-black text-sm shadow-inner">
            #{customer.customerId}
          </span>
        </div>

        <span className={`inline-block px-2.5 py-0.5 text-[9px] font-bold uppercase rounded-md tracking-wider mb-2 ${
          customer.type === 'give' ? 'bg-green-100 text-primary' : 'bg-amber-100 text-accent'
        }`}>
          {customer.type === 'give' ? 'Dene Wala (Seller)' : 'Lene Wala (Buyer)'}
        </span>
        <h3 className="font-display font-extrabold text-xl text-text-primary leading-tight">
          {customer.name}
        </h3>
        <div className="space-y-1 mt-2.5">
          <p className="text-xs font-semibold text-text-muted flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-text-muted" /> {customer.phone || 'No Phone Register'}
          </p>
          <p className="text-xs font-semibold text-text-muted flex items-center gap-1.5 uppercase">
            🥛 Animal Pre-fill: <span className="font-bold text-text-primary">{customer.milkType}</span>
          </p>
        </div>
      </div>

      {/* 2x2 Metric Summary Grid */}
      <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-2">
        Khata Summary
      </h4>
      <div className="grid grid-cols-2 gap-3 mb-5">
        {/* Metric 1 */}
        <div className="p-3 bg-white border border-border-dairy rounded-xl relative shadow-xs">
          <span className="text-[10px] text-text-muted font-bold uppercase">
            {isDeneWala ? 'Payable Liters' : 'Total Liters'}
          </span>
          <p className="font-display font-extrabold text-base text-text-primary mt-1">
            {formatLiters(isDeneWala ? pendingLiters : totalLiters)}
          </p>
          <TrendingDown className="absolute right-3.5 bottom-3 w-4 h-4 text-primary" />
        </div>

        {/* Metric 2 */}
        <div className="p-3 bg-white border border-border-dairy rounded-xl relative shadow-xs">
          <span className="text-[10px] text-text-muted font-bold uppercase">
            {isDeneWala ? 'Amount To Collect Now' : 'Total Amount'}
          </span>
          <p className={`font-display font-extrabold text-base mt-1 ${isDeneWala && netAmountAfterAdvance < 0 ? 'text-indigo-600' : 'text-text-primary'}`}>
            {formatCurrency(isDeneWala ? amountToPayNow : totalAmount)}
          </p>
          {isDeneWala && (
            <p className={`text-[10px] font-semibold mt-1 ${netAmountAfterAdvance < 0 ? 'text-indigo-600' : 'text-text-muted'}`}>
              {netAmountAfterAdvance < 0 ? 'Customer will get back credit' : 'Net after advance'}: {formatCurrency(netAmountAfterAdvance)}
            </p>
          )}
          <TrendingUp className="absolute right-3.5 bottom-3 w-4 h-4 text-accent" />
        </div>

        {/* Metric 3 / 4 Conditional giving / taking details */}
        {isDeneWala ? (
          <>
            <div className="p-3 bg-white border border-border-dairy rounded-xl relative shadow-xs">
              <span className="text-[10px] text-text-muted font-bold uppercase">Total Milk Liters</span>
              <p className="font-display font-extrabold text-base text-text-primary mt-1">
                {formatLiters(totalLiters)}
              </p>
              <TrendingDown className="absolute right-3.5 bottom-3 w-4 h-4 text-primary" />
            </div>
            <div className="p-3 bg-white border border-border-dairy rounded-xl relative shadow-xs">
              <span className="text-[10px] text-text-muted font-bold uppercase">Total Milk Amount</span>
              <p className="font-display font-black text-base text-text-primary mt-1">
                {formatCurrency(totalAmount)}
              </p>
              <Coins className="absolute right-3.5 bottom-3 w-4 h-4 text-accent" />
            </div>
            <div className="p-3 bg-white border border-border-dairy rounded-xl relative shadow-xs">
              <span className="text-[10px] text-text-muted font-bold uppercase">Advance Remaining</span>
              <p className="font-display font-extrabold text-base text-indigo-600 mt-1">
                {formatCurrency(totalAdvanceRemaining)}
              </p>
              <p className="text-[10px] text-text-muted mt-0.5">
                Total {formatCurrency(totalAdvanceGiven)} | Used {formatCurrency(totalAdvanceUsedOverall)}
              </p>
              <Wallet className="absolute right-3.5 bottom-3 w-4 h-4 text-indigo-500" />
            </div>
            <div className="p-3 bg-white border border-border-dairy rounded-xl relative shadow-xs">
              <span className="text-[10px] text-text-muted font-bold uppercase">Milk Balance Before Advance</span>
              <p className="font-display font-black text-base text-text-primary mt-1">
                {formatCurrency(balanceDue)}
              </p>
              <AlertCircle className="absolute right-3.5 bottom-3 w-4 h-4 text-danger-dairy" />
            </div>
          </>
        ) : (
          <>
            <div className="p-3 bg-white border border-border-dairy rounded-xl relative shadow-xs">
              <span className="text-[10px] text-text-muted font-bold uppercase">
                Total Sales Amount
              </span>
              <p className="font-display font-extrabold text-base text-text-primary mt-1">
                {formatCurrency(totalAmount)}
              </p>
              <Coins className="absolute right-3.5 bottom-3 w-4 h-4 text-accent" />
            </div>
            <div className="p-3 bg-white border border-border-dairy rounded-xl relative shadow-xs">
              <span className="text-[10px] text-text-muted font-bold uppercase">Amount Received</span>
              <p className="font-display font-extrabold text-base text-success-dairy mt-1">
                {formatCurrency(buyerAmountReceived)}
              </p>
              <AlertCircle className="absolute right-3.5 bottom-3 w-4 h-4 text-success-dairy" />
            </div>
            <div className="p-3 bg-white border border-border-dairy rounded-xl relative shadow-xs">
              <span className="text-[10px] text-text-muted font-bold uppercase">Amount To Collect Now</span>
              <p className="font-display font-black text-base text-danger-dairy mt-1">
                {formatCurrency(amountToCollectNow)}
              </p>
              <p className="text-[10px] text-text-muted mt-0.5">
                Due before credit: {formatCurrency(balanceDue)}
              </p>
              <AlertCircle className="absolute right-3.5 bottom-3 w-4 h-4 text-danger-dairy" />
            </div>
            <div className="p-3 bg-white border border-border-dairy rounded-xl relative shadow-xs">
              <span className="text-[10px] text-text-muted font-bold uppercase">Credit Left</span>
              <p className={`font-display font-black text-base mt-1 ${buyerCreditAvailable > 0 ? 'text-indigo-600' : 'text-text-primary'}`}>
                {formatCurrency(buyerCreditAvailable)}
              </p>
              <p className="text-[10px] text-text-muted mt-0.5">
                Total given: {formatCurrency(buyerTotalGiven)}
              </p>
              <Wallet className="absolute right-3.5 bottom-3 w-4 h-4 text-indigo-500" />
            </div>
          </>
        )}
      </div>

      {/* Conditional Add Advance control for suppliers */}
      {isDeneWala && (
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            id="btn-add-advance"
            onClick={() => setShowAdvanceModal(true)}
            className="py-3 border border-indigo-600 hover:bg-indigo-600/5 text-indigo-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all tap-feedback"
          >
            <Plus className="w-4 h-4" /> Advance
          </button>
          <button
            id="btn-add-payment"
            onClick={openPaymentModal}
            className="py-3 border border-[#2E7D32] hover:bg-green-50 text-[#2E7D32] text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all tap-feedback"
          >
            <CreditCard className="w-4 h-4" /> Pay
          </button>
        </div>
      )}
      {!isDeneWala && (
        <div className="grid grid-cols-1 gap-3 mb-6">
          <button
            id="btn-add-receipt"
            onClick={openReceiptModal}
            className="py-3 border border-[#2E7D32] hover:bg-green-50 text-[#2E7D32] text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all tap-feedback"
          >
            <CreditCard className="w-4 h-4" /> Pay
          </button>
        </div>
      )}

      {/* Transaction Streams */}
      <div className="flex items-center gap-2 mb-2.5">
        <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">
          Pichle Transactions (History)
        </h4>
        {isDeneWala ? (
          <div className="ml-auto grid grid-cols-2 bg-white border border-border-dairy rounded-xl p-1 h-9">
            <button
              type="button"
              onClick={() => setActiveHistoryTab('milk')}
              className={`text-[10px] font-bold rounded-lg transition-all ${
                activeHistoryTab === 'milk' ? 'bg-primary text-white' : 'text-text-muted'
              }`}
            >
              Milk History
            </button>
            <button
              type="button"
              onClick={() => setActiveHistoryTab('payments')}
              className={`text-[10px] font-bold rounded-lg transition-all ${
                activeHistoryTab === 'payments' ? 'bg-primary text-white' : 'text-text-muted'
              }`}
            >
              Payment History
            </button>
          </div>
        ) : (
          <div className="ml-auto grid grid-cols-2 bg-white border border-border-dairy rounded-xl p-1 h-9">
            <button
              type="button"
              onClick={() => setActiveHistoryTab('sales')}
              className={`text-[10px] font-bold rounded-lg transition-all ${
                activeHistoryTab === 'sales' ? 'bg-primary text-white' : 'text-text-muted'
              }`}
            >
              Transactions
            </button>
            <button
              type="button"
              onClick={() => setActiveHistoryTab('receipts')}
              className={`text-[10px] font-bold rounded-lg transition-all ${
                activeHistoryTab === 'receipts' ? 'bg-primary text-white' : 'text-text-muted'
              }`}
            >
              Payment History
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 max-h-[350px] no-scrollbar">
        {isDeneWala ? (
          activeHistoryTab === 'milk' ? (
            collections.length === 0 ? (
              <p className="text-center text-xs font-semibold text-text-muted py-8">Koi collection entries nahi mili.</p>
            ) : (
              collections.map((tx) => {
                const isPaid = paidCollectionIds.has(tx._id);
                return (
                <button
                  key={tx._id}
                  onClick={() => setSelectedEntry({ id: tx._id, type: 'collection' })}
                  className="w-full p-3.5 bg-white border border-border-dairy hover:bg-dairy-bg/30 rounded-xl text-left flex justify-between items-center transition-all shadow-xs tap-feedback"
                >
                  <div>
                    <span className="text-[9px] font-bold text-text-muted uppercase block leading-tight">
                      {formatDate(tx.date)}
                    </span>
                    <p className="font-display font-black text-[14px] text-text-primary mt-1">
                      {tx.liters.toFixed(2)}L • <span className="text-xs font-semibold text-text-muted">Rate ₹{tx.ratePerLiter}/L</span>
                    </p>
                    <span className="inline-block px-1.5 py-0.5 bg-dairy-bg text-[9px] font-bold text-text-muted rounded mr-1">
                      {tx.shift === 'morning' ? 'Subah' : 'Shaam'}
                    </span>
                    <span className="inline-block px-1.5 py-0.5 bg-dairy-bg text-[9px] font-extrabold text-green-700 rounded uppercase">
                      {tx.animalType}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-semibold text-text-muted">Total</span>
                    <p className="font-display font-black text-sm text-text-primary">
                      {formatCurrency(tx.totalAmount)}
                    </p>
                    {isPaid && (
                      <span className="mt-1 inline-flex items-center gap-1 text-[9px] font-bold text-success-dairy">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Paid
                      </span>
                    )}
                  </div>
                </button>
                );
              })
            )
          ) : (
            safePayments.length === 0 ? (
              <p className="text-center text-xs font-semibold text-text-muted py-8">Koi payment history nahi mili.</p>
            ) : (
              safePayments.map((payment) => (
                <button
                  key={payment._id}
                  onClick={() => setSelectedEntry({ id: payment._id, type: 'payment' })}
                  className="w-full p-3.5 bg-white border border-border-dairy hover:bg-dairy-bg/30 rounded-xl text-left flex justify-between items-start transition-all shadow-xs tap-feedback"
                >
                  <div>
                    <span className="text-[9px] font-bold text-text-muted uppercase block leading-tight">
                      {formatDate(payment.startDate)} - {formatDate(payment.endDate)}
                    </span>
                    <p className="font-display font-black text-[14px] text-text-primary mt-1">
                      Paid {formatCurrency(payment.amountPaid)}
                    </p>
                    <p className="text-[10px] text-text-muted mt-0.5">
                      Selected: {formatCurrency(payment.totalAmount)} | Balance: {formatCurrency(payment.balanceDue)}
                    </p>
                    {(payment.advanceUsed || 0) > 0 && (
                      <p className="text-[10px] text-indigo-700 mt-0.5 font-semibold">
                        Advance used: {formatCurrency(payment.advanceUsed || 0)}
                      </p>
                    )}
                    {payment.notes && (
                      <p className="text-[10px] text-text-muted mt-0.5 italic truncate max-w-[200px]">
                        "{payment.notes}"
                      </p>
                    )}
                  </div>
                  <span className={`text-[9px] font-bold ${payment.balanceDue > 0 ? 'text-danger-dairy' : 'text-success-dairy'}`}>
                    {payment.balanceDue > 0 ? 'Pending' : 'Settled'}
                  </span>
                </button>
              ))
            )
          )
        ) : activeHistoryTab === 'sales' ? (
          sales.length === 0 ? (
            <p className="text-center text-xs font-semibold text-text-muted py-8">Koi sales history nahi mili.</p>
          ) : (
            sales.map((tx) => (
              <button
                key={tx._id}
                onClick={() => setSelectedEntry({ id: tx._id, type: 'sale' })}
                className="w-full p-3.5 bg-white border border-border-dairy hover:bg-dairy-bg/30 rounded-xl text-left flex justify-between items-center transition-all shadow-xs tap-feedback hover:border-accent"
              >
                <div>
                  <span className="text-[9px] font-bold text-text-muted uppercase block leading-tight">
                    {formatDate(tx.date)}
                  </span>
                  <p className="font-display font-black text-[14px] text-text-primary mt-1">
                    {tx.liters.toFixed(2)}L • <span className="text-xs font-semibold text-text-muted">Rate ₹{tx.ratePerLiter}/L</span>
                  </p>
                  {tx.notes && (
                    <p className="text-[10px] text-text-muted mt-0.5 italic truncate max-w-[200px]">
                      "{tx.notes}"
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-display font-black text-sm text-text-primary">
                    {formatCurrency(tx.totalAmount)}
                  </p>
                  <span className={`text-[9px] font-bold ${tx.balanceDue > 0 ? 'text-danger-dairy' : 'text-success-dairy'}`}>
                    Paid: {formatCurrency(tx.amountPaid)}
                  </span>
                </div>
              </button>
            ))
          )
        ) : receipts.length === 0 ? (
          <p className="text-center text-xs font-semibold text-text-muted py-8">Koi payment history nahi mili.</p>
        ) : (
          receipts.map((receipt) => (
            <button
              key={receipt._id}
              onClick={() => setSelectedEntry({ id: receipt._id, type: 'receipt' })}
              className="w-full p-3.5 bg-white border border-border-dairy hover:bg-dairy-bg/30 rounded-xl text-left flex justify-between items-start transition-all shadow-xs tap-feedback"
            >
              <div>
                <span className="text-[9px] font-bold text-text-muted uppercase block leading-tight">
                  {formatDate(receipt.date)}
                </span>
                <p className="font-display font-black text-[14px] text-text-primary mt-1">
                  Paid {formatCurrency(receipt.amountReceived)}
                </p>
                <p className="text-[10px] text-text-muted mt-0.5">
                  Selected: {formatCurrency(receipt.totalAmount)} | Balance: {formatCurrency(receipt.balanceDue)}
                </p>
                {(receipt.creditUsed || 0) > 0 && (
                  <p className="text-[10px] text-indigo-700 mt-0.5 font-semibold">
                    Credit used: {formatCurrency(receipt.creditUsed || 0)}
                  </p>
                )}
                {(receipt.creditRemaining || 0) > 0 && (
                  <p className="text-[10px] text-green-700 mt-0.5 font-semibold">
                    Credit saved: {formatCurrency(receipt.creditRemaining || 0)}
                  </p>
                )}
                {receipt.notes && (
                  <p className="text-[10px] text-text-muted mt-0.5 italic truncate max-w-[200px]">
                    "{receipt.notes}"
                  </p>
                )}
              </div>
              <span className={`text-[9px] font-bold ${receipt.balanceDue > 0 ? 'text-danger-dairy' : 'text-success-dairy'}`}>
                {receipt.balanceDue > 0 ? 'Pending' : 'Settled'}
              </span>
            </button>
          ))
        )}
      </div>

      {/* Selected Transaction Options Sheet Modal */}
      {selectedEntry && (
      <div className="fixed inset-0 z-[80] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedEntry(null)} />
          <div className="relative bg-white w-full max-w-[430px] rounded-t-3xl p-5 shadow-2xl animate-fade-in-up z-10">
            <h3 className="font-display font-bold text-base text-text-primary mb-4 text-center border-b border-border-dairy pb-3">
              Transaction Settings
            </h3>
            {selectedEntry.type === 'collection' && (
              <button
                onClick={openEditCollection}
                className="w-full py-4 mb-3 text-[#2E7D32] hover:bg-green-50 text-sm font-bold border border-green-200 rounded-xl flex items-center justify-center gap-2 transition-all tap-feedback"
              >
                <Pencil className="w-4 h-4" /> Edit Entry
              </button>
            )}
            {selectedEntry.type === 'sale' && (
              <button
                onClick={openEditSale}
                className="w-full py-4 mb-3 text-[#2E7D32] hover:bg-green-50 text-sm font-bold border border-green-200 rounded-xl flex items-center justify-center gap-2 transition-all tap-feedback"
              >
                <Pencil className="w-4 h-4" /> Edit Sale
              </button>
            )}
            {selectedEntry.type === 'payment' && (
              <button
                onClick={openEditPayment}
                className="w-full py-4 mb-3 text-[#2E7D32] hover:bg-green-50 text-sm font-bold border border-green-200 rounded-xl flex items-center justify-center gap-2 transition-all tap-feedback"
              >
                <Pencil className="w-4 h-4" /> Edit Payment
              </button>
            )}
            {selectedEntry.type === 'receipt' && (
              <button
                onClick={openEditReceipt}
                className="w-full py-4 mb-3 text-[#2E7D32] hover:bg-green-50 text-sm font-bold border border-green-200 rounded-xl flex items-center justify-center gap-2 transition-all tap-feedback"
              >
                <Pencil className="w-4 h-4" /> Edit Payment
              </button>
            )}
            <button
              onClick={handleDeleteTransaction}
              disabled={isDeletingEntry}
              className="w-full py-4 text-danger-dairy hover:bg-red-50 text-sm font-bold border border-red-200 rounded-xl flex items-center justify-center gap-2 transition-all tap-feedback"
            >
              <Trash2 className="w-4 h-4" /> Remove Entry (Delete)
            </button>
            <button
              type="button"
              onClick={() => setSelectedEntry(null)}
              className="w-full py-3.5 mt-3 bg-dairy-bg hover:bg-border-dairy text-xs font-bold text-text-primary rounded-xl transition-all tap-feedback"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Add Advance Modal Sheet */}
      {showAdvanceModal && (
      <div className="fixed inset-0 z-[80] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setShowAdvanceModal(false)} />
          <form 
            onSubmit={handleCreateAdvance}
            className="relative bg-white w-full max-w-[430px] rounded-t-3xl p-6 shadow-2xl animate-fade-in-up z-10"
          >
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-display font-extrabold text-base text-text-primary">
                Naya Advance Register karein
              </h3>
              <button 
                type="button" 
                onClick={() => setShowAdvanceModal(false)}
                className="p-1.5 rounded-full bg-dairy-bg text-text-muted hover:text-text-primary tap-feedback"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-primary uppercase tracking-wider mb-1.5">
                  Advance Amount (₹)*
                </label>
                <input
                  type="number"
                  required
                  value={advanceAmount}
                  onChange={(e) => setAdvanceAmount(e.target.value)}
                  placeholder="e.g. 5000"
                  autoFocus
                  className="block w-full px-4 py-3 bg-dairy-bg border border-border-dairy rounded-xl text-sm font-semibold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-primary uppercase tracking-wider mb-1.5">
                  Remarks / Notes (Optional)
                </label>
                <input
                  type="text"
                  value={advanceNotes}
                  onChange={(e) => setAdvanceNotes(e.target.value)}
                  placeholder="e.g. For festival purchase"
                  className="block w-full px-4 py-3 bg-dairy-bg border border-border-dairy rounded-xl text-xs font-semibold focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSavingAdvance}
                className="w-full mt-2 py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-text-muted text-white text-sm font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-1 tap-feedback"
              >
                {isSavingAdvance ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Confirm & Save Advance'
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {showPaymentModal && isDeneWala && (
        <div className="fixed inset-0 z-[85] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setShowPaymentModal(false)} />
          <form
            onSubmit={handleCreatePayment}
            className="relative bg-white w-full max-w-[430px] rounded-t-3xl p-5 shadow-2xl animate-fade-in-up z-10 max-h-[90vh] flex flex-col overflow-hidden"
          >
            <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar pr-1">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-display font-extrabold text-base text-text-primary">
                  Milk Payment
                </h3>
                <p className="text-[11px] text-text-muted font-semibold mt-0.5">
                  Date range select karein, phir rows choose karein.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="p-1.5 rounded-full bg-dairy-bg text-text-muted hover:text-text-primary tap-feedback"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-[10px] font-semibold text-text-primary uppercase tracking-wider mb-1">
                  From
                </label>
                <input
                  type="date"
                  value={paymentStartDate}
                  onChange={(e) => setPaymentStartDate(e.target.value)}
                  className="block w-full px-3 py-2.5 bg-dairy-bg border border-border-dairy rounded-xl text-xs font-semibold focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-text-primary uppercase tracking-wider mb-1">
                  To
                </label>
                <input
                  type="date"
                  value={paymentEndDate}
                  min={paymentStartDate}
                  onChange={(e) => setPaymentEndDate(e.target.value)}
                  className="block w-full px-3 py-2.5 bg-dairy-bg border border-border-dairy rounded-xl text-xs font-semibold focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">Choose entries</h4>
              <span className="text-[10px] font-bold text-[#2E7D32]">
                Selected {formatCurrency(selectedPaymentTotal)}
              </span>
            </div>

            <div className="mb-3 grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                <span className="text-[10px] font-bold text-amber-700 uppercase">Previous pending</span>
                <p className="font-display font-black text-sm text-amber-800 mt-1">
                  {formatCurrency(openingBalance)}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-dairy-bg border border-border-dairy">
                <span className="text-[10px] font-bold text-text-muted uppercase">Total after add</span>
                <p className="font-display font-black text-sm text-text-primary mt-1">
                  {formatCurrency(openingBalance + selectedPaymentTotal)}
                </p>
              </div>
            </div>

            <div className="mb-3 min-h-[120px] p-4 rounded-xl bg-indigo-50 border border-indigo-200">
              <div className="flex items-start justify-between gap-3 h-full">
                <div className="pt-1">
                  <span className="text-[10px] font-bold text-indigo-700 uppercase">Advance available</span>
                  <p className="font-display font-black text-sm text-indigo-900 mt-1">
                    {formatCurrency(totalAdvanceRemaining)}
                  </p>
                  <p className="text-[10px] text-indigo-700 mt-1">
                    Use advance here, then `Pay now` updates automatically.
                  </p>
                </div>
                <div className="w-[150px]">
                  <label className="block text-[10px] font-semibold text-indigo-700 uppercase tracking-wider mb-1">
                    Use advance
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    max={totalAdvanceRemaining}
                    value={advanceUseAmount}
                    onChange={(e) => handleAdvanceUseChange(e.target.value)}
                    className="block w-full px-3 py-2.5 bg-white border border-indigo-200 rounded-xl text-xs font-semibold focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex-none h-[320px] overflow-y-auto no-scrollbar space-y-2.5 pr-1">
              {availableCollections.length === 0 ? (
                <div className="text-center py-8 px-4 bg-dairy-bg/60 border border-border-dairy rounded-2xl">
                  <p className="text-sm font-semibold text-text-muted">Is range me koi milk entry nahi hai.</p>
                </div>
              ) : (
                availableCollections.map((tx) => (
                  <label
                    key={tx._id}
                    className="w-full min-h-[96px] flex items-start justify-between gap-3 p-4 bg-white border border-border-dairy hover:bg-dairy-bg/30 rounded-xl transition-all shadow-xs cursor-pointer"
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={selectedCollectionIds.includes(tx._id)}
                        onChange={() => toggleCollectionSelection(tx._id)}
                        className="mt-1 h-4 w-4 shrink-0 accent-[#2E7D32]"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold text-text-muted uppercase leading-tight">
                          {formatDate(tx.date)}
                        </p>
                        <p className="font-display font-black text-[14px] text-text-primary mt-1">
                          {formatLiters(tx.liters)} • {formatCurrency(tx.totalAmount)}
                        </p>
                        <p className="text-[10px] text-text-muted mt-0.5">
                          Shift: {tx.shift === 'morning' ? 'Subah' : 'Shaam'} • {tx.animalType}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end justify-between self-stretch min-w-[72px]">
                      <span className="text-[9px] font-semibold text-text-muted">Amount</span>
                      <p className="font-display font-black text-sm text-text-primary text-right">
                        {formatCurrency(tx.totalAmount)}
                      </p>
                    </div>
                  </label>
                ))
              )}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-dairy-bg border border-border-dairy">
                <span className="text-[10px] font-bold text-text-muted uppercase">Total due</span>
                <p className="font-display font-black text-sm text-text-primary mt-1">
                  {formatCurrency(totalToSettle)}
                </p>
                <p className="text-[10px] text-text-muted mt-1">
                  Milk {formatCurrency(selectedPaymentTotal)} + Pending {formatCurrency(openingBalance)}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-dairy-bg border border-border-dairy">
                <span className="text-[10px] font-bold text-text-muted uppercase">Pay now after advance</span>
                <input
                  type="number"
                  step="any"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="mt-1 w-full bg-transparent outline-none font-display font-black text-sm text-text-primary"
                />
                <p className="text-[10px] text-text-muted mt-1">
                  Auto: {formatCurrency(autoPayNowAmount)}
                </p>
              </div>
            </div>

            <div className="mt-3 p-3 rounded-xl border border-amber-200 bg-amber-50">
              <span className="text-[10px] font-bold text-amber-700 uppercase">Remaining after payment</span>
              <p className="font-display font-black text-sm text-amber-800 mt-1">
                {formatCurrency(paymentBalancePreview)}
              </p>
            </div>

            <div className="mt-3 p-3 rounded-xl border border-green-200 bg-green-50">
              <span className="text-[10px] font-bold text-green-700 uppercase">Overpay credit</span>
              <p className="font-display font-black text-sm text-green-800 mt-1">
                {formatCurrency(paymentOverpayCredit)}
              </p>
            </div>

            <div className="mt-3">
              <label className="block text-[10px] font-semibold text-text-primary uppercase tracking-wider mb-1">
                Notes
              </label>
              <input
                type="text"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="Optional note"
                className="block w-full px-4 py-3 bg-dairy-bg border border-border-dairy rounded-xl text-xs font-semibold focus:outline-none"
              />
            </div>
            </div>

            <div className="pt-4 pb-1 border-t border-border-dairy bg-white sticky bottom-0">
              <button
                type="submit"
                disabled={isSavingPayment || selectedCollectionIds.length === 0}
                className="w-full py-3.5 bg-[#2E7D32] hover:bg-[#256428] disabled:bg-text-muted text-white text-sm font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-1 tap-feedback"
              >
                {isSavingPayment ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Save Payment'
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {showReceiptModal && !isDeneWala && (
        <div className="fixed inset-0 z-[85] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setShowReceiptModal(false)} />
          <form
            onSubmit={handleCreateReceipt}
            className="relative bg-white w-full max-w-[430px] rounded-t-3xl p-5 shadow-2xl animate-fade-in-up z-10 max-h-[90vh] flex flex-col overflow-hidden"
          >
            <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar pr-1">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-display font-extrabold text-base text-text-primary">
                    Buyer Payment
                  </h3>
                  <p className="text-[11px] text-text-muted font-semibold mt-0.5">
                    Date range select karein, phir rows choose karein.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowReceiptModal(false)}
                  className="p-1.5 rounded-full bg-dairy-bg text-text-muted hover:text-text-primary tap-feedback"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-[10px] font-semibold text-text-primary uppercase tracking-wider mb-1">
                    From
                  </label>
                  <input
                    type="date"
                    value={receiptStartDate}
                    onChange={(e) => setReceiptStartDate(e.target.value)}
                    className="block w-full px-3 py-2.5 bg-dairy-bg border border-border-dairy rounded-xl text-xs font-semibold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-text-primary uppercase tracking-wider mb-1">
                    To
                  </label>
                  <input
                    type="date"
                    value={receiptEndDate}
                    min={receiptStartDate}
                    onChange={(e) => setReceiptEndDate(e.target.value)}
                    className="block w-full px-3 py-2.5 bg-dairy-bg border border-border-dairy rounded-xl text-xs font-semibold focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">Choose transactions</h4>
                <span className="text-[10px] font-bold text-[#2E7D32]">
                  Selected {formatCurrency(selectedSalesTotal)}
                </span>
              </div>

              <div className="mb-3 grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                  <span className="text-[10px] font-bold text-amber-700 uppercase">Previous pending</span>
                  <p className="font-display font-black text-sm text-amber-800 mt-1">
                    {formatCurrency(openingSaleBalance)}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-dairy-bg border border-border-dairy">
                  <span className="text-[10px] font-bold text-text-muted uppercase">Total after add</span>
                  <p className="font-display font-black text-sm text-text-primary mt-1">
                    {formatCurrency(receiptTotalToSettle)}
                  </p>
                </div>
              </div>

              <div className="mb-3 min-h-[120px] p-4 rounded-xl bg-indigo-50 border border-indigo-200">
                <div className="flex items-start justify-between gap-3 h-full">
                  <div className="pt-1">
                    <span className="text-[10px] font-bold text-indigo-700 uppercase">Credit available</span>
                    <p className="font-display font-black text-sm text-indigo-900 mt-1">
                      {formatCurrency(availableReceiptCredit)}
                    </p>
                    <p className="text-[10px] text-indigo-700 mt-1">
                      Use credit here, then `Pay now` updates automatically.
                    </p>
                  </div>
                  <div className="w-[150px]">
                    <label className="block text-[10px] font-semibold text-indigo-700 uppercase tracking-wider mb-1">
                      Use credit
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      max={availableReceiptCredit}
                      value={creditUseAmount}
                      onChange={(e) => handleCreditUseChange(e.target.value)}
                      className="block w-full px-3 py-2.5 bg-white border border-indigo-200 rounded-xl text-xs font-semibold focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex-none h-[320px] overflow-y-auto no-scrollbar space-y-2.5 pr-1">
                {sales.length === 0 ? (
                  <div className="text-center py-8 px-4 bg-dairy-bg/60 border border-border-dairy rounded-2xl">
                    <p className="text-sm font-semibold text-text-muted">Is customer ke liye koi sale nahi hai.</p>
                  </div>
                ) : (
                  sales
                    .filter((tx) => {
                      const time = new Date(tx.date).getTime();
                      const start = receiptStartDate ? new Date(receiptStartDate).getTime() : Number.NEGATIVE_INFINITY;
                      const end = receiptEndDate ? new Date(receiptEndDate).getTime() + 86399999 : Number.POSITIVE_INFINITY;
                      return time >= start && time <= end;
                    })
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    .map((tx) => (
                      <label
                        key={tx._id}
                        className="w-full min-h-[96px] flex items-start justify-between gap-3 p-4 bg-white border border-border-dairy hover:bg-dairy-bg/30 rounded-xl transition-all shadow-xs cursor-pointer"
                      >
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <input
                            type="checkbox"
                            checked={selectedSaleIds.includes(tx._id)}
                            onChange={() => toggleSaleSelection(tx._id)}
                            className="mt-1 h-4 w-4 shrink-0 accent-[#2E7D32]"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-bold text-text-muted uppercase leading-tight">
                              {formatDate(tx.date)}
                            </p>
                            <p className="font-display font-black text-[14px] text-text-primary mt-1">
                              {formatLiters(tx.liters)} â€¢ {formatCurrency(tx.totalAmount)}
                            </p>
                            <p className="text-[10px] text-text-muted mt-0.5">
                              Rate {formatCurrency(tx.ratePerLiter)} / L
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end justify-between self-stretch min-w-[72px]">
                          <span className="text-[9px] font-semibold text-text-muted">Due</span>
                          <p className="font-display font-black text-sm text-text-primary text-right">
                            {formatCurrency(tx.balanceDue)}
                          </p>
                        </div>
                      </label>
                    ))
                )}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-dairy-bg border border-border-dairy">
                  <span className="text-[10px] font-bold text-text-muted uppercase">Total due</span>
                  <p className="font-display font-black text-sm text-text-primary mt-1">
                    {formatCurrency(receiptTotalToSettle)}
                  </p>
                  <p className="text-[10px] text-text-muted mt-1">
                    Sales {formatCurrency(selectedSalesTotal)} + Pending {formatCurrency(openingSaleBalance)}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-dairy-bg border border-border-dairy">
                  <span className="text-[10px] font-bold text-text-muted uppercase">Pay now after credit</span>
                  <input
                    type="number"
                    step="any"
                    value={receiptAmount}
                    onChange={(e) => setReceiptAmount(e.target.value)}
                    className="mt-1 w-full bg-transparent outline-none font-display font-black text-sm text-text-primary"
                  />
                  <p className="text-[10px] text-text-muted mt-1">
                    Auto: {formatCurrency(autoReceiptPayNow)}
                  </p>
                </div>
              </div>

              <div className="mt-3 p-3 rounded-xl border border-amber-200 bg-amber-50">
                <span className="text-[10px] font-bold text-amber-700 uppercase">Remaining after payment</span>
                <p className="font-display font-black text-sm text-amber-800 mt-1">
                  {formatCurrency(receiptBalancePreview)}
                </p>
              </div>

              <div className="mt-3 p-3 rounded-xl border border-green-200 bg-green-50">
                <span className="text-[10px] font-bold text-green-700 uppercase">Overpay credit</span>
                <p className="font-display font-black text-sm text-green-800 mt-1">
                  {formatCurrency(receiptOverpayCredit)}
                </p>
              </div>

              <div className="mt-3">
                <label className="block text-[10px] font-semibold text-text-primary uppercase tracking-wider mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  value={receiptNotes}
                  onChange={(e) => setReceiptNotes(e.target.value)}
                  placeholder="Optional note"
                  className="block w-full px-4 py-3 bg-dairy-bg border border-border-dairy rounded-xl text-xs font-semibold focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-4 pb-1 border-t border-border-dairy bg-white sticky bottom-0">
              <button
                type="submit"
                disabled={isSavingReceipt || selectedSaleIds.length === 0}
                className="w-full py-3.5 bg-[#2E7D32] hover:bg-[#256428] disabled:bg-text-muted text-white text-sm font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-1 tap-feedback"
              >
                {isSavingReceipt ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Save Payment'
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {showPaymentEditModal && editingPayment && (
        <div className="fixed inset-0 z-[88] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setShowPaymentEditModal(false)} />
          <form
            onSubmit={handleSavePaymentEdit}
            className="relative bg-white w-full max-w-[430px] rounded-t-3xl p-6 shadow-2xl animate-fade-in-up z-10"
          >
            <div className="flex justify-between items-center mb-5">
              <div>
                <h3 className="font-display font-extrabold text-base text-text-primary">
                  Edit Payment
                </h3>
                <p className="text-[11px] text-text-muted font-semibold mt-0.5">
                  {formatDate(editingPayment.startDate)} - {formatDate(editingPayment.endDate)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPaymentEditModal(false)}
                className="p-1.5 rounded-full bg-dairy-bg text-text-muted hover:text-text-primary tap-feedback"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-dairy-bg border border-border-dairy">
                  <span className="text-[10px] font-bold text-text-muted uppercase">Selected total</span>
                  <p className="font-display font-black text-sm text-text-primary mt-1">
                    {formatCurrency(editingPayment.totalAmount)}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-dairy-bg border border-border-dairy">
                  <span className="text-[10px] font-bold text-text-muted uppercase">Opening balance</span>
                  <p className="font-display font-black text-sm text-amber-800 mt-1">
                    {formatCurrency(editingPayment.openingBalance || 0)}
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                <span className="text-[10px] font-bold text-amber-700 uppercase">Remaining after edit</span>
                <p className="font-display font-black text-sm text-amber-800 mt-1">
                  {formatCurrency(Math.max(0, (editingPayment.openingBalance || 0) + editingPayment.totalAmount - (parseFloat(editPaymentAmount) || 0)))}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-primary uppercase tracking-wider mb-1.5">
                  Amount Paid
                </label>
                <input
                  type="number"
                  step="any"
                  value={editPaymentAmount}
                  onChange={(e) => setEditPaymentAmount(e.target.value)}
                  className="block w-full px-4 py-3 bg-dairy-bg border border-border-dairy rounded-xl text-sm font-semibold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-primary uppercase tracking-wider mb-1.5">
                  Notes
                </label>
                <input
                  type="text"
                  value={editPaymentNotes}
                  onChange={(e) => setEditPaymentNotes(e.target.value)}
                  placeholder="Optional note"
                  className="block w-full px-4 py-3 bg-dairy-bg border border-border-dairy rounded-xl text-xs font-semibold focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSavingPaymentEdit}
                className="w-full mt-2 py-3.5 bg-[#2E7D32] hover:bg-[#256428] disabled:bg-text-muted text-white text-sm font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-1 tap-feedback"
              >
                {isSavingPaymentEdit ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Save Payment'
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {showReceiptEditModal && editingReceipt && (
        <div className="fixed inset-0 z-[88] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setShowReceiptEditModal(false)} />
          <form
            onSubmit={handleSaveReceiptEdit}
            className="relative bg-white w-full max-w-[430px] rounded-t-3xl p-6 shadow-2xl animate-fade-in-up z-10"
          >
            <div className="flex justify-between items-center mb-5">
              <div>
                <h3 className="font-display font-extrabold text-base text-text-primary">
                  Edit Payment
                </h3>
                <p className="text-[11px] text-text-muted font-semibold mt-0.5">
                  {formatDate(editingReceipt.date)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowReceiptEditModal(false)}
                className="p-1.5 rounded-full bg-dairy-bg text-text-muted hover:text-text-primary tap-feedback"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-dairy-bg border border-border-dairy">
                  <span className="text-[10px] font-bold text-text-muted uppercase">Selected total</span>
                  <p className="font-display font-black text-sm text-text-primary mt-1">
                    {formatCurrency(editingReceipt.totalAmount)}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-dairy-bg border border-border-dairy">
                  <span className="text-[10px] font-bold text-text-muted uppercase">Credit saved</span>
                  <p className="font-display font-black text-sm text-amber-800 mt-1">
                    {formatCurrency(editingReceipt.creditRemaining || 0)}
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                <span className="text-[10px] font-bold text-amber-700 uppercase">Remaining after edit</span>
                <p className="font-display font-black text-sm text-amber-800 mt-1">
                  {formatCurrency(Math.max(0, (editingReceipt.openingBalance || 0) + editingReceipt.totalAmount - (parseFloat(editReceiptAmount) || 0) - (parseFloat(editCreditUseAmount) || 0)))}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text-primary uppercase tracking-wider mb-1.5">
                    Amount Paid
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={editReceiptAmount}
                    onChange={(e) => setEditReceiptAmount(e.target.value)}
                    className="block w-full px-4 py-3 bg-dairy-bg border border-border-dairy rounded-xl text-sm font-semibold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-primary uppercase tracking-wider mb-1.5">
                    Use Credit
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={editCreditUseAmount}
                    onChange={(e) => setEditCreditUseAmount(e.target.value)}
                    className="block w-full px-4 py-3 bg-dairy-bg border border-border-dairy rounded-xl text-sm font-semibold focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-primary uppercase tracking-wider mb-1.5">
                  Notes
                </label>
                <input
                  type="text"
                  value={editReceiptNotes}
                  onChange={(e) => setEditReceiptNotes(e.target.value)}
                  placeholder="Optional note"
                  className="block w-full px-4 py-3 bg-dairy-bg border border-border-dairy rounded-xl text-xs font-semibold focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSavingReceiptEdit}
                className="w-full mt-2 py-3.5 bg-[#2E7D32] hover:bg-[#256428] disabled:bg-text-muted text-white text-sm font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-1 tap-feedback"
              >
                {isSavingReceiptEdit ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Save Payment'
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {showSaleEditModal && editingSale && (
        <div className="fixed inset-0 z-[88] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setShowSaleEditModal(false)} />
          <form
            onSubmit={handleSaveSaleEdit}
            className="relative bg-white w-full max-w-[430px] rounded-t-3xl p-6 shadow-2xl animate-fade-in-up z-10"
          >
            <div className="flex justify-between items-center mb-5">
              <div>
                <h3 className="font-display font-extrabold text-base text-text-primary">
                  Edit Sale
                </h3>
                <p className="text-[11px] text-text-muted font-semibold mt-0.5">
                  {formatDate(editingSale.date)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSaleEditModal(false)}
                className="p-1.5 rounded-full bg-dairy-bg text-text-muted hover:text-text-primary tap-feedback"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text-primary uppercase tracking-wider mb-1.5">
                    Date
                  </label>
                  <input
                    type="date"
                    value={editSaleDate}
                    onChange={(e) => setEditSaleDate(e.target.value)}
                    className="block w-full px-4 py-3 bg-dairy-bg border border-border-dairy rounded-xl text-sm font-semibold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-primary uppercase tracking-wider mb-1.5">
                    Animal Type
                  </label>
                  <div className="grid grid-cols-2 bg-dairy-bg border border-border-dairy rounded-xl p-0.5 h-[48px]">
                    <button
                      type="button"
                      onClick={() => setEditSaleAnimalType('cow')}
                      className={`text-xs font-bold rounded-lg transition-colors ${editSaleAnimalType === 'cow' ? 'bg-primary text-white' : 'text-text-muted'}`}
                    >
                      Cow
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditSaleAnimalType('buffalo')}
                      className={`text-xs font-bold rounded-lg transition-colors ${editSaleAnimalType === 'buffalo' ? 'bg-primary text-white' : 'text-text-muted'}`}
                    >
                      Buffalo
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text-primary uppercase tracking-wider mb-1.5">
                    Liters
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={editSaleLiters}
                    onChange={(e) => setEditSaleLiters(e.target.value)}
                    className="block w-full px-4 py-3 bg-dairy-bg border border-border-dairy rounded-xl text-sm font-semibold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-primary uppercase tracking-wider mb-1.5">
                    Amount Paid
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={editSaleAmountPaid}
                    onChange={(e) => setEditSaleAmountPaid(e.target.value)}
                    className="block w-full px-4 py-3 bg-dairy-bg border border-border-dairy rounded-xl text-sm font-semibold focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-primary uppercase tracking-wider mb-1.5">
                  Notes
                </label>
                <input
                  type="text"
                  value={editSaleNotes}
                  onChange={(e) => setEditSaleNotes(e.target.value)}
                  placeholder="Optional note"
                  className="block w-full px-4 py-3 bg-dairy-bg border border-border-dairy rounded-xl text-xs font-semibold focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSavingSaleEdit}
                className="w-full mt-2 py-3.5 bg-primary hover:bg-primary-light disabled:bg-text-muted text-white text-sm font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-1 tap-feedback"
              >
                {isSavingSaleEdit ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {showEditModal && editingCollection && (
        <div className="fixed inset-0 z-[88] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setShowEditModal(false)} />
          <form
            onSubmit={handleSaveEdit}
            className="relative bg-white w-full max-w-[430px] rounded-t-3xl p-6 shadow-2xl animate-fade-in-up z-10"
          >
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-display font-extrabold text-base text-text-primary">
                Edit Milk Entry
              </h3>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="p-1.5 rounded-full bg-dairy-bg text-text-muted hover:text-text-primary tap-feedback"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text-primary uppercase tracking-wider mb-1.5">
                    Date
                  </label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="block w-full px-4 py-3 bg-dairy-bg border border-border-dairy rounded-xl text-sm font-semibold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-primary uppercase tracking-wider mb-1.5">
                    Shift
                  </label>
                  <div className="grid grid-cols-2 bg-dairy-bg border border-border-dairy rounded-xl p-0.5 h-[48px]">
                    <button
                      type="button"
                      onClick={() => setEditShift('morning')}
                      className={`text-xs font-bold rounded-lg transition-colors ${editShift === 'morning' ? 'bg-primary text-white' : 'text-text-muted'}`}
                    >
                      Subah
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditShift('evening')}
                      className={`text-xs font-bold rounded-lg transition-colors ${editShift === 'evening' ? 'bg-primary text-white' : 'text-text-muted'}`}
                    >
                      Shaam
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text-primary uppercase tracking-wider mb-1.5">
                    Liters
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={editLiters}
                    onChange={(e) => setEditLiters(e.target.value)}
                    className="block w-full px-4 py-3 bg-dairy-bg border border-border-dairy rounded-xl text-sm font-semibold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-primary uppercase tracking-wider mb-1.5">
                    FAT
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={editFat}
                    onChange={(e) => setEditFat(e.target.value)}
                    className="block w-full px-4 py-3 bg-dairy-bg border border-border-dairy rounded-xl text-sm font-semibold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-primary uppercase tracking-wider mb-1.5">
                    SNF
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={editSnf}
                    onChange={(e) => setEditSnf(e.target.value)}
                    className="block w-full px-4 py-3 bg-dairy-bg border border-border-dairy rounded-xl text-sm font-semibold focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSavingEdit}
                className="w-full mt-2 py-3.5 bg-primary hover:bg-primary-light disabled:bg-text-muted text-white text-sm font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-1 tap-feedback"
              >
                {isSavingEdit ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default CustomerDetail;
