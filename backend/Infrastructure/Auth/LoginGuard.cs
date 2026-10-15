namespace MazlumApart.Infrastructure.Auth;

/// <summary>
/// Hesap bazlı kaba kuvvet koruması (IP sınırından bağımsız; yurtta aynı IP'yi paylaşan öğrenciler birbirini kilitlemez).
/// Art arda MaxFailures hatalı denemeden sonra hesap LockMinutes boyunca girişe kapanır.
/// </summary>
public static class LoginGuard
{
    public const int MaxFailures = 5;
    public const int LockMinutes = 15;

    public static bool IsLocked(DateTime? lockedUntil) => lockedUntil is not null && lockedUntil > DateTime.UtcNow;

    /// <summary>Hatalı deneme: sayaç artar, sınıra gelince kilitlenir ve sayaç sıfırlanır</summary>
    public static (int Failures, DateTime? LockedUntil) RegisterFailure(int failures)
    {
        failures++;
        return failures >= MaxFailures ? (0, DateTime.UtcNow.AddMinutes(LockMinutes)) : (failures, null);
    }
}
