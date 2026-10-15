namespace MazlumApart.Shared;

public record PagedResult<T>(List<T> Items, int Total, int Page, int PageSize);

public static class Paging
{
    /// <summary>Sayfa ve boyutu güvenli aralığa çeker (varsayılan 50, en fazla 200)</summary>
    public static (int Page, int Size) Normalize(int? page, int? pageSize, int defaultSize = 50, int maxSize = 200) =>
        (Math.Max(page ?? 1, 1), Math.Clamp(pageSize ?? defaultSize, 1, maxSize));
}
