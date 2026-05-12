const express = require('express');
const router = express.Router();
const pool = require('../config/db');

router.post('/', async (req, res) => {
    const { table, data } = req.body;

    if (!table || !/^[a-zA-Z0-9_]+$/.test(table)) {
        return res.status(400).send('ERROR: Invalid table name');
    }

    if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
        return res.status(400).send('ERROR: No data provided');
    }

    try {
        const connection = await pool.getConnection();

        const [pkResult] = await connection.query(
            `SELECT COLUMN_NAME 
             FROM information_schema.KEY_COLUMN_USAGE 
             WHERE TABLE_SCHEMA = 'dbBhavani1' 
               AND TABLE_NAME = ? 
               AND CONSTRAINT_NAME = 'PRIMARY' 
             LIMIT 1`,
            [table]
        );

        if (pkResult.length === 0) {
            connection.release();
            return res.status(400).send('ERROR: No primary key found for table');
        }

        const pkColumn = pkResult[0].COLUMN_NAME;
        const pkValue = data[pkColumn];

        let recordExists = false;
        if (pkValue !== undefined && pkValue !== null && pkValue !== '') {
            const [existCheck] = await connection.query(
                `SELECT 1 FROM \`${table}\` WHERE \`${pkColumn}\` = ? LIMIT 1`,
                [pkValue]
            );
            recordExists = existCheck.length > 0;
        }

        let result;

        if (!recordExists) {
            const columns = Object.keys(data);
            const columnNames = columns.map(col => `\`${col}\``).join(', ');
            const placeholders = columns.map(() => '?').join(', ');
            const values = columns.map(col => (data[col] === '' ? null : data[col]));

            console.log(`[saveRecord] INSERT into ${table}`, data);
            [result] = await connection.query(
                `INSERT INTO \`${table}\` (${columnNames}) VALUES (${placeholders})`,
                values
            );
        } else {
            const columns = Object.keys(data).filter(key => key !== pkColumn);

            if (columns.length === 0) {
                connection.release();
                return res.status(400).send('ERROR: No columns to update');
            }

            const setClause = columns.map(col => `\`${col}\` = ?`).join(', ');
            const values = [
                ...columns.map(col => (data[col] === '' ? null : data[col])),
                pkValue
            ];

            console.log(`[saveRecord] UPDATE ${table} where ${pkColumn}=${pkValue}`);
            [result] = await connection.query(
                `UPDATE \`${table}\` SET ${setClause} WHERE \`${pkColumn}\` = ?`,
                values
            );
        }

        connection.release();
        res.send(result.affectedRows > 0 ? '1' : '0');

    } catch (error) {
        console.error('[saveRecord] Error:', error.message);
        res.status(500).send(`ERROR: ${error.message}`);
    }
});

module.exports = router;

