namespace MazlumApart.Domain.Enums;

/// <summary>Borç kalemi türü. İndirim eksi tutarlı kalemdir. Bütünleme için kısa konaklama = extra_stay (fiyat elle).</summary>
public enum ChargeKind { Deposit, Rent, ExtraStay, Summer, Other, Discount }

/// <summary>Tahsilat ya da avans iadesi</summary>
public enum PaymentKind { Collection, Refund }

public enum PaymentMethod { Cash, Transfer, Pos }

public enum AccountType { Cash, Bank }

public enum TransactionDirection { In, Out }

/// <summary>Kasa/banka hareketinin kaynağı (frontend TX_SOURCE)</summary>
public enum TransactionSource { Opening, Payment, PaymentCancel, Refund, Expense, ExpenseCancel, Transfer }
