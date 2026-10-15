using Microsoft.EntityFrameworkCore;
using MazlumApart.Domain.Entities;
using MazlumApart.Infrastructure.Database;

namespace MazlumApart.Infrastructure.Services;

/// <summary>
/// Tekrarsız, artan belge numarası üretir — tamamen EF Core (LINQ) ile, raw SQL yok.
/// Ayrı bir DbContext kapsamında çalışır: çağıranın takip ettiği değişiklikler yanlışlıkla kaydedilmez.
/// İki istek aynı anda gelirse biri concurrency/PK hatası alır ve yeniden dener; aynı numara iki kez verilemez.
/// </summary>
public class NumberGenerator(IServiceScopeFactory scopes)
{
    private const int MaxAttempts = 10;

    public async Task<int> NextAsync(string key, CancellationToken ct)
    {
        for (var attempt = 1; ; attempt++)
        {
            await using var scope = scopes.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var counter = await db.NumberCounters.FirstOrDefaultAsync(x => x.Key == key, ct);
            if (counter is null)
            {
                counter = new NumberCounter { Key = key, Value = 0 };
                db.NumberCounters.Add(counter);
            }

            counter.Value++;
            counter.Version = Guid.NewGuid();

            try
            {
                await db.SaveChangesAsync(ct);
                return counter.Value;
            }
            catch (DbUpdateException) when (attempt < MaxAttempts)
            {
                // DbUpdateConcurrencyException (başkası arttırdı) ya da PK çakışması (ilk satırı başkası ekledi)
                await Task.Delay(Random.Shared.Next(10, 50) * attempt, ct);
            }
        }
    }

    public static string ApplicationKey(int year) => $"application-{year}";
}
