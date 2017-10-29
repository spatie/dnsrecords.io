require('./bootstrap');
const Vue = require('vue');

Vue.component('terminal', require('./components/terminal.vue'));

const app = new Vue({
    el: '#main',
});


const input = document.getElementById('url');

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

function isResultTextSelected() {

    if (typeof window.getSelection !== 'undefined' && window.getSelection().toString() !== '') {
        return true;
    }

    if (typeof document.selection !== 'undefined' && document.selection.createRange().text !== '') {
        return true;
    }

    return false;
}

