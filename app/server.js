const express = require('express');
const bodyParser = require('body-parser');
const Pusher = require('pusher');
const config = require('./config');
const htmlGenerator = require('./html-generator');
const { MongoClient, ServerApiVersion } = require('mongodb');


const app = express();
const port = config.PORT || 3030;

const pusherSdkArgs = {
    appId: config.APP_ID,
    key: config.APP_KEY,
    secret: config.APP_SECRET,
};

if (config.CLUSTER) {
    pusherSdkArgs.cluster = config.CLUSTER;
}
if (config.CHANNELS_HOST) {
    pusherSdkArgs.host = config.CHANNELS_HOST;
}
if (config.CHANNELS_PORT) {
    pusherSdkArgs.port = config.CHANNELS_PORT;
}
if (config.ENCRYPTION_MASTER_KEY) {
    pusherSdkArgs.encryptionMasterKeyBase64 = config.ENCRYPTION_MASTER_KEY;
}

const pusher = new Pusher(pusherSdkArgs);

const debug = (...args) => {
    if (config.DEBUG) {
        console.log('debug::: ', ...args);
    }
};

const uri = "mongodb+srv://bx6838ck:bx6838ck@cheapdeepchat.avume.mongodb.net/myFirstDatabase?retryWrites=true&w=majority";
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

// Allow CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

client.connect(function(err, client){
    if(err) return console.log(err);
    // dbClient = client;
    app.locals.collection = client.db("chatdb").collection("users");
    app.listen(3000, function(){
        console.log("Сервер ожидает подключения...");
    });
});

console.log(config);
app.post(config.ENDPOINT, (req, res) => {
    debug('received auth request');
    debug('req.body:', req.body);
    console.log(req.params)
    // Some logic to determine whether the user making the request has access to
    // the private channel
    // ...
    // ...
    // ...
    // Extract the socket id and channel name from the request body
    //
    const socketId = req.body.socket_id;
    const channelName = req.body.channel_name;

    if (/^presence-/.test(channelName)) {
        // If the request is for a presence channel include some data about the user
        // in the call to authenticate
        let timestamp = new Date().toISOString();
        let presenceData = {
            user_id: `${req.body.user_id}-${timestamp}`,
            user_info: {
                name: `${req.body.name}`,
            },
        };

        let auth = pusher.authenticate(socketId, channelName, presenceData);
        res.send(auth);
    } else {
        let auth = pusher.authenticate(socketId, channelName);

        res.send(auth);
        // res.send(msg);
    }
});

app.post("/pusher/auth/message", (req, res) => {
    // const socketId = req.body.socket_id;
    const param = req.body
    pusher.trigger(
        "presence-chat",
        "message",
        {
            message: param,
        },
    );
    res.send(param)
});

app.post("/pusher/auth/signing", (req, res) => {

    if(!req.body) return res.sendStatus(400);
    //
    // const id = req.body.id;
    // const name = req.body.name;
    // const email = req.body.email;
    // const password = req.body.password;
    const user = {
        id: req.body.id,
        name: req.body.name,
        email: req.body.email,
        password: req.body.password
    };
    const collection = req.app.locals.collection;
    const query = {email: req.body.email};
    const options = {projection: { _id: 1, id: 1, name: 1, email: 1, password: 1}};
    const checkUser = collection.findOne(query, options);
    const error = {
        err: checkUser
    };
    if (checkUser) return res.send(error);
    collection.insertOne(user, function(err, result){
        if(err) return console.log(err);
        res.send(user);
    });
});

app.get("/pusher/auth/?*", (req, res) =>{
    const param =  JSON.stringify(req.query)
    res.send(param)
});

const html = htmlGenerator.generate(config.ENDPOINT);
app.get('/', (req, res) => {
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
});

app.listen(port, () => {
    let msg = `listening on ${port}`;
    if (config.DEBUG) msg += ' - DEBUG mode';
    console.log(msg);
});

client.close();