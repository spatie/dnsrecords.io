class History {

    constructor() {
        this.importFromLocalStorage();
        this.index = 0;
    }

    add(value) {

        if (this.items.length > 1000) {
            this.items.pop();
        }

        this.items.unshift(value);
        this.save();
    }

    importFromLocalStorage() {
        const storedHistory = JSON.parse(localStorage.getItem('history'));
        this.items = storedHistory || [];
    }

    save() {
        localStorage.setItem('history', JSON.stringify(this.items));
    }

    getPrevious() {
        if (this.index < this.items.length - 1) {
            return this.items[this.index++];
        }

        return this.items[this.items.length - 1];
    }

    getNext() {
        if (this.index > 0) {
            return this.items[--this.index];
        }

        return '';
    }

    clear() {
        this.items = [];
        this.save();
    }
}

export default History;
