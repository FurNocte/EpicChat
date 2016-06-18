var listCmd = {"help": "/help Display this help",
    "quit": "/quit Disconnect you from server",
    "nick": "/nick &ltnewPseudo&gt Change your nickname",
    "img": "/img &lturl&gt Display an image",
    "msg": "/msg &ltpseudo&gt &ltmessage&gt Send a private message",
    "list": "/list List all connected users"};

function help(ctr, id) {
    if (ctr.args.length == 0) {
        var text = ''
            for (var cmd in listCmd)
                text = text.concat(listCmd[cmd] + '<br/>');
        emitToUser(id, null, text, 'server');
    } else {
        emitToUser(id, null, listCmd[ctr.args[0]] || 'Command not found', 'server');
    }
}

var exports = module.exports = {};
exports.help = help;
