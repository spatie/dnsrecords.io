@foreach (session('flash_notification', collect())->toArray() as $message)
    <div class="alert alert--{{ $message['level'] }}
    {{ $message['important'] ? 'alert--important' : '' }}"
         role="alert"
    >
        {!! $message['message'] !!}
    </div>
@endforeach

{{ session()->forget('flash_notification') }}
