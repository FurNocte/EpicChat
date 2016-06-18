$("#texteenvoi").focus();
var socketid = '';
var pseudo = '';

/* global io */
var socket = io();
function add_message(msg) {
    var classPseudo = msg.pseudo === 'server' ? 'server' : 'pseudo';
    if (msg.message.includes(pseudo))
        $('#messages').append('<li style="background-color: orange"> <span class="time">[' + getTime(msg.time) + ']</span> <span class="' + classPseudo + '">' + msg.pseudo + ' :</span> <span class="text">' + msg.message + '</span></li>');
    else
        $('#messages').append('<li> <span class="time">[' + getTime(msg.time) + ']</span> <span class="' + classPseudo + '">' + msg.pseudo + ' :</span> <span class="text">' + msg.message + '</span></li>');
    $('#messages').scrollTop(99999);
}

socket.on('chan_general', add_message); // Ecoute l'évenement 'chan_general' sur socket pour déclencher la fonction add_message
socket.on('config', function (msg) {
    if (msg.message.func === 'pseudo') {
        pseudo = msg.message.args[0];
        $('#userPseudo')[0].innerHTML = pseudo;
    }
});
socket.on('connect', function() {
    socketid = '/#' + socket.id;
    addChannel('chan_general');
    addChannel('szz', 'chan_general');
});

function sendMessage() {
    message = $("#texteenvoi").val();
    socket.emit('chan_general', {"message": message});
    $("#texteenvoi").val('');
}

function keyPress(e) {
    if (e.keyCode === 13)
        sendMessage();
}

function getTime(time) { 
    return time ? new Date(time).toLocaleTimeString(): new Date().toLocaleTimeString();
}

function addChannel(chan, sschan) {
    if (!sschan)
        var list = $('#listChan').append('<li id="chan_' + chan + '">' + chan + '</li>');
    else
        $('#chan_' + sschan).append('<li id="chan_' + chan + '">' + chan + '</li>');
}

function clock() {
    $('.time')[0].innerHTML = getTime();
    setTimeout(function() {clock();}, 1000);
}
