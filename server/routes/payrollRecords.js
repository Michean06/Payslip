const express = require('express');
const supabase = require('../supabaseClient');
const fallbackStore = require('../fallbackStore');
const { requireAdminAuthIfConfigured } = require('../middleware/adminAuth');
const router = express.Router();

const allowedTables = new Set(['employees', 'payroll_records']);

function getTableName(requestedTable) {
  const tableName = String(requestedTable || 'payroll_records').trim();
  return allowedTables.has(tableName) ? tableName : null;
}

async function getTableColumns(tableName) {
  if (!supabase || !supabase.__isConfigured) {
    const error = new Error('Supabase client is not configured.');
    error.status = 500;
    throw error;
  }

  const { data, error } = await supabase.from(tableName).select('*').limit(1);
  if (error) {
    const requestError = new Error(error.message || String(error));
    requestError.status = 500;
    throw requestError;
  }

  if (data && data.length > 0) {
    return {
      columns: Object.keys(data[0]).map((column_name, index) => ({ column_name, ordinal_position: index + 1 })),
      source: 'database row'
    };
  }

  try {
    const { data: schemaColumns, error: schemaError } = await supabase.rpc('get_table_columns', { target_table: tableName });
    if (!schemaError && Array.isArray(schemaColumns) && schemaColumns.length) {
      return {
        columns: schemaColumns.map((column, index) => ({
          column_name: column.column_name,
          ordinal_position: column.ordinal_position || index + 1
        })),
        source: 'database schema'
      };
    }
  } catch (error) {
    // The helper is optional; the OpenAPI fallback below supports projects where it is unavailable.
  }

  return getColumnsFromOpenApi(tableName);
}

async function getColumnsFromOpenApi(tableName) {
  const projectUrl = String(process.env.SUPABASE_URL || '')
    .replace(/\/rest\/v1\/?$/, '')
    .replace(/\/$/, '');
  const apiKey = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!projectUrl || !apiKey || typeof fetch !== 'function') return { columns: [], source: null };

  try {
    const response = await fetch(`${projectUrl}/rest/v1/`, {
      headers: {
        apikey: apiKey,
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/openapi+json'
      }
    });
    if (!response.ok) return { columns: [], source: null };

    const specification = await response.json();
    const schema = specification?.components?.schemas?.[tableName] || specification?.definitions?.[tableName];
    const properties = schema?.properties || {};
    const columns = Object.keys(properties).map((column_name, index) => ({ column_name, ordinal_position: index + 1 }));
    return { columns, source: columns.length ? 'database schema' : null };
  } catch (error) {
    console.warn(`Unable to load schema metadata for ${tableName}`, error.message || error);
    return { columns: [], source: null };
  }
}

function escapeCsvCell(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

router.get('/columns', async (req, res) => {
  const tableName = getTableName(req.query.table);
  if (!tableName) return res.status(400).json({ error: 'Unsupported table requested.' });

  try {
    const { columns, source } = await getTableColumns(tableName);
    if (columns.length) return res.json({ table: tableName, columns, source });
    return res.json({
      table: tableName,
      columns: [],
      warning: `Unable to read columns for ${tableName}. Confirm that the table is exposed through Supabase's API.`
    });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message || String(err) });
  }
});

router.get('/import-template', async (req, res) => {
  const tableName = getTableName(req.query.table);
  if (!tableName) return res.status(400).json({ error: 'Unsupported table requested.' });

  try {
    const { columns } = await getTableColumns(tableName);
    if (!columns.length) {
      return res.status(404).json({ error: `Unable to read columns for ${tableName}, so an import template cannot be created.` });
    }

    const headers = columns.map((column) => escapeCsvCell(column.column_name)).join(',');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${tableName}-import-template.csv"`);
    return res.send(`\uFEFF${headers}\r\n`);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message || String(err) });
  }
});

router.delete('/clear-all', requireAdminAuthIfConfigured, async (req, res) => {
  const tableName = getTableName(req.query.table || req.body?.table || 'payroll_records');
  if (!tableName) return res.status(400).json({ error: 'Unsupported table requested.' });

  if (!supabase || !supabase.__isConfigured) {
    const deletedCount = fallbackStore.clearPayrollRecords();
    return res.json({ success: true, table: tableName, deletedCount, source: 'fallback' });
  }

  try {
    const { error, count } = await supabase.from(tableName).delete().gt('id', 0);
    if (error) {
      return res.status(500).json({ error: error.message || String(error) });
    }

    return res.json({ success: true, table: tableName, deletedCount: count ?? null });
  } catch (err) {
    return res.status(500).json({ error: err.message || String(err) });
  }
});

module.exports = router;
