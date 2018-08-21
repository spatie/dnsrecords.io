<?php

function locale()
{
    return config('app.locale');
}

function formatOutput($input)
{
    $collapseBracketInformation = '(((SOA|TXT|DNSKEY)[\s\w\.]+\())([\w\s\;\(\)\+\/\=]+)(\))';
    $result = preg_replace("/$collapseBracketInformation/m", '$1 … $5', $input);

    $replaceSpaces = '([ ]{2,}|[\t]+)';
    $result = preg_replace("/$replaceSpaces/m", ' ', $result);

    $replaceTrailingInformation = '^[\w\.]*\s[\d]+\s(IN\s)?';
    $result = preg_replace("/$replaceTrailingInformation/m", '', $result);

    $result = str_replace(PHP_EOL, ' | ', $result);
    $result = trim($result, ' |');

    return $result;
}
