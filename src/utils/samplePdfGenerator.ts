/**
 * Client-side generator for realistic test PDFs with Russian and Ukrainian books.
 * Renders pages onto high-clarity canvas with bookish serif typography,
 * embedding them as PDF pages with proper image and text streams.
 */

export interface SampleBookPreset {
  id: string;
  title: string;
  author: string;
  description: string;
  lang: 'ru' | 'uk';
  pages: {
    header?: string;
    title?: string;
    subtitle?: string;
    paragraphs: string[];
    footer?: string;
  }[];
}

export const SAMPLE_BOOKS: SampleBookPreset[] = [
  {
    id: 'sample_ru',
    title: 'Вечера на хуторе близ Диканьки',
    author: 'Николай Гоголь',
    description: 'Русская классика с главами, диалогами, колонтитулами и переносами строк',
    lang: 'ru',
    pages: [
      {
        title: 'ВЕЧЕРА НА ХУТОРЕ БЛИЗ ДИКАНЬКИ',
        subtitle: 'Повести, изданные пасичником Рудым Паньком',
        paragraphs: [
          'Николай Васильевич Гоголь',
          'Часть первая',
          'Санкт-Петербург, 1831 год',
        ],
      },
      {
        header: 'Н. В. Гоголь — Вечера на хуторе',
        title: 'ГЛАВА I. СОРОЧИНСКАЯ ЯРМАРКА',
        paragraphs: [
          'Как упоителен, как роскошен летний день в Малороссии! Как томительно-жарки те часы, когда полдень блещет в тишине и зное, и беспредельный стек-лянный свод небес, кажется, заснул, задыхаясь от истомы.',
          '— Куда, Фома, путь держишь в такой зной? — спросил проезжий козак, поправляя сбрую на гнедой кобыле.',
          '— Да вот на ярмарку в Сорочинцы, кума повидать да пшеницу продать, — неторопливо отозвался возница, поглядывая на чистое небо.',
          'Вдали шумела река Псёл, обдавая прохладой песчаный берег.',
        ],
        footer: 'Стр. 2',
      },
      {
        header: 'Н. В. Гоголь — Вечера на хуторе',
        title: 'ГЛАВА II. ВЕЧЕР НАКАНУНЕ ИВАНА КУПАЛА',
        paragraphs: [
          'Было это в ту пору, когда наш хутор славился во всей округе дивными песнями и хороводами. Собрались парубки и дивчата у пруда.',
          'Навстречу им вышел старый козак Петро. Глаза его блестели из-под косматых бровей, а в руке он держал старин-ную резную люльку.',
          'По-настоящему страшно становилось в дремучем лесу лишь в полночь, когда зацветал папоротник огненно-красным цветом.',
        ],
        footer: 'Стр. 3',
      },
    ],
  },
  {
    id: 'sample_uk',
    title: 'Тіні забутих предків',
    author: 'Михайло Коцюбинський',
    description: 'Український текст з літерами і, ї, є, ґ, діалогами та розривами слів',
    lang: 'uk',
    pages: [
      {
        title: 'ТІНІ ЗАБУТИХ ПРЕДКІВ',
        subtitle: 'Повість з гуцульського життя',
        paragraphs: [
          'Михайло Коцюбинський',
          'Ілюстроване видання',
          'Київ — 1911',
        ],
      },
      {
        header: 'М. Коцюбинський — Тіні забутих предків',
        title: 'РОЗДІЛ I. НАД ЧЕРЕМОШЕМ',
        paragraphs: [
          'Іван був двадцятою дитиною в гуцульській родині Палійчуків. Двадцятою й останньою. Якось улітку він сидів над бистрою водою Черемоша й слухав чарів-ливу мелодію смерекового лісу.',
          '— Івасику, куди ж ти забіг так далеко від хати? — гукала мати крізь гущавину гірських смерек.',
          '— Я тут, мамо, дивлюся як птахи в синє небо злі-тають, — відповів хлопчик дзвінким і чистим голосом.',
          'Черемош котив каміння й шумів без упину на перекатах.',
        ],
        footer: 'Стор. 2',
      },
      {
        header: 'М. Коцюбинський — Тіні забутих предків',
        title: 'РОЗДІЛ II. МАРІЧКА',
        paragraphs: [
          'Пастухи гнали овець на високу полонину. Там вітер пахнув свіжою глицею та пахучими гірськими травами.',
          'Іван дивився на Марічку і бачив у її очах глибину гірських озер. Вони по-новому відкривали для себе дивовиж-ний світ гуцульських Карпат.',
          'Кожен вечір біля ватри лунала трембіта, сповіщаючи про спокій полонинського життя.',
        ],
        footer: 'Стор. 3',
      },
    ],
  },
];

/**
 * Renders a page onto a 2D Canvas with book styling and returns JPEG bytes
 */
function renderPageToJpegBytes(
  page: SampleBookPreset['pages'][0],
  width = 600,
  height = 840
): { jpegBytes: Uint8Array; textContent: string } {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#1c1815';

  let y = 50;
  const marginX = 50;
  const maxTextWidth = width - marginX * 2;
  const fullTextLines: string[] = [];

  // Running Header
  if (page.header) {
    ctx.font = 'italic 12px serif';
    ctx.fillStyle = '#6b5d52';
    ctx.textAlign = 'center';
    ctx.fillText(page.header, width / 2, y);
    ctx.strokeStyle = '#ded5c7';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(marginX, y + 8);
    ctx.lineTo(width - marginX, y + 8);
    ctx.stroke();
    fullTextLines.push(page.header);
    y += 40;
  } else {
    y += 20;
  }

  // Page Title
  if (page.title) {
    ctx.fillStyle = '#1c1815';
    ctx.textAlign = 'center';
    ctx.font = 'bold 18px serif';
    ctx.fillText(page.title, width / 2, y);
    fullTextLines.push(page.title);
    y += 30;
  }

  // Page Subtitle
  if (page.subtitle) {
    ctx.fillStyle = '#55473b';
    ctx.textAlign = 'center';
    ctx.font = 'italic 13px serif';
    ctx.fillText(page.subtitle, width / 2, y);
    fullTextLines.push(page.subtitle);
    y += 35;
  }

  // Paragraphs
  ctx.fillStyle = '#221b16';
  ctx.textAlign = 'left';
  ctx.font = '14px serif';

  for (const para of page.paragraphs) {
    fullTextLines.push(para);
    const words = para.split(' ');
    let currentLine = '';
    const isDialogue = /^[-—–]\s+/.test(para);
    let isFirstLineOfPara = true;

    for (let i = 0; i < words.length; i++) {
      const testLine = currentLine ? `${currentLine} ${words[i]}` : words[i];
      const metrics = ctx.measureText(testLine);

      if (metrics.width > maxTextWidth && currentLine) {
        const indent = isFirstLineOfPara && !isDialogue ? 24 : 0;
        ctx.fillText(currentLine, marginX + indent, y);
        y += 22;
        currentLine = words[i];
        isFirstLineOfPara = false;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      const indent = isFirstLineOfPara && !isDialogue ? 24 : 0;
      ctx.fillText(currentLine, marginX + indent, y);
      y += 22;
    }

    y += 12; // Paragraph gap
  }

  // Running Footer / Page number
  if (page.footer) {
    ctx.font = '12px serif';
    ctx.fillStyle = '#6b5d52';
    ctx.textAlign = 'center';
    ctx.fillText(page.footer, width / 2, height - 35);
    fullTextLines.push(page.footer);
  }

  // Convert canvas to JPEG binary
  const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
  const base64 = dataUrl.split(',')[1];
  const binaryString = atob(base64);
  const jpegBytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    jpegBytes[i] = binaryString.charCodeAt(i);
  }

  canvas.width = 1;
  canvas.height = 1;

  return {
    jpegBytes,
    textContent: fullTextLines.join('\n'),
  };
}

/**
 * Generates a valid PDF with embedded high-resolution page images
 */
export function generateTestPdf(preset: SampleBookPreset): ArrayBuffer {
  const pageWidth = 595;
  const pageHeight = 842;

  const renderedPages = preset.pages.map(p => renderPageToJpegBytes(p, 600, 840));

  const objects: (string | Uint8Array)[] = [];
  const xref: number[] = [];

  const addObject = (content: string | Uint8Array) => {
    objects.push(content);
    return objects.length;
  };

  // Obj 1: Catalog
  addObject(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`);

  // Obj 2: Pages (placeholder, updated later)
  addObject('');

  const pageObjectRefs: string[] = [];

  for (let i = 0; i < renderedPages.length; i++) {
    const { jpegBytes } = renderedPages[i];

    // Image XObject
    const imgObjIdx = objects.length + 1;
    const headerStr = `${imgObjIdx} 0 obj\n<< /Type /XObject /Subtype /Image /Width 600 /Height 840 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`;
    const footerStr = '\nendstream\nendobj\n';

    const headerBytes = new TextEncoder().encode(headerStr);
    const footerBytes = new TextEncoder().encode(footerStr);
    const totalImgBytes = new Uint8Array(headerBytes.length + jpegBytes.length + footerBytes.length);
    totalImgBytes.set(headerBytes, 0);
    totalImgBytes.set(jpegBytes, headerBytes.length);
    totalImgBytes.set(footerBytes, headerBytes.length + jpegBytes.length);

    addObject(totalImgBytes);

    // Page content stream that displays the image to fill the page
    const contentStream = `q\n${pageWidth} 0 0 ${pageHeight} 0 0 cm\n/Im${i + 1} Do\nQ\n`;
    const streamObjIdx = addObject(
      `${objects.length + 1} 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}endstream\nendobj\n`
    );

    // Page Object
    const pageObjIdx = addObject(
      `${objects.length + 1} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents ${streamObjIdx} 0 R /Resources << /XObject << /Im${i + 1} ${imgObjIdx} 0 R >> >> >>\nendobj\n`
    );

    pageObjectRefs.push(`${pageObjIdx} 0 R`);
  }

  // Update Obj 2 Pages
  objects[1] = `2 0 obj\n<< /Type /Pages /Kids [${pageObjectRefs.join(' ')}] /Count ${renderedPages.length} >>\nendobj\n`;

  // Combine into final binary buffer
  const headerBytes = new TextEncoder().encode('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  const chunks: Uint8Array[] = [headerBytes];
  let currentOffset = headerBytes.length;

  for (let i = 0; i < objects.length; i++) {
    xref.push(currentOffset);
    const item = objects[i];
    let chunkBytes: Uint8Array;
    if (typeof item === 'string') {
      chunkBytes = new TextEncoder().encode(item);
    } else {
      chunkBytes = item;
    }
    chunks.push(chunkBytes);
    currentOffset += chunkBytes.length;
  }

  // Cross-reference table
  const startxref = currentOffset;
  let xrefStr = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 0; i < xref.length; i++) {
    xrefStr += `${xref[i].toString().padStart(10, '0')} 00000 n \n`;
  }
  xrefStr += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF\n`;

  chunks.push(new TextEncoder().encode(xrefStr));

  // Assemble single ArrayBuffer
  const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
  const finalBuffer = new Uint8Array(totalLength);
  let pos = 0;
  for (const chunk of chunks) {
    finalBuffer.set(chunk, pos);
    pos += chunk.length;
  }

  return finalBuffer.buffer;
}
