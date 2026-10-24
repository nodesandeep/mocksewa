/**
 * htmlToNotesMarkdown.js
 * Utility to convert offline HTML files (such as those exported from VidyaPDF,
 * Google AI Studio note compilers, or offline Loksewa handbooks) into clean,
 * high-yield Markdown compatible with MyMockSewa's slide deck & handbook engine.
 */

export function parseOfflineHtmlFile(htmlString, fileName = '') {
  if (typeof window === 'undefined') {
    return { title: '', markdown: '' };
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');

    // 1. Remove non-content elements
    const unwantedSelectors = [
      'script', 'style', 'noscript', 'iframe', 'button', 'input', 'form',
      '.print-button', '.export-banner', '.modal-header', '.no-print',
      'nav', 'footer', '.watermark-actions'
    ];
    unwantedSelectors.forEach(sel => {
      doc.querySelectorAll(sel).forEach(el => el.remove());
    });

    // 2. Extract Chapter Title
    let extractedTitle = '';

    // Check <h1 class="..."> or standard <h1>
    const h1 = doc.querySelector('h1');
    if (h1 && h1.textContent.trim()) {
      extractedTitle = h1.textContent.trim();
    }

    // Check if there is a meta document tag or subtitle
    if (!extractedTitle) {
      const docMatch = htmlString.match(/Document:\s*([^\n<]+)/i);
      if (docMatch && docMatch[1].trim()) {
        extractedTitle = docMatch[1].trim();
      }
    }

    // Check <title>
    if (!extractedTitle && doc.title && doc.title.trim()) {
      const cleanTitle = doc.title.replace(/myMOCKsewa.*$/i, '').replace(/PDF.*$/i, '').trim();
      if (cleanTitle) extractedTitle = cleanTitle;
    }

    // Fallback to filename
    if (!extractedTitle && fileName) {
      extractedTitle = fileName
        .replace(/\.[^/.]+$/, '')
        .replace(/[_-]/g, ' ')
        .trim();
    }

    // 3. Locate the main content container if present
    const mainContainer = 
      doc.querySelector('.printable, .content, .notes-container, article, main, #notes-content, .page, body') || 
      doc.body;

    // 4. Clean KaTeX Math annotations before converting text
    // KaTeX outputs math with an annotation tag containing raw TeX
    mainContainer.querySelectorAll('.katex, .katex-display').forEach(mathEl => {
      const texAnnotation = mathEl.querySelector('annotation[encoding="application/x-tex"]');
      const isDisplay = mathEl.classList.contains('katex-display') || mathEl.tagName.toLowerCase() === 'div';
      if (texAnnotation && texAnnotation.textContent) {
        const tex = texAnnotation.textContent.trim();
        const replacement = doc.createTextNode(isDisplay ? `\n\n$$${tex}$$\n\n` : `$${tex}$`);
        mathEl.replaceWith(replacement);
      }
    });

    // 5. Recursively walk the DOM and generate Markdown
    let md = nodeToMarkdown(mainContainer).trim();

    // 6. Post-processing cleanup specifically for Loksewa / VidyaPDF conventions
    md = md.replace(/\r\n/g, '\n');

    // Convert legacy ☆ or star characters to standard - ⭐ bullet
    md = md.replace(/(?:^|\n)\s*[⭐☆★]\s*/g, '\n- ⭐ ');
    md = md.replace(/(?:^|\n)\s*[➤►▶]\s*/g, '\n  - ➤ ');

    // Normalize Topic headers: "TOPIC 1", "Topic 1:", "### Topic 1"
    md = md.replace(/(?:^|\n)\s*(?:###\s*)?TOPIC\s*(\d+)[^\S\r\n]*[:\s-]*(?:##\s*)?([^\r\n]*)/gi, (match, p1, p2) => {
      const title = p2.trim();
      return title ? `\n\n---\n\n### TOPIC ${p1}\n\n## ${title}\n\n` : `\n\n---\n\n### TOPIC ${p1}\n\n`;
    });

    // Remove leading duplicate horizontal rule if any
    md = md.replace(/^\s*---\s*\n+/, '');

    // Convert callouts if written in raw text
    md = md.replace(/(?:^|\n)\s*सूत्र[:\s]([^\n]+)/g, '\n\n> 💡 **सूत्र:** $1\n\n');
    md = md.replace(/(?:^|\n)\s*सूत्र\s*"([^"]+)"[—:\s]([^\n]+)/g, '\n\n> 💡 **सूत्र: "$1"**\n> $2\n\n');
    md = md.replace(/(?:^|\n)\s*[⚠⚠️]?\s*स्मरण रहोस्[^\n:]*[:]?([^\n]+)/g, '\n\n> ⚠️ **स्मरण रहोस् (Exam Alert):** $1\n\n');
    md = md.replace(/(?:^|\n)\s*स्रोत विमति[^\n:]*[:]?([^\n]+)/g, '\n\n> 📌 **स्रोत विमति / स्पष्टीकरण:** $1\n\n');
    md = md.replace(/(?:^|\n)\s*गहन सन्दर्भ[^\n:]*[:]?([^\n]+)/g, '\n\n> 📖 **गहन सन्दर्भ तथा विषयवस्तु विस्तार:** $1\n\n');
    md = md.replace(/(?:^|\n)\s*विगत परीक्षा[^\n:]*[:]?([^\n]+)/g, '\n\n> 🎯 **विगत परीक्षा प्रश्न विश्लेषण:** $1\n\n');

    // Collapse multiple blank lines
    md = md.replace(/\n{3,}/g, '\n\n');

    return {
      title: extractedTitle,
      markdown: md
    };
  } catch (err) {
    console.error('Error parsing offline HTML file:', err);
    return {
      title: fileName ? fileName.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ') : '',
      markdown: htmlString
    };
  }
}

function nodeToMarkdown(node) {
  if (!node) return '';

  // Text Node
  if (node.nodeType === Node.TEXT_NODE) {
    return node.nodeValue;
  }

  // Element Node
  if (node.nodeType === Node.ELEMENT_NODE) {
    const tag = node.tagName.toLowerCase();

    // Check for inline child markdown first
    const getChildrenMd = () => {
      let result = '';
      node.childNodes.forEach(child => {
        result += nodeToMarkdown(child);
      });
      return result;
    };

    switch (tag) {
      case 'h1':
        return `\n\n# ${getChildrenMd().trim()}\n\n`;
      case 'h2': {
        const text = getChildrenMd().trim();
        // Check if h2 is actually "TOPIC X"
        const topicMatch = text.match(/^TOPIC\s*(\d+)/i);
        if (topicMatch) {
          return `\n\n### TOPIC ${topicMatch[1]}\n\n`;
        }
        return `\n\n## ${text}\n\n`;
      }
      case 'h3': {
        const text = getChildrenMd().trim();
        const topicMatch = text.match(/^TOPIC\s*(\d+)/i);
        if (topicMatch) {
          return `\n\n### TOPIC ${topicMatch[1]}\n\n`;
        }
        return `\n\n### ${text}\n\n`;
      }
      case 'h4':
        return `\n\n#### ${getChildrenMd().trim()}\n\n`;
      case 'h5':
      case 'h6':
        return `\n\n##### ${getChildrenMd().trim()}\n\n`;

      case 'p': {
        const text = getChildrenMd().trim();
        if (!text) return '';
        // If paragraph is just "TOPIC \d+"
        const topicMatch = text.match(/^TOPIC\s*(\d+)$/i);
        if (topicMatch) {
          return `\n\n### TOPIC ${topicMatch[1]}\n\n`;
        }
        return `\n\n${text}\n\n`;
      }

      case 'hr':
        return `\n\n---\n\n`;

      case 'blockquote': {
        const text = getChildrenMd().trim();
        const lines = text.split('\n').map(l => `> ${l}`).join('\n');
        return `\n\n${lines}\n\n`;
      }

      case 'ul':
      case 'ol': {
        let listMd = '\n';
        let itemIndex = 1;
        node.childNodes.forEach(child => {
          if (child.nodeType === Node.ELEMENT_NODE && child.tagName.toLowerCase() === 'li') {
            const itemText = nodeToMarkdown(child).trim();
            if (itemText) {
              if (tag === 'ol') {
                listMd += `${itemIndex}. ${itemText}\n`;
                itemIndex++;
              } else {
                // If it already has star, keep it
                if (itemText.startsWith('⭐') || itemText.startsWith('☆')) {
                  listMd += `- ${itemText}\n`;
                } else {
                  listMd += `- ${itemText}\n`;
                }
              }
            }
          }
        });
        return `${listMd}\n`;
      }

      case 'li':
        return getChildrenMd();

      case 'table':
        return tableToMarkdown(node);

      case 'strong':
      case 'b': {
        const inner = getChildrenMd();
        return inner.trim() ? `**${inner.trim()}**` : '';
      }

      case 'em':
      case 'i': {
        const inner = getChildrenMd();
        return inner.trim() ? `*${inner.trim()}*` : '';
      }

      case 'code': {
        const inner = getChildrenMd();
        return `\`${inner}\``;
      }

      case 'pre': {
        const inner = getChildrenMd();
        return `\n\n\`\`\`\n${inner.trim()}\n\`\`\`\n\n`;
      }

      case 'br':
        return '\n';

      case 'div':
      case 'section':
      case 'article': {
        const className = (node.className || '').toLowerCase();

        // 1. VidyaPDF / Loksewa section cards: <div class="section-card nepali">
        if (className.includes('section-card')) {
          const numEl = node.querySelector('.num');
          const h3El = node.querySelector('.section-title h3, h3');
          const h4El = node.querySelector('.section-title h4, h4');

          const topicNum = numEl ? numEl.textContent.trim() : '';
          const topicTitle = h3El ? h3El.textContent.trim() : '';
          const subTitle = h4El ? h4El.textContent.trim() : '';

          // Remove section-title element before reading children so it doesn't duplicate
          const titleEl = node.querySelector('.section-title');
          if (titleEl) titleEl.remove();

          const innerBody = getChildrenMd().trim();

          const topicHeader = topicNum 
            ? `\n\n---\n\n### TOPIC ${topicNum}\n\n## ${topicTitle}${subTitle ? '\n*' + subTitle + '*' : ''}\n\n`
            : `\n\n---\n\n## ${topicTitle}\n\n`;

          return `${topicHeader}${innerBody}\n\n`;
        }

        // 2. Mnemonic / alert / exam tip callout boxes
        const style = (node.getAttribute('style') || '').toLowerCase();
        const textContent = node.textContent || '';
        const isCallout = 
          className.includes('callout') || 
          className.includes('mnemonic') || 
          className.includes('alert') || 
          className.includes('sutra') ||
          className.includes('formula-box') ||
          style.includes('faf5ff') ||
          style.includes('fffbeb') ||
          style.includes('fff1f2') ||
          style.includes('eff6ff') ||
          style.includes('border-left') ||
          textContent.includes('सूत्र') ||
          textContent.includes('स्मरण रहोस्') ||
          textContent.includes('स्रोत विमति') ||
          textContent.includes('गहन सन्दर्भ') ||
          textContent.includes('विगत परीक्षा');

        const inner = getChildrenMd();
        if (isCallout && inner.trim()) {
          const lines = inner.trim().split('\n').map(l => {
            const cleanL = l.replace(/^>\s*/, '').trim();
            return cleanL ? `> ${cleanL}` : '>';
          }).join('\n');
          return `\n\n${lines}\n\n`;
        }
        return inner;
      }

      default:
        return getChildrenMd();
    }
  }

  return '';
}

function tableToMarkdown(tableNode) {
  const rows = tableNode.querySelectorAll('tr');
  if (rows.length === 0) return '';

  const tableData = [];
  rows.forEach(row => {
    const cells = row.querySelectorAll('th, td');
    if (cells.length > 0) {
      const rowData = [];
      cells.forEach(c => {
        // Clean line breaks in table cells to keep markdown table format valid
        const cellText = nodeToMarkdown(c).trim().replace(/\n+/g, ' ').replace(/\|/g, '\\|');
        rowData.push(cellText);
      });
      tableData.push(rowData);
    }
  });

  if (tableData.length === 0) return '';

  // Determine max columns
  const colCount = Math.max(...tableData.map(r => r.length));
  if (colCount === 0) return '';

  // Pad rows
  const normalizedData = tableData.map(row => {
    while (row.length < colCount) row.push('');
    return row;
  });

  let mdTable = '\n\n';
  // Header row
  const header = normalizedData[0];
  mdTable += `| ${header.join(' | ')} |\n`;
  mdTable += `| ${header.map(() => '---').join(' | ')} |\n`;

  // Body rows
  for (let i = 1; i < normalizedData.length; i++) {
    mdTable += `| ${normalizedData[i].join(' | ')} |\n`;
  }
  mdTable += '\n';

  return mdTable;
}
