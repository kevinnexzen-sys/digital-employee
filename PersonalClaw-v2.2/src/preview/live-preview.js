import { createLogger } from '../utils/logger.js';
import { EventEmitter } from 'events';

const logger = createLogger('LivePreview');

class LivePreview extends EventEmitter {
  constructor() {
    super();
    this.isActive = false;
    this.currentProject = null;
    this.previewServer = null;
  }

  async start(projectPath) {
    if (this.isActive) {
      logger.warn('Live preview already running');
      return;
    }

    this.isActive = true;
    this.currentProject = projectPath;
    logger.info(`Starting live preview for: ${projectPath}`);

    this.emit('preview-started', { projectPath });
  }

  async updatePreview(code, language) {
    if (!this.isActive) {
      logger.warn('Live preview not active');
      return;
    }

    logger.info(`Updating preview: ${language}`);

    const rendered = await this.renderCode(code, language);

    this.emit('preview-updated', {
      code,
      language,
      rendered,
      timestamp: Date.now()
    });

    return rendered;
  }

  async renderCode(code, language) {
    switch (language) {
      case 'html':
        return this.renderHTML(code);
      case 'javascript':
        return this.renderJavaScript(code);
      case 'css':
        return this.renderCSS(code);
      default:
        return { success: false, error: 'Unsupported language' };
    }
  }

  renderHTML(code) {
    return {
      success: true,
      type: 'html',
      content: code,
      preview: `data:text/html;charset=utf-8,${encodeURIComponent(code)}`
    };
  }

  renderJavaScript(code) {
    return {
      success: true,
      type: 'javascript',
      content: code,
      preview: `<script>${code}</script>`
    };
  }

  renderCSS(code) {
    return {
      success: true,
      type: 'css',
      content: code,
      preview: `<style>${code}</style>`
    };
  }

  stop() {
    this.isActive = false;
    this.currentProject = null;
    logger.info('Live preview stopped');
    this.emit('preview-stopped');
  }

  getStatus() {
    return {
      isActive: this.isActive,
      currentProject: this.currentProject
    };
  }
}

export default new LivePreview();
