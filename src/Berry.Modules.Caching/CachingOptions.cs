namespace Berry.Modules.Caching;

public sealed class CachingOptions
{
    public string Provider { get; set; } = "Memory"; // or "Redis"
    public string? RedisConnectionString { get; set; }
    public int DefaultTtlSeconds { get; set; } = 300;
}
