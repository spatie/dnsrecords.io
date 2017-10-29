import History from './History.js';
const input = document.getElementById('url');
const form = document.getElementById('form');
const history = new History();


form.addEventListener('submit', event => {
    event.preventDefault();

    form.action = input.value.toLowerCase();

    form.submit();
});

window.addEventListener('click', event => {
    event.stopPropagation();

    const source = event.srcElement || event.originalTarget;

    if (source.id !== 'results') {
        input.focus();
    }

    setTimeout(() => {
        if (! isResultTextSelected()) {
            input.focus();
        }
    }, 200);
});

input.addEventListener('keydown', event => {
    if (event.keyCode === 38) {
        input.value = history.getPrevious();
    } else if (event.keyCode === 40) {
        input.value = history.getNext();
    }
});

form.addEventListener('submit', event => {
    history.add(event.target.url.value);
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

