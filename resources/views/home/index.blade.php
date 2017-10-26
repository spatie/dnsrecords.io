@extends('layout.master')

@section('content')

<header class="header selection-disable">
    <h1 class="title">
        <span class="title__prefix">~</span>
        dnsrecords.io
    </h1>
</header>
<main class="main">
    @if(session('dnsInfo'))
        <pre class="main__results" id="results">{{ session('dnsInfo') }}</pre>
    @endif
    <form method="post" action="/" class="selection-disable">
        {{ csrf_field() }}

        <input autofocus required id="url" name="url" placeholder="Enter a domain"/>
        <span class="input-carret"></span>

        @if($errors->has('url'))
            {{ $errors->first('url') }}
        @endif
    </form>  
</main>   
 
<footer class="footer selection-disable">
    © {{ date('Y') }} <a href="https://spatie.be/en/opensource">spatie.be</a>
</footer>

@endsection
