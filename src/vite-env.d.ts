/// <reference types="vite/client" />
declare const __APP_BUILD__: string

declare module 'abcjs/src/api/abc_tunebook.js' { const tunebook:Pick<typeof import('abcjs'),'parseOnly'>;export default tunebook }
declare module 'abcjs/src/api/abc_tunebook_svg.js' { const renderAbc:typeof import('abcjs')['renderAbc'];export default renderAbc }
