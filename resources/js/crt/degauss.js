/*
 * A springy wobble with a brief shimmer of colour, a wink at the degauss
 * coil of old monitors, which kicked in on its own now and then. The glass
 * adds the shimmer; a brightness filter on the whole screen is only worth
 * it where the screen is painted on the GPU, as it is slow to paint in
 * Safari, so it is optional.
 */
export function degaussWobble(element, { brighten = false, strength = 1 } = {}) {
    const keyframes = [];
    const frames = 40;

    for (let frame = 0; frame <= frames; frame++) {
        const progress = frame / frames;
        const amplitude = Math.exp(-4.2 * progress) * (1 - Math.exp(-progress * 30)) * strength;
        const keyframe = {
            transform: `skewX(${(Math.sin(progress * Math.PI * 7) * 1.4 * amplitude).toFixed(3)}deg) scale(${(1 + Math.sin(progress * Math.PI * 5) * .006 * amplitude).toFixed(4)})`,
        };

        if (brighten) {
            keyframe.filter = `brightness(${(1 + Math.abs(Math.sin(progress * Math.PI * 6)) * .5 * amplitude).toFixed(3)})`;
        }

        keyframes.push(keyframe);
    }

    return element.animate(keyframes, { duration: 1600, easing: 'linear' });
}
