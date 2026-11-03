const esbuild = require('esbuild');

console.log('Building TipTap bundle...');
esbuild.buildSync({
    entryPoints: ['src/tiptap-bundle.js'],
    bundle: true,
    minify: true,
    outfile: 'public/js/tiptap-bundle.min.js',
    format: 'iife',
    globalName: 'TipTapBundle',
    platform: 'browser',
    target: ['es2020']
});
console.log('TipTap bundle successfully built to public/js/tiptap-bundle.min.js');
