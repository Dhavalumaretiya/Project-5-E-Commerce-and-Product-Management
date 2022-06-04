const express = require('express');
const bodyParser = require('body-parser');
const route = require('./routes/route.js');
const  mongoose  = require('mongoose');
const app = express();

const multer= require("multer");
app.use(bodyParser.json());

app.use(multer().any())

mongoose.connect("mongodb+srv://dhaval-functionup:gRrFSwHIong4NV9B@cluster0.az0cl.mongodb.net/pro-5(group-27)?retryWrites=true&w=majority", {
    useNewUrlParser: true
})
.then( () => console.log("MongoDb is connected"))
.catch ( err => console.log(err) )

app.use('/', route)

app.listen( 3000, function () {
    console.log('Express app running on port ' + (3000))
});