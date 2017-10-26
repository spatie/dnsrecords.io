@foreach (session('flash_notification', collect())->toArray() as $message)
    <div class="alert alert-{{ $message['level'] }}
    {{ $message['important'] ? 'alert-important' : '' }}"
         role="alert"
    >
        @if ($message['important'])
            <button type="button"
                    class="close"
                    data-dismiss="alert"
                    aria-hidden="true"
            >&times;
            </button>
        @endif

        {!! $message['message'] !!}
    </div>
@endforeach

{{ session()->forget('flash_notification') }}
