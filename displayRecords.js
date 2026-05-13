const express = require('express');
const router = express.Router();
const pool = require('../config/dbConnection');

router.post('/', async (req, res) => {
    const { table } = req.body;

    if (!table || !/^[a-zA-Z0-9_]+$/.test(table)) {
        return res.status(400).json({ error: 'Invalid table name' });
    }

    try {
        const connection = await pool.getConnection();

        const [tableCheck] = await connection.query(
            `SELECT TABLE_NAME 
             FROM information_schema.TABLES 
             WHERE TABLE_SCHEMA = 'dbBhavani1' AND TABLE_NAME = ?`,
            [table]
        );

        if (tableCheck.length === 0) {
            connection.release();
            return res.status(404).json({ error: 'Table not found' });
        }

        const [pkResult] = await connection.query(
            `SELECT COLUMN_NAME 
             FROM information_schema.KEY_COLUMN_USAGE 
             WHERE TABLE_SCHEMA = 'dbBhavani1' 
               AND TABLE_NAME = ? 
               AND CONSTRAINT_NAME = 'PRIMARY' 
             LIMIT 1`,
            [table]
        );

        const [rows] = await connection.query(`SELECT * FROM \`${table}\``);
        connection.release();

        if (rows.length === 0) {
            const [colResult] = await pool.query(
                `SELECT COLUMN_NAME 
                 FROM information_schema.COLUMNS 
                 WHERE TABLE_SCHEMA = 'dbBhavani1' AND TABLE_NAME = ? 
                 ORDER BY ORDINAL_POSITION`,
                [table]
            );
            const columns = colResult.map(r => r.COLUMN_NAME);
            const primaryKey = pkResult.length > 0 ? pkResult[0].COLUMN_NAME : (columns[0] || '');
            return res.json({ columns, rows: [], primaryKey });
        }

        const columns = Object.keys(rows[0]);
        const primaryKey = pkResult.length > 0 ? pkResult[0].COLUMN_NAME : columns[0];

        const formattedRows = rows.map(row =>
            columns.map(col => (row[col] !== null ? String(row[col]) : ''))
        );

        res.json({ columns, rows: formattedRows, primaryKey });

    } catch (error) {
        console.error('[displayRecords] Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
