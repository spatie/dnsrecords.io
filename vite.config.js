import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';

export default defineConfig(({ command }) => ({
    /*
     * Build assets are served by the app, which adds the cache headers that
     * let the edge keep them until the next deploy.
     */
    base: command === 'build' ? '/static/' : '',
    plugins: [
        laravel({
            input: [
                'resources/css/app.css',
                'resources/js/app.js',
                'resources/css/crt.css',
                'resources/js/crt.js',
                'resources/css/startrek.css',
                'resources/js/startrek.js',
                'resources/css/alien.css',
                'resources/js/alien.js',
                'resources/css/interfaces.css',
                'resources/css/matrix.css',
                'resources/js/interfaces.js',
            ],
            refresh: true,
        }),
    ],
}));
