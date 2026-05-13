const express = require('express');
const router = express.Router();
const pool = require('../config/dbConnection');

router.post('/', async (req, res) => {
    const { table, id, pkColumn } = req.body;

    if (!table || !/^[a-zA-Z0-9_]+$/.test(table)) {
        return res.status(400).send('ERROR: Invalid table name');
    }

    if (!pkColumn || !/^[a-zA-Z0-9_]+$/.test(pkColumn)) {
        return res.status(400).send('ERROR: Invalid primary key column');
    }

    if (id === undefined || id === null || id === '') {
        return res.status(400).send('ERROR: Missing record ID');
    }

    try {
        const connection = await pool.getConnection();

        console.log(`[deleteRecord] DELETE from ${table} where ${pkColumn}=${id}`);

        const [result] = await connection.query(
            `DELETE FROM \`${table}\` WHERE \`${pkColumn}\` = ?`,
            [id]
        );

        connection.release();
        res.send(result.affectedRows > 0 ? '1' : '0');

    } catch (error) {
        console.error('[deleteRecord] Error:', error.message);
        res.status(500).send(`ERROR: ${error.message}`);
    }
});

module.exports = router;
