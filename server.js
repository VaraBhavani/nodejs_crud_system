const express = require('express');
const cors = require('cors');
const fs        = require('fs');
const path      = require('path');

const app = express();
const PORT = 2030;

app.use(cors());

app.use(express.json());

app.use(express.urlencoded({
    extended: true
}));

app.use(express.static('public'));

app.get('/', (_req, res) => {
    res.send('Server is working');
});

const routesDir = path.join(__dirname, 'routes');
 
fs.readdirSync(routesDir)
  .filter(file => file.endsWith('.js'))
  .forEach(file => {
      const routeName = path.basename(file, '.js');   
      const route     = require(path.join(routesDir, file));
      app.use(`/${routeName}`, route);
      console.log(`[server] Registered route: /${routeName}`);
  });


app.use((req, res) => {

    res.status(404).json({
        error: `Route ${req.method} ${req.url} not found`
    });

});

app.use((err, req, res, next) => {

    console.error('[server] Unhandled error:', err.message);

    res.status(500).json({
        error: 'Internal server error'
    });

});

app.listen(PORT, '0.0.0.0', () => {

    console.log(`Server is running on http://138.68.140.83:${PORT}`);

});
