using System.Threading.Channels;
using Berry.Shared.Messaging;

namespace Berry.Modules.Messaging;

public sealed class InMemoryChannelBus : IMessageBus
{
    private readonly Dictionary<Type, object> _channels = new();

    public Task PublishAsync<TEvent>(TEvent evt, CancellationToken ct = default) where TEvent : IEvent
    {
        var ch = (Channel<TEvent>)_channels.GetOrAdd(typeof(TEvent), _ => Channel.CreateUnbounded<TEvent>());
        return ch.Writer.WriteAsync(evt, ct).AsTask();
    }

    public void Subscribe<TEvent>(Func<TEvent, CancellationToken, Task> handler) where TEvent : IEvent
    {
        var ch = (Channel<TEvent>)_channels.GetOrAdd(typeof(TEvent), _ => Channel.CreateUnbounded<TEvent>());
        _ = Task.Run(async () =>
        {
            await foreach (var evt in ch.Reader.ReadAllAsync())
            {
                await handler(evt, CancellationToken.None);
            }
        });
    }
}

file static class DictionaryExtensions
{
    public static TValue GetOrAdd<TKey, TValue>(this IDictionary<TKey, TValue> dict, TKey key, Func<TKey, TValue> factory)
        where TKey : notnull
    {
        if (!dict.TryGetValue(key, out var value))
        {
            value = factory(key);
            dict[key] = value;
        }
        return value;
    }
}
