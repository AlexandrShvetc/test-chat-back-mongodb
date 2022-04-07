const express = require('express');
const bodyParser = require('body-parser');
const Pusher = require('pusher');
const config = require('./config');
const htmlGenerator = require('./html-generator');
const {MongoClient, ServerApiVersion} = require('mongodb');


const app = express();
const port = config.PORT || 3030;

const pusherSdkArgs = {
    appId: config.APP_ID, key: config.APP_KEY, secret: config.APP_SECRET,
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
const client = new MongoClient(uri, {useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1});

// Allow CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));


client.connect(function (err, client) {
    if (err) return console.log(err);
    app.locals.collectionUsers = client.db("chatdb").collection("users");
    app.locals.collectionMessages = client.db("chatdb").collection("messages");
    app.listen(3000, function () {
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
        // let timestamp = new Date().toISOString();
        let presenceData = {
            user_id: `${req.body.user_id}`, user_info: {
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
    pusher.trigger("presence-chat", "message", {
        message: param,
    },);
    const collection = req.app.locals.collectionMessages;
    collection.insertOne(param, function (err, result) {
        if (err) return console.log(err);
        return res.send(param);
    })
    // res.send(param)
});

app.post("/pusher/auth/signing", (req, res) => {
    if (!req.body) return res.sendStatus(400);
    const user = {
        id: req.body.id, name: req.body.name, email: req.body.email, password: req.body.password
    };
    const collection = req.app.locals.collectionUsers;
    collection.findOne({name: req.body.name}, function (err, name) {
        if (err) return console.log(err);
        if (name) return res.send({err: 'користувач з таким НікНеймом вже існує'})
        else {
            collection.findOne({email: req.body.email}, function (err, email) {
                if (err) return console.log(err);
                if (!email) {
                    collection.insertOne(user, function (err, result) {
                        if (err) return console.log(err);
                        return res.send(user);
                    })
                } else {
                    const error = {
                        err: 'користувач з такою поштою вже існує'
                    };
                    return res.send(error);
                }
            });
        }
    })
});

app.post("/pusher/auth/edituser", (req, res) => {
    if (!req.body) return res.sendStatus(400);
    const collection = req.app.locals.collectionUsers;
    collection.findOne({name: req.body.newName}, function (err, name) {
        if (err) return console.log(err);
        if (name) return res.send({err: 'користувач з таким НікНеймом вже існує'})
        else {
            collection.findOneAndUpdate({id: req.body.id}, {$set: {name: req.body.newName}}, {returnNewDocument:true}, function (err, id) {
                if (err) return console.log(err);
                if (!id) return {err: 'something gone wrong'}
                else
                    return res.send(id);
            });
        }
    })
});

app.post("/pusher/auth/login", (req, res) => {
    if (!req.body) return res.sendStatus(400);
    const collection = req.app.locals.collectionUsers;
    collection.findOne({email: req.body.email}, function (err, email) {
        if (err) return console.log(err);
        if (!email) {
            const error = {
                err: 'такий користувач не зареєстрований'
            };
            return res.send(error);
        }
        if (email.password !== req.body.password) {
            const error = {
                err: 'не вірно введений пароль'
            };
            return res.send(error);
        }
        return res.send(email)
    });
});

app.post("/pusher/auth/messages", (req, res) => {
    // const param = JSON.stringify(req.query)
    const collection = req.app.locals.collectionMessages;
    collection.find().sort({ts: -1}).skip(req.body.qtty).limit(10).toArray(function (err, messages) {
        if (err) return console.log(err);
        // const reversed = messages.reverse();
        res.send(messages);
    })
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

// client.close();