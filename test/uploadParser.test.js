const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const FormData = require('form-data');
const { parseMultipartUpload } = require('../server/utils/uploadParser');

function startServer() {
  const server = http.createServer((req, res) => {
    parseMultipartUpload(req, { maxFileSize: 1024 * 1024 })
      .then(({ file, fields }) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          fileName: file?.originalname || '',
          mimeType: file?.mimetype || '',
          fieldValue: fields.source || ''
        }));
      })
      .catch((error) => {
        res.writeHead(error.statusCode || 500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      });
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

test('parseMultipartUpload extracts the uploaded file and form fields', async () => {
  const server = await startServer();
  const { port } = server.address();

  const form = new FormData();
  form.append('file', Buffer.from('hello xlsx'), {
    filename: 'test.xlsx',
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  form.append('source', 'unit-test');

  const response = await new Promise((resolve, reject) => {
    form.submit(`http://127.0.0.1:${port}`, (error, res) => {
      if (error) return reject(error);
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => resolve({ statusCode: res.statusCode, body }));
    });
  });

  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));

  assert.equal(response.statusCode, 200);
  const payload = JSON.parse(response.body);
  assert.equal(payload.fileName, 'test.xlsx');
  assert.equal(payload.mimeType, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  assert.equal(payload.fieldValue, 'unit-test');
});
