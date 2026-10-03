const form = document.getElementById('form');
const input = document.getElementById('url');

form.addEventListener('submit', event => {
    event.preventDefault();

    const lookupBaseUrl = form.getAttribute('action').replace(/\/$/, '');

    form.action = `${lookupBaseUrl}/${input.value}`;

    form.submit();
});

window.addEventListener('click', event => {
    event.stopPropagation();

    setTimeout(() => {
        if (! isResultTextSelected()) {
            input.focus();
        }
    }, 200);
});

function isResultTextSelected() {
    if (typeof window.getSelection !== 'undefined' && window.getSelection().toString() !== '') {
        return true;
    }

    if (typeof document.selection !== 'undefined' && document.selection.createRange().text !== '') {
        return true;
    }

    return false;
}

