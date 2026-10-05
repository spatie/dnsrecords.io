@foreach(session('flash_notification', collect())->toArray() as $message)
    <div class="message message--{{ $message['level'] }}" role="alert">
        @if($message['level'] === 'danger')
            <span class="message__label">err</span>
        @endif
        <span class="message__body">{!! $message['message'] !!}</span>
    </div>
@endforeach

{{ session()->forget('flash_notification') }}
