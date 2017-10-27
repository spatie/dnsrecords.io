@extends('layout.master')

@section('content')

<header class="header">
    <h1 class="title">
        <span class="carret">~</span>
        dnsrecords.io
    </h1>
</header>
<main class="main">
    @if(session('output'))
        <pre class="main__results" id="results">{{ session('output') }}</pre>
    @endif

    @if($errors->has('input'))
        <p class="alert alert--danger">
            {{ $errors->first('input') }}
        </p>
    @endif
    @include('layout._partials.flash')

    <form method="post" action="/">
        {{ csrf_field() }}
        
        <span class="carret -green">&rarr;</span>
        <input
            @if(! session('output')) autofocus @endif
            id="url"
            name="input"
            placeholder="Enter a domain"
            autocomplete="off"
            autocorrect="off"
            autocapitalize="off"
            autofocus="autofocus"
            spellcheck="false"
        />

    </form>  
</main>   
 
<footer class="footer">
    © <a href='https://spatie.be/en/opensource'>spatie</a> {{ date('Y') }} — '<kbd>?</kbd>' for help
</footer>

@endsection
