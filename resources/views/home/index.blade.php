@extends('layout.master')

@section('content')
    <h1>dnsrecords.io</h1>

    <form method="post" action="/">
        {{ csrf_field() }}

        <input name="url" />
        @if($errors->has('url'))
            {{ $errors->first('url') }}
        @endif

        <button type="submit">Get dns info</button>

        <div>
            {{ session('dnsInfo') }}
        </div>
    </form>
@endsection