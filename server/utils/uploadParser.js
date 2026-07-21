const path = require('path');
const Busboy = require('busboy');

function createUploadError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function isAllowedFile(fileName, mimeType, allowedMimeTypes = [], allowedExtensions = []) {
  const normalizedMimeType = String(mimeType || '').trim().toLowerCase();
  const normalizedFileName = String(fileName || '').trim();
  const extension = path.extname(normalizedFileName).toLowerCase();

  return allowedMimeTypes.includes(normalizedMimeType) || allowedExtensions.includes(extension);
}

function parseMultipartUpload(req, options = {}) {
  const maxFileSize = Number(options.maxFileSize || 5 * 1024 * 1024);
  const allowedMimeTypes = (options.allowedMimeTypes || [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv'
  ]).map((value) => String(value).trim().toLowerCase());
  const allowedExtensions = (options.allowedExtensions || ['.xlsx', '.xls', '.csv']).map((value) => String(value).trim().toLowerCase());

  return new Promise((resolve, reject) => {
    const fields = {};
    const chunks = [];
    let fileBuffer = null;
    let fileName = '';
    let mimeType = '';
    let fileSize = 0;
    let fileSeen = false;
    let finished = false;

    const finishWith = (handler, value) => {
      if (finished) return;
      finished = true;
      handler(value);
    };

    const busboy = Busboy({
      headers: req.headers,
      limits: { files: 1, fileSize: maxFileSize }
    });

    busboy.on('field', (name, value) => {
      fields[name] = value;
    });

    busboy.on('file', (fieldName, stream, info) => {
      if (fieldName !== 'file') {
        stream.resume();
        return;
      }

      fileSeen = true;
      fileName = String(info.filename || '').trim();
      mimeType = String(info.mimeType || '').trim().toLowerCase();

      if (!fileName || !isAllowedFile(fileName, mimeType, allowedMimeTypes, allowedExtensions)) {
        stream.resume();
        finishWith(reject, createUploadError('Only .xlsx, .xls, or .csv files are allowed.', 415));
        return;
      }

      stream.on('data', (chunk) => {
        fileSize += chunk.length;
        if (fileSize > maxFileSize) {
          stream.destroy();
          finishWith(reject, createUploadError(`File exceeds the ${Math.round(maxFileSize / (1024 * 1024))}MB upload limit.`, 413));
          return;
        }
        chunks.push(Buffer.from(chunk));
      });

      stream.on('end', () => {
        fileBuffer = Buffer.concat(chunks);
        finishWith(resolve, {
          fields,
          file: {
            originalname: fileName,
            mimetype: mimeType,
            buffer: fileBuffer
          }
        });
      });

      stream.on('error', (error) => {
        finishWith(reject, error);
      });
    });

    busboy.on('finish', () => {
      if (!finished) {
        finishWith(resolve, { fields, file: null });
      }
    });

    busboy.on('error', (error) => {
      finishWith(reject, error);
    });

    req.pipe(busboy);
  });
}

module.exports = {
  createUploadError,
  isAllowedFile,
  parseMultipartUpload
};
