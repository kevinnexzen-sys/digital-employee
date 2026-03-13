import { createLogger } from '../utils/logger.js';

const logger = createLogger('CodeRenderer');

class CodeRenderer {
  constructor() {
    this.renderers = {
      html: this.renderHTML.bind(this),
      css: this.renderCSS.bind(this),
      javascript: this.renderJavaScript.bind(this),
      markdown: this.renderMarkdown.bind(this)
    };
  }

  async render(code, language) {
    const renderer = this.renderers[language];
    
    if (!renderer) {
      logger.warn(`No renderer for language: ${language}`);
      return { success: false, error: 'Unsupported language' };
    }

    try {
      const result = await renderer(code);
      return { success: true, ...result };
    } catch (error) {
      logger.error('Rendering failed:', error);
      return { success: false, error: error.message };
    }
  }

  renderHTML(code) {
    return {
      type: 'html',
      content: code,
      iframe: `data:text/html;charset=utf-8,${encodeURIComponent(code)}`
    };
  }

  renderCSS(code) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>${code}</style>
      </head>
      <body>
        <div class="preview-box">CSS Preview</div>
      </body>
      </html>
    `;
    
    return {
      type: 'css',
      content: code,
      iframe: `data:text/html;charset=utf-8,${encodeURIComponent(html)}`
    };
  }

  renderJavaScript(code) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <script>${code}</script>
      </head>
      <body>
        <div id="output"></div>
      </body>
      </html>
    `;
    
    return {
      type: 'javascript',
      content: code,
      iframe: `data:text/html;charset=utf-8,${encodeURIComponent(html)}`
    };
  }

  renderMarkdown(code) {
    const html = code
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*)\*/gim, '<em>$1</em>');
    
    return {
      type: 'markdown',
      content: code,
      html
    };
  }
}

export default new CodeRenderer();
