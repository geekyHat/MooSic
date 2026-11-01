# Downloaded import fixtures

Downloaded 2026-10-28 from the official [ChordPro repository](https://github.com/ChordPro/chordpro). These files are test inputs, not additions to the bundled repertoire. The repository’s license and author notices apply; a copy is included in `LICENSE-ChordPro.txt`.

- `swinglow.cho`: [original](https://github.com/ChordPro/chordpro/blob/master/lib/ChordPro/res/examples/swinglow.cho), Git blob `b91f32dfe5cd1f613f3d35d344075b6dc44e7938`, SHA-256 `27cd939b5f6ce1cbc0ee51f2eaf042098a40a25323f7b1e85a3d817a8004d95e`.
- `tab-example.cho`: [original](https://github.com/ChordPro/chordpro/blob/master/wiki/images/ex_tabcolour.cho), Git blob `94bddc9b5bc212ba949d995053af7112e2ed12a3`, SHA-256 `12e92cda0f4d9609da12c464d4e673cb1d5f0f92c3480cd767f5758c0cd767f8`.
- `unsupported-abc.cho`: [original](https://github.com/ChordPro/chordpro/blob/master/lib/ChordPro/res/examples/mollymalone.cho), Git blob `071912358e2e0516c94af5d7eec555f64f0669c5`, SHA-256 `bc875aa309791d154d55b274444afcca379b06bb9953bceff2e36f4a8797c048`.

`swinglow.cho` exercises repeated choruses and Unicode. `tab-example.cho` exercises six-string TAB blocks, repeat instructions and ignored presentation settings. `unsupported-abc.cho` must be rejected explicitly because delegated ABC sections are unsupported. Automated browser tests use these downloaded files without network access.
