var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.get('/', function(req, res){
    res.sendFile(__dirname + '/client.html'); // Permet d'envoyer la ressource client.html quand on demande la racine du serveur
});

app.get('*', function(req, res){
    res.sendFile(__dirname + req.path); // Permet d'envoyer la ressource client.html quand on demande la racine du serveur
});

var pseudos = [];

io.on('connection', function(socket){ // Lors de l'event 'connection' sur io on execute la fonction anonyme
    var id = socket.id;
    pseudos[id] = 'Visiteur' + new Date().getTime();
    emitMsg(null, pseudos[id] + " is connected to the chat", 'server');
    emitToUser(id, 'config', {"func": "pseudo", "args": [pseudos[id]]}, 'server');
    emitToUser(id, 'chan_general', 'Welcome to the chat<br/>To see all commands type /help', 'server');
    socket.on('chan_general', function(msg){ // Lors de l'event 'chan_general sur socket' on execute la fonction anonyme
        var id = socket.id;
        if (msg.message[0] == '/')
            msg2Ctr(msg, id, socket);
        else {
            msg.pseudo = pseudos[id];
            msg.time = new Date();
            io.emit('chan_general', msg);
        }
    });
    socket.on('disconnect', function() {
        emitMsg(null, pseudos[id] + " has just disconnect", 'server');
        delete pseudos[id];
    });
});

http.listen(8081);

function emitMsg(chan, text, user) {
    if (!chan)
        chan = 'chan_general';
    if (!user)
        user = 'server';
    io.emit(chan, {"time": new Date(), "pseudo": "server", "message": text});
}

function emitToUser(id, chan, text, user) {
    if (!chan)
        chan = 'chan_general';
    io.sockets.connected[id].emit(chan, {"time": new Date(), "pseudo": user, "message": text});
}

var listCmd = {"help": ["/help Display the help", cmdhelp],
    "quit": ["/quit Disconnect you from server", cmdquit],
    "nick": ["/nick &ltnewPseudo&gt Change your nickname", cmdnick],
    "img": ["/img &lturl&gt Display an image", cmdimg],
    "msg": ["/msg &ltpseudo&gt &ltmessage&gt Send a private message", cmdmsg],
    "list": ["/list List all connected users", cmdlist],
    "r": ["/r &ltmessage&gt Answer to the last user who wrote you", cmdr]};


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
    emitMsg(null, 'You have been disconnected', 'server');
    socket.disconnect();
}

function cmdnick(ctr, id) {
    emitMsg(null, pseudos[id] + " is now know as " + ctr.args[0], 'server');
    pseudos[id] = ctr.args[0];
    emitToUser(id, 'config', {"func": "pseudo", "args": [pseudos[id]]});
}

function cmdimg(ctr, id) {
    emitMsg(null,
            '<a href="' + ctr.args[0] + '" target="_blank"><img style="max-width: 300px; max-height: 300px; cursor: pointer;" src="' + ctr.args[0] +'"/></a>',
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
            emitToUser(uid, null, text, '&lt' + pseudos[id] + ' -> ' + pseudos[uid] + '&gt');
            emitToUser(id, null, text, '&lt' + pseudos[id] + ' -> ' + pseudos[uid] + '&gt');
            lastSender[uid] = id;
        }
}

function cmdr(ctr, id) {
    if (lastSender[id]) {
        var text = '';
        for (mot in ctr.args)
            text = text.concat(ctr.args[mot] + ' ');
        emitToUser(lastSender[id], null, text, '&lt' + pseudos[id] + ' -> ' + pseudos[lastSender[id]] + '&gt');
        emitToUser(id, null, text, '&lt' + pseudos[id] + ' -> ' + pseudos[lastSender[id]] + '&gt');
        lastSender[lastSender[id]] = id;
    }
}

function cmdlist(ctr, id) {
    var text = 'Connected users:';
    for (user in pseudos)
        text = text.concat(pseudos[user] + '<br/>');
    emitToUser(id, null, text, 'server');
}
