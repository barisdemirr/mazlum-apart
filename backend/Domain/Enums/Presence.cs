namespace MazlumApart.Domain.Enums;

/// <summary>
/// Dairenin hazırlık durumu (yalnızca yönetici işaretler). Daire tamamen boşaldıktan sonra anlamlıdır:
///   needs_cleaning = temizlik bekliyor · needs_repair = tadilat / bakım bekliyor · ready = hazır
/// </summary>
public enum ApartmentReadiness { Ready, NeedsCleaning, NeedsRepair }
