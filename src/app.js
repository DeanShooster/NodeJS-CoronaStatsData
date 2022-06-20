require('./db/mongoose');
const express = require('express');
const cors = require('cors');

const personRouter = require('./db/routers/personRouter');
const statsRouter = require('./db/routers/statsRouter');
const adminRouter = require('./db/routers/adminRouter');

const app = express();
const port = process.env.PORT;

app.use(cors());
app.use(express.json());

app.use(personRouter);
app.use(statsRouter);
app.use(adminRouter);


app.listen(port, ()=>{
    console.log('Server is on on Port:',port);
});