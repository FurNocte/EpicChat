var app = require('express')();
var http = require('http');
var httpServ = require('http').Server(app);
var io = require('socket.io')(httpServ);
var jsonfile = require('jsonfile');

app.get('/', function(req, res){
    res.sendFile(__dirname + '/client.html'); // Permet d'envoyer la ressource client.html quand on demande la racine du serveur
});

app.get('*', function(req, res){
    res.sendFile(__dirname + req.path); // Permet d'envoyer la ressource client.html quand on demande la racine du serveur
});

var pseudos = [];

io.on('connection', function(socket){ // Lors de l'event 'connection' sur io on execute la fonction anonyme
    var id = socket.id;
    pseudos[id] = 'Guest' + new Date().getTime();
    emitMsg(null, pseudos[id] + " is connected to the chat", 'server');
    emitToUser(id, 'config', {"func": "pseudo", "args": [pseudos[id]]}, 'server');
    emitToUser(id, 'chan_general', 'Welcome to the chat<br/>To see all commands type /help', '&lt server -> ' + pseudos[id] + '&gt');
    socket.on('chan_general', function(msg){ // Lors de l'event 'chan_general sur socket' on execute la fonction anonyme
        var id = socket.id;
        if (msg.message.replace(/ /g, '').length<1)
            return;
        if (msg.message[0] == '/')
            msg2Ctr(msg, id, socket);
        else {
            msg.pseudo = pseudos[id];
            msg.time = new Date();
            io.emit('chan_general', msg);
            var receivers = [];
            for (user in pseudos)
                if (user !== id)
                    receivers.push(user);
            notify(receivers, 'public');
        }
    });
    socket.on('disconnect', function() {
        emitMsg(null, pseudos[id] + " has just disconnect", 'server');
        delete pseudos[id];
    });
});

httpServ.listen(8081);

function emitMsg(chan, text, user) {
    if (!chan)
        chan = 'chan_general';
    if (!user)
        user = 'server';
    io.emit(chan, {"time": new Date(), "pseudo": user, "message": text});
}

function emitToUser(id, chan, text, user) {
    if (!chan)
        chan = 'chan_general';
    io.sockets.connected[id].emit(chan, {"time": new Date(), "pseudo": user, "message": text});
}

var passFile = './passwds.json';
var passwds = [];
readPasswd();
var listCmd = {"help": ["/help Display the help", cmdhelp],
    "quit": ["/quit Disconnect you from server", cmdquit],
    "nick": ["/nick &ltnew nickname&gt [password] Change your nickname", cmdnick],
    "img": ["/img &lturl&gt Display an image", cmdimg],
    "msg": ["/msg &ltnickname&gt &ltmessage&gt Send a private message", cmdmsg],
    "list": ["/list List all connected users", cmdlist],
    "r": ["/r &ltmessage&gt Answer to the last user who wrote you", cmdr],
    "svnick": ["/svnick &ltpassword&gt Save your current nickname with a password DB", cmdsvnick],
    "rmnick": ["/rmnick &ltpassword&gt Remove your current nickname from password DB", cmdrmnick],
    "giphy": ["/giphy &ltkeyword&gt Take a random gif from Giphy", cmdgiphy]};


function msg2Ctr(msg, id, socket) {
    msg = msg.message.split(' ');
    var cmd = '';
    var args = [];
    for (var i in msg) {
        if (i == 0)
            var cmd = msg[i];
        else
            args.push(msg[i]);
    }
    cmd = cmd.slice(1, cmd.lenght);
    listCmd[cmd][1]({"control": cmd, "args": args}, id, socket);
}
function cmdhelp(ctr, id) {
    if (ctr.args.length == 0) {
        var text = ''
            for (var cmd in listCmd)
                text = text.concat(listCmd[cmd][0] + '<br/>');
        emitToUser(id, null, text, 'server');
    } else {
        emitToUser(id, null, listCmd[ctr.args[0]][0] || 'Command not found', 'server');
    }
}

function cmdquit(ctr, id, socket) {
    emitToUser(id, 'chan_general', 'You has been disconnected', 'server');
    socket.disconnect();
}

function cmdnick(ctr, id) {
    var passwd = passwds[ctr.args[0]];
    if (!passwd || passwd === ctr.args[1]) {
        emitMsg(null, pseudos[id] + " is now know as " + ctr.args[0], 'server');
        pseudos[id] = ctr.args[0];
        emitToUser(id, 'config', {"func": "pseudo", "args": [pseudos[id]]});
    } else {
        emitToUser(id, 'chan_general', 'This nickname is protected by a password', 'server');
    }
}

function cmdimg(ctr, id) {
    emitMsg(null,
            '<a href="' + ctr.args[0] + '" target="_blank"><img style="width: 300px; cursor: pointer;" src="' + ctr.args[0] +'"/></a>',
            pseudos[id]);
}

var lastSender = [];

function cmdmsg(ctr, id) {
    // dirty :(
    for (var uid in pseudos)
        if (pseudos[uid] === ctr.args[0]) {
            var text = '';
            for (mot in ctr.args)
                if (mot != 0)
                    text = text.concat(ctr.args[mot] + ' ');
            if (text.replace(/ /g, '').length<1)
                return;
            emitToUser(uid, null, text, '&lt' + pseudos[id] + ' -> ' + pseudos[uid] + '&gt');
            emitToUser(id, null, text, '&lt' + pseudos[id] + ' -> ' + pseudos[uid] + '&gt');
            notify([uid], 'private');
            lastSender[uid] = id;
            break;
        }
}

function cmdr(ctr, id) {
    if (lastSender[id]) {
        var text = '';
        for (mot in ctr.args)
            text = text.concat(ctr.args[mot] + ' ');
        if (text.replace(/ /g, '').length<1)
            return;
        emitToUser(lastSender[id], null, text, '&lt' + pseudos[id] + ' -> ' + pseudos[lastSender[id]] + '&gt');
        emitToUser(id, null, text, '&lt' + pseudos[id] + ' -> ' + pseudos[lastSender[id]] + '&gt');
        notify([lastSender[id]], 'private');
        lastSender[lastSender[id]] = id;
    }
}

function cmdlist(ctr, id) {
    var text = 'Connected users:';
    for (user in pseudos)
        text = text.concat(pseudos[user] + '<br/>');
    emitToUser(id, null, text, 'server');
}

function cmdsvnick(ctr, id) {
    addPasswd(pseudos[id], ctr.args[0]);
}

function cmdrmnick(ctr, id) {
    if (ctr.args[0] === passwds[pseudos[id]])
        removePasswd(pseudos[id]);
}

function cmdgiphy(ctr, id) {
    if (ctr.args[0]) {
        http.get({
            hostname: 'api.giphy.com',
            port: 80,
            path: '/v1/stickers/random?api_key=dc6zaTOxFJmzC&tag=' + ctr.args[0],
            agent: false
        }, function(res) {
            var str = '';
            res.on('data', function (chunk) {
                str += chunk;
            });

            res.on('end', function () {
                ctr.args[0] = JSON.parse(str).data.image_original_url;
                if (ctr.args[0])
                    cmdimg(ctr, id);
                else
                    emitToUser(id, 'chan_general', 'No gif found in the Giphy database', '&lt server -> ' + pseudos[id] + '&gt');
            });
        });
    }
}

function notify(users, type) {
    for (user in users)
        emitToUser(users[user], 'config', {"func": "notify", "args": [type || 'public']}, 'server');
}

function addPasswd(pseudo, passwd) {
    if (pseudo.substring(0, 5) === 'Guest')
        return false;
    for (key in passwds) {
        if (key === pseudo) {
            passwds[key] = passwd;
            writePasswd();
            return true;
        }
    }
    passwds[pseudo] = passwd;
    writePasswd();
}

function removePasswd(pseudo) {
    if (pseudo.substring(0, 5) === 'Guest')
        return false;
    for (key in passwds) {
        if (key === pseudo) {
            delete passwds[key];
            writePasswd();
            return true;
        }
    }
}

function readPasswd() {
    jsonfile.readFile(passFile, function(err, obj) {
        if (err) {
            console.log(err);
            if (err.errno === 34) {
                passwds = {};
                writePasswd();
                readPasswd();
            }
        }
        else
            passwds = obj;
    });
}

function writePasswd() {
    jsonfile.writeFile(passFile, passwds, function(err) {
        if (err)
            console.log(err);
    });
}
