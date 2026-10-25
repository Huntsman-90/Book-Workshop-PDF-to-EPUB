import JSZip from 'jszip';
import { BookChapter, BookSettings } from '../types/converter';
import { escapeXml } from './bookStructure';

/**
 * Converts a base64 Data URL to Uint8Array
 */
function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const parts = dataUrl.split(',');
  const byteString = atob(parts[1]);
  const u8Array = new Uint8Array(byteString.length);
  for (let i = 0; i < byteString.length; i++) {
    u8Array[i] = byteString.charCodeAt(i);
  }
  return u8Array;
}

export async function buildEpub3(
  settings: BookSettings,
  chapters: BookChapter[],
  coverDataUrl?: string
): Promise<Blob> {
  const zip = new JSZip();

  // 1. Mandatory FIRST file: mimetype (STORE uncompressed)
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

  // 2. META-INF/container.xml
  const containerXml = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;
  zip.file('META-INF/container.xml', containerXml);

  // Book metadata
  const bookTitle = escapeXml(settings.title || 'Без названия');
  const bookAuthor = escapeXml(settings.author || 'Неизвестный автор');
  const bookLang = escapeXml(settings.outputLang || 'ru');
  const uniqueId = `urn:uuid:${crypto.randomUUID ? crypto.randomUUID() : 'book-' + Date.now()}`;
  const modifiedDate = new Date().toISOString().replace(/\.\d+Z$/, 'Z');

  // CSS Stylesheet
  const stylesCss = `@charset "utf-8";
html, body {
  margin: 0;
  padding: 0;
  font-family: serif;
  font-size: 1em;
  line-height: 1.5;
  color: #1a1a1a;
  background-color: transparent;
}

body.chapter {
  padding: 4% 5%;
}

p {
  margin-top: 0;
  margin-bottom: 0;
  text-indent: 1.4em;
  text-align: justify;
  hyphens: auto;
  -webkit-hyphens: auto;
  -moz-hyphens: auto;
  -ms-hyphens: auto;
  word-break: normal;
  overflow-wrap: break-word;
}

p.dialogue {
  text-indent: 0;
  margin-left: 0;
  margin-top: 0.1em;
  margin-bottom: 0.1em;
}

h1, h2, h3 {
  text-align: center;
  font-weight: bold;
  page-break-after: avoid;
  break-after: avoid;
}

h2.chapter-title {
  font-size: 1.35em;
  margin-top: 2em;
  margin-bottom: 1.2em;
}

.cover-wrapper {
  text-align: center;
  padding: 0;
  margin: 0;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
}

.cover-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

nav#toc ol {
  list-style-type: none;
  padding-left: 0;
}

nav#toc li {
  margin-bottom: 0.6em;
}

nav#toc a {
  text-decoration: none;
  color: #1a1a1a;
}
`;
  zip.file('OEBPS/styles.css', stylesCss);

  // Cover processing
  const hasCover = Boolean(coverDataUrl && settings.extractCover);
  if (hasCover && coverDataUrl) {
    try {
      const coverU8 = dataUrlToUint8Array(coverDataUrl);
      zip.file('OEBPS/cover.jpg', coverU8);

      const coverXhtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${bookLang}">
<head>
  <meta charset="utf-8" />
  <title>Обложка</title>
  <link rel="stylesheet" type="text/css" href="styles.css" />
</head>
<body class="cover">
  <div class="cover-wrapper" epub:type="cover">
    <img src="cover.jpg" alt="${bookTitle}" class="cover-image" />
  </div>
</body>
</html>`;
      zip.file('OEBPS/cover.xhtml', coverXhtml);
    } catch {
      // If cover conversion fails, proceed without cover
    }
  }

  // 3. Write individual chapter XHTML files
  for (const ch of chapters) {
    zip.file(`OEBPS/${ch.id}.xhtml`, ch.contentHtml);
  }

  // 4. OEBPS/nav.xhtml (EPUB 3 Navigation Document)
  const navItems = chapters
    .map(ch => `      <li><a href="${ch.id}.xhtml">${escapeXml(ch.title)}</a></li>`)
    .join('\n');

  const navXhtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${bookLang}">
<head>
  <meta charset="utf-8" />
  <title>Содержание</title>
  <link rel="stylesheet" type="text/css" href="styles.css" />
</head>
<body>
  <nav epub:type="toc" id="toc" role="doc-toc">
    <h2>Содержание</h2>
    <ol>
${navItems}
    </ol>
  </nav>
</body>
</html>`;
  zip.file('OEBPS/nav.xhtml', navXhtml);

  // 5. OEBPS/toc.ncx (EPUB 2 backward compatibility)
  const ncxNavPoints = chapters
    .map(
      (ch, idx) => `    <navPoint id="navPoint-${idx + 1}" playOrder="${idx + 1}">
      <navLabel><text>${escapeXml(ch.title)}</text></navLabel>
      <content src="${ch.id}.xhtml"/>
    </navPoint>`
    )
    .join('\n');

  const tocNcx = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${uniqueId}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${bookTitle}</text></docTitle>
  <docAuthor><text>${bookAuthor}</text></docAuthor>
  <navMap>
${ncxNavPoints}
  </navMap>
</ncx>`;
  zip.file('OEBPS/toc.ncx', tocNcx);

  // 6. OEBPS/content.opf
  const manifestItems: string[] = [
    '    <item id="styles" href="styles.css" media-type="text/css"/>',
    '    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>',
    '    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>',
  ];

  if (hasCover) {
    manifestItems.push('    <item id="cover-image" href="cover.jpg" media-type="image/jpeg" properties="cover-image"/>');
    manifestItems.push('    <item id="cover-xhtml" href="cover.xhtml" media-type="application/xhtml+xml"/>');
  }

  for (const ch of chapters) {
    manifestItems.push(`    <item id="${ch.id}" href="${ch.id}.xhtml" media-type="application/xhtml+xml"/>`);
  }

  const spineItems: string[] = [];
  if (hasCover) {
    spineItems.push('    <itemref idref="cover-xhtml"/>');
  }
  for (const ch of chapters) {
    spineItems.push(`    <itemref idref="${ch.id}"/>`);
  }

  const contentOpf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="pub-id" xml:lang="${bookLang}">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="pub-id">${uniqueId}</dc:identifier>
    <dc:title>${bookTitle}</dc:title>
    <dc:language>${bookLang}</dc:language>
    <dc:creator>${bookAuthor}</dc:creator>
    <meta property="dcterms:modified">${modifiedDate}</meta>
${hasCover ? '    <meta name="cover" content="cover-image"/>\n' : ''}  </metadata>
  <manifest>
${manifestItems.join('\n')}
  </manifest>
  <spine toc="ncx">
${spineItems.join('\n')}
  </spine>
</package>`;

  zip.file('OEBPS/content.opf', contentOpf);

  // Generate EPUB Blob (ZIP container)
  const blob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/epub+zip',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  return blob;
}
