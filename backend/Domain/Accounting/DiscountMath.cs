using MazlumApart.Domain.Enums;

namespace MazlumApart.Domain.Accounting;

/// <summary>İndirimli aylık tutar (frontend lib/discount.js ile aynı hesap). Sonuç en az 1 TL, kuruş yuvarlamalı.</summary>
public static class DiscountMath
{
    public static decimal Apply(DiscountKind kind, decimal value, decimal price)
    {
        var result = kind == DiscountKind.Percent ? price * (100m - value) / 100m : price - value;
        return Math.Max(decimal.Round(result, 2, MidpointRounding.AwayFromZero), 1m);
    }
}
