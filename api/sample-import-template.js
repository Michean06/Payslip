const fs = require('fs');
const path = require('path');

module.exports = function sampleImportTemplateHandler(req, res) {
  if (req.method && req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  const templatePath = path.join(__dirname, '..', 'public', 'sample-import-template.csv');

  if (!fs.existsSync(templatePath)) {
    res.statusCode = 404;
    res.setHeader('content-type', 'text/plain; charset=utf-8');
    res.end('Template not found');
    return;
  }

  const content = fs.readFileSync(templatePath, 'utf8');
  res.statusCode = 200;
  res.setHeader('content-type', 'text/csv; charset=utf-8');
  res.setHeader('content-disposition', 'attachment; filename="sample-import-template.csv"');
  res.end(content);
};
