class History {

    constructor() {
        this.importFromLocalStorage();
        this.index = 0;
    }

    add(value) {
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
}

export default History;
