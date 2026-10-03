@foreach(session('flash_notification', collect())->toArray() as $message)
    <div class="alert alert--{{ $message['level'] }}" role="alert">
        <span class="alert__label">{{ $message['level'] === 'danger' ? 'Alert' : 'Library' }}</span>
        <p class="alert__body">{!! $message['message'] !!}</p>
    </div>
@endforeach

{{ session()->forget('flash_notification') }}
