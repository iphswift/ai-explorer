importScripts(
  'https://cdn.jsdelivr.net/npm/marked/marked.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js'
);

self.onmessage = (event) => {
  try {
    if (typeof marked === 'undefined' || typeof hljs === 'undefined') {
      throw new Error('Could not load parsing libraries.');
    }

    const markdownText = event.data;
    if (!markdownText) {
      self.postMessage({ success: true, html: '' });
      return;
    }

    const html = marked.parse(markdownText, {
      highlight: function (code, lang) {
        const language = hljs.getLanguage(lang) ? lang : 'plaintext';
        return hljs.highlight(code, { language }).value;
      }
    });

    self.postMessage({ success: true, html: html });

  } catch (error) {
    self.postMessage({ success: false, error: error.message });
  }
};