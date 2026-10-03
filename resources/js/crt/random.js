/*
 * Randomness for the screens: waiting times that never repeat a rhythm,
 * and smooth noise for slow changes like flicker and breathing.
 */

/**
 * A random waiting time with the given mean, as between independent events.
 */
export function exponential(mean, minimum = 0) {
    return minimum + -Math.log(1 - Math.random()) * mean;
}

export function between(min, max) {
    return min + Math.random() * (max - min);
}

/**
 * Moves a value towards a target at a rate that does not depend on the
 * frame rate.
 */
export function approach(current, target, speed, delta) {
    return current + (target - current) * (1 - Math.exp(-speed * delta));
}

/**
 * Smooth one dimensional value noise with a random table per page load, so
 * the slow changes never repeat the same way twice.
 */
export function noise1d() {
    const size = 512;
    const table = Array.from({ length: size }, () => Math.random() * 2 - 1);

    return value => {
        const index = Math.floor(value);
        const fraction = value - index;
        const smooth = fraction * fraction * (3 - 2 * fraction);
        const a = table[((index % size) + size) % size];
        const b = table[(((index + 1) % size) + size) % size];

        return a + (b - a) * smooth;
    };
}
