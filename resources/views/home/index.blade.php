@extends('layout.master')

@section('content')

<header class="header selection-disable">
    <h1 class="title">
        <span class="carret">~</span>
        dnsrecords.io
    </h1>
</header>
<main class="main">
    @if(session('dnsInfo'))
        <pre class="main__results" id="results">{{ session('dnsInfo') }}</pre>
    @endif

    @if($errors->has('url'))
        <p class="alert--danger">
            {{ $errors->first('url') }}
        </p>
    @endif
    @include('layout._partials.flash')

    <form method="post" action="/" class="selection-disable">
        {{ csrf_field() }}
        
        <span class="carret -green">&rarr;</span>
        <input autofocus id="url" name="url" placeholder="Enter a domain" autocomplete="off" />

    </form>  
</main>   
 
<footer class="footer selection-disable">
    © <a href='https://spatie.be/en/opensource'>spatie</a> {{ date('Y') }} — '<kbd>?</kbd>' for help
</footer>

@endsection
