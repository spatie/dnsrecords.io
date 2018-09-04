const mix = require('laravel-mix');

mix.config.uglify.compress.drop_console = false;
mix.config.postCss = require('./postcss.config').plugins;

/*
 |--------------------------------------------------------------------------
 | Mix Asset Management
 |--------------------------------------------------------------------------
 |
 | Mix provides a clean, fluent API for defining some Webpack build steps
 | for your Laravel application. By default, we are compiling the Sass
 | file for the application as well as bundling up all the JS files.
 |
 */

mix
    .version()
    .js('resources/js/app.js', 'public/js')
    .postCss('resources/css/app.css', 'public/css');
