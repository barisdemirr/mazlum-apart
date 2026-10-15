using MazlumApart.Domain.ValueObjects;

namespace MazlumApart.Shared;

/// <summary>
/// Basit, akıcı doğrulayıcı. Hatalar alan adına göre toplanır ve 400 (ValidationProblem) olarak döner:
///   { "errors": { "amount": ["Tutar sıfırdan büyük olmalı."] } }
/// Alan adları frontend'deki form alanlarıyla aynı (camelCase) yazılır.
/// </summary>
public class Validator
{
    private readonly Dictionary<string, List<string>> _errors = new();

    public bool IsValid => _errors.Count == 0;

    public Validator Required(string field, string? value, string? message = null)
    {
        if (string.IsNullOrWhiteSpace(value)) Add(field, message ?? $"{field} zorunludur.");
        return this;
    }

    public Validator MaxLength(string field, string? value, int max)
    {
        if (value is not null && value.Length > max) Add(field, $"{field} en fazla {max} karakter olabilir.");
        return this;
    }

    public Validator MinLength(string field, string? value, int min)
    {
        if (value is not null && value.Length < min) Add(field, $"{field} en az {min} karakter olmalı.");
        return this;
    }

    public Validator Email(string field, string? value)
    {
        if (!string.IsNullOrWhiteSpace(value) &&
            !(System.Net.Mail.MailAddress.TryCreate(value, out var address) && address.Address == value))
            Add(field, $"{field} geçerli bir e-posta adresi olmalı.");
        return this;
    }

    public Validator Mobile(string field, string? value)
    {
        if (!TurkishFormats.IsMobile(value)) Add(field, "Telefon 5 ile başlayan 10 haneli olmalı.");
        return this;
    }

    public Validator Positive(string field, decimal value, string? message = null)
    {
        if (value <= 0) Add(field, message ?? "Tutar sıfırdan büyük olmalı.");
        return this;
    }

    public Validator Must(string field, bool condition, string message)
    {
        if (!condition) Add(field, message);
        return this;
    }

    public Validator AddError(string field, string message) => Add(field, message);

    public Validator LocalizedRequired(string field, LocalizedText? value, int max)
    {
        if (value is null || string.IsNullOrWhiteSpace(value.Tr))
            Add($"{field}.tr", "Türkçe metin zorunludur.");
        return LocalizedMax(field, value, max);
    }

    public Validator LocalizedOptional(string field, LocalizedText? value, int max)
    {
        if (value.IsBlank()) return this; // tamamen boş gelirse "verilmedi" sayılır
        if (string.IsNullOrWhiteSpace(value!.Tr))
            Add($"{field}.tr", "İngilizce yazıldıysa Türkçesi de gerekli.");
        return LocalizedMax(field, value, max);
    }

    private Validator LocalizedMax(string field, LocalizedText? value, int max)
    {
        if (value is null) return this;
        if (value.Tr?.Length > max) Add($"{field}.tr", $"En fazla {max} karakter olabilir.");
        if (value.En?.Length > max) Add($"{field}.en", $"En fazla {max} karakter olabilir.");
        return this;
    }

    public Validator Each<T>(string field, IReadOnlyList<T>? items, int max, Action<T, string> check) where T : class
    {
        if (items is null) return this;

        if (items.Count > max)
        {
            Add(field, $"En fazla {max} öğe eklenebilir.");
            return this;
        }

        for (var i = 0; i < items.Count; i++)
        {
            if (items[i] is null)
            {
                Add($"{field}[{i}]", "Geçersiz öğe.");
                continue;
            }

            check(items[i], $"{field}[{i}]");
        }

        return this;
    }

    public Result ToFailure() => Result.Fail(BuildError());
    public Result<T> ToFailure<T>() => Result<T>.Fail(BuildError());

    private Error BuildError() =>
        Error.Validation(_errors.ToDictionary(x => x.Key, x => x.Value.ToArray()));

    public Validator Add(string field, string message)
    {
        if (!_errors.TryGetValue(field, out var list)) _errors[field] = list = [];
        list.Add(message);
        return this;
    }
}
