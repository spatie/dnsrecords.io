<template>
    <div>
        <h1
            v-if="results.length == 0"
            class="title">
            <span class="carret">~</span>
            dnsrecords.io
        </h1>
        <div
            v-for="result in results">
            <h1
                v-if="result.type == 'command'"
                class="title">
                <span class="carret">~</span>
                dnsrecords.io $ {{ result.message }}
            </h1>
            <pre
                v-else-if="result.type == 'default'"
                class="main__results"
                id="results"
                v-html="result.message"
            ></pre>
            <p
                v-else-if="result.type == 'danger'"
                class="alert alert--danger"
                v-html="result.message"
            ></p>
            <div
                v-else=""
                :class="'alert alert--' + result.type"
                role="alert"
                v-html="result.message"
            ></div>
        </div>
        <span class="carret -green">&rarr;</span>
        <input
                id="url"
                name="command"
                placeholder="Enter a domain"
                autocomplete="off"
                autocorrect="off"
                autocapitalize="off"
                autofocus="autofocus"
                spellcheck="false"
                v-model="input"
                v-on:keyup.enter="execute()"
                v-on:keydown.up="previous()"
                v-on:keydown.down="next()"
        />
    </div>
</template>
<script>
    import History from '../History.js';
    export default {
        updated() {
            window.scrollTo(0, document.body.scrollHeight);
        },

        mounted() {
            let hash = window.location.hash;
            if ('' !== hash) {
                this.input = hash.substr(1);
                this.execute();
            }
        },

        data() {
            return {
                results: [],
                input: '',
                history: new History()
            }
        },

        methods : {
            send(command) {
                axios.get('/' + command).then(response => {
                    this.results.push(response.data);
                })
            },

            previous() {
                this.input = this.history.getPrevious();
            },

            next() {
                this.input = this.history.getNext();
            },

            execute() {
                let input = this.input;
                this.input = '';

                this.history.add(input);
                this.results.push({
                    'message' : input,
                    'type': 'command',
                });
                window.location.hash = '#'+input;

                switch(input)
                {
                    case 'doom':
                        window.location.href = "https://js-dos.com/games/doom.exe.html";
                        return;

                    case 'clear':
                        return this.results = [];

                    case 'history -c':
                        return this.history.clear();

                    default:
                        this.send(input);
                }
            }
        }
    }
</script>