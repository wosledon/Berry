namespace Berry.Shared.Messaging;

public interface IEvent { }

public interface IMessageBus
{
    Task PublishAsync<TEvent>(TEvent evt, CancellationToken ct = default) where TEvent : IEvent;
    void Subscribe<TEvent>(Func<TEvent, CancellationToken, Task> handler) where TEvent : IEvent;
}
