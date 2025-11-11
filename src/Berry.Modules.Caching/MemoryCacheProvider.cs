using Berry.Shared.Caching;
using Microsoft.Extensions.Caching.Memory;

namespace Berry.Modules.Caching;

internal sealed class MemoryCacheProvider : ICacheProvider
{
    private readonly IMemoryCache _cache;
    public MemoryCacheProvider(IMemoryCache cache) => _cache = cache;

    public Task<T?> GetAsync<T>(string key, CancellationToken ct = default)
        => Task.FromResult(_cache.TryGetValue(key, out var v) ? (T?)v : default);

    public Task SetAsync<T>(string key, T value, TimeSpan ttl, CancellationToken ct = default)
    { _cache.Set(key, value, ttl); return Task.CompletedTask; }

    public Task RemoveAsync(string key, CancellationToken ct = default)
    { _cache.Remove(key); return Task.CompletedTask; }

    public async Task<T> GetOrSetAsync<T>(string key, Func<Task<T>> factory, TimeSpan ttl, CancellationToken ct = default)
    {
        if (_cache.TryGetValue(key, out var existing) && existing is T typed) return typed;
        var created = await factory();
        _cache.Set(key, created, ttl);
        return created;
    }
}
