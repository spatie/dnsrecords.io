@foreach (session('flash_notification', collect())->toArray() as $message)
    <p role="alert">
        {!! $message['message'] !!}
    </p>
@endforeach

{{ session()->forget('flash_notification') }}
