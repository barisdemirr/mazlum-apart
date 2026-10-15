using System.Security.Cryptography;

namespace MazlumApart.Infrastructure.Auth;

/// <summary>İlk şifre / şifre sıfırlama için rastgele şifre (karışan karakterler yok: 0/O, 1/l/I)</summary>
public static class PasswordGenerator
{
    private const string Alphabet = "abcdefghjkmnpqrstuvwxyz23456789";

    public static string Create(int length = 10) =>
        string.Create(length, 0, (span, _) =>
        {
            for (var i = 0; i < span.Length; i++) span[i] = Alphabet[RandomNumberGenerator.GetInt32(Alphabet.Length)];
        });
}
