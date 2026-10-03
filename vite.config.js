import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';

export default defineConfig({
    plugins: [
        laravel({
            input: [
                'resources/css/app.css',
                'resources/js/app.js',
                'resources/css/crt.css',
                'resources/js/crt.js',
                'resources/css/startrek.css',
                'resources/js/startrek.js',
            ],
            refresh: true,
        }),
    ],
});
